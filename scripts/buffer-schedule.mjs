#!/usr/bin/env node
/**
 * buffer-schedule.mjs
 *
 * Reads the top-ranked clips from rank-openclips-clips.mjs (via --clips-json
 * or by calling it directly) and schedules them to all three Buffer channels.
 *
 * Schedule slots: 9:00 AM, 10:30 AM, 12:00 PM, 1:30 PM, 3:00 PM (America/Chicago)
 * Each run picks the next date not already in the local ledger.
 *
 * Usage:
 *   node scripts/buffer-schedule.mjs --dry-run
 *   node scripts/buffer-schedule.mjs --dry-run --date 2026-06-10
 *   BUFFER_API_KEY=xxx BUFFER_CHANNEL_IDS=ch1,ch2,ch3 node scripts/buffer-schedule.mjs
 *
 * Required env vars for live scheduling:
 *   BUFFER_API_KEY              Buffer GraphQL bearer token
 *   BUFFER_CHANNEL_IDS          Comma-separated channel IDs (3 channels)
 *   BUFFER_PUBLIC_CLIP_BASE_URL Optional base URL to convert /media/clips/...
 *                               paths to public URLs
 *
 * Optional env vars:
 *   OPENCLIPS_BUFFER_LEDGER     Path for the schedule ledger
 *                               (default: ~/.codex/openclips-buffer-publisher-ledger.json)
 *   OPENCLIPS_BASE_URL          OpenClips server (default: http://localhost:3000)
 */

import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
function getFlag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] || "" : null;
}

