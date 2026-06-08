#!/usr/bin/env node
/**
 * rank-openclips-clips.mjs
 *
 * Reads project metadata from the OpenClips API (or data/projects.json) and
 * outputs the top five clips ranked by quality for Buffer scheduling.
 *
 * Ranking criteria:
 *   + High OpenClips score (0–100)
 *   + Strong hook (not a generic label, number, or vague topic)
 *   + Clear focus/lesson text present
 *   + Valid MP4 file exists on disk (or cloud URL available)
 *   - Penalize clips that are already scheduled in Buffer
 *   - Penalize weak hooks (single label, plain number, < 4 words)
 *
 * Usage:
 *   node scripts/rank-openclips-clips.mjs
 *   node scripts/rank-openclips-clips.mjs --json          # machine-readable
 *   node scripts/rank-openclips-clips.mjs --top 3         # change result count
 *   node scripts/rank-openclips-clips.mjs --base-url URL  # custom server
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, "../data/projects.json");

const args = process.argv.slice(2);
function getFlag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] || "" : null;
}
const BASE_URL = (getFlag("--base-url") || process.env.OPENCLIPS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const JSON_OUTPUT = args.includes("--json");
const TOP_N = Math.max(1, Number(getFlag("--top")) || 6);

// Words/patterns that indicate a weak hook
const WEAK_HOOK_PATTERNS = [
  /^\d[\d,.\s%$BMK]*$/,                     // pure number / stat
  /^(intro|outro|recap|highlight|update|news|summary|topic|discussion|segment|clip|moment|part \d+)$/i,
  /^(the |a |an )?(big|key|main|important|major|top|best|new|latest) \w{1,10}$/i,
  /^(this|that|it|they|we|you) (is|are|was|were|do|did|have|has) /i, // vague pronoun openers
  /^(what|how|why|when|where) (is|are|was|were) [^A-Z]/i,            // generic question starters
];

function isWeakHook(hook) {
  if (!hook || typeof hook !== "string") return true;
  const words = hook.trim().split(/\s+/).filter(Boolean);
  if (words.length < 5) return true;  // raised from 4 — short hooks lack specificity
  const lower = hook.toLowerCase().trim();
  return WEAK_HOOK_PATTERNS.some((p) => p.test(lower));
}

function clipHasMedia(clip) {
  return Boolean(
    clip.githubMediaUrl ||
    clip.discordMediaUrl ||
    clip.cloudMediaUrl ||
    (clip.downloadUrl && clip.downloadUrl.startsWith("http")),
  );
}

function clipHasLocalFile(clip) {
  return Boolean(
    clip.githubMediaUrl ||
    clip.discordMediaUrl ||
    clip.cloudMediaUrl ||
    clip.downloadUrl,  // accept server-relative paths — upload will happen at scheduling time
  );
}

// Minimum raw Groq score to even be considered — below this the clip lacks substance
const MIN_RAW_SCORE = 70;

function scoreClip(clip, alreadyScheduledIds) {
  const rawScore = Number(clip.score) || 0;

  // Hard disqualify low-scoring clips before any adjustments
  if (rawScore < MIN_RAW_SCORE) return -999;

  let score = rawScore;

  if (isWeakHook(clip.hook)) score -= 30;
  if (!clip.focus || clip.focus.trim().length < 30) score -= 20;  // raised threshold + penalty
  if (!clipHasLocalFile(clip)) score -= 40;
  if (alreadyScheduledIds.has(clip.id)) score -= 25;  // stronger recency penalty
  if (clip.duration && clip.duration >= 28 && clip.duration <= 60) score += 10;  // sweet spot for short-form
  else if (clip.duration && clip.duration < 20) score -= 15;  // too short to deliver substance

  return score;
}

async function loadProjects() {
  // Prefer live API if server is reachable
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const body = await res.json();
      return body.projects || [];
    }
  } catch { /* fall through to file */ }

  if (existsSync(DATA_PATH)) {
    const raw = await readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Object.values(parsed).filter((p) => p.genre !== "Sports");
  }
  return [];
}

function collectCandidates(projects) {
  const candidates = [];
  for (const project of projects) {
    if (!project.clips?.length) continue;  // was: if (project.status !== "ready") continue;
    for (const clip of project.clips || []) {
      candidates.push({ project, clip });
    }
  }
  return candidates;
}

function formatRow(rank, item) {
  const { project, clip } = item;
  return [
    `#${rank} [score=${item.adjustedScore}] ${clip.hook || clip.title}`,
    `   Title    : ${clip.title}`,
    `   Focus    : ${(clip.focus || "").slice(0, 100)}`,
    `   Duration : ${clip.duration ? clip.duration.toFixed(1) + "s" : "?"}`,
    `   Project  : ${project.title}`,
    `   Clip ID  : ${clip.id}`,
    `   Media    : ${clip.githubMediaUrl || clip.discordMediaUrl || clip.cloudMediaUrl || clip.downloadUrl || "(local only)"}`,
    `   Scheduled: ${clip.lastBufferScheduleAt ? new Date(clip.lastBufferScheduleAt).toISOString() : "never"}`,
  ].join("\n");
}

async function main() {
  const projects = await loadProjects();

  if (!projects.length) {
    console.error("No ready projects found. Is OpenClips running and are clips rendered?");
    process.exit(1);
  }

  const alreadyScheduledIds = new Set();
  for (const project of projects) {
    for (const clip of project.clips || []) {
      if (clip.lastBufferScheduleAt) alreadyScheduledIds.add(clip.id);
    }
  }

  const candidates = collectCandidates(projects);

  if (!candidates.length) {
    console.error("No clips in ready projects.");
    process.exit(1);
  }

  const ranked = candidates
    .map((item) => ({
      ...item,
      adjustedScore: scoreClip(item.clip, alreadyScheduledIds),
    }))
    .filter((item) => item.adjustedScore > -999)   // drop hard-disqualified clips
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .slice(0, TOP_N);

  if (JSON_OUTPUT) {
    const output = ranked.map((item, i) => ({
      rank: i + 1,
      adjustedScore: item.adjustedScore,
      clipId: item.clip.id,
      projectId: item.project.id,
      projectTitle: item.project.title,
      hook: item.clip.hook,
      title: item.clip.title,
      focus: item.clip.focus,
      duration: item.clip.duration,
      score: item.clip.score,
      downloadUrl: item.clip.downloadUrl,
      githubMediaUrl: item.clip.githubMediaUrl,
      discordMediaUrl: item.clip.discordMediaUrl,
      cloudMediaUrl: item.clip.cloudMediaUrl,
      thumbnailUrl: item.clip.thumbnailUrl,
      lastBufferScheduleAt: item.clip.lastBufferScheduleAt || null,
      localFilePath: item.clip.downloadUrl
        ? path.resolve(__dirname, "../data/clips", path.basename(item.clip.downloadUrl))
        : null,
    }));
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`Top ${ranked.length} clips for Buffer scheduling:\n`);
    ranked.forEach((item, i) => console.log(formatRow(i + 1, item)));
  }
}

main();
