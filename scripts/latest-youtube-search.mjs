#!/usr/bin/env node
/**
 * latest-youtube-search.mjs
 *
 * Searches YouTube for the latest video from each channel in the roster
 * using yt-dlp's ytsearch feature. Prints one URL per line.
 *
 * Usage:
 *   node scripts/latest-youtube-search.mjs
 *   node scripts/latest-youtube-search.mjs --limit 2   # newest N per channel
 *   node scripts/latest-youtube-search.mjs --json       # machine-readable output
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROSTER_PATH = path.resolve(__dirname, "../references/channel-roster.md");

const args = process.argv.slice(2);
const limitFlag = args.indexOf("--limit");
const RESULTS_PER_CHANNEL = limitFlag !== -1 ? Math.max(1, Number(args[limitFlag + 1]) || 1) : 1;
const JSON_OUTPUT = args.includes("--json");

async function checkYtDlp() {
  try {
    await execFileAsync("yt-dlp", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function parseRoster(rosterPath) {
  const text = await readFile(rosterPath, "utf8");
  const channels = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    // Rows: | Channel Name | Search Term | Category |
    if (!trimmed.startsWith("|") || trimmed.startsWith("| Channel") || trimmed.startsWith("|---")) continue;
    const cells = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const [name, searchTerm, category] = cells;
    if (name && searchTerm) {
      channels.push({ name, searchTerm, category: category || "General" });
    }
  }
  return channels;
}

async function fetchLatestVideoUrl(searchTerm, count) {
  const searchQuery = `ytsearch${count}:${searchTerm}`;
  const { stdout } = await execFileAsync("yt-dlp", [
    "--get-id",
    "--get-title",
    "--no-playlist",
    "--flat-playlist",
    "--match-filter",
    "duration > 300",       // skip shorts < 5 min
    "--date-before",
    formatDateOffset(0),    // not in the future
    "--date-after",
    formatDateOffset(60),   // within last 60 days
    searchQuery,
  ], { timeout: 30_000 });

  const lines = stdout.trim().split("\n").filter(Boolean);
  const results = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const title = lines[i].trim();
    const videoId = lines[i + 1].trim();
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      results.push({ title, url: `https://www.youtube.com/watch?v=${videoId}` });
    }
  }
  return results.slice(0, count);
}

function formatDateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function main() {
  const hasYtDlp = await checkYtDlp();
  if (!hasYtDlp) {
    console.error("yt-dlp is not installed or not in PATH. Install it with: pip install yt-dlp");
    process.exit(1);
  }

  let channels;
  try {
    channels = await parseRoster(ROSTER_PATH);
  } catch {
    console.error(`Could not read channel roster at ${ROSTER_PATH}`);
    process.exit(1);
  }

  if (!channels.length) {
    console.error("No channels found in channel-roster.md");
    process.exit(1);
  }

  const results = [];
  for (const channel of channels) {
    try {
      const videos = await fetchLatestVideoUrl(channel.searchTerm, RESULTS_PER_CHANNEL);
      for (const video of videos) {
        results.push({ channel: channel.name, category: channel.category, ...video });
      }
    } catch (err) {
      const message = err?.message || String(err);
      process.stderr.write(`[skip] ${channel.name}: ${message.slice(0, 120)}\n`);
    }
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const item of results) {
      console.log(item.url);
    }
  }
}

main();
