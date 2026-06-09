#!/usr/bin/env node
/**
 * run-pipeline.mjs
 *
 * Full end-to-end pipeline — no user input required:
 *   1. Environment setup (yt-dlp config)
 *   2. Start OpenClips server if not running
 *   3. Find latest videos from channel roster
 *   4. Submit to OpenClips for download → transcription → rendering
 *   5. Poll until all renders are done
 *   6. Rank top clips by quality
 *   7. Upload to GitHub + schedule to all Buffer channels
 *
 * Usage:
 *   node scripts/run-pipeline.mjs
 *   node scripts/run-pipeline.mjs --skip-fetch   # skip step 3-5, use existing ready clips
 *   node scripts/run-pipeline.mjs --dry-run      # rank and show plan without scheduling
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const SKIP_FETCH = args.includes("--skip-fetch");
const DRY_RUN = args.includes("--dry-run");
const BASE_URL = "http://localhost:3000";

// Configurable poll interval and max wait
const POLL_INTERVAL_MS = 30_000;          // check every 30s
const MAX_RENDER_WAIT_MS = 120 * 60_000;  // give up after 2 hours

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function runScript(scriptName, extraArgs = []) {
  const scriptPath = path.join(ROOT, "scripts", scriptName);
  const { stdout, stderr } = await execFileAsync("node", [scriptPath, ...extraArgs], {
    cwd: ROOT,
    timeout: 30_000,
  });
  if (stderr) process.stderr.write(stderr);
  return stdout;
}

async function isServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function startServer() {
  log("Starting OpenClips server...");
  const child = spawn("node", [path.join(ROOT, "server", "index.mjs")], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  });
  child.unref();

  // Wait up to 15s for server to be ready
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1500));
    if (await isServerUp()) {
      log("Server is up.");
      return;
    }
  }
  throw new Error("Server failed to start within 15 seconds. Check /tmp/openclips-server.log.");
}

async function getProjects() {
  const res = await fetch(`${BASE_URL}/api/projects`);
  const body = await res.json();
  return body.projects || [];
}

async function submitUrl(url) {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl: url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const { project } = await res.json();
  return project;
}

async function waitForRenders(submittedIds, maxMs = MAX_RENDER_WAIT_MS) {
  const terminal = new Set(["ready", "failed"]);
  const deadline = Date.now() + maxMs;
  log(`Waiting for ${submittedIds.length} project(s) to finish rendering...`);

  while (Date.now() < deadline) {
    const projects = await getProjects();
    const submitted = projects.filter(p => submittedIds.includes(p.id));
    const done = submitted.filter(p => terminal.has(p.status));
    const inProgress = submitted.filter(p => !terminal.has(p.status));

    // Status summary
    const summary = submitted.map(p => `  ${p.status.padEnd(12)} ${(p.statusLabel || "").slice(0, 50)}`).join("\n");
    log(`Progress (${done.length}/${submitted.length} done):\n${summary}`);

    if (done.length === submitted.length) {
      const ready = done.filter(p => p.status === "ready");
      const failed = done.filter(p => p.status === "failed");
      log(`Rendering complete. Ready: ${ready.length}  Failed: ${failed.length}`);
      if (failed.length) {
        failed.forEach(p => log(`  [failed] ${p.title}: ${p.error || "unknown error"}`));
      }
      return done;
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Render timed out after ${MAX_RENDER_WAIT_MS / 60_000} minutes.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nOpenClips Pipeline — ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CST`);
  console.log(`Mode: ${SKIP_FETCH ? "SKIP FETCH (use existing clips)" : "FULL"} | ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  // ── Step 1: Environment setup ──
  log("Step 1/7: Environment setup");
  await runScript("setup-environment.mjs");

  // ── Step 2: Ensure server is running ──
  log("Step 2/7: Checking server");
  if (!(await isServerUp())) {
    await startServer();
  } else {
    log("Server already running.");
  }

  let submittedIds = [];

  if (!SKIP_FETCH) {
    // ── Step 3: Find latest videos ──
    log("Step 3/7: Fetching latest videos from channel roster");
    let searchOutput;
    try {
      searchOutput = await runScript("latest-youtube-search.mjs", ["--json"]);
    } catch (err) {
      throw new Error(`Channel search failed: ${err.message}`);
    }

    let videos = [];
    try {
      videos = JSON.parse(searchOutput);
    } catch {
      throw new Error(`Could not parse video search output:\n${searchOutput.slice(0, 300)}`);
    }

    if (!videos.length) {
      log("No new videos found from any channel. Skipping to ranking existing clips.");
    } else {
      log(`Found ${videos.length} video(s):`);
      videos.forEach(v => log(`  ${v.channel}: ${v.title?.slice(0, 60)}`));

      // ── Step 4: Submit to OpenClips ──
      log(`\nStep 4/7: Submitting ${videos.length} video(s) to OpenClips`);
      for (const video of videos) {
        try {
          const project = await submitUrl(video.url);
          log(`  [queued] ${project.id.slice(0, 8)} — ${video.channel}: ${video.title?.slice(0, 50)}`);
          submittedIds.push(project.id);
        } catch (err) {
          log(`  [skip] ${video.url}: ${err.message}`);
        }
      }

      if (!submittedIds.length) {
        log("No projects submitted successfully. Proceeding with existing clips.");
      } else {
        // ── Step 5: Wait for renders ──
        log(`\nStep 5/7: Waiting for renders (${submittedIds.length} project(s))`);
        await waitForRenders(submittedIds);
      }
    }
  } else {
    log("Step 3-5/7: Skipped (--skip-fetch)");
  }

  // ── Step 6: Rank clips ──
  log("\nStep 6/7: Ranking clips by quality");
  let rankOutput;
  try {
    rankOutput = await runScript("rank-openclips-clips.mjs", ["--json"]);
  } catch (err) {
    throw new Error(`Ranking failed: ${err.message}`);
  }

  let clips = [];
  try {
    clips = JSON.parse(rankOutput);
  } catch {
    throw new Error("Could not parse rank output.");
  }

  if (!clips.length) {
    throw new Error("No clips passed the quality gate (raw score ≥ 70, hook ≥ 5 words). Cannot schedule.");
  }

  log(`${clips.length} clip(s) qualify:`);
  clips.forEach(c => log(`  #${c.rank} [adj=${c.adjustedScore}] ${c.title}`));

  // ── Step 7: Schedule to Buffer ──
  log(`\nStep 7/7: Scheduling to Buffer${DRY_RUN ? " (dry-run)" : ""}`);
  const scheduleArgs = DRY_RUN ? ["--dry-run"] : [];
  const scheduleOutput = await runScript("buffer-schedule.mjs", scheduleArgs);
  process.stdout.write(scheduleOutput);

  log("\nPipeline complete.");
}

main().catch(err => {
  console.error(`\n[fatal] ${err.message}`);
  process.exit(1);
});
