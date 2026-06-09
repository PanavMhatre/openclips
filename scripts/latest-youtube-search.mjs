#!/usr/bin/env node
/**
 * latest-youtube-search.mjs
 *
 * Finds the newest podcast-length video from each channel in
 * references/channel-roster.md using yt-dlp, then prints a JSON array of
 * { title, url, channel, searchAlias } objects to stdout.
 *
 * Usage:
 *   node scripts/latest-youtube-search.mjs [--min-duration=1200] [--limit=1]
 *
 * Options:
 *   --min-duration=<seconds>  Minimum video length in seconds (default: 1200 = 20 min)
 *   --limit=<n>               How many results per channel (default: 1)
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
  const args = { minDuration: 1200, limit: 1, output: null };
  for (const arg of argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "min-duration") args.minDuration = Number(val) || 1200;
    else if (key === "limit") args.limit = Number(val) || 1;
    else if (key === "output") args.output = val;
  }
  return args;
}

function parseChannelRoster(md) {
  const channels = [];
  for (const line of md.split("\n")) {
    // Match table rows: | Name | Handle | Search Alias |
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^\s|]+|https?:\/\/[^\s|]+)\s*\|\s*([^|]+?)\s*\|/);
    if (!match) continue;
    const [, name, handle, alias] = match;
    if (name.toLowerCase().includes("name")) continue; // header row
    channels.push({ name: name.trim(), handle: handle.trim(), searchAlias: alias.trim() });
  }
  return channels;
}

async function ytDlpSearch(searchAlias, { minDuration, limit }) {
  const query = `ytsearch${limit * 5}:${searchAlias}`;
  const args = [
    "--no-check-certificate",
    "--no-playlist",
    "--flat-playlist",
    "--print", "%(webpage_url)s\t%(title)s\t%(duration)s\t%(uploader)s",
    "--no-warnings",
    query,
  ];
  try {
    const { stdout } = await execFileAsync("yt-dlp", args, { timeout: 30_000 });
    const results = [];
    for (const line of stdout.trim().split("\n")) {
      if (!line.trim()) continue;
      const [url, title, duration, uploader] = line.split("\t");
      if (url && title && Number(duration) >= minDuration) {
        results.push({ url: url.trim(), title: title.trim(), duration: Number(duration) || 0, uploader: (uploader || "").trim() });
      }
      if (results.length >= limit) break;
    }
    return results;
  } catch (err) {
    process.stderr.write(`[warn] yt-dlp search failed for "${searchAlias}": ${err.message}\n`);
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

  process.stderr.write(`Searching ${channels.length} channels (min duration: ${args.minDuration}s)...\n`);

  const results = [];
  for (const channel of channels) {
    process.stderr.write(`  Searching: ${channel.name} ("${channel.searchAlias}")\n`);
    const videos = await ytDlpSearch(channel.searchAlias, { minDuration: args.minDuration, limit: args.limit });
    for (const video of videos) {
      results.push({ ...video, channel: channel.name, searchAlias: channel.searchAlias });
    }
  }

  process.stderr.write(`Found ${results.length} video(s).\n`);

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
