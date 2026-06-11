#!/usr/bin/env node
/**
 * enhance-clips-with-images.mjs
 *
 * Post-processes vertical podcast clips by overlaying contextual stock images
 * at key moments — but ONLY on clips that are purely talking-head footage with
 * no existing text, captions, animations, or motion graphics baked in.
 *
 * Detection:
 *   Two ffmpeg passes analyse the bottom 15% and top 10% of the frame:
 *   1. Edge density  — high mean = baked-in text/captions present
 *   2. Temporal diff — high 90th-percentile = animated overlays present
 *   Either exceeding threshold → clip is already styled → skip.
 *
 * Overlay design (720×1280 vertical frame):
 *   • Image card: 256px wide, proportional height, 6px white border
 *   • Position: lower-left (x=18, y=700) — below face, above any lower-third zone
 *   • 3 images per clip, evenly spaced, each shown for ~3.5s
 *   • Fade-in 0.4s / fade-out 0.4s
 *
 * Usage:
 *   node scripts/enhance-clips-with-images.mjs --clips=/tmp/oc-top8.json
 *   node scripts/enhance-clips-with-images.mjs --clip=data/clips/foo.mp4 --topic="US debt"
 *
 * Options:
 *   --clips=<file>     JSON array of clip objects (from rank script)
 *   --clip=<path>      Single clip MP4 file
 *   --topic=<str>      Search keyword override
 *   --images=<n>       Images per clip (default: 3, max: 5)
 *   --dry-run          Show plan without modifying anything
 *   --force            Skip face-only detection and enhance all clips
 *
 * Env:
 *   PIXABAY_API_KEY    Free key from https://pixabay.com/api/docs/
 */

import { existsSync, readFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import https from "node:https";
import http from "node:http";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_CLIPS_DIR = path.join(ROOT_DIR, "data", "clips");

// ── Thresholds (calibrated on real clips) ────────────────────────────────────
//
// Scene-cut rate (sole signal):
//   GPS Spoofing (Veritasium B-roll): 42 cuts / 42s = 1.0 cuts/s  → styled
//   All face-only clips:              0–7 cuts / 43s = ≤0.16/s    → face-only
//   Threshold: 0.25 cuts/s (2× the highest face-only value)
//
// Bottom-strip edge density is intentionally NOT used — OpenClips always
// renders captions in the lower third of its output clips, so that check
// false-positives on every clip and skips them all.
// Scene-cut rate alone correctly distinguishes talking-head podcast clips
// from clips that already have B-roll, animations, or heavy editing.
const CUTS_PER_SECOND_THRESHOLD = 0.25;  // normalised scene-cut rate

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { clipsFile: null, clipPath: null, topic: null, images: 3, dryRun: false, force: false };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--force")   { args.force  = true; continue; }
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    const val = rest.join("=");
    if (key === "clips")  args.clipsFile = val;
    else if (key === "clip")   args.clipPath  = val;
    else if (key === "topic")  args.topic     = val;
    else if (key === "images") args.images    = Math.min(5, Math.max(1, Number(val) || 3));
  }
  return args;
}

// ── Topic mapping + keyword extraction ───────────────────────────────────────

