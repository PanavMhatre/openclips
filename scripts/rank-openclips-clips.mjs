#!/usr/bin/env node
/**
 * Reads OpenClips project data and outputs the top N clips ranked for scheduling.
 * Reads from the live API (preferred) or falls back to data/projects.json.
 *
 * Usage:
 *   node scripts/rank-openclips-clips.mjs
 *   node scripts/rank-openclips-clips.mjs --count 5
 *   node scripts/rank-openclips-clips.mjs --json
 *   node scripts/rank-openclips-clips.mjs --json | node scripts/buffer-schedule.mjs --live --stdin-clips
 *
 * Environment:
 *   OPENCLIPS_URL  — base URL (default: http://localhost:3000)
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENCLIPS_URL = (process.env.OPENCLIPS_URL || "http://localhost:3000").replace(/\/$/, "");
const DATA_PATH = path.join(__dirname, "..", "data", "projects.json");

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const countFlag = args.indexOf("--count");
const topCount = countFlag >= 0 ? Math.max(1, Number(args[countFlag + 1]) || 5) : 5;

async function loadProjects() {
  try {
    const res = await fetch(`${OPENCLIPS_URL}/api/projects`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const data = await res.json();
      return { projects: data.projects || [], source: "api" };
    }
  } catch {
    // fall through to file
  }

  if (existsSync(DATA_PATH)) {
    const raw = readFileSync(DATA_PATH, "utf8");
    const map = JSON.parse(raw);
    const projects = Object.values(map).filter(p => p.genre !== "Sports");
    return { projects, source: "file" };
  }

  throw new Error(
    `Could not load projects from ${OPENCLIPS_URL}/api/projects or ${DATA_PATH}.\n` +
    "Make sure OpenClips is running (npm run dev) or data/projects.json exists."
  );
}

// Hook quality scoring: penalise weak/generic hooks, reward specific compelling ones
function scoreHook(text) {
  if (!text) return 0;
  const t = String(text).trim();
  if (t.length < 8) return 0.05;
  // Just a number (e.g. "1.4M views") or percentage
  if (/^\d[\d.,kKmMbB%\s]*$/.test(t)) return 0.05;
  // Generic placeholder hooks
  if (/^(clip \d+|moment \d+|highlight \d+|scene \d+|top clip)$/i.test(t)) return 0.05;
  // Vague meta-labels the LLM sometimes emits
  if (/\b(podcast moment|short form clip|standalone moment|viral moment|strong clip)\b/i.test(t)) return 0.10;

  let score = 0.40;
  // Question hooks grab attention
  if (t.includes("?")) score += 0.15;
  // Good length range
  if (t.length >= 18 && t.length <= 110) score += 0.20;
  // First-person or second-person engagement
  if (/\b(i |you |we |my |your |our )/i.test(t)) score += 0.10;
  // Contrast / power words
  if (/\b(never|always|wrong|broken|lie|truth|secret|real|actually|why|how)\b/i.test(t)) score += 0.10;
  return Math.min(1, score);
}

function rankScore(project, clip) {
  const base = Number(clip.score || 0); // OpenClips 0–100 score
  const hookBonus = scoreHook(clip.hook || clip.title) * 25;
  const focusBonus = clip.focus && clip.focus.length > 20 ? 8 : 0;
  const mp4Bonus = clip.downloadUrl ? 15 : 0;
  const dur = Number(clip.duration || 0);
  const durBonus = dur >= 30 && dur <= 60 ? 8 : dur >= 15 ? 3 : 0;
  // Slight boost for more recent projects
  const ageMs = Date.now() - new Date(project.createdAt || 0).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const recencyBonus = ageDays < 2 ? 5 : ageDays < 7 ? 2 : 0;

  return base + hookBonus + focusBonus + mp4Bonus + durBonus + recencyBonus;
}

let result;
try {
  result = await loadProjects();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const { projects, source } = result;

if (!jsonOutput) {
  console.error(`Loaded ${projects.length} project(s) from ${source}.`);
}

const readyProjects = projects.filter(p => p.status === "ready");

if (!readyProjects.length) {
  const counts = {};
  projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
  console.error("No ready projects found. Status summary:");
  Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([status, n]) => console.error(`  ${status.padEnd(14)} ${n}`));
  process.exit(1);
}

// Gather all eligible clips — skip any already sent to Buffer
function alreadyScheduled(clip) {
  return (clip.bufferSchedules || []).some(s => s.status === "scheduled");
}

const candidates = [];
for (const project of readyProjects) {
  for (const clip of (project.clips || [])) {
    if (!clip.downloadUrl) continue;
    if (alreadyScheduled(clip)) continue;
    candidates.push({
      projectId: project.id,
      projectTitle: project.title || "",
      projectCreatedAt: project.createdAt || "",
      clip,
      rankScore: rankScore(project, clip),
    });
  }
}

if (!candidates.length) {
  console.error("No clips with download URLs found across ready projects.");
  process.exit(1);
}

candidates.sort((a, b) => b.rankScore - a.rankScore);
const top = candidates.slice(0, topCount);

if (jsonOutput) {
  const output = top.map(({ projectId, projectTitle, clip, rankScore: rs }) => ({
    projectId,
    projectTitle,
    clipId: clip.id,
    title: clip.title || "",
    hook: clip.hook || clip.title || "",
    focus: clip.focus || "",
    reasoning: clip.reasoning || "",
    score: Number(clip.score || 0),
    rankScore: Math.round(rs * 10) / 10,
    duration: Number(clip.duration || 0),
    downloadUrl: clip.downloadUrl,
    thumbnailUrl: clip.thumbnailUrl || "",
    srtUrl: clip.srtUrl || "",
  }));
  console.log(JSON.stringify(output, null, 2));
} else {
  const divider = "─".repeat(70);
  console.log(`\nTop ${top.length} clip(s) from ${readyProjects.length} ready project(s):\n`);
  top.forEach(({ projectId, projectTitle, clip, rankScore: rs }, i) => {
    const hook = clip.hook || clip.title || "(no hook)";
    console.log(`${String(i + 1).padStart(2)}. [rank ${Math.round(rs).toString().padStart(3)}]  ${hook}`);
    console.log(`    Project  : ${projectTitle}`);
    console.log(`    Duration : ${clip.duration}s  |  OpenClips score: ${clip.score}`);
    if (clip.focus) console.log(`    Focus    : ${String(clip.focus).slice(0, 90)}`);
    console.log(`    Download : ${clip.downloadUrl}`);
    console.log(`    IDs      : project=${projectId.slice(0, 8)}  clip=${clip.id.slice(0, 8)}`);
    if (i < top.length - 1) console.log();
  });
  console.log(`\n${divider}`);
  console.log(`Run with --json to pipe output into buffer-schedule.mjs.`);
}
