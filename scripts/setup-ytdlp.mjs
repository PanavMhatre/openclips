#!/usr/bin/env node
/**
 * setup-ytdlp.mjs
 *
 * Writes ~/.config/yt-dlp/config with the settings OpenClips needs,
 * including the cookies file path if one is configured.
 *
 * Run this once after installing yt-dlp (or after updating YOUTUBE_COOKIES_FILE):
 *   node scripts/setup-ytdlp.mjs
 *
 * Environment variables:
 *   YOUTUBE_COOKIES_FILE  Path to a Netscape-format cookies.txt for YouTube auth.
 *                         Defaults to ~/.config/yt-dlp/cookies.txt if that file exists.
 *   YTDLP_PROXIES         Comma- or newline-separated list of HTTP proxy URLs.
 *                         Format: http://user:pass@host:port
 *                         A random proxy is selected per run to distribute load.
 *                         NOTE: Webshare free proxies are 1 GB/month each — a
 *                         single long podcast download can be 250-600 MB. Monitor
 *                         bandwidth and upgrade if running daily.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(homedir(), ".config", "yt-dlp");
const CONFIG_PATH = path.join(CONFIG_DIR, "config");
const DEFAULT_COOKIES = path.join(CONFIG_DIR, "cookies.txt");

const cookiesFile =
  process.env.YOUTUBE_COOKIES_FILE ||
  (existsSync(DEFAULT_COOKIES) ? DEFAULT_COOKIES : "");

const lines = [
  "--no-check-certificate",
  "--sleep-requests 2",
  "--sleep-interval 3",
  "--max-sleep-interval 8",
  "--retries 5",
  "--retry-sleep 15",
  // web: full browser client — uses cookies + bgutil PO tokens from datacenter IPs.
  // mweb: mobile web — uses cookies, good fallback if web is blocked.
  // android: Android app client — uses cookies, bypasses some rate limits.
  // Note: ios is intentionally excluded — it ignores cookies entirely.
  '--extractor-args "youtube:player_client=web,mweb,android"',
];

if (cookiesFile) {
  if (!existsSync(cookiesFile)) {
    process.stderr.write(`Warning: cookies file not found at ${cookiesFile}\n`);
  } else {
    lines.push(`--cookies ${cookiesFile}`);
    process.stderr.write(`Using YouTube cookies: ${cookiesFile}\n`);
  }
} else {
  process.stderr.write(
    "No YouTube cookies file found. Cloud/CI environments will fail with HTTP 429.\n" +
    `Export cookies from a signed-in browser and place them at: ${DEFAULT_COOKIES}\n`,
  );
}

// Proxy rotation — pick one proxy at random to distribute 1 GB/month per-proxy budget
const proxiesRaw = process.env.YTDLP_PROXIES || "";
const proxies = proxiesRaw.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
if (proxies.length) {
  const proxy = proxies[Math.floor(Math.random() * proxies.length)];
  lines.push(`--proxy ${proxy}`);
  process.stderr.write(`Using proxy: ${proxy.replace(/:([^:@]+)@/, ":***@")}\n`);
} else {
  process.stderr.write(
    "No YTDLP_PROXIES set — downloads use the runner's datacenter IP (likely blocked by YouTube).\n",
  );
}

mkdirSync(CONFIG_DIR, { recursive: true });
writeFileSync(CONFIG_PATH, lines.join("\n") + "\n");
process.stderr.write(`Wrote yt-dlp config: ${CONFIG_PATH}\n`);
process.stdout.write(lines.join("\n") + "\n");
