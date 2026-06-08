#!/usr/bin/env node
/**
 * submit-openclips-projects.mjs
 *
 * Reads source URLs from stdin (one per line) or --urls arg and POSTs each
 * to the OpenClips /api/projects endpoint.
 *
 * Usage:
 *   echo "https://youtu.be/..." | node scripts/submit-openclips-projects.mjs
 *   node scripts/submit-openclips-projects.mjs --urls "url1,url2"
 *   node scripts/latest-youtube-search.mjs | node scripts/submit-openclips-projects.mjs
 *
 * Options:
 *   --base-url  OpenClips server base URL (default: http://localhost:3000)
 *   --urls      Comma-separated list of URLs (alternative to stdin)
 *   --dry-run   Print what would be submitted without actually submitting
 */

import { createInterface } from "node:readline";

const args = process.argv.slice(2);
function getFlag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] || "" : null;
}

const BASE_URL = (getFlag("--base-url") || process.env.OPENCLIPS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const DRY_RUN = args.includes("--dry-run");
const urlsFlag = getFlag("--urls");

async function readStdinLines() {
  if (process.stdin.isTTY) return [];
  return new Promise((resolve) => {
    const lines = [];
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    });
    rl.on("close", () => resolve(lines));
  });
}

async function submitUrl(url) {
  const response = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl: url }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `HTTP ${response.status}`);
  }
  return body.project;
}

async function waitForServer(maxMs = 10_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  let urls = [];

  if (urlsFlag) {
    urls = urlsFlag.split(",").map((u) => u.trim()).filter(Boolean);
  } else {
    urls = await readStdinLines();
  }

  urls = urls.filter((u) => u.startsWith("http"));

  if (!urls.length) {
    console.error("No URLs provided. Pipe URLs via stdin or use --urls flag.");
    process.exit(1);
  }

  console.error(`[openclips] ${DRY_RUN ? "[dry-run] " : ""}Submitting ${urls.length} URL(s) to ${BASE_URL}`);

  if (!DRY_RUN) {
    const ok = await waitForServer();
    if (!ok) {
      console.error(`[openclips] Server not reachable at ${BASE_URL}. Start it with: npm run dev`);
      process.exit(1);
    }
  }

  const submitted = [];
  const failed = [];

  for (const url of urls) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would submit: ${url}`);
      submitted.push({ url, id: "dry-run", status: "queued" });
      continue;
    }
    try {
      const project = await submitUrl(url);
      console.log(`[ok] ${project.id} — ${project.title || url}`);
      submitted.push({ url, id: project.id, title: project.title, status: project.status });
    } catch (err) {
      console.error(`[fail] ${url}: ${err.message}`);
      failed.push({ url, error: err.message });
    }
  }

  console.error(`\n[openclips] Submitted: ${submitted.length}  Failed: ${failed.length}`);
  if (submitted.length) {
    console.error("[openclips] Projects are processing in the background. Monitor at " + BASE_URL);
  }

  if (failed.length) process.exit(1);
}

main();