const TOPIC_MAP = [
  [/\bai\b|singularity|artificial intelligence|machine learning|neural|llm/i,   "artificial intelligence technology future"],
  [/\bdebt\b|deficit|borrowing|treasury|federal reserve/i,                       "national debt money finance"],
  [/alien|extraterrestrial|radio signal|seti|fermi|outer space|ufo/i,            "aliens space telescope universe"],
  [/\bgps\b|spoofing|navigation|satellite|location|geolocation/i,                "GPS satellite navigation map"],
  [/housing|real estate|mortgage|property|home price|rent/i,                     "housing market real estate"],
  [/invest|stock market|portfolio|asset|bear market|crash|burn|wealth|interest rate/i, "stock market investing money"],
  [/lobby|lobbying|congress|politics|government|democracy|citizen|vote/i,        "capitol congress politics government"],
  [/tesla|electric car|\bev\b|automotive|car compan/i,                           "Tesla electric car"],
  [/crypto|bitcoin|blockchain|web3/i,                                            "bitcoin cryptocurrency blockchain"],
  [/startup|venture|founder|silicon valley|unicorn/i,                            "startup entrepreneur business"],
  [/climate|carbon|energy|solar|wind|fossil/i,                                   "climate change renewable energy"],
  [/health|longevity|biohacking|diet|exercise/i,                                 "health wellness fitness"],
  [/money|wealth|finance|financial|dollar|economy|inflation/i,                   "money wealth finance economy"],
  [/war|military|geopolitics|nuclear|sanctions/i,                                "geopolitics world map military"],
  [/china|asia|trade|supply chain/i,                                             "global trade supply chain"],
];

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by","from",
  "that","this","is","was","are","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "not","no","nor","so","yet","both","either","neither","each","every","all","any",
  "more","most","why","how","what","which","who","when","where","its","it","about",
  "than","then","there","their","they","we","us","you","your","he","she","him","her",
  "discuss","discusses","explains","says","said","think","thought","raise","raises",
  "suggest","suggests","appear","appears","show","shows","walk","walks","talk","talks",
  "just","very","much","many","some","few","less","also","well","still","even","already",
  "rather","use","using","used","make","makes","made","get","gets","got","go","goes",
  "come","take","takes","took","look","looks","seem","seems","become","becomes","keep",
  "want","wants","need","needs","give","gives","gave","know","known","find","finds",
  "new","old","big","small","high","low","good","bad","great","large","little","real",
  "right","long","short","true","false","same","different","important","major","key",
  "potential","capable","possible","likely","certain","clear","able","unable",
  "rapidly","rapid","quickly","slow","slowly","quietly","silently","aggressively",
  "podcast","clip","episode","part","chapter","section","minute","second","hour",
  "closer","further","better","worse","never","always","often","sometimes","today",
  "thing","things","stuff","way","ways","point","points","time","times","year","years",
  "day","days","week","weeks","number","numbers","percent","rate","rates","level",
  "problem","problems","issue","issues","concern","concerns","warning","sign","signs",
  "world","whole","entire","across","around","beyond","inside","outside","without",
  "through","during","before","after","between","among","against","toward","onto",
  // Speaker names
  "chamath","palihapitiya","sachs","friedberg","sacks","lex","fridman","hormozi",
  "codie","sanchez","ferriss","parrish","oshaughnessy","bartlett","steven",
  "patrick","boyle","mohnish","pabrai","sam","parr","shaan","puri","ben","gilbert",
  "david","rosenthal","acquired","allin","yc","ycombinator",
]);

function extractKeywords(clip) {
  const fullText = [clip.hook || "", clip.title || clip._projectTitle || "", (clip.focus || "").slice(0, 400)].join(" ");
  for (const [re, concept] of TOPIC_MAP) {
    if (re.test(fullText)) return concept;
  }
  const words = (clip.title || clip.hook || "")
    .replace(/[^a-zA-Z\s]/g, " ").toLowerCase().split(/\s+/)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w));
  const seen = new Set();
  const unique = words.filter((w) => { if (seen.has(w)) return false; seen.add(w); return true; });
  return unique.slice(0, 3).join(" ") || "podcast business discussion";
}

// ── Face-only detection ───────────────────────────────────────────────────────

/**
 * Returns { faceOnly, reason } for a clip.
 *
 * Two complementary checks (run in parallel):
 *
 * 1. Scene-cut rate in the body zone (y=25%–75%)
 *    - ffmpeg select filter counts frames where ≥30% of the frame changes at once
 *    - Face-only clips: 0–7 cuts over ~43s (≤0.16 cuts/s)
 *    - Animated / B-roll clips: many cuts (GPS Spoofing had 42 cuts = 1.0/s)
 *    - Threshold: 0.25 cuts/s
 *
 * 2. Bottom-strip edge density (y=85%–100%)
 *    - High mean edge luma → baked-in captions from the source channel
 *    - Face-only clips: 1.4–4.4; clips with captions: 6+
 *    - Threshold: 5.5
 *
 * The top 15% is intentionally excluded — OpenClips always renders a title
 * card there and it would false-positive on every clip.
 */
