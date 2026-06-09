#!/usr/bin/env node
/**
 * cleanup-old-sources.mjs
 *
 * Deletes source video files for projects older than MAX_AGE_DAYS.
 * Targets the large *-master.mp4 files that OpenClips downloads from YouTube.
 * Clips in data/clips/ are NOT touched — only source material.
 *
 * Usage:
 *   node scripts/cleanup-old-sources.mjs [options]
 *
 * Options:
 *   --days=<n>      Delete sources older than N days (default: 5)
 *   --dry-run       Show what would be deleted without deleting
 *   --base-url=<u>  OpenClips server URL (default: http://localhost:3000)
 *
 * What gets deleted:
 *   - data/sources/<id>-master.mp4        (full downloaded YouTube video)
 *   - data/sources/<id>-<clipId>-source.mp4  (clip-segment extracts, if old)
 *   - data/uploads/<id>-*                 (any uploaded source files)
 *
 * What is NEVER deleted:
 *   - data/clips/                         (rendered output clips)
 *   - data/thumbs/                        (thumbnails)
 *   - data/projects.json                  (project metadata)
 */

import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SOURCES_DIR = path.join(ROOT_DIR, "data", "sources");
const UPLOADS_DIR = path.join(ROOT_DIR, "data", "uploads");

function parseArgs(argv) {
  const args = { days: 5, dryRun: false, baseUrl: process.env.OPENCLIPS_URL || "http://localhost:3000" };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "days") args.days = Number(val) || 5;
    else if (key === "base-url") args.baseUrl = val;
  }
  return args;
}

async function loadProjects(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/projects`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.projects || [];
  } catch {
    return null;
  }
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  const args = parseArgs(process.argv);
  const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;

  process.stderr.write(`Cleanup: deleting source files older than ${args.days} days${args.dryRun ? " (DRY RUN)" : ""}.\n\n`);

  // Load projects from server to get age info
  const projects = await loadProjects(args.baseUrl);
  if (!projects) {
    process.stderr.write("Warning: could not reach OpenClips server. Falling back to file mtime.\n");
  }

  // Build map of projectId -> createdAt
  const projectAge = new Map();
  if (projects) {
    for (const p of projects) {
      if (p.id && p.createdAt) {
        projectAge.set(p.id, new Date(p.createdAt).getTime());
      }
    }
  }

  let totalDeleted = 0;
  let totalFreed = 0;
  const dirs = [SOURCES_DIR, UPLOADS_DIR].filter(existsSync);

  for (const dir of dirs) {
    const files = readdirSync(dir);
    for (const file of files) {
      // Only target video files
      if (!/\.(mp4|mov|webm|mkv|avi)$/i.test(file)) continue;

      const fullPath = path.join(dir, file);
      const stat = statSync(fullPath);

      // Determine age: prefer project createdAt, fall back to file mtime
      const projectId = file.split("-").slice(0, 5).join("-"); // UUID is 5 groups
      const projectCreated = projectAge.get(projectId);
      const fileAge = projectCreated ?? stat.mtimeMs;
      const isOld = fileAge < cutoff;

      // Never delete clip outputs — only source/master files
      const isSource =
        file.includes("-master.mp4") ||
        file.includes("-source.mp4") ||
        dir === UPLOADS_DIR;

      if (!isOld || !isSource) continue;

      const ageDays = Math.floor((Date.now() - fileAge) / 86400000);
      const sizeMB = formatMB(stat.size);

      if (args.dryRun) {
        process.stdout.write(`[dry-run] would delete (${ageDays}d, ${sizeMB}): ${file}\n`);
      } else {
        try {
          unlinkSync(fullPath);
          process.stdout.write(`Deleted (${ageDays}d, ${sizeMB}): ${file}\n`);
        } catch (err) {
          process.stderr.write(`Error deleting ${file}: ${err.message}\n`);
          continue;
        }
      }
      totalDeleted++;
      totalFreed += stat.size;
    }
  }

  const action = args.dryRun ? "Would free" : "Freed";
  process.stderr.write(`\n${action} ${formatMB(totalFreed)} across ${totalDeleted} file(s).\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
