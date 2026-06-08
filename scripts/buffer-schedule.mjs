#!/usr/bin/env node
/**
 * buffer-schedule.mjs
 *
 * Rank the top five OpenClips clips and schedule them to all configured Buffer
 * channels on the next unscheduled publishing day.
 *
 * Schedule times (America/Chicago): 9:00, 10:30, 12:00, 13:30, 15:00
 *
 * Usage:
 *   node scripts/buffer-schedule.mjs [options]
 *
 * Options:
 *   --dry-run         Print schedule plan without posting to Buffer or writing ledger
 *   --date YYYY-MM-DD Force a specific publish date (skips ledger date selection)
 *   --clips-file F    JSON file from rank-openclips-clips.mjs --json (re-ranks if omitted)
 *   --base-url U      OpenClips server URL (default: http://localhost:3000)
 *   --top N           Number of clips to schedule (default: 5)
 *
 * Required env (live mode):
 *   BUFFER_API_KEY        Buffer API bearer token
 *   BUFFER_CHANNEL_IDS    Comma-separated Buffer channel IDs
 *
 * Optional env:
 *   OPENCLIPS_BUFFER_LEDGER   Path to ledger file (default: ~/.openclips/buffer-ledger.json)
 *   OPENCLIPS_URL             OpenClips server URL (default: http://localhost:3000)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const BASE_URL_FLAG = args.indexOf("--base-url");
const BASE_URL = BASE_URL_FLAG >= 0 ? args[BASE_URL_FLAG + 1] : (process.env.OPENCLIPS_URL || "http://localhost:3000");
const DATE_FLAG = args.indexOf("--date");
const FORCED_DATE = DATE_FLAG >= 0 ? args[DATE_FLAG + 1] : null;
const CLIPS_FILE_FLAG = args.indexOf("--clips-file");
const CLIPS_FILE = CLIPS_FILE_FLAG >= 0 ? args[CLIPS_FILE_FLAG + 1] : null;
const TOP_FLAG = args.indexOf("--top");
const TOP_N = TOP_FLAG >= 0 ? Math.max(1, Number(args[TOP_FLAG + 1]) || 5) : 5;

const TIMEZONE = "America/Chicago";
const SLOT_HOURS = [9, 10.5, 12, 13.5, 15];

const DEFAULT_LEDGER_PATH = path.join(homedir(), ".openclips", "buffer-ledger.json");
const LEDGER_PATH = process.env.OPENCLIPS_BUFFER_LEDGER || DEFAULT_LEDGER_PATH;

async function main() {
  const channelIds = parseChannelIds();
  if (!DRY_RUN && !channelIds.length) {
    console.error("Set BUFFER_CHANNEL_IDS=id1,id2,id3 before running in live mode.");
    process.exit(1);
  }

  const clips = await loadClips();
  if (!clips.length) {
    console.error("No rankable clips found. Wait for projects to reach 'ready' status.");
    process.exit(1);
  }
  const selected = clips.slice(0, TOP_N);

  const ledger = await loadLedger();
  const publishDate = FORCED_DATE || nextPublishDate(ledger);
  const plan = buildPlan(selected, publishDate, channelIds);

  printPlan(plan, DRY_RUN);

  if (DRY_RUN) {
    console.log("\n[dry-run] No posts created. Run without --dry-run to schedule live.");
    return;
  }

  if (!process.env.BUFFER_API_KEY) {
    console.error("BUFFER_API_KEY is not set. Cannot schedule live.");
    process.exit(1);
  }

  const missingMp4 = selected.filter((c) => !c.githubMediaUrl && !c.discordMediaUrl && !c.downloadUrl);
  if (missingMp4.length) {
    console.error(`${missingMp4.length} clip(s) have no accessible MP4 URL. Re-run after cloud upload completes.`);
    for (const c of missingMp4) console.error(`  Clip ${c.clipId}: ${c.hook}`);
    process.exit(1);
  }

  const ledgerEntry = { date: publishDate, scheduledAt: new Date().toISOString(), clips: [] };

  for (const item of plan) {
    process.stdout.write(`Scheduling clip ${item.rank}/${plan.length}: ${item.hook.slice(0, 50)}…\n`);
    const postIds = [];
    const errors = [];

    const result = await scheduleClip(item.projectId, item.clipId, channelIds, item.dueAt);
    for (const s of result.scheduled || []) postIds.push(s.postId);
    for (const f of result.failed || []) errors.push(f.error);

    if (errors.length) console.error(`  ✗ ${errors.length} channel(s) failed: ${errors.join("; ")}`);
    if (postIds.length) console.log(`  ✓ ${postIds.length} channel(s) scheduled — post IDs: ${postIds.join(", ")}`);

    ledgerEntry.clips.push({
      rank: item.rank, projectId: item.projectId, clipId: item.clipId,
      hook: item.hook, dueAt: item.dueAt, channelIds, postIds,
    });
  }

  await appendLedger(ledger, publishDate, ledgerEntry);
  console.log(`\nLedger updated → ${LEDGER_PATH}`);
  console.log(`Published date: ${publishDate}`);
}

function parseChannelIds() {
  return String(process.env.BUFFER_CHANNEL_IDS || "").split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
}

async function loadClips() {
  if (CLIPS_FILE) {
    const text = await readFile(CLIPS_FILE, "utf8");
    return JSON.parse(text);
  }
  return fetchAndRankClips();
}

async function fetchAndRankClips() {
  const resp = await fetch(`${BASE_URL}/api/projects`);
  if (!resp.ok) throw new Error(`OpenClips API error: HTTP ${resp.status}`);
  const { projects } = await resp.json();

  const WEAK = [
    /^podcast (moment|clip|highlight)s?$/i,
    /^(ai|tech|business|finance|startup) (and|moment|clip|highlight|talk|update)s?$/i,
    /^(big|major|key|top|best|great|interesting|important|huge) (concern|update|insight|moment|clip|news)s?$/i,
    /^[\d,.]+[kmbKMB%$]?\s*(million|billion|percent|travelers?|users?|dollars?|revenue)?$/i,
    /^(viral moment|short form clip|standalone moment|local fallback|this scene|the hook lands|why this will stop)/i,
    /^(the future of|the rise of|all about|deep dive|quick take|hot take|breaking news)/i,
  ];
  const NAMED = /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b|\b(OPENAI|TESLA|APPLE|GOOGLE|META|AMAZON|NVIDIA|ANTHROPIC|MICROSOFT)\b/;

  const candidates = [];
  for (const project of projects) {
    if (project.status !== "ready" || !project.clips?.length) continue;
    for (const clip of project.clips) {
      let score = Number(clip.score) || 0;
      const hook = String(clip.hook || "").trim();
      const hasCloud = Boolean(clip.githubMediaUrl || clip.discordMediaUrl);
      if (hasCloud) score += 8;
      if (!hook || !clip.focus) score -= 10;
      if (hook && WEAK.some((re) => re.test(hook))) score -= 20;
      else if (hook && NAMED.test(hook)) score += 5;
      if (clip.bufferSchedules?.length) score -= 12;
      if (!clip.downloadUrl && !hasCloud) continue;
      candidates.push({
        projectId: project.id, clipId: clip.id, hook, focus: clip.focus || "",
        score: Number(clip.score) || 0, adjustedScore: Math.max(0, score),
        downloadUrl: clip.downloadUrl || "", githubMediaUrl: clip.githubMediaUrl || "",
        discordMediaUrl: clip.discordMediaUrl || "", thumbnailUrl: clip.thumbnailUrl || "",
        alreadyScheduled: (clip.bufferSchedules?.length || 0) > 0,
      });
    }
  }
  return candidates.sort((a, b) => b.adjustedScore - a.adjustedScore);
}

async function loadLedger() {
  if (existsSync(LEDGER_PATH)) {
    try { return JSON.parse(await readFile(LEDGER_PATH, "utf8")); } catch { /* corrupt, reset */ }
  }
  return { scheduledDates: [], entries: [] };
}

