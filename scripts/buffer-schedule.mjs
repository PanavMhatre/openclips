#!/usr/bin/env node
/**
 * buffer-schedule.mjs
 *
 * Reads the top-ranked clips (from rank-openclips-clips.mjs or a JSON file),
 * picks the next unscheduled publishing day, and schedules five clips to all
 * configured Buffer channels at 9:00, 10:30, 12:00, 13:30, 15:00
 * America/Chicago.
 *
 * Usage:
 *   node scripts/rank-openclips-clips.mjs | node scripts/buffer-schedule.mjs [options]
 *   node scripts/buffer-schedule.mjs --clips=top5.json [options]
 *
 * Options:
 *   --dry-run              Print plan without calling Buffer or writing ledger
 *   --undo                 Delete all Buffer posts from the most recent ledger entry
 *   --clips=<file>         JSON file with clip array (default: read from stdin)
 *   --date=<YYYY-MM-DD>    Force a specific publishing date (skips ledger check)
 *   --timezone=<tz>        Timezone for slot times (default: America/Chicago)
 *   --base-url=<url>       OpenClips server URL for public media resolution
 *   --output=<file>        Write schedule result JSON to file
 *
 * Environment variables:
 *   BUFFER_API_KEY            Buffer GraphQL bearer token (required for live run)
 *   BUFFER_CHANNEL_IDS        Comma-separated Buffer channel IDs (required for live run)
 *   OPENCLIPS_PUBLIC_BASE_URL Base URL to map local clip paths → public URLs
 *   OPENCLIPS_BUFFER_LEDGER   Path to ledger JSON file
 *
 * Exits 0 on success, 1 on error.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const DEFAULT_LEDGER_PATH = path.join(homedir(), ".codex", "openclips-buffer-publisher-ledger.json");
const BUFFER_API_URL = "https://api.buffer.com";
const SLOT_TIMES = [
  { hour: 9, minute: 0 },
  { hour: 10, minute: 30 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 30 },
];

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun: false,
    undo: false,
    now: false,
    clipsFile: null,
    date: null,
    timezone: "America/Chicago",
    baseUrl: process.env.OPENCLIPS_URL || "http://localhost:3000",
    output: null,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--undo") { args.undo = true; continue; }
    if (arg === "--now") { args.now = true; continue; }
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "clips") args.clipsFile = val;
    else if (key === "date") args.date = val;
    else if (key === "timezone") args.timezone = val;
    else if (key === "base-url") args.baseUrl = val;
    else if (key === "output") args.output = val;
  }
  // Default to --now when no explicit date is given
  if (!args.date && !args.undo) args.now = true;
  return args;
}

// ── Ledger ────────────────────────────────────────────────────────────────────

function ledgerPath() {
  return process.env.OPENCLIPS_BUFFER_LEDGER || DEFAULT_LEDGER_PATH;
}

function loadLedger() {
  const p = ledgerPath();
  if (!existsSync(p)) return [];
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    // migrate old object format { scheduledDates, runs } → array
    if (parsed && !Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveLedger(entries) {
  const p = ledgerPath();
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(entries, null, 2) + "\n");
}

function ledgerDates(ledger) {
  return new Set(ledger.map((e) => e.date));
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function nextPublishingDate(ledger, timezone) {
  const used = ledgerDates(ledger);
  // Start from tomorrow
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + 1);
  for (let i = 0; i < 365; i++) {
    const dateStr = toDateString(candidate);
    if (!used.has(dateStr)) return dateStr;
    candidate.setDate(candidate.getDate() + 1);
  }
  throw new Error("Could not find an unused publishing date in the next year.");
}

function slotToIso(dateStr, slot, timezone) {
  // Build the local time string and convert to UTC ISO
  const localStr = `${dateStr}T${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}:00`;
  // Use Intl to get the UTC offset for this timezone on this date
  const tempDate = new Date(`${localStr}Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // Find offset by comparing local time in the target tz to what we want
  const parts = Object.fromEntries(
    formatter.formatToParts(tempDate).map(({ type, value }) => [type, value]),
  );
  // Get the offset string, e.g. "GMT-5"
  const offsetStr = parts.timeZoneName || "GMT-6";
  const offsetMatch = offsetStr.match(/GMT([+-]\d+)/);
  const offsetHours = offsetMatch ? -Number(offsetMatch[1]) : 6;
  const utcDate = new Date(`${dateStr}T${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}:00.000Z`);
  utcDate.setHours(utcDate.getHours() + offsetHours);
  return utcDate.toISOString();
}

// ── Media URL resolution ──────────────────────────────────────────────────────

function resolvePublicUrl(clip) {
  const base = (process.env.OPENCLIPS_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");

  // Already a public URL (GitHub CDN, Discord, etc.)
  if (/^https?:\/\//i.test(clip.downloadUrl || "")) return clip.downloadUrl;

  // Explicit base URL prefix
  if (base && (clip.downloadUrl || clip._fileName)) {
    const rel = clip.downloadUrl?.startsWith("/") ? clip.downloadUrl : `/${clip._fileName || path.basename(clip._filePath || "")}`;
    return `${base}${rel}`;
  }

  const fileName = clip._fileName || path.basename(clip._filePath || "");
  if (!fileName || !/\.mp4$/i.test(fileName)) return null;

  // Code repo raw URL — preferred when clips are committed directly (not in storage repo)
  const codeRepo = (process.env.GITHUB_CODE_REPO || "").trim();
  const codeBranch = (process.env.GITHUB_CODE_BRANCH || "").trim();
  if (codeRepo && codeBranch) {
    return `https://raw.githubusercontent.com/${codeRepo}/${codeBranch}/clips/${fileName}`;
  }

  // GitHub storage repo raw URL fallback
  const githubRepo = process.env.GITHUB_STORAGE_REPO || "panavmhatre/openclips";
  const githubBranch = process.env.GITHUB_STORAGE_BRANCH || "main";
  const githubDir = (process.env.GITHUB_STORAGE_DIR || "clips").replace(/^\/+|\/+$/g, "");
  return `https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/${githubDir}/${fileName}`;
}

// ── Buffer API ────────────────────────────────────────────────────────────────

async function bufferGraphql(query) {
  const token = process.env.BUFFER_API_KEY || process.env.BUFFER_ACCESS_TOKEN || "";
  if (!token) throw new Error("BUFFER_API_KEY is not set.");
  const res = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Buffer non-JSON response: ${text.slice(0, 200)}`); }
  if (json?.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!res.ok) throw new Error(`Buffer HTTP ${res.status}: ${text.slice(0, 200)}`);
  return json?.data || {};
}

function graphqlString(s) {
  return JSON.stringify(String(s || ""));
}

let _channelServiceMap = null;
async function getChannelServiceMap() {
  if (_channelServiceMap) return _channelServiceMap;
  const data = await bufferGraphql(`
    query GetOrganizations {
      account { organizations { id name } }
    }
  `);
  const orgs = data?.account?.organizations || [];
  const map = new Map();
  for (const org of orgs) {
    const channelData = await bufferGraphql(`
      query GetChannels {
        channels(input: { organizationId: ${graphqlString(org.id)} }) {
          id service
        }
      }
    `);
    for (const ch of channelData?.channels || []) {
      map.set(String(ch.id), String(ch.service || "").toLowerCase());
    }
  }
  _channelServiceMap = map;
  return map;
}

function buildMetadataField(service, clip) {
  const title = (clip?.hook || clip?.title || "Podcast clip").slice(0, 100);
  switch (service) {
    case "instagram":
      return "metadata: { instagram: { type: reel, shouldShareToFeed: true } }";
    case "youtube":
      return `metadata: { youtube: { title: ${graphqlString(title)}, categoryId: ${graphqlString(process.env.BUFFER_YOUTUBE_CATEGORY_ID || "22")} } }`;
    case "tiktok":
      return `metadata: { tiktok: { title: ${graphqlString(title)} } }`;
    default:
      return "";
  }
}

async function createPost({ channelId, text, mediaUrl, dueAt, clip }) {
  const serviceMap = await getChannelServiceMap();
  const service = serviceMap.get(String(channelId)) || "";
  const metadataField = buildMetadataField(service, clip);
  const query = `
    mutation CreatePost {
      createPost(
        input: {
          text: ${graphqlString(text)}
          channelId: ${graphqlString(channelId)}
          schedulingType: automatic
          mode: customScheduled
          dueAt: ${graphqlString(dueAt)}
          ${metadataField}
          assets: [{ video: { url: ${graphqlString(mediaUrl)} } }]
        }
      ) {
        ... on PostActionSuccess {
          post { id text }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  const data = await bufferGraphql(query);
  const result = data?.createPost;
  if (result?.message) throw new Error(result.message);
  if (!result?.post?.id) throw new Error("Buffer did not return a post ID.");
  return result.post;
}

// ── Caption text ──────────────────────────────────────────────────────────────

/** Return the best display hook for a clip — never a truncated ALL-CAPS fragment. */
function resolveHook(clip) {
  const raw = (clip.hook || "").trim();
  // Truncated: all-caps, no sentence-ending punctuation, or dangling common word at the end
  const truncated =
    raw.length === 0 ||
    (raw === raw.toUpperCase() && raw.length > 10 && !/[.?!…]$/.test(raw)) ||
    /\b(a|an|the|and|or|but|of|in|on|to|for|with|by|from|that|this|than|more|no|not|\d+)$/i.test(raw);
  if (truncated) return (clip.title || clip._projectTitle || raw || "Podcast clip").slice(0, 120);
  return raw;
}