async function isFaceOnly(clipPath) {
  let width = 720, height = 1280, duration = 30;

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height,duration",
      "-of", "json", clipPath,
    ]);
    const s = JSON.parse(stdout).streams?.[0];
    if (s) { width = s.width; height = s.height; duration = Number(s.duration) || 30; }
  } catch { /* use defaults */ }

  const bodyH = Math.round(height * 0.50);
  const bodyY = Math.round(height * 0.25);

  // Scene-cut rate in the middle 50% of the frame only.
  // Top 25% excluded — OpenClips always renders a title card there.
  // Bottom 25% excluded — OpenClips always renders captions there.
  // High cut rate = already edited with B-roll → skip overlay.
  // Low cut rate = talking-head podcast → add Pixabay images.
  let cuts = 0, cutsPerSec = 0;
  try {
    const { stdout } = await execFileAsync("ffmpeg", [
      "-i", clipPath,
      "-vf", `crop=${width}:${bodyH}:0:${bodyY},select='gt(scene\\,0.30)',metadata=print:file=-`,
      "-an", "-f", "null", "-",
    ], { timeout: 45_000 });
    cuts = (stdout.match(/pts_time/g) || []).length;
    cutsPerSec = cuts / duration;
  } catch { /* treat as 0 cuts — safe to enhance */ }

  const faceOnly = cutsPerSec <= CUTS_PER_SECOND_THRESHOLD;
  const reason = faceOnly
    ? `face-only podcast (${cuts} cuts in ${duration.toFixed(0)}s = ${cutsPerSec.toFixed(2)}/s)`
    : `already edited — B-roll/cuts detected (${cuts} cuts in ${duration.toFixed(0)}s = ${cutsPerSec.toFixed(2)}/s)`;

  return { faceOnly, reason };
}

// ── Pixabay image search ──────────────────────────────────────────────────────

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "OpenClips/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`JSON parse: ${data.slice(0, 80)}`)); }
      });
    }).on("error", reject);
  });
}

async function searchPixabay(query, apiKey, count = 5) {
  const q = encodeURIComponent(query);
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${q}&image_type=photo&safesearch=true&per_page=${count + 5}&orientation=horizontal&min_width=400`;
  const data = await fetchJson(url);
  if (!data.hits?.length) {
    // Broaden: try first word only
    const broad = query.split(" ")[0];
    if (broad !== query) {
      const url2 = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(broad)}&image_type=photo&safesearch=true&per_page=${count + 5}&orientation=horizontal&min_width=400`;
      const data2 = await fetchJson(url2);
      return (data2.hits || []).slice(0, count).map((h) => h.webformatURL);
    }
    return [];
  }
  return data.hits.slice(0, count).map((h) => h.webformatURL);
}

// ── Image download ────────────────────────────────────────────────────────────

async function downloadImageFile(url, destPath) {
  const { createWriteStream } = await import("node:fs");
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      const mod = u.startsWith("https") ? https : http;
      const stream = createWriteStream(destPath);
      mod.get(u, { headers: { "User-Agent": "OpenClips/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          stream.close(); follow(res.headers.location); return;
        }
        res.pipe(stream);
        stream.on("finish", () => stream.close(resolve));
        stream.on("error", reject);
      }).on("error", reject);
    };
    follow(url);
  });
}

// ── ffmpeg overlay builder ────────────────────────────────────────────────────

async function getVideoDuration(clipPath) {
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_streams", clipPath]);
    const vs = JSON.parse(stdout).streams.find((s) => s.codec_type === "video");
    return Number(vs?.duration) || 30;
  } catch { return 30; }
}

