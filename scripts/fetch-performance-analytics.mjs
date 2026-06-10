#!/usr/bin/env node
/**
 * fetch-performance-analytics.mjs
 *
 * Pulls two signals and writes data/performance-signals.json:
 *
 *   1. Zernio — metrics on every published post (views, likes, comments,
 *      shares, saves, engagementRate, igReelsAvgWatchTime).
 *      Extracts topic keywords from each post's content and aggregates
 *      per-topic performance scores.
 *
 *   2. YouTube Data API — recent video stats for every source channel
 *      (views, likes, comments, duration).  Used to bias the ranker
 *      toward topics that are currently popping on YouTube.
 *
 * Output schema:
 * {
 *   generatedAt: ISO string,
 *   topicScores: { "<keyword>": number },   // 0-100 normalised
 *   channelScores: { "<@handle>": number }, // 0-100 normalised
 *   topPosts: [ { content, platform, views, engagementRate, publishedAt } ],
 *   topYouTubeVideos: [ { title, channelHandle, views, likes, publishedAt } ]
 * }
 *
 * Usage:
 *   node scripts/fetch-performance-analytics.mjs [--output=data/performance-signals.json]
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── helpers ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { output: join(ROOT, "data", "performance-signals.json") };
  for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--/, "").split("=");
    if (k === "output") args.output = v;
  }
  return args;
}

async function fetchJson(url, opts = {}) {
  const { default: fetch } = await import("node-fetch");
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: null, raw: text.slice(0, 200) }; }
}

/** Very lightweight keyword extractor — no deps. */
function extractKeywords(text) {
  const stop = new Set([
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "is","was","are","were","be","been","have","has","had","do","does","did",
    "will","would","could","should","may","might","this","that","these","those",
    "i","you","he","she","we","they","it","its","my","your","our","their",
    "not","no","so","if","as","by","from","up","out","about","into","than",
    "more","how","what","why","when","who","which","just","here","there",
    "also","all","been","can","get","got","let","now","one","use","via",
    "s","re","t","ve","ll","d","m",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w))
    .slice(0, 20);
}

function normalise(map) {
  const vals = Object.values(map);
  const max = Math.max(...vals, 1);
  const out = {};
  for (const [k, v] of Object.entries(map)) out[k] = Math.round((v / max) * 100);
  return out;
}

// ── Zernio ───────────────────────────────────────────────────────────────────