const DRY_RUN = args.includes("--dry-run");
const FORCE_DATE = getFlag("--date") || "";
const CLIPS_JSON_FLAG = getFlag("--clips-json");
const BASE_URL = (getFlag("--base-url") || process.env.OPENCLIPS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const BUFFER_API_URL = "https://api.buffer.com";
const BUFFER_API_KEY = process.env.BUFFER_API_KEY || "";
const BUFFER_CHANNEL_IDS = (process.env.BUFFER_CHANNEL_IDS || "")
  .split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
const PUBLIC_BASE_URL = (process.env.BUFFER_PUBLIC_CLIP_BASE_URL || process.env.OPENCLIPS_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const LEDGER_PATH = process.env.OPENCLIPS_BUFFER_LEDGER ||
  path.join(homedir(), ".codex", "openclips-buffer-publisher-ledger.json");

// Schedule: 9:00 AM CST + 90 min intervals
const SLOT_TIMES_CST = ["09:00", "10:30", "12:00", "13:30", "15:00"];
const TZ = "America/Chicago";

// ─── Ledger ──────────────────────────────────────────────────────────────────

async function loadLedger() {
  try {
    const raw = await readFile(LEDGER_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { scheduledDates: [], entries: [] };
  }
}

async function saveLedger(ledger) {
  await mkdir(path.dirname(LEDGER_PATH), { recursive: true });
  await writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function todayInTz(tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

function nextScheduleDate(ledger, forceDate) {
  if (forceDate) {
    if (ledger.scheduledDates.includes(forceDate)) {
      throw new Error(`Date ${forceDate} is already in the ledger. Use a different date or pass --dry-run to preview.`);
    }
    return forceDate;
  }

  const today = todayInTz(TZ);
  let candidate = today;
  for (let i = 0; i < 90; i++) {
    if (!ledger.scheduledDates.includes(candidate)) return candidate;
    const d = new Date(candidate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    candidate = d.toISOString().slice(0, 10);
  }
  throw new Error("Could not find an unscheduled date in the next 90 days.");
}

function buildDueAt(dateStr, timeStr, tz) {
  // dateStr: "2026-06-10", timeStr: "09:00"
  const [hours, minutes] = timeStr.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);

  // Create a date in the target timezone by using Intl
  // We assemble a local datetime string and parse it as UTC offset
  const localDt = `${dateStr}T${timeStr}:00`;
  // Find UTC offset for that date/time in the timezone
  const testDate = new Date(localDt + "Z"); // interpret as UTC first
  const utcOffset = getUtcOffsetMinutes(testDate, tz);
  const utcMs = testDate.getTime() - utcOffset * 60_000;
  return new Date(utcMs).toISOString();
}

function getUtcOffsetMinutes(date, tz) {
  // Trick: format the UTC date as if it's the local timezone, then compute the diff
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  const localDate = new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
  return (localDate.getTime() - date.getTime()) / 60_000;
}

// ─── Buffer API ───────────────────────────────────────────────────────────────

async function bufferGraphql(query) {
  const response = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BUFFER_API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  let payload = {};
  try { payload = JSON.parse(text); } catch { throw new Error("Buffer returned non-JSON"); }
  if (!response.ok) throw new Error(payload?.message || `Buffer HTTP ${response.status}`);
  if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join("; "));
  return payload.data || {};
}

function gqlStr(value) {
  return JSON.stringify(String(value || ""));
}

async function createScheduledPost({ channelId, text, mediaUrl, thumbnailUrl, dueAt }) {
  const thumbnailField = thumbnailUrl ? `thumbnailUrl: ${gqlStr(thumbnailUrl)}` : "";
  const service = await getChannelService(channelId);
  const metaField = buildMetaField(service, text);
  const query = `
    mutation CreatePost {
      createPost(input: {
        text: ${gqlStr(text)}
        channelId: ${gqlStr(channelId)}
        schedulingType: automatic
        mode: customScheduled
        dueAt: ${gqlStr(dueAt)}
        ${metaField}
        assets: [{ video: { url: ${gqlStr(mediaUrl)} ${thumbnailField} } }]
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

const channelServiceCache = new Map();

async function getChannelService(channelId) {
  if (channelServiceCache.has(channelId)) return channelServiceCache.get(channelId);
  const data = await bufferGraphql(`query { channels(input:{}) { id service } }`);
  for (const ch of data?.channels || []) channelServiceCache.set(ch.id, ch.service);
  return channelServiceCache.get(channelId) || "unknown";
}

function buildMetaField(service, text) {
  const title = text.split("\n")[0].slice(0, 100);
  switch (String(service || "").toLowerCase()) {
    case "instagram": return "metadata: { instagram: { type: reel, shouldShareToFeed: true } }";
    case "youtube": return `metadata: { youtube: { title: ${gqlStr(title)}, categoryId: "22" } }`;
    case "tiktok": return `metadata: { tiktok: { title: ${gqlStr(title)} } }`;
    default: return "";
  }
}

// ─── Clip utilities ───────────────────────────────────────────────────────────

async function loadRankedClips() {
  if (CLIPS_JSON_FLAG) {
    const raw = await readFile(CLIPS_JSON_FLAG, "utf8");
    return JSON.parse(raw);
  }
  // Call rank-openclips-clips.mjs directly
  const rankScript = path.resolve(__dirname, "rank-openclips-clips.mjs");
  const { stdout } = await execFileAsync("node", [rankScript, "--json", "--base-url", BASE_URL]);
  return JSON.parse(stdout);
}

function resolvePublicUrl(clip) {
  if (clip.githubMediaUrl) return clip.githubMediaUrl;
  if (clip.discordMediaUrl) return clip.discordMediaUrl;
  if (clip.cloudMediaUrl) return clip.cloudMediaUrl;
  if (PUBLIC_BASE_URL && clip.downloadUrl) {
    const relative = clip.downloadUrl.replace(/^https?:\/\/[^/]+/, "");
    return PUBLIC_BASE_URL + relative;
  }
  return null;
}

function buildPostText(clip) {
  const hook = (clip.hook || clip.title || "").trim().toUpperCase();
  const focus = (clip.focus || "").trim();
  const cta = "Follow PodByte Edits for daily finance & tech breakdowns.";
  return [hook, focus.slice(0, 300), cta].filter(Boolean).join("\n\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!DRY_RUN) {
    if (!BUFFER_API_KEY) {
      console.error("BUFFER_API_KEY is required for live scheduling. Use --dry-run to preview.");
      process.exit(1);
    }
    if (!BUFFER_CHANNEL_IDS.length) {
      console.error("BUFFER_CHANNEL_IDS is required. Set it to comma-separated Buffer channel IDs.");
      process.exit(1);
    }
  }

  const ledger = await loadLedger();
  const scheduleDate = nextScheduleDate(ledger, FORCE_DATE);

  console.log(`\nBuffer Schedule Plan`);
  console.log(`  Date     : ${scheduleDate}`);
  console.log(`  Timezone : ${TZ}`);
  console.log(`  Channels : ${BUFFER_CHANNEL_IDS.length ? BUFFER_CHANNEL_IDS.join(", ") : "(dry-run, no channels set)"}`);
  console.log(`  Mode     : ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  let clips;
  try {
    clips = await loadRankedClips();
  } catch (err) {
    console.error("Could not load ranked clips:", err.message);
    process.exit(1);
  }

  if (!clips.length) {
    console.error("No ranked clips available.");
    process.exit(1);
  }

  const top5 = clips.slice(0, 5);

  // Validate all clips have media URLs before live scheduling
  const missingMedia = top5.filter((clip) => !resolvePublicUrl(clip));
  if (missingMedia.length && !DRY_RUN) {
    console.error(`\n${missingMedia.length} clip(s) are missing public media URLs:`);
    missingMedia.forEach((c) => console.error(`  - ${c.title || c.clipId}`));
    console.error("\nSet BUFFER_PUBLIC_CLIP_BASE_URL or upload clips to GitHub/Discord first.");
    process.exit(1);
  }

  const plan = top5.map((clip, i) => ({
    clip,
    slot: i,
    time: SLOT_TIMES_CST[i],
    dueAt: buildDueAt(scheduleDate, SLOT_TIMES_CST[i], TZ),
    text: buildPostText(clip),
    mediaUrl: resolvePublicUrl(clip) || "(missing)",
  }));

  console.log("Schedule:\n");
  plan.forEach((item) => {
    console.log(`  Slot ${item.slot + 1} | ${item.time} CST | ${item.dueAt}`);
    console.log(`    Hook     : ${item.clip.hook || item.clip.title}`);
    console.log(`    Media    : ${item.mediaUrl}`);
    console.log(`    Channels : ${BUFFER_CHANNEL_IDS.length} channel(s)\n`);
  });

  if (DRY_RUN) {
    console.log("[dry-run] No posts created. Remove --dry-run to schedule live.");
    return;
  }

  const results = [];
  for (const item of plan) {
    for (const channelId of BUFFER_CHANNEL_IDS) {
      try {
        const post = await createScheduledPost({
          channelId,
          text: item.text,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.clip.thumbnailUrl || "",
          dueAt: item.dueAt,
        });
        console.log(`[ok] Slot ${item.slot + 1} → channel ${channelId} → post ${post.id}`);
        results.push({ slot: item.slot, channelId, postId: post.id, dueAt: item.dueAt, clipId: item.clip.clipId });
      } catch (err) {
        console.error(`[fail] Slot ${item.slot + 1} → channel ${channelId}: ${err.message}`);
      }
    }
  }

  if (results.length) {
    ledger.scheduledDates = [...new Set([...ledger.scheduledDates, scheduleDate])];
    ledger.entries = [
      ...(ledger.entries || []),
      {
        date: scheduleDate,
        scheduledAt: new Date().toISOString(),
        posts: results,
      },
    ];
    await saveLedger(ledger);
    console.log(`\n[ok] Ledger updated at ${LEDGER_PATH}`);
    console.log(`[ok] Scheduled ${results.length} post(s) for ${scheduleDate}`);
  } else {
    console.error("\n[error] No posts were created successfully.");
    process.exit(1);
  }
}

main();
