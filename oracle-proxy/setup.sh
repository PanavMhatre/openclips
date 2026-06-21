#!/bin/bash
# Run this on the Oracle VM as opc user.
# Usage: bash setup.sh <FETCH_SECRET> <GITHUB_STORAGE_TOKEN>
# Example: bash setup.sh mysecret ghp_xxxx

set -e

FETCH_SECRET="${1:?Usage: $0 <FETCH_SECRET> <GITHUB_STORAGE_TOKEN>}"
GITHUB_STORAGE_TOKEN="${2:?Usage: $0 <FETCH_SECRET> <GITHUB_STORAGE_TOKEN>}"

echo "=== Installing Node.js 22 ==="
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

echo "=== Installing yt-dlp ==="
sudo curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
yt-dlp --version

echo "=== Installing ffmpeg ==="
sudo dnf install -y epel-release 2>/dev/null || true
# Oracle Linux 8 RPM Fusion for ffmpeg
sudo dnf install -y --nogpgcheck \
  https://download1.rpmfusion.org/free/el/rpmfusion-free-release-8.noarch.rpm 2>/dev/null || true
sudo dnf install -y ffmpeg 2>/dev/null || {
  echo "RPM Fusion failed — trying static ffmpeg build"
  sudo curl -fsSL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
    | sudo tar -xJ --strip-components=1 -C /usr/local/bin ffmpeg-*-amd64-static/ffmpeg ffmpeg-*-amd64-static/ffprobe
}
ffmpeg -version | head -1