function buildSportsHashtags(clip) {
  const tags = [];
  const text = `${clip.hook || ""} ${clip.title || ""} ${clip.focus || ""} ${(clip.tags || []).join(" ")}`.toLowerCase();
  if (/world cup|fifa|soccer|football/.test(text)) tags.push("#WorldCup2026", "#FIFA");
  if (/ufc|mma|fight|knockout/.test(text)) tags.push("#UFC", "#MMA");
  if (/nfl|touchdown|quarterback/.test(text)) tags.push("#NFL");
  if (/nba|basketball|buzzer/.test(text)) tags.push("#NBA");
  if (/record|history|all.time/.test(text)) tags.push("#HistoryMade");
  if (/comeback|impossible|nobody believed/.test(text)) tags.push("#Comeback");
  tags.push("#Sports", "#Highlights");
  return [...new Set(tags)].slice(0, 6).join(" ");
}

function buildPostText(clip) {
  const hook = resolveHook(clip);
  const isSports = String(clip._projectLayout || clip.layout || "").toLowerCase() === "sports"
    || Boolean(clip.sport || clip.teams || clip.scoreboard);

  if (isSports) {
    // Sports-specific: punchy hook + scoreboard context + emotional body + tags
    const parts = [hook];
    if (clip.scoreboard) parts.push(`🏟️ ${clip.scoreboard}`);
    if (clip.focus) parts.push(`\n${clip.focus}`);
    else if (clip.emotion) parts.push(`\n${clip.emotion.charAt(0).toUpperCase() + clip.emotion.slice(1)} moment. Watch to the end.`);
    const momentTags = Array.isArray(clip.tags) && clip.tags.length
      ? clip.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")
      : "";
    parts.push(`\n${momentTags} ${buildSportsHashtags(clip)}`.trim());
    return parts.filter(Boolean).join("\n").trim();
  }

  const focus = clip.focus ? `\n\n${clip.focus}` : "";
  return `${hook}${focus}`.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

async function deletePost(postId) {
  const data = await bufferGraphql(`
    mutation { deletePost(input:{ id: ${graphqlString(postId)} }) {
      ... on DeletePostSuccess { id }
      ... on VoidMutationError { message }
    } }
  `);
  const result = data?.deletePost;
  if (result?.message) throw new Error(result.message);
  return result?.id;
}

async function undoLastSchedule(ledger) {
  const last = [...ledger].reverse().find((e) => e.clips?.some((c) => Object.keys(c.postIds || {}).length > 0));
  if (!last) {
    process.stderr.write("No scheduled entries with post IDs found in ledger.\n");
    return ledger;
  }
  process.stderr.write(`Undoing schedule for ${last.date}...\n`);
  let anyFailed = false;
  for (const clip of last.clips) {
    for (const [channelId, postId] of Object.entries(clip.postIds || {})) {
      try {
        await deletePost(postId);
        process.stderr.write(`  [deleted] ${postId} (${channelId})\n`);
      } catch (err) {
        process.stderr.write(`  [error] ${postId}: ${err.message}\n`);
        anyFailed = true;
      }
    }
    clip.postIds = {};
  }
  last.undoneAt = new Date().toISOString();
  if (anyFailed) process.stderr.write("Some deletions failed — check Buffer manually.\n");
  return ledger;
}

async function main() {
  const args = parseArgs(process.argv);

  // --undo: delete last schedule's Buffer posts and update ledger
  if (args.undo) {
    const ledger = loadLedger();
    const updated = await undoLastSchedule(ledger);
    saveLedger(updated);
    process.stderr.write("Undo complete. Ledger updated.\n");
    return;
  }

  // Load clips
  let clips;
  if (args.clipsFile) {
    clips = JSON.parse(readFileSync(args.clipsFile, "utf8"));
  } else {
    const raw = await readStdin();
    if (!raw) {
      process.stderr.write("Error: provide clips via --clips=<file> or stdin.\n");
      process.exit(1);
    }
    clips = JSON.parse(raw);
  }

  if (!Array.isArray(clips) || !clips.length) {
    process.stderr.write("Error: clips input must be a non-empty JSON array.\n");
    process.exit(1);
  }

  // Use all clips passed in — rank script already limited the count to the desired number.
  // SLOT_TIMES is only used in --date (legacy) mode; --now posts all clips 2 min apart.
  const selectedClips = clips;

  // Resolve channel IDs
  const channelIds = (process.env.BUFFER_CHANNEL_IDS || "")
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  if (!args.dryRun && !channelIds.length) {
    process.stderr.write("Error: set BUFFER_CHANNEL_IDS to comma-separated Buffer channel IDs.\n");
    process.exit(1);
  }

  // Determine publishing date and build schedule plan
  const ledger = loadLedger();
  let publishDate;
  let plan;

  if (args.now) {
    // Post immediately: clips spaced 2 minutes apart starting 2 minutes from now
    publishDate = toDateString(new Date());
    const START_LEAD_MS = 2 * 60 * 1000;
    const CLIP_GAP_MS = 2 * 60 * 1000;
    plan = selectedClips.map((clip, i) => {
      const dueAt = new Date(Date.now() + START_LEAD_MS + i * CLIP_GAP_MS).toISOString();
      const mediaUrl = resolvePublicUrl(clip);
      const text = buildPostText(clip);
      return { slot: i + 1, clip, dueAt, mediaUrl, text };
    });
  } else {
    // Legacy: pick next unused date and assign to fixed time slots
    publishDate = args.date || nextPublishingDate(ledger, args.timezone);
    const usedDates = ledgerDates(ledger);
    if (args.date && usedDates.has(publishDate)) {
      process.stderr.write(`Error: ${publishDate} is already in the ledger. Choose a different date.\n`);
      process.exit(1);
    }
    const MIN_LEAD_MS = 5 * 60 * 1000;
    const nowMs = Date.now();
    let earliestNextMs = nowMs + MIN_LEAD_MS;
    plan = selectedClips.map((clip, i) => {
      const slot = SLOT_TIMES[i] || SLOT_TIMES[SLOT_TIMES.length - 1];
      let dueAtMs = new Date(slotToIso(publishDate, slot, args.timezone)).getTime();
      if (dueAtMs < earliestNextMs) dueAtMs = earliestNextMs;
      earliestNextMs = dueAtMs + MIN_LEAD_MS;
      const dueAt = new Date(dueAtMs).toISOString();
      const mediaUrl = resolvePublicUrl(clip);
      const text = buildPostText(clip);
      return { slot: i + 1, clip, dueAt, mediaUrl, text };
    });
  }

  // Validate MP4 files exist locally
  for (const item of plan) {
    const filePath = item.clip._filePath || item.clip.filePath;
    if (filePath && !existsSync(filePath)) {
      process.stderr.write(`Warning: local file not found: ${filePath}\n`);
    }
    if (!item.mediaUrl) {
      process.stderr.write(`Warning: no public URL resolved for slot ${item.slot} "${item.clip.title || item.clip.hook}". Set OPENCLIPS_PUBLIC_BASE_URL.\n`);
    }
  }

  // Print plan
  const modeLabel = args.now ? "POST NOW" : "SCHEDULED";
  process.stderr.write(`\nSchedule plan for ${publishDate} (${args.dryRun ? "DRY RUN" : "LIVE"} / ${modeLabel}):\n`);
  process.stderr.write(`Channels: ${channelIds.length ? channelIds.join(", ") : "(not set)"}\n\n`);
  for (const item of plan) {
    process.stderr.write(
      `  Slot ${item.slot} @ ${item.dueAt}\n` +
      `    Hook: "${item.clip.hook || item.clip.title}"\n` +
      `    File: ${item.clip._fileName || item.clip.filePath || "(unknown)"}\n` +
      `    URL:  ${item.mediaUrl || "(no public URL)"}\n\n`,
    );
  }

  if (args.dryRun) {
    process.stderr.write("Dry run complete. Re-run without --dry-run to schedule.\n");
    if (args.output) {
      writeFileSync(args.output, JSON.stringify({ dryRun: true, date: publishDate, plan }, null, 2));
    }
    return;
  }

  // Pre-flight: check Buffer capacity on every channel before posting anything
  process.stderr.write(`Checking Buffer capacity...\n`);
  const needed = plan.length;
  for (const channelId of channelIds) {
    const data = await bufferGraphql(`
      query GetQueueCount {
        channel(id: ${graphqlString(channelId)}) {
          id
          scheduledPosts: posts(filter: { status: scheduled }) { nodes { id } }
        }
      }
    `).catch(() => null);
    const used = data?.channel?.scheduledPosts?.nodes?.length ?? null;
    if (used !== null) {
      // Buffer free plan has 10 slots; paid plans have 100+.
      // Since --now mode schedules posts in the next few minutes (they publish immediately),
      // any pending posts from the previous run are already published by the next run.
      // Warn if close to 10 but never block — individual post failures will surface below.
      const freeLimit = 10;
      const available = freeLimit - used;
      if (available < needed) {
        process.stderr.write(`  Warning: Channel ${channelId} may be near queue limit (${used} pending, need ${needed} more). Proceeding anyway — posts scheduled for immediate delivery will publish quickly.\n`);
      } else {
        process.stderr.write(`  Channel ${channelId}: ${used} pending, ${available} available (need ${needed}) ✓\n`);
      }
    }
  }

  // Live scheduling
  process.stderr.write(`Scheduling to Buffer...\n`);
  const results = [];
  let anyFailed = false;

  for (const item of plan) {
    if (!item.mediaUrl) {
      process.stderr.write(`  [skip] Slot ${item.slot}: no public media URL.\n`);
      anyFailed = true;
      continue;
    }

    const postIds = {};
    for (const channelId of channelIds) {
      try {
        const post = await createPost({ channelId, text: item.text, mediaUrl: item.mediaUrl, dueAt: item.dueAt, clip: item.clip });
        postIds[channelId] = post.id;
        process.stderr.write(`  [ok] Slot ${item.slot} → channel ${channelId}: ${post.id}\n`);
      } catch (err) {
        process.stderr.write(`  [error] Slot ${item.slot} → channel ${channelId}: ${err.message}\n`);
        anyFailed = true;
      }
      // Avoid Buffer rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }
    results.push({ slot: item.slot, title: item.clip.hook || item.clip.title, file: item.clip._fileName || "", postIds, dueAt: item.dueAt, clipId: item.clip.id });
  }

  // Only write to ledger if at least one post succeeded
  const anySucceeded = results.some((r) => Object.keys(r.postIds).length > 0);
  if (!anySucceeded) {
    process.stderr.write("\nAll posts failed — ledger NOT updated. Fix errors and retry.\n");
    process.exit(1);
  }

  // Update ledger — use datetime key in --now mode so multiple runs/day don't collide
  const ledgerEntry = {
    date: args.now ? new Date().toISOString() : publishDate,
    clips: results,
    scheduledAt: new Date().toISOString(),
  };
  const updatedLedger = [...ledger, ledgerEntry];
  saveLedger(updatedLedger);
  process.stderr.write(`\nLedger updated at ${ledgerPath()}\n`);

  const resultJson = JSON.stringify({ date: publishDate, clips: results }, null, 2);
  if (args.output) {
    writeFileSync(args.output, resultJson);
    process.stderr.write(`Schedule result written to ${args.output}\n`);
  } else {
    process.stdout.write(resultJson + "\n");
  }

  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
