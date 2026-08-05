#!/usr/bin/env node
// Download proxy — runs on a clean IP (routed through Cloudflare WARP, see
// WARP_PROXY_URL below) so YouTube doesn't block yt-dlp. Exposes the same
// /api/fetch-videos interface as the Render server.
//
// Env vars (set in /etc/oracle-proxy.env):
//   FETCH_SECRET   Bearer token (must match OPENCLIPS_FETCH_SECRET in GitHub)
//   PUBLIC_URL     Base URL GitHub Actions uses to reach this server (e.g. http://<this box's public IP>:7474) — always set explicitly, don't rely on the fallback below
//   PORT           default: 7474
//
// Files are served directly from the VM over HTTP — no GitHub upload needed.
// Downloaded files are auto-deleted 2 hours after the job completes.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink, mkdir, rm, readdir, stat as fsStat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir, homedir } from "node:os";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 7474);
const SECRET = process.env.FETCH_SECRET || "";
// No sane default here — this must be set per-deployment (see /etc/oracle-proxy.env).
// A wrong/stale value silently breaks every downloadUrl this server hands out.
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
const FILE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Downloaded videos MUST live on the real disk, not os.tmpdir(). On this box
// (and likely any similar small instance) /tmp is tmpfs — a RAM-backed
// filesystem capped at a few hundred MB, completely separate from and far
// smaller than the actual root disk. Every single video download was
// failing with "Disk quota exceeded" despite gigabytes of free disk space,
// because it was filling up a ~455MB RAM-backed /tmp, not the disk. This is
// the actual root cause of every "0 videos downloaded" run since this box
// went live — not YouTube blocking, not cookies, not disk space.
const VIDEO_STORAGE_DIR = process.env.ORACLE_PROXY_STORAGE_DIR || join(homedir(), "oracle-data");

// Cloudflare WARP client running in "proxy" mode — a local SOCKS5 proxy that
// only affects traffic explicitly pointed at it (unlike "warp"/full-tunnel
// mode, which reroutes the whole box's default route and can take out the
// SSH session managing it). Routes yt-dlp through Cloudflare's network,
// bypassing the cloud provider's blocked datacenter IP. No external proxy
// needed. Default port per `warp-cli mode proxy` — verify with
// `warp-cli settings` if this ever needs to change.
const WARP_PROXY_URL = "socks5h://127.0.0.1:40000";

// Job state lives only in memory by default. The uncaughtException/
// unhandledRejection handlers below already stop an isolated error from
// taking the whole process down — but Restart=always in systemd still means
// ANY restart (OOM kill, `systemctl restart`, VM reboot, this exact service
// getting redeployed) wipes every in-flight job, and callers then poll a
// jobId that no longer exists and 404 forever until their own timeout. So
// also persist job state to disk on every change and reload it on startup —
// belt and suspenders with the exception handlers, not a replacement for them.
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

