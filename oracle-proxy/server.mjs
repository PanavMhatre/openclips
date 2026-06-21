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
import { writeFile, unlink, mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const PORT = Number(process.env.PORT || 7474);
const SECRET = process.env.FETCH_SECRET || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://64.181.199.39:${PORT}`).replace(/\/+$/, "");
const FILE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const jobs = {};
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

async function runJob(jobId, channels, minDuration, limitPerChannel, cookiesB64) {
  let cookiesPath = null;
  if (cookiesB64) {
    cookiesPath = join(tmpdir(), `cookies-${jobId}.txt`);
    await writeFile(cookiesPath, Buffer.from(cookiesB64, "base64").toString("utf8"));
  }

  const fileDir = join(tmpdir(), "oracle-files", jobId);
  await mkdir(fileDir, { recursive: true });

  try {
    // Search each channel via yt-dlp
    const videoList = [];
    for (const ch of channels) {
      const limit = limitPerChannel * ch.weight;
      const fetchCount = Math.max(limit * 5, 10);
      const found = await new Promise(resolve => {
        const args = [
          "--no-check-certificate", "--no-playlist", "--flat-playlist",
          "--print", "%(webpage_url)s\t%(title)s\t%(duration)s\t%(uploader)s\t%(vcodec)s",
          "--no-warnings",
        ];
        if (cookiesPath) args.push("--cookies", cookiesPath);
        args.push(`ytsearch${fetchCount}:${ch.searchAlias}`);

        const proc = spawn("yt-dlp", args, { timeout: 60000 });
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

    if (!videoList.length) {
      jobs[jobId] = { ok: false, status: "done", error: "yt-dlp returned no results across all channels", count: 0, videos: [] };
      return;
    }

    // Download each video — serve directly over HTTP, no GitHub upload
    const downloaded = [];
    for (const video of videoList) {
      const safeTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60);
      const fileName = `${safeTitle}.mp4`;
      const outPath = join(fileDir, fileName);
      try {
        await new Promise((resolve, reject) => {
          const args = [
            "--no-check-certificate",
            // Cap at 480p to keep files manageable; podcast content doesn't need 1080p
            "-f", "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]/best",
            "--merge-output-format", "mp4",
            "-o", outPath,
            "--no-playlist",
            "--extractor-args", "youtube:player_client=ios,android,web",
          ];
          if (cookiesPath) args.push("--cookies", cookiesPath);
          args.push(video.url);

          const proc = spawn("yt-dlp", args, { timeout: 600000 });
          proc.stderr.on("data", d => process.stderr.write(d));
          proc.on("close", code => code === 0 ? resolve() : reject(new Error(`yt-dlp exit ${code}`)));
          proc.on("error", reject);
        });

        const downloadUrl = `${PUBLIC_URL}/files/${jobId}/${encodeURIComponent(fileName)}`;
        downloaded.push({ url: video.url, title: video.title, duration: video.duration, channel: video.channel, githubUrl: downloadUrl });
        console.log(`[oracle-proxy] ready: ${video.title.slice(0, 60)} → ${downloadUrl}`);
      } catch (err) {
        console.error(`[oracle-proxy] download failed: ${video.title.slice(0, 60)} — ${err.message}`);
        await unlink(outPath).catch(() => {});
      }
    }

    jobs[jobId] = { ok: true, status: "done", count: downloaded.length, videos: downloaded };
    console.log(`[oracle-proxy] job ${jobId} done — ${downloaded.length}/${videoList.length} videos`);

    // Auto-delete files after TTL
    setTimeout(() => rm(fileDir, { recursive: true, force: true }).catch(() => {}), FILE_TTL_MS);

  } catch (err) {
    console.error(`[oracle-proxy] job ${jobId} crashed:`, err.message);
    jobs[jobId] = { ok: false, status: "done", error: err.message, count: 0, videos: [] };
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

    const { rosterContent, minDuration = 1200, limit = 1, cookiesB64 } = parsed;
    if (!rosterContent) return send(res, 400, { error: "rosterContent required" });

    const channels = parseRoster(rosterContent);
    if (!channels.length) return send(res, 400, { error: "No channels parsed from roster" });

    const jobId = randomUUID();
    jobs[jobId] = { ok: false, status: "running", count: 0, videos: [] };
    send(res, 200, { ok: true, jobId, status: "running" });

    runJob(jobId, channels, Number(minDuration), Number(limit), cookiesB64).catch(err => {
      jobs[jobId] = { ok: false, status: "done", error: err.message, count: 0, videos: [] };
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
