#!/usr/bin/env node
/**
 * fetch-via-render.mjs
 *
 * Routes YouTube search + download through an external server to avoid
 * GitHub Actions datacenter IP blocks.
 *
 * Prefers OPENCLIPS_ORACLE_URL (Oracle VM proxy) over OPENCLIPS_RENDER_URL.
 * The Oracle proxy accepts rosterContent in the POST body so it doesn't
 * need a copy of the repo.
 *
 * Usage:
 *   node scripts/fetch-via-render.mjs [--roster=sports] [--total=1] [--min-duration=1200] [--output=file]
 *
 * Env vars:
 *   OPENCLIPS_ORACLE_URL    Preferred — Oracle VM proxy URL (http://ip:7474)
 *   OPENCLIPS_RENDER_URL    Fallback — Render server URL
 *   OPENCLIPS_FETCH_SECRET  Bearer token
 *   COOKIES_B64             YouTube cookies (base64 Netscape format)
 *   YTDLP_PROXIES           Comma/newline-separated proxy list (forwarded to Render only)
 */

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseRosterLocally(md) {
  const channels = [];
  for (const line of (md || "").split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^\s|]+|https?:\/\/[^\s|]+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/);
    if (m && !m[1].toLowerCase().includes("name")) {
      channels.push({ name: m[1].trim(), searchAlias: m[3].trim(), weight: Number(m[4]) || 1 });
    }
  }
  return channels;
}

async function searchYouTubeApi(channels, minDurationSec, totalLimit) {
  const apiKey = process.env.YOUTUBE_API_KEY || "";
  if (!apiKey) { process.stderr.write("YOUTUBE_API_KEY not set — skipping API search\n"); return null; }

  const durationFilter = minDurationSec <= 240 ? "medium" : "long";
  const results = [];
  const seen = new Set();

  process.stderr.write(`YouTube API search (videoDuration=${durationFilter}, ${channels.length} queries)...\n`);
  for (const ch of channels) {
    if (results.length >= Math.max(totalLimit * 4, 20)) break;
    const query = ch.searchAlias;
    if (!query) continue;
    try {
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        videoDuration: durationFilter,
        maxResults: "5",
        relevanceLanguage: "en",
        key: apiKey,
      });
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      const data = await res.json();
      if (data.error) {
        process.stderr.write(`  [yt-api] "${query.slice(0,50)}": ${data.error.message}\n`);
        continue;
      }
      for (const item of data.items || []) {
        const videoId = item.id?.videoId;
        if (!videoId || seen.has(videoId)) continue;
        const title   = item.snippet?.title || "";
        const channel = item.snippet?.channelTitle || ch.name;
        // Skip news networks — they produce press conferences and news segments,
        // not podcast clips. Only allow through for the sports roster.
        const NEWS_CHANNELS = /^(CNN|CNBC|Fox News|Bloomberg|BBC News|NBC News|ABC News|CBS News|Reuters|Associated Press|AP|Sky News|Al Jazeera|C-SPAN|MSNBC|PBS NewsHour|The Young Turks|NowThis|Vox|Vice News|Guardian News|Washington Post|New York Times|Forbes|Fortune|The Economist)/i;
        const NEWS_TITLE = /\b(press conference|live:? fed|live:? president|congressional hearing|senate hearing|white house briefing|oval office|breaking news)\b/i;
        if (minDurationSec >= 1200 && (NEWS_CHANNELS.test(channel) || NEWS_TITLE.test(title))) {
          process.stderr.write(`  [yt-api] skip news source: "${title.slice(0,60)}" (${channel})\n`);
          continue;
        }
        seen.add(videoId);
        results.push({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title,
          channel,
          duration: 0,
        });
      }
      process.stderr.write(`  [yt-api] "${query.slice(0,50)}": ${data.items?.length || 0} hits\n`);
    } catch (e) {
      process.stderr.write(`  [yt-api] "${query.slice(0,50)}": ${e.message}\n`);
    }
  }
  if (!results.length) return null;
  process.stderr.write(`YouTube API found ${results.length} candidate video(s) total.\n`);
  return results;
}

