#!/usr/bin/env node
/**
 * generate-daily-queries.mjs
 *
 * Builds a dynamic daily (podcast / finance / tech) roster by combining:
 *   1. NewsAPI top business + technology headlines (live, today)
 *   2. YouTube trending titles in tech/finance/business (via yt-dlp flat search)
 *
 * Both signals are fed to Groq which identifies the hottest topics right now
 * and generates 8 targeted search queries — each pointing at the specific host,
 * guest, or event most worth clipping TODAY.
 *
 * The system is NOT locked to any fixed channel list. If Sam Altman just did a
 * major interview, you get a Sam Altman query. If the Fed just raised rates, you
 * get a macro-econ query. The AI decides what's most viral.
 *
 * Writes a roster markdown to DYNAMIC_DAILY_ROSTER_FILE (default /tmp/oc-dynamic-daily-roster.md)
 * in the same format as references/channel-roster.md.
 *
 * Exits 0 on success, 1 on failure (caller falls back to static roster).
 *
 * Env vars:
 *   NEWSAPI_KEY                   NewsAPI.org key
 *   GROQ_API_KEY                  Groq API key
 *   DYNAMIC_DAILY_ROSTER_FILE     Output path (default /tmp/oc-dynamic-daily-roster.md)
 */

import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const NEWS_API_KEY  = process.env.NEWSAPI_KEY || "";
const GROQ_API_KEY  = (process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS || "").split(",")[0].trim();
const OUTPUT_FILE   = process.env.DYNAMIC_DAILY_ROSTER_FILE || "/tmp/oc-dynamic-daily-roster.md";
const TODAY         = new Date().toISOString().slice(0, 10);
const YEAR          = new Date().getFullYear();

// ── Long-form podcast / finance / tech channels ───────────────────────────────
// Used to map AI-generated search queries to roster rows.
// The handle is cosmetic; the searchAlias (AI-generated) drives what actually gets found.
const PODCAST_CHANNELS = [
  { name: "My First Million",       handle: "@MyFirstMillionPod",   weight: 3 },
  { name: "Alex Hormozi",           handle: "@AlexHormozi",         weight: 3 },
  { name: "Lex Fridman",            handle: "@lexfridman",          weight: 3 },
  { name: "All-In Podcast",         handle: "@allin",               weight: 2 },
  { name: "Diary of a CEO",         handle: "@TheDiaryOfACEO",      weight: 2 },
  { name: "Y Combinator",           handle: "@ycombinator",         weight: 2 },
  { name: "a16z",                   handle: "@a16z",                weight: 2 },
  { name: "Codie Sanchez",          handle: "@CodieSanchez",        weight: 2 },
];

