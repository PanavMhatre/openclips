#!/usr/bin/env node
/**
 * generate-sports-queries.mjs
 *
 * Builds a dynamic sports roster by combining:
 *   1. NewsAPI top sports headlines (live, today)
 *   2. YouTube trending sports titles (via yt-dlp flat search)
 *
 * Feeds both into Groq to generate 8 targeted yt-dlp search queries,
 * then writes a roster markdown to DYNAMIC_ROSTER_FILE (default /tmp/oc-dynamic-roster.md)
 * in the same format as references/sports-channel-roster.md.
 *
 * Exits 0 on success, 1 on failure (caller falls back to static roster).
 *
 * Env vars:
 *   NEWSAPI_KEY             NewsAPI.org key
 *   GROQ_API_KEY            Groq API key (uses llama-3.3-70b-versatile)
 *   DYNAMIC_ROSTER_FILE     Output path (default /tmp/oc-dynamic-roster.md)
 */

import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const NEWS_API_KEY = process.env.NEWSAPI_KEY || "";
const GROQ_API_KEY = (process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS || "").split(",")[0].trim();
const OUTPUT_FILE = process.env.DYNAMIC_ROSTER_FILE || "/tmp/oc-dynamic-roster.md";
const TODAY = new Date().toISOString().slice(0, 10);

async function fetchNewsAPIHeadlines() {
  if (!NEWS_API_KEY) { process.stderr.write("NEWSAPI_KEY not set — skipping\n"); return []; }
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=sports&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "ok") { process.stderr.write(`NewsAPI error: ${data.message}\n`); return []; }
    return (data.articles || []).map(a => a.title).filter(Boolean);
  } catch (e) {
    process.stderr.write(`NewsAPI fetch failed: ${e.message}\n`);
    return [];
  }
}

async function fetchYouTubeTrendingSports() {
  return new Promise(resolve => {
    // YouTube trending sports feed (category bp param = sports)
    const args = [
      "--flat-playlist", "--no-warnings", "--no-check-certificate",
      "--print", "%(title)s",
      "--playlist-end", "15",
      "https://www.youtube.com/feed/trending?bp=4gINGgt5dWQtc3BvcnRz",
    ];
    const proc = spawn("yt-dlp", args, { timeout: 30000 });
    let out = "";
    proc.stdout.on("data", d => out += d);
    proc.on("close", () => {
      const titles = out.trim().split("\n").filter(Boolean);
      process.stderr.write(`YouTube trending sports: ${titles.length} titles\n`);
      resolve(titles);
    });
    proc.on("error", e => { process.stderr.write(`yt-dlp error: ${e.message}\n`); resolve([]); });
  });
}

async function generateQueriesWithGroq(headlines, trendingTitles) {
  if (!GROQ_API_KEY) { process.stderr.write("GROQ_API_KEY not set — cannot generate queries\n"); return null; }

  const contextLines = [];
  if (headlines.length) {
    contextLines.push("=== Live sports news headlines (NewsAPI) ===");
    headlines.slice(0, 15).forEach(h => contextLines.push(`• ${h}`));
  }
  if (trendingTitles.length) {
    contextLines.push("\n=== Trending YouTube Sports titles right now ===");
    trendingTitles.slice(0, 12).forEach(t => contextLines.push(`• ${t}`));
  }

  const prompt = `Today is ${TODAY}. Your job is to pick the 8 best YouTube search queries to find the most recent sports highlight videos uploaded in the last 24-48 hours.

${contextLines.join("\n")}

Rules:
- Each query must be a plain YouTube search string (no quotes, no special chars)
- Prioritise events happening THIS WEEK: live tournaments, ongoing finals, recent match results
- Include "2026" or "highlights" so results are recent and video-rich
- Mix across sports but weight toward whatever is most active in the headlines above
- Output EXACTLY 8 queries, one per line, nothing else (no numbers, no bullets, no explanation)`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    if (data.error) { process.stderr.write(`Groq error: ${JSON.stringify(data.error)}\n`); return null; }
    const text = data.choices?.[0]?.message?.content || "";
    const queries = text.trim().split("\n").map(l => l.trim()).filter(Boolean).slice(0, 8);
    return queries.length >= 4 ? queries : null;
  } catch (e) {
    process.stderr.write(`Groq request failed: ${e.message}\n`);
    return null;
  }
}

function buildRosterMarkdown(queries) {
  // Spread queries across the approved channel handles so parseRoster() picks them up.
  // The channel handle doesn't affect which videos are found — the searchAlias does.
  const channels = [
    { name: "FIFA World Cup",        handle: "@FIFAWorldCup",    weight: 4 },
    { name: "Premier League",        handle: "@premierleague",   weight: 2 },
    { name: "La Liga",               handle: "@LaLiga",          weight: 2 },
    { name: "UEFA Champions League", handle: "@ChampionsLeague", weight: 2 },
    { name: "NBA",                   handle: "@NBA",             weight: 3 },
    { name: "NFL Network",           handle: "@NFLNetwork",      weight: 2 },
    { name: "ESPN",                  handle: "@ESPN",            weight: 2 },
    { name: "Sky Sports",            handle: "@SkySports",       weight: 1 },
  ];

  const rows = queries.map((q, i) => {
    const ch = channels[i % channels.length];
    return `| ${ch.name} | ${ch.handle} | ${q} | ${ch.weight} |`;
  });

  return `# Dynamic Sports Roster — ${TODAY}

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
${rows.join("\n")}

## Hard rules
- **Never use audio-only uploads.** All source videos must have a real video track.
- **Minimum video length**: 120 seconds (2 min)
- **Focus on**: match highlights, key plays, recent fights, finals moments
`;
}

async function main() {
  process.stderr.write(`=== Generating dynamic sports queries for ${TODAY} ===\n`);

  const [headlines, trendingTitles] = await Promise.all([
    fetchNewsAPIHeadlines(),
    fetchYouTubeTrendingSports(),
  ]);

  process.stderr.write(`NewsAPI headlines: ${headlines.length}\n`);
  if (headlines.length) {
    process.stderr.write("Top headlines:\n");
    headlines.slice(0, 6).forEach(h => process.stderr.write(`  • ${h}\n`));
  }

  const queries = await generateQueriesWithGroq(headlines, trendingTitles);

  if (!queries) {
    process.stderr.write("ERROR: Could not generate queries — falling back to static roster\n");
    process.exit(1);
  }

  process.stderr.write(`\nGenerated ${queries.length} dynamic search queries:\n`);
  queries.forEach(q => process.stderr.write(`  → ${q}\n`));

  const md = buildRosterMarkdown(queries);
  writeFileSync(OUTPUT_FILE, md);
  process.stderr.write(`\nDynamic roster written to ${OUTPUT_FILE}\n`);
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
