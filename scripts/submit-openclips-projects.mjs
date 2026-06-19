#!/usr/bin/env node
/**
 * submit-openclips-projects.mjs
 *
 * Submits one or more YouTube/video URLs to the local OpenClips API, then
 * polls until every project reaches `ready` or `failed`.
 *
 * Usage:
 *   node scripts/submit-openclips-projects.mjs <url> [<url> ...]
 *   cat urls.json | node scripts/submit-openclips-projects.mjs --stdin
 *   node scripts/submit-openclips-projects.mjs --input=urls.json
 *
 * Options:
 *   --base-url=<url>   OpenClips server URL (default: http://localhost:3000)
 *   --stdin            Read JSON array of {url} or bare URL strings from stdin
 *   --input=<file>     Read JSON array from a file
 *   --poll-interval=<ms>  How often to poll status (default: 5000)
 *   --timeout=<ms>     Max wait per project (default: 3600000 = 1h)
 *   --output=<file>    Write finished project JSON array to file
 *
 * Exits 0 if all projects are ready, 1 if any failed or timed out.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.OPENCLIPS_URL || "http://localhost:3000",
    urls: [],
    stdin: false,
    input: null,
    output: null,
    pollInterval: 5_000,
    timeout: 60 * 60 * 1000,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--stdin") { args.stdin = true; continue; }
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "base-url") args.baseUrl = val;
    else if (key === "input") args.input = val;
    else if (key === "output") args.output = val;
    else if (key === "poll-interval") args.pollInterval = Number(val) || 5_000;
    else if (key === "timeout") args.timeout = Number(val) || 3_600_000;
    else if (!arg.startsWith("--")) args.urls.push(arg);
  }
  return args;
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

function normalizeUrlList(raw) {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizeUrlList(parsed);
    } catch {
      return raw.split(/\s+/).filter(Boolean);
    }
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => (typeof item === "string" ? item : item?.url || item?.sourceUrl || "")).filter(Boolean);
  }
  return [];
}

async function submitProject(baseUrl, sourceUrl) {
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return body.project;
}

async function pollProject(baseUrl, id, { pollInterval, timeout }) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const res = await fetch(`${baseUrl}/api/projects/${id}`);
    if (!res.ok) continue;
    const { project } = await res.json();
    const status = project?.status;
    process.stderr.write(`  [${id.slice(0, 8)}] ${project?.title || id} — ${status} (${project?.progress || 0}%)\n`);
    if (status === "ready" || status === "failed") return project;
  }
  throw new Error(`Project ${id} timed out after ${timeout / 1000}s`);
}

async function main() {
  const args = parseArgs(process.argv);

  let urls = [...args.urls];

  if (args.stdin) {
    const raw = await readStdin();
    urls = [...urls, ...normalizeUrlList(raw)];
  } else if (args.input) {
    const raw = readFileSync(args.input, "utf8");
    urls = [...urls, ...normalizeUrlList(raw)];
  }

  if (!urls.length) {
    process.stderr.write("Usage: node submit-openclips-projects.mjs <url> [...]\n");
    process.exit(1);
  }

  process.stderr.write(`Submitting ${urls.length} URL(s) to ${args.baseUrl}...\n`);

  const submitted = [];
  for (const url of urls) {
    try {
      const project = await submitProject(args.baseUrl, url);
      process.stderr.write(`  Queued: "${project.title}" [${project.id}]\n`);
      submitted.push(project);
    } catch (err) {
      process.stderr.write(`  [error] ${url}: ${err.message}\n`);
    }
  }

  if (!submitted.length) {
    process.stderr.write("No projects were submitted.\n");
    process.exit(1);
  }

  process.stderr.write(`Polling ${submitted.length} project(s)...\n`);

  const finished = [];
  let anyFailed = false;
  await Promise.all(submitted.map(async (project) => {
    try {
      const done = await pollProject(args.baseUrl, project.id, {
        pollInterval: args.pollInterval,
        timeout: args.timeout,
      });
      finished.push(done);
      if (done.status === "failed") {
        process.stderr.write(`  [failed] "${done.title}": ${done.error}\n`);
        anyFailed = true;
      }
    } catch (err) {
      process.stderr.write(`  [error] ${project.id}: ${err.message}\n`);
      anyFailed = true;
    }
  }));

  const ready = finished.filter((p) => p.status === "ready");
  process.stderr.write(`Done: ${ready.length} ready, ${finished.length - ready.length} failed/timeout.\n`);

  const json = JSON.stringify(finished, null, 2);
  if (args.output) {
    writeFileSync(args.output, json);
    process.stderr.write(`Wrote project data to ${args.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }

  if (ready.length < 1) {
    process.stderr.write(`Error: no projects completed successfully — all downloads failed.\n`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
