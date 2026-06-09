#!/usr/bin/env node
/**
 * Standalone Buffer scheduler for clips in the clips/ directory.
 * Does NOT require the OpenClips server, yt-dlp, or ffmpeg.
 *
 * Steps:
 *   1. Load the schedule ledger — skip clips already sent to Buffer.
 *   2. Upload unscheduled clips to GitHub storage (panavm12-jpg/storage).
 *   3. Schedule to all three Buffer channels at the configured CT time slots.
 *   4. Update the ledger so these clips are never re-sent.
 *
 * Usage:
 *   node scripts/run-schedule-now.mjs              # dry-run
 *   node scripts/run-schedule-now.mjs --live        # schedule for real
 *   node scripts/run-schedule-now.mjs --live --date 2024-06-20
 *
 * Required env vars (already in shell environment):
 *   BUFFER_API_KEY, BUFFER_CHANNEL_IDS, GITHUB_TOKEN, GITHUB_STORAGE_REPO,
 *   GITHUB_STORAGE_BRANCH, GITHUB_STORAGE_DIR
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIPS_DIR = path.join(__dirname, "..", "clips");
const TIMEZONE = "America/Chicago";
const SCHEDULE_TIMES = ["09:00", "10:30", "12:00", "13:30", "15:00"];
const BUFFER_API_URL = "https://api.buffer.com/graphql";
const GITHUB_API_BASE = "https://api.github.com";

// ─── Config from env ─────────────────────────────────────────────────────────

const BUFFER_API_KEY = process.env.BUFFER_API_KEY || "";
const CHANNEL_IDS = (process.env.BUFFER_CHANNEL_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_STORAGE_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_STORAGE_REPO || "PanavMhatre/openclips-media";
const GITHUB_BRANCH = process.env.GITHUB_STORAGE_BRANCH || "main";
const GITHUB_DIR = (process.env.GITHUB_STORAGE_DIR || "clips").replace(/^\/+|\/+$/, "");
const LEDGER_PATH = process.env.OPENCLIPS_BUFFER_LEDGER
  || path.join(homedir(), ".codex", "openclips-buffer-publisher-ledger.json");
const MAX_CLIP_BYTES = Number(process.env.GITHUB_STORAGE_MAX_BYTES || 95 * 1024 * 1024);

const args = process.argv.slice(2);
const isLive = args.includes("--live");
const _dateIdx = args.indexOf("--date");
const dateArg = _dateIdx >= 0 ? args[_dateIdx + 1] || null : null;

// ─── Ledger ───────────────────────────────────────────────────────────────────

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) return { scheduledDates: [], scheduledClipFiles: [], history: [] };
  try {
    const l = JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
    l.scheduledDates = l.scheduledDates || [];
    l.scheduledClipFiles = l.scheduledClipFiles || [];
    l.history = l.history || [];
    return l;
  } catch {
    return { scheduledDates: [], scheduledClipFiles: [], history: [] };
  }
}

function saveLedger(ledger) {
  const dir = path.dirname(LEDGER_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
}

function nextScheduleDate(ledger) {
  if (dateArg) return dateArg;
  const used = new Set(ledger.scheduledDates);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 60; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (!used.has(iso)) return iso;
    d.setDate(d.getDate() + 1);
  }
  throw new Error("No free date in next 60 days.");
}

// ─── Timezone ─────────────────────────────────────────────────────────────────

function localToUtcIso(dateStr, timeStr, tz) {
  const anchor = new Date(`${dateStr}T${timeStr}:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(anchor).map(p => [p.type, p.value])
  );
  const tzMs = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`).getTime();
  const offsetMs = tzMs - anchor.getTime();
  return new Date(anchor.getTime() - offsetMs).toISOString();
}

// ─── Clip discovery ───────────────────────────────────────────────────────────

function slugToTitle(slug) {
  const MINOR = new Set(["a", "an", "in", "on", "at", "to", "of", "for", "and", "or", "but", "the", "with", "by", "is", "our"]);
  const words = slug.replace(/-([a-f0-9]{8})$/, "").split("-");
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i === 0 || !MINOR.has(lower)) return lower[0].toUpperCase() + lower.slice(1);
      return lower;
    })
    .join(" ")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bapi\b/gi, "API");
}

function buildTags(title) {
  const lower = title.toLowerCase();
  const tags = ["#PodByteEdits", "#FinanceTok", "#TechTok"];
  if (/\bai\b|gpt|openai|anthropic|deepseek|llm|model/.test(lower)) tags.push("#AI");
  if (/startup|founder|scale|saas|enterprise|software/.test(lower)) tags.push("#Startups");
  if (/atom|quantum|physics|energy|science|dilation|universe/.test(lower)) tags.push("#Science");
  if (/invest|stock|fund|market|finance|economy/.test(lower)) tags.push("#Investing");
  return [...new Set(tags)].slice(0, 5).join(" ");
}

function buildPostText(title) {
  const hook = title.toUpperCase().slice(0, 72);
  const cta = "Follow PodByte Edits for daily finance & tech breakdowns.";
  const tags = buildTags(title);
  return [hook, cta, tags].join("\n\n");
}

function findLocalClips(ledger) {
  if (!existsSync(CLIPS_DIR)) throw new Error(`clips/ directory not found at ${CLIPS_DIR}`);
  const scheduled = new Set(ledger.scheduledClipFiles);
  return readdirSync(CLIPS_DIR)
    .filter(f => f.endsWith(".mp4") && !scheduled.has(f))
    .map(f => ({
      filename: f,
      filepath: path.join(CLIPS_DIR, f),
      title: slugToTitle(path.basename(f, ".mp4")),
    }));
}

// ─── GitHub storage ───────────────────────────────────────────────────────────

function parseRepo(repoStr) {
  const [owner, name] = String(repoStr || "").split("/");
  if (!owner || !name) throw new Error(`Invalid GITHUB_STORAGE_REPO: "${repoStr}". Expected "owner/repo".`);
  return { owner, name };
}

function encodeGithubPath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

async function ghFetch(path, options = {}) {
  const res = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "OpenClips",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* empty */ }
  return { ok: res.ok, status: res.status, json };
}

