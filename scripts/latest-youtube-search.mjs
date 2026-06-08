#!/usr/bin/env node
/**
 * latest-youtube-search.mjs
 *
 * Fetch the newest video URL from each channel in references/channel-roster.md.
 * Uses the YouTube Data API v3 (via googleapis.com) when YOUTUBE_API_KEY is set,
 * falling back to yt-dlp for local environments where YouTube is accessible directly.
 *
 * Usage:
 *   node scripts/latest-youtube-search.mjs [--count N] [--json]
 *
 * Options:
 *   --count N   Videos per channel to fetch (default: 1)
 *   --json      Output JSON array instead of plain URLs
 *
 * Env:
 *   YOUTUBE_API_KEY   YouTube Data API v3 key (required in cloud; optional locally)
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
const YT_API_KEY = process.env.YOUTUBE_API_KEY || "";

async function main() {
  const rosterText = await readFile(ROSTER_PATH, "utf8");
  const channels = parseRoster(rosterText);

  if (!channels.length) {
    console.error("No channels found in references/channel-roster.md");
    process.exit(1);
  }

  const useDataApi = Boolean(YT_API_KEY);
  if (useDataApi) {
    process.stderr.write(`Using YouTube Data API v3 (${channels.length} channels)\n`);
  } else {
    const ytDlpBin = await resolveYtDlp();
    if (!ytDlpBin) {
      console.error("No YOUTUBE_API_KEY set and yt-dlp not found. Set YOUTUBE_API_KEY or install yt-dlp.");
      process.exit(1);
    }
    process.stderr.write(`Using yt-dlp (${channels.length} channels)\n`);
  }

  const results = [];

  for (const channel of channels) {
    process.stderr.write(`  ${channel.name}…\n`);
    try {
      const videos = useDataApi
        ? await fetchViaDataApi(channel.handle, PER_CHANNEL)
        : await fetchViaYtDlp(channel.handle, PER_CHANNEL);

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

// ─── YouTube Data API v3 ────────────────────────────────────────────────

async function fetchViaDataApi(handle, count) {
  const channelId = await resolveChannelId(handle);
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "id,snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(Math.min(count, 10)));
  url.searchParams.set("videoDuration", "long");
  url.searchParams.set("key", YT_API_KEY);

  const resp = await fetch(url.toString());
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data?.error?.message || `YouTube API error ${resp.status}`);
  }

  return (data.items || []).map((item) => ({
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet?.title || "",
    duration: 0,
  }));
}

async function resolveChannelId(handle) {
  // Strip leading @ for the API
  const cleanHandle = handle.replace(/^@/, "");
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", cleanHandle);
  url.searchParams.set("key", YT_API_KEY);

  const resp = await fetch(url.toString());
  const data = await resp.json();

  if (!resp.ok) throw new Error(data?.error?.message || `Channel lookup error ${resp.status}`);

  const channelId = data?.items?.[0]?.id;
  if (!channelId) throw new Error(`Channel not found for handle: ${handle}`);
  return channelId;
}

// ─── yt-dlp fallback (local environments) ────────────────────────────────────────────

async function fetchViaYtDlp(handle, count) {
  const ytDlpBin = await resolveYtDlp();
  const url = handle.startsWith("http") ? handle
    : handle.startsWith("@") ? `https://www.youtube.com/${handle}`
    : `https://www.youtube.com/@${handle}`;

  const ytArgs = ["--flat-playlist", "--playlist-end", String(count),
    "--print", "%(webpage_url)s\t%(title)s\t%(duration)s", "--no-warnings", "--quiet", url];

  // Pass cookies file if configured
  if (process.env.YT_COOKIES_FILE) {
    ytArgs.unshift("--cookies", process.env.YT_COOKIES_FILE);
  }

  const { stdout } = await execFileAsync(ytDlpBin, ytArgs, { timeout: 30_000 });

  return stdout.trim().split("\n").filter(Boolean).map((line) => {
    const [url, title, duration] = line.split("\t");
    return { url: url?.trim(), title: title?.trim() || "", duration: Number(duration) || 0 };
  }).filter((v) => v.url?.startsWith("http"));
}

async function resolveYtDlp() {
  for (const bin of ["yt-dlp", "yt_dlp"]) {
    try { await execFileAsync(bin, ["--version"], { timeout: 5_000 }); return bin; } catch { /* try next */ }
  }
  return null;
}

// ─── Roster parser ──────────────────────────────────────────────────────────────

function parseRoster(text) {
  const channels = [];
  const lines = text.split("\n");
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) { inTable = false; headerPassed = false; continue; }
    if (!inTable) { inTable = true; headerPassed = false; continue; }
    if (/^\|[-| ]+\|$/.test(trimmed)) { headerPassed = true; continue; }
    if (!headerPassed) continue;

    const cols = trimmed.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const [name, handle, category = ""] = cols;
    if (!handle || handle === "YouTube Handle / URL") continue;
    channels.push({ name, handle, category });
  }

  return channels;
}

main().catch((err) => { console.error(err.message); process.exit(1); });