function parseArgs(argv) {
  const args = { roster: "daily", total: 1, minDuration: 1200, output: null, rosterFile: null };
  for (const arg of argv.slice(2)) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "roster") args.roster = val;
    else if (key === "total") args.total = Number(val) || 1;
    else if (key === "min-duration") args.minDuration = Number(val) || 1200;
    else if (key === "output") args.output = val;
    else if (key === "roster-file") args.rosterFile = val;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv);

  const oracleUrl = (process.env.OPENCLIPS_ORACLE_URL || "").replace(/\/+$/, "");
  const renderUrl = (process.env.OPENCLIPS_RENDER_URL || "").replace(/\/+$/, "");
  const secret = process.env.OPENCLIPS_FETCH_SECRET || "";
  const cookiesB64 = process.env.COOKIES_B64 || "";
  const proxies = process.env.YTDLP_PROXIES || "";

  // Prefer Oracle VM over Render
  const useOracle = Boolean(oracleUrl);
  const baseUrl = useOracle ? oracleUrl : renderUrl;

  if (!baseUrl) {
    process.stderr.write("Error: neither OPENCLIPS_ORACLE_URL nor OPENCLIPS_RENDER_URL is set.\n");
    process.exit(1);
  }

  const headers = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  process.stderr.write(
    `Fetching videos via ${useOracle ? "Oracle VM proxy" : "Render server"} ` +
    `(roster=${args.roster}, total=${args.total}, minDuration=${args.minDuration}s)...\n`,
  );
  process.stderr.write(`Server URL: ${baseUrl}\n`);
  if (cookiesB64) process.stderr.write("Forwarding YouTube cookies.\n");
  else process.stderr.write("Warning: COOKIES_B64 not set — server will run yt-dlp without cookies.\n");

  // Build POST body
  let postBody;
  let oracleRosterContent = null; // captured for fallback retry when Oracle VM runs old code
  if (useOracle) {
    // Read roster file (needed for YouTube API search and as fallback for Oracle VM search)
    let rosterPath, rosterLabel;
    if (args.rosterFile) {
      rosterPath = args.rosterFile;
      rosterLabel = path.basename(args.rosterFile);
    } else {
      const rosterFile = args.roster === "sports" ? "sports-channel-roster.md" : "channel-roster.md";
      rosterPath = path.join(__dirname, "..", "references", rosterFile);
      rosterLabel = rosterFile;
    }
    let rosterContent;
    try {
      rosterContent = readFileSync(rosterPath, "utf8");
    } catch {
      process.stderr.write(`Error: cannot read ${rosterPath}\n`);
      process.exit(1);
    }
    oracleRosterContent = rosterContent; // save for potential fallback

    // Try YouTube Data API search first (avoids yt-dlp search bot-check on Oracle VM)
    const rosterChannels = parseRosterLocally(rosterContent);
    const preSearchedUrls = await searchYouTubeApi(rosterChannels, args.minDuration, args.total);

    if (preSearchedUrls && preSearchedUrls.length > 0) {
      // Oracle VM now has the Mac residential proxy via SSH reverse tunnel (socks5h://127.0.0.1:9100)
      // configured internally — always route through oracle-proxy regardless of YTDLP_PROXIES.
      process.stderr.write(`Using YouTube API results — Oracle VM will download via Mac tunnel proxy.\n`);
      postBody = {
        urls: preSearchedUrls,
        minDuration: args.minDuration,
        limit: args.total,
        ...(cookiesB64 ? { cookiesB64 } : {}),
        ...(proxies ? { proxies } : {}),
      };
    } else {
      // Fall back to Oracle VM search (yt-dlp)
      process.stderr.write(`Sending roster: ${rosterLabel}\n`);
      postBody = {
        rosterContent,
        minDuration: args.minDuration,
        limit: args.total,
        ...(cookiesB64 ? { cookiesB64 } : {}),
        ...(proxies ? { proxies } : {}),
      };
    }
  } else {
    // Render server reads the roster itself from its own copy of the repo
    if (proxies) {
      const count = proxies.split(/[,\n]/).filter(Boolean).length;
      process.stderr.write(`Forwarding ${count} proxy/proxies to Render server.\n`);
    } else {
      process.stderr.write("Warning: YTDLP_PROXIES not set — Render will use its own IP (may be blocked).\n");
    }
    postBody = {
      roster: args.roster,
      minDuration: args.minDuration,
      limit: args.total,
      ...(cookiesB64 ? { cookiesB64 } : {}),
      ...(proxies ? { proxies } : {}),
    };
  }

  // Start fetch job
  let jobId;
  try {
    const postRes = await fetch(`${baseUrl}/api/fetch-videos`, {
      method: "POST",
      headers,
      body: JSON.stringify(postBody),
    });
    if (!postRes.ok) {
      const errBody = await postRes.text();
      // Oracle VM running old code that doesn't support the `urls` field yet.
      // Retry with rosterContent so Oracle VM does its own yt-dlp search+download via proxy.
      if (useOracle && postBody.urls && errBody.includes("rosterContent required") && oracleRosterContent) {
        process.stderr.write(`Oracle VM is running old code — retrying with rosterContent (yt-dlp search mode)...\n`);
        try {
          const fallbackBody = {
            rosterContent: oracleRosterContent,
            minDuration: args.minDuration,
            limit: args.total,
            ...(cookiesB64 ? { cookiesB64 } : {}),
            ...(proxies ? { proxies } : {}),
          };
          const retryRes = await fetch(`${baseUrl}/api/fetch-videos`, {
            method: "POST",
            headers,
            body: JSON.stringify(fallbackBody),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            jobId = retryData.jobId;
            process.stderr.write(`Job started via rosterContent fallback: ${jobId}\n`);
          } else {
            const retryErr = await retryRes.text();
            process.stderr.write(`Oracle VM rosterContent fallback also failed (${retryRes.status}): ${retryErr}\n`);
            process.exit(1);
          }
        } catch (retryErr) {
          process.stderr.write(`Oracle VM rosterContent fallback error: ${retryErr.message}\n`);
          process.exit(1);
        }
      } else {
        process.stderr.write(`Error: server /api/fetch-videos returned HTTP ${postRes.status}: ${errBody}\n`);
        process.exit(1);
      }
    } else {
      const data = await postRes.json();
      jobId = data.jobId;
      process.stderr.write(`Job started: ${jobId}\n`);
    }
  } catch (err) {
    process.stderr.write(`Error contacting server: ${err.message}\n`);
    process.exit(1);
  }

  // Poll until done — 30s intervals, up to 25 minutes
  const maxAttempts = 50;
  let result = null;

  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(30_000);
    try {
      const statusRes = await fetch(`${baseUrl}/api/fetch-videos/status/${jobId}`, { headers });
      if (!statusRes.ok) {
        process.stderr.write(`  [poll ${i}/${maxAttempts}] HTTP ${statusRes.status} — retrying...\n`);
        continue;
      }
      const data = await statusRes.json();
      process.stderr.write(`  [poll ${i}/${maxAttempts}] status=${data.status} count=${data.count ?? 0}\n`);
      if (data.status === "done") {
        result = data;
        break;
      }
    } catch (err) {
      process.stderr.write(`  [poll ${i}/${maxAttempts}] error: ${err.message} — retrying...\n`);
    }
  }

  if (!result) {
    process.stderr.write("Error: timed out waiting for fetch-videos job.\n");
    process.exit(1);
  }

  if (!result.ok || !result.videos?.length) {
    // Oracle VM download failed (IP blocked by YouTube). If we have pre-searched URLs,
    // fall back to returning those directly so the local yt-dlp (with bgutil on GitHub
    // Actions) can download them instead.
    if (postBody.urls && postBody.urls.length > 0) {
      process.stderr.write(
        `Oracle VM download failed: ${result.error || "no videos"}\n` +
        `Falling back to direct YouTube URLs — local yt-dlp with bgutil will handle download.\n`,
      );
      writeDirectUrls(postBody.urls, args);
      return;
    }
    process.stderr.write(`Error: fetch-videos failed: ${result.error || "no videos returned"}\n`);
    process.exit(1);
  }

  // Map to the format expected by downstream scripts
  const output = result.videos.map((v) => ({
    url: v.githubUrl || v.localPath || v.url,
    title: v.title || "",
    duration: v.duration || 0,
    duration_str: v.duration ? `${Math.floor(v.duration / 60)}m` : "?",
    channel: v.channel || "",
    uploader: v.uploader || "",
  }));

  process.stderr.write(`\nServer returned ${output.length} video(s):\n`);
  for (const v of output) {
    process.stderr.write(`  - ${v.title.slice(0, 65)} (${v.duration_str})\n    → ${(v.url || "").slice(0, 70)}\n`);
  }

  const json = JSON.stringify(output, null, 2);
  if (args.output) {
    writeFileSync(args.output, json);
    process.stderr.write(`Wrote results to ${args.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }
}

function writeDirectUrls(urls, args) {
  const output = urls.slice(0, args.total).map((v) => ({
    url: v.url,
    title: v.title || "",
    duration: v.duration || 0,
    duration_str: "?",
    channel: v.channel || "",
    uploader: v.channel || "",
  }));
  process.stderr.write(`\nUsing ${output.length} YouTube URL(s) for direct processing:\n`);
  for (const v of output) {
    process.stderr.write(`  - ${v.title.slice(0, 65)}\n    → ${v.url}\n`);
  }
  const json = JSON.stringify(output, null, 2);
  if (args.output) {
    writeFileSync(args.output, json);
    process.stderr.write(`Wrote results to ${args.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