echo "=== Creating proxy server ==="
sudo mkdir -p /opt/oracle-proxy
sudo tee /opt/oracle-proxy/server.mjs > /dev/null << 'SERVEREOF'
#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.PORT || 7474);
const SECRET = process.env.FETCH_SECRET || "";
const STORAGE_TOKEN = process.env.GITHUB_STORAGE_TOKEN || "";
const STORAGE_REPO = process.env.GITHUB_STORAGE_REPO || "PanavMhatre/openclips-media";
const STORAGE_BRANCH = process.env.GITHUB_STORAGE_BRANCH || "main";
const STORAGE_DIR = (process.env.GITHUB_STORAGE_DIR || "clips").replace(/^\/+|\/+$/g, "");

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
  try {
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
        let out = "";
        proc.stdout.on("data", d => out += d);
        proc.on("close", () => {
          const results = [];
          for (const line of out.trim().split("\n")) {
            if (!line.trim()) continue;
            const [url, title, duration, uploader, vcodec] = line.split("\t");
            if (!url || !title) continue;
            const dur = Number(duration);
            if (!dur || dur < minDuration) continue;
            if (vcodec?.trim().toLowerCase() === "none" || AUDIO_RE.test(title)) continue;
            results.push({ url: url.trim(), title: title.trim(), duration: dur, channel: ch.name });
            if (results.length >= limit) break;
          }
          resolve(results);
        });
        proc.on("error", () => resolve([]));
      });
      for (const v of found) videoList.push(v);
    }
    if (!videoList.length) {
      jobs[jobId] = { ok: false, status: "done", error: "yt-dlp returned no results", count: 0, videos: [] };
      return;
    }
    const downloaded = [];
    for (const video of videoList) {
      const safeTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60);
      const outPath = join(tmpdir(), `${safeTitle}-${jobId}.mp4`);
      try {
        await new Promise((resolve, reject) => {
          const args = [
            "--no-check-certificate",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", outPath, "--no-playlist",
            "--extractor-args", "youtube:player_client=ios,android,web",
          ];
          if (cookiesPath) args.push("--cookies", cookiesPath);
          args.push(video.url);
          const proc = spawn("yt-dlp", args, { timeout: 600000 });
          proc.stderr.on("data", d => process.stderr.write(d));
          proc.on("close", code => code === 0 ? resolve() : reject(new Error(`yt-dlp exit ${code}`)));
          proc.on("error", reject);
        });
        const fileBytes = await readFile(outPath);
        const b64 = fileBytes.toString("base64");
        const fileName = `${safeTitle}.mp4`;
        const ghRes = await fetch(`https://api.github.com/repos/${STORAGE_REPO}/contents/${STORAGE_DIR}/${fileName}`, {
          method: "PUT",
          headers: { Authorization: `token ${STORAGE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: `Upload ${fileName}`, content: b64, branch: STORAGE_BRANCH }),
        });
        if (!ghRes.ok) throw new Error(`GitHub upload failed: ${ghRes.status}`);
        const githubUrl = `https://raw.githubusercontent.com/${STORAGE_REPO}/${STORAGE_BRANCH}/${STORAGE_DIR}/${fileName}`;
        await unlink(outPath).catch(() => {});
        downloaded.push({ url: video.url, title: video.title, duration: video.duration, channel: video.channel, githubUrl });
        console.log(`[oracle-proxy] uploaded: ${video.title.slice(0, 60)}`);
      } catch (err) {
        console.error(`[oracle-proxy] failed: ${video.title.slice(0, 60)} — ${err.message}`);
        await unlink(outPath).catch(() => {});
      }
    }
    jobs[jobId] = { ok: true, status: "done", count: downloaded.length, videos: downloaded };
    console.log(`[oracle-proxy] job ${jobId} done — ${downloaded.length}/${videoList.length}`);
  } catch (err) {
    jobs[jobId] = { ok: false, status: "done", error: err.message, count: 0, videos: [] };
  } finally {
    if (cookiesPath) await unlink(cookiesPath).catch(() => {});
  }
}

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (SECRET) {
    const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (auth !== SECRET) return send(res, 401, { error: "Unauthorized" });
  }
  if (req.method === "GET" && req.url.startsWith("/api/fetch-videos/status/")) {
    const jobId = req.url.split("/").pop();
    const job = jobs[jobId];
    return job ? send(res, 200, job) : send(res, 404, { error: "Not found" });
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
    if (!channels.length) return send(res, 400, { error: "No channels in roster" });
    const jobId = randomUUID();
    jobs[jobId] = { ok: false, status: "running", count: 0, videos: [] };
    send(res, 200, { ok: true, jobId, status: "running" });
    runJob(jobId, channels, Number(minDuration), Number(limit), cookiesB64)
      .catch(err => { jobs[jobId] = { ok: false, status: "done", error: err.message, count: 0, videos: [] }; });
    return;
  }
  send(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[oracle-proxy] listening on port ${PORT}`);
  if (!STORAGE_TOKEN) console.warn("WARNING: GITHUB_STORAGE_TOKEN not set");
});
SERVEREOF

echo "=== Writing env file ==="
sudo tee /etc/oracle-proxy.env > /dev/null << ENVEOF
FETCH_SECRET=${FETCH_SECRET}
GITHUB_STORAGE_TOKEN=${GITHUB_STORAGE_TOKEN}
GITHUB_STORAGE_REPO=PanavMhatre/openclips-media
GITHUB_STORAGE_BRANCH=main
GITHUB_STORAGE_DIR=clips
PORT=7474
ENVEOF
sudo chmod 600 /etc/oracle-proxy.env

echo "=== Creating systemd service ==="
sudo tee /etc/systemd/system/oracle-proxy.service > /dev/null << 'SVCEOF'
[Unit]
Description=OpenClips Oracle Download Proxy
After=network.target

[Service]
Type=simple
User=opc
EnvironmentFile=/etc/oracle-proxy.env
ExecStart=/usr/bin/node /opt/oracle-proxy/server.mjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable oracle-proxy
sudo systemctl start oracle-proxy

echo "=== Opening firewall ==="
sudo firewall-cmd --permanent --add-port=7474/tcp
sudo firewall-cmd --reload

echo ""
echo "=== Done! Service status: ==="
sudo systemctl status oracle-proxy --no-pager

echo ""
echo "=== Health check ==="
sleep 2
curl -sf http://localhost:7474/health && echo " — proxy is running!" || echo "ERROR: health check failed"

echo ""
echo "Public URL: http://64.181.199.39:7474"
echo "Add this as secret OPENCLIPS_ORACLE_URL in GitHub repo settings."
