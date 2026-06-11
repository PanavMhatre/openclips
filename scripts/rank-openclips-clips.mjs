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

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import path from "node:path";

// ── Performance signals (written by fetch-performance-analytics.mjs) ─────────
function loadPerformanceSignals() {
  const sigPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "performance-signals.json");
  try {
    const raw = readFileSync(sigPath, "utf8");
    const d = JSON.parse(raw);
    process.stderr.write(`[analytics] Loaded signals from ${new Date(d.generatedAt).toLocaleString()} — ${Object.keys(d.topicScores||{}).length} topics\n`);
    return d;
  } catch {
    return null;
  }
}

// ── Strategy brief (written by the scheduled Claude routine every 3 days) ────
function loadStrategyBrief() {
  const briefPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "strategy-brief.md");
  try {
    const raw = readFileSync(briefPath, "utf8");
    // Extract boost and avoid keyword lists from the brief
    const boostMatch = raw.match(/## Boost keywords[^\n]*\n\s*([^\n#]+)/);
    const avoidMatch = raw.match(/## Avoid keywords[^\n]*\n\s*([^\n#]+)/);
    const boostWords = boostMatch ? boostMatch[1].toLowerCase().split(/[\s,]+/).filter(w => w.length > 2) : [];
    const avoidWords = avoidMatch ? avoidMatch[1].toLowerCase().split(/[\s,]+/).filter(w => w.length > 2) : [];
    if (boostWords.length || avoidWords.length) {
      process.stderr.write(`[strategy] Brief loaded — boost: ${boostWords.slice(0,5).join(", ")}... avoid: ${avoidWords.slice(0,3).join(", ")}...\n`);
    }
    return { boostWords, avoidWords };
  } catch {
    return { boostWords: [], avoidWords: [] };
  }
}

const _signals  = loadPerformanceSignals();
const _strategy = loadStrategyBrief();

function analyticsBoost(clip, signals) {
  if (!signals) return 0;
  const text = ((clip.hook || "") + " " + (clip.title || "") + " " + (clip.focus || "") + " " + (clip._projectTitle || "")).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = text.split(/\s+/).filter(w => w.length > 3);

  // Topic score — sum of normalised topic scores for matching keywords (max 20 pts)
  let topicSum = 0;
  let topicHits = 0;
  for (const w of words) {
    const s = signals.topicScores?.[w];
    if (s) { topicSum += s; topicHits++; }
  }
  const topicBoost = topicHits > 0 ? Math.min(20, Math.round((topicSum / topicHits) * 0.2)) : 0;

  // Strategy brief: boost words from Claude's analysis (+15 pts max), avoid words (-15 pts)
  let strategyBoost = 0;
  let strategyPenalty = 0;
  for (const w of words) {
    if (_strategy.boostWords.includes(w)) { strategyBoost = Math.min(15, strategyBoost + 5); }
    if (_strategy.avoidWords.includes(w)) { strategyPenalty = Math.max(-15, strategyPenalty - 5); }
  }

  const total = topicBoost + strategyBoost + strategyPenalty;
  if (total !== 0) {
    process.stderr.write(`  [analytics] "${(clip.hook||clip.title||"").slice(0,50)}" topic:+${topicBoost} strategy:${strategyBoost+strategyPenalty}\n`);
  }
  return total;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_CLIPS_DIR = path.join(ROOT_DIR, "data", "clips");
const DEFAULT_META_PATH = path.join(ROOT_DIR, "data", "projects.json");

const DEFAULT_LEDGER_PATH = path.join(homedir(), ".codex", "openclips-buffer-publisher-ledger.json");

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.OPENCLIPS_URL || "http://localhost:3000",
    top: 5,
    output: null,
    projectId: null,
    ledgerPath: process.env.OPENCLIPS_BUFFER_LEDGER || DEFAULT_LEDGER_PATH,
  };
  for (const arg of argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "base-url") args.baseUrl = val;
    else if (key === "top") args.top = Number(val) || 5;
    else if (key === "output") args.output = val;
    else if (key === "project") args.projectId = val;
    else if (key === "ledger") args.ledgerPath = val;
  }
  return args;
}

