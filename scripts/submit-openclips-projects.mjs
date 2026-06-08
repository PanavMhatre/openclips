#!/usr/bin/env node
/**
 * submit-openclips-projects.mjs
 *
 * Submit one or more YouTube/video URLs to the OpenClips API for processing.
 * Reads URLs from command-line arguments, stdin (one per line), or a JSON
 * array produced by latest-youtube-search.mjs --json.
 *
 * Usage:
 *   node scripts/submit-openclips-projects.mjs <url> [url ...]
 *   node scripts/latest-youtube-search.mjs | node scripts/submit-openclips-projects.mjs
 *   node scripts/latest-youtube-search.mjs --json | node scripts/submit-openclips-projects.mjs --json
 *
 * Options:
 *   --json        Expect newline-delimited or array JSON on stdin
 *   --base-url U  OpenClips server URL (default: http://localhost:3000)
 *   --dry-run     Print the URLs that would be submitted without posting
 */

import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const BASE_URL_FLAG = args.indexOf("--base-url");
const BASE_URL = BASE_URL_FLAG >= 0 ? args[BASE_URL_FLAG + 1] : (process.env.OPENCLIPS_URL || "http://localhost:3000");
const JSON_INPUT = args.includes("--json");
const DRY_RUN = args.includes("--dry-run");
const urlArgs = args.filter((a) => a.startsWith("http"));

async function main() {
  const urls = urlArgs.length > 0 ? urlArgs : await readUrlsFromStdin();

  if (!urls.length) {
    console.error("No URLs provided. Pass URLs as arguments or pipe them via stdin.");
    process.exit(1);
  }

  console.log(`Submitting ${urls.length} URL(s) to ${BASE_URL}/api/projects\n`);

  const results = [];
  for (const url of urls) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would submit: ${url}`);
      results.push({ url, status: "dry-run" });
      continue;
    }

    try {
      const project = await submitProject(url);
      console.log(`✓ Submitted  ${project.id}  ${project.title?.slice(0, 60)}`);
      results.push({ url, projectId: project.id, title: project.title, status: "submitted" });
    } catch (err) {
      console.error(`✗ Failed     ${url}\n  ${err.message}`);
      results.push({ url, status: "error", error: err.message });
    }
  }

  console.log(`\nDone. ${results.filter((r) => r.status === "submitted").length}/${urls.length} submitted.`);

  const failed = results.filter((r) => r.status === "error");
  if (failed.length) {
    console.error(`\n${failed.length} failed:`);
    for (const f of failed) console.error(`  ${f.url}: ${f.error}`);
    process.exit(1);
  }
}

async function submitProject(sourceUrl) {
  const resp = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl }),
  });

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(body?.error || `HTTP ${resp.status}`);
  }
  return body.project;
}

async function readUrlsFromStdin() {
  if (process.stdin.isTTY) return [];

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return [];

  if (JSON_INPUT || raw.startsWith("[") || raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .map((item) => (typeof item === "string" ? item : item?.url))
      .filter((u) => typeof u === "string" && u.startsWith("http"));
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http"));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
