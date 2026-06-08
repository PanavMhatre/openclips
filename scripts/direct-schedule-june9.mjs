#!/usr/bin/env node
/**
 * direct-schedule-june9.mjs
 *
 * One-shot script: upload the 4 rendered clips to GitHub storage, then
 * schedule them on all Buffer channels for June 9 2026.
 *
 * Bypasses the OpenClips server schedule API (which has a persistence bug).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

// ── Config ──────────────────────────────────────────────────────────────────
const CLIPS_DIR = "/home/user/openclips/data/clips";

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO   = "panavmhatre/openclips";
const GITHUB_BRANCH = "main";
const GITHUB_DIR    = "clips";

const BUFFER_API_KEY     = process.env.BUFFER_API_KEY || "_CKQYXBIklixrAuUhqWEo3ExlEVGl3u0YwBXGi6HBZf";
const BUFFER_CHANNEL_IDS = (process.env.BUFFER_CHANNEL_IDS || "6a0e1d60090476fb994048bd,6a1c8904c687a22dd447991d,6a1c871ac687a22dd4478fa3")
  .split(",").map(s => s.trim()).filter(Boolean);
const BUFFER_API_URL = "https://api.buffer.com";

const LEDGER_PATH   = path.join(homedir(), ".codex", "openclips-buffer-publisher-ledger.json");
const SCHEDULE_DATE = "2026-06-09";
const TZ            = "America/Chicago";
const SLOT_TIMES    = ["09:00", "10:30", "12:00", "13:30"];

const DRY_RUN = process.argv.includes("--dry-run");

// ── Clips (ranked by score desc) ────────────────────────────────────────────
const CLIPS = [
  {
    id:    "c4208fba-4ea5-4707-9f14-b0fe5fabc3fe",
    file:  "why-ai-pricing-is-broken-c4208fba.mp4",
    title: "Why AI Pricing is Broken",
    hook:  "AI PRICING IS BROKEN",
    focus: "Benedict Evans explains how AI pricing is broken, citing examples of Google, Meta, and Amazon not knowing what to produce, and how this affects the software industry and margins.",
    score: 92,
  },
  {
    id:    "a21c79b9-134f-4a2a-90ab-ba2b2a93d8df",
    file:  "time-dilation-a-mind-bending-phenomenon-a21c79b9.mp4",
    title: "Time Dilation: A Mind-Bending Phenomenon",
    hook:  "TIME DILATION IS REAL AND MIND-BENDING",
    focus: "Don Lincoln explains the concept of time dilation, which shows that time is relative and can be affected by speed and gravity.",
    score: 90,
  },
  {
    id:    "427480b9-45c9-4881-bc25-2fcad5d6fd8b",
    file:  "why-enterprise-software-is-a-problem-427480b9.mp4",
    title: "Why Enterprise Software is a Problem",
    hook:  "ENTERPRISE SOFTWARE IS A PROBLEM",
    focus: "Benedict Evans discusses how enterprise software is a problem, citing examples of companies like Google and Meta having different attitudes to pricing.",
    score: 88,
  },
  {
    id:    "a5ec1422-dac7-4101-9d52-ff8399c8a9ce",
    file:  "the-enormous-energy-source-in-our-atoms-a5ec1422.mp4",
    title: "The Enormous Energy Source in Our Atoms",
    hook:  "MODIFYING ATOMIC NUCLEI CAN RELEASE ENORMOUS ENERGY",
    focus: "Don Lincoln discusses how modifying the nucleus of atoms can release enormous energy, which is a key aspect of nuclear reactions.",
    score: 88,
  },
];

// ── GitHub Upload ────────────────────────────────────────────────────────────

async function githubUpload(fileName) {
  const localPath = path.join(CLIPS_DIR, fileName);
  const remotePath = `${GITHUB_DIR}/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${remotePath}`;

  // Check if file already exists (to get its SHA for update)
  let sha;
  try {
    const check = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "openclips" },
    });
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
      console.log(`  [github] ${fileName} already exists, will overwrite (sha=${sha?.slice(0,7)})`);
    }
  } catch { /* ignore */ }

  const content = await readFile(localPath);
  const b64 = content.toString("base64");

  const body = {
    message: `upload clip ${fileName}`,
    content: b64,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "openclips",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`GitHub upload failed ${res.status}: ${data.message}`);

  const downloadUrl = data.content?.download_url;
  if (!downloadUrl) throw new Error("GitHub response missing download_url");

  // Convert to raw URL for direct media access
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${remotePath}`;
  console.log(`  [github] uploaded → ${rawUrl}`);
  return rawUrl;
}

// ── Buffer API ───────────────────────────────────────────────────────────────

async function bufferGraphql(query) {
  const res = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BUFFER_API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error("Buffer returned non-JSON: " + text.slice(0, 200)); }
  if (!res.ok) throw new Error(payload?.message || `Buffer HTTP ${res.status}`);
  if (payload.errors?.length) throw new Error(payload.errors.map(e => e.message).join("; "));
  return payload.data || {};
}

let orgId = "";
async function getOrgId() {
  if (orgId) return orgId;
  const data = await bufferGraphql(`query { account { organizations { id } } }`);
  orgId = data?.account?.organizations?.[0]?.id || "";
  if (!orgId) throw new Error("Could not fetch Buffer organization ID");
  return orgId;
}

const channelServiceCache = new Map();
async function getChannelService(channelId) {
  if (channelServiceCache.size === 0) {
    const id = await getOrgId();
    const data = await bufferGraphql(`query { channels(input:{ organizationId: "${id}" }) { id service } }`);
    for (const ch of (data?.channels || [])) channelServiceCache.set(ch.id, ch.service);
  }
  return channelServiceCache.get(channelId) || "unknown";
}

function buildMetaField(service, text) {
  const title = text.split("\n")[0].slice(0, 100);
  switch (String(service || "").toLowerCase()) {
    case "instagram": return "metadata: { instagram: { type: reel, shouldShareToFeed: true } }";
    case "youtube":   return `metadata: { youtube: { title: ${JSON.stringify(title)}, categoryId: "22" } }`;
    case "tiktok":    return `metadata: { tiktok: { title: ${JSON.stringify(title)} } }`;
    default:          return "";
  }
}

async function createScheduledPost({ channelId, text, mediaUrl, dueAt }) {
  const service = await getChannelService(channelId);
  const metaField = buildMetaField(service, text);
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
  if (!result?.post?.id) throw new Error("Buffer did not return a post ID");
  return result.post;
}

// ── Date/Time ────────────────────────────────────────────────────────────────

function getUtcOffsetMinutes(date, tz) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type)?.value || 0);
  const local = new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
  return (local.getTime() - date.getTime()) / 60_000;
}

function buildDueAt(dateStr, timeStr, tz) {
  const localDt = `${dateStr}T${timeStr}:00`;
  const testDate = new Date(localDt + "Z");
  const offset = getUtcOffsetMinutes(testDate, tz);
  return new Date(testDate.getTime() - offset * 60_000).toISOString();
}

// ── Ledger ───────────────────────────────────────────────────────────────────

async function loadLedger() {
  try { return JSON.parse(await readFile(LEDGER_PATH, "utf8")); }
  catch { return { scheduledDates: [], entries: [] }; }
}

async function saveLedger(ledger) {
  await mkdir(path.dirname(LEDGER_PATH), { recursive: true });
  await writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

// ── Post text ────────────────────────────────────────────────────────────────

function buildPostText(clip) {
  const hook  = clip.hook.trim().toUpperCase();
  const focus = (clip.focus || "").trim().slice(0, 300);
  const cta   = "Follow PodByte Edits for daily finance & tech breakdowns.";
  return [hook, focus, cta].filter(Boolean).join("\n\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nDirect Buffer Scheduler — June 9 2026`);
  console.log(`  Mode     : ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Channels : ${BUFFER_CHANNEL_IDS.join(", ")}`);
  console.log(`  Clips    : ${CLIPS.length}\n`);

  if (!DRY_RUN && !GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is required to upload clips.");
    process.exit(1);
  }

  // Step 1: Upload clips to GitHub
  const uploadedClips = [];
  for (const clip of CLIPS) {
    console.log(`Uploading ${clip.file} ...`);
    if (DRY_RUN) {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_DIR}/${clip.file}`;
      uploadedClips.push({ ...clip, mediaUrl: rawUrl });
      console.log(`  [dry-run] would upload → ${rawUrl}`);
    } else {
      try {
        const mediaUrl = await githubUpload(clip.file);
        uploadedClips.push({ ...clip, mediaUrl });
      } catch (err) {
        console.error(`  [error] upload failed: ${err.message}`);
        process.exit(1);
      }
    }
  }

  console.log();

  // Step 2: Build schedule plan
  const plan = uploadedClips.map((clip, i) => ({
    clip,
    slot: i + 1,
    time: SLOT_TIMES[i],
    dueAt: buildDueAt(SCHEDULE_DATE, SLOT_TIMES[i], TZ),
    text: buildPostText(clip),
  }));

  console.log("Schedule Plan:\n");
  for (const item of plan) {
    console.log(`  Slot ${item.slot} | ${item.time} CST | ${item.dueAt}`);
    console.log(`    Title : ${item.clip.title}`);
    console.log(`    Score : ${item.clip.score}`);
    console.log(`    Media : ${item.clip.mediaUrl}`);
    console.log(`    Text  : ${item.text.slice(0, 80)}...`);
    console.log();
  }

  if (DRY_RUN) {
    console.log("[dry-run] No posts created. Run without --dry-run to schedule live.");
    return;
  }

  // Step 3: Schedule on Buffer
  const results = [];
  for (const item of plan) {
    for (const channelId of BUFFER_CHANNEL_IDS) {
      try {
        const post = await createScheduledPost({
          channelId,
          text: item.text,
          mediaUrl: item.clip.mediaUrl,
          dueAt: item.dueAt,
        });
        console.log(`[ok] Slot ${item.slot} → channel ${channelId} → post ${post.id}`);
        results.push({
          slot: item.slot,
          channelId,
          postId: post.id,
          dueAt: item.dueAt,
          clipId: item.clip.id,
          clipTitle: item.clip.title,
        });
      } catch (err) {
        console.error(`[fail] Slot ${item.slot} → channel ${channelId}: ${err.message}`);
      }
    }
  }

  // Step 4: Update ledger
  if (results.length) {
    const ledger = await loadLedger();
    ledger.scheduledDates = [...new Set([...ledger.scheduledDates, SCHEDULE_DATE])];
    ledger.entries = [
      ...(ledger.entries || []),
      {
        date: SCHEDULE_DATE,
        scheduledAt: new Date().toISOString(),
        posts: results,
      },
    ];
    await saveLedger(ledger);
    console.log(`\n[ok] Ledger updated at ${LEDGER_PATH}`);
    console.log(`[ok] Scheduled ${results.length} post(s) for ${SCHEDULE_DATE}`);
  } else {
    console.error("\n[error] No posts were created successfully.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
