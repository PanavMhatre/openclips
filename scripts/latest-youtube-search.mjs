#!/usr/bin/env node
/**
 * latest-youtube-search.mjs
 *
 * Finds the newest podcast-length video from each channel in
 * references/channel-roster.md using yt-dlp, then prints a JSON array of
 * { title, url, channel, searchAlias } objects to stdout.
 *
 * Channel weights (from the roster's Weight column) control how many
 * recent videos are fetched per channel — heavier channels contribute
 * more clips to the pool, matching the 40/35/25 posting mix.
 *
 * Audio-only uploads are hard-blocked at two levels:
 *   1. yt-dlp vcodec field — "none" means no video track exists
 *   2. Title pattern — "(Audio)", "[Audio]", "audio only", etc.
 *
 * Usage:
 *   node scripts/latest-youtube-search.mjs [--min-duration=1200] [--limit=1]
 *
 * Options:
 *   --min-duration=<seconds>  Minimum video length in seconds (default: 1200 = 20 min)
 *   --limit=<n>               Base results per channel; multiplied by channel Weight (default: 1)
 *   --output=<file>           Write JSON to file instead of stdout
 *
 * Requires: yt-dlp on $PATH
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const ROSTER_PATH = path.join(ROOT_DIR, "references", "channel-roster.md");

function parseArgs(argv) {
  const args = { minDuration: 1200, limit: 1, total: 1, output: null };
  for (const arg of argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "min-duration") args.minDuration = Number(val) || 1200;
    else if (key === "limit") args.limit = Number(val) || 1;
    else if (key === "total") args.total = Number(val) || 1;
    else if (key === "output") args.output = val;
  }
  return args;
}

function parseChannelRoster(md) {
  const channels = [];
  for (const line of md.split("\n")) {
    // Match table rows with 4 columns: | Name | Handle | Search Alias | Weight |
    const match4 = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^\s|]+|https?:\/\/[^\s|]+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/);
    if (match4) {
      const [, name, handle, alias, weight] = match4;
      if (name.toLowerCase().includes("name")) continue;
      channels.push({ name: name.trim(), handle: handle.trim(), searchAlias: alias.trim(), weight: Number(weight) || 1 });
      continue;
    }
    // Fall back to 3-column rows (no weight)
    const match3 = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^\s|]+|https?:\/\/[^\s|]+)\s*\|\s*([^|]+?)\s*\|/);
    if (match3) {
      const [, name, handle, alias] = match3;
      if (name.toLowerCase().includes("name")) continue;
      channels.push({ name: name.trim(), handle: handle.trim(), searchAlias: alias.trim(), weight: 1 });
    }
  }
  return channels;
}

// Hard-block audio-only uploads by title.
// Note: \b does not work next to ( ) [ ] so those are matched without word boundaries.
const AUDIO_ONLY_TITLE_RE = /\(audio\)|\[audio\]|\baudio[\s-]only\b|\baudio\s+version\b|\bpodcast\s+audio\b/i;

async function ytDlpSearch(searchAlias, { minDuration, limit }) {
  // Fetch more candidates than needed so we can filter audio-only and still hit limit
  const fetchCount = Math.max(limit * 5, 10);
  const query = `ytsearch${fetchCount}:${searchAlias}`;
  const args = [
    "--no-check-certificate",
    "--no-playlist",
    "--flat-playlist",
    "--print", "%(webpage_url)s\t%(title)s\t%(duration)s\t%(uploader)s\t%(vcodec)s",
    "--no-warnings",
    query,
  ];
  try {
    const { stdout } = await execFileAsync("yt-dlp", args, { timeout: 45_000 });
    const results = [];
    for (const line of stdout.trim().split("\n")) {
      if (!line.trim()) continue;
      const [url, title, duration, uploader, vcodec] = line.split("\t");
      if (!url || !title) continue;
      const dur = Number(duration);
      if (!dur || isNaN(dur) || dur < minDuration) continue;

      // Hard-block audio-only: vcodec="none" means no video stream
      const vcNone = vcodec && vcodec.trim().toLowerCase() === "none";
      const titleAudio = AUDIO_ONLY_TITLE_RE.test(title);
      if (vcNone || titleAudio) {
        process.stderr.write(`    [skip audio-only] ${title.slice(0, 65)}\n`);
        continue;
      }

      results.push({
        url: url.trim(),
        title: title.trim(),
        duration: Number(duration) || 0,
        duration_str: duration ? `${Math.floor(Number(duration) / 60)}m` : "?",
        uploader: (uploader || "").trim(),
      });
      if (results.length >= limit) break;
    }
    return results;
  } catch (err) {
    process.stderr.write(`  [warn] yt-dlp search failed for "${searchAlias}": ${err.message}\n`);
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv);

  let rosterMd;
  try {
    rosterMd = readFileSync(ROSTER_PATH, "utf8");
  } catch {
    process.stderr.write(`Error: could not read ${ROSTER_PATH}\n`);
    process.exit(1);
  }

  const channels = parseChannelRoster(rosterMd);
  if (!channels.length) {
    process.stderr.write("Error: no channels found in channel-roster.md\n");
    process.exit(1);
  }

  process.stderr.write(`Searching ${channels.length} channels (min duration: ${args.minDuration}s, total cap: ${args.total})...\n`);

  const results = [];
  for (const channel of channels) {
    if (results.length >= args.total) break;
    const effectiveLimit = Math.min(args.limit * channel.weight, args.total - results.length);
    process.stderr.write(`  [w${channel.weight}] ${channel.name} — "${channel.searchAlias}" (fetching up to ${effectiveLimit})\n`);
    const videos = await ytDlpSearch(channel.searchAlias, { minDuration: args.minDuration, limit: effectiveLimit });
    for (const video of videos) {
      results.push({ ...video, channel: channel.name, searchAlias: channel.searchAlias, channelWeight: channel.weight });
      if (results.length >= args.total) break;
    }
    if (videos.length === 0) {
      process.stderr.write(`    [no results]\n`);
    } else {
      for (const v of videos) {
        process.stderr.write(`    → ${v.title.slice(0, 65)} (${v.duration_str})\n`);
      }
    }
  }

  process.stderr.write(`\nFound ${results.length} video(s) across ${channels.length} channels.\n`);

  const json = JSON.stringify(results, null, 2);
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