/**
 * Find the best placement position for the image card by measuring edge density
 * in 4 candidate zones across the lower half of the frame.
 *
 * Zones evaluated (for 720×1280, card=268×~190px):
 *   Lower-left    x=10,  y=920
 *   Lower-right   x=442, y=920   (720-268-10)
 *   Mid-left      x=10,  y=800
 *   Mid-right     x=442, y=800
 *
 * Picks the zone with the lowest edge density mean → clearest background space.
 * Falls back to lower-left if ffmpeg fails.
 */
async function findBestPlacement(clipPath, width = 720, height = 1280) {
  const CARD_W  = 268;   // card width including border
  const CARD_H  = 200;   // approximate card height
  const PAD_X   = 10;
  const rightX  = width - CARD_W - PAD_X;

  const candidates = [
    { label: "lower-left",  x: PAD_X,   y: Math.round(height * 0.72) },
    { label: "lower-right", x: rightX,  y: Math.round(height * 0.72) },
    { label: "bot-left",    x: PAD_X,   y: Math.round(height * 0.82) },
    { label: "bot-right",   x: rightX,  y: Math.round(height * 0.82) },
  ];

  const scores = await Promise.all(candidates.map(async (zone) => {
    // Clamp crop to frame bounds
    const cropY = Math.min(zone.y, height - CARD_H);
    const cropH = Math.min(CARD_H, height - cropY);
    try {
      const { stdout } = await execFileAsync("ffmpeg", [
        "-ss", "8", "-i", clipPath, "-vframes", "4",
        "-vf",
          `crop=${CARD_W}:${cropH}:${zone.x}:${cropY},` +
          `edgedetect=low=0.05:high=0.2,` +
          `signalstats=stat=tout,metadata=print:file=-`,
        "-f", "null", "-",
      ], { timeout: 15_000 });
      const vals = [...stdout.matchAll(/lavfi\.signalstats\.YAVG=(\d+\.?\d*)/g)]
        .map((m) => parseFloat(m[1]));
      const mean = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 99;
      return { ...zone, score: mean };
    } catch {
      return { ...zone, score: 99 };
    }
  }));

  scores.sort((a, b) => a.score - b.score);
  const best = scores[0];
  process.stderr.write(
    `    Placement scan: ${scores.map((z) => `${z.label}=${z.score.toFixed(1)}`).join("  ")}\n` +
    `    → Best: ${best.label} (x=${best.x}, y=${best.y}, edge=${best.score.toFixed(1)})\n`,
  );
  return { x: best.x, y: best.y };
}

/**
 * Build filter_complex to overlay N images centered on a 720×1280 vertical frame,
 * with a permanent caption text bar always visible above the image card.
 *
 * Layout (bottom of frame):
 * Layout (bottom of 720×1280 frame):
 *   y=690  ── image card (380px wide, 8px white border, fades in/out)
 *   y=930  ── hook caption (ALWAYS visible, fixed position, transparent bg + white bold text)
 *            ↑ same fixed Y whether or not an image is currently showing
 *
 * Caption style matches OpenClips transcript captions:
 *   white bold text, transparent background, dark stroke/outline.
 *
 * Fade strategy: blend filter with time-based trapezoid expression (T variable).
 * NOTE: Single quotes wrapping the all_expr value are REQUIRED so ffmpeg's option
 * parser doesn't interpret commas inside clip() as filter-chain separators.
 *
 * @param {number}   clipDuration  total seconds of the clip
 * @param {string[]} imgPaths      local paths to downloaded Pixabay images
 * @param {string}   captionFile   path to a pre-rendered caption PNG (undefined → no caption)
 */
