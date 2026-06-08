#!/usr/bin/env node
/**
 * latest-youtube-search.mjs
 *
 * Fetch the newest video URL from each channel in references/channel-roster.md
 * using yt-dlp. Prints one URL per line to stdout.
 *
 * Usage:
 *   node scripts/latest-youtube-search.mjs [--count N] [--json]
 *
 * Options:
 *   --count N   Videos per channel to fetch (default: 1)
 *   --json      Output JSON array instead of plain URLs
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const ROSTER_PATH = path.join(ROOT_DIR, "references", "channel-roster.md");

const args = process.argv.slice(2);
const countFlag = args.indexOf("--count");
const PER_CHANNEL = countFlag >= 0 ? Math.max(1, Number(args[countFlag + 1]) || 1) : 1;
const JSON_OUTPUT = args.includes("--json");

async function main() {
  const rosterText = await readFile(ROSTER_PATH, "utf8");
  const channels = parseRoster(rosterText);

  if (!channels.length) {
    console.error("No channels found in references/channel-roster.md");
    process.exit(1);
  }

  const ytDlpBin = await resolveYtDlp();
  if (!ytDlpBin) {
    console.error("yt-dlp not found in PATH. Install it: pip install yt-dlp");
    process.exit(1);
  }

  const results = [];

  for (const channel of channels) {
    const url = channelUrl(channel.handle);
    process.stderr.write(`  Fetching ${channel.name} (${url})…\n`);
    try {
      const videos = await fetchLatestVideos(ytDlpBin, url, PER_CHANNEL);
      for (const video of videos) {
        results.push({ ...video, channel: channel.name, category: channel.category });
        if (!JSON_OUTPUT) process.stdout.write(video.url + "\n");
      }
    } catch (err) {
      process.stderr.write(`  ✗ ${channel.name}: ${err.message}\n`);
    }
  }

  if (JSON_OUTPUT) {
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  }
}

function parseRoster(text) {
  const channels = [];
  const lines = text.split("\n");
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      inTable = false;
      headerPassed = false;
      continue;
    }
    if (!inTable) {
      inTable = true;
      headerPassed = false;
      continue;
    }
    if (/^\|[-| ]+\|$/.test(trimmed)) {
      headerPassed = true;
      continue;
    }
    if (!headerPassed) continue;

    const cols = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const name = cols[0];
    const handle = cols[1];
    const category = cols[2] || "";
    if (!handle || handle === "YouTube Handle / URL") continue;
    channels.push({ name, handle, category });
  }

  return channels;
}

function channelUrl(handle) {
  if (handle.startsWith("http")) return handle;
  if (handle.startsWith("@")) return `https://www.youtube.com/${handle}`;
  return `https://www.youtube.com/@${handle}`;
}

async function fetchLatestVideos(ytDlpBin, channelUrl, count) {
  const { stdout } = await execFileAsync(
    ytDlpBin,
    [
      "--flat-playlist",
      "--playlist-end", String(count),
      "--print", "%(webpage_url)s\t%(title)s\t%(duration)s",
      "--no-warnings",
      "--quiet",
      channelUrl,
    ],
    { timeout: 30_000 },
  );

  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [url, title, duration] = line.split("\t");
      return { url: url?.trim(), title: title?.trim() || "", duration: Number(duration) || 0 };
    })
    .filter((v) => v.url?.startsWith("http"));
}

async function resolveYtDlp() {
  for (const bin of ["yt-dlp", "yt_dlp"]) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5_000 });
      return bin;
    } catch {
      // not found, try next
    }
  }
  return null;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
