#!/usr/bin/env node
/**
 * rank-openclips-clips.mjs
 *
 * Read OpenClips project metadata and output the best five clips for scheduling.
 *
 * Scoring:
 *   - Base: clip.score (0-100 from AI analysis)
 *   - +8   cloud URL exists (githubMediaUrl / discordMediaUrl)
 *   - +5   hook names a company, person, or product
 *   - -20  hook is generic (label-only, number-only, or vague catch-phrase)
 *   - -12  clip already has Buffer schedule entries
 *   - -10  hook or focus is missing
 *
 * Usage:
 *   node scripts/rank-openclips-clips.mjs [--base-url U] [--top N] [--all] [--json]
 *
 * Options:
 *   --base-url U  OpenClips server (default: http://localhost:3000)
 *   --top N       Number of clips to output (default: 5)
 *   --all         Include already-scheduled clips in ranking
 *   --json        Output JSON array (default: human-readable table)
 */

const args = process.argv.slice(2);
const BASE_URL_FLAG = args.indexOf("--base-url");
const BASE_URL = BASE_URL_FLAG >= 0 ? args[BASE_URL_FLAG + 1] : (process.env.OPENCLIPS_URL || "http://localhost:3000");
const TOP_FLAG = args.indexOf("--top");
const TOP_N = TOP_FLAG >= 0 ? Math.max(1, Number(args[TOP_FLAG + 1]) || 5) : 5;
const INCLUDE_SCHEDULED = args.includes("--all");
const JSON_OUTPUT = args.includes("--json");

const WEAK_HOOK_PATTERNS = [
  /^podcast (moment|clip|highlight)s?$/i,
  /^(ai|tech|business|finance|startup) (and|moment|clip|highlight|talk|update)s?$/i,
  /^(big|major|key|top|best|great|interesting|important|huge) (concern|update|insight|moment|clip|news)s?$/i,
  /^[\d,.]+[kmbKMB%$]?\s*(million|billion|percent|travelers?|users?|dollars?|revenue)?$/i,
  /^(viral moment|short form clip|standalone moment|local fallback|this scene|the hook lands|why this will stop)/i,
  /^(the future of|the rise of|all about|deep dive|quick take|hot take|breaking news)/i,
];

const NAMED_ENTITY_PATTERN = /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b|\b(OPENAI|TESLA|APPLE|GOOGLE|META|AMAZON|NVIDIA|ANTHROPIC|MICROSOFT)\b/;

async function main() {
  const { projects } = await fetchProjects();
  const readyProjects = projects.filter((p) => p.status === "ready" && p.clips?.length > 0);

  if (!readyProjects.length) {
    if (!JSON_OUTPUT) console.log("No ready projects with clips found.");
    else process.stdout.write(JSON.stringify([], null, 2) + "\n");
    return;
  }

  const candidates = [];
  for (const project of readyProjects) {
    for (const clip of project.clips) {
      const ranked = scoreClip(clip, project);
      if (ranked.score > 0) candidates.push(ranked);
    }
  }

  candidates.sort((a, b) => b.adjustedScore - a.adjustedScore);
  const top = candidates.slice(0, TOP_N);

  if (JSON_OUTPUT) {
    process.stdout.write(JSON.stringify(top, null, 2) + "\n");
    return;
  }

  printTable(top, candidates.length);
}

function scoreClip(clip, project) {
  let score = Number(clip.score) || 0;
  const adjustments = [];
  const hook = String(clip.hook || "").trim();
  const focus = String(clip.focus || "").trim();
  const hasCloud = Boolean(clip.githubMediaUrl || clip.discordMediaUrl);
  const alreadyScheduled = (clip.bufferSchedules?.length || 0) > 0;

  const hasDownload = Boolean(clip.downloadUrl || hasCloud);
  if (!hasDownload) {
    return { ...baseClipData(clip, project), adjustedScore: -1, adjustments: ["no-download-url"] };
  }

  if (hasCloud) { score += 8; adjustments.push("+8 cloud-url"); }
  if (!hook) { score -= 10; adjustments.push("-10 no-hook"); }
  if (!focus) { score -= 10; adjustments.push("-10 no-focus"); }

  if (hook && isWeakHook(hook)) {
    score -= 20;
    adjustments.push("-20 weak-hook");
  } else if (hook && NAMED_ENTITY_PATTERN.test(hook)) {
    score += 5;
    adjustments.push("+5 named-entity");
  }

  if (alreadyScheduled && !INCLUDE_SCHEDULED) {
    score -= 12;
    adjustments.push("-12 already-scheduled");
  }

  return { ...baseClipData(clip, project), adjustedScore: Math.max(0, score), adjustments };
}

function baseClipData(clip, project) {
  return {
    projectId: project.id,
    clipId: clip.id,
    projectTitle: project.title?.slice(0, 60) || "",
    hook: clip.hook || clip.title || "",
    focus: clip.focus || "",
    score: Number(clip.score) || 0,
    start: clip.start,
    end: clip.end,
    duration: clip.duration,
    downloadUrl: clip.downloadUrl || "",
    githubMediaUrl: clip.githubMediaUrl || "",
    discordMediaUrl: clip.discordMediaUrl || "",
    thumbnailUrl: clip.thumbnailUrl || "",
    alreadyScheduled: (clip.bufferSchedules?.length || 0) > 0,
    scheduleCount: clip.bufferSchedules?.length || 0,
  };
}

function isWeakHook(hook) {
  return WEAK_HOOK_PATTERNS.some((re) => re.test(hook.trim()));
}

async function fetchProjects() {
  const resp = await fetch(`${BASE_URL}/api/projects`);
  if (!resp.ok) throw new Error(`OpenClips API error: HTTP ${resp.status}`);
  return resp.json();
}

function printTable(top, totalCandidates) {
  if (!top.length) { console.log("No clips passed the scoring threshold."); return; }
  console.log(`\nTop ${top.length} clips (from ${totalCandidates} candidates)\n`);
  console.log("Rank  Score  Hook" + " ".repeat(42) + "Project");
  console.log("-".repeat(100));
  top.forEach((clip, i) => {
    const hook = clip.hook.slice(0, 46).padEnd(46);
    const project = clip.projectTitle.slice(0, 28);
    console.log(`${String(i + 1).padStart(4)}  ${String(clip.adjustedScore).padStart(5)}  ${hook}  ${project}`);
  });
  console.log();
  top.forEach((clip, i) => {
    console.log(`[${i + 1}] ${clip.hook}`);
    console.log(`    Project : ${clip.projectId}`);
    console.log(`    Clip    : ${clip.clipId}`);
    console.log(`    Score   : ${clip.adjustedScore} (base ${clip.score}) — ${clip.adjustments.join(", ")}`);
    console.log(`    Focus   : ${clip.focus?.slice(0, 120)}`);
    if (clip.githubMediaUrl) console.log(`    GitHub  : ${clip.githubMediaUrl}`);
    else if (clip.discordMediaUrl) console.log(`    Discord : ${clip.discordMediaUrl}`);
    console.log();
  });
}

main().catch((err) => { console.error(err.message); process.exit(1); });