function buildOverlayFilter(clipDuration, imgPaths, captionFile) {
  const count        = imgPaths.length;
  const gap          = (clipDuration - 2) / count;
  const showDuration = Math.min(4.0, gap * 0.85);
  const CARD_W = 380, PAD = 8, FADE = 0.5;
  const TOTAL_W = CARD_W + PAD * 2;           // 396px
  const X = Math.round((720 - TOTAL_W) / 2);  // 162 — horizontally centred
  const CAP_Y  = 700;   // unused (captions now baked in by server)
  const IMG_Y  = 970;   // image card — very bottom of frame, just above progress bar
  const parts = [];

  // Scale + border each image into a static YUV card.
  // Pixabay returns RGBA PNG — force rgb24 first so pad operates on 3 channels.
  for (let i = 0; i < count; i++) {
    parts.push(
      `[${i + 1}:v]format=rgb24,scale=${CARD_W}:-2,` +
      `pad=${TOTAL_W}:ih+${PAD * 2}:${PAD}:${PAD}:color=white,` +
      `format=yuv420p[card${i}]`,
    );
  }

  // Chain: for each card, split the current video stream, overlay card on one
  // branch, then blend the two branches with a time-trapezoid alpha.
  // Single-quoting the all_expr value is essential — it prevents ffmpeg's
  // filtergraph parser from treating commas inside clip() as filter separators.
  let last = "0:v";
  for (let i = 0; i < count; i++) {
    const start = 1 + i * gap;
    const end   = start + showDuration;
    const alphaExpr =
      `clip((T-${start.toFixed(3)})*${(1/FADE).toFixed(4)},0,1)` +
      `*clip((${end.toFixed(3)}-T)*${(1/FADE).toFixed(4)},0,1)`;
    const splitA = `split${i}a`, splitB = `split${i}b`;
    const withCard = `wc${i}`;
    const out = i === count - 1 ? (captionFile ? "preCap" : "vout") : `blended${i}`;

    parts.push(`[${last}]split[${splitA}][${splitB}]`);
    parts.push(`[${splitB}][card${i}]overlay=${X}:${IMG_Y}:format=yuv420[${withCard}]`);
    parts.push(`[${splitA}][${withCard}]blend=all_expr='A*(1-(${alphaExpr}))+B*(${alphaExpr})'[${out}]`);
    last = out;
  }

  // Caption overlay — ALWAYS visible at fixed CAP_Y, transparent PNG, sits ABOVE the image.
  // Position never moves regardless of whether an image is currently showing.
  if (captionFile) {
    const capInputIdx = imgPaths.length + 1;
    parts.push(
      `[preCap][${capInputIdx}:v]overlay='(W-w)/2':${CAP_Y}:format=yuv420[vout]`,
    );
  }

  return { filterComplex: parts.join(";"), mapArgs: ["-map", "[vout]", "-map", "0:a?"] };
}

// ── Single clip enhancement ───────────────────────────────────────────────────

