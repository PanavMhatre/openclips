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
  // mweb: primary — bgutil ZIP plugin (placed in ~/.yt-dlp-plugins/ and
  //   ~/.config/yt-dlp/plugins/ by CI) provides PO token for datacenter-IP bot bypass.
  // web: fallback — uses cookies; Deno solves n-parameter JS challenge natively.
  // NOTE: --plugin-dirs is NOT recognised when set in a config file (yt-dlp limitation);
  //   ZIPs must live in the default search dirs.
  '--extractor-args "youtube:player_client=mweb,web"',
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

mkdirSync(CONFIG_DIR, { recursive: true });
writeFileSync(CONFIG_PATH, lines.join("\n") + "\n");
process.stderr.write(`Wrote yt-dlp config: ${CONFIG_PATH}\n`);
process.stdout.write(lines.join("\n") + "\n");