// Creates the initial commit + branch for an empty repo using the Git Data API.
async function initEmptyRepo(repo, branch, storagePath, content, message) {
  // 1. Create blob
  const blobRes = await ghFetch(`/repos/${repo.owner}/${repo.name}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "base64" }),
  });
  if (!blobRes.ok) throw new Error(blobRes.json?.message || `Blob creation failed (${blobRes.status})`);
  const blobSha = blobRes.json.sha;

  // 2. Create tree (no base_tree → empty root)
  const treeRes = await ghFetch(`/repos/${repo.owner}/${repo.name}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      tree: [{ path: storagePath, mode: "100644", type: "blob", sha: blobSha }],
    }),
  });
  if (!treeRes.ok) throw new Error(treeRes.json?.message || `Tree creation failed (${treeRes.status})`);
  const treeSha = treeRes.json.sha;

  // 3. Create commit (no parents → initial commit)
  const commitRes = await ghFetch(`/repos/${repo.owner}/${repo.name}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: treeSha, parents: [] }),
  });
  if (!commitRes.ok) throw new Error(commitRes.json?.message || `Commit creation failed (${commitRes.status})`);
  const commitSha = commitRes.json.sha;

  // 4. Create branch ref
  const refRes = await ghFetch(`/repos/${repo.owner}/${repo.name}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha }),
  });
  if (!refRes.ok) throw new Error(refRes.json?.message || `Ref creation failed (${refRes.status})`);

  return { commitSha };
}

