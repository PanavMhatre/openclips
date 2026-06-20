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
  // tv_embedded: YouTube's TV embedded player API — not bot-checked from datacenter IPs,
  //   requires no PO tokens or cookies for public content.
  // ios: iOS app client — second bypass layer, no PO tokens needed.
  // web: last resort with cookies; bgutil may provide PO tokens if the plugin API is compatible.
  '--extractor-args "youtube:player_client=tv_embedded,ios,web"',
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
