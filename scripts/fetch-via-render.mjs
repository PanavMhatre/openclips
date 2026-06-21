#!/usr/bin/env node
/**
 * fetch-via-render.mjs
 *
 * Routes YouTube search + download through an external server to avoid
 * GitHub Actions datacenter IP blocks.
 *
 * Prefers OPENCLIPS_ORACLE_URL (Oracle VM proxy) over OPENCLIPS_RENDER_URL.
 * The Oracle proxy accepts rosterContent in the POST body so it doesn't
 * need a copy of the repo.
 *
 * Usage:
 *   node scripts/fetch-via-render.mjs [--roster=sports] [--total=1] [--min-duration=1200] [--output=file]
 *
 * Env vars:
 *   OPENCLIPS_ORACLE_URL    Preferred — Oracle VM proxy URL (http://ip:7474)
 *   OPENCLIPS_RENDER_URL    Fallback — Render server URL
 *   OPENCLIPS_FETCH_SECRET  Bearer token
 *   COOKIES_B64             YouTube cookies (base64 Netscape format)
 *   YTDLP_PROXIES           Comma/newline-separated proxy list (forwarded to Render only)
 */

import { writeFileSync, readFileSync } from "node:fs";
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

  const oracleUrl = (process.env.OPENCLIPS_ORACLE_URL || "").replace(/\/+$/, "");
  const renderUrl = (process.env.OPENCLIPS_RENDER_URL || "").replace(/\/+$/, "");
  const secret = process.env.OPENCLIPS_FETCH_SECRET || "";
  const cookiesB64 = process.env.COOKIES_B64 || "";
  const proxies = process.env.YTDLP_PROXIES || "";

  // Prefer Oracle VM over Render
  const useOracle = Boolean(oracleUrl);
  const baseUrl = useOracle ? oracleUrl : renderUrl;

  if (!baseUrl) {
    process.stderr.write("Error: neither OPENCLIPS_ORACLE_URL nor OPENCLIPS_RENDER_URL is set.\n");
    process.exit(1);
  }

  const headers = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  process.stderr.write(
    `Fetching videos via ${useOracle ? "Oracle VM proxy" : "Render server"} ` +
    `(roster=${args.roster}, total=${args.total}, minDuration=${args.minDuration}s)...\n`,
  );
  process.stderr.write(`Server URL: ${baseUrl}\n`);
  if (cookiesB64) process.stderr.write("Forwarding YouTube cookies.\n");
  else process.stderr.write("Warning: COOKIES_B64 not set — server will run yt-dlp without cookies.\n");

  // Build POST body
  let postBody;
  if (useOracle) {
    // Oracle proxy needs the roster content (it doesn't have a copy of the repo)
    const rosterFile = args.roster === "sports" ? "sports-channel-roster.md" : "channel-roster.md";
    const rosterPath = path.join(__dirname, "..", "references", rosterFile);
    let rosterContent;
    try {
      rosterContent = readFileSync(rosterPath, "utf8");
    } catch {
      process.stderr.write(`Error: cannot read ${rosterPath}\n`);
      process.exit(1);
    }
    process.stderr.write(`Sending roster: ${rosterFile}\n`);
    postBody = {
      rosterContent,
      minDuration: args.minDuration,
      limit: args.total,
      ...(cookiesB64 ? { cookiesB64 } : {}),
      ...(proxies ? { proxies } : {}),
    };
  } else {
    // Render server reads the roster itself from its own copy of the repo
    if (proxies) {
      const count = proxies.split(/[,\n]/).filter(Boolean).length;
      process.stderr.write(`Forwarding ${count} proxy/proxies to Render server.\n`);
    } else {
      process.stderr.write("Warning: YTDLP_PROXIES not set — Render will use its own IP (may be blocked).\n");
    }
    postBody = {
      roster: args.roster,
      minDuration: args.minDuration,
      limit: args.total,
      ...(cookiesB64 ? { cookiesB64 } : {}),
      ...(proxies ? { proxies } : {}),
    };
  }

  // Start fetch job
  let jobId;
  try {
    const postRes = await fetch(`${baseUrl}/api/fetch-videos`, {
      method: "POST",
      headers,
      body: JSON.stringify(postBody),
    });
    if (!postRes.ok) {
      const body = await postRes.text();
      process.stderr.write(`Error: server /api/fetch-videos returned HTTP ${postRes.status}: ${body}\n`);
      process.exit(1);
    }
    const data = await postRes.json();
    jobId = data.jobId;
    process.stderr.write(`Job started: ${jobId}\n`);
  } catch (err) {
    process.stderr.write(`Error contacting server: ${err.message}\n`);
    process.exit(1);
  }

  // Poll until done — 30s intervals, up to 25 minutes
  const maxAttempts = 50;
  let result = null;

  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(30_000);
    try {
      const statusRes = await fetch(`${baseUrl}/api/fetch-videos/status/${jobId}`, { headers });
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
    process.stderr.write("Error: timed out waiting for fetch-videos job.\n");
    process.exit(1);
  }

  if (!result.ok || !result.videos?.length) {
    process.stderr.write(`Error: fetch-videos failed: ${result.error || "no videos returned"}\n`);
    process.exit(1);
  }

  // Map to the format expected by downstream scripts
  const output = result.videos.map((v) => ({
    url: v.githubUrl || v.localPath || v.url,
    title: v.title || "",
    duration: v.duration || 0,
    duration_str: v.duration ? `${Math.floor(v.duration / 60)}m` : "?",
    channel: v.channel || "",
    uploader: v.uploader || "",
  }));

  process.stderr.write(`\nServer returned ${output.length} video(s):\n`);
  for (const v of output) {
    process.stderr.write(`  - ${v.title.slice(0, 65)} (${v.duration_str})\n    → ${(v.url || "").slice(0, 70)}\n`);
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
