#!/usr/bin/env node
/**
 * latest-youtube-search.mjs
 *
 * Fetches the latest video from each channel in the roster by scraping the
 * channel's /videos page with yt-dlp (works in cloud environments where
 * ytsearch is bot-blocked). Falls back to ytsearch for entries without a
 * channel handle.
 *
 * Roster columns: | Channel Name | @handle or search term | Category |
 * If the second column starts with "@" it is treated as a YouTube handle.
 * Otherwise it is used as a ytsearch query (may fail on cloud IPs).
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

const YTDLP_BASE_ARGS = [
  "--no-check-certificates",
  "--quiet",
  "--no-warnings",
];

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
    if (!trimmed.startsWith("|") || trimmed.startsWith("| Channel") || trimmed.startsWith("|---")) continue;
    const cells = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const [name, handle, category] = cells;
    if (name && handle?.startsWith("@")) {
      channels.push({ name, handle, category: category || "General" });
    }
  }
  return channels;
}

async function fetchFromChannelPage(handle, count) {
  // handle is "@username" — scrape /videos tab
  const url = `https://www.youtube.com/${handle}/videos`;
  const { stdout } = await execFileAsync("yt-dlp", [
    ...YTDLP_BASE_ARGS,
    "--flat-playlist",
    "--get-id",
    "--get-title",
    "--playlist-end",
    String(count * 4),       // fetch a few extra to filter by duration
    "--match-filter",
    "duration > 300",
    url,
  ], { timeout: 30_000 });

  return parseIdTitlePairs(stdout, count);
}

async function fetchFromSearch(searchTerm, count) {
  const query = `ytsearch${count * 4}:${searchTerm}`;
  const { stdout } = await execFileAsync("yt-dlp", [
    ...YTDLP_BASE_ARGS,
    "--flat-playlist",
    "--get-id",
    "--get-title",
    "--match-filter",
    "duration > 300",
    "--date-after",
    formatDateOffset(60),
    query,
  ], { timeout: 30_000 });

  return parseIdTitlePairs(stdout, count);
}

function parseIdTitlePairs(stdout, max) {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const results = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const title = lines[i].trim();
    const videoId = lines[i + 1].trim();
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      results.push({ title, url: `https://www.youtube.com/watch?v=${videoId}` });
      if (results.length >= max) break;
    }
  }
  return results;
}

function formatDateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchLatestVideos(channel, count) {
  if (channel.handle.startsWith("@")) {
    return fetchFromChannelPage(channel.handle, count);
  }
  return fetchFromSearch(channel.handle, count);
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
      const videos = await fetchLatestVideos(channel, RESULTS_PER_CHANNEL);
      for (const video of videos) {
        results.push({ channel: channel.name, category: channel.category, ...video });
      }
    } catch (err) {
      const message = err?.stderr || err?.message || String(err);
      process.stderr.write(`[skip] ${channel.name}: ${String(message).slice(0, 120)}\n`);
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
