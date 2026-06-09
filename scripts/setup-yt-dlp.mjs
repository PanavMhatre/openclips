#!/usr/bin/env node
/**
 * One-time session setup for yt-dlp.
 * Run this at the start of every new session before submitting any YouTube URLs.
 *
 * What it does:
 *   1. Creates ~/.config/yt-dlp/config with the settings that bypass YouTube
 *      bot detection (cookies, Node.js JS challenge solver, android+web_creator
 *      player clients, SSL bypass).
 *   2. Copies references/youtube-cookies.txt → ~/.config/yt-dlp/youtube-cookies.txt
 *      so yt-dlp can authenticate with a real YouTube session.
 *
 * If cookies have expired or bot detection triggers again, export fresh cookies
 * from your browser (logged in to YouTube) using "Get cookies.txt LOCALLY"
 * extension and overwrite references/youtube-cookies.txt.
 *
 * Usage:
 *   node scripts/setup-yt-dlp.mjs
 */

import { mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_COOKIES = path.join(__dirname, "..", "references", "youtube-cookies.txt");
const YTDLP_DIR = path.join(homedir(), ".config", "yt-dlp");
const YTDLP_COOKIES = path.join(YTDLP_DIR, "youtube-cookies.txt");
const YTDLP_CONFIG = path.join(YTDLP_DIR, "config");

// Create config directory
mkdirSync(YTDLP_DIR, { recursive: true });

// Copy cookies
if (existsSync(REPO_COOKIES)) {
  copyFileSync(REPO_COOKIES, YTDLP_COOKIES);
  console.log(`✓ Cookies copied → ${YTDLP_COOKIES}`);
} else {
  console.warn(`⚠ No cookies file found at ${REPO_COOKIES}`);
  console.warn("  Export cookies from YouTube in your browser and save to references/youtube-cookies.txt");
}

// Write yt-dlp config
const config = [
  "--no-check-certificate",
  `--cookies ${YTDLP_COOKIES}`,
  "--js-runtimes node:/opt/node22/bin/node",
  "--remote-components ejs:github",
  "--extractor-args youtube:player_client=android,web_creator",
].join("\n");

writeFileSync(YTDLP_CONFIG, config + "\n");
console.log(`✓ yt-dlp config written → ${YTDLP_CONFIG}`);
console.log("\nConfig:");
config.split("\n").forEach(l => console.log(`  ${l}`));

// Quick smoke test
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);

try {
  const { stdout } = await exec("yt-dlp", ["--version"], { timeout: 5_000 });
  console.log(`\n✓ yt-dlp ${stdout.trim()} ready`);
} catch {
  console.error("\n✗ yt-dlp not found in PATH — install it first");
  process.exit(1);
}

console.log("\nSetup complete. You can now submit YouTube URLs safely.");