async function uploadToGitHub(clip) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not set.");
  if (!GITHUB_REPO) throw new Error("GITHUB_STORAGE_REPO is not set.");

  const repo = parseRepo(GITHUB_REPO);
  const stats = await stat(clip.filepath);
  if (stats.size > MAX_CLIP_BYTES) {
    throw new Error(`${clip.filename} is ${(stats.size / 1024 / 1024).toFixed(1)} MB — exceeds ${(MAX_CLIP_BYTES / 1024 / 1024).toFixed(0)} MB limit.`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const base = path.basename(clip.filename, ".mp4");
  const suffix = crypto.randomUUID().slice(0, 8);
  const storagePath = [GITHUB_DIR, date, `${base}-${suffix}.mp4`].filter(Boolean).join("/");
  const message = `Add OpenClips video: ${clip.title}`;
  const content = await readFile(clip.filepath, "base64");

  // Try Contents API with branch first, then without (covers non-empty repos)
  for (const branch of [GITHUB_BRANCH, null]) {
    const payload = { message, content };
    if (branch) payload.branch = branch;

    const { ok, status, json } = await ghFetch(
      `/repos/${repo.owner}/${repo.name}/contents/${encodeGithubPath(storagePath)}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );

    if (ok) {
      const rawUrl = json?.content?.download_url
        || `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${encodeGithubPath(GITHUB_BRANCH)}/${encodeGithubPath(storagePath)}`;
      return { url: rawUrl, storagePath };
    }

    const msg = json?.message || `HTTP ${status}`;
    // Only retry without branch for branch-related errors
    if (branch && /branch|empty|not found|reference/i.test(msg)) continue;

    // If repo is empty, bootstrap it via Git Data API
    if (/not found|empty/i.test(msg) && branch === null) {
      await initEmptyRepo(repo, GITHUB_BRANCH, storagePath, content, message);
      const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${encodeGithubPath(GITHUB_BRANCH)}/${encodeGithubPath(storagePath)}`;
      return { url: rawUrl, storagePath };
    }

    throw new Error(msg);
  }

  // Fallback: try Git Data API (empty repo path)
  await initEmptyRepo(repo, GITHUB_BRANCH, storagePath, content, message);
  const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${encodeGithubPath(GITHUB_BRANCH)}/${encodeGithubPath(storagePath)}`;
  return { url: rawUrl, storagePath };
}

// ─── Buffer API ───────────────────────────────────────────────────────────────

async function bufferGraphql(query, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(BUFFER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BUFFER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.data) return json.data;
    if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    else throw new Error(json?.errors?.[0]?.message || `Buffer API error (HTTP ${res.status})`);
  }
}

async function getChannelServices() {
  const data = await bufferGraphql(`
    query GetOrgs {
      account {
        organizations {
          id
          channels { id service }
        }
      }
    }
  `);
  const map = new Map();
  for (const org of data?.account?.organizations || []) {
    for (const ch of org.channels || []) {
      map.set(String(ch.id), String(ch.service || "").toLowerCase());
    }
  }
  return map;
}

function buildMetadataField(service, title) {
  const clean = String(title || "Podcast clip").slice(0, 100);
  switch (service) {
    case "instagram":
      return "metadata: { instagram: { type: reel, shouldShareToFeed: true } }";
    case "youtube":
      return `metadata: { youtube: { title: ${JSON.stringify(clean)}, categoryId: "22" } }`;
    case "tiktok":
      return `metadata: { tiktok: { title: ${JSON.stringify(clean)} } }`;
    default:
      return "";
  }
}

async function createBufferPost({ channelId, text, mediaUrl, dueAt, service, title }) {
  const metaField = buildMetadataField(service, title);
  const query = `
    mutation CreatePost {
      createPost(input: {
        text: ${JSON.stringify(text)}
        channelId: ${JSON.stringify(channelId)}
        schedulingType: automatic
        mode: customScheduled
        dueAt: ${JSON.stringify(dueAt)}
        ${metaField}
        assets: [{ video: { url: ${JSON.stringify(mediaUrl)} } }]
      }) {
        ... on PostActionSuccess { post { id text } }
        ... on MutationError { message }
      }
    }
  `;
  const data = await bufferGraphql(query);
  const result = data?.createPost;
  if (result?.message) throw new Error(result.message);
  if (!result?.post?.id) throw new Error("Buffer did not return a post ID.");
  return result.post;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\nOpenClips → Buffer Direct Scheduler (${isLive ? "LIVE" : "DRY RUN"})`);
console.log(`Ledger  : ${LEDGER_PATH}`);
console.log(`Channels: ${CHANNEL_IDS.join(", ") || "(none configured)"}\n`);

// Validate config
const configErrors = [];
if (!BUFFER_API_KEY) configErrors.push("BUFFER_API_KEY is not set.");
if (!CHANNEL_IDS.length) configErrors.push("BUFFER_CHANNEL_IDS is not set.");
if (!GITHUB_TOKEN) configErrors.push("GITHUB_TOKEN / GH_TOKEN is not set.");
if (!GITHUB_REPO) configErrors.push("GITHUB_STORAGE_REPO is not set.");
if (configErrors.length) {
  configErrors.forEach(e => console.error(`  ✗ ${e}`));
  process.exit(1);
}

const ledger = loadLedger();
const scheduleDate = nextScheduleDate(ledger);

console.log(`Schedule date: ${scheduleDate}  (${TIMEZONE})\n`);

// Find clips that haven't been scheduled yet
let unscheduled;
try {
  unscheduled = findLocalClips(ledger);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (!unscheduled.length) {
  console.log("No new clips to schedule — all clips in clips/ have already been sent to Buffer.");
  console.log(`Ledger: ${LEDGER_PATH}`);
  process.exit(0);
}

// Pick up to 5 clips
const toSchedule = unscheduled.slice(0, SCHEDULE_TIMES.length);
if (toSchedule.length < unscheduled.length) {
  console.log(`Note: ${unscheduled.length} new clips available, scheduling first ${toSchedule.length}.\n`);
}

// Print plan
const plan = toSchedule.map((clip, i) => ({
  slot: i + 1,
  time: SCHEDULE_TIMES[i],
  dueAt: localToUtcIso(scheduleDate, SCHEDULE_TIMES[i], TIMEZONE),
  clip,
}));

console.log("Schedule plan:");
console.log("─".repeat(70));
plan.forEach(({ slot, time, dueAt, clip }) => {
  console.log(`  Slot ${slot}  ${time} CT  →  ${dueAt}`);
  console.log(`  "${clip.title}"  (${clip.filename})`);
  console.log();
});

if (!isLive) {
  console.log("Dry-run — pass --live to upload and schedule for real.\n");
  console.log("Command: node scripts/run-schedule-now.mjs --live");
  process.exit(0);
}

// Get channel services for metadata
console.log("Fetching Buffer channel services...");
let channelServices = new Map();
try {
  channelServices = await getChannelServices();
  CHANNEL_IDS.forEach(id => {
    const svc = channelServices.get(id) || "unknown";
    console.log(`  ${id} → ${svc}`);
  });
} catch (error) {
  console.warn(`  Warning: could not determine channel services (${error.message}). Metadata fields will be skipped.`);
}

console.log();

// Upload clips to GitHub and schedule
const results = [];

for (const { slot, time, dueAt, clip } of plan) {
  console.log(`Slot ${slot} @ ${time} CT — "${clip.title}"`);

  // Upload to GitHub
  let mediaUrl;
  process.stdout.write(`  Uploading to GitHub ... `);
  try {
    const uploaded = await uploadToGitHub(clip);
    mediaUrl = uploaded.url;
    console.log(`done\n  → ${mediaUrl}`);
  } catch (error) {
    console.log(`FAILED: ${error.message}`);
    results.push({ slot, clip, success: false, error: error.message, phase: "upload" });
    continue;
  }

  // Schedule to all channels
  const postText = buildPostText(clip.title);
  const channelResults = [];
  for (const channelId of CHANNEL_IDS) {
    const service = channelServices.get(channelId) || "";
    process.stdout.write(`  Buffer ${channelId} (${service || "unknown"}) ... `);
    try {
      const post = await createBufferPost({
        channelId,
        text: postText,
        mediaUrl,
        dueAt,
        service,
        title: clip.title,
      });
      console.log(`scheduled  post=${post.id}`);
      channelResults.push({ channelId, postId: post.id, success: true });
    } catch (error) {
      console.log(`FAILED: ${error.message}`);
      channelResults.push({ channelId, success: false, error: error.message });
    }
  }

  const anySucceeded = channelResults.some(r => r.success);
  results.push({ slot, clip, mediaUrl, success: anySucceeded, channels: channelResults });
  console.log();
}

// Summary + ledger update
const succeeded = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`─`.repeat(70));
console.log(`Scheduled: ${succeeded.length}/${plan.length} clip(s)  |  Failed: ${failed.length}`);

if (succeeded.length > 0) {
  const newScheduledFiles = succeeded.map(r => r.clip.filename);

  // Dedup: only add date if all slots were attempted
  if (!ledger.scheduledDates.includes(scheduleDate)) {
    ledger.scheduledDates.push(scheduleDate);
  }

  // Record each successfully scheduled clip filename so it's never re-sent
  for (const f of newScheduledFiles) {
    if (!ledger.scheduledClipFiles.includes(f)) {
      ledger.scheduledClipFiles.push(f);
    }
  }

  ledger.history.push({
    date: scheduleDate,
    scheduledAt: new Date().toISOString(),
    clips: results.map(r => ({
      slot: r.slot,
      time: SCHEDULE_TIMES[r.slot - 1],
      dueAt: plan[r.slot - 1]?.dueAt,
      filename: r.clip.filename,
      title: r.clip.title,
      mediaUrl: r.mediaUrl || null,
      success: r.success,
      channels: r.channels || [],
    })),
  });

  saveLedger(ledger);
  console.log(`Ledger updated: ${LEDGER_PATH}`);
}

if (failed.length > 0) {
  console.log("\nFailed clips:");
  failed.forEach(r => console.log(`  Slot ${r.slot}: ${r.clip.filename} — ${r.error || "channel error"}`));
  process.exitCode = 1;
}