// Job state lives only in memory. A crash here used to take the whole process
// down, wiping every in-flight job — callers would then poll a jobId that no
// longer exists and 404 forever until their own timeout. Nothing here should
// ever be worth killing the server over, so log and keep running instead.
process.on("uncaughtException", (err) => {
  console.error("[oracle-proxy] UNCAUGHT EXCEPTION (service staying up):", err?.stack || err);
});
process.on("unhandledRejection", (err) => {
  console.error("[oracle-proxy] UNHANDLED REJECTION (service staying up):", err?.stack || err);
});

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

  const fileDir = join(VIDEO_STORAGE_DIR, "oracle-files", jobId);
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
            // No "ios" here — it can't use cookies at all (yt-dlp skips it
            // outright once --cookies is set below), so listing it first
            // when cookies are available just wastes an attempt.
            "--extractor-args", "youtube:player_client=web,mweb,android",
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

      // useIos: the ios client structurally can't use cookies at all (yt-dlp
      // skips it outright once --cookies is present) but bypasses YouTube's
      // datacenter-IP bot-check without needing an authenticated session —
      // try that first. If it fails, fall back to cookie-authenticated
      // clients (needs a real, non-stale cookies file to actually help).
      // proxyUrl (WARP or an external proxy) is applied either way — it's a
      // separate IP-bypass mechanism, orthogonal to the client/cookie choice.
      const tryDownload = (useIos) => new Promise((resolve, reject) => {
        const args = [
          "--no-check-certificate",
          "-f", "bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=2160]/best",
          "--merge-output-format", "mp4",
          "-o", outPath,
          "--no-playlist",
          "--retries", "2",
        ];
        if (useIos) {
          args.push("--extractor-args", "youtube:player_client=ios");
        } else {
          args.push("--extractor-args", "youtube:player_client=web,mweb,android");
          if (cookiesPath) args.push("--cookies", cookiesPath);
        }
        if (proxyUrl) args.push("--proxy", proxyUrl);
        args.push(video.url);
        const proc = spawn("yt-dlp", args, { timeout: 300000 });
        let stderr = "";
        proc.stderr.on("data", d => { stderr += d; process.stderr.write(d); });
        proc.on("close", code => code === 0 ? resolve() : reject(new Error(`exit ${code}: ${stderr.slice(-200)}`)));
        proc.on("error", reject);
      });

      try {
        try {
          await tryDownload(true);
        } catch (iosErr) {
          console.error(`[oracle-proxy] ios download failed for ${video.title.slice(0, 50)}: ${iosErr.message.slice(0, 150)}`);
          console.log(`[oracle-proxy] retrying with cookie-authenticated clients...`);
          await tryDownload(false);
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
      const filePath = join(VIDEO_STORAGE_DIR, "oracle-files", jobId, fileName);
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


  // ── /download — synchronous WARP-backed download (used by smart_broll.py) ──────────────
  if (req.method === "POST" && req.url === "/download") {
    let body = "";
    req.on("data", d => body += d);
    await new Promise(r => req.on("end", r));
    let parsed;
    try { parsed = JSON.parse(body); } catch { return send(res, 400, { error: "Invalid JSON" }); }
    const { url: dlUrl, write_subs = false } = parsed;
    if (!dlUrl) return send(res, 400, { error: "url required" });
    // Auth check (same FETCH_SECRET as other endpoints)
    if (SECRET) {
      const dlAuth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (dlAuth !== SECRET) return send(res, 401, { error: "Unauthorized" });
    }

    const dlJobId = randomUUID();
    const dlDir = join(VIDEO_STORAGE_DIR, "oracle-dl", dlJobId);
    await mkdir(dlDir, { recursive: true });

    const dlArgs = [
      "-f", "bv*[ext=mp4][height<=2160]+ba[ext=m4a]/bv*[ext=mp4][height<=1080]+ba[ext=m4a]/b[ext=mp4][height<=2160]/best",
      "-o", join(dlDir, "video.%(ext)s"),
      "--no-playlist",
      "--extractor-args", "youtube:player_client=tv_embedded,ios,android",
      "--proxy", WARP_PROXY_URL,
      "--socket-timeout", "30",
      "--no-check-certificate",
      "--retries", "3",
    ];
    if (write_subs) dlArgs.push("--write-subs", "--write-auto-subs", "--sub-langs", "en", "--sub-format", "vtt");
    dlArgs.push(dlUrl);

    console.log("[oracle-proxy] /download via WARP proxy " + WARP_PROXY_URL + " " + dlUrl.slice(0, 100));
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn("yt-dlp", dlArgs, { timeout: 120000 });
        let stderr = "";
        proc.stderr.on("data", d => { stderr += d; process.stderr.write(d); });
        proc.on("close", code => code === 0 ? resolve() : reject(new Error("exit " + code + ": " + stderr.slice(-300))));
        proc.on("error", reject);
      });
    } catch (err) {
      console.error("[oracle-proxy] /download failed: " + err.message.slice(0, 200));
      await rm(dlDir, { recursive: true, force: true }).catch(() => {});
      return send(res, 500, { error: err.message.slice(0, 200) });
    }

    try {
      const dlFiles = await readdir(dlDir);
      const videoFile = dlFiles.find(f => /\.(mp4|webm|mkv|m4v)$/i.test(f));
      if (!videoFile) {
        await rm(dlDir, { recursive: true, force: true }).catch(() => {});
        return send(res, 500, { error: "yt-dlp produced no video file" });
      }
      const filePath = join(dlDir, videoFile);
      console.log("[oracle-proxy] /download streaming: " + videoFile);
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Disposition": "attachment; filename=\"" + videoFile + "\"",
      });
      const dlStream = createReadStream(filePath);
      dlStream.pipe(res);
      res.on("finish", () => rm(dlDir, { recursive: true, force: true }).catch(() => {}));
    } catch (err) {
      console.error("[oracle-proxy] /download post-processing failed: " + err.message.slice(0, 200));
      await rm(dlDir, { recursive: true, force: true }).catch(() => {});
      if (!res.headersSent) return send(res, 500, { error: err.message.slice(0, 200) });
    }
    return;
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

    const externalProxy = proxies ? proxies.split(/[,\n]/).map(s => s.trim()).filter(Boolean)[0] : null;
    // Route through the external proxy if one is provided (e.g. residential);
    // otherwise fall back to the local Cloudflare WARP SOCKS5 proxy so yt-dlp
    // exits via Cloudflare's network instead of this box's own (often
    // blocked) datacenter IP.
    const resolvedProxy = externalProxy || WARP_PROXY_URL;
    console.log(`[oracle-proxy] exit via: ${externalProxy ? `external proxy ${externalProxy.slice(0, 50)}` : `WARP proxy ${WARP_PROXY_URL}`}`);
    if (hasPreSearched) console.log(`[oracle-proxy] download-only mode: received ${preSearchedUrls.length} URL(s) from caller`);

    const jobId = randomUUID();
    jobs[jobId] = { ok: false, status: "running", count: 0, videos: [], createdAt: Date.now() };
    persistJobsImmediate();
    send(res, 200, { ok: true, jobId, status: "running" });

    runJob(jobId, channels, Number(minDuration), Number(limit), cookiesB64, resolvedProxy, hasPreSearched ? preSearchedUrls : null).catch(err => {
      jobs[jobId] = { ...jobs[jobId], ok: false, status: "done", error: err.message, count: 0, videos: [] };
      persistJobs();
    });
    return;
  }

  send(res, 404, { error: "Not found" });
});

