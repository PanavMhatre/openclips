#!/usr/bin/env node
// Oracle VM download proxy — runs on a clean IP so YouTube doesn't block yt-dlp.
// Exposes the same /api/fetch-videos interface as the Render server.
//
// Env vars (set in /etc/oracle-proxy.env):
//   FETCH_SECRET   Bearer token (must match OPENCLIPS_FETCH_SECRET in GitHub)
//   PUBLIC_URL     Base URL GitHub Actions uses to reach this server (e.g. http://64.181.199.39:7474)
//   PORT           default: 7474
//
// Files are served directly from the VM over HTTP — no GitHub upload needed.
// Downloaded files are auto-deleted 2 hours after the job completes.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink, mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 7474);
const SECRET = process.env.FETCH_SECRET || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://64.181.199.39:${PORT}`).replace(/\/+$/, "");
const FILE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Job state is written to disk on every change and reloaded on startup so a
// process restart (crash, OOM, `systemctl restart`, the /api/update
// self-update below) doesn't silently orphan every in-flight job — before
// this, `jobs` was an in-memory-only object, so any restart between a job's
// creation and its completion made every subsequent status poll 404
// forever, with no way for the caller to distinguish that from "still
// running." See scripts/fetch-via-render.mjs for the client-side half of
// this fix (fails fast on a confirmed-lost job instead of polling for 25min).
const JOBS_STATE_PATH = join(tmpdir(), "oracle-proxy-jobs-state.json");
const JOB_RETENTION_MS = 6 * 60 * 60 * 1000; // 6 hours — matches FILE_TTL_MS with headroom

let jobs = {};
try {
  jobs = JSON.parse(await readFile(JOBS_STATE_PATH, "utf8"));
  console.log(`[oracle-proxy] restored ${Object.keys(jobs).length} job(s) from disk after restart`);
} catch {
  jobs = {};
}

async function writeJobsToDisk() {
  const cutoff = Date.now() - JOB_RETENTION_MS;
  for (const [id, job] of Object.entries(jobs)) {
    if ((job.createdAt || 0) < cutoff) delete jobs[id];
  }
  try {
    await writeFile(JOBS_STATE_PATH, JSON.stringify(jobs));
  } catch (e) {
    console.error(`[oracle-proxy] failed to persist job state: ${e.message}`);
  }
}

let persistTimer = null;

// Bypasses the debounce below — used right after a job is created, since
// that's the single most important moment to survive a restart (the caller
// has a jobId and is about to start depending on it).
function persistJobsImmediate() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  void writeJobsToDisk();
}

function persistJobs() {
  // Debounce — job status can update in rapid bursts; coalesce into one write.
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    await writeJobsToDisk();
  }, 250);
}

const AUDIO_RE = /\(audio\)|\[audio\]|\baudio[\s-]only\b/i;

function parseRoster(md) {
  const channels = [];
  for (const line of (md || "").split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^\s|]+|https?:\/\/[^\s|]+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/);
    if (m && !m[1].toLowerCase().includes("name")) {
      channels.push({ name: m[1].trim(), searchAlias: m[3].trim(), weight: Number(m[4]) || 1 });
    }
  }
  return channels;
}