// ── NewsAPI: live business + technology headlines ─────────────────────────────
async function fetchNewsAPIHeadlines() {
  if (!NEWS_API_KEY) { process.stderr.write("NEWSAPI_KEY not set — skipping\n"); return []; }

  // Fetch both business and technology in parallel
  const [bizData, techData] = await Promise.all([
    fetch(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=15&apiKey=${NEWS_API_KEY}`)
      .then(r => r.json()).catch(() => ({ articles: [] })),
    fetch(`https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=15&apiKey=${NEWS_API_KEY}`)
      .then(r => r.json()).catch(() => ({ articles: [] })),
  ]);

  const articles = [
    ...(bizData.articles || []),
    ...(techData.articles || []),
  ];
  return articles.map(a => a.title).filter(Boolean);
}

// ── YouTube trending: tech + general (no sports) ─────────────────────────────
async function fetchYouTubeTrendingTech() {
  // Fetch general trending — avoids sports tab so results skew toward tech/culture
  return new Promise(resolve => {
    const args = [
      "--flat-playlist", "--no-warnings", "--no-check-certificate",
      "--print", "%(title)s",
      "--playlist-end", "20",
      "https://www.youtube.com/feed/trending",
    ];
    const proc = spawn("yt-dlp", args, { timeout: 30000 });
    let out = "";
    proc.stdout.on("data", d => out += d);
    proc.on("close", () => {
      const titles = out.trim().split("\n").filter(Boolean)
        // Exclude sports titles so we don't bias toward sports
        .filter(t => !/\b(goal|highlights|NBA|NFL|UFC|FIFA|soccer|football|basketball|tennis|boxing)\b/i.test(t));
      process.stderr.write(`YouTube trending (non-sports): ${titles.length} titles\n`);
      resolve(titles);
    });
    proc.on("error", e => { process.stderr.write(`yt-dlp error: ${e.message}\n`); resolve([]); });
  });
}

// ── Groq: identify hot topics and build podcast search queries ────────────────
async function generateQueriesWithGroq(headlines, trendingTitles) {
  if (!GROQ_API_KEY) { process.stderr.write("GROQ_API_KEY not set — cannot generate queries\n"); return null; }

  const contextLines = [];
  if (headlines.length) {
    contextLines.push("=== Live business + tech headlines today (NewsAPI) ===");
    headlines.slice(0, 18).forEach(h => contextLines.push(`• ${h}`));
  }
  if (trendingTitles.length) {
    contextLines.push("\n=== Currently trending on YouTube (non-sports) ===");
    trendingTitles.slice(0, 12).forEach(t => contextLines.push(`• ${t}`));
  }

  const prompt = `Today is ${TODAY}. You are a viral short-form clip editor. Your job is to find long-form YouTube podcasts and interviews that will produce the most shareable 30-60 second clips for TikTok and Reels.

${contextLines.join("\n")}

Your job: generate 8 YouTube search queries that will find recent long-form podcast episodes where KNOWN HOSTS discuss the hottest topics from the headlines above.

CRITICAL RULES:
- Every query MUST route through a known viral podcast channel — NOT a news network, press conference, or news segment
- Known viral hosts to target: Lex Fridman, Alex Hormozi, My First Million (Sam Parr + Shaan Puri), All-In Podcast (Chamath + Sacks + Friedberg), Diary of a CEO (Steven Bartlett), Codie Sanchez, Y Combinator, a16z, Acquired, Invest Like the Best, Tim Ferriss, Andrew Huberman, Joe Rogan (business/tech only), Patrick Bet-David Valuetainment, Dave Ramsey, Graham Stephan, The Plain Bagel
- Match the topic to the RIGHT host: Fed/macro → All-In Podcast or Chamath; AI/tech → Lex Fridman or a16z; business/money → Alex Hormozi or My First Million; startups → Y Combinator or a16z; health/performance → Huberman
- Format: "[Host/Show name] [topic] ${YEAR}" or "[Host] on [topic]" or "[Show] latest episode ${YEAR}"
- NEVER query for: news anchors, CNN, CNBC, Fox News, Bloomberg, press conferences, congressional hearings — these produce unusable talking-head news clips
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
        max_tokens: 500,
        temperature: 0.35,
      }),
    });
    const data = await res.json();
    if (data.error) { process.stderr.write(`Groq error: ${JSON.stringify(data.error)}\n`); return null; }
    const text    = data.choices?.[0]?.message?.content || "";
    const queries = text.trim().split("\n").map(l => l.replace(/^[\d\.\-\*\•]+\s*/, "").trim()).filter(Boolean).slice(0, 8);
    process.stderr.write(`Groq generated ${queries.length} queries.\n`);
    return queries.length >= 4 ? queries : null;
  } catch (e) {
    process.stderr.write(`Groq request failed: ${e.message}\n`);
    return null;
  }
}

// ── Build roster markdown ─────────────────────────────────────────────────────
function buildRosterMarkdown(queries) {
  const rows = queries.map((q, i) => {
    const ch = PODCAST_CHANNELS[i % PODCAST_CHANNELS.length];
    return `| ${ch.name} | ${ch.handle} | ${q} | ${ch.weight} |`;
  });

  return `# Dynamic Daily Roster — ${TODAY}

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
${rows.join("\n")}

## Hard rules
- **Never use audio-only uploads.** All source videos must have a real video track.
- **Minimum video length**: 1200 seconds (20 min) — must be long-form podcast/interview content.
- **Focus on**: podcasts, interviews, founder talks, keynotes, VC discussions, finance breakdowns.
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  process.stderr.write(`=== Generating dynamic daily queries for ${TODAY} ===\n`);

  const [headlines, trendingTitles] = await Promise.all([
    fetchNewsAPIHeadlines(),
    fetchYouTubeTrendingTech(),
  ]);

  process.stderr.write(`NewsAPI headlines: ${headlines.length}\n`);
  if (headlines.length) {
    process.stderr.write("Top headlines:\n");
    headlines.slice(0, 8).forEach(h => process.stderr.write(`  • ${h}\n`));
  }

  const queries = await generateQueriesWithGroq(headlines, trendingTitles);

  if (!queries) {
    process.stderr.write("ERROR: Could not generate queries — falling back to static roster\n");
    process.exit(1);
  }

  process.stderr.write(`\nGenerated ${queries.length} search queries:\n`);
  queries.forEach(q => process.stderr.write(`  → ${q}\n`));

  const md = buildRosterMarkdown(queries);
  writeFileSync(OUTPUT_FILE, md);
  process.stderr.write(`\nDynamic roster written to ${OUTPUT_FILE}\n`);
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
