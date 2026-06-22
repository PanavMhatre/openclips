#!/usr/bin/env node
/**
 * generate-sports-queries.mjs
 *
 * Builds a dynamic sports roster by combining:
 *   1. NewsAPI top sports headlines (live, today)
 *   2. YouTube trending sports titles (via yt-dlp flat search)
 *
 * Both signals are fed to Groq which decides WHICH sports are most active
 * right now and generates 8 targeted yt-dlp search queries for them.
 * No sport is hard-coded — if it's World Cup week, you get World Cup queries;
 * if it's NBA Finals week, you get NBA Finals queries; etc.
 *
 * Writes a roster markdown to DYNAMIC_ROSTER_FILE (default /tmp/oc-dynamic-roster.md)
 * in the same format as references/sports-channel-roster.md.
 *
 * Exits 0 on success, 1 on failure (caller falls back to static roster).
 *
 * Env vars:
 *   NEWSAPI_KEY             NewsAPI.org key
 *   GROQ_API_KEY            Groq API key
 *   DYNAMIC_ROSTER_FILE     Output path (default /tmp/oc-dynamic-roster.md)
 */

import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const NEWS_API_KEY  = process.env.NEWSAPI_KEY || "";
const GROQ_API_KEY  = (process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS || "").split(",")[0].trim();
const OUTPUT_FILE   = process.env.DYNAMIC_ROSTER_FILE || "/tmp/oc-dynamic-roster.md";
const TODAY         = new Date().toISOString().slice(0, 10);
const YEAR          = new Date().getFullYear();

// ── Multi-sport broadcast channels — used to map queries to roster rows ───────
// These are all strong channels that cover multiple sports; the AI-generated
// query (searchAlias) is what determines what gets found, not the handle.
const BROADCAST_CHANNELS = [
  { name: "ESPN",              handle: "@ESPN",              weight: 3 },
  { name: "Bleacher Report",   handle: "@BleacherReport",   weight: 3 },
  { name: "Sky Sports",        handle: "@SkySports",        weight: 2 },
  { name: "CBS Sports",        handle: "@CBSSports",        weight: 2 },
  { name: "Fox Sports",        handle: "@FOXSports",        weight: 2 },
  { name: "NBC Sports",        handle: "@NBCSports",        weight: 2 },
  { name: "BBC Sport",         handle: "@BBCSport",         weight: 2 },
  { name: "DAZN",              handle: "@DAZN",             weight: 1 },
];

// ── NewsAPI: live sports headlines ────────────────────────────────────────────
async function fetchNewsAPIHeadlines() {
  if (!NEWS_API_KEY) { process.stderr.write("NEWSAPI_KEY not set — skipping\n"); return []; }
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=sports&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status !== "ok") { process.stderr.write(`NewsAPI error: ${data.message}\n`); return []; }
    return (data.articles || []).map(a => a.title).filter(Boolean);
  } catch (e) {
    process.stderr.write(`NewsAPI fetch failed: ${e.message}\n`);
    return [];
  }
}

// ── YouTube trending sports feed ──────────────────────────────────────────────
async function fetchYouTubeTrendingSports() {
  return new Promise(resolve => {
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

// ── Groq: decide what's hot and build queries ─────────────────────────────────
async function generateQueriesWithGroq(headlines, trendingTitles) {
  if (!GROQ_API_KEY) { process.stderr.write("GROQ_API_KEY not set — cannot generate queries\n"); return null; }

  const contextLines = [];
  if (headlines.length) {
    contextLines.push("=== Live sports headlines right now (NewsAPI) ===");
    headlines.slice(0, 15).forEach(h => contextLines.push(`• ${h}`));
  }
  if (trendingTitles.length) {
    contextLines.push("\n=== Currently trending on YouTube Sports ===");
    trendingTitles.slice(0, 12).forEach(t => contextLines.push(`• ${t}`));
  }

  const prompt = `Today is ${TODAY}. You are a sports video editor who finds the most viral sports highlight clips on YouTube.

${contextLines.join("\n")}

Your job: generate 8 YouTube search queries that will find the most shareable sports highlight videos uploaded in the last 24-48 hours.

RULES:
- Read the headlines and trending titles above — find what's MOST ACTIVE and VIRAL in sports RIGHT NOW
- Do NOT default to any single sport. If NBA Finals is happening, weight NBA. If UFC just had a card, weight UFC. If a major football tournament is live, weight that. Follow the headlines.
- Each query should be specific: include team names, player names, event names, and the year ${YEAR}
- Include "highlights" in most queries so YouTube returns proper compilation videos (not news segments)
- Aim for variety: ideally 3-4 different sports/events across the 8 queries
- Avoid queries that return just news shows or talking-head analysis — you want actual match/game footage
- Good format: "[Team/Player/Event] highlights ${YEAR}", "[Event] best moments", "[Player] [action] [competition]"
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
        temperature: 0.3,
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
    const ch = BROADCAST_CHANNELS[i % BROADCAST_CHANNELS.length];
    return `| ${ch.name} | ${ch.handle} | ${q} | ${ch.weight} |`;
  });

  return `# Dynamic Sports Roster — ${TODAY}

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
${rows.join("\n")}

## Hard rules
- **Never use audio-only uploads.** All source videos must have a real video track.
- **Minimum video length**: 120 seconds (2 min)
- **Focus on**: match highlights, key plays, recent fights, finals moments, reactions
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