// The per-job cleanup timer (setTimeout in runJob, above) only fires if this
// process stays alive for the full FILE_TTL_MS — a restart (deploy, crash,
// systemd bounce) silently drops it, and that job's files are then never
// cleaned up. Sweep on every startup, based on actual file age, so cleanup
// doesn't depend on this process having stayed up continuously.
async function sweepStaleDownloads() {
  const cutoff = Date.now() - FILE_TTL_MS;
  for (const sub of ["oracle-files", "oracle-dl"]) {
    const dir = join(VIDEO_STORAGE_DIR, sub);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue; // doesn't exist yet — nothing to sweep
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = join(dir, entry.name);
      try {
        const stat = await fsStat(fullPath);
        if (stat.mtimeMs < cutoff) {
          await rm(fullPath, { recursive: true, force: true });
          console.log(`[oracle-proxy] swept stale download dir: ${sub}/${entry.name}`);
        }
      } catch {}
    }
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[oracle-proxy] listening on port ${PORT}`);
  console.log(`[oracle-proxy] files served at ${PUBLIC_URL}/files/<jobId>/<filename>`);
  console.log(`[oracle-proxy] video storage: ${VIDEO_STORAGE_DIR}`);
  if (!SECRET) console.warn("[oracle-proxy] WARNING: FETCH_SECRET not set — endpoint is unauthenticated");
  sweepStaleDownloads().catch((e) => console.error(`[oracle-proxy] startup sweep failed: ${e.message}`));
  // Also sweep periodically while running, independent of any per-job timer.
  setInterval(() => sweepStaleDownloads().catch(() => {}), 30 * 60 * 1000);
});
