#!/usr/bin/env node
/**
 * setup-environment.mjs
 *
 * Run once at the start of each cloud session to ensure system-level
 * dependencies are configured. Safe to re-run — all writes are idempotent.
 *
 * Usage:
 *   node scripts/setup-environment.mjs
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── 1. yt-dlp config ────────────────────────────────────────────────────────
// Cloud IPs need --no-check-certificates and the web_creator player client
// to bypass YouTube's datacenter IP restrictions without a PO token.

const ytdlpConfigDir = path.join(homedir(), ".config", "yt-dlp");
const ytdlpConfigPath = path.join(ytdlpConfigDir, "config");
const ytdlpConfig = `--no-check-certificates
--extractor-args "youtube:player_client=web_creator"
`;

await mkdir(ytdlpConfigDir, { recursive: true });
await writeFile(ytdlpConfigPath, ytdlpConfig);
console.log("[ok] yt-dlp config written →", ytdlpConfigPath);

// ── 2. Cookies file check ────────────────────────────────────────────────────
// data/yt-cookies.txt is committed to the repo so it survives sessions.
// Warn if it's missing (user needs to re-export from browser).

const cookiesPath = path.join(ROOT, "data", "yt-cookies.txt");
if (existsSync(cookiesPath)) {
  const stat = await readFile(cookiesPath, "utf8");
  const lines = stat.split("\n").filter(l => l && !l.startsWith("#")).length;
  console.log(`[ok] yt-dlp cookies present → ${cookiesPath} (${lines} cookie entries)`);
} else {
  console.warn("[warn] yt-dlp cookies missing → data/yt-cookies.txt");
  console.warn("       Export cookies from your browser and commit the file.");
  console.warn("       Without it, YouTube video downloads will fail on cloud IPs.");
}

// ── 3. data/ directories ────────────────────────────────────────────────────
for (const dir of ["clips", "thumbs", "source", "captions"]) {
  const p = path.join(ROOT, "data", dir);
  await mkdir(p, { recursive: true });
}
console.log("[ok] data/ subdirectories ready");

console.log("\nSetup complete. Start the server with: npm run dev");