async function fetchZernioAnalytics(apiKey) {
  if (!apiKey) { process.stderr.write("ZERNIO_API_KEY not set — skipping Zernio analytics.\n"); return []; }

  // 1. Get all accounts
  const { data: accsData } = await fetchJson("https://api.zernio.com/v1/accounts", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const accounts = accsData?.accounts || [];
  if (!accounts.length) { process.stderr.write("Zernio: no accounts found.\n"); return []; }

  process.stderr.write(`Zernio: found ${accounts.length} account(s): ${accounts.map(a => a.displayName).join(", ")}\n`);

  // 2. Fetch analytics for last 60 days across all accounts
  const fromDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate   = new Date().toISOString().slice(0, 10);
  const allPosts = [];

  for (const acc of accounts) {
    const url = `https://api.zernio.com/v1/analytics?accountId=${acc._id}&fromDate=${fromDate}&toDate=${toDate}`;
    const { data } = await fetchJson(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    const posts = data?.posts || [];
    process.stderr.write(`  ${acc.platform} (${acc.displayName}): ${posts.length} posts\n`);
    for (const p of posts) {
      allPosts.push({
        id: p._id,
        content: p.content || "",
        platform: p.platform,
        publishedAt: p.publishedAt,
        views: p.analytics?.views || 0,
        impressions: p.analytics?.impressions || 0,
        reach: p.analytics?.reach || 0,
        likes: p.analytics?.likes || 0,
        comments: p.analytics?.comments || 0,
        shares: p.analytics?.shares || 0,
        saves: p.analytics?.saves || 0,
        engagementRate: p.analytics?.engagementRate || 0,
        avgWatchTime: p.analytics?.igReelsAvgWatchTime || 0,
      });
    }
  }

  return allPosts;
}

// ── YouTube Data API — OWN channel only ──────────────────────────────────────
// Channel ID for the podbyte YouTube channel.
// Override via YOUTUBE_CHANNEL_ID env var if ever needed.
const OWN_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UC_ERJKaFlixaaKAJmSsghtA"; // @podbyteedits

async function fetchYouTubeAnalytics(apiKey) {
  if (!apiKey) { process.stderr.write("YOUTUBE_API_KEY not set — skipping YouTube analytics.\n"); return { videoStats: [], topVideos: [] }; }

  const topVideos = [];

  // Fetch channel info
  const { data: chData } = await fetchJson(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,contentDetails&id=${OWN_CHANNEL_ID}&key=${apiKey}`
  );
  const ch = chData?.items?.[0];
  if (!ch) { process.stderr.write(`  YouTube: channel ${OWN_CHANNEL_ID} not found\n`); return { topVideos: [] }; }

  const stats = ch.statistics;
  const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;
  process.stderr.write(`  ${ch.snippet.title}: ${stats.subscriberCount} subs, ${stats.videoCount} videos, ${stats.viewCount} total views\n`);

  // Fetch all uploads (up to 50 most recent)
  if (uploadsPlaylistId) {
    for (const handle of ["dummy"]) { // single iteration
      const { data: plData } = await fetchJson(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
      );
      const videoIds = (plData?.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
      process.stderr.write(`  Fetching stats for ${videoIds.length} videos...\n`);

      if (videoIds.length) {
        const { data: vData } = await fetchJson(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`
        );
        for (const v of vData?.items || []) {
          topVideos.push({
            title: v.snippet?.title || "",
            channelName: v.snippet?.channelTitle || "",
            views: parseInt(v.statistics?.viewCount || "0", 10),
            likes: parseInt(v.statistics?.likeCount || "0", 10),
            comments: parseInt(v.statistics?.commentCount || "0", 10),
            favorites: parseInt(v.statistics?.favoriteCount || "0", 10),
            publishedAt: v.snippet?.publishedAt || "",
            duration: v.contentDetails?.duration || "",
            videoId: v.id,
          });
        }
        process.stderr.write(`  Top video: "${topVideos.sort((a,b)=>b.views-a.views)[0]?.title?.slice(0,60)}" (${topVideos[0]?.views} views)\n`);
      }
    }
  }

  return { topVideos };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const ZERNIO_KEY  = process.env.ZERNIO_API_KEY  || "";
  const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "";

  process.stderr.write("=== Fetching performance analytics ===\n");

  // 1. Zernio post analytics
  process.stderr.write("\n[1/2] Zernio post metrics...\n");
  const zPosts = await fetchZernioAnalytics(ZERNIO_KEY);

  // Aggregate topic scores from Zernio
  const topicRaw = {};
  for (const p of zPosts) {
    const score = (p.views || 0)
      + (p.likes || 0) * 3
      + (p.comments || 0) * 5
      + (p.shares || 0) * 4
      + (p.saves || 0) * 3
      + (p.engagementRate || 0) * 10
      + (p.avgWatchTime || 0) * 2;
    const kws = extractKeywords(p.content);
    for (const kw of kws) {
      topicRaw[kw] = (topicRaw[kw] || 0) + score;
    }
  }

  // Top posts by engagement
  const topPosts = [...zPosts]
    .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0) || (b.views || 0) - (a.views || 0))
    .slice(0, 20)
    .map(p => ({
      content: p.content.slice(0, 120),
      platform: p.platform,
      views: p.views,
      likes: p.likes,
      engagementRate: p.engagementRate,
      avgWatchTime: p.avgWatchTime,
      publishedAt: p.publishedAt,
    }));

  // 2. YouTube — own channel video performance
  process.stderr.write("\n[2/2] YouTube channel stats (own channel)...\n");
  const { topVideos } = await fetchYouTubeAnalytics(YOUTUBE_KEY);

  // Build topic scores from YouTube video performance on own channel
  for (const v of topVideos) {
    const score = (v.views / 100) + v.likes * 5 + v.comments * 8;
    for (const kw of extractKeywords(v.title)) {
      topicRaw[kw] = (topicRaw[kw] || 0) + score;
    }
  }

  // Normalise scores
  const topicScores = normalise(topicRaw);

  // Top YouTube videos by views
  const topYouTubeVideos = [...topVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      zernioPostsAnalysed: zPosts.length,
      youtubeVideosAnalysed: topVideos.length,
      topTopics: Object.entries(topicScores).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}(${v})`),
    },
    topicScores,
    topPosts,
    topYouTubeVideos,
  };

  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, JSON.stringify(output, null, 2));
  process.stderr.write(`\nWrote performance signals → ${args.output}\n`);
  process.stderr.write(`Top topics: ${output.summary.topTopics.join(", ")}\n`);
}

main().catch(err => { process.stderr.write(`Fatal: ${err.message}\n`); process.exit(1); });
