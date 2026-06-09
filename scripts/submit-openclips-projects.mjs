#!/usr/bin/env node
/**
 * Submits one or more video URLs to OpenClips for clip generation.
 * Reads URLs from arguments, --file, or stdin.
 *
 * IMPORTANT: YouTube bot-detection protection
 *   Videos are submitted one at a time with a 45-second gap between each.
 *   This prevents simultaneous yt-dlp processes from triggering YouTube's
 *   rate-limit (429) and SABR bot-detection lockout.
 *   Use --no-stagger to disable (not recommended for YouTube URLs).
 *
 * Usage:
 *   node scripts/submit-openclips-projects.mjs https://youtu.be/...
 *   node scripts/submit-openclips-projects.mjs --file urls.txt
 *   cat urls.txt | node scripts/submit-openclips-projects.mjs
 *   node scripts/latest-youtube-search.mjs | node scripts/submit-openclips-projects.mjs
 *
 * Environment:
 *   OPENCLIPS_URL  — base URL (default: http://localhost:3000)
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const OPENCLIPS_URL = (process.env.OPENCLIPS_URL || "http://localhost:3000").replace(/\/$/, "");

const args = process.argv.slice(2);
const fileFlag = args.indexOf("--file");
const noStagger = args.includes("--no-stagger");

// Delay between submissions to avoid YouTube bot detection (default 45s)
const STAGGER_MS = 45_000;

async function collectUrls() {
  if (fileFlag >= 0) {
    const content = readFileSync(args[fileFlag + 1], "utf8");
    return content.split("\n").map(l => l.trim()).filter(l => l.startsWith("http"));
  }

  const positional = args.filter(a => a.startsWith("http"));
  if (positional.length) return positional;

  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    const lines = [];
    for await (const line of rl) {
      const trimmed = line.trim();
      if (trimmed.startsWith("http")) lines.push(trimmed);
    }
    return lines;
  }

  return [];
}

async function submitUrl(sourceUrl) {
  const res = await fetch(`${OPENCLIPS_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.project;
}

// Poll until a project leaves "queued" status (confirming yt-dlp download started)
async function waitForDownloadStart(projectId, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 4_000));
    try {
      const res = await fetch(`${OPENCLIPS_URL}/api/projects`, { signal: AbortSignal.timeout(5_000) });
      const { projects } = await res.json();
      const p = projects.find(x => x.id === projectId);
      if (!p) return;
      if (p.status !== "queued") return; // moved to fetching/transcribing/etc
    } catch {
      // ignore transient errors
    }
  }
}

// Verify server is reachable
try {
  const health = await fetch(`${OPENCLIPS_URL}/api/health`, { signal: AbortSignal.timeout(5_000) });
  if (!health.ok) throw new Error(`HTTP ${health.status}`);
  const { tools } = await health.json();
  if (!tools.ffmpeg || !tools.groq) {
    console.warn(`Warning: missing tools — ffmpeg=${tools.ffmpeg} groq=${tools.groq}`);
  }
} catch (error) {
  console.error(`OpenClips server not reachable at ${OPENCLIPS_URL}: ${error.message}`);
  console.error("Start it with: npm run dev");
  process.exit(1);
}

const urls = await collectUrls();
if (!urls.length) {
  console.error("No URLs provided.");
  console.error("Usage: node scripts/submit-openclips-projects.mjs <url1> [url2] ...");
  console.error("       node scripts/latest-youtube-search.mjs | node scripts/submit-openclips-projects.mjs");
  process.exit(1);
}

const isYouTube = urls.some(u => u.includes("youtube.com") || u.includes("youtu.be"));
const stagger = !noStagger && urls.length > 1 && isYouTube;

if (stagger) {
  console.log(`Submitting ${urls.length} YouTube URL(s) — staggered (${STAGGER_MS / 1000}s between each to avoid bot detection)\n`);
} else {
  console.log(`Submitting ${urls.length} URL(s) to ${OPENCLIPS_URL}\n`);
}

const results = [];
for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const label = url.length > 72 ? url.slice(0, 72) + "…" : url;
  process.stdout.write(`  ${label}\n    → `);
  try {
    const project = await submitUrl(url);
    console.log(`queued  id=${project.id.slice(0, 8)}  "${project.title?.slice(0, 50) || ""}"`);
    results.push({ url, id: project.id, status: "queued" });

    // Stagger: wait for this project to start downloading before queuing the next
    if (stagger && i < urls.length - 1) {
      process.stderr.write(`  Waiting for download to start before next submission…`);
      await waitForDownloadStart(project.id);
      process.stderr.write(` done. Pausing ${STAGGER_MS / 1000}s…\n`);
      await new Promise(r => setTimeout(r, STAGGER_MS));
    }
  } catch (error) {
    console.log(`FAILED: ${error.message}`);
    results.push({ url, status: "failed", error: error.message });
  }
}

const queued = results.filter(r => r.status === "queued").length;
const failed = results.filter(r => r.status === "failed").length;

console.log(`\n${queued} queued, ${failed} failed.`);
if (queued > 0) {
  console.log(`\nMonitor at ${OPENCLIPS_URL} or with:`);
  console.log(`  curl -s ${OPENCLIPS_URL}/api/projects | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.projects.slice(0,10).forEach(p=>console.log(p.status.padEnd(12),p.progress+'%',p.title?.slice(0,50)))"`);
}

if (failed > 0) process.exitCode = 1;
