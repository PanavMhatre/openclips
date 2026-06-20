#!/usr/bin/env node
/**
 * fetch-via-render.mjs
 *
 * Routes YouTube search + download through the Render.com server to avoid
 * GitHub Actions datacenter IP blocks. The Render server uses its own IP +
 * yt-dlp cookies to search YouTube and download videos, uploading them to
 * GitHub storage and returning raw file URLs that can be processed locally.
 *
 * Usage:
 *   node scripts/fetch-via-render.mjs [--roster=sports] [--total=1] [--min-duration=120] [--output=file]
 *
 * Required env vars:
 *   OPENCLIPS_RENDER_URL    Base URL of the Render OpenClips server
 *   OPENCLIPS_FETCH_SECRET  Bearer token for the /api/fetch-videos endpoint
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { roster: "daily", total: 1, minDuration: 1200, output: null };
  for (const arg of argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "roster") args.roster = val;
    else if (key === "total") args.total = Number(val) || 1;
    else if (key === "min-duration") args.minDuration = Number(val) || 1200;
    else if (key === "output") args.output = val;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv);

  const renderUrl = (process.env.OPENCLIPS_RENDER_URL || "").replace(/\/+$/, "");
  const secret = process.env.OPENCLIPS_FETCH_SECRET || "";
  const cookiesB64 = process.env.COOKIES_B64 || "";

  if (!renderUrl) {
    process.stderr.write("Error: OPENCLIPS_RENDER_URL is not set.\n");
    process.exit(1);
  }

  const headers = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  process.stderr.write(
    `Requesting Render server to fetch videos (roster=${args.roster}, total=${args.total}, minDuration=${args.minDuration}s)...\n`,
  );
  process.stderr.write(`Render URL: ${renderUrl}\n`);
  if (cookiesB64) {
    process.stderr.write("Forwarding YouTube cookies to Render server.\n");
  } else {
    process.stderr.write("Warning: COOKIES_B64 not set — Render will use its own cookies (may fail).\n");
  }

  // Start fetch job on the Render server
  let jobId;
  try {
    const postRes = await fetch(`${renderUrl}/api/fetch-videos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        roster: args.roster,
        minDuration: args.minDuration,
        limit: args.total,
        ...(cookiesB64 ? { cookiesB64 } : {}),
      }),
    });
    if (!postRes.ok) {
      const body = await postRes.text();
      process.stderr.write(`Error: Render /api/fetch-videos returned HTTP ${postRes.status}: ${body}\n`);
      process.exit(1);
    }
    const data = await postRes.json();
    jobId = data.jobId;
    process.stderr.write(`Job started: ${jobId}\n`);
  } catch (err) {
    process.stderr.write(`Error contacting Render server: ${err.message}\n`);
    process.exit(1);
  }

  // Poll until done — 30s intervals, up to 25 minutes
  const maxAttempts = 50;
  let result = null;

  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(30_000);
    try {
      const statusRes = await fetch(`${renderUrl}/api/fetch-videos/status/${jobId}`, { headers });
      if (!statusRes.ok) {
        process.stderr.write(`  [poll ${i}/${maxAttempts}] HTTP ${statusRes.status} — retrying...\n`);
        continue;
      }
      const data = await statusRes.json();
      process.stderr.write(`  [poll ${i}/${maxAttempts}] status=${data.status} count=${data.count ?? 0}\n`);
      if (data.status === "done") {
        result = data;
        break;
      }
    } catch (err) {
      process.stderr.write(`  [poll ${i}/${maxAttempts}] error: ${err.message} — retrying...\n`);
    }
  }

  if (!result) {
    process.stderr.write("Error: timed out waiting for Render fetch-videos job.\n");
    process.exit(1);
  }

  if (!result.ok || !result.videos?.length) {
    process.stderr.write(`Error: Render fetch-videos failed: ${result.error || "no videos returned"}\n`);
    process.exit(1);
  }

  // Map to the same format as latest-youtube-search.mjs, using githubUrl as url
  const output = result.videos.map((v) => ({
    url: v.githubUrl || v.localPath || v.url,
    title: v.title || "",
    duration: v.duration || 0,
    duration_str: v.duration ? `${Math.floor(v.duration / 60)}m` : "?",
    channel: v.channel || "",
    uploader: v.uploader || "",
  }));

  process.stderr.write(`\nRender returned ${output.length} video(s):\n`);
  for (const v of output) {
    const urlPreview = (v.url || "").slice(0, 70);
    process.stderr.write(`  - ${v.title.slice(0, 65)} (${v.duration_str})\n    → ${urlPreview}\n`);
  }

  const json = JSON.stringify(output, null, 2);
  if (args.output) {
    writeFileSync(args.output, json);
    process.stderr.write(`Wrote results to ${args.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