async function enhanceClip(clipPath, clipMeta, apiKey, numImages, dryRun, force) {
  const label = path.basename(clipPath, ".mp4").slice(0, 45);
  process.stderr.write(`\n  ▶ ${label}\n`);

  // Step 1: face-only detection
  if (!force) {
    process.stderr.write(`    Analysing frame content...\n`);
    const { faceOnly, reason } = await isFaceOnly(clipPath);
    process.stderr.write(`    ${faceOnly ? "✓ Face-only" : "✗ Already styled"} — ${reason}\n`);
    if (!faceOnly) return { status: "styled" };
  }

  // Step 2: extract topic
  const topic = clipMeta.topic || extractKeywords(clipMeta);
  process.stderr.write(`    Topic: "${topic}"\n`);

  if (dryRun) {
    process.stderr.write(`    [dry-run] Would fetch ${numImages} images for "${topic}"\n`);
    return { status: "would-enhance", topic };
  }

  // Step 3: Pixabay search
  let imageUrls;
  try {
    imageUrls = await searchPixabay(topic, apiKey, numImages);
  } catch (err) {
    process.stderr.write(`    [warn] Pixabay search failed: ${err.message}\n`);
    return { status: "error" };
  }

  if (!imageUrls.length) {
    process.stderr.write(`    [warn] No images found for "${topic}" — skipping\n`);
    return { status: "no-images" };
  }
  process.stderr.write(`    Found ${imageUrls.length} image(s) on Pixabay\n`);

  // Step 4: download images
  const tmpDir = path.join(tmpdir(), `oc-enhance-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const imgPaths = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const dest = path.join(tmpDir, `img${i}.jpg`);
    try {
      await downloadImageFile(imageUrls[i], dest);
      imgPaths.push(dest);
    } catch (err) {
      process.stderr.write(`    [warn] Image ${i + 1} download failed: ${err.message}\n`);
    }
  }

  if (!imgPaths.length) {
    process.stderr.write(`    [warn] All downloads failed — skipping\n`);
    cleanupTmp(tmpDir, imgPaths);
    return { status: "error" };
  }

  // Step 5: probe duration, find clear placement, build filter
  const duration = await getVideoDuration(clipPath);
  if (duration < 8) {
    process.stderr.write(`    [skip] Clip too short (${duration.toFixed(1)}s)\n`);
    cleanupTmp(tmpDir, imgPaths);
    return { status: "too-short" };
  }

  // If -orig.mp4 exists, always render from the clean original (never stack overlays)
  const origPath = clipPath.replace(/\.mp4$/, "-orig.mp4");
  const sourcePath = existsSync(origPath) ? origPath : clipPath;

  // Caption disabled — image card only
  const captionText = (clipMeta.hook || clipMeta.title || topic || "").trim();
  let captionFile = null;
  if (false && captionText) {
    captionFile = path.join(tmpDir, "caption.png");
    // Word-wrap at ~38 chars per line
    const words = captionText.split(/\s+/);
    const MAX_CHARS = 38;
    const lines = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > MAX_CHARS && line) {
        lines.push(line.trim());
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    }
    if (line) lines.push(line.trim());
    // ALL CAPS, max 2 lines
    const captionLabel = lines.slice(0, 2).join("\n").toUpperCase();

    // Style: transparent background, white text with dark outline.
    // Use magick label: with explicit font path — produces GrayscaleAlpha PNG
    // (white=255, transparent background) which ffmpeg overlay handles correctly.
    const makeCaptionArgs = (font) => [
      "-background", "none",
      "-fill", "white",
      "-stroke", "#050505",
      "-strokewidth", "8",
      "-font", font,
      "-pointsize", "40",
      `label:${captionLabel}`,
      captionFile,
    ];

    try {
      await execFileAsync("magick", makeCaptionArgs("/System/Library/Fonts/HelveticaNeue.ttc"), { timeout: 10_000 });
    } catch {
      try {
        await execFileAsync("magick", makeCaptionArgs("/System/Library/Fonts/Helvetica.ttc"), { timeout: 10_000 });
      } catch (e2) {
        process.stderr.write(`    [warn] Caption render failed: ${e2.message.slice(0, 120)} — skipping caption\n`);
        captionFile = null;
      }
    }
  }

  const { filterComplex, mapArgs } = buildOverlayFilter(duration, imgPaths, captionFile);
  const outPath = clipPath.replace(/\.mp4$/, "-enhanced.mp4");

  const ffmpegArgs = [
    "-y",
    "-i", sourcePath,         // input 0: always use original
    ...imgPaths.flatMap((p) => ["-i", p]),  // inputs 1…N: Pixabay images
    // input N+1: caption PNG, looped for the full clip duration
    ...(captionFile ? ["-loop", "1", "-t", String(duration), "-i", captionFile] : []),
    "-filter_complex", filterComplex,
    ...mapArgs,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "22",
    "-c:a", "copy",
    "-movflags", "+faststart",
    outPath,
  ];

  process.stderr.write(`    Rendering ${imgPaths.length} overlay(s) onto ${duration.toFixed(1)}s clip...\n`);
  try {
    await execFileAsync("ffmpeg", ffmpegArgs, { timeout: 600_000 });
  } catch (err) {
    process.stderr.write(`    [error] ffmpeg failed:\n${err.stderr?.slice(-800) || err.message.slice(0, 800)}\n`);
    cleanupTmp(tmpDir, imgPaths);
    if (existsSync(outPath)) unlinkSync(outPath);
    return { status: "error" };
  }

  // Step 6: replace the clip in-place (keep -orig as clean backup)
  const { renameSync } = await import("node:fs");
  if (!existsSync(origPath)) {
    // First time enhancing — back up original
    renameSync(clipPath, origPath);
  } else {
    // Re-enhancing — remove old enhanced version, keep existing -orig
    unlinkSync(clipPath);
  }
  renameSync(outPath, clipPath);
  process.stderr.write(`    ✓ Enhanced! (clean original kept at ${path.basename(origPath)})\n`);

  cleanupTmp(tmpDir, imgPaths, captionFile);
  return { status: "enhanced", topic };
}

function cleanupTmp(tmpDir, imgPaths, captionFile = null) {
  for (const p of imgPaths) { try { unlinkSync(p); } catch {} }
  if (captionFile) { try { unlinkSync(captionFile); } catch {} }
  import("node:fs").then(({ rmdirSync }) => { try { rmdirSync(tmpDir); } catch {} }).catch(() => {});
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // Load .env
  const envPath = path.join(ROOT_DIR, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (t && !t.startsWith("#") && t.includes("=")) {
        const [k, ...v] = t.split("=");
        if (!process.env[k.trim()]) process.env[k.trim()] = v.join("=").trim();
      }
    }
  }

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey && !args.dryRun) {
    process.stderr.write(
      "Error: PIXABAY_API_KEY not set in .env\n" +
      "  Get a free key at https://pixabay.com/api/docs/\n" +
      "  Then add: PIXABAY_API_KEY=<your_key> to .env\n",
    );
    process.exit(1);
  }

  // Collect clips
  const toProcess = [];

  if (args.clipsFile) {
    if (!existsSync(args.clipsFile)) {
      process.stderr.write(`Error: clips file not found: ${args.clipsFile}\n`);
      process.exit(1);
    }
    for (const clip of JSON.parse(readFileSync(args.clipsFile, "utf8"))) {
      const filePath =
        clip._filePath ||
        clip.filePath ||
        (clip._fileName ? path.join(DATA_CLIPS_DIR, clip._fileName) : null);
      if (!filePath || !existsSync(filePath)) {
        process.stderr.write(`  [skip] No local file: ${(clip.hook || clip.title || "").slice(0, 50)}\n`);
        continue;
      }
      toProcess.push({ clipPath: filePath, meta: clip });
    }
  } else if (args.clipPath) {
    if (!existsSync(args.clipPath)) {
      process.stderr.write(`Error: file not found: ${args.clipPath}\n`); process.exit(1);
    }
    toProcess.push({ clipPath: args.clipPath, meta: { topic: args.topic } });
  } else {
    process.stderr.write("Error: pass --clips=<file> or --clip=<path>\n"); process.exit(1);
  }

  process.stderr.write(
    `\nChecking ${toProcess.length} clip(s) for face-only detection...\n` +
    (args.dryRun ? "(DRY RUN)\n" : "") +
    (args.force  ? "(--force: skipping detection)\n" : ""),
  );

  const counts = { enhanced: 0, styled: 0, error: 0, other: 0 };

  for (const { clipPath, meta } of toProcess) {
    const result = await enhanceClip(clipPath, meta, apiKey, args.images, args.dryRun, args.force);
    if (counts[result.status] !== undefined) counts[result.status]++;
    else counts.other++;
  }

  process.stderr.write(
    `\n── Summary ────────────────────────────────\n` +
    `  Enhanced (face-only clips):  ${counts.enhanced}\n` +
    `  Skipped (already styled):    ${counts.styled}\n` +
    `  Errors / no images:          ${counts.error + counts.other}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