function nextPublishDate(ledger) {
  const used = new Set(ledger.scheduledDates || []);
  let date = new Date();
  if (used.has(toDateString(date))) date = addDays(date, 1);
  while (used.has(toDateString(date))) date = addDays(date, 1);
  return toDateString(date);
}

function buildPlan(clips, publishDate, channelIds) {
  return clips.map((clip, i) => {
    const slotHour = SLOT_HOURS[i] ?? SLOT_HOURS[SLOT_HOURS.length - 1] + (i - SLOT_HOURS.length + 1) * 1.5;
    return { rank: i + 1, ...clip, dueAt: toChicagoIso(publishDate, slotHour), channelIds, slotLabel: formatSlotLabel(slotHour) };
  });
}

function printPlan(plan, isDryRun) {
  const mode = isDryRun ? "[DRY RUN] " : "";
  console.log(`\n${mode}Schedule plan — ${plan[0]?.dueAt?.slice(0, 10) || "??"}  (${TIMEZONE})\n`);
  console.log("Rank  Time (CT)  Hook");
  console.log("-".repeat(72));
  for (const item of plan) {
    console.log(`${String(item.rank).padStart(4)}  ${item.slotLabel.padEnd(10)}  ${item.hook.slice(0, 54)}`);
  }
  console.log();
  for (const item of plan) {
    console.log(`[${item.rank}] ${item.dueAt}  ${item.hook}`);
    console.log(`    projectId: ${item.projectId}  clipId: ${item.clipId}`);
    console.log(`    focus: ${item.focus?.slice(0, 100)}`);
    console.log();
  }
}

async function scheduleClip(projectId, clipId, channelIds, dueAt) {
  const resp = await fetch(`${BASE_URL}/api/projects/${projectId}/clips/${clipId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelIds, mode: "customScheduled", dueAt }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body?.error || `HTTP ${resp.status}`);
  return body;
}

async function appendLedger(ledger, date, entry) {
  ledger.scheduledDates = [...new Set([...(ledger.scheduledDates || []), date])];
  ledger.entries = [...(ledger.entries || []), entry];
  await mkdir(path.dirname(LEDGER_PATH), { recursive: true });
  await writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf8");
}

function toDateString(date) {
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toChicagoIso(dateString, hourDecimal) {
  const hour = Math.floor(hourDecimal);
  const minute = Math.round((hourDecimal - hour) * 60);
  const localStr = `${dateString}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const probe = new Date(`${localStr}Z`);
  const ctFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE, hour: "numeric", minute: "numeric", hour12: false, timeZoneName: "shortOffset",
  });
  const parts = ctFormatter.formatToParts(probe);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-6";
  const offsetMatch = offsetPart.match(/GMT([+-]\d+)(?::(\d+))?/);
  const offsetHours = offsetMatch ? Number(offsetMatch[1]) : -6;
  const offsetMinutes = offsetMatch?.[2] ? Number(offsetMatch[2]) : 0;
  const totalOffsetMs = (offsetHours * 60 + (offsetHours < 0 ? -offsetMinutes : offsetMinutes)) * 60 * 1000;
  return new Date(probe.getTime() - totalOffsetMs).toISOString();
}

function formatSlotLabel(hourDecimal) {
  const hour = Math.floor(hourDecimal);
  const minute = Math.round((hourDecimal - hour) * 60);
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

main().catch((err) => { console.error(err.message); process.exit(1); });
