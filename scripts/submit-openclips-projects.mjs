#!/usr/bin/env node
/**
 * submit-openclips-projects.mjs
 *
 * Submits one or more YouTube/video URLs to the local OpenClips API, then
 * polls until every project reaches `ready` or `failed`.
 *
 * Usage:
 *   node scripts/submit-openclips-projects.mjs <url> [<url> ...]
 *   cat urls.json | node scripts/submit-openclips-projects.mjs --stdin
 *   node scripts/submit-openclips-projects.mjs --input=urls.json
 *
 * Options:
 *   --base-url=<url>   OpenClips server URL (default: http://localhost:3000)
 *   --stdin            Read JSON array of {url} or bare URL strings from stdin
 *   --input=<file>     Read JSON array from a file
 *   --poll-interval=<ms>  How often to poll status (default: 5000)
 *   --timeout=<ms>     Max wait per project (default: 3600000 = 1h)
 *   --output=<file>    Write finished project JSON array to file
 *   --genre=sports     Submit to /api/sports-projects (genre: Sports) instead of
 *                      /api/projects (genre: Podcast). Sport per video is guessed
 *                      from its title; server re-infers the precise sport anyway.
 *
 * Exits 0 if all projects are ready, 1 if any failed or timed out.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.OPENCLIPS_URL || "http://localhost:3000",
    urls: [],
    stdin: false,
    input: null,
    output: null,
    pollInterval: 5_000,
    timeout: 60 * 60 * 1000,
    genre: "podcast",
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--stdin") { args.stdin = true; continue; }
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "base-url") args.baseUrl = val;
    else if (key === "input") args.input = val;
    else if (key === "output") args.output = val;
    else if (key === "poll-interval") args.pollInterval = Number(val) || 5_000;
    else if (key === "timeout") args.timeout = Number(val) || 3_600_000;
    else if (key === "genre") args.genre = String(val || "podcast").toLowerCase();
    else if (!arg.startsWith("--")) args.urls.push(arg);
  }
  return args;
}

// ── Sport detection (best-effort hint — server re-infers the precise sport
// from the transcript in inferSportsContext, so this only needs to be a
// reasonable starting guess for the ball-tracking crop logic) ────────────────
const SPORT_KEYWORDS = [
  { sport: "Basketball", re: /\b(nba|wnba|ncaa basketball|march madness|basketball)\b/i },
  { sport: "Soccer", re: /\b(soccer|football club|premier league|la liga|bundesliga|serie a|ligue 1|uefa|champions league|europa league|fifa|world cup|mls|copa|epl)\b/i },
  { sport: "American Football", re: /\b(nfl|college football|ncaaf|super bowl|touchdown)\b/i },
  { sport: "Baseball", re: /\b(mlb|baseball|world series)\b/i },
  { sport: "Hockey", re: /\b(nhl|hockey|stanley cup)\b/i },
  { sport: "Golf", re: /\b(golf|pga|masters|ryder cup|birdie|eagle putt)\b/i },
  { sport: "Tennis", re: /\b(tennis|wimbledon|us open tennis|french open|australian open|atp|wta)\b/i },
  { sport: "MMA", re: /\b(ufc|mma|octagon)\b/i },
  { sport: "Boxing", re: /\b(boxing|knockout|heavyweight title)\b/i },
];

function detectSport(title) {
  const text = String(title || "");
  for (const { sport, re } of SPORT_KEYWORDS) {
    if (re.test(text)) return sport;
  }
  return "Sports";
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

// Keeps { url, title } objects instead of collapsing to bare URL strings —
// needed so sports mode can guess a per-video sport from its title before
// submitting.
function normalizeVideoList(raw) {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeVideoList(parsed);
    } catch {
      return raw.split(/\s+/).filter(Boolean).map((url) => ({ url, title: "" }));
    }
  }
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? { url: item, title: "" } : { url: item?.url || item?.sourceUrl || "", title: item?.title || "" }))
      .filter((v) => v.url);
  }
  return [];
}

async function submitProject(baseUrl, sourceUrl, { genre, title } = {}) {
  const isSports = genre === "sports";
  const endpoint = isSports ? "/api/sports-projects" : "/api/projects";
  const body = isSports
    ? { sourceUrl, sport: detectSport(title) }
    : { sourceUrl };
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const resBody = await res.json();
  if (!res.ok) {
    throw new Error(resBody?.error || `HTTP ${res.status}`);
  }
  return resBody.project;
}

async function pollProject(baseUrl, id, { pollInterval, timeout }) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const res = await fetch(`${baseUrl}/api/projects/${id}`);
    if (!res.ok) continue;
    const { project } = await res.json();
    const status = project?.status;
    process.stderr.write(`  [${id.slice(0, 8)}] ${project?.title || id} — ${status} (${project?.progress || 0}%)\n`);
    if (status === "ready" || status === "failed") return project;
  }
  throw new Error(`Project ${id} timed out after ${timeout / 1000}s`);
}

async function main() {
  const args = parseArgs(process.argv);
  const isSports = args.genre === "sports";

  let videos = args.urls.map((url) => ({ url, title: "" }));

  if (args.stdin) {
    const raw = await readStdin();
    videos = [...videos, ...normalizeVideoList(raw)];
  } else if (args.input) {
    const raw = readFileSync(args.input, "utf8");
    videos = [...videos, ...normalizeVideoList(raw)];
  }

  if (!videos.length) {
    process.stderr.write("Usage: node submit-openclips-projects.mjs <url> [...]\n");
    process.exit(1);
  }

  process.stderr.write(`Submitting ${videos.length} URL(s) to ${args.baseUrl} (genre: ${args.genre})...\n`);

  const submitted = [];
  for (const video of videos) {
    try {
      const project = await submitProject(args.baseUrl, video.url, { genre: args.genre, title: video.title });
      process.stderr.write(`  Queued: "${project.title}"${isSports ? ` [${project.sport}]` : ""} [${project.id}]\n`);
      submitted.push(project);
    } catch (err) {
      process.stderr.write(`  [error] ${video.url}: ${err.message}\n`);
    }
  }

  if (!submitted.length) {
    process.stderr.write("No projects were submitted.\n");
    process.exit(1);
  }

  process.stderr.write(`Polling ${submitted.length} project(s)...\n`);

  const finished = [];
  let anyFailed = false;
  await Promise.all(submitted.map(async (project) => {
    try {
      const done = await pollProject(args.baseUrl, project.id, {
        pollInterval: args.pollInterval,
        timeout: args.timeout,
      });
      finished.push(done);
      if (done.status === "failed") {
        process.stderr.write(`  [failed] "${done.title}": ${done.error}\n`);
        anyFailed = true;
      }
    } catch (err) {
      process.stderr.write(`  [error] ${project.id}: ${err.message}\n`);
      anyFailed = true;
    }
  }));

  const ready = finished.filter((p) => p.status === "ready");
  process.stderr.write(`Done: ${ready.length} ready, ${finished.length - ready.length} failed/timeout.\n`);

  const json = JSON.stringify(finished, null, 2);
  if (args.output) {
    writeFileSync(args.output, json);
    process.stderr.write(`Wrote project data to ${args.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }

  if (ready.length < 1) {
    process.stderr.write(`Error: no projects completed successfully — all downloads failed.\n`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