function loadSentClipIds(ledgerPath) {
  if (!existsSync(ledgerPath)) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf8"));
    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.runs) ? parsed.runs : [];  // handle old dict format
    const ids = new Set();
    for (const entry of entries) {
      for (const slot of entry.schedule || []) {
        if (slot.clipId) ids.add(slot.clipId);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

// ── Hook cleanup ──────────────────────────────────────────────────────────────

/**
 * Detect hooks that are truncated or weak and replace them with a clean version
 * derived from the clip's title (which is always complete).
 *
 * A hook is considered broken if:
 *   - It is entirely uppercase AND does not end with sentence-terminating punctuation
 *     (.  ?  !) — this matches the pattern of raw AI output that got cut off
 *   - OR it is under 5 words (too vague to be useful)
 *   - OR it ends with a common dangling word (a preposition, article, number fragment)
 */
const SENTENCE_END_RE = /[.?!…]$/;
const DANGLING_END_RE = /\b(a|an|the|and|or|but|of|in|on|at|to|for|with|by|from|that|this|than|more|no|not|\d+)$/i;

function isTruncated(hook) {
  if (!hook || hook.trim().length === 0) return true;
  const h = hook.trim();
  const words = h.split(/\s+/);
  if (words.length < 5) return true;
  // All-caps without sentence terminator = raw AI output, likely truncated
  if (h === h.toUpperCase() && h.length > 10 && !SENTENCE_END_RE.test(h)) return true;
  // Ends with a dangling word (sentence cut mid-thought)
  if (DANGLING_END_RE.test(h)) return true;
  return false;
}

/**
 * Return the best hook text for a clip.
 * Falls back: hook → title → focus (first sentence) → id
 */
function cleanHook(clip) {
  const raw = (clip.hook || "").trim();
  if (!isTruncated(raw)) return raw;

  // Use title as fallback — it's always a complete, descriptive sentence
  const title = (clip.title || clip._projectTitle || "").trim();
  if (title && title.length > 8) return title;

  // Last resort: first sentence of focus
  const focus = (clip.focus || "").trim();
  if (focus) {
    const sentence = focus.split(/[.!?]/)[0].trim();
    if (sentence.length > 8) return sentence;
  }

  return raw || clip.id || "Clip";
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
  // Extra penalty for raw truncated hooks that slipped through
  if (isTruncated(hook)) return -20;
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
  const analytics = analyticsBoost(clip, _signals); // up to +30 pts from real performance data
  return Math.max(0, base + hook + focus + duration + filePenalty + analytics);
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

function flattenClips(projects) {
  const clips = [];
  for (const project of projects) {
    if (project.status && project.status !== "ready") continue;
    for (const clip of project.clips || []) {
      const fileName = path.basename(clip.downloadUrl || clip.filePath || "");
      // Check both data/clips/ and the path the server stored on disk
      const localPath = fileName ? path.join(DATA_CLIPS_DIR, fileName) : "";
      const hasFile = Boolean(
        (localPath && existsSync(localPath)) ||
        (clip.filePath && existsSync(clip.filePath)),
      );
      const assembled = {
        ...clip,
        _projectTitle: project.title || "",
        _projectId: project.id || "",
        _hasFile: hasFile,
        _filePath: (hasFile && clip.filePath) ? clip.filePath : localPath,
        _fileName: fileName,
        _source: "api",
      };
      // Rewrite hook in-place so downstream scripts (buffer-schedule) always get clean text
      const cleaned = cleanHook(assembled);
      if (cleaned !== (assembled.hook || "").trim()) {
        process.stderr.write(`  [hook fix] "${(assembled.hook || "").slice(0, 50)}" → "${cleaned.slice(0, 60)}"\n`);
        assembled.hook = cleaned;
      }
      clips.push(assembled);
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
    clips = flattenClips(apiProjects);
  }

  // 2. Fall back to data/projects.json (server wrote it but isn't running)
  if (!clips.length) {
    const fileProjects = loadFromFile(DEFAULT_META_PATH);
    if (fileProjects) {
      process.stderr.write(`Loaded ${fileProjects.length} project(s) from data/projects.json.\n`);
      clips = flattenClips(fileProjects);
    }
  }

  if (!clips.length) {
    process.stderr.write("No clips found. Start the OpenClips server and submit source videos first.\n");
    process.exit(1);
  }

  // Exclude clips already sent to Buffer
  const sentIds = loadSentClipIds(args.ledgerPath);
  if (sentIds.size > 0) {
    const before = clips.length;
    clips = clips.filter((c) => !sentIds.has(c.id));
    process.stderr.write(`Excluded ${before - clips.length} already-sent clip(s) (${clips.length} remaining).\n`);
  }

  if (!clips.length) {
    process.stderr.write("No unsent clips available after deduplication.\n");
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