async function runJob(jobId, channels, minDuration, limitPerChannel, cookiesB64, proxyUrl, preSearchedUrls = null) {
  let cookiesPath = null;
  if (cookiesB64) {
    cookiesPath = join(tmpdir(), `cookies-${jobId}.txt`);
    await writeFile(cookiesPath, Buffer.from(cookiesB64, "base64").toString("utf8"));
  }

  const fileDir = join(tmpdir(), "oracle-files", jobId);
  await mkdir(fileDir, { recursive: true });

  try {
    const videoList = [];

    if (preSearchedUrls && preSearchedUrls.length > 0) {
      // Caller already searched — try all provided URLs (download loop stops after limitPerChannel successes)
      console.log(`[oracle-proxy] download-only mode: ${preSearchedUrls.length} pre-searched URL(s), need ${limitPerChannel}`);
      for (const v of preSearchedUrls) {
        videoList.push({ url: v.url, title: v.title || v.url, duration: v.duration || 0, channel: v.channel || "" });
      }
    } else {
      // Search each channel via yt-dlp
      for (const ch of channels) {
        const limit = limitPerChannel * ch.weight;
        const fetchCount = Math.max(limit * 5, 10);
        const found = await new Promise(resolve => {
          const args = [
            "--no-check-certificate", "--no-playlist", "--flat-playlist",
            "--print", "%(webpage_url)s\t%(title)s\t%(duration)s\t%(uploader)s\t%(vcodec)s",
            "--no-warnings",
            "--extractor-args", "youtube:player_client=ios,android,web",
          ];
          if (cookiesPath) args.push("--cookies", cookiesPath);
          if (proxyUrl) args.push("--proxy", proxyUrl);
          args.push(`ytsearch${fetchCount}:${ch.searchAlias}`);

          const proc = spawn("yt-dlp", args, { timeout: 120000 });
          let out = "", err = "";
          proc.stdout.on("data", d => out += d);
          proc.stderr.on("data", d => { err += d; process.stderr.write(d); });
          proc.on("close", code => {
            const results = [];
            if (!out.trim()) {
              console.error(`[oracle-proxy] ${ch.name}: yt-dlp exit ${code}, no stdout. stderr: ${err.slice(0, 300)}`);
            }
            for (const line of out.trim().split("\n")) {
              if (!line.trim()) continue;
              const [url, title, duration] = line.split("\t");
              if (!url || !title) continue;
              const dur = Number(duration);
              if (dur > 0 && dur < minDuration) continue;
              if (AUDIO_RE.test(title)) continue;
              results.push({ url: url.trim(), title: title.trim(), duration: dur, channel: ch.name });
              if (results.length >= limit) break;
            }
            resolve(results);
          });
          proc.on("error", e => { console.error(`[oracle-proxy] ${ch.name}: spawn error: ${e.message}`); resolve([]); });
        });
        for (const v of found) videoList.push(v);
      }
    }

    if (!videoList.length) {
      jobs[jobId] = { ...jobs[jobId], ok: false, status: "done", error: "yt-dlp returned no results across all channels", count: 0, videos: [] };
      persistJobs();
      return;
    }

    // Download each video — serve directly over HTTP, no GitHub upload
    const downloaded = [];
    const downloadErrors = [];
    for (const video of videoList) {
      if (downloaded.length >= limitPerChannel) break; // stop once we have enough
      const safeTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60);
      const fileName = `${safeTitle}.mp4`;
      const outPath = join(fileDir, fileName);

      const tryDownload = (useCookies) => new Promise((resolve, reject) => {
        const args = [
          "--no-check-certificate",
          "-f", "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]/best",
          "--merge-output-format", "mp4",
          "-o", outPath,
          "--no-playlist",
          "--extractor-args", "youtube:player_client=ios,android,web",
          "--retries", "3",
        ];
        // Proxy is required — Oracle VM datacenter IP gets bot-blocked without it
        if (proxyUrl) args.push("--proxy", proxyUrl);
        // Cookies: only pass when explicitly requested; expired cookies trigger bot-detection
        if (useCookies && cookiesPath) args.push("--cookies", cookiesPath);
        args.push(video.url);
        const proc = spawn("yt-dlp", args, { timeout: 300000 });
        let stderr = "";
        proc.stderr.on("data", d => { stderr += d; process.stderr.write(d); });
        proc.on("close", code => code === 0 ? resolve() : reject(new Error(`exit ${code}: ${stderr.slice(-200)}`)));
        proc.on("error", reject);
      });

      try {
        // First attempt: proxy only, no cookies (residential IP + ios client handles public content)
        // Passing expired cookies causes "Sign in to confirm you're not a bot" even through proxy
        try {
          await tryDownload(false);
        } catch (noCookieErr) {
          // Second attempt: proxy + cookies (for age-restricted or members-only content)
          console.log(`[oracle-proxy] retrying with cookies: ${video.title.slice(0, 50)}`);
          await tryDownload(true);
        }

        const downloadUrl = `${PUBLIC_URL}/files/${jobId}/${encodeURIComponent(fileName)}`;
        downloaded.push({ url: video.url, title: video.title, duration: video.duration, channel: video.channel, githubUrl: downloadUrl });
        console.log(`[oracle-proxy] ready: ${video.title.slice(0, 60)} → ${downloadUrl}`);
      } catch (err) {
        const msg = `${video.title.slice(0, 50)}: ${err.message.slice(0, 150)}`;
        console.error(`[oracle-proxy] download failed (proxy+direct): ${msg}`);
        downloadErrors.push(msg);
        await unlink(outPath).catch(() => {});
      }
    }

    const errorSummary = downloadErrors.length ? ` Errors: ${downloadErrors.slice(0, 2).join(" | ")}` : "";
    jobs[jobId] = { ...jobs[jobId], ok: downloaded.length > 0, status: "done", count: downloaded.length, videos: downloaded, error: downloaded.length === 0 ? `all downloads failed.${errorSummary}` : undefined };
    persistJobs();
    console.log(`[oracle-proxy] job ${jobId} done — ${downloaded.length}/${videoList.length} videos`);

    // Auto-delete files after TTL
    setTimeout(() => rm(fileDir, { recursive: true, force: true }).catch(() => {}), FILE_TTL_MS);

  } catch (err) {
    console.error(`[oracle-proxy] job ${jobId} crashed:`, err.message);
    jobs[jobId] = { ...jobs[jobId], ok: false, status: "done", error: err.message, count: 0, videos: [] };
    persistJobs();
    rm(fileDir, { recursive: true, force: true }).catch(() => {});
  } finally {
    if (cookiesPath) await unlink(cookiesPath).catch(() => {});
  }
}

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, { ok: true, service: "oracle-download-proxy" });
  }

  // Serve downloaded files (no auth — URL contains unguessable job UUID)
  if (req.method === "GET" && req.url.startsWith("/files/")) {
    const parts = req.url.slice("/files/".length).split("/");
    if (parts.length >= 2) {
      const jobId = parts[0];
      const fileName = decodeURIComponent(parts[1]);
      const filePath = join(tmpdir(), "oracle-files", jobId, fileName);
      try {
        const stream = createReadStream(filePath);
        res.writeHead(200, { "Content-Type": "video/mp4" });
        stream.pipe(res);
        stream.on("error", () => { res.end(); });
        return;
      } catch {
        return send(res, 404, { error: "File not found" });
      }
    }
    return send(res, 404, { error: "Not found" });
  }

  if (SECRET) {
    const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (auth !== SECRET) return send(res, 401, { error: "Unauthorized" });
  }

  // Pull latest code from git and restart — systemd will auto-restart the service.
  // Protected by FETCH_SECRET auth check above.
  if (req.method === "POST" && req.url === "/api/update") {
    console.log(`[oracle-proxy] Self-update requested`);
    send(res, 200, { ok: true, message: "Pulling latest code and restarting…" });
    setTimeout(() => {
      // Find the git repo root (works whether deployed as a subdir or standalone clone)
      const findRoot = spawn("git", ["-C", __dirname, "rev-parse", "--show-toplevel"], { stdio: "pipe" });
      let repoDir = __dirname;
      let rootOut = "";
      findRoot.stdout.on("data", d => { rootOut += d; });
      findRoot.on("close", () => {
        if (rootOut.trim()) repoDir = rootOut.trim();
        console.log(`[oracle-proxy] git pull in ${repoDir}`);
        const proc = spawn("git", ["-C", repoDir, "pull", "origin", "main"], { stdio: "pipe" });
        let out = "";
        proc.stdout.on("data", d => { out += d; });
        proc.stderr.on("data", d => { out += d; });
        proc.on("close", code => {
          console.log(`[oracle-proxy] git pull exit ${code}: ${out.trim()}`);
          console.log(`[oracle-proxy] Exiting so systemd restarts with new code…`);
          process.exit(0);
        });
        proc.on("error", e => {
          console.error(`[oracle-proxy] git pull spawn error: ${e.message}`);
          process.exit(1);
        });
      });
    }, 300);
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/fetch-videos/status/")) {
    const jobId = req.url.split("/").pop();
    const job = jobs[jobId];
    if (!job) return send(res, 404, { error: "Job not found" });
    return send(res, 200, job);
  }

  if (req.method === "POST" && req.url === "/api/fetch-videos") {
    let body = "";
    req.on("data", d => body += d);
    await new Promise(r => req.on("end", r));

    let parsed;
    try { parsed = JSON.parse(body); } catch { return send(res, 400, { error: "Invalid JSON" }); }

    const { rosterContent, urls: preSearchedUrls, minDuration = 1200, limit = 1, cookiesB64, proxies } = parsed;

    const hasPreSearched = Array.isArray(preSearchedUrls) && preSearchedUrls.length > 0;
    if (!hasPreSearched && !rosterContent) return send(res, 400, { error: "rosterContent or urls required" });

    const channels = hasPreSearched ? [] : parseRoster(rosterContent);
    if (!hasPreSearched && !channels.length) return send(res, 400, { error: "No channels parsed from roster" });

    const proxyUrl = proxies ? proxies.split(/[,\n]/).map(s => s.trim()).filter(Boolean)[0] : null;
    if (proxyUrl) console.log(`[oracle-proxy] using proxy for downloads: ${proxyUrl.slice(0, 40)}...`);
    if (hasPreSearched) console.log(`[oracle-proxy] download-only mode: received ${preSearchedUrls.length} URL(s) from caller`);

    const jobId = randomUUID();
    jobs[jobId] = { ok: false, status: "running", count: 0, videos: [], createdAt: Date.now() };
    persistJobsImmediate();
    send(res, 200, { ok: true, jobId, status: "running" });

    runJob(jobId, channels, Number(minDuration), Number(limit), cookiesB64, proxyUrl, hasPreSearched ? preSearchedUrls : null).catch(err => {
      jobs[jobId] = { ...jobs[jobId], ok: false, status: "done", error: err.message, count: 0, videos: [] };
      persistJobs();
    });
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[oracle-proxy] listening on port ${PORT}`);
  console.log(`[oracle-proxy] files served at ${PUBLIC_URL}/files/<jobId>/<filename>`);
  if (!SECRET) console.warn("[oracle-proxy] WARNING: FETCH_SECRET not set — endpoint is unauthenticated");
});
