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
const PLUGIN_DIR = path.join(homedir(), ".yt-dlp-plugins");

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
  // web: primary — supports cookies, n-challenge solved by yt-dlp's built-in JS engine.
  // mweb: fallback — uses bgutil PO token for datacenter-IP bot-check bypass.
  // tv_embedded: last resort with minimal anti-bot checks.
  '--extractor-args "youtube:player_client=web,mweb,tv_embedded"',
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
