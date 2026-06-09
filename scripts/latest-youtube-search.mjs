#!/usr/bin/env node
/**
 * Finds the newest video URL from each channel in references/channel-roster.md.
 * Requires yt-dlp to be installed.
 *
 * Usage:
 *   node scripts/latest-youtube-search.mjs
 *   node scripts/latest-youtube-search.mjs --count 2
 *   node scripts/latest-youtube-search.mjs --output urls.txt
 *   node scripts/latest-youtube-search.mjs --category "Tech & AI"
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROSTER_PATH = path.join(__dirname, "..", "references", "channel-roster.md");

const args = process.argv.slice(2);
const countFlag = args.indexOf("--count");
const outputFlag = args.indexOf("--output");
const categoryFlag = args.indexOf("--category");
const videosPerChannel = countFlag >= 0 ? Math.max(1, Number(args[countFlag + 1]) || 1) : 1;
const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : null;
const categoryFilter = categoryFlag >= 0 ? args[categoryFlag + 1]?.toLowerCase() : null;

function parseChannelRoster(text) {
  const channels = [];
  let currentCategory = "";

  for (const line of text.split("\n")) {
    // Track category headers (## Category Name)
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      currentCategory = headingMatch[1].trim();
      continue;
    }

    // Skip if filtering by category and this doesn't match
    if (categoryFilter && !currentCategory.toLowerCase().includes(categoryFilter)) continue;

    // Parse table rows: | Name | @handle | Search Query |
    const rowMatch = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^|\s]+)\s*\|\s*([^|]+?)\s*\|/);
    if (!rowMatch) continue;

    const [, name, handle, searchQuery] = rowMatch;
    // Skip header rows and divider rows
    if (name.startsWith("-") || name.toLowerCase() === "channel name") continue;

    channels.push({
      name: name.trim(),
      handle: handle.trim(),
      searchQuery: searchQuery.trim(),
      category: currentCategory,
    });
  }

  return channels;
}

async function getLatestVideoIds(channel, count) {
  const channelUrl = `https://www.youtube.com/${channel.handle}/videos`;

  // Try channel playlist first (most reliable)
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--no-check-certificate",
      "--flat-playlist",
      "--no-warnings",
      "--no-playlist-reverse",
      "--print", "%(id)s",
      "--playlist-end", String(count),
      channelUrl,
    ], { timeout: 30_000 });

    const ids = stdout.trim().split("\n").filter(Boolean).slice(0, count);
    if (ids.length) return ids;
  } catch {
    // fall through to search fallback
  }

  // Fallback: yt-dlp search
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--no-check-certificate",
      "--flat-playlist",
      "--no-warnings",
      "--print", "%(id)s",
      "--playlist-end", String(count),
      `ytsearch${count}:${channel.searchQuery}`,
    ], { timeout: 30_000 });

    return stdout.trim().split("\n").filter(Boolean).slice(0, count);
  } catch {
    return [];
  }
}

// Verify yt-dlp is available
try {
  await execFileAsync("yt-dlp", ["--version"], { timeout: 5_000 });
} catch {
  console.error("yt-dlp is not installed or not in PATH. Install it: https://github.com/yt-dlp/yt-dlp");
  process.exit(1);
}

const rosterText = readFileSync(ROSTER_PATH, "utf8");
const channels = parseChannelRoster(rosterText);

if (!channels.length) {
  console.error(`No channels found in ${ROSTER_PATH}${categoryFilter ? ` matching category "${categoryFilter}"` : ""}.`);
  process.exit(1);
}

console.error(`Searching ${channels.length} channel(s) for ${videosPerChannel} video(s) each...`);

const allUrls = [];
for (const channel of channels) {
  process.stderr.write(`  [${channel.category}] ${channel.handle} ... `);
  const ids = await getLatestVideoIds(channel, videosPerChannel);
  if (ids.length) {
    process.stderr.write(`${ids.length} found\n`);
    ids.forEach(id => allUrls.push(`https://www.youtube.com/watch?v=${id}`));
  } else {
    process.stderr.write(`none found\n`);
  }
}

console.error(`\nTotal: ${allUrls.length} URL(s) found.`);

const output = allUrls.join("\n");
if (outputPath) {
  writeFileSync(outputPath, output + "\n");
  console.error(`Wrote to ${outputPath}`);
} else {
  if (allUrls.length) console.log(output);
}
