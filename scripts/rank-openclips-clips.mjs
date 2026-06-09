#!/usr/bin/env node
/**
 * rank-openclips-clips.mjs
 *
 * Reads clip metadata from the running OpenClips server (or falls back to the
 * local `clips/` directory), scores each clip, and prints the top five as a
 * JSON array to stdout.
 *
 * Usage:
 *   node scripts/rank-openclips-clips.mjs [options]
 *
 * Options:
 *   --base-url=<url>    OpenClips server URL (default: http://localhost:3000)
 *   --top=<n>           Number of clips to return (default: 5)
 *   --output=<file>     Write JSON to file instead of stdout
 *   --clips-dir=<path>  Path to local clips directory (default: ./clips)
 *   --project=<id>      Only rank clips from this project
 *
 * Scoring (0–100):
 *   - Base: clip.score from OpenClips AI (50 pts)
 *   - Hook quality penalty: weak hooks that are only a label, number, or vague
 *     topic name lose up to 20 pts.
 *   - Focus/lesson bonus: clips with a clear focus string gain up to 15 pts.
 *   - Duration sweet spot bonus: clips between 30–58s gain up to 10 pts.
 *   - File exists penalty: clips without a readable MP4 path lose 25 pts.
 *
 * Falls back to `clips/*.mp4` file listing when the server is unreachable and
 * `data/projects.json` does not exist.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_CLIPS_DIR = path.join(ROOT_DIR, "clips");
const DEFAULT_META_PATH = path.join(ROOT_DIR, "data", "projects.json");

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.OPENCLIPS_URL || "http://localhost:3000",
    top: 5,
    output: null,
    clipsDir: DEFAULT_CLIPS_DIR,
    projectId: null,
  };
  for (const arg of argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "base-url") args.baseUrl = val;
    else if (key === "top") args.top = Number(val) || 5;
    else if (key === "output") args.output = val;
    else if (key === "clips-dir") args.clipsDir = val;
    else if (key === "project") args.projectId = val;
  }
  return args;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

const WEAK_HOOK_PATTERNS = [
  /^\d[\d,. ]*[kmb]?$/i,          // bare number
  /^(clip|part|segment|episode)\s*\d+$/i,
  /^(intro|outro|opening|closing)$/i,
  /^(this|that|it|they|he|she)\b/i,
  /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,  // just two proper-noun words
];

function hookScore(hook) {
  if (!hook || hook.trim().length < 8) return -20;
  const h = hook.trim();
  if (WEAK_HOOK_PATTERNS.some((re) => re.test(h))) return -20;
  if (h.split(" ").length < 4) return -10;
  return 0;
}

function focusScore(focus) {
  if (!focus || focus.trim().length < 6) return 0;
  return 15;
}

function durationScore(seconds) {
  if (seconds >= 30 && seconds <= 58) return 10;
  if (seconds >= 20 && seconds < 30) return 4;
  if (seconds > 58 && seconds <= 65) return 6;
  return 0;
}

function scoreClip(clip) {
  const base = Math.max(0, Math.min(100, Number(clip.score) || 50));
  const hook = hookScore(clip.hook || clip.title);
  const focus = focusScore(clip.focus);
  const duration = durationScore(Number(clip.duration) || 0);
  const filePenalty = clip._hasFile ? 0 : -25;
  return Math.max(0, base + hook + focus + duration + filePenalty);
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadFromApi(baseUrl, projectId) {
  try {
    const url = projectId
      ? `${baseUrl}/api/projects/${projectId}`
      : `${baseUrl}/api/projects`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const projects = projectId ? (data.project ? [data.project] : []) : (data.projects || []);
    return projects;
  } catch {
    return null;
  }
}

function loadFromFile(metaPath) {
  try {
    const raw = readFileSync(metaPath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (typeof data === "object") return Object.values(data);
  } catch {}
  return null;
}

function loadFromClipsDir(clipsDir) {
  if (!existsSync(clipsDir)) return [];
  const files = readdirSync(clipsDir).filter((f) => f.endsWith(".mp4") && f !== ".gitkeep");
  return files.map((file) => {
    const slug = file.replace(/\.mp4$/, "").replace(/-[a-f0-9]{8}$/, "");
    const words = slug.replace(/-/g, " ");
    return {
      id: file,
      title: words.charAt(0).toUpperCase() + words.slice(1),
      hook: words.charAt(0).toUpperCase() + words.slice(1),
      focus: "",
      score: 50,
      duration: 45,
      _hasFile: true,
      _filePath: path.join(clipsDir, file),
      _fileName: file,
      _source: "clips-dir",
    };
  });
}

function flattenClips(projects, clipsDir) {
  const clips = [];
  for (const project of projects) {
    if (project.status && project.status !== "ready") continue;
    for (const clip of project.clips || []) {
      const fileName = path.basename(clip.downloadUrl || clip.filePath || "");
      const localPath = fileName ? path.join(clipsDir, fileName) : "";
      clips.push({
        ...clip,
        _projectTitle: project.title || "",
        _projectId: project.id || "",
        _hasFile: Boolean(fileName && existsSync(localPath)) || Boolean(clip.filePath && existsSync(clip.filePath)),
        _filePath: localPath || clip.filePath || "",
        _fileName: fileName,
        _source: "api",
      });
    }
  }
  return clips;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  let clips = [];

  // 1. Try the live API
  const apiProjects = await loadFromApi(args.baseUrl, args.projectId);
  if (apiProjects) {
    process.stderr.write(`Loaded ${apiProjects.length} project(s) from API.\n`);
    clips = flattenClips(apiProjects, args.clipsDir);
  }

  // 2. Fall back to data/projects.json
  if (!clips.length) {
    const fileProjects = loadFromFile(DEFAULT_META_PATH);
    if (fileProjects) {
      process.stderr.write(`Loaded ${fileProjects.length} project(s) from data/projects.json.\n`);
      clips = flattenClips(fileProjects, args.clipsDir);
    }
  }

  // 3. Fall back to clips/ directory
  if (!clips.length) {
    process.stderr.write(`Server unavailable — scanning ${args.clipsDir} for MP4 files.\n`);
    clips = loadFromClipsDir(args.clipsDir);
  }

  if (!clips.length) {
    process.stderr.write("No clips found. Run the OpenClips server and submit source videos first.\n");
    process.exit(1);
  }

  const scored = clips
    .map((clip) => ({ ...clip, _score: scoreClip(clip) }))
    .sort((a, b) => b._score - a._score);

  const top = scored.slice(0, args.top);

  process.stderr.write(`Ranked ${clips.length} clip(s). Top ${top.length}:\n`);
  for (let i = 0; i < top.length; i++) {
    const c = top[i];
    process.stderr.write(
      `  ${i + 1}. [${c._score}] "${c.hook || c.title}" (${Math.round(c.duration || 0)}s) — ${c._fileName || c.id}\n`,
    );
  }

  const json = JSON.stringify(top, null, 2);
  if (args.output) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(args.output, json);
    process.stderr.write(`Wrote ranked clips to ${args.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
