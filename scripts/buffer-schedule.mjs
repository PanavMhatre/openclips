#!/usr/bin/env node
/**
 * Schedules the top 5 OpenClips clips to three Buffer channels.
 * Always run --dry-run first to verify the plan before going live.
 *
 * Usage:
 *   node scripts/buffer-schedule.mjs --dry-run
 *   node scripts/buffer-schedule.mjs --live
 *   node scripts/buffer-schedule.mjs --dry-run --date 2024-06-15
 *   node scripts/rank-openclips-clips.mjs --json | node scripts/buffer-schedule.mjs --live --stdin-clips
 *
 * Environment:
 *   OPENCLIPS_URL              — base URL (default: http://localhost:3000)
 *   BUFFER_CHANNEL_IDS         — comma-separated channel IDs (overrides API lookup)
 *   BUFFER_PUBLIC_CLIP_BASE_URL — optional base URL mapping /media/clips/... to public MP4 URLs
 *   OPENCLIPS_BUFFER_LEDGER    — ledger file path (default: ~/.codex/openclips-buffer-publisher-ledger.json)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const OPENCLIPS_URL = (process.env.OPENCLIPS_URL || "http://localhost:3000").replace(/\/$/, "");
const TIMEZONE = "America/Chicago";
const SCHEDULE_TIMES = ["09:00", "10:30", "12:00", "13:30", "15:00"];
const LEDGER_PATH = process.env.OPENCLIPS_BUFFER_LEDGER
  || `${homedir()}/.codex/openclips-buffer-publisher-ledger.json`;

const args = process.argv.slice(2);
const isLive = args.includes("--live");
const isDryRun = !isLive;
const dateArg = args[args.indexOf("--date") + 1] || null;
const stdinClips = args.includes("--stdin-clips");

// ─── Ledger ──────────────────────────────────────────────────────────────────

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) return { scheduledDates: [], history: [] };
  try {
    const raw = readFileSync(LEDGER_PATH, "utf8");
    const ledger = JSON.parse(raw);
    ledger.scheduledDates = ledger.scheduledDates || [];
    ledger.history = ledger.history || [];
    return ledger;
  } catch {
    return { scheduledDates: [], history: [] };
  }
}

function saveLedger(ledger) {
  const dir = LEDGER_PATH.split("/").slice(0, -1).join("/");
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
}

function nextScheduleDate(ledger) {
  if (dateArg) return dateArg;
  const used = new Set(ledger.scheduledDates);
  // Start from tomorrow
  const d = new Date();
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 60; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (!used.has(iso)) return iso;
    d.setDate(d.getDate() + 1);
  }
  throw new Error("No unscheduled date found in next 60 days.");
}

// ─── Time ────────────────────────────────────────────────────────────────────

function localToUtcIso(dateStr, timeStr, timezone) {
  // Treat dateStr+timeStr as a UTC instant to anchor the Intl formatter
  const anchor = new Date(`${dateStr}T${timeStr}:00Z`);

  // Find what the anchor UTC time looks like in the target timezone
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    })
      .formatToParts(anchor)
      .map(p => [p.type, p.value])
  );

  // tzInstant is the UTC timestamp of the timezone-displayed time
  const tzInstant = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
  ).getTime();

  // offsetMs = tzInstant - anchorMs  →  TZ = UTC + offsetMs
  // To convert local (TZ) time to UTC: UTC = local - offsetMs
  const offsetMs = tzInstant - anchor.getTime();
  const localMs = anchor.getTime(); // anchor IS the local time expressed as if UTC
  return new Date(localMs - offsetMs).toISOString();
}

// ─── Channel IDs ─────────────────────────────────────────────────────────────

async function resolveChannelIds() {
  const env = process.env.BUFFER_CHANNEL_IDS;
  if (env) {
    return env.split(",").map(id => id.trim()).filter(Boolean);
  }
  const res = await fetch(`${OPENCLIPS_URL}/api/buffer/channels`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Buffer channels API error: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.configured) throw new Error("Buffer API key is not configured in OpenClips.");
  const ids = (data.channels || []).map(ch => String(ch.id));
  if (!ids.length) throw new Error("No Buffer channels available. Check BUFFER_CHANNEL_IDS or channel filters.");
  return ids;
}

// ─── Clips ───────────────────────────────────────────────────────────────────

function scoreHook(text) {
  if (!text) return 0;
  const t = String(text).trim();
  if (t.length < 8) return 0.05;
  if (/^\d[\d.,kKmMbB%\s]*$/.test(t)) return 0.05;
  if (/^(clip \d+|moment \d+|highlight \d+)$/i.test(t)) return 0.05;
  let score = 0.40;
  if (t.includes("?")) score += 0.15;
  if (t.length >= 18 && t.length <= 110) score += 0.20;
  if (/\b(never|always|wrong|broken|truth|secret|real|actually|why|how)\b/i.test(t)) score += 0.10;
  return Math.min(1, score);
}

async function loadClipsFromStdin() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let raw = "";
  for await (const line of rl) raw += line + "\n";
  return JSON.parse(raw);
}

async function loadTopClips(count) {
  // Fetch all ready projects from API
  const res = await fetch(`${OPENCLIPS_URL}/api/projects`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Projects API error: HTTP ${res.status}`);
  const { projects } = await res.json();

  const ready = projects.filter(p => p.status === "ready");
  if (!ready.length) throw new Error("No ready projects found. Wait for rendering to complete.");

  const candidates = [];
  for (const project of ready) {
    for (const clip of (project.clips || [])) {
      if (!clip.downloadUrl) continue;
      const rs = Number(clip.score || 0) + scoreHook(clip.hook || clip.title) * 25;
      candidates.push({ project, clip, rankScore: rs });
    }
  }

  candidates.sort((a, b) => b.rankScore - a.rankScore);
  return candidates.slice(0, count);
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

async function scheduleClip(projectId, clipId, dueAt, channelIds) {
  const res = await fetch(`${OPENCLIPS_URL}/api/projects/${projectId}/clips/${clipId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelIds, mode: "customScheduled", dueAt }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const mode = isDryRun ? "DRY RUN" : "LIVE";
console.log(`\nOpenClips Buffer Scheduler — ${mode}`);
console.log(`Server  : ${OPENCLIPS_URL}`);
console.log(`Ledger  : ${LEDGER_PATH}`);
console.log(`Timezone: ${TIMEZONE}\n`);

const ledger = loadLedger();
const scheduleDate = nextScheduleDate(ledger);

if (!isDryRun && ledger.scheduledDates.includes(scheduleDate) && !dateArg) {
  // This path shouldn't be hit due to nextScheduleDate skipping used dates,
  // but guard against explicit --date re-use.
  console.error(`Error: ${scheduleDate} is already in the ledger. Use --date to override explicitly.`);
  process.exit(1);
}

console.log(`Schedule date: ${scheduleDate}\n`);

// Load clips
let clipsInput;
if (stdinClips && !process.stdin.isTTY) {
  try {
    clipsInput = await loadClipsFromStdin();
  } catch (error) {
    console.error(`Failed to parse clips from stdin: ${error.message}`);
    process.exit(1);
  }
}

let topCandidates;
if (clipsInput) {
  // Convert rank-openclips-clips.mjs JSON output to {project, clip} shape
  topCandidates = clipsInput.slice(0, 5).map(item => ({
    project: { id: item.projectId, title: item.projectTitle },
    clip: {
      id: item.clipId,
      title: item.title,
      hook: item.hook,
      focus: item.focus,
      score: item.score,
      duration: item.duration,
      downloadUrl: item.downloadUrl,
      thumbnailUrl: item.thumbnailUrl,
    },
  }));
} else {
  try {
    topCandidates = await loadTopClips(5);
  } catch (error) {
    console.error(`Failed to load clips: ${error.message}`);
    process.exit(1);
  }
}

if (!topCandidates.length) {
  console.error("No clips available for scheduling.");
  process.exit(1);
}

if (topCandidates.length < 5) {
  console.warn(`Warning: Only ${topCandidates.length} clip(s) available (5 slots).`);
}

// Load channel IDs
let channelIds;
try {
  channelIds = await resolveChannelIds();
} catch (error) {
  if (isLive) {
    console.error(`Failed to load Buffer channels: ${error.message}`);
    process.exit(1);
  }
  channelIds = ["<channel-id-1>", "<channel-id-2>", "<channel-id-3>"];
  console.warn(`Buffer channels not available (${error.message}) — using placeholders for dry-run.\n`);
}

// Build schedule plan
const plan = topCandidates.map((candidate, i) => ({
  slot: i + 1,
  time: SCHEDULE_TIMES[i] || "09:00",
  dueAt: localToUtcIso(scheduleDate, SCHEDULE_TIMES[i] || "09:00", TIMEZONE),
  project: candidate.project,
  clip: candidate.clip,
}));

// Print plan
console.log("Schedule plan:");
console.log("─".repeat(72));
plan.forEach(({ slot, time, dueAt, project, clip }) => {
  const hook = (clip.hook || clip.title || "(no hook)").slice(0, 60);
  console.log(`  Slot ${slot}  ${time} CT  →  ${dueAt}`);
  console.log(`  Hook    : ${hook}`);
  console.log(`  Project : ${String(project.title || "").slice(0, 60)}`);
  console.log(`  Clip    : ${clip.id?.slice(0, 8)}  score=${clip.score}  dur=${clip.duration}s`);
  console.log(`  MP4     : ${clip.downloadUrl}`);
  console.log();
});

console.log(`Channels (${channelIds.length}): ${channelIds.join(", ")}\n`);

// Validation
const missingMp4 = plan.filter(p => !p.clip.downloadUrl);
if (missingMp4.length) {
  console.error(`Validation failed: ${missingMp4.length} clip(s) missing downloadUrl.`);
  process.exit(1);
}

if (isDryRun) {
  console.log("Dry-run passed. To schedule for real:\n");
  console.log(`  node scripts/buffer-schedule.mjs --live\n`);
  process.exit(0);
}

// ─── Live scheduling ─────────────────────────────────────────────────────────

console.log("Posting to Buffer...\n");
const results = [];

for (const { slot, time, dueAt, project, clip } of plan) {
  const hook = (clip.hook || clip.title || "").slice(0, 50);
  process.stdout.write(`  Slot ${slot} @ ${time}: ${hook}…\n    → `);
  try {
    const result = await scheduleClip(project.id, clip.id, dueAt, channelIds);
    const n = (result.scheduled || []).length;
    const nFail = (result.failed || []).length;
    console.log(`${n} channel(s) scheduled${nFail ? `, ${nFail} failed` : ""}`);
    results.push({ slot, success: n > 0, scheduled: result.scheduled, failed: result.failed });
  } catch (error) {
    console.log(`FAILED: ${error.message}`);
    results.push({ slot, success: false, error: error.message });
  }
}

const succeeded = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
console.log(`\n${succeeded}/${plan.length} slots scheduled.`);

if (succeeded > 0) {
  if (!ledger.scheduledDates.includes(scheduleDate)) {
    ledger.scheduledDates.push(scheduleDate);
  }
  ledger.history.push({
    date: scheduleDate,
    scheduledAt: new Date().toISOString(),
    clips: plan.map((p, i) => ({
      slot: p.slot,
      time: p.time,
      dueAt: p.dueAt,
      projectId: p.project.id,
      clipId: p.clip.id,
      hook: p.clip.hook || p.clip.title || "",
      success: results[i]?.success ?? false,
    })),
  });
  saveLedger(ledger);
  console.log(`Ledger saved: ${LEDGER_PATH}`);
}

if (failed > 0) process.exitCode = 1;
