import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// Ensure $HOME/.local/bin is in PATH and install yt-dlp there if missing
(async () => {
  const localBin = path.join(process.env.HOME || "/root", ".local", "bin");
  if (!process.env.PATH?.includes(localBin)) {
    process.env.PATH = `${localBin}:${process.env.PATH || ""}`;
  }
  const ytdlpPath = path.join(localBin, "yt-dlp");
  try {
    await fsp.access(ytdlpPath, fs.constants.X_OK);
  } catch {
    try {
      await fsp.mkdir(localBin, { recursive: true });
      const { spawn: sp } = await import("node:child_process");
      await new Promise((resolve, reject) => {
        const curl = sp("curl", ["-fsSL", "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp", "-o", ytdlpPath]);
        curl.on("close", code => code === 0 ? resolve() : reject(new Error(`curl exit ${code}`)));
      });
      await fsp.chmod(ytdlpPath, 0o755);
      console.log("[ytdlp] binary installed to", ytdlpPath);
    } catch (e) {
      console.warn("[ytdlp] auto-install failed:", e.message);
    }
  }
})();
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const CLIP_DIR = path.join(DATA_DIR, "clips");
const SOURCE_DIR = path.join(DATA_DIR, "sources");
const THUMB_DIR = path.join(DATA_DIR, "thumbs");
const AUDIO_DIR = path.join(DATA_DIR, "audio");
const CAPTION_DIR = path.join(DATA_DIR, "captions");
const OVERLAY_DIR = path.join(DATA_DIR, "overlays");
const META_PATH = path.join(DATA_DIR, "projects.json");
const FACE_TRACKER_PATH = path.join(__dirname, "face_tracker.py");
const BALL_TRACKER_PATH = path.join(__dirname, "ball_tracker.py");
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === "production";

// ── Cookie init — write YTDLP_COOKIES env var to disk on startup ──────────────
(async () => {
  const cookies = process.env.YTDLP_COOKIES;
  if (!cookies) return;
  const cookiePath = path.join(process.env.HOME || "/root", ".config", "yt-dlp", "cookies.txt");
  await fsp.mkdir(path.dirname(cookiePath), { recursive: true });
  await fsp.writeFile(cookiePath, cookies, "utf8");
  // Write yt-dlp config pointing at cookies + polite delays
  const configPath = path.join(process.env.HOME || "/root", ".config", "yt-dlp", "config");
  const config = [
    "--no-check-certificate",
    "--sleep-requests 2",
    "--sleep-interval 3",
    "--max-sleep-interval 8",
    "--retries 5",
    "--retry-sleep 15",
    "--extractor-args \"youtube:player_client=mweb,web\"",
    "--remote-components ejs:github",
    `--cookies ${cookiePath}`,
  ].join("\n");
  await fsp.writeFile(configPath, config, "utf8");
  console.log(`[ytdlp] cookies written to ${cookiePath}`);
})();

const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const VIDEO_WIDTH = Math.max(360, Number(process.env.OPENCLIPS_RENDER_WIDTH || 720));
const VIDEO_HEIGHT = Math.max(640, Number(process.env.OPENCLIPS_RENDER_HEIGHT || 1280));
const evenRenderValue = (value) => Math.round(Number(value || 0) / 2) * 2;
const VIDEO_SCALE_X = VIDEO_WIDTH / DESIGN_WIDTH;
const VIDEO_SCALE_Y = VIDEO_HEIGHT / DESIGN_HEIGHT;
const VIDEO_SCALE = Math.min(VIDEO_SCALE_X, VIDEO_SCALE_Y);
const VIDEO_CENTER_X = VIDEO_WIDTH / 2;
const PODCAST_FRAME_SIZE = Math.max(2, Math.min(evenRenderValue(VIDEO_WIDTH), evenRenderValue(VIDEO_HEIGHT * 0.58)));
const PODCAST_FRAME_X = evenRenderValue((VIDEO_WIDTH - PODCAST_FRAME_SIZE) / 2);
const PODCAST_FRAME_Y = Math.min(evenRenderValue(VIDEO_HEIGHT * 0.19), Math.max(0, VIDEO_HEIGHT - PODCAST_FRAME_SIZE));
const PODCAST_FRAME_BOTTOM = PODCAST_FRAME_Y + PODCAST_FRAME_SIZE;
const PODCAST_CAPTION_Y = PODCAST_FRAME_BOTTOM - Math.round(84 * VIDEO_SCALE_Y);
const PROGRESS_BAR_HEIGHT = Math.max(6, Math.round(8 * VIDEO_SCALE_Y));
const PROGRESS_BAR_BOTTOM_PAD = Math.round(22 * VIDEO_SCALE_Y);
const PROGRESS_BAR_SIDE_PAD = Math.round(20 * VIDEO_SCALE_X);
const MIN_CLIP_SECONDS = 10;
const MAX_CLIP_SECONDS = 60;
const DEFAULT_CLIP_COUNT = Math.max(1, Number(process.env.OPENCLIPS_DEFAULT_CLIP_COUNT || 3));
const RENDER_FPS = Math.max(15, Number(process.env.OPENCLIPS_RENDER_FPS || 30));
const MAX_RENDER_JOBS = Math.max(1, Number(process.env.OPENCLIPS_MAX_RENDER_JOBS || 1));
const MAX_YTDLP_JOBS = Math.max(1, Number(process.env.OPENCLIPS_MAX_YTDLP_JOBS || 2));
const RENDER_TIMEOUT_MS = Math.max(1000 * 60 * 20, Number(process.env.OPENCLIPS_RENDER_TIMEOUT_MS || 1000 * 60 * 60));
const FFMPEG_THREADS = Number(process.env.OPENCLIPS_FFMPEG_THREADS || 0); // 0 = let FFmpeg auto-detect
const FFMPEG_FILTER_THREADS = Math.max(1, Number(process.env.OPENCLIPS_FFMPEG_FILTER_THREADS || 3));
const FACE_TRACKER_SAMPLES = Math.max(6, Number(process.env.OPENCLIPS_FACE_TRACKER_SAMPLES || 12));
const BALL_TRACKER_SAMPLES = Math.max(6, Number(process.env.OPENCLIPS_BALL_TRACKER_SAMPLES || 12));
const MAX_CAPTION_OVERLAYS = Math.max(4, Number(process.env.OPENCLIPS_MAX_CAPTION_OVERLAYS || 80));
const KEEP_FULL_SOURCE = /^(1|true|yes)$/i.test(String(process.env.OPENCLIPS_KEEP_FULL_SOURCE || ""));
const BACKGROUND_MUSIC_ENABLED = !/^(0|false|no)$/i.test(String(process.env.OPENCLIPS_BACKGROUND_MUSIC || "true"));
const BACKGROUND_MUSIC_VOLUME = Math.max(
  0.01,
  Math.min(0.16, Number(process.env.OPENCLIPS_BACKGROUND_MUSIC_VOLUME || 0.055)),
);
const DELETE_LOCAL_VIDEO_AFTER_CLOUD = !/^(0|false|no)$/i.test(String(process.env.OPENCLIPS_DELETE_LOCAL_VIDEO_AFTER_CLOUD || "true"));
const SPEAKER_FOCUS_MIN_COVERAGE = Math.max(0.15, Math.min(0.9, Number(process.env.OPENCLIPS_SPEAKER_FOCUS_MIN_COVERAGE || 0.36)));
const SPEAKER_FOCUS_MIN_MOUTH_MOTION = Math.max(0.001, Math.min(0.3, Number(process.env.OPENCLIPS_SPEAKER_FOCUS_MIN_MOUTH_MOTION || 0.014)));
const SPEAKER_PAN_TRANSITION_SECONDS = Math.max(0.18, Math.min(1.2, Number(process.env.OPENCLIPS_SPEAKER_PAN_TRANSITION_SECONDS || 0.42)));
const OPUS_GREEN = "#69ff3d";
const CAPTION_YELLOW = "#fff200";

let activeRenderJobs = 0;
const renderQueue = [];

let activeYtdlpJobs = 0;
const ytdlpQueue = [];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || ".mp4") || ".mp4";
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext.toLowerCase()}`);
    },
  }),
  limits: { fileSize: 30 * 1024 * 1024 * 1024 },
});

loadEnvFiles();

const BUFFER_API_URL = String(process.env.BUFFER_API_URL || "https://api.buffer.com").trim();
const BUFFER_PUBLIC_BASE_URL = String(
  process.env.OPENCLIPS_PUBLIC_BASE_URL || process.env.BUFFER_PUBLIC_BASE_URL || "",
).trim();
const DISCORD_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const GITHUB_STORAGE_REPO = String(process.env.GITHUB_STORAGE_REPO || "panavm12-jpg/storage").trim();
const GITHUB_STORAGE_BRANCH = String(process.env.GITHUB_STORAGE_BRANCH || "main").trim();
const GITHUB_STORAGE_DIR = String(process.env.GITHUB_STORAGE_DIR || "openclips").trim().replace(/^\/+|\/+$/g, "");
const GITHUB_STORAGE_MAX_BYTES = Math.max(
  1,
  Number(process.env.GITHUB_STORAGE_MAX_BYTES || 95 * 1024 * 1024),
);

await ensureDirs();

let projects = await loadProjects();
await recoverStaleRenderingProjects();
await cleanupOrphanedAssets(projects);

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));
app.use("/media", express.static(DATA_DIR, {
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=3600");
  },
}));

app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    tools: {
      ffmpeg: await commandExists("ffmpeg"),
      ffprobe: await commandExists("ffprobe"),
      ytDlp: await commandExists("yt-dlp"),
      groq: hasGroqApiKey(),
      groqKeyCount: getGroqApiKeys().length,
      nvidia: hasNvidiaApiKey(),
      buffer: Boolean(bufferApiKey()),
      discordStorage: Boolean(discordWebhookUrl()),
      githubStorage: await hasGitHubStorageAuth(),
      publicMediaBase: Boolean(BUFFER_PUBLIC_BASE_URL),
      backgroundMusic: BACKGROUND_MUSIC_ENABLED,
      cloudOnlyVideo: DELETE_LOCAL_VIDEO_AFTER_CLOUD,
      faceDetection: await canRunFaceDetection(),
    },
  });
});

app.get("/api/projects", (_req, res) => {
  const rows = Object.values(projects)
    .filter((p) => p.genre !== "Sports")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(publicProject);
  res.json({ projects: rows });
});

app.get("/api/projects/:id", (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ project: publicProject(project) });
});

app.post("/api/projects", upload.single("video"), async (req, res) => {
  const sourceUrl = String(req.body.sourceUrl || "").trim();
  const prompt = String(req.body.prompt || "").trim();
  const clipModel = "Podcast";
  const genre = "Podcast";
  const clipLength = "Auto";
  const layout = "speaker";

  if (!req.file && !sourceUrl) {
    res.status(400).json({ error: "Upload a video file or paste a public video URL." });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const project = {
    id,
    title: req.file?.originalname || titleFromUrl(sourceUrl) || "Untitled video",
    sourceUrl,
    originalFileName: req.file?.originalname || "",
    localSourcePath: req.file?.path || "",
    prompt,
    clipModel,
    genre,
    clipLength,
    layout,
    status: "queued",
    statusLabel: "Queued",
    progress: 3,
    createdAt: now,
    updatedAt: now,
    duration: 0,
    dimensions: null,
    clips: [],
    transcriptSegments: [],
    sourceChannel: "",
    sourceUploader: "",
    sourceDescription: "",
    sourceContext: null,
    error: "",
    aiMode: groqAiModeLabel(),
  };

  try {
    assertPipelineConfigured();
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
    return;
  }

  projects[id] = project;
  await saveProjects();
  void processProject(id, { skipBufferSchedule: true });
  res.status(202).json({ project: publicProject(project) });
});

app.delete("/api/projects/:id", async (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await cleanupProjectAssets(project);
  delete projects[req.params.id];
  await saveProjects();
  res.json({ ok: true });
});

app.patch("/api/projects/:id/clips/:clipId", async (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const clipIndex = (project.clips || []).findIndex((c) => c.id === req.params.clipId);
  if (clipIndex < 0) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }
  const { hook, title, focus, reasoning } = req.body;
  const clips = [...project.clips];
  clips[clipIndex] = {
    ...clips[clipIndex],
    ...(hook !== undefined ? { hook } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(focus !== undefined ? { focus } : {}),
    ...(reasoning !== undefined ? { reasoning } : {}),
    updatedAt: Date.now(),
  };
  await updateProject(req.params.id, { clips });
  const updatedClip = clips[clipIndex];
  const affectsRender = hook !== undefined || title !== undefined || focus !== undefined;
  if (affectsRender && canRerenderClip({ ...project, clips }, updatedClip)) {
    void rerenderSingleClip(req.params.id, updatedClip.id);
    res.status(202).json({
      clip: publicClip(updatedClip),
      rerendering: true,
      project: publicProject({
        ...projects[req.params.id],
        status: "rendering",
        statusLabel: "Re-rendering clip",
        progress: 72,
      }),
    });
    return;
  }
  res.json({ clip: publicClip(updatedClip) });
});

app.post("/api/projects/:id/rerender", async (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!project.clips?.length) {
    res.status(400).json({ error: "This project has no clips to rerender yet." });
    return;
  }
  if (!canRerenderProject(project)) {
    res.status(400).json({ error: "No retained clip source is available for rerendering." });
    return;
  }

  void rerenderProject(project.id);
  res.status(202).json({ project: publicProject({ ...project, status: "rendering", statusLabel: "Rerendering vertical clips" }) });
});

app.post("/api/projects/:id/reprocess", async (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (isProjectBusy(project)) {
    res.status(409).json({ error: "This project is already processing." });
    return;
  }
  if (!canReprocessProject(project)) {
    res.status(400).json({ error: "The original source is not available for reprocessing." });
    return;
  }

  await updateProject(project.id, {
    status: "queued",
    statusLabel: "Queued",
    progress: 3,
    clips: [],
    transcriptSegments: [],
    sourceContext: null,
    error: "",
  });
  await cleanupClipAssets(project.clips || [], { includeSourceSegments: true });
  await cleanupProjectScratch(project.id);
  void processProject(project.id, { skipBufferSchedule: true });
  res.status(202).json({ project: publicProject(projects[project.id]) });
});

app.post("/api/projects/:id/clips/:clipId/rerender", async (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const clip = project.clips?.find((item) => item.id === req.params.clipId);
  if (!clip) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }
  if (!canRerenderClip(project, clip)) {
    res.status(400).json({ error: "No retained clip source is available for rerendering." });
    return;
  }

  void rerenderSingleClip(project.id, clip.id);
  res.status(202).json({ project: publicProject({ ...project, status: "rendering", statusLabel: "Rerendering selected clip" }) });
});

// ─── Buffer scheduling routes ────────────────────────────────────────────────

app.get("/api/buffer/channels", async (_req, res) => {
  if (!bufferApiKey()) {
    res.json({
      configured: false,
      organizations: [],
      channels: [],
      error: "Buffer API key is not configured.",
    });
    return;
  }

  try {
    const organizations = await getBufferOrganizations();
    const channelGroups = await Promise.all(
      organizations.map(async (organization) => {
        const channels = await getBufferChannels(organization.id);
        return channels.map((channel) => normalizeBufferChannel(channel, organization));
      }),
    );
    const allChannels = channelGroups.flat();
    res.json({
      configured: true,
      organizations,
      channels: filterBufferChannels(allChannels),
      allChannels,
    });
  } catch (error) {
    res.status(502).json({
      configured: true,
      organizations: [],
      channels: [],
      error: error.message || "Could not load Buffer channels.",
    });
  }
});

app.post("/api/projects/:id/clips/:clipId/schedule", async (req, res) => {
  await scheduleClipToBuffer(req, res, { sports: false });
});

app.post("/api/projects/:id/clips/:clipId/refresh-buffer-captions", async (req, res) => {
  await refreshClipBufferCaptions(req, res, { sports: false });
});

app.post("/api/sports-projects/:id/clips/:clipId/schedule", async (req, res) => {
  await scheduleClipToBuffer(req, res, { sports: true });
});

app.post("/api/sports-projects/:id/clips/:clipId/refresh-buffer-captions", async (req, res) => {
  await refreshClipBufferCaptions(req, res, { sports: true });
});

// ─── Sports routes ────────────────────────────────────────────────────────────

app.get("/api/sports-projects", (_req, res) => {
  const rows = Object.values(projects)
    .filter((p) => p.genre === "Sports")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(publicProject);
  res.json({ projects: rows });
});

app.post("/api/sports-projects", upload.single("video"), async (req, res) => {
  const sourceUrl = String(req.body.sourceUrl || "").trim();
  const sport = String(req.body.sport || "Basketball").trim();

  if (!req.file && !sourceUrl) {
    res.status(400).json({ error: "Upload a video file or paste a public video URL." });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const project = {
    id,
    title: req.file?.originalname || titleFromUrl(sourceUrl) || sport + " highlights",
    sourceUrl,
    originalFileName: req.file?.originalname || "",
    localSourcePath: req.file?.path || "",
    prompt: `Find the best ${sport} highlight moments`,
    clipModel: "Sports",
    genre: "Sports",
    sport,
    clipLength: "Auto",
    layout: "sports",
    status: "queued",
    statusLabel: "Queued",
    progress: 3,
    createdAt: now,
    updatedAt: now,
    duration: 0,
    dimensions: null,
    clips: [],
    transcriptSegments: [],
    sourceChannel: "",
    sourceUploader: "",
    sourceDescription: "",
    sourceContext: null,
    error: "",
    aiMode: groqAiModeLabel(),
  };

  try {
    assertPipelineConfigured();
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
    return;
  }

  projects[id] = project;
  await saveProjects();
  void processSportsProject(id);
  res.status(202).json({ project: publicProject(project) });
});

app.delete("/api/sports-projects/:id", async (req, res) => {
  const project = projects[req.params.id];
  if (!project || project.genre !== "Sports") {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await cleanupProjectAssets(project);
  delete projects[req.params.id];
  await saveProjects();
  res.json({ ok: true });
});

app.post("/api/sports-projects/:id/rerun", async (req, res) => {
  const project = projects[req.params.id];
  if (!project || project.genre !== "Sports") {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (isProjectBusy(project)) {
    res.status(409).json({ error: "This project is already processing." });
    return;
  }
  if (!canReprocessProject(project)) {
    res.status(400).json({ error: "The original source is not available for reprocessing." });
    return;
  }
  await cleanupClipAssets(project.clips || [], { includeSourceSegments: true });
  await cleanupProjectScratch(project.id);
  await updateProject(project.id, {
    status: "queued",
    statusLabel: "Queued",
    progress: 3,
    clips: [],
    transcriptSegments: [],
    sourceContext: null,
    error: "",
  });
  void processSportsProject(project.id, { skipBufferSchedule: true });
  res.status(202).json({ project: publicProject(projects[project.id]) });
});

// ─── End sports routes ────────────────────────────────────────────────────────

// ── POST /api/fetch-videos ────────────────────────────────────────────────────
// Called by GitHub Actions. Searches YouTube via yt-dlp (using server's IP +
// cookies), downloads each video, uploads to GitHub storage, returns URLs.
// Protected by OPENCLIPS_FETCH_SECRET bearer token.
// In-memory job store for async fetch-videos
const fetchJobs = {};

app.get("/api/fetch-videos/status/:jobId", (req, res) => {
  const secret = process.env.OPENCLIPS_FETCH_SECRET;
  if (secret) {
    const auth = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (auth !== secret) return res.status(401).json({ error: "Unauthorized" });
  }
  const job = fetchJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

app.post("/api/fetch-videos", express.json(), async (req, res) => {
  const secret = process.env.OPENCLIPS_FETCH_SECRET;
  if (secret) {
    const auth = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (auth !== secret) return res.status(401).json({ error: "Unauthorized" });
  }

  const minDuration = Number(req.body?.minDuration || 1200);
  const limitPerChannel = Number(req.body?.limit || 1);

  // Parse channel roster
  let rosterMd;
  try {
    rosterMd = fs.readFileSync(path.join(ROOT_DIR, "references", "channel-roster.md"), "utf8");
  } catch {
    return res.status(500).json({ error: "channel-roster.md not found" });
  }

  const channels = [];
  for (const line of rosterMd.split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(@[^\s|]+|https?:\/\/[^\s|]+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/);
    if (m && !m[1].toLowerCase().includes("name")) {
      channels.push({ name: m[1].trim(), handle: m[2].trim(), searchAlias: m[3].trim(), weight: Number(m[4]) || 1 });
    }
  }

  if (!channels.length) return res.status(500).json({ error: "No channels in roster" });

  // Respond immediately with job ID — download runs in background
  const jobId = crypto.randomUUID();
  fetchJobs[jobId] = { ok: false, status: "running", count: 0, videos: [] };
  res.json({ ok: true, jobId, status: "running" });

  // All background work wrapped so any thrown error marks the job done (not frozen)
  try {

  // Search YouTube via yt-dlp for each channel
  const AUDIO_RE = /\(audio\)|\[audio\]|\baudio[\s-]only\b/i;
  async function searchChannel(alias, limit) {
    const fetchCount = Math.max(limit * 5, 10);
    return new Promise((resolve) => {
      const args = [
        "--no-check-certificate", "--no-playlist", "--flat-playlist",
        "--print", "%(webpage_url)s\t%(title)s\t%(duration)s\t%(uploader)s\t%(vcodec)s",
        "--no-warnings", `ytsearch${fetchCount}:${alias}`,
      ];
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
          results.push({ url: url.trim(), title: title.trim(), duration: dur, uploader: (uploader || "").trim() });
          if (results.length >= limit) break;
        }
        resolve(results);
      });
      proc.on("error", () => resolve([]));
    });
  }

  // Collect all candidate URLs
  const videoList = [];
  for (const ch of channels) {
    const limit = limitPerChannel * ch.weight;
    const results = await searchChannel(ch.searchAlias, limit);
    for (const v of results) videoList.push({ ...v, channel: ch.name, channelWeight: ch.weight });
  }

  if (!videoList.length) {
    fetchJobs[jobId] = { ok: false, status: "done", error: "yt-dlp returned no results — cookies may need refresh", count: 0, videos: [] };
    return;
  }

  // Download each video and upload to GitHub storage
  const storageToken = process.env.GITHUB_STORAGE_TOKEN;
  const storageRepo = process.env.GITHUB_STORAGE_REPO || "PanavMhatre/openclips-media";
  const storageBranch = process.env.GITHUB_STORAGE_BRANCH || "main";
  const storageDir = (process.env.GITHUB_STORAGE_DIR || "clips").replace(/^\/+|\/+$/g, "");

  const downloaded = [];
  const tmpDir = path.join(DATA_DIR, "sources");
  await fsp.mkdir(tmpDir, { recursive: true });

  for (const video of videoList) {
    const safeTitle = video.title.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60);
    const outPath = path.join(tmpDir, `${safeTitle}.mp4`);
    try {
      await new Promise((resolve, reject) => {
        const args = [
          "--no-check-certificate", "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          "--merge-output-format", "mp4", "-o", outPath, "--no-playlist", video.url,
        ];
        const proc = spawn("yt-dlp", args, { timeout: 600000 });
        proc.on("close", code => code === 0 ? resolve() : reject(new Error(`yt-dlp exit ${code}`)));
        proc.on("error", reject);
      });

      // Upload to GitHub storage
      let githubUrl = null;
      if (storageToken) {
        const fileBytes = await fsp.readFile(outPath);
        const b64 = fileBytes.toString("base64");
        const fileName = path.basename(outPath);
        const apiUrl = `https://api.github.com/repos/${storageRepo}/contents/${storageDir}/${fileName}`;
        const ghRes = await fetch(apiUrl, {
          method: "PUT",
          headers: { Authorization: `token ${storageToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: `Upload ${fileName}`, content: b64, branch: storageBranch }),
        });
        if (ghRes.ok) {
          githubUrl = `https://raw.githubusercontent.com/${storageRepo}/${storageBranch}/${storageDir}/${fileName}`;
          // Clean up local file after upload
          await fsp.unlink(outPath).catch(() => {});
        }
      }

      downloaded.push({
        url: video.url,
        title: video.title,
        duration: video.duration,
        channel: video.channel,
        localPath: githubUrl ? null : outPath,
        githubUrl,
      });
      console.log(`[fetch-videos] downloaded: ${video.title.slice(0, 60)}`);
    } catch (err) {
      console.error(`[fetch-videos] failed: ${video.title.slice(0, 60)} — ${err.message}`);
    }
  }

  fetchJobs[jobId] = { ok: true, status: "done", count: downloaded.length, videos: downloaded };
  console.log(`[fetch-videos] job ${jobId} done — ${downloaded.length} videos`);

  } catch (err) {
    console.error(`[fetch-videos] job ${jobId} crashed:`, err.message);
    fetchJobs[jobId] = { ok: false, status: "done", error: err.message, count: 0, videos: [] };
  }
});

if (!IS_PROD) {
  const vite = await createViteServer({
    root: ROOT_DIR,
    appType: "spa",
    server: { middlewareMode: true },
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(ROOT_DIR, "dist")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(ROOT_DIR, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenClips running at http://localhost:${PORT}`);
});

async function processProject(projectId, { skipBufferSchedule = false } = {}) {
  const project = projects[projectId];
  if (!project) return;

  try {
    assertPipelineConfigured();
    await updateProject(projectId, { status: "fetching", statusLabel: "Importing source", progress: 10 });

    const importResult = project.localSourcePath && fs.existsSync(project.localSourcePath)
      ? { sourcePath: project.localSourcePath, title: "" }
      : await downloadVideo(project.sourceUrl, projectId);
    const sourcePath = importResult.sourcePath;
    const probe = await probeVideo(sourcePath);
    await updateProject(projectId, {
      title: importResult.title || project.title,
      sourceChannel: importResult.channel || importResult.uploader || project.sourceChannel || "",
      sourceUploader: importResult.uploader || project.sourceUploader || "",
      sourceDescription: String(importResult.description || project.sourceDescription || "").slice(0, 1400),
      localSourcePath: sourcePath,
      duration: probe.duration,
      dimensions: { width: probe.width, height: probe.height },
      progress: 22,
      statusLabel: "Preparing audio",
    });

    const groqSlot = groqSlotForId(projectId);
    if (!probe.hasVideo) {
      throw new Error("Audio-only files are not allowed. A video track is required.");
    }
    if (!probe.hasAudio) {
      throw new Error("This video has no audio track. Groq transcription is required.");
    }

    let segments = project.sourceUrl
      ? await fetchSourceCaptions(project.sourceUrl, projectId, probe.duration)
      : [];
    if (hasUsableTranscriptSegments(segments)) {
      await updateProject(projectId, { status: "transcribing", statusLabel: "Using source captions", progress: 34 });
    } else {
      const audioPath = path.join(AUDIO_DIR, `${projectId}.mp3`);
      try {
        await extractAudio(sourcePath, audioPath);
        await updateProject(projectId, { status: "transcribing", statusLabel: "Transcribing with Groq", progress: 34 });
        segments = await transcribeAudio(audioPath, probe.duration, { keySlot: groqSlot });
      } finally {
        await safeRemoveManagedPath(audioPath);
      }
    }

    const sourceContext = await inferPodcastContext({
      project: projects[projectId],
      segments,
      keySlot: groqSlot + 1,
    });

    await updateProject(projectId, {
      transcriptSegments: segments,
      sourceContext,
      status: "analyzing",
      statusLabel: "Finding viral moments",
      progress: 52,
    });

    const candidates = await planClips({
      project: projects[projectId],
      segments,
      duration: probe.duration,
      keySlot: groqSlot + 2,
    });
    if (!candidates.length) {
      throw new Error("Groq did not return any clip candidates.");
    }

    await updateProject(projectId, {
      status: "rendering",
      statusLabel: "Rendering vertical clips",
      progress: 64,
    });

    const count = Math.min(candidates.length, DEFAULT_CLIP_COUNT);
    const renderedByIndex = new Array(count);
    let completedRenders = 0;
    await Promise.all(candidates.slice(0, count).map(async (candidate, index) => {
      const window = normalizeClipWindow({
        start: candidate.start,
        end: candidate.end,
        sourceDuration: probe.duration,
        clipLength: project.clipLength,
      });
      const clipId = crypto.randomUUID();
      const baseName = `${slugify(candidate.title || `clip-${index + 1}`)}-${clipId.slice(0, 8)}`;
      const clipPath = path.join(CLIP_DIR, `${baseName}.mp4`);
      const thumbPath = path.join(THUMB_DIR, `${baseName}.jpg`);
      const srtPath = path.join(CLIP_DIR, `${baseName}.srt`);
      const xmlPath = path.join(CLIP_DIR, `${baseName}.xml`);
      const clipSegments = segmentsForWindow(segments, window.start, window.end);
      const srt = createSrt(clipSegments, window.start, window.end, candidate.title);
      await fsp.writeFile(srtPath, srt);
      await fsp.writeFile(xmlPath, createXml(project, candidate, window));

      const renderFocusTrack = await renderClip({
        sourcePath,
        outputPath: clipPath,
        start: window.start,
        duration: window.duration,
        title: candidate.title,
        hook: candidate.hook,
        focus: candidate.focus,
        sourceContext: projects[projectId].sourceContext,
        score: candidate.score,
        segments: clipSegments,
        layout: "speaker",
        hasAudio: probe.hasAudio,
        sourceProbe: probe,
        onProgress: (fraction) => {
          const sliceSize = 30 / count;
          const base = 64 + index * sliceSize;
          const pct = Math.round(base + fraction * sliceSize);
          updateProject(projectId, {
            progress: pct,
            statusLabel: `Rendering clip ${index + 1}/${count}… ${Math.round(fraction * 100)}%`,
          });
        },
      });
      await generateThumbnail(clipPath, thumbPath);

      renderedByIndex[index] = {
        id: clipId,
        title: candidate.title,
        hook: candidate.hook || candidate.title,
        focus: candidate.focus,
        reasoning: candidate.reasoning,
        emotion: candidate.emotion,
        score: Math.round(candidate.score),
        renderFocusTrack,
        start: round(window.start),
        end: round(window.end),
        duration: round(window.duration),
        filePath: clipPath,
        thumbnailPath: thumbPath,
        srtPath,
        xmlPath,
        downloadUrl: toMediaUrl(clipPath),
        thumbnailUrl: toMediaUrl(thumbPath),
        srtUrl: toMediaUrl(srtPath),
        xmlUrl: toMediaUrl(xmlPath),
        renderedAt: Date.now(),
      };

      completedRenders += 1;
      const progress = 64 + Math.round((completedRenders / count) * 30);
      await updateProject(projectId, { clips: renderedByIndex.filter(Boolean), progress });
    }));
    const rendered = renderedByIndex.filter(Boolean);
    const compacted = await compactProjectStorage({
      projectId,
      sourcePath,
      clips: rendered,
      segments,
    });

    if (!skipBufferSchedule) {
      await updateProject(projectId, {
        clips: compacted.clips,
        localSourcePath: compacted.localSourcePath,
        transcriptSegments: compacted.transcriptSegments,
        status: "scheduling",
        statusLabel: "Scheduling with Buffer",
        progress: 96,
      });
      await scheduleProjectClipsToBuffer(projectId);
    }

    await updateProject(projectId, {
      clips: skipBufferSchedule ? compacted.clips : projects[projectId].clips,
      localSourcePath: compacted.localSourcePath,
      transcriptSegments: compacted.transcriptSegments,
      status: "ready",
      statusLabel: "Ready",
      progress: 100,
      error: "",
    });
  } catch (error) {
    await updateProject(projectId, {
      status: "failed",
      statusLabel: "Failed",
      progress: 100,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function rerenderProject(projectId) {
  const project = projects[projectId];
  if (!project) return;

  try {
    const sourceClips = project.clips || [];
    const sourceDuration = Number(project.duration || Math.max(0, ...sourceClips.map((clip) => Number(clip.end || 0))));
    const segments = project.transcriptSegments?.length
      ? project.transcriptSegments
      : project.sourceUrl
        ? await fetchSourceCaptions(project.sourceUrl, projectId, sourceDuration)
        : [];
    const sourceContext = sourceContextForProject(project, segments);
    await updateProject(projectId, {
      status: "rendering",
      statusLabel: "Rerendering vertical clips",
      progress: 64,
      transcriptSegments: compactTranscriptSegments(segments, sourceClips),
      sourceContext,
      duration: project.duration,
      dimensions: project.dimensions,
    });

    const renderedByIndex = new Array(sourceClips.length);
    let completedRenders = 0;
    await Promise.all(sourceClips.map(async (clip, index) => {
      const sourceInfo = resolveClipRenderSource(project, clip);
      if (!sourceInfo) throw new Error(`Clip source is missing for ${clip.title || clip.id}.`);
      const probe = await probeVideo(sourceInfo.sourcePath);
      const window = sourceInfo.sourceAlreadyTrimmed
        ? clipWindowFromStoredClip(clip)
        : normalizeClipWindow({
          start: clip.start,
          end: clip.end,
          sourceDuration: sourceDuration || probe.duration,
          clipLength: project.clipLength,
        });
      window.duration = Math.max(0.1, Math.min(window.duration, Math.max(0.1, probe.duration - sourceInfo.start)));
      window.end = window.start + window.duration;
      const clipId = clip.id || crypto.randomUUID();
      const baseName = `${slugify(clip.title || `clip-${index + 1}`)}-${clipId.slice(0, 8)}`;
      const clipPath = path.join(CLIP_DIR, `${baseName}.mp4`);
      const thumbPath = path.join(THUMB_DIR, `${baseName}.jpg`);
      const srtPath = path.join(CLIP_DIR, `${baseName}.srt`);
      const xmlPath = path.join(CLIP_DIR, `${baseName}.xml`);
      const clipSegments = segmentsForWindow(segments, window.start, window.end);
      const renderSegments = segmentsForClipRender(segments, window, sourceInfo.sourceAlreadyTrimmed);
      await fsp.writeFile(srtPath, createSrt(clipSegments, window.start, window.end, clip.title));
      await fsp.writeFile(xmlPath, createXml(project, clip, window));
      const renderFocusTrack = await renderClip({
        sourcePath: sourceInfo.sourcePath,
        outputPath: clipPath,
        start: sourceInfo.start,
        duration: window.duration,
        title: clip.title,
        hook: clip.hook,
        focus: clip.focus,
        sourceContext,
        score: clip.score,
        segments: renderSegments,
        layout: "speaker",
        hasAudio: probe.hasAudio,
        sourceProbe: probe,
        cachedFocusTrack: clip.renderFocusTrack,
        skipFocusAnalysis: true,
        skipBackgroundMusic: true,
        onProgress: (fraction) => {
          // Each clip covers an equal slice of the 64→94 range
          const sliceSize = 30 / sourceClips.length;
          const base = 64 + index * sliceSize;
          const pct = Math.round(base + fraction * sliceSize);
          updateProject(projectId, {
            progress: pct,
            statusLabel: `Rendering clip ${index + 1}/${sourceClips.length}… ${Math.round(fraction * 100)}%`,
          });
        },
      });
      await generateThumbnail(clipPath, thumbPath);

      let renderedClip = {
        ...clip,
        id: clipId,
        renderFocusTrack: renderFocusTrack || clip.renderFocusTrack,
        start: round(window.start),
        end: round(window.end),
        duration: round(window.duration),
        filePath: clipPath,
        thumbnailPath: thumbPath,
        srtPath,
        xmlPath,
        downloadUrl: toMediaUrl(clipPath),
        thumbnailUrl: toMediaUrl(thumbPath),
        srtUrl: toMediaUrl(srtPath),
        xmlUrl: toMediaUrl(xmlPath),
        renderedAt: Date.now(),
      };
      if (!KEEP_FULL_SOURCE || sourceInfo.sourceAlreadyTrimmed) {
        [renderedClip] = await persistSourceSegmentsForClips({
          projectId,
          sourcePath: sourceInfo.sourcePath,
          clips: [renderedClip],
          sourceAlreadyTrimmed: sourceInfo.sourceAlreadyTrimmed,
        });
      }
      renderedByIndex[index] = renderedClip;

      completedRenders += 1;
      const progress = 64 + Math.round((completedRenders / sourceClips.length) * 30);
      await updateProject(projectId, { clips: renderedByIndex.filter(Boolean), progress });
    }));
    const rendered = renderedByIndex.filter(Boolean);
    const retainedSourcePath = resolveRetainedSourcePath(projectId, project.localSourcePath);
    if (
      !KEEP_FULL_SOURCE
      && hasManagedFile(project.localSourcePath)
      && managedPath(project.localSourcePath) !== managedPath(retainedSourcePath)
    ) {
      await safeRemoveManagedPath(project.localSourcePath);
    }

    await updateProject(projectId, {
      clips: rendered,
      localSourcePath: retainedSourcePath,
      transcriptSegments: compactTranscriptSegments(segments, rendered),
      status: "ready",
      statusLabel: "Ready",
      progress: 100,
      error: "",
    });
    await cleanupClipAssets(sourceClips, { includeSourceSegments: true });
  } catch (error) {
    await updateProject(projectId, {
      status: "failed",
      statusLabel: "Failed",
      progress: 100,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function rerenderSingleClip(projectId, clipId) {
  const project = projects[projectId];
  if (!project) return;
  const clipIndex = project.clips?.findIndex((clip) => clip.id === clipId) ?? -1;
  if (clipIndex < 0) return;

  try {
    const sourceClip = project.clips[clipIndex];
    const sourceInfo = resolveClipRenderSource(project, sourceClip);
    if (!sourceInfo) throw new Error(`Clip source is missing for ${sourceClip.title || sourceClip.id}.`);
    const probe = await probeVideo(sourceInfo.sourcePath);
    const sourceDuration = Number(project.duration || Math.max(0, ...project.clips.map((clip) => Number(clip.end || 0))));
    const segments = project.transcriptSegments?.length
      ? project.transcriptSegments
      : project.sourceUrl
        ? await fetchSourceCaptions(project.sourceUrl, projectId, sourceDuration || probe.duration)
        : [];
    const sourceContext = sourceContextForProject(project, segments);
    await updateProject(projectId, {
      status: "rendering",
      statusLabel: "Rerendering selected clip",
      progress: 72,
      transcriptSegments: compactTranscriptSegments(segments, project.clips),
      sourceContext,
      duration: project.duration,
      dimensions: project.dimensions,
    });

    const currentProject = projects[projectId];
    const window = sourceInfo.sourceAlreadyTrimmed
      ? clipWindowFromStoredClip(sourceClip)
      : normalizeClipWindow({
        start: sourceClip.start,
        end: sourceClip.end,
        sourceDuration: sourceDuration || probe.duration,
        clipLength: currentProject.clipLength,
      });
    window.duration = Math.max(0.1, Math.min(window.duration, Math.max(0.1, probe.duration - sourceInfo.start)));
    window.end = window.start + window.duration;
    const clipId = sourceClip.id || crypto.randomUUID();
    const baseName = `${slugify(sourceClip.title || `clip-${clipIndex + 1}`)}-${clipId.slice(0, 8)}`;
    const clipPath = path.join(CLIP_DIR, `${baseName}.mp4`);
    const thumbPath = path.join(THUMB_DIR, `${baseName}.jpg`);
    const srtPath = path.join(CLIP_DIR, `${baseName}.srt`);
    const xmlPath = path.join(CLIP_DIR, `${baseName}.xml`);
    const clipSegments = segmentsForWindow(segments, window.start, window.end);
    const renderSegments = segmentsForClipRender(segments, window, sourceInfo.sourceAlreadyTrimmed);
    await fsp.writeFile(srtPath, createSrt(clipSegments, window.start, window.end, sourceClip.title));
    await fsp.writeFile(xmlPath, createXml(currentProject, sourceClip, window));
    const renderFocusTrack = await renderClip({
      sourcePath: sourceInfo.sourcePath,
      outputPath: clipPath,
      start: sourceInfo.start,
      duration: window.duration,
      title: sourceClip.title,
      hook: sourceClip.hook,
      focus: sourceClip.focus,
      sourceContext,
      score: sourceClip.score,
      segments: renderSegments,
      layout: "speaker",
      hasAudio: probe.hasAudio,
      sourceProbe: probe,
      cachedFocusTrack: sourceClip.renderFocusTrack,
      skipFocusAnalysis: true,
      skipBackgroundMusic: true,
      onProgress: (fraction) => {
        const pct = 72 + Math.round(fraction * 24); // 72 → 96
        updateProject(projectId, { progress: pct, statusLabel: `Rendering… ${Math.round(fraction * 100)}%` });
      },
    });
    await generateThumbnail(clipPath, thumbPath);

    const clips = [...(projects[projectId].clips || [])];
    let renderedClip = {
      ...sourceClip,
      id: clipId,
      renderFocusTrack: renderFocusTrack || sourceClip.renderFocusTrack,
      start: round(window.start),
      end: round(window.end),
      duration: round(window.duration),
      filePath: clipPath,
      thumbnailPath: thumbPath,
      srtPath,
      xmlPath,
      downloadUrl: toMediaUrl(clipPath),
      thumbnailUrl: toMediaUrl(thumbPath),
      srtUrl: toMediaUrl(srtPath),
      xmlUrl: toMediaUrl(xmlPath),
      renderedAt: Date.now(),
    };
    if (!KEEP_FULL_SOURCE || sourceInfo.sourceAlreadyTrimmed) {
      [renderedClip] = await persistSourceSegmentsForClips({
        projectId,
        sourcePath: sourceInfo.sourcePath,
        clips: [renderedClip],
        sourceAlreadyTrimmed: sourceInfo.sourceAlreadyTrimmed,
      });
    }
    clips[clipIndex] = renderedClip;
    const retainedSourcePath = resolveRetainedSourcePath(projectId, project.localSourcePath);
    if (
      !KEEP_FULL_SOURCE
      && hasManagedFile(project.localSourcePath)
      && managedPath(project.localSourcePath) !== managedPath(retainedSourcePath)
    ) {
      await safeRemoveManagedPath(project.localSourcePath);
    }

    await updateProject(projectId, {
      clips,
      localSourcePath: retainedSourcePath,
      transcriptSegments: compactTranscriptSegments(segments, clips),
      status: "ready",
      statusLabel: "Ready",
      progress: 100,
      error: "",
    });
    // Only clean up assets whose paths actually changed — if the title (and thus
    // the filename) hasn't changed, sourceClip and renderedClip share the same path,
    // so deleting "the old file" would erase the freshly rendered clip.
    const staleClip = {
      ...sourceClip,
      filePath: sourceClip.filePath !== clipPath ? sourceClip.filePath : null,
      thumbnailPath: sourceClip.thumbnailPath !== thumbPath ? sourceClip.thumbnailPath : null,
      srtPath: sourceClip.srtPath !== srtPath ? sourceClip.srtPath : null,
      xmlPath: sourceClip.xmlPath !== xmlPath ? sourceClip.xmlPath : null,
    };
    await cleanupClipAssets([staleClip], { includeSourceSegments: true });
  } catch (error) {
    await updateProject(projectId, {
      status: "failed",
      statusLabel: "Failed",
      progress: 100,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function ensureDirs() {
  for (const dir of [DATA_DIR, UPLOAD_DIR, CLIP_DIR, SOURCE_DIR, THUMB_DIR, AUDIO_DIR, CAPTION_DIR, OVERLAY_DIR]) {
    await fsp.mkdir(dir, { recursive: true });
  }
}

function loadEnvFiles() {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
      }
    }
  }
}

async function loadProjects() {
  try {
    const data = JSON.parse(await fsp.readFile(META_PATH, "utf8"));
    return data.projects || {};
  } catch {
    return {};
  }
}

async function saveProjects() {
  await fsp.writeFile(META_PATH, JSON.stringify({ projects }, null, 2));
}

async function recoverStaleRenderingProjects() {
  const busy = new Set(["queued", "fetching", "transcribing", "analyzing", "rendering", "scheduling"]);
  let changed = false;
  for (const [id, project] of Object.entries(projects)) {
    const bufferOnlyFailure = String(project?.status || "") === "failed"
      && (project?.clips || []).length
      && /\bBuffer scheduling failed\b|Buffer request failed/i.test(String(project?.error || ""));
    if (!busy.has(String(project?.status || "")) && !bufferOnlyFailure) continue;
    projects[id] = {
      ...project,
      status: "ready",
      statusLabel: "Ready",
      progress: 100,
      error: "",
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (changed) await saveProjects();
}

async function updateProject(id, patch) {
  const current = projects[id];
  if (!current) return;
  projects[id] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveProjects();
}

function publicProject(project) {
  return {
    ...project,
    clips: (project.clips || []).map(publicClip),
    localSourcePath: undefined,
    sourceDescription: undefined,
    transcriptSegments: (project.transcriptSegments || []).slice(0, 20),
  };
}

function publicClip(clip) {
  return {
    ...clip,
    filePath: undefined,
    thumbnailPath: undefined,
    srtPath: undefined,
    xmlPath: undefined,
    sourceSegmentPath: undefined,
  };
}

function bufferApiKey() {
  return String(process.env.BUFFER_API_KEY || process.env.BUFFER_ACCESS_TOKEN || "").trim();
}

function requireGroqApiKeys() {
  if (!hasGroqApiKey()) {
    throw new Error("Groq API keys are required. Set GROQ_API_KEY or GROQ_API_KEYS in .env.");
  }
}

function requireBufferApiKey() {
  if (!bufferApiKey()) {
    throw new Error("Buffer API key is required. Set BUFFER_API_KEY in .env.");
  }
}

function assertPipelineConfigured() {
  requireGroqApiKeys();
  requireBufferApiKey();
}

function parseBufferChannelIds() {
  return String(process.env.BUFFER_CHANNEL_IDS || "")
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseBufferChannelPatterns(raw) {
  return String(raw || "")
    .split(/[\s,]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeChannelSearchText(channel) {
  return [channel?.name, channel?.displayName, channel?.organizationName]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}

function channelMatchesAnyPattern(channel, patterns) {
  if (!patterns.length) return false;
  const haystack = normalizeChannelSearchText(channel);
  const compactHaystack = haystack.replace(/[^a-z0-9]+/g, "");
  return patterns.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (haystack.includes(normalized)) return true;
    const compactPattern = normalized.replace(/[^a-z0-9]+/g, "");
    return compactPattern.length > 0 && compactHaystack.includes(compactPattern);
  });
}

function filterBufferChannels(channels) {
  const include = parseBufferChannelPatterns(process.env.BUFFER_CHANNEL_INCLUDE);
  const exclude = parseBufferChannelPatterns(process.env.BUFFER_CHANNEL_EXCLUDE);
  return channels.filter((channel) => {
    if (!channel?.id) return false;
    if (exclude.length && channelMatchesAnyPattern(channel, exclude)) return false;
    if (include.length && !channelMatchesAnyPattern(channel, include)) return false;
    return true;
  });
}

async function listAllBufferChannels() {
  const organizations = await getBufferOrganizations();
  const rows = [];
  for (const organization of organizations) {
    const channels = await getBufferChannels(organization.id);
    channels.forEach((channel) => {
      rows.push(normalizeBufferChannel(channel, organization));
    });
  }
  return rows;
}

async function resolveBufferChannelIds() {
  const configured = parseBufferChannelIds();
  if (configured.length) return configured;

  const allowed = filterBufferChannels(await listAllBufferChannels());
  const channelIds = allowed.map((channel) => String(channel.id));

  if (!channelIds.length) {
    const include = parseBufferChannelPatterns(process.env.BUFFER_CHANNEL_INCLUDE);
    const exclude = parseBufferChannelPatterns(process.env.BUFFER_CHANNEL_EXCLUDE);
    let hint = "";
    if (include.length) {
      hint = ` No channels matched BUFFER_CHANNEL_INCLUDE (${include.join(", ")}). Connect Pod by Edit in Buffer or set BUFFER_CHANNEL_IDS.`;
    } else if (exclude.length) {
      hint = ` All available channels were excluded by BUFFER_CHANNEL_EXCLUDE (${exclude.join(", ")}).`;
    }
    throw new Error(`No Buffer channels found for OpenClips.${hint}`);
  }
  return [...new Set(channelIds)];
}

async function assertAllowedBufferChannelIds(channelIds) {
  const configured = parseBufferChannelIds();
  if (configured.length) return;

  const all = await listAllBufferChannels();
  const allowedSet = new Set(filterBufferChannels(all).map((channel) => String(channel.id)));
  const blocked = channelIds.filter((id) => !allowedSet.has(id));
  if (!blocked.length) return;

  const blockedNames = blocked.map((id) => {
    const channel = all.find((item) => item.id === id);
    return channel ? `${channel.displayName || channel.name} (${channel.service})` : id;
  });
  throw new Error(
    `Blocked Buffer channel(s): ${blockedNames.join(", ")}. OpenClips only posts to Pod by Edit — not clipvltdaily.`,
  );
}

async function scheduleProjectClipsToBuffer(projectId) {
  requireBufferApiKey();
  const project = projects[projectId];
  if (!project?.clips?.length) {
    throw new Error("No rendered clips are available for Buffer scheduling.");
  }

  const channelIds = await resolveBufferChannelIds();
  const clips = [...project.clips];

  // Generate all captions in parallel across Groq key slots
  const captionTexts = await Promise.all(
    clips.map((clip, clipIndex) => resolveBufferPostText(project, clip, null, clipIndex))
  );

  for (let clipIndex = 0; clipIndex < clips.length; clipIndex += 1) {
    const clip = clips[clipIndex];
    const text = captionTexts[clipIndex];
    let media;
    try {
      media = await resolveBufferMediaUrl(null, project, clip);
    } catch (error) {
      throw new Error(`Buffer media upload failed for "${clip.title || clip.id}": ${error instanceof Error ? error.message : String(error)}`);
    }

    const scheduled = [];
    for (const channelId of channelIds) {
      try {
        const post = await createBufferVideoPost({
          channelId,
          text,
          mode: "addToQueue",
          dueAt: "",
          mediaUrl: media.url,
          thumbnailUrl: "",
          clip,
        });
        scheduled.push({
          channelId,
          postId: post.id,
          text: post.text || text,
        });
      } catch (error) {
        throw new Error(`Buffer scheduling failed for "${clip.title || clip.id}" on channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const now = new Date().toISOString();
    clips[clipIndex] = {
      ...clip,
      ...(media.clipPatch || {}),
      bufferSchedules: [
        ...(clip.bufferSchedules || []),
        ...scheduled.map((item) => ({
          ...item,
          status: "scheduled",
          mode: "addToQueue",
          dueAt: "",
          mediaUrl: media.url,
          mediaStorage: media.storage,
          createdAt: now,
        })),
      ].slice(-50),
      lastBufferScheduleAt: now,
    };

    if (media.cleanupLocalPath) {
      await safeRemoveManagedPath(media.cleanupLocalPath);
    }
  }

  await updateProject(projectId, { clips });
}

function discordWebhookUrl() {
  return String(process.env.DISCORD_WEBHOOK_URL || process.env.OPENCLIPS_DISCORD_WEBHOOK_URL || "").trim();
}

function githubStorageToken() {
  return String(process.env.GITHUB_STORAGE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
}

async function resolveGitHubStorageToken() {
  const envToken = githubStorageToken();
  if (envToken) return envToken;
  try {
    const { stdout } = await runCommand("gh", ["auth", "token"], { timeoutMs: 5000 });
    return String(stdout || "").trim();
  } catch {
    return "";
  }
}

async function hasGitHubStorageAuth() {
  if (githubStorageToken()) return true;
  try {
    const { stdout } = await runCommand("gh", ["auth", "status"], { timeoutMs: 5000 });
    return /Logged in to github\.com/i.test(stdout);
  } catch {
    return false;
  }
}

async function bufferGraphql(query, { retries = 8 } = {}) {
  const token = bufferApiKey();
  if (!token) {
    const error = new Error("Buffer API key is not configured.");
    error.status = 400;
    throw error;
  }

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(BUFFER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });
    const body = await response.text();
    let payload = {};
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      throw new Error("Buffer returned a non-JSON response.");
    }

    if (response.status === 429 && attempt < retries) {
      await sleep(5000 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      lastError = new Error(payload?.message || payload?.error || `Buffer request failed with ${response.status}.`);
      if (response.status === 429 && attempt < retries) continue;
      throw lastError;
    }
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((item) => item.message).filter(Boolean).join(" ") || "Buffer GraphQL error.");
    }
    return payload.data || {};
  }
  throw lastError || new Error("Buffer request failed.");
}

async function getBufferOrganizations() {
  const data = await bufferGraphql(`
    query GetOrganizations {
      account {
        organizations {
          id
          name
        }
      }
    }
  `);
  return Array.isArray(data?.account?.organizations) ? data.account.organizations : [];
}

async function getBufferChannels(organizationId) {
  const data = await bufferGraphql(`
    query GetChannels {
      channels(input: {
        organizationId: ${graphQlString(organizationId)}
      }) {
        id
        name
        displayName
        service
        avatar
        isQueuePaused
      }
    }
  `);
  return Array.isArray(data?.channels) ? data.channels : [];
}

function normalizeBufferChannel(channel, organization) {
  return {
    id: String(channel?.id || ""),
    name: String(channel?.name || channel?.displayName || "Untitled channel"),
    displayName: String(channel?.displayName || channel?.name || "Untitled channel"),
    service: String(channel?.service || "unknown"),
    avatar: channel?.avatar || "",
    isQueuePaused: Boolean(channel?.isQueuePaused),
    organizationId: String(organization?.id || ""),
    organizationName: String(organization?.name || "Buffer"),
  };
}

async function scheduleClipToBuffer(req, res, { sports }) {
  const project = projects[req.params.id];
  if (!project || (sports ? project.genre !== "Sports" : project.genre === "Sports")) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const clipIndex = (project.clips || []).findIndex((item) => item.id === req.params.clipId);
  if (clipIndex < 0) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }

  const channelIds = Array.isArray(req.body?.channelIds)
    ? [...new Set(req.body.channelIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
  if (!channelIds.length) {
    res.status(400).json({ error: "Select at least one Buffer channel." });
    return;
  }

  try {
    await assertAllowedBufferChannelIds(channelIds);
  } catch (error) {
    res.status(400).json({ error: error.message || "Buffer channel is not allowed." });
    return;
  }

  const clip = project.clips[clipIndex];
  const text = await resolveBufferPostText(project, clip, req);
  if (!text) {
    res.status(400).json({ error: "Add post text before scheduling." });
    return;
  }

  const mode = req.body?.mode === "queue" || req.body?.mode === "addToQueue" ? "addToQueue" : "customScheduled";
  const dueAt = mode === "customScheduled" ? normalizeBufferDueAt(req.body?.dueAt) : "";
  if (mode === "customScheduled" && !dueAt) {
    res.status(400).json({ error: "Choose a valid schedule time." });
    return;
  }

  let media;
  try {
    media = await resolveBufferMediaUrl(req, project, clip);
  } catch (error) {
    res.status(error.status || 400).json({
      error: error.message || "Buffer needs a public video URL.",
    });
    return;
  }

  const thumbnailUrl = publicMediaUrl(req, clip.thumbnailUrl);
  const scheduled = [];
  const failed = [];

  for (const channelId of channelIds) {
    try {
      const post = await createBufferVideoPost({
        channelId,
        text,
        mode,
        dueAt,
        mediaUrl: media.url,
        thumbnailUrl,
        clip,
      });
      scheduled.push({
        channelId,
        postId: post.id,
        text: post.text || text,
      });
    } catch (error) {
      failed.push({
        channelId,
        error: error.message || "Could not schedule this channel.",
      });
    }
  }

  const now = new Date().toISOString();
  const scheduleEvents = [
    ...(clip.bufferSchedules || []),
    ...scheduled.map((item) => ({
      ...item,
      status: "scheduled",
      mode,
      dueAt,
      mediaUrl: media.url,
      mediaStorage: media.storage,
      createdAt: now,
    })),
    ...failed.map((item) => ({
      ...item,
      status: "failed",
      mode,
      dueAt,
      createdAt: now,
    })),
  ].slice(-50);

  const clips = [...project.clips];
  const localVideoToRemove = media.cleanupLocalPath || "";
  clips[clipIndex] = {
    ...clip,
    ...(media.clipPatch || {}),
    bufferSchedules: scheduleEvents,
    lastBufferScheduleAt: scheduled.length ? now : clip.lastBufferScheduleAt,
  };
  await updateProject(project.id, { clips });
  if (localVideoToRemove) {
    await safeRemoveManagedPath(localVideoToRemove);
  }

  if (!scheduled.length) {
    res.status(502).json({ ok: false, scheduled, failed, error: "Buffer did not schedule any selected channels." });
    return;
  }

  res.status(failed.length ? 207 : 201).json({
    ok: failed.length === 0,
    scheduled,
    failed,
    clip: publicClip(clips[clipIndex]),
  });
}

async function refreshClipBufferCaptions(req, res, { sports }) {
  requireBufferApiKey();
  const project = projects[req.params.id];
  if (!project || (sports ? project.genre !== "Sports" : project.genre === "Sports")) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const clipIndex = (project.clips || []).findIndex((item) => item.id === req.params.clipId);
  if (clipIndex < 0) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }

  const clip = project.clips[clipIndex];
  const text = await resolveBufferPostText(project, clip, req);
  const allowedChannelIds = new Set(await resolveBufferChannelIds());
  const scheduledPosts = (clip.bufferSchedules || []).filter(
    (item) => item.status === "scheduled" && item.postId && allowedChannelIds.has(String(item.channelId)),
  );

  if (!scheduledPosts.length) {
    res.status(404).json({ error: "No scheduled PodByte Buffer posts found for this clip." });
    return;
  }

  const updated = [];
  const failed = [];
  for (const item of scheduledPosts) {
    try {
      const post = await editBufferPostText({
        postId: item.postId,
        text,
        clip,
        mode: item.mode || "addToQueue",
        mediaUrl: item.mediaUrl || clip.githubMediaUrl || clip.cloudMediaUrl,
        thumbnailUrl: clip.thumbnailUrl,
      });
      updated.push({ postId: item.postId, channelId: item.channelId, text: post.text || text });
      await sleep(12000);
    } catch (error) {
      failed.push({
        postId: item.postId,
        channelId: item.channelId,
        error: error.message || "Could not update this Buffer post.",
      });
    }
  }

  const now = new Date().toISOString();
  const clips = [...project.clips];
  clips[clipIndex] = {
    ...clip,
    bufferCaption: text,
    bufferSchedules: (clip.bufferSchedules || []).map((item) => {
      if (!updated.some((row) => row.postId === item.postId)) return item;
      return { ...item, text, updatedAt: now };
    }),
    lastBufferCaptionRefreshAt: now,
  };
  await updateProject(project.id, { clips });

  if (!updated.length) {
    res.status(502).json({ ok: false, updated, failed, text, error: "Buffer did not update any posts." });
    return;
  }

  res.status(failed.length ? 207 : 200).json({
    ok: failed.length === 0,
    text,
    updated,
    failed,
    clip: publicClip(clips[clipIndex]),
  });
}

async function getBufferPost(postId) {
  const data = await bufferGraphql(`
    query GetPost {
      post(input: { id: ${graphQlString(postId)} }) {
        id
        text
        shareMode
        schedulingType
        channelId
        channel {
          service
        }
      }
    }
  `);
  return data?.post || null;
}

function buildBufferVideoAssetsGraphql(mediaUrl, thumbnailUrl) {
  if (!isHttpUrl(mediaUrl)) return "";
  const thumbnailField = isHttpUrl(thumbnailUrl) ? `thumbnailUrl: ${graphQlString(thumbnailUrl)}` : "";
  return `assets: [{ video: { url: ${graphQlString(mediaUrl)} ${thumbnailField} } }]`;
}

async function editBufferPostText({ postId, text, clip, mode, schedulingType, mediaUrl, thumbnailUrl }) {
  const existing = await getBufferPost(postId);
  if (!existing?.id) {
    throw new Error("Buffer post not found.");
  }
  const service = String(existing.channel?.service || await getBufferChannelService(existing.channelId) || "").toLowerCase();
  const metadataField = buildBufferPostMetadataGraphql(service, clip || { title: text.slice(0, 80), hook: text.split("\n")[0] });
  const resolvedMediaUrl = mediaUrl || clip?.githubMediaUrl || clip?.cloudMediaUrl || "";
  const resolvedThumbnail = isHttpUrl(thumbnailUrl) ? thumbnailUrl : "";
  const assetsField = buildBufferVideoAssetsGraphql(resolvedMediaUrl, resolvedThumbnail);
  const resolvedMode = mode || existing.shareMode || "addToQueue";
  const resolvedScheduling = schedulingType || existing.schedulingType || "automatic";
  const query = `
    mutation EditPost {
      editPost(
        input: {
          id: ${graphQlString(postId)}
          text: ${graphQlString(text)}
          schedulingType: ${resolvedScheduling}
          mode: ${resolvedMode}
          ${metadataField}
          ${assetsField}
        }
      ) {
        ... on PostActionSuccess {
          post {
            id
            text
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  const data = await bufferGraphql(query);
  const result = data?.editPost;
  if (result?.message) {
    throw new Error(result.message);
  }
  if (!result?.post?.id) {
    throw new Error("Buffer did not return an updated post.");
  }
  return result.post;
}

let bufferChannelsByIdPromise = null;

async function getBufferChannelMap() {
  if (!bufferChannelsByIdPromise) {
    bufferChannelsByIdPromise = listAllBufferChannels()
      .then((channels) => {
        const map = new Map();
        channels.forEach((channel) => map.set(String(channel.id), channel));
        return map;
      })
      .catch((error) => {
        bufferChannelsByIdPromise = null;
        throw error;
      });
  }
  return bufferChannelsByIdPromise;
}

async function getBufferChannelService(channelId) {
  const map = await getBufferChannelMap();
  return String(map.get(String(channelId))?.service || "").toLowerCase();
}

function bufferVideoTitle(clip) {
  return cleanBufferPostText(clip?.title || clip?.hook || "Podcast clip").slice(0, 100);
}

function buildBufferPostMetadataGraphql(service, clip) {
  const title = bufferVideoTitle(clip);
  switch (String(service || "").toLowerCase()) {
    case "instagram":
      return "metadata: { instagram: { type: reel, shouldShareToFeed: true } }";
    case "youtube":
      return `metadata: { youtube: { title: ${graphQlString(title)}, categoryId: ${graphQlString(process.env.BUFFER_YOUTUBE_CATEGORY_ID || "22")} } }`;
    case "tiktok":
      return `metadata: { tiktok: { title: ${graphQlString(title)} } }`;
    default:
      return "";
  }
}

async function createBufferVideoPost({ channelId, text, mode, dueAt, mediaUrl, thumbnailUrl, clip }) {
  const service = await getBufferChannelService(channelId);
  const metadataField = buildBufferPostMetadataGraphql(service, clip);
  const dueAtField = mode === "customScheduled" ? `dueAt: ${graphQlString(dueAt)}` : "";
  const thumbnailField = isHttpUrl(thumbnailUrl) ? `thumbnailUrl: ${graphQlString(thumbnailUrl)}` : "";
  const query = `
    mutation CreatePost {
      createPost(
        input: {
          text: ${graphQlString(text)}
          channelId: ${graphQlString(channelId)}
          schedulingType: automatic
          mode: ${mode}
          ${dueAtField}
          ${metadataField}
          assets: [
            {
              video: {
                url: ${graphQlString(mediaUrl)}
                ${thumbnailField}
              }
            }
          ]
        }
      ) {
        ... on PostActionSuccess {
          post {
            id
            text
            assets {
              id
              mimeType
              source
            }
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  const data = await bufferGraphql(query);
  const result = data?.createPost;
  if (result?.message) {
    throw new Error(result.message);
  }
  if (!result?.post?.id) {
    throw new Error("Buffer did not return a scheduled post.");
  }
  return result.post;
}

function defaultBufferPostText(project, clip) {
  return composeBufferCaption(project, clip);
}

function isGenericCaptionMeta(text) {
  return /\b(why this will stop someone scrolling|selected as a strong standalone|standalone moment|local fallback|this scene carries|the hook lands|viral moment|podcast moment|short form clip)\b/i.test(String(text || ""));
}

function captionTokenSet(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function captionOverlapRatio(a, b) {
  const left = captionTokenSet(a);
  const right = captionTokenSet(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const word of left) {
    if (right.has(word)) overlap += 1;
  }
  return overlap / Math.min(left.size, right.size);
}

function formatBufferHook(clip, project) {
  const context = cleanPodcastContext(project.sourceContext || fallbackPodcastContext(project, []));
  const hook = polishPodcastHook(clip.hook, {
    title: clip.title,
    focus: clip.focus,
    context,
    text: "",
  });
  return cleanHookText(hook)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toUpperCase())
    .join(" ")
    .slice(0, 72);
}

function pickCaptionBody(clip, project) {
  const hookLike = cleanHookText(clip.hook || clip.title || "");
  const candidates = [clip.focus, clip.reasoning, clip.title]
    .map((value) => String(value || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    if (isGenericCaptionMeta(candidate)) continue;
    if (captionOverlapRatio(hookLike, candidate) >= 0.4) continue;
    if (candidate.length >= 55) return candidate.slice(0, 480);
  }
  return cleanClipFocus(clip.focus || clip.title, {
    title: clip.title,
    context: project.sourceContext || fallbackPodcastContext(project, []),
    text: clipTranscriptExcerpt(clip) || clip.focus || clip.reasoning || "",
  }).slice(0, 480);
}

function clipTranscriptExcerpt(clip, maxChars = 900) {
  const srtPath = clip?.srtPath && fs.existsSync(clip.srtPath) ? clip.srtPath : "";
  if (!srtPath) return "";
  try {
    const raw = fs.readFileSync(srtPath, "utf8");
    const text = raw
      .split(/\n\n+/)
      .flatMap((block) => block.split("\n").slice(2))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, maxChars);
  } catch {
    return "";
  }
}

function dedupeCaptionBodyFromHook(hook, body) {
  if (!hook || !body) return body;
  if (captionOverlapRatio(hook, body) < 0.45) return body;
  const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1 && captionOverlapRatio(hook, sentences[0]) >= 0.35) {
    return sentences.slice(1).join(" ").trim();
  }
  return body;
}

function bufferCaptionTags(project, clip) {
  if (project.genre === "Sports") {
    return (clip.tags || [])
      .map((tag) => `#${String(tag || "").replace(/[^a-z0-9]+/gi, "")}`)
      .filter(Boolean)
      .slice(0, 4)
      .join(" ");
  }
  const tags = ["#PodByteEdits", "#FinanceTok", "#TechTok"];
  const lower = `${clip.title} ${clip.hook} ${clip.focus}`.toLowerCase();
  if (/tesla|valuation|stock|invest|monopoly|anthropic|cloud/.test(lower)) tags.push("#Investing");
  if (/ai|deepseek|engineer|anthropic|openai|agi/.test(lower)) tags.push("#AI");
  if (/inflation|labor|economy|fed|prices/.test(lower)) tags.push("#Economy");
  if (/startup|founder|scale|moat/.test(lower)) tags.push("#Startups");
  return [...new Set(tags)].slice(0, 5).join(" ");
}

function composeBufferCaption(project, clip) {
  const hook = formatBufferHook(clip, project);
  let body = pickCaptionBody(clip, project);
  body = dedupeCaptionBodyFromHook(hook, body);
  if (captionOverlapRatio(hook, body) >= 0.45) {
    body = cleanClipFocus("", {
      title: clip.title,
      context: project.sourceContext || fallbackPodcastContext(project, []),
      text: clip.reasoning || clip.title || "",
    });
  }
  const cta = "Follow PodByte Edits for daily finance & tech breakdowns.";
  return cleanBufferPostText([hook, body, cta, bufferCaptionTags(project, clip)].filter(Boolean).join("\n\n"));
}

function buildCaptionPrompt(project, clip) {
  const transcript = clipTranscriptExcerpt(clip, 1200);
  return `You write captions for PodByte Edits — a finance/tech clip channel that turns podcast moments into viral TikTok and Reels content. Your captions drive follows. They make people stop, watch again, and tag someone.

Episode: ${project.title}
Context:
${podcastContextForPrompt(project)}
Clip title: ${clip.title}
Current hook: ${clip.hook || clip.title}
Clip summary: ${clip.focus || clip.title}
Transcript (ground truth — only use facts from here):
${transcript || "(no transcript available)"}

YOUR GOAL: stop the scroll in 0.5 seconds. Make them feel like they just got leaked information nobody else has. Make them follow because missing the next clip feels like a real risk.

HOOK — the single most important line. Gets 0.5 seconds of attention:
- 4-8 words, ALL CAPS, zero filler
- Name the REAL person or company — "SAM ALTMAN", "ELON", "NVIDIA", "THE FED" — never "a CEO" or "an expert"
- Frame it as a confession, leak, or betrayal: "JUST ADMITTED", "THEY LIED", "FINALLY EXPOSED", "IS SECRETLY DOING THIS", "WILL DESTROY YOUR SAVINGS", "NOBODY WARNED YOU"
- The hook must create a KNOWLEDGE GAP — the viewer doesn't know what comes after it and NEEDS to
- FIRE: "SAM ALTMAN JUST ADMITTED THIS", "ELON LIED ABOUT THESE NUMBERS", "THE FED IS LYING TO YOU", "NVIDIA IS SECRETLY DOING THIS", "THEY DESTROYED YOUR 401K ON PURPOSE", "WARREN BUFFETT JUST QUIETLY SOLD", "APPLE KNOWS IT'S LOSING"
- DEAD: "Big News", "Market Update", "AI Thoughts", "Interesting Take", "Important Info"

BODY — 3-4 sentences, 260-520 characters. This is what earns the follow:
- Sentence 1: NAME dropped immediately + the specific shocking claim or number. Sound like a journalist with a source, not a podcast recap.
- Sentence 2: The mechanism — the concrete proof, the internal logic, the number that makes it undeniable. This is what makes people screenshot.
- Sentence 3: Personal stakes — what does this mean for their money, career, or future RIGHT NOW. Not abstract. "If you own [X], this matters." "This is why you're not getting ahead."
- Sentence 4 (optional): Open loop — hint that there's more: "And that's just the beginning.", "The part nobody's talking about is coming next.", "Follow for what happens in 30 days."
- Write like you're texting a friend who needs to know this RIGHT NOW. Not a press release. Not a summary.
- Zero repeated words or phrases from the hook.

CTA: exactly "Follow PodByte Edits for daily finance & tech breakdowns."

Ground truth: only use names, numbers, companies explicitly in the transcript. Never fabricate.

Return ONLY JSON:
{"hook":"...","body":"...","cta":"..."}`;
}

function parseCaptionJson(raw) {
  const parsed = JSON.parse(cleanJson(raw || "{}"));
  const hook = cleanHookText(parsed.hook || "")
    .split(/\s+/).filter(Boolean).map((w) => w.toUpperCase()).join(" ").slice(0, 72);
  let body = String(parsed.body || "").replace(/\s+/g, " ").trim().slice(0, 600);
  body = dedupeCaptionBodyFromHook(hook, body);
  const cta = String(parsed.cta || "Follow PodByte Edits for daily finance & tech breakdowns.").trim().slice(0, 120);
  if (!hook || body.length < 40 || captionOverlapRatio(hook, body) >= 0.5) return null;
  return { hook, body, cta };
}

function scoreCaptionHook(hook) {
  const named = /\b(apple|google|meta|openai|nvidia|tesla|amazon|microsoft|sam altman|elon|trump|fed|china|gpt|warren|buffett|jpmorgan|blackrock|anthropic|zuckerberg|powell|yellen|softbank|sequoia|a16z)\b/i.test(hook);
  const hasNumber = /\d/.test(hook);
  const charged = /\b(lied|broke|exposed|admitted|collapse|collapsing|dying|over|hidden|hiding|nobody|they don't|won't tell|secret|crash|banned|fired|arrested|quit|scam|fraud|fake|rigged)\b/i.test(hook);
  const words = hook.trim().split(/\s+/).length;
  return (named ? 4 : 0) + (charged ? 3 : 0) + (hasNumber ? 2 : 0) + (words >= 4 && words <= 7 ? 1 : 0);
}

function pickBestCaption(a, b) {
  if (!a) return b;
  if (!b) return a;
  return scoreCaptionHook(a.hook) >= scoreCaptionHook(b.hook) ? a : b;
}

async function generateBufferCaptionWithGroq(project, clip, keySlot) {
  requireGroqApiKeys();
  const prompt = buildCaptionPrompt(project, clip);

  // Run Groq gpt-oss-120b + Kimi K2.6 (backup key pool) in parallel
  const [groqResult, kimiResult] = await Promise.allSettled([
    withGroqRetry((client) => client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      ...groqChatParams(groqChatModel(), { maxTokens: 600, temperature: 0.35, responseFormat: { type: "json_object" } }),
    }), { label: "Groq buffer caption", attempts: 2, keySlot }),
    hasDeepSeekApiKey()
      ? callNvidiaChat([{ role: "user", content: prompt }], {
          model: process.env.OPENCLIPS_NVIDIA_CHAT_MODEL || "moonshotai/kimi-k2.6",
          maxTokens: 600,
          temperature: 0.35,
          label: "Kimi buffer caption",
          keySlot,
          keyPool: getDeepSeekApiKeys(),
        })
      : Promise.reject(new Error("No backup key")),
  ]);

  const groqCaption = groqResult.status === "fulfilled"
    ? parseCaptionJson(groqResult.value.choices?.[0]?.message?.content)
    : null;
  const kimiCaption = kimiResult.status === "fulfilled"
    ? parseCaptionJson(kimiResult.value.choices?.[0]?.message?.content)
    : null;

  const best = pickBestCaption(groqCaption, kimiCaption);
  if (!best) return composeBufferCaption(project, clip);

  if (groqCaption && kimiCaption) {
    const winner = best === groqCaption ? "Groq" : "Kimi";
    process.stderr.write(`[caption] ${winner} hook won: "${best.hook}"\n`);
  }

  return cleanBufferPostText([best.hook, best.body, best.cta, bufferCaptionTags(project, clip)].join("\n\n"));
}

async function resolveBufferPostText(project, clip, req, keySlot) {
  if (req?.body?.text) return cleanBufferPostText(req.body.text);
  try {
    return await generateBufferCaptionWithGroq(project, clip, keySlot);
  } catch {
    return composeBufferCaption(project, clip);
  }
}

function cleanBufferPostText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2200);
}

function normalizeBufferDueAt(value) {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString();
}

async function resolveBufferMediaUrl(req, project, clip) {
  const explicitUrl = String(req?.body?.mediaUrl || "").trim();
  if (explicitUrl) {
    if (!isHttpUrl(explicitUrl)) {
      const error = new Error("Paste a direct public video URL that starts with http or https.");
      error.status = 400;
      throw error;
    }
    return { url: explicitUrl, storage: "manual" };
  }

  if (isHttpUrl(clip.githubMediaUrl)) {
    return {
      url: clip.githubMediaUrl,
      storage: "github",
      ...cloudOnlyClipPatch(clip, clip.githubMediaUrl, "github"),
    };
  }

  if (isHttpUrl(clip.discordMediaUrl) && clip.discordMediaCompressed !== true) {
    return {
      url: clip.discordMediaUrl,
      storage: "discord",
      ...cloudOnlyClipPatch(clip, clip.discordMediaUrl, "discord"),
    };
  }

  const clipPath = managedPath(clip.filePath);
  const clipSize = clipPath && fs.existsSync(clipPath) ? (await fsp.stat(clipPath)).size : 0;
  if (discordWebhookUrl() && clipSize > 0 && clipSize <= DISCORD_MAX_UPLOAD_BYTES) {
    return uploadClipToDiscord(project, clip);
  }

  if (clipSize > DISCORD_MAX_UPLOAD_BYTES || !discordWebhookUrl()) {
    return uploadClipToGitHub(project, clip, clipPath, clipSize);
  }

  const localPublicUrl = publicMediaUrl(req, clip.downloadUrl);
  if (isHttpUrl(localPublicUrl)) {
    return { url: localPublicUrl, storage: "public-base" };
  }

  const error = new Error(
    "Buffer needs a public video URL. Configure DISCORD_WEBHOOK_URL for clips up to 25 MB, configure GitHub storage for larger clips, set OPENCLIPS_PUBLIC_BASE_URL, or paste a direct public media URL.",
  );
  error.status = 400;
  throw error;
}

async function uploadClipToDiscord(project, clip) {
  const webhookUrl = discordWebhookUrl();
  if (!isHttpUrl(webhookUrl)) {
    const error = new Error("Discord webhook storage is not configured.");
    error.status = 400;
    throw error;
  }

  const clipPath = managedPath(clip.filePath);
  if (!clipPath || !fs.existsSync(clipPath)) {
    const error = new Error("The rendered clip file is not available for Discord upload.");
    error.status = 400;
    throw error;
  }

  const stats = await fsp.stat(clipPath);
  if (stats.size > DISCORD_MAX_UPLOAD_BYTES) {
    const error = new Error(
      `This clip is ${formatBytes(stats.size)}, so it will use GitHub storage instead of Discord.`,
    );
    error.status = 413;
    throw error;
  }

  const filename = storageSafeFilename(path.basename(clipPath) || `${slugify(clip.title || project.title)}.mp4`);
  const form = new FormData();
  form.append("payload_json", JSON.stringify({
    content: `OpenClips media: ${clip.title || project.title || "clip"}`.slice(0, 1900),
    allowed_mentions: { parse: [] },
    attachments: [{ id: 0, filename }],
  }));
  const bytes = await fsp.readFile(clipPath);
  form.append("files[0]", new Blob([bytes], { type: "video/mp4" }), filename);

  const url = new URL(webhookUrl);
  url.searchParams.set("wait", "true");
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });
  const body = await response.text();
  let payload = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload?.message || `Discord upload failed with ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const attachmentUrl = payload?.attachments?.[0]?.url || payload?.attachments?.[0]?.proxy_url || "";
  if (!isHttpUrl(attachmentUrl)) {
    const error = new Error("Discord did not return a public attachment URL.");
    error.status = 502;
    throw error;
  }

  return {
    url: attachmentUrl,
    storage: "discord",
    clipPatch: {
      discordMediaUrl: attachmentUrl,
      discordMediaSize: stats.size,
      discordMediaMessageId: payload?.id || "",
      discordMediaUploadedAt: new Date().toISOString(),
      discordMediaCompressed: false,
      ...cloudMediaFields(clip, attachmentUrl, "discord"),
    },
    cleanupLocalPath: localVideoCleanupPath(clip),
  };
}

async function uploadClipToGitHub(project, clip, existingClipPath = "", existingSize = 0) {
  const token = await resolveGitHubStorageToken();
  if (!token) {
    const error = new Error("Set GITHUB_STORAGE_TOKEN, GITHUB_TOKEN, or GH_TOKEN, or sign in with the GitHub CLI so OpenClips can upload clips over 25 MB to GitHub storage.");
    error.status = 400;
    throw error;
  }

  const repo = parseGitHubRepo(GITHUB_STORAGE_REPO);
  if (!repo) {
    const error = new Error("Set GITHUB_STORAGE_REPO as owner/repo for GitHub clip storage.");
    error.status = 400;
    throw error;
  }

  const clipPath = existingClipPath || managedPath(clip.filePath);
  if (!clipPath || !fs.existsSync(clipPath)) {
    const error = new Error("The rendered clip file is not available for GitHub upload.");
    error.status = 400;
    throw error;
  }

  const stats = existingSize > 0 ? { size: existingSize } : await fsp.stat(clipPath);
  if (stats.size > GITHUB_STORAGE_MAX_BYTES) {
    const error = new Error(
      `This clip is ${formatBytes(stats.size)}, which is too large for this GitHub storage path. Add Oracle storage details or paste another direct public video URL.`,
    );
    error.status = 413;
    throw error;
  }

  const storagePath = githubStoragePath(project, clip, clipPath);
  const content = await fsp.readFile(clipPath, "base64");
  const stored = await putGitHubStorageFile({
    repo,
    token,
    storagePath,
    content,
    message: `Store OpenClips video ${clip.id || slugify(clip.title)}`,
  });
  const mediaUrl = stored.downloadUrl || githubRawUrl(repo, storagePath, stored.branch || GITHUB_STORAGE_BRANCH || "main");
  return {
    url: mediaUrl,
    storage: "github",
    clipPatch: {
      githubMediaUrl: mediaUrl,
      githubMediaPath: storagePath,
      githubMediaSize: stats.size,
      githubMediaCommitSha: stored.commitSha,
      githubMediaBranch: stored.branch,
      githubMediaUploadedAt: new Date().toISOString(),
      ...cloudMediaFields(clip, mediaUrl, "github"),
    },
    cleanupLocalPath: localVideoCleanupPath(clip),
  };
}

async function putGitHubStorageFile({ repo, token, storagePath, content, message }) {
  const branchAttempts = GITHUB_STORAGE_BRANCH ? [GITHUB_STORAGE_BRANCH, ""] : [""];
  let lastError = null;

  for (const branch of branchAttempts) {
    const payload = {
      message,
      content,
    };
    if (branch) payload.branch = branch;

    const response = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${encodeGithubPath(storagePath)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "OpenClips",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(payload),
      },
    );
    const body = await response.text();
    let data = {};
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      data = {};
    }

    if (response.ok) {
      return {
        branch: branch || GITHUB_STORAGE_BRANCH || "main",
        commitSha: data?.commit?.sha || "",
        downloadUrl: data?.content?.download_url || "",
      };
    }

    lastError = new Error(data?.message || `GitHub storage upload failed with ${response.status}.`);
    lastError.status = response.status;
    if (!shouldRetryGitHubStorageWithoutBranch(lastError.message) || !branch) break;
  }

  throw lastError || new Error("GitHub storage upload failed.");
}

function shouldRetryGitHubStorageWithoutBranch(message) {
  return /branch|empty|not found|reference/i.test(String(message || ""));
}

function cloudOnlyClipPatch(clip, mediaUrl, storage) {
  return {
    clipPatch: cloudMediaFields(clip, mediaUrl, storage),
    cleanupLocalPath: localVideoCleanupPath(clip),
  };
}

function cloudMediaFields(clip, mediaUrl, storage) {
  if (!DELETE_LOCAL_VIDEO_AFTER_CLOUD || !isHttpUrl(mediaUrl)) {
    return {};
  }
  return {
    cloudMediaUrl: mediaUrl,
    cloudMediaStorage: storage,
    downloadUrl: mediaUrl,
    filePath: "",
  };
}

function localVideoCleanupPath(clip) {
  if (!DELETE_LOCAL_VIDEO_AFTER_CLOUD) return "";
  const resolved = managedPath(clip?.filePath);
  return resolved && fs.existsSync(resolved) ? resolved : "";
}

function publicMediaUrl(req, value) {
  const mediaPath = String(value || "").trim();
  if (!mediaPath) return "";
  if (isHttpUrl(mediaPath)) return mediaPath;

  const pathname = mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`;
  if (BUFFER_PUBLIC_BASE_URL) {
    try {
      return new URL(pathname, BUFFER_PUBLIC_BASE_URL.endsWith("/") ? BUFFER_PUBLIC_BASE_URL : `${BUFFER_PUBLIC_BASE_URL}/`).toString();
    } catch {
      return "";
    }
  }

  const host = String(req?.get?.("host") || "");
  if (!host || isLocalHost(host)) return "";
  return `${req?.protocol || "http"}://${host}${pathname}`;
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i.test(host);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function graphQlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function storageSafeFilename(value) {
  const ext = path.extname(value) || ".mp4";
  const base = slugify(path.basename(value, ext));
  return `${base || "openclips-media"}${ext.toLowerCase()}`;
}

function parseGitHubRepo(value) {
  const normalized = String(value || "").trim().replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const [owner, name] = normalized.split("/").map((part) => part.trim()).filter(Boolean);
  if (!owner || !name) return null;
  return {
    owner: encodeURIComponent(owner),
    name: encodeURIComponent(name),
    rawOwner: owner,
    rawName: name,
  };
}

function githubStoragePath(project, clip, clipPath) {
  const date = new Date().toISOString().slice(0, 10);
  const projectPart = slugify(project.title || project.id || "project").slice(0, 48);
  const clipPart = slugify(clip.title || clip.id || "clip").slice(0, 48);
  const suffix = crypto.randomUUID().slice(0, 8);
  const filename = storageSafeFilename(`${clipPart}-${suffix}${path.extname(clipPath) || ".mp4"}`);
  return [
    GITHUB_STORAGE_DIR,
    date,
    projectPart || "project",
    filename,
  ].filter(Boolean).join("/");
}

function encodeGithubPath(value) {
  return String(value || "").split("/").map(encodeURIComponent).join("/");
}

function githubRawUrl(repo, storagePath, branch = GITHUB_STORAGE_BRANCH || "main") {
  return `https://raw.githubusercontent.com/${repo.rawOwner}/${repo.rawName}/${encodeGithubPath(branch)}/${encodeGithubPath(storagePath)}`;
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value || 0));
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromUrl(value) {
  try {
    const parsed = new URL(value);
    // For YouTube URLs, use the video ID as placeholder until yt-dlp fills the real title
    const videoId = parsed.searchParams.get("v");
    if (videoId) return `YouTube video ${videoId}`;
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last).replace(/\.[a-z0-9]+$/i, "") : parsed.hostname;
  } catch {
    return "";
  }
}

function slugify(value) {
  return String(value || "clip")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "clip";
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(Number(value || 0) * factor) / factor;
}

function toMediaUrl(filePath) {
  const rel = path.relative(DATA_DIR, filePath).split(path.sep).map(encodeURIComponent).join("/");
  return `/media/${rel}`;
}

function managedPath(filePath) {
  const raw = String(filePath || "");
  if (!raw) return "";
  const resolved = path.resolve(raw);
  const root = path.resolve(DATA_DIR);
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) return "";
  return resolved;
}

function hasManagedFile(filePath) {
  const resolved = managedPath(filePath);
  return Boolean(resolved && fs.existsSync(resolved));
}

async function safeRemoveManagedPath(filePath) {
  const resolved = managedPath(filePath);
  if (!resolved) return;
  try {
    await fsp.rm(resolved, { force: true });
  } catch {
    // Best-effort cleanup: failed cleanup should not break user-facing routes.
  }
}

async function safeRemoveManagedDir(dirPath) {
  const resolved = managedPath(dirPath);
  if (!resolved) return;
  try {
    await fsp.rm(resolved, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup: failed cleanup should not break startup or renders.
  }
}

async function cleanupClipAssets(clips = [], { includeSourceSegments = false } = {}) {
  const paths = [];
  for (const clip of clips || []) {
    paths.push(clip?.filePath, clip?.thumbnailPath, clip?.srtPath, clip?.xmlPath);
    if (includeSourceSegments) paths.push(clip?.sourceSegmentPath);
  }
  await Promise.all(paths.filter(Boolean).map(safeRemoveManagedPath));
}

async function cleanupCaptionFiles(projectId) {
  let files = [];
  try {
    files = await fsp.readdir(CAPTION_DIR);
  } catch {
    return;
  }
  await Promise.all(
    files
      .filter((file) => file.startsWith(`${projectId}.`))
      .map((file) => safeRemoveManagedPath(path.join(CAPTION_DIR, file))),
  );
}

async function cleanupProjectScratch(projectId) {
  await Promise.all([
    safeRemoveManagedPath(path.join(AUDIO_DIR, `${projectId}.mp3`)),
    cleanupCaptionFiles(projectId),
  ]);
}

async function cleanupProjectAssets(project) {
  if (!project) return;
  await Promise.all([
    cleanupClipAssets(project.clips || [], { includeSourceSegments: true }),
    cleanupProjectScratch(project.id),
    safeRemoveManagedPath(project.localSourcePath),
  ]);
}

async function cleanupTemporaryOverlays() {
  let entries = [];
  try {
    entries = await fsp.readdir(OVERLAY_DIR, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(
    entries.map((entry) => safeRemoveManagedDir(path.join(OVERLAY_DIR, entry.name))),
  );
}

async function cleanupOrphanedAssets(projectsById) {
  const referenced = referencedManagedPaths(projectsById);
  await cleanupTemporaryOverlays();
  await Promise.all([
    cleanupUnreferencedFiles(UPLOAD_DIR, referenced),
    cleanupUnreferencedFiles(CLIP_DIR, referenced),
    cleanupUnreferencedFiles(SOURCE_DIR, referenced),
    cleanupUnreferencedFiles(THUMB_DIR, referenced),
    cleanupUnreferencedFiles(AUDIO_DIR, referenced),
    cleanupUnreferencedFiles(CAPTION_DIR, referenced),
  ]);
}

function referencedManagedPaths(projectsById) {
  const referenced = new Set();
  for (const project of Object.values(projectsById || {})) {
    for (const filePath of [
      project.localSourcePath,
      ...(project.clips || []).flatMap((clip) => [
        clip.filePath,
        clip.thumbnailPath,
        clip.srtPath,
        clip.xmlPath,
        clip.sourceSegmentPath,
      ]),
    ]) {
      const resolved = managedPath(filePath);
      if (resolved) referenced.add(resolved);
    }
  }
  return referenced;
}

async function cleanupUnreferencedFiles(dir, referenced) {
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(entries.map((entry) => {
    const filePath = path.join(dir, entry.name);
    const resolved = managedPath(filePath);
    if (!resolved || referenced.has(resolved)) return Promise.resolve();
    return entry.isDirectory() ? safeRemoveManagedDir(filePath) : safeRemoveManagedPath(filePath);
  }));
}

const BUSY_PROJECT_STATUSES = new Set([
  "queued",
  "fetching",
  "transcribing",
  "analyzing",
  "rendering",
  "scheduling",
]);

function isProjectBusy(project) {
  return BUSY_PROJECT_STATUSES.has(String(project?.status || ""));
}

function canReprocessProject(project) {
  if (String(project?.sourceUrl || "").trim()) return true;
  return hasManagedFile(project?.localSourcePath);
}

function canRerenderClip(project, clip) {
  return hasManagedFile(clip?.sourceSegmentPath) || hasManagedFile(project?.localSourcePath);
}

function canRerenderProject(project) {
  const clips = project?.clips || [];
  return clips.length > 0 && clips.every((clip) => canRerenderClip(project, clip));
}

async function retainMasterSource(projectId, sourcePath) {
  if (!hasManagedFile(sourcePath)) return "";
  const masterPath = path.join(SOURCE_DIR, `${projectId}-master.mp4`);
  const resolvedSource = managedPath(sourcePath);
  const resolvedMaster = managedPath(masterPath);
  if (resolvedSource === resolvedMaster) return masterPath;
  await fsp.copyFile(sourcePath, masterPath);
  return masterPath;
}

function resolveRetainedSourcePath(projectId, currentPath = "") {
  const masterPath = path.join(SOURCE_DIR, `${projectId}-master.mp4`);
  if (hasManagedFile(masterPath)) return masterPath;
  if (KEEP_FULL_SOURCE && hasManagedFile(currentPath)) return managedPath(currentPath);
  return "";
}

async function commandExists(command) {
  try {
    await runCommand("which", [command]);
    return true;
  } catch {
    return false;
  }
}

async function canRunFaceDetection() {
  try {
    await runCommand("python3", ["-c", "import cv2; print(cv2.__version__)"], { timeoutMs: 1000 * 10 });
    return true;
  } catch {
    return false;
  }
}

async function downloadVideo(sourceUrl, projectId) {
  if (!sourceUrl) throw new Error("No source URL provided.");
  const template = path.join(UPLOAD_DIR, `${projectId}-source.%(ext)s`);
  let title = "";
  let channel = "";
  let uploader = "";
  let description = "";
  try {
    const metadata = await runYtdlpWithRetry([
      "--no-playlist",
      "--skip-download",
      "--dump-single-json",
      sourceUrl,
    ], { timeoutMs: 1000 * 60 * 2 });
    const parsed = JSON.parse(metadata.stdout || "{}");
    title = String(parsed.title || "").trim();
    channel = String(parsed.channel || parsed.uploader || "").trim();
    uploader = String(parsed.uploader || "").trim();
    description = String(parsed.description || "").trim();
  } catch {
    title = "";
  }
  await runYtdlpWithRetry([
    "--no-playlist",
    "--force-overwrites",
    "-f",
    "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4][height<=720]/best[height<=720]/best",
    "--merge-output-format",
    "mp4",
    "-o",
    template,
    sourceUrl,
  ], { timeoutMs: 1000 * 60 * 20 });

  const files = await fsp.readdir(UPLOAD_DIR);
  const match = files.find((file) => file.startsWith(`${projectId}-source.`));
  if (!match) throw new Error("yt-dlp finished but no source file was created.");
  return { sourcePath: path.join(UPLOAD_DIR, match), title, channel, uploader, description };
}

async function probeVideo(videoPath) {
  const { stdout } = await runCommand("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    videoPath,
  ]);
  const data = JSON.parse(stdout);
  const video = (data.streams || []).find((stream) => stream.codec_type === "video") || {};
  const audio = (data.streams || []).some((stream) => stream.codec_type === "audio");
  return {
    duration: Math.max(0.1, Number(data.format?.duration || video.duration || 30)),
    width: Number(video.width || 1920),
    height: Number(video.height || 1080),
    hasAudio: audio,
    hasVideo: Boolean(video.codec_type),
  };
}

async function extractAudio(sourcePath, audioPath) {
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    sourcePath,
    "-vn",
    "-acodec",
    "libmp3lame",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-q:a",
    "4",
    audioPath,
  ], { timeoutMs: 1000 * 60 * 12 });
}

async function fetchSourceCaptions(sourceUrl, projectId, duration) {
  const template = path.join(CAPTION_DIR, `${projectId}.%(ext)s`);
  try {
    await withYtdlpSlot(() => runCommand("yt-dlp", [
      "--no-playlist",
      "--skip-download",
      "--write-auto-subs",
      "--write-subs",
      "--sub-langs",
      "en-orig,en",
      "--sub-format",
      "json3",
      "-o",
      template,
      sourceUrl,
    ], { timeoutMs: 1000 * 60 * 3 }));

    const files = await fsp.readdir(CAPTION_DIR);
    const captionFile = files
      .filter((file) => file.startsWith(`${projectId}.`) && file.endsWith(".json3"))
      .sort((a, b) => Number(b.includes(".en-orig.")) - Number(a.includes(".en-orig.")))[0];
    if (!captionFile) return [];
    const data = JSON.parse(await fsp.readFile(path.join(CAPTION_DIR, captionFile), "utf8"));
    return parseJson3Captions(data, duration);
  } catch {
    return [];
  } finally {
    await cleanupCaptionFiles(projectId);
  }
}

function parseJson3Captions(data, duration) {
  const events = Array.isArray(data?.events) ? data.events : [];
  const segments = [];
  let lastText = "";
  for (const event of events) {
    const segs = Array.isArray(event.segs) ? event.segs : [];
    const text = segs
      .map((seg) => String(seg.utf8 || ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || text === lastText) continue;

    const start = Math.max(0, Number(event.tStartMs || 0) / 1000);
    const durationMs = Number(event.dDurationMs || 0);
    const end = Math.min(
      duration || Number.POSITIVE_INFINITY,
      start + Math.max(0.4, durationMs / 1000 || 3.5),
    );
    const wordSource = segs.filter((seg) => String(seg.utf8 || "").trim());
    const words = wordSource.map((seg, index) => {
      const wordStart = start + Math.max(0, Number(seg.tOffsetMs || 0) / 1000);
      const next = wordSource[index + 1];
      const wordEnd = next
        ? start + Math.max(0, Number(next.tOffsetMs || 0) / 1000)
        : end;
      return {
        start: round(wordStart),
        end: round(Math.max(wordStart + 0.12, Math.min(end, wordEnd))),
        word: String(seg.utf8 || "").trim(),
      };
    });
    segments.push({ start: round(start), end: round(end), text, words });
    lastText = text;
  }
  return segments.filter((segment) => segment.end > segment.start && segment.text.length > 1);
}

async function transcribeAudio(audioPath, duration, { keySlot } = {}) {
  requireGroqApiKeys();
  const maxBytes = Math.max(1024 * 1024, Number(process.env.OPENCLIPS_GROQ_TRANSCRIBE_MAX_BYTES || 22 * 1024 * 1024));
  const size = fs.statSync(audioPath).size;
  if (size > maxBytes) {
    return transcribeAudioInChunks(audioPath, duration, { keySlot, maxBytes });
  }

  return transcribeAudioFile(audioPath, duration, { keySlot, label: "Groq transcription" });
}

async function transcribeAudioFile(audioPath, duration, { keySlot, label = "Groq transcription" } = {}) {
  const response = await withGroqRetry((client) => client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: process.env.OPENCLIPS_GROQ_TRANSCRIBE_MODEL || "whisper-large-v3",
    response_format: "verbose_json",
    timestamp_granularities: ["segment", "word"],
  }), { label, attempts: 4, keySlot });

  const segments = normalizeGroqSegments(response, duration);
  if (!hasUsableTranscriptSegments(segments)) {
    throw new Error("Groq transcription returned no usable speech segments.");
  }
  return segments;
}

async function transcribeAudioInChunks(audioPath, duration, { keySlot, maxBytes } = {}) {
  const size = fs.statSync(audioPath).size;
  const secondsPerChunk = Math.max(
    90,
    Math.min(420, Math.floor((duration * (maxBytes * 0.7)) / Math.max(1, size))),
  );
  const segments = [];
  for (let start = 0, index = 0; start < duration; start += secondsPerChunk, index += 1) {
    const chunkDuration = Math.min(secondsPerChunk + 2, Math.max(1, duration - start));
    const chunkPath = audioPath.replace(/\.mp3$/i, `.part-${index}.mp3`);
    try {
      await runCommand("ffmpeg", [
        "-y",
        "-ss",
        String(Math.max(0, start)),
        "-t",
        String(chunkDuration),
        "-i",
        audioPath,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-q:a",
        "4",
        chunkPath,
      ], { timeoutMs: 1000 * 60 * 8 });
      const chunkSegments = await transcribeAudioFile(chunkPath, chunkDuration, {
        keySlot: Number(keySlot || 0) + index,
        label: `Groq transcription chunk ${index + 1}`,
      });
      for (const segment of chunkSegments) {
        segments.push(offsetTranscriptSegment(segment, start));
      }
    } finally {
      await safeRemoveManagedPath(chunkPath);
    }
  }

  if (!hasUsableTranscriptSegments(segments)) {
    throw new Error("Groq chunked transcription returned no usable speech segments.");
  }
  return segments;
}

function offsetTranscriptSegment(segment, offset) {
  return {
    ...segment,
    start: round(Number(segment.start || 0) + offset),
    end: round(Number(segment.end || 0) + offset),
    words: (segment.words || []).map((word) => ({
      ...word,
      start: round(Number(word.start || 0) + offset),
      end: round(Number(word.end || 0) + offset),
    })),
  };
}

function hasUsableTranscriptSegments(segments = []) {
  return Array.isArray(segments) && segments.some((segment) => String(segment.text || "").trim().length > 8);
}

function normalizeGroqSegments(response, duration) {
  const rawSegments = response?.segments || [];
  const rawWords = response?.words || [];
  const words = rawWords.map((word) => ({
    start: Number(word.start || 0),
    end: Number(word.end || word.start || 0),
    word: String(word.word || word.text || "").trim(),
  })).filter((word) => word.word);

  if (rawSegments.length) {
    return rawSegments.map((segment) => {
      const start = Number(segment.start || 0);
      const end = Number(segment.end || start + 4);
      const segmentWords = (segment.words || [])
        .map((word) => ({
          start: Number(word.start || start),
          end: Number(word.end || start),
          word: String(word.word || word.text || "").trim(),
        }))
        .filter((word) => word.word);
      return {
        start,
        end,
        text: String(segment.text || "").trim(),
        words: segmentWords.length ? segmentWords : words.filter((word) => word.end > start && word.start < end),
      };
    }).filter((segment) => segment.end > segment.start);
  }

  if (words.length) {
    return [{
      start: words[0].start,
      end: words.at(-1).end,
      text: words.map((word) => word.word).join(" "),
      words,
    }];
  }

  const text = String(response?.text || "").trim();
  if (text) return [{ start: 0, end: duration, text, words: [] }];
  throw new Error("Groq transcription returned no transcript text.");
}

async function inferPodcastContext({ project, segments, keySlot } = {}) {
  requireGroqApiKeys();
  const hasRealTranscript = segments.some((segment) => String(segment.text || "").trim().length > 8);
  if (!hasRealTranscript) {
    throw new Error("Groq transcript did not return usable speech segments.");
  }

  const transcript = segments
    .slice(0, 90)
    .map((segment) => `${formatClock(segment.start)} ${String(segment.text || "").replace(/\s+/g, " ").trim()}`)
    .join("\n")
    .slice(0, 6500);

  const prompt = `Infer podcast context for OpenClips viral clip editor.

Source title: ${project.title}
Channel/uploader: ${project.sourceChannel || project.sourceUploader || "Unknown"}
Description: ${String(project.sourceDescription || "").slice(0, 900)}

Transcript excerpt:
${transcript}

Return ONLY JSON:
{"channel":"podcast or YouTube channel","guest":"main guest or speaker if clear","topic":"the specific claim or lesson being made (not just the topic area)","contextLine":"who is making what claim, 3-8 words","hookAngle":"the tension, counter-intuitive flip, or shocking claim that makes this shareable — what will stop someone mid-scroll?"}`;

  const _ctxModel = groqChatModel();
  const response = await withGroqRetry((client) => client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    ...groqChatParams(_ctxModel, { maxTokens: 420, temperature: 0.12, responseFormat: { type: "json_object" } }),
  }), { label: "Groq podcast context", attempts: 2, keySlot });

  const parsed = JSON.parse(cleanJson(response.choices?.[0]?.message?.content || "{}"));
  if (!parsed.contextLine && !parsed.topic && !parsed.hookAngle) {
    throw new Error("Groq podcast context inference returned empty data.");
  }

  return cleanPodcastContext({
    channel: parsed.channel || project.sourceChannel || project.sourceUploader || "",
    guest: parsed.guest || "",
    topic: parsed.topic || "",
    contextLine: parsed.contextLine || "",
    hookAngle: parsed.hookAngle || parsed.topic || "",
  });
}

function fallbackPodcastContext(project, segments = []) {
  const title = String(project?.title || "").replace(/\s+/g, " ").trim();
  const titleParts = title.split(/\s+\|\s+|\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  const guest = titleParts.length > 1 ? titleParts.at(-1) : "";
  const topicSource = titleParts.length > 1 ? titleParts[0] : title;
  const topic = cleanPodcastTopic(topicSource) || titleFromText(segments.find((segment) => !segment.fallback)?.text || "");
  const channel = String(project?.sourceChannel || project?.sourceUploader || "").trim();
  return cleanPodcastContext({
    channel,
    guest,
    topic,
    contextLine: [guest, topic].filter(Boolean).join(" on "),
    hookAngle: topic,
  });
}

function sourceContextForProject(project, segments = []) {
  const existing = cleanPodcastContext(project.sourceContext || {});
  const lowQuality = !existing.contextLine || /\b(they re|they're|here s|here's|unknown)\b/i.test(`${existing.topic} ${existing.contextLine}`);
  return lowQuality ? fallbackPodcastContext(project, segments) : existing;
}

function cleanPodcastTopic(value) {
  return String(value || "")
    .replace(/\bthey(?:['’]re| re)?\s+lying\s+to\s+you\s+about\b/gi, "")
    .replace(/\bhere(?:['’]s| s)?\s+how\s+to\s+get\s+rich\b/gi, "")
    .replace(/[._]+/g, " ")
    .replace(/[^a-zA-Z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
}

function cleanPodcastContext(context = {}) {
  const channel = String(context.channel || "").replace(/\s+/g, " ").trim().slice(0, 70);
  const guest = String(context.guest || "").replace(/\s+/g, " ").trim().slice(0, 70);
  let topic = String(context.topic || "").replace(/\s+/g, " ").trim().slice(0, 90);
  let contextLine = String(context.contextLine || [guest, topic].filter(Boolean).join(" on "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  let hookAngle = String(context.hookAngle || topic || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  const combined = `${channel} ${guest} ${topic} ${contextLine} ${hookAngle}`.toLowerCase();
  if (combined.includes("airbnb") && /\b(ai|consumer products|travelers|hosts|guests)\b/i.test(combined)) {
    topic = "AI scale as Airbnb's consumer moat";
    contextLine = "Chesky's AI scale lesson";
    hookAngle = "Airbnb's huge travel network could make AI more useful than a generic chatbot.";
  }

  return { channel, guest, topic, contextLine, hookAngle };
}

function podcastContextForPrompt(project) {
  const context = cleanPodcastContext(project.sourceContext || {});
  return [
    `Channel: ${context.channel || project.sourceChannel || "Unknown"}`,
    `Guest: ${context.guest || "Infer from title/transcript"}`,
    `Topic: ${context.topic || "Infer from transcript"}`,
    `Episode angle: ${context.hookAngle || "Find the strongest standalone moments"}`,
  ].join("\n");
}

async function planClips({ project, segments, duration, keySlot } = {}) {
  requireGroqApiKeys();
  const hasRealTranscript = segments.some((segment) => String(segment.text || "").trim().length > 8);
  if (!hasRealTranscript) {
    throw new Error("Groq transcript did not return usable speech segments.");
  }

  const analysisChunks = transcriptChunksForAnalysis(segments, project.clipLength);
  const transcript = compactTranscriptForPrompt(analysisChunks);
  const prompt = `You are OpenClips — a viral short-form clip editor for PodByte Edits, a finance/tech channel on TikTok, Reels, and YouTube Shorts. Your only job: find moments that stop a scroll, get replayed, and get shared by someone who wants to look smart for sharing it.

Source title: ${project.title}
Podcast context:
${podcastContextForPrompt(project)}
User notes: ${project.prompt || "Find the most viral podcast moments for TikTok, Reels, and YouTube Shorts."}
Preferred length: ${project.clipLength}
Video duration: ${duration.toFixed(1)} seconds

WHAT MAKES A CLIP GO VIRAL ON FINANCE/TECH TIKTOK:
1. SHOCKING CLAIM WITH PROOF — not just "X is overvalued" but the specific mechanism: "Tesla's $1.2T valuation assumes they capture 40% of a robotaxi market that doesn't exist yet"
2. COUNTER-INTUITIVE FLIP — the thing everyone believes is demonstrably wrong, and you can prove it in 30 seconds
3. NAMED VILLAIN OR HERO — clips with a specific company, person, or product beat generic clips 3x. "OpenAI", "Nvidia", "Sam Altman" — not "an AI company"
4. NUMBER THAT REFRAMES — not just a big number, but one that changes how you see something. "$200B written off in one quarter" lands; "$200B revenue" doesn't
5. CONCRETE PREDICTION — "by Q3 this will happen and here's why" — viewers share predictions because they want to be right
6. INSIDER MECHANIC — something that happens behind the scenes that most people don't know. The "how it actually works" clip
7. EMOTIONAL PEAK — genuine frustration, disbelief, or shock in the voice — not performed, actually felt
8. CLEAN PAYOFF — setup + punchline + consequence. Clips that end on an open question tank retention; clips with a verdict get shared

HARD REJECTION CRITERIA — never pick a clip that:
- Ends mid-thought or mid-sentence (no payoff = no shares)
- Is pure definitions or explanation with no stakes or surprise
- Has a hook that could apply to any podcast ("interesting insight", "great point")
- Is a filler moment: intros, housekeeping, "that's a great question"
- Scores below 72 on your internal quality scale — if you can't find 8 clips above 72, pick fewer but maintain quality

RETURN EXACTLY 8 CLIPS. Scan the full transcript including the middle and end sections — that's where the best material hides. Ruthlessly rank by viral potential, not by order in the episode.

FIELD RULES:
- "title": 5-9 words describing the LESSON, not the topic. "Why Investors Get Burned Every Time" beats "Revenue and Growth".
- "hook": 4-8 UPPERCASE words on screen. This is the scroll-stopper — name the REAL person or company, create an instant knowledge gap. Words that stop scrolls: ADMITTED, LIED, EXPOSED, SECRETLY, NOBODY TOLD YOU, THEY HID THIS, IS OVER, WILL DESTROY, GOT CAUGHT, FINALLY BROKE, QUIETLY SOLD.
  FIRE: "SAM ALTMAN JUST ADMITTED THIS" | "ELON LIED ABOUT THESE NUMBERS" | "THE FED IS LYING TO YOU" | "NVIDIA IS SECRETLY DOING THIS" | "APPLE KNOWS IT'S LOSING" | "THEY DESTROYED YOUR 401K" | "WARREN BUFFETT QUIETLY SOLD"
  DEAD: "Podcast Moment" | "AI Update" | "Market Thoughts" | "Big News" | "Interesting Insight" | "Revenue Performance"
- "focus": 2-3 sentences, social caption body. WHO said WHAT, the exact mechanism or number, and WHY the viewer should care. Must add NEW information vs the hook — zero repeated phrases.
- "score": 0-100 virality score. Be honest. A clip that scores below 72 should be replaced.
- "emotion": the primary emotion this triggers (shock | disbelief | fear | validation | curiosity | anger)
- "reasoning": internal note — why this clip will get shares and follows specifically. Do not write generic placeholders.
- Return ONLY JSON:
{"clips":[{"chunk":1,"start":0,"end":30,"title":"Why Tesla's Valuation Math Breaks","hook":"TESLA'S MATH DOESN'T WORK","focus":"Brandon van der Kolk explains why Tesla's $1.2T valuation requires capturing 40% of a robotaxi market that hasn't materialized — and why that math collapses the moment competition scales.","score":87,"emotion":"shock","reasoning":"Named company + specific mechanism + payoff conclusion. Finance audience will share this to look informed."}]}

Transcript segments:
${transcript}`;

  const nvidiaModel = process.env.OPENCLIPS_NVIDIA_CHAT_MODEL || "moonshotai/kimi-k2.6";

  const [groqResult, kimiResult] = await Promise.allSettled([
    // Groq — gpt-oss-120b reasoning
    withGroqRetry((client) => client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      ...groqChatParams(groqChatModel(), { maxTokens: 3200, temperature: 0.35, responseFormat: { type: "json_object" } }),
    }), { label: "Groq clip planning", attempts: 3, keySlot }),
    // NVIDIA — Kimi K2.6 (primary 6 keys)
    hasNvidiaApiKey()
      ? callNvidiaChat([{ role: "user", content: prompt }], { model: nvidiaModel, maxTokens: 3200, temperature: 0.35, label: "Kimi clip planning", keySlot })
      : Promise.reject(new Error("No NVIDIA key")),
  ]);

  const allCandidates = [];

  function mergeNormalized(result, label) {
    if (result.status !== "fulfilled") return;
    const raw = result.value.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(cleanJson(raw));
      const clips = Array.isArray(parsed.clips) ? parsed.clips : [];
      const normalized = clips.map((c, i) => normalizeCandidate(c, i, duration, analysisChunks, project)).filter(Boolean);
      for (const nc of normalized) {
        const overlaps = allCandidates.some((ec) => {
          const overlapStart = Math.max(ec.start, nc.start);
          const overlapEnd = Math.min(ec.end, nc.end);
          const overlap = Math.max(0, overlapEnd - overlapStart);
          const shorter = Math.min(ec.end - ec.start, nc.end - nc.start);
          return overlap / shorter > 0.5;
        });
        if (!overlaps) allCandidates.push(nc);
      }
      process.stderr.write(`[planClips] ${label}: ${normalized.length} clips (${allCandidates.length} total after merge)\n`);
    } catch { /* ignore parse failure */ }
  }

  // Groq goes first — its clips are the dedup baseline
  if (groqResult.status === "fulfilled") {
    const raw = groqResult.value.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(cleanJson(raw));
      const clips = Array.isArray(parsed.clips) ? parsed.clips : [];
      allCandidates.push(...clips.map((c, i) => normalizeCandidate(c, i, duration, analysisChunks, project)).filter(Boolean));
      process.stderr.write(`[planClips] Groq gpt-oss-120b: ${allCandidates.length} clips\n`);
    } catch { /* ignore */ }
  }
  mergeNormalized(kimiResult, "NVIDIA Kimi K2.6");

  if (allCandidates.length > 0) {
    return allCandidates.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  }

  // Fallback chain
  try {
    const retry = await retryPlanClipsWithoutJsonMode(prompt, duration, analysisChunks, project, keySlot);
    if (retry.length) return retry;
  } catch { /* fall through */ }
  return localClipPlan(segments, duration, project);
}

async function retryPlanClipsWithoutJsonMode(prompt, duration, analysisChunks, project, keySlot) {
  const response = await withGroqRetry((client) => client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    ...groqChatParams(groqChatModel(), { maxTokens: 1200, temperature: 0.2 }),
  }), { label: "Groq clip planning retry", attempts: 3, keySlot });
  const raw = response.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(cleanJson(raw));
  const clips = Array.isArray(parsed.clips) ? parsed.clips : [];
  return clips.map((clip, index) => normalizeCandidate(clip, index, duration, analysisChunks, project)).filter(Boolean).slice(0, 8);
}

function localClipPlan(segments, duration, project) {
  const chunks = mergeSegments(segments, project.clipLength);
  const source = chunks.length ? chunks : timeWindows(duration, project.clipLength);
  const context = cleanPodcastContext(project.sourceContext || fallbackPodcastContext(project, segments));
  return source
    .map((chunk, index) => {
      const text = String(chunk.text || "").replace(/\s+/g, " ").trim();
      const rawTitle = titleFromText(text);
      const focus = cleanClipFocus("", { title: rawTitle, context, text });
      const title = cleanClipTitle(rawTitle, { context, focus, text, index });
      return {
        start: round(chunk.start),
        end: round(chunk.end),
        title,
        hook: polishPodcastHook("", { title, focus, context, text }),
        focus,
        score: scoreLocally(text, chunk.end - chunk.start, index),
        emotion: "curiosity",
        reasoning: "Local fallback selected this complete transcript window after Groq clip planning returned invalid JSON.",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function transcriptChunksForAnalysis(segments, clipLength) {
  const chunks = mergeSegments(segments, clipLength);
  if (!chunks.length) return timeWindows(Math.max(0, segments.at(-1)?.end || 0), clipLength);
  return chunks;
}

function compactTranscriptForPrompt(chunks) {
  const lines = chunks.map((chunk, index) => {
    const text = String(chunk.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    return `[${index + 1}] ${formatClock(chunk.start)}-${formatClock(chunk.end)} ${text}`;
  });

  const maxChars = 8000;
  if (lines.join("\n").length <= maxChars) return lines.join("\n");

  const keep = [];
  const step = Math.max(1, Math.ceil(lines.length / 48));
  for (let index = 0; index < lines.length; index += step) {
    keep.push(lines[index]);
  }
  return keep.join("\n").slice(0, maxChars);
}

function normalizeCandidate(clip, index, duration, chunks = [], project = {}) {
  const chunkNumber = Number(clip.chunk ?? clip.chunkId ?? clip.chunk_index ?? clip.segment ?? clip.segmentId);
  const chunk = Number.isFinite(chunkNumber) ? chunks[Math.max(0, Math.round(chunkNumber) - 1)] : null;
  const parsedStart = parseTimestamp(clip.start);
  const parsedEnd = parseTimestamp(clip.end);
  const hasUsefulSeconds = Number.isFinite(parsedStart)
    && Number.isFinite(parsedEnd)
    && parsedEnd > parsedStart
    && parsedEnd - parsedStart >= 8;
  const secondsMatchChunk = hasUsefulSeconds
    && (!chunk || (parsedStart >= chunk.start - 5 && parsedEnd <= chunk.end + 5));
  const start = Math.max(0, secondsMatchChunk ? parsedStart : Number(chunk?.start ?? parsedStart ?? 0));
  const end = Math.min(duration, secondsMatchChunk ? parsedEnd : Number(chunk?.end ?? parsedEnd ?? start + 30));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const context = cleanPodcastContext(project.sourceContext || fallbackPodcastContext(project, []));
  const transcriptText = String(chunk?.text || "").replace(/\s+/g, " ").trim();
  const rawTitle = String(clip.title || fallbackTitle("Auto", index)).trim();
  const rawReasoning = String(clip.reasoning || "").trim();
  const rawFocus = String(clip.focus || clip.lesson || clip.takeaway || "").trim();
  const focusSource = rawFocus || (isGenericCaptionMeta(rawReasoning) ? "" : rawReasoning);
  const focus = cleanClipFocus(
    focusSource,
    { title: rawTitle, context, text: transcriptText },
  );
  const title = cleanClipTitle(rawTitle, { context, focus, text: transcriptText, index });
  const hook = polishPodcastHook(clip.hook, { title, focus, context, text: transcriptText });
  const reasoning = isGenericCaptionMeta(rawReasoning)
    ? `Strong ${String(clip.emotion || "curiosity").trim()} moment with a clear verdict and payoff.`
    : rawReasoning.slice(0, 260);
  return {
    start,
    end,
    title,
    hook,
    focus,
    score: Math.max(0, Math.min(99, Number(clip.score ?? 72))),
    emotion: String(clip.emotion || "curiosity").trim().slice(0, 24),
    reasoning,
  };
}

function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map((part) => Number(part));
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return NaN;
}

function mergeSegments(segments, clipLength) {
  const max = maxForLength(clipLength);
  const min = Math.min(MIN_CLIP_SECONDS, max);
  const chunks = [];
  let current = null;
  for (const segment of segments) {
    if (!current) {
      current = { start: segment.start, end: segment.end, text: segment.text || "" };
      continue;
    }
    const wouldEnd = Number(segment.end || current.end);
    const wouldDuration = wouldEnd - current.start;
    const gap = Number(segment.start || current.end) - current.end;
    if ((gap > 1.8 || wouldDuration > max) && current.end - current.start >= min) {
      chunks.push(current);
      current = { start: segment.start, end: segment.end, text: segment.text || "" };
    } else {
      current.end = wouldEnd;
      current.text = `${current.text} ${segment.text || ""}`.trim();
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.end - chunk.start >= Math.min(8, min));
}

function timeWindows(duration, clipLength) {
  const max = maxForLength(clipLength);
  const target = Math.min(max, Math.max(12, duration / 4));
  const windows = [];
  let start = 0;
  while (start < duration - 1 && windows.length < 8) {
    const end = Math.min(duration, start + target);
    windows.push({ start, end, text: "" });
    start += Math.max(8, target * 0.85);
  }
  return windows;
}

function scoreLocally(text, duration, index) {
  const lower = text.toLowerCase();
  const viralSignals = [
    // identity/emotion triggers
    "nobody tells you", "they don't want you to know", "the truth about", "secret",
    "you're doing it wrong", "this is why you're broke", "they lied", "shocking",
    "unbelievable", "insane", "crazy", "nobody talks about",
    // strong claim words
    "never", "always", "first time", "record", "all time", "biggest", "worst mistake",
    "changed everything", "broke", "collapsed", "exploded", "destroyed",
    // finance/business/AI
    "ai", "artificial intelligence", "billion", "million dollars", "went viral",
    "startup", "founder", "investors lost", "market crash", "rug pull",
    "compound", "wealth", "retire", "passive income", "cash flow",
    "mistake", "failed", "fired", "quit", "lawsuit",
    // emotion peaks
    "wait what", "no way", "are you serious", "i can't believe",
  ];
  const hotWords = [
    "money", "invest", "revenue", "career", "strategy", "tech", "product",
    "customers", "why", "how", "market", "crypto", "stock",
  ];
  const viralBonus = viralSignals.filter((w) => lower.includes(w)).length * 7;
  const wordBonus = hotWords.filter((w) => lower.includes(w)).length * 3;
  const durationBonus = duration >= 18 && duration <= 45 ? 14 : 5;
  return Math.min(96, Math.round(62 + durationBonus + viralBonus + wordBonus - index * 2));
}

function titleFromText(text) {
  const cleaned = text
    .replace(/[^a-zA-Z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 8);
  if (words.length < 4) return "This moment gets good fast";
  return toTitleCase(words.join(" "));
}

function fallbackTitle(genre, index) {
  const labels = [
    "Best moment starts here",
    "This part gets good fast",
    "The strongest short-form beat",
    "A clean standalone clip",
    "The replayable viral moment",
    "The hook lands right here",
    "This scene carries the clip",
    "The payoff moment",
  ];
  const title = labels[index % labels.length];
  return genre && genre !== "Auto" ? `${genre}: ${title}` : title;
}

function hookFromTitle(title) {
  const words = String(title || "This moment gets good fast").split(/\s+/).filter(Boolean);
  return words.slice(0, 8).join(" ");
}

function hookFromContext(title, context = {}, text = "") {
  const guest = String(context.guest || "").replace(/[^\w' ]+/g, " ").replace(/\s+/g, " ").trim();
  const topic = String(context.topic || title || "").replace(/[^\w' ]+/g, " ").replace(/\s+/g, " ").trim();
  const words = `${guest ? `${guest} on ` : ""}${topic || title || text}`.split(/\s+/).filter(Boolean);
  if (words.length >= 4) return words.slice(0, 9).join(" ");
  return hookFromTitle(title || text);
}

function cleanClipTitle(value, { context = {}, focus = "", text = "", index = 0 } = {}) {
  let title = String(value || "").replace(/\s+/g, " ").trim();
  if (isWeakClipLabel(title)) {
    title = titleFromFocus(focus, context, text) || fallbackTitle("Auto", index);
  }
  return title
    .replace(/\bEvery Night Worldwide\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 82);
}

function cleanClipFocus(value, { title = "", context = {}, text = "" } = {}) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (cleaned.length >= 90 && !/\bselected as|standalone moment|local fallback\b/i.test(cleaned)) {
    return cleaned.slice(0, 320);
  }
  const subject = subjectFromContext(context, title, text);
  const topic = String(context.topic || title || "").replace(/\s+/g, " ").trim();
  const lower = `${title} ${topic} ${text}`.toLowerCase();
  if (/(airbnb|travelers|hosts|guests|consumer products).*(ai|scale)|ai.*(airbnb|travelers|hosts|guests|scale)/i.test(lower)) {
    return `${subject} argues Airbnb's travel network could become a moat for consumer AI — not because the models are better, but because the product context is richer than a generic chatbot.`;
  }
  if (/(supply|demand|revenue|anthropic)/i.test(lower)) {
    return `${subject} separates demand from supply constraints so you can see what's actually capping growth — and why the headline revenue number hides the real bottleneck.`;
  }
  if (/(valuation|p\/?e|340|payback|tesla|robotaxi|optimus)/i.test(lower)) {
    return `${subject} breaks down why Tesla's valuation assumes robotaxis and Optimus scale before the core auto business justifies the price. The math only works if you believe the story, not the current earnings.`;
  }
  if (/(inflation|central bank|rates|labor market|cheap labor|prices rising)/i.test(lower)) {
    return `${subject} explains how rising labor costs — especially out of China — are pushing global prices up again. The clip shows why rate cuts alone won't fix a supply-side inflation shift.`;
  }
  if (/(deepseek|silicon valley|wall street|cold war|chinese ai)/i.test(lower)) {
    return `${subject} lays out why DeepSeek rattled Silicon Valley and Wall Street: cheaper, efficient open models change who can compete — and how fast incumbents have to respond.`;
  }
  if (/(engineering fundamentals|agent skills|13,?000|pocock|coding)/i.test(lower)) {
    return `${subject} makes the case that AI coding tools don't remove engineering fundamentals — they expose teams that skipped them. The clip shows why structure, testing, and design still decide whether AI output ships.`;
  }
  if (/(monopoly|cloud computing|dario|chamath|agi)/i.test(lower)) {
    return `${subject} frames AI concentration as a potential monopoly layer on top of cloud — where a handful of platforms could control the next decade of software margins.`;
  }
  if (/(sovereign wealth|\bcanada(?:'s)?\b|\bfund\b)/i.test(lower)) {
    return `${subject} walks through what Canada's proposed sovereign wealth fund would actually do — and the tradeoffs politicians aren't advertising in the launch headlines.`;
  }
  return `${subject} explains the hidden lesson in ${topic || title || "this moment"} and why it matters for anyone tracking markets, tech, or policy.`;
}

function polishPodcastHook(value, { title = "", focus = "", context = {}, text = "" } = {}) {
  const raw = cleanHookText(value);
  const cleanedTitle = cleanHookText(title);
  const hook = !isWeakHook(raw)
    ? raw
    : !isWeakHook(cleanedTitle)
      ? cleanedTitle
      : lessonHookFromParts({ title, focus, context, text });
  return trimHookWords(hook || lessonHookFromParts({ title, focus, context, text }), 8);
}

function hookForOverlay({ hook, title, focus, sourceContext, segments }) {
  const context = cleanPodcastContext(sourceContext || {});
  const text = (segments || [])
    .slice(0, 6)
    .map((segment) => segment.text || "")
    .join(" ");
  return polishPodcastHook(hook, { title, focus, context, text });
}

function cleanHookText(value) {
  return String(value || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\w$%+.' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isWeakHook(value) {
  const text = cleanHookText(value);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3 || words.length > 10) return true;
  const lower = text.toLowerCase();
  if (/^(this|the|a|an)\s+(moment|part|clip|scene|episode|segment)\b/.test(lower)) return true;
  if (/\b(welcome back|watching the|every night worldwide|revenue performance|big concerns|gets good|standalone moment|podcast moment|short form|great clip|best clip|highlight reel|key moment|important topic)\b/.test(lower)) return true;
  // Hooks that are just descriptive labels with no tension/claim
  if (/^(ai and|tech and|podcast|money and|finance and|sports and)\b/i.test(lower)) return true;
  if (/^(\d+\s+\w+)$/.test(text)) return true; // bare stats like "100 million travelers"
  if (/^\$?\d/.test(text) && !/\b(ai|stars|skills|why|how|changes|cost|risk|advantage|moat|math|broken|scale|lesson|beats|doubles|exposed|wrong|mistake|lie|lied)\b/i.test(text)) return true;
  return false;
}

function isWeakClipLabel(value) {
  const text = cleanHookText(value);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  return /\b(welcome back|watching|every night|performance|big concerns|gets good|standalone clip)\b/i.test(text);
}

function lessonHookFromParts({ title = "", focus = "", context = {}, text = "" } = {}) {
  const subject = subjectFromContext(context, title, text);
  const lower = `${title} ${focus} ${context.topic || ""} ${context.hookAngle || ""} ${text}`.toLowerCase();
  if (/(airbnb|travelers|hosts|guests|consumer products).*(ai|scale)|ai.*(airbnb|travelers|hosts|guests|scale)/i.test(lower)) {
    return "Airbnb's AI Advantage Is Scale";
  }
  if (/(anthropic|revenue|demand|supply)/i.test(lower)) {
    return `${possessive(subject)} Bottleneck Nobody Talks About`;
  }
  if (/(tesla|p\/?e|340|payback|robotaxi|full self-driving|valuation[^.]{0,80}tesla|tesla[^.]{0,80}valuation)/i.test(lower)) {
    return "Tesla's Math Doesn't Work";
  }
  if (/(inflation|central bank|rates|labor market)/i.test(lower)) {
    return "Inflation Just Changed The Rules";
  }
  if (/(sovereign wealth|\bcanada(?:'s)?\b|\bfund\b)/i.test(lower)) {
    return "Canada's Fund Has A Hidden Catch";
  }
  if (/(deepseek|silicon valley|wall street|cold war)/i.test(lower)) {
    return "DeepSeek Exposed America's Blind Spot";
  }
  if (/(engineering fundamentals|skills|typescript|programming)/i.test(lower)) {
    return "AI Can't Replace This Skill";
  }
  if (/(descript|slop|creator|editor)/i.test(lower)) {
    return "Creators Are Rejecting AI Slop";
  }
  if (/(bronze age|human evolution|ancient dna|genetics)/i.test(lower)) {
    return "This Changed Human DNA Forever";
  }
  if (/(stimulus|trump|federal spending|taxpayer)/i.test(lower)) {
    return "Someone Will Pay For This";
  }
  if (/(mistake|failed|wrong|misunderstood|nobody knows)/i.test(lower)) {
    return `${possessive(subject)} Biggest Mistake Exposed`;
  }
  if (/(secret|hidden|nobody|don't tell|they won't)/i.test(lower)) {
    return "They Don't Want You Knowing This";
  }
  if (/(compound|wealth|retire|passive|income)/i.test(lower)) {
    return "This Is How Real Wealth Compounds";
  }
  if (/(crash|collapse|bubble|crisis)/i.test(lower)) {
    return "This Market Is About To Break";
  }
  const keyword = lessonKeyword(lower, context);
  if (subject && keyword) return `${possessive(subject)} ${keyword} Changes Everything`;
  if (subject) return `Nobody Told You About ${subject}`;
  return "The Part Nobody Talks About";
}

function titleFromFocus(focus, context = {}, text = "") {
  const hook = lessonHookFromParts({ focus, context, text });
  return toTitleCase(hook.replace(/\b(Is|Has)\b/g, "").replace(/\s+/g, " ").trim());
}

function subjectFromContext(context = {}, title = "", text = "") {
  const combined = `${title} ${context.contextLine || ""} ${context.topic || ""} ${context.guest || ""} ${context.channel || ""} ${text}`;
  const known = [
    "Airbnb",
    "Tesla",
    "Anthropic",
    "DeepSeek",
    "Descript",
    "Canada",
    "Trump",
    "Inflation",
    "AI",
  ];
  const found = known.find((item) => new RegExp(`\\b${item}\\b`, "i").test(combined));
  if (found) return found;
  const guest = cleanHookText(context.guest || "");
  if (guest) return guest.split(/\s+/).slice(-1)[0];
  const channel = cleanHookText(context.channel || "");
  if (channel) return channel.split(/\s+/).slice(0, 2).join(" ");
  return "This";
}

function possessive(subject) {
  const clean = cleanHookText(subject || "This");
  if (!clean || clean.toLowerCase() === "this") return "This";
  return /s$/i.test(clean) ? `${clean}'` : `${clean}'s`;
}

function lessonKeyword(lower, context = {}) {
  if (/\bscale\b/.test(lower)) return "Scale";
  if (/\btrust\b/.test(lower)) return "Trust";
  if (/\bgrowth\b/.test(lower)) return "Growth";
  if (/\bmoat|advantage\b/.test(lower)) return "Moat";
  if (/\brisk|tradeoff|catch\b/.test(lower)) return "Risk";
  if (/\bsupply\b/.test(lower)) return "Supply";
  if (/\bdemand\b/.test(lower)) return "Demand";
  if (/\bvaluation|price|market\b/.test(lower)) return "Valuation";
  if (/\bai\b/.test(lower) || /\bai\b/i.test(context.topic || "")) return "AI";
  return "";
}

function trimHookWords(value, maxWords) {
  const words = cleanHookText(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function toTitleCase(value) {
  const minor = new Set(["a", "an", "and", "as", "for", "in", "of", "on", "or", "the", "to"]);
  return String(value).split(" ").map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && minor.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function cleanJson(value) {
  const cleaned = String(value || "").replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
}

function maxForLength(clipLength) {
  if (/less|short|30/i.test(clipLength)) return 30;
  if (/long|60/i.test(clipLength)) return 60;
  return 45;
}

function normalizeClipWindow({ start, end, sourceDuration, clipLength }) {
  const max = maxForLength(clipLength);
  const min = Math.min(MIN_CLIP_SECONDS, Math.max(1, sourceDuration));
  let normalizedStart = Math.max(0, Math.min(Number(start || 0), Math.max(0, sourceDuration - min)));
  let normalizedEnd = Math.max(normalizedStart + min, Math.min(Number(end || normalizedStart + max), sourceDuration));
  if (normalizedEnd - normalizedStart > max) {
    normalizedEnd = normalizedStart + max;
  }
  if (normalizedEnd > sourceDuration) {
    normalizedEnd = sourceDuration;
    normalizedStart = Math.max(0, normalizedEnd - Math.min(max, sourceDuration));
  }
  return {
    start: normalizedStart,
    end: normalizedEnd,
    duration: Math.max(0.1, normalizedEnd - normalizedStart),
  };
}

function segmentsForWindow(segments, start, end) {
  return segments.filter((segment) => segment.end > start && segment.start < end);
}

function createSrt(segments, start, end, fallbackTitle) {
  const cues = captionCues(segments, start, end, fallbackTitle);
  return cues.map((cue, index) => {
    return `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`;
  }).join("\n");
}

function createXml(project, candidate, window) {
  const attrs = [
    `project="${escapeXml(project.title)}"`,
    `source="${escapeXml(project.sourceUrl || project.originalFileName || project.title)}"`,
    `start="${window.start.toFixed(3)}"`,
    `end="${window.end.toFixed(3)}"`,
    `duration="${window.duration.toFixed(3)}"`,
    `score="${Math.round(candidate.score)}"`,
  ].join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<openclips>\n  <clip ${attrs}>\n    <title>${escapeXml(candidate.title)}</title>\n    <hook>${escapeXml(candidate.hook || candidate.title)}</hook>\n    <focus>${escapeXml(candidate.focus || "")}</focus>\n    <reasoning>${escapeXml(candidate.reasoning || "")}</reasoning>\n  </clip>\n</openclips>\n`;
}

function captionCues(segments, start, end, fallbackTitle) {
  const duration = Math.max(0.1, end - start);
  const cues = [];
  for (const segment of segments) {
    const text = cleanCaptionText(segment.text);
    if (!text) continue;
    if (segment.words?.length) {
      const words = segment.words
        .filter((word) => word.end > start && word.start < end)
        .map((word) => ({ ...word, word: cleanCaptionToken(word.word) }))
        .filter((word) => word.word);
      for (let index = 0; index < words.length; index += 2) {
        const group = words.slice(index, index + 2);
        if (!group.length) continue;
        cues.push({
          start: Math.max(0, group[0].start - start),
          end: Math.min(duration, group.at(-1).end - start + 0.22),
          text: group.map((word) => word.word).join(" "),
        });
      }
    } else {
      const words = text.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
      cues.push({
        start: Math.max(0, segment.start - start),
        end: Math.min(duration, segment.end - start),
        text: words,
      });
    }
  }
  if (!cues.length) {
    cues.push({ start: 0.3, end: Math.min(3.4, duration), text: fallbackTitle || "OpenClips found this moment" });
  }
  return dedupeCaptionCues(cues)
    .filter((cue) => cue.end - cue.start >= 0.3)
    .slice(0, 48)
    .map((cue) => ({ ...cue, text: cleanCaptionText(cue.text).slice(0, 64) }))
    .filter((cue) => cue.text);
}

function dedupeCaptionCues(cues) {
  const normalized = cues
    .map((cue) => ({ ...cue, text: cleanCaptionText(cue.text) }))
    .filter((cue) => cue.text)
    .sort((a, b) => a.start - b.start);
  const result = [];
  for (const cue of normalized) {
    const previous = result.at(-1);
    const textKey = captionKey(cue.text);
    if (previous) {
      const previousKey = captionKey(previous.text);
      if (textKey === previousKey && cue.start < previous.end + 0.45) continue;
      if (captionSimilarity(textKey, previousKey) >= 0.72 && cue.start < previous.end + 0.35) continue;
      if (cue.start < previous.end - 0.05) {
        cue.start = Math.max(0, previous.end - 0.03);
      }
    }
    cue.end = Math.max(cue.start + 0.34, cue.end);
    result.push(cue);
  }
  return result;
}

function captionKey(value) {
  return cleanCaptionText(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\b(the|a|an|to|of|and|or|but|so)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function captionSimilarity(a, b) {
  if (!a || !b) return 0;
  const aWords = new Set(a.split(" ").filter(Boolean));
  const bWords = new Set(b.split(" ").filter(Boolean));
  if (!aWords.size || !bWords.size) return 0;
  let overlap = 0;
  for (const word of aWords) {
    if (bWords.has(word)) overlap += 1;
  }
  return overlap / Math.max(aWords.size, bWords.size);
}

function cleanCaptionText(value) {
  return String(value || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/^>+\s*/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCaptionToken(value) {
  return cleanCaptionText(value)
    .replace(/^[-–—]+|[-–—]+$/g, "")
    .trim();
}

async function renderClip({
  sourcePath, outputPath, start, duration, title, hook, focus, sourceContext, score, segments,
  layout, hasAudio, sourceProbe, sport, onProgress,
  cachedFocusTrack = null, skipFocusAnalysis = false, skipBackgroundMusic = false,
}) {
  const overlayItems = [];
  const clipOverlayDir = path.join(OVERLAY_DIR, crypto.randomUUID());
  await fsp.mkdir(clipOverlayDir, { recursive: true });
  try {

  const isSports = String(layout || "").toLowerCase() === "sports";
  const captionCuesList = captionCues(segments, start, start + duration, title).slice(0, MAX_CAPTION_OVERLAYS);
  const overlayHook = isSports ? (hook || title) : hookForOverlay({ hook, title, focus, sourceContext, segments });
  const hookPath = path.join(clipOverlayDir, "hook.png");

  const resolveFocusTrack = () => {
    if (cachedFocusTrack && (cachedFocusTrack.samples?.length || cachedFocusTrack.detected !== undefined)) {
      return Promise.resolve(cachedFocusTrack);
    }
    if (skipFocusAnalysis) return Promise.resolve({ detected: false, samples: [] });
    return isSports
      ? analyzeBallFocus({ sourcePath, start, duration, sport })
      : analyzeSpeakerFocus({ sourcePath, start, duration });
  };

  // Face tracking, hook PNG, caption PNGs, and progress track all run in parallel
  const progressTrackPath = path.join(clipOverlayDir, "progress-track.png");
  const [focusTrack] = await Promise.all([
    resolveFocusTrack(),
    Promise.all(captionCuesList.map(async (cue, index) => {
      const captionPath = path.join(clipOverlayDir, `caption-${index}.png`);
      await createCaptionOverlay(cue.text, captionPath);
    })),
    isSports
      ? createHookOverlay(overlayHook, score, hookPath, sourceContext)
      : createPodcastHookOverlay(overlayHook, hookPath, sourceContext),
    createProgressBarTrackOverlay(progressTrackPath),
  ]);

  if (isSports) {
    overlayItems.push({ path: hookPath, start: 0, end: Math.min(3.75, duration) });
  } else {
    overlayItems.push({ path: hookPath, start: 0, end: duration });
  }

  for (let index = 0; index < captionCuesList.length; index += 1) {
    const cue = captionCuesList[index];
    const captionPath = path.join(clipOverlayDir, `caption-${index}.png`);
    overlayItems.push({ path: captionPath, start: cue.start, end: cue.end });
  }
  overlayItems.push({ path: progressTrackPath, start: 0, end: duration });

  const args = ["-y", "-ss", start.toFixed(3), "-i", sourcePath];
  for (const item of overlayItems) {
    args.push("-loop", "1", "-i", item.path);
  }
  const useBackgroundMusic = !skipBackgroundMusic && shouldAddBackgroundMusic(layout, hasAudio);
  const musicInputIndex = useBackgroundMusic ? overlayItems.length + 1 : -1;
  if (useBackgroundMusic) {
    args.push(
      "-f",
      "lavfi",
      "-t",
      duration.toFixed(3),
      "-i",
      inspirationalMusicSource(duration),
    );
  }

  const filterGraphs = [buildFilterComplex(layout, overlayItems, { focusTrack, sourceProbe, clipDuration: duration })];
  if (useBackgroundMusic) {
    filterGraphs.push(backgroundMusicFilter(musicInputIndex, duration));
  }
  args.push(
    "-filter_threads",
    String(FFMPEG_FILTER_THREADS),
    "-filter_complex",
    filterGraphs.join(";"),
    "-map",
    "[vout]",
  );

  if (useBackgroundMusic) {
    args.push("-map", "[aout]");
  } else if (hasAudio) {
    args.push("-map", "0:a:0?", "-af", "volume=1.15");
  }

  args.push(
    "-t",
    duration.toFixed(3),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "24",
    "-pix_fmt",
    "yuv420p",
  );
  if (FFMPEG_THREADS > 0) {
    args.push("-threads", String(FFMPEG_THREADS));
  }

  if (hasAudio) {
    args.push("-c:a", "aac", "-b:a", "128k");
  }

  // NOTE: +faststart is intentionally omitted here — it causes hangs on macOS with
  // complex multi-input filter graphs (50+ inputs). Clips still play fine without it;
  // faststart only matters for HTTP progressive streaming, not local playback/download.
  args.push(outputPath);
  await withRenderSlot(() => runCommand("ffmpeg", args, {
    timeoutMs: RENDER_TIMEOUT_MS,
    onProgress: onProgress
      ? (secs) => onProgress(Math.min(1, duration > 0 ? secs / duration : 0))
      : undefined,
  }));
  return focusTrack;
  } finally {
    await safeRemoveManagedDir(clipOverlayDir);
  }
}

async function withRenderSlot(task) {
  if (activeRenderJobs >= MAX_RENDER_JOBS) {
    await new Promise((resolve) => renderQueue.push(resolve));
  }

  activeRenderJobs += 1;
  try {
    return await task();
  } finally {
    activeRenderJobs -= 1;
    const next = renderQueue.shift();
    if (next) next();
  }
}

// YouTube's "Sign in to confirm you're not a bot" check is a per-request
// probabilistic block, not a persistent IP ban — it fires far more often when
// many yt-dlp processes hit youtube.com at once (e.g. submitting 20+ projects
// in a tight loop). Capping concurrency and retrying transient hits clears it
// most of the time without needing cookies.
async function withYtdlpSlot(task) {
  if (activeYtdlpJobs >= MAX_YTDLP_JOBS) {
    await new Promise((resolve) => ytdlpQueue.push(resolve));
  }

  activeYtdlpJobs += 1;
  try {
    return await task();
  } finally {
    activeYtdlpJobs -= 1;
    const next = ytdlpQueue.shift();
    if (next) next();
  }
}

const YTDLP_RETRIABLE_ERROR = /sign in to confirm|http error 429/i;

async function runYtdlpWithRetry(args, options = {}, { attempts = 4, baseDelayMs = 10_000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await withYtdlpSlot(() => runCommand("yt-dlp", args, options));
    } catch (err) {
      const retriable = YTDLP_RETRIABLE_ERROR.test(err.message);
      if (attempt === attempts || !retriable) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * baseDelayMs));
    }
  }
}

function buildFilterComplex(layout, overlayItems, options = {}) {
  const mode = String(layout || "auto").toLowerCase();
  let base;
  if (mode === "fill") {
    base = `[0:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},fps=${RENDER_FPS},setsar=1,format=rgba[base0]`;
  } else if (mode === "fit") {
    base = `[0:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x050505,fps=${RENDER_FPS},setsar=1,format=rgba[base0]`;
  } else if (mode === "sports") {
    base = ballFocusFilter(options.focusTrack, options.sourceProbe);
  } else {
    base = speakerFocusFilter(options.focusTrack, options.sourceProbe);
  }

  const filters = [base];
  let current = "base0";
  overlayItems.forEach((item, index) => {
    const next = `ov${index}`;
    const safeStart = Math.max(0, Number(item.start || 0)).toFixed(3);
    const safeEnd = Math.max(Number(item.end || 0.5), Number(item.start || 0) + 0.1).toFixed(3);
    filters.push(`[${current}][${index + 1}:v]overlay=0:0:enable='between(t,${safeStart},${safeEnd})':format=auto[${next}]`);
    current = next;
  });

  // Animated fill on top of the static track PNG overlay
  const clipDuration = options.clipDuration;
  if (clipDuration && clipDuration > 0) {
    const { x, y, w, h } = progressBarLayout();
    const dur = Number(clipDuration).toFixed(3);
    filters.push(
      `[${current}]drawbox=x=${x}:y=${y}:w='max(1\\,${w}*t/${dur})':h=${h}:color=white@0.98:t=fill[pb]`,
    );
    current = "pb";
  }

  filters.push(`[${current}]format=yuv420p[vout]`);
  return filters.join(";");
}

function shouldAddBackgroundMusic(layout, hasAudio) {
  return BACKGROUND_MUSIC_ENABLED && hasAudio && String(layout || "").toLowerCase() !== "sports";
}

function inspirationalMusicSource(duration) {
  const safeDuration = Math.max(0.1, Number(duration || 30)).toFixed(3);
  return [
    "aevalsrc=",
    "0.12*sin(2*PI*220*t)",
    "+0.08*sin(2*PI*277.18*t)",
    "+0.07*sin(2*PI*329.63*t)",
    "+0.04*sin(2*PI*440*t)",
    `:s=44100:d=${safeDuration}`,
  ].join("");
}

function backgroundMusicFilter(musicInputIndex, duration) {
  const fadeOutStart = Math.max(0, Number(duration || 0) - 1.25).toFixed(3);
  return [
    "[0:a:0]volume=1.08[voice]",
    `[${musicInputIndex}:a]volume=${BACKGROUND_MUSIC_VOLUME.toFixed(3)},` +
      `afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=1.1[music]`,
    "[voice][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[aout]",
  ].join(";");
}

function speakerFocusFilter(focusTrack, sourceProbe) {
  const geometry = podcastFaceCropGeometry(sourceProbe, focusTrack);
  const samples = Array.isArray(focusTrack?.samples) ? focusTrack.samples : [];

  const targets = speakerCropTargets(samples, geometry);
  if (!isReliableSpeakingTrack(focusTrack, targets, geometry)) {
    return informationFocusFilter(sourceProbe, focusTrack);
  }

  const compact = stabilizeSpeakerCropTargets(targets, geometry);

  const defaultX = compact.length ? compact[0].x : geometry.defaultX;
  const defaultY = compact.length ? compact[0].y : geometry.defaultY;

  const xExpr = ffmpegExpr(cropAxisEaseExpression(compact, "x", defaultX));
  const yExpr = ffmpegExpr(cropAxisEaseExpression(compact, "y", defaultY));

  return [
    podcastBlurredBackgroundFilter(),
    `[0:v]setpts=PTS-STARTPTS,crop=${geometry.cropW}:${geometry.cropH}:x='${xExpr}':y='${yExpr}',` +
      `scale=${PODCAST_FRAME_SIZE}:${PODCAST_FRAME_SIZE}:flags=fast_bilinear,setsar=1,format=rgba,` +
      "eq=contrast=1.04:saturation=1.08:brightness=-0.01[podcast_fg]",
    podcastFrameCompositeFilter(),
  ].join(";");
}

function speakerCropTargets(samples, geometry) {
  return samples
    .map((sample) => {
      const faceCx = Number(sample.x || geometry.sourceWidth / 2);
      const faceCy = Number(sample.y || geometry.sourceHeight / 2);
      const faceH = Number(sample.h || 80);
      return {
        t: Math.max(0, Number(sample.t || 0)),
        x: clamp(faceCx - geometry.cropW * 0.5, 0, geometry.maxX),
        y: clamp(faceCy - geometry.cropH * 0.42, 0, geometry.maxY),
        w: Number(sample.w || faceH),
        h: faceH,
        speech: Number(sample.speech || 0),
      };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.t - b.t);
}

function isReliableSpeakingTrack(focusTrack, targets, geometry) {
  if (!focusTrack?.detected || !targets.length) return false;
  if (focusTrack.reliableSpeaker === false) return false;

  const hasCoverage = focusTrack.coverage !== undefined;
  const coverage = Number(focusTrack.coverage);
  if (hasCoverage && (!Number.isFinite(coverage) || coverage < SPEAKER_FOCUS_MIN_COVERAGE)) {
    return false;
  }

  const hasSpeech = focusTrack.speechConfidence !== undefined || focusTrack.speechScore !== undefined;
  const speech = Number(focusTrack.speechConfidence ?? focusTrack.speechScore);
  if (hasSpeech && (!Number.isFinite(speech) || speech < SPEAKER_FOCUS_MIN_MOUTH_MOTION)) {
    return false;
  }

  const medianFaceHeight = median(targets.map((target) => target.h));
  const minSpeakerFaceHeight = Math.max(90, geometry.sourceHeight * 0.13);
  if (medianFaceHeight < minSpeakerFaceHeight) {
    return false;
  }

  const xs = targets.map((target) => target.x);
  const ys = targets.map((target) => target.y);
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);
  const maxStableX = Math.max(160, geometry.cropW * 0.42);
  const maxStableY = Math.max(110, geometry.cropH * 0.2);
  if (xRange > maxStableX || yRange > maxStableY) {
    return false;
  }

  return true;
}

function stabilizeSpeakerCropTargets(targets, geometry) {
  if (!targets.length) return [];

  const medianX = median(targets.map((target) => target.x));
  const medianY = median(targets.map((target) => target.y));
  const maxSingleShotX = Math.max(48, geometry.cropW * 0.14);
  const maxSingleShotY = Math.max(36, geometry.cropH * 0.08);
  const stableTargets = targets.filter((target) => {
    return Math.abs(target.x - medianX) <= maxSingleShotX
      && Math.abs(target.y - medianY) <= maxSingleShotY;
  });

  if (stableTargets.length >= Math.ceil(targets.length * 0.62)) {
    return [{
      t: 0,
      x: median(stableTargets.map((target) => target.x)),
      y: median(stableTargets.map((target) => target.y)),
    }];
  }

  const minShiftX = Math.max(74, geometry.cropW * 0.2);
  const minShiftY = Math.max(54, geometry.cropH * 0.11);
  const compact = [{ ...targets[0], t: 0 }];

  for (let index = 1; index < targets.length; index += 1) {
    const current = targets[index];
    const previous = compact.at(-1);
    const moved = Math.abs(current.x - previous.x) >= minShiftX
      || Math.abs(current.y - previous.y) >= minShiftY;
    if (!moved) {
      previous.x = previous.x * 0.92 + current.x * 0.08;
      previous.y = previous.y * 0.92 + current.y * 0.08;
      continue;
    }

    const lookahead = targets.slice(index, index + 3);
    const sustained = lookahead.length >= 2 && lookahead.every((target) => (
      Math.abs(target.x - previous.x) >= minShiftX * 0.75
        || Math.abs(target.y - previous.y) >= minShiftY * 0.75
    ));
    if (sustained && current.t - previous.t >= 1.1) {
      compact.push({
        t: current.t,
        x: median(lookahead.map((target) => target.x)),
        y: median(lookahead.map((target) => target.y)),
      });
    }
  }

  return compact.slice(0, 10);
}

function informationFocusFilter(sourceProbe, focusTrack) {
  const geometry = podcastInformationGeometry(sourceProbe, focusTrack);
  return [
    podcastBlurredBackgroundFilter(),
    `[0:v]setpts=PTS-STARTPTS,crop=${geometry.cropW}:${geometry.cropH}:${geometry.cropX}:${geometry.cropY},` +
      `scale=${PODCAST_FRAME_SIZE}:${PODCAST_FRAME_SIZE}:flags=fast_bilinear,setsar=1,format=rgba,` +
      "eq=contrast=1.03:saturation=1.04:brightness=-0.01[podcast_fg]",
    podcastFrameCompositeFilter(),
  ].join(";");
}

function podcastBlurredBackgroundFilter() {
  return `[0:v]setpts=PTS-STARTPTS,scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},gblur=sigma=12,` +
    "eq=contrast=0.82:saturation=0.62:brightness=-0.16,format=rgba[podcast_bg]";
}

function podcastFrameCompositeFilter() {
  const bottomHeight = Math.max(0, VIDEO_HEIGHT - PODCAST_FRAME_BOTTOM);
  return `[podcast_bg][podcast_fg]overlay=${PODCAST_FRAME_X}:${PODCAST_FRAME_Y}:format=auto,` +
    `drawbox=x=0:y=0:w=iw:h=${PODCAST_FRAME_Y}:color=black@0.62:t=fill,` +
    `drawbox=x=0:y=${PODCAST_FRAME_BOTTOM}:w=iw:h=${bottomHeight}:color=black@0.54:t=fill,` +
    `fps=${RENDER_FPS},setsar=1,format=rgba[base0]`;
}

function podcastFaceCropGeometry(sourceProbe, focusTrack) {
  const sourceWidth = Number(sourceProbe?.width || focusTrack?.width || 1920);
  const sourceHeight = Number(sourceProbe?.height || focusTrack?.height || 1080);
  const maxSquare = evenInside(Math.min(sourceWidth, sourceHeight), Math.min(sourceWidth, sourceHeight));
  const samples = Array.isArray(focusTrack?.samples) ? focusTrack.samples : [];
  const medianFaceHeight = median(samples.map((sample) => Number(sample.h || sample.w || 0)));
  const minSide = maxSquare * 0.48;
  const faceSide = medianFaceHeight > 0 ? medianFaceHeight * 3.85 : maxSquare;
  const cropSide = evenInside(clamp(faceSide, minSide, maxSquare), maxSquare);
  const maxX = Math.max(0, sourceWidth - cropSide);
  const maxY = Math.max(0, sourceHeight - cropSide);
  return {
    sourceWidth,
    sourceHeight,
    cropW: cropSide,
    cropH: cropSide,
    maxX,
    maxY,
    defaultX: maxX / 2,
    defaultY: maxY / 2,
  };
}

function podcastInformationGeometry(sourceProbe, focusTrack) {
  const geometry = podcastFaceCropGeometry(sourceProbe, focusTrack);
  const samples = Array.isArray(focusTrack?.samples) ? focusTrack.samples : [];
  const coverage = Number(focusTrack?.coverage);
  const shouldUseDetectedFace = focusTrack?.reliableSpeaker !== false
    || (Number.isFinite(coverage) && coverage >= SPEAKER_FOCUS_MIN_COVERAGE);
  const largeSamples = samples.filter((sample) => {
    const faceW = Number(sample.w || sample.h || 0);
    const faceH = Number(sample.h || sample.w || 0);
    return faceW >= geometry.sourceWidth * 0.08 && faceH >= geometry.sourceHeight * 0.12;
  });
  const centerX = shouldUseDetectedFace && largeSamples.length
    ? median(largeSamples.map((sample) => Number(sample.x || geometry.sourceWidth / 2)))
    : geometry.sourceWidth / 2;
  const centerY = shouldUseDetectedFace && largeSamples.length
    ? median(largeSamples.map((sample) => Number(sample.y || geometry.sourceHeight / 2)))
    : geometry.sourceHeight / 2;
  return {
    cropW: geometry.cropW,
    cropH: geometry.cropH,
    cropX: evenOffset(centerX - geometry.cropW / 2, geometry.maxX),
    cropY: evenOffset(centerY - geometry.cropH * 0.42, geometry.maxY),
  };
}

function informationFocusGeometry(sourceProbe, focusTrack) {
  const sourceWidth = Number(sourceProbe?.width || focusTrack?.width || 1920);
  const sourceHeight = Number(sourceProbe?.height || focusTrack?.height || 1080);
  const sourceAspect = sourceWidth / Math.max(1, sourceHeight);
  const cardAspect = sourceAspect >= 1.18 ? 1.12 : 1;
  const cardW = evenInside(VIDEO_WIDTH * 0.92, VIDEO_WIDTH);
  const cardH = evenInside(cardW / cardAspect, VIDEO_HEIGHT);
  let cropW;
  let cropH;
  if (sourceAspect >= cardAspect) {
    cropH = evenInside(sourceHeight, sourceHeight);
    cropW = evenInside(cropH * cardAspect, sourceWidth);
  } else {
    cropW = evenInside(sourceWidth, sourceWidth);
    cropH = evenInside(cropW / cardAspect, sourceHeight);
  }
  const maxX = Math.max(0, sourceWidth - cropW);
  const maxY = Math.max(0, sourceHeight - cropH);
  let centerX = sourceWidth / 2;
  let centerY = sourceHeight / 2;

  const samples = Array.isArray(focusTrack?.samples) ? focusTrack.samples : [];
  const sampleXs = samples.map((sample) => Number(sample.x)).filter(Number.isFinite);
  const sampleHs = samples.map((sample) => Number(sample.h || sample.w || 0)).filter(Number.isFinite);
  const medianSampleX = median(sampleXs);
  const medianSampleH = median(sampleHs);
  const tinyFaceStrip = samples.length >= 3 && medianSampleH > 0 && medianSampleH < sourceHeight * 0.16;
  if (tinyFaceStrip && medianSampleX > sourceWidth * 0.62) {
    centerX = cropW / 2 + maxX * 0.04;
  } else if (tinyFaceStrip && medianSampleX < sourceWidth * 0.38) {
    centerX = sourceWidth - cropW / 2 - maxX * 0.04;
  }

  const largeSamples = samples.filter((sample) => {
    const faceW = Number(sample.w || sample.h || 0);
    const faceH = Number(sample.h || sample.w || 0);
    return faceW >= sourceWidth * 0.1 && faceH >= sourceHeight * 0.18;
  });
  const speech = Number(focusTrack?.speechConfidence ?? focusTrack?.speechScore);
  const coverage = Number(focusTrack?.coverage);
  const shouldBiasToFace = largeSamples.length >= Math.max(3, Math.ceil(samples.length * 0.35))
    && Number.isFinite(speech)
    && speech >= SPEAKER_FOCUS_MIN_MOUTH_MOTION * 1.25
    && (!Number.isFinite(coverage) || coverage >= SPEAKER_FOCUS_MIN_COVERAGE * 0.7);

  if (shouldBiasToFace) {
    centerX = median(largeSamples.map((sample) => Number(sample.x || sourceWidth / 2)));
    centerY = median(largeSamples.map((sample) => Number(sample.y || sourceHeight / 2)));
  }

  return {
    cropW,
    cropH,
    cropX: evenOffset(centerX - cropW / 2, maxX),
    cropY: evenOffset(centerY - cropH / 2, maxY),
    cardW,
    cardH,
  };
}

async function analyzeSpeakerFocus({ sourcePath, start, duration }) {
  try {
    const { stdout } = await runCommand("python3", [
      FACE_TRACKER_PATH,
      sourcePath,
      start.toFixed(3),
      duration.toFixed(3),
      String(FACE_TRACKER_SAMPLES),
    ], { timeoutMs: 1000 * 120 });
    const data = JSON.parse(stdout || "{}");
    const samples = Array.isArray(data.samples) ? data.samples.filter((sample) => Number.isFinite(Number(sample.x))) : [];
    return {
      detected: Boolean(data.detected && samples.length > 0),
      width: data.width,
      height: data.height,
      speakerId: data.speakerId,
      speechConfidence: data.speechConfidence,
      coverage: data.coverage,
      reliableSpeaker: data.reliableSpeaker,
      samples,
    };
  } catch {
    return { detected: false, samples: [] };
  }
}

async function analyzeBallFocus({ sourcePath, start, duration, sport }) {
  try {
    const { stdout } = await runCommand("python3", [
      BALL_TRACKER_PATH,
      sourcePath,
      start.toFixed(3),
      duration.toFixed(3),
      String(BALL_TRACKER_SAMPLES),
      String(sport || "basketball"),
    ], { timeoutMs: 1000 * 120 });
    const data = JSON.parse(stdout || "{}");
    const samples = Array.isArray(data.samples)
      ? data.samples.filter((s) => Number.isFinite(Number(s.x)) && Number.isFinite(Number(s.y)))
      : [];
    return {
      detected: data.detected && samples.length > 0,
      width: data.width,
      height: data.height,
      samples,
    };
  } catch {
    return { detected: false, samples: [] };
  }
}

function ballFocusFilter(focusTrack, sourceProbe) {
  const geometry = faceCropGeometry(sourceProbe, focusTrack);
  const samples = Array.isArray(focusTrack?.samples) ? focusTrack.samples : [];

  // For sports, we want a wider crop window centered on the ball
  // Use ~60% of source width so we see the play context, not just the ball
  const cropW = geometry.cropW;
  const cropH = geometry.cropH;
  const maxX = geometry.maxX;
  const maxY = geometry.maxY;

  const targets = samples
    .map((s) => {
      const ballX = Number(s.x || geometry.sourceWidth / 2);
      const ballY = Number(s.y || geometry.sourceHeight / 2);
      // Center the crop window on the ball, but bias slightly upward
      // so we see the player holding/shooting the ball too
      const x = clamp(ballX - cropW * 0.5, 0, maxX);
      const y = clamp(ballY - cropH * 0.42, 0, maxY);
      return {
        t: Math.max(0, Number(s.t || 0)),
        x,
        y,
        w: Number(s.w || 30),
        h: Number(s.h || 30),
      };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t);

  // Compact: only emit a keyframe when the crop moves meaningfully (>40px)
  const compact = [];
  for (const t of targets) {
    const prev = compact.at(-1);
    if (!prev || Math.hypot(t.x - prev.x, t.y - prev.y) >= 40) {
      compact.push(t);
    } else {
      // Update in place with slight smoothing
      prev.x = prev.x * 0.6 + t.x * 0.4;
      prev.y = prev.y * 0.6 + t.y * 0.4;
    }
  }

  const defaultX = compact.length ? compact[0].x : geometry.defaultX;
  const defaultY = compact.length ? compact[0].y : geometry.defaultY;

  const xExpr = ffmpegExpr(cropAxisStepExpression(compact, "x", defaultX));
  const yExpr = ffmpegExpr(cropAxisStepExpression(compact, "y", defaultY));

  return [
    `[0:v]setpts=PTS-STARTPTS,crop=${cropW}:${cropH}:x='${xExpr}':y='${yExpr}',` +
      `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:flags=fast_bilinear,fps=${RENDER_FPS},setsar=1,format=rgba,` +
      "eq=contrast=1.04:saturation=1.08:brightness=-0.01[base0]",
  ].join(";");
}

function faceCropGeometry(sourceProbe, focusTrack) {
  const sourceWidth = Number(sourceProbe?.width || focusTrack?.width || 1920);
  const sourceHeight = Number(sourceProbe?.height || focusTrack?.height || 1080);
  const sourceAspect = sourceWidth / Math.max(1, sourceHeight);
  const targetAspect = VIDEO_WIDTH / VIDEO_HEIGHT;
  let cropW;
  let cropH;
  if (sourceAspect >= targetAspect) {
    cropH = evenInside(sourceHeight, sourceHeight);
    cropW = evenInside(cropH * targetAspect, sourceWidth);
  } else {
    cropW = evenInside(sourceWidth, sourceWidth);
    cropH = evenInside(cropW / targetAspect, sourceHeight);
  }
  const maxX = Math.max(0, sourceWidth - cropW);
  const maxY = Math.max(0, sourceHeight - cropH);
  return {
    sourceWidth,
    sourceHeight,
    cropW,
    cropH,
    maxX,
    maxY,
    defaultX: maxX / 2,
    defaultY: maxY / 2,
  };
}

function shotLockedFaceTargets(focusTrack, geometry) {
  const samples = Array.isArray(focusTrack?.samples) ? focusTrack.samples : [];
  const targets = samples
    .map((sample) => {
      const faceX = Number(sample.x || geometry.sourceWidth / 2);
      const faceY = Number(sample.y || geometry.sourceHeight / 2);
      return {
        t: Math.max(0, Number(sample.t || 0)),
        x: clamp(faceX - geometry.cropW * 0.5, 0, geometry.maxX),
        y: clamp(faceY - geometry.cropH * 0.42, 0, geometry.maxY),
        w: Math.max(40, Number(sample.w || sample.h || 90)),
        h: Math.max(40, Number(sample.h || sample.w || 90)),
      };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.t - b.t);
  return compactFaceTargets(targets).slice(0, 24);
}

function compactFaceTargets(targets) {
  const result = [];
  for (const target of targets) {
    const previous = result.at(-1);
    if (previous && Math.abs(previous.x - target.x) < 20 && Math.abs(previous.y - target.y) < 20) {
      previous.t = target.t;
      previous.x = (previous.x * 0.75) + (target.x * 0.25);
      previous.y = (previous.y * 0.75) + (target.y * 0.25);
      continue;
    }
    result.push({ ...target });
  }
  return result;
}

function cropAxisStepExpression(targets, axis, fallback) {
  const safeFallback = Number(fallback || 0).toFixed(2);
  if (!targets.length) return safeFallback;
  if (targets.length === 1) return Number(targets[0][axis]).toFixed(2);
  let expression = Number(targets.at(-1)[axis]).toFixed(2);
  for (let index = targets.length - 2; index >= 0; index -= 1) {
    const current = targets[index];
    const next = targets[index + 1];
    expression = `if(lt(t,${Number(next.t).toFixed(3)}),${Number(current[axis]).toFixed(2)},${expression})`;
  }
  return expression;
}

function cropAxisEaseExpression(targets, axis, fallback) {
  const safeFallback = Number(fallback || 0).toFixed(2);
  if (!targets.length) return safeFallback;
  if (targets.length === 1) return Number(targets[0][axis]).toFixed(2);

  let expression = Number(targets.at(-1)[axis]).toFixed(2);
  for (let index = targets.length - 2; index >= 0; index -= 1) {
    const current = targets[index];
    const next = targets[index + 1];
    const t0 = Math.max(0, Number(current.t || 0));
    const t1 = Math.max(t0 + 0.001, Number(next.t || t0 + 0.001));
    const duration = Math.max(0.001, t1 - t0);
    const transitionDuration = Math.min(SPEAKER_PAN_TRANSITION_SECONDS, duration);
    const transitionStart = Math.max(t0, t1 - transitionDuration);
    const startValue = Number(current[axis]).toFixed(2);
    const delta = (Number(next[axis]) - Number(current[axis])).toFixed(2);
    const progress = `((t-${transitionStart.toFixed(3)})/${transitionDuration.toFixed(3)})`;
    const eased = `(${startValue}+(${delta})*(${progress}*${progress}*(3-2*${progress})))`;
    const interval = transitionStart > t0
      ? `if(lt(t,${transitionStart.toFixed(3)}),${startValue},${eased})`
      : eased;
    expression = `if(lt(t,${t1.toFixed(3)}),${interval},${expression})`;
  }
  return expression;
}

function ffmpegExpr(value) {
  return String(value).replace(/,/g, "\\,");
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function median(values) {
  const sorted = values
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function evenInside(value, max) {
  const maxEven = Math.max(2, Math.floor(max) - (Math.floor(max) % 2));
  let rounded = Math.floor(value);
  if (rounded % 2 !== 0) rounded -= 1;
  return Math.max(2, Math.min(rounded, maxEven));
}

function evenOffset(value, max) {
  const safeMax = Math.max(0, Math.floor(max));
  let rounded = Math.round(clamp(value, 0, safeMax));
  if (rounded % 2 !== 0) rounded -= 1;
  return clamp(rounded, 0, safeMax);
}

function layoutViralHookLines(lines) {
  const safeLines = lines.length ? lines : ["PODCAST MOMENT"];
  const lineCount = safeLines.length;
  // Place hook in mid-frame zone (30–52%) — below face portrait, clearly visible
  const minTop    = Math.round(VIDEO_HEIGHT * 0.30) - 110;  // ~274px
  const maxBottom = Math.round(VIDEO_HEIGHT * 0.52) - 110;  // ~555px
  let hookSize = Math.round((lineCount > 2 ? 58 : lineCount > 1 ? 68 : 78) * VIDEO_SCALE);
  let hookStroke = Math.round(12 * VIDEO_SCALE);
  let lineHeight = Math.round((hookSize + 8) * VIDEO_SCALE_Y);

  while (lineCount * lineHeight > maxBottom - minTop && hookSize > 32) {
    hookSize -= 2;
    hookStroke = Math.max(7, hookStroke - 1);
    lineHeight = Math.round((hookSize + 8) * VIDEO_SCALE_Y);
  }

  // Vertically centre the block within the zone
  const blockHeight = lineCount * lineHeight;
  const topPad = minTop + Math.max(0, Math.floor((maxBottom - minTop - blockHeight) / 2));

  return { safeLines, topPad, hookSize, hookStroke, lineHeight };
}

async function createPodcastHookOverlay(hook, outputPath, sourceContext = {}) {
  const context = cleanPodcastContext(sourceContext || {});
  const primary = cleanHookText(hook || context.hookAngle || context.contextLine || context.topic || "Podcast moment");
  const headline = trimHookWords(primary, 8).toUpperCase();
  const lines = wrapText(headline, 18).slice(0, 3);
  const { safeLines, topPad, hookSize, hookStroke, lineHeight } = layoutViralHookLines(lines);

  const text = safeLines.map((line, index) => {
    const y = topPad + index * lineHeight;
    return `<text x="${VIDEO_CENTER_X}" y="${y}" text-anchor="middle" dominant-baseline="hanging" class="podcastHook">${escapeXml(line)}</text>`;
  }).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .podcastHook { font-family: "Arial Black", Impact, Arial, Helvetica, sans-serif; font-size: ${hookSize}px; font-weight: 950; fill: #ffffff; letter-spacing: -0.5px; paint-order: stroke; stroke: #050505; stroke-width: ${hookStroke}px; stroke-linejoin: round; }
  </style>
  ${text}
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function createHookOverlay(hook, _score, outputPath, sourceContext = {}) {
  const lines = wrapText(String(hook || "This moment gets good fast").toUpperCase(), 18).slice(0, 3);
  const { safeLines, topPad, hookSize, hookStroke, lineHeight } = layoutViralHookLines(lines);
  const text = safeLines.map((line, index) => {
    const y = topPad + index * lineHeight;
    return `<text x="${VIDEO_CENTER_X}" y="${y}" text-anchor="middle" dominant-baseline="hanging" class="hook">${escapeXml(line)}</text>`;
  }).join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .hook { font-family: "Arial Black", Impact, Arial, Helvetica, sans-serif; font-size: ${hookSize}px; font-weight: 950; fill: #ffffff; letter-spacing: -0.5px; paint-order: stroke; stroke: #050505; stroke-width: ${hookStroke}px; stroke-linejoin: round; }
  </style>
  ${text}
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

function layoutPodcastCaptionLines(lineCount) {
  const count = Math.max(1, lineCount);
  // Caption zone: below hook (52%), well above image card
  const topLimit = Math.round(VIDEO_HEIGHT * 0.54) + 25;   // ~716px
  const bottomLimit = Math.round(VIDEO_HEIGHT * 0.70) + 25; // ~921px
  const available = Math.max(Math.round(56 * VIDEO_SCALE_Y), bottomLimit - topLimit);
  let captionSize = Math.round(56 * VIDEO_SCALE);
  let captionStroke = Math.round(10 * VIDEO_SCALE);
  let lineHeight = Math.round((captionSize + 10) * VIDEO_SCALE_Y);
  const strokePad = () => Math.round(captionStroke * 1.4 + 6 * VIDEO_SCALE_Y);

  while (count * lineHeight + strokePad() > available && captionSize > 28) {
    captionSize -= 2;
    captionStroke = Math.max(6, captionStroke - 1);
    lineHeight = Math.round((captionSize + 10) * VIDEO_SCALE_Y);
  }

  const blockHeight = count * lineHeight + strokePad();
  const topPad = clamp(
    topLimit + Math.max(0, Math.floor((available - blockHeight) / 2)),
    topLimit,
    Math.max(topLimit, bottomLimit - blockHeight),
  );
  return { topPad, captionSize, captionStroke, lineHeight };
}

function progressBarLayout() {
  const h = PROGRESS_BAR_HEIGHT;
  const x = PROGRESS_BAR_SIDE_PAD;
  const w = VIDEO_WIDTH - PROGRESS_BAR_SIDE_PAD * 2;
  const y = VIDEO_HEIGHT - PROGRESS_BAR_BOTTOM_PAD - h;
  const radius = Math.max(2, Math.round(h / 2));
  return { x, y, w, h, radius };
}

async function createProgressBarTrackOverlay(outputPath) {
  const { x, y, w, h, radius } = progressBarLayout();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#ffffff" fill-opacity="0.32"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function createCaptionOverlay(text, outputPath) {
  const lines = captionLines(cleanCaptionText(text).toUpperCase());
  const { topPad, captionSize, captionStroke, lineHeight } = layoutPodcastCaptionLines(lines.length);
  const textNodes = lines.map((line, index) => {
    const y = topPad + index * lineHeight;
    const tspans = line.tokens.map((token) => {
      const cls = token.type || (token.hot ? "hot" : "plain");
      return `<tspan class="${cls}">${escapeXml(token.word)}</tspan><tspan class="plain"> </tspan>`;
    }).join("");
    return `<text x="${VIDEO_CENTER_X}" y="${y}" text-anchor="middle" dominant-baseline="hanging" class="caption" xml:space="preserve">${tspans}</text>`;
  }).join("");
  const CAPTION_GREEN = "#69ff3d";
  const CAPTION_RED = "#ff4444";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .caption { font-family: "Arial Black", Impact, Arial, Helvetica, sans-serif; font-size: ${captionSize}px; font-weight: 950; letter-spacing: 0.5px; paint-order: stroke; stroke: #050505; stroke-width: ${captionStroke}px; stroke-linejoin: round; }
    .plain { fill: #ffffff; }
    .hot { fill: ${CAPTION_YELLOW}; }
    .company { fill: ${CAPTION_GREEN}; }
    .negative { fill: ${CAPTION_RED}; }
  </style>
  ${textNodes}
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

function captionLines(value) {
  // Always one line — words already kept to 2 per cue by captionCues
  const words = String(value || "")
    .replace(/[.,!?;:]+$/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  const tokens = words.map((word) => ({ word, type: captionWordType(word) }));
  return tokens.length ? [{ tokens }] : [{ tokens: [{ word: "OPENCLIPS", type: "hot" }] }];
}

const COMPANY_WORDS = new Set([
  "TESLA", "APPLE", "GOOGLE", "META", "NVIDIA", "MICROSOFT", "AMAZON", "OPENAI",
  "SPACEX", "TWITTER", "X", "NETFLIX", "UBER", "AIRBNB", "COINBASE", "SHOPIFY",
  "SNAP", "TIKTOK", "BYTEDANCE", "ANTHROPIC", "DEEPSEEK", "PALANTIR", "RIVIAN",
  "FORD", "GM", "TOYOTA", "SAMSUNG", "INTEL", "AMD", "QUALCOMM", "ARM",
  "JPM", "JPMORGAN", "BLACKROCK", "BERKSHIRE", "SOFTBANK", "SEQUOIA",
  "ELON", "MUSK", "BEZOS", "ZUCKERBERG", "COOK", "ALTMAN", "CHESKY", "JENSEN",
  "TRUMP", "FED", "SEC", "NASDAQ", "NYSE", "DOW", "S&P", "SPY", "ETF",
  "BITCOIN", "ETHEREUM", "CRYPTO", "BTC", "ETH", "DOGE", "NFT",
]);

const NEGATIVE_WORDS = new Set([
  "CRASH", "COLLAPSE", "DISASTER", "OVERVALUED", "BANKRUPT", "BANKRUPTCY",
  "FAIL", "FAILED", "FAILING", "WRONG", "LIE", "LIED", "LIES", "FRAUD",
  "BUBBLE", "SCAM", "BROKEN", "DEAD", "DYING", "LOSING", "LOST", "LOSS",
  "DEBT", "DEFICIT", "RECESSION", "CRISIS", "PANIC", "FEAR", "DUMP",
  "TOXIC", "DANGEROUS", "RISKY", "TERRIBLE", "WORST", "NEVER", "DOOMED",
]);

function captionWordType(word) {
  const clean = word.replace(/[^A-Z0-9$%.]+/g, "");
  if (!clean) return "plain";
  // Numbers and dollar/percent figures → yellow
  if (/^\$?[\d,]+(?:\.\d+)?[BKMT%]?$/.test(clean) || /^\d/.test(clean)) return "hot";
  // Company names / brands / tickers → green
  if (COMPANY_WORDS.has(clean)) return "company";
  // Negative/alarm words → red
  if (NEGATIVE_WORDS.has(clean)) return "negative";
  return "plain";
}

function highlightedCaptionWord(words) {
  const muted = new Set(["A", "AN", "AND", "ARE", "AS", "AT", "BE", "BUT", "FOR", "HE", "HER", "HIS", "I", "IN", "IS", "IT", "ME", "MY", "OF", "ON", "OR", "SHE", "SO", "THE", "THEY", "THIS", "TO", "WE", "YOU"]);
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const key = words[index].replace(/[^A-Z0-9$%]+/g, "");
    if (key && !muted.has(key)) return index;
  }
  return Math.max(0, words.length - 1);
}

async function generateThumbnail(videoPath, outputPath) {
  await runCommand("ffmpeg", [
    "-y",
    "-ss",
    "1",
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-vf",
    "scale=420:-2",
    "-q:v",
    "2",
    outputPath,
  ]);
}

async function compactProjectStorage({ projectId, sourcePath, clips, segments }) {
  const compactTranscript = compactTranscriptSegments(segments, clips);
  if (KEEP_FULL_SOURCE || !hasManagedFile(sourcePath)) {
    return { clips, localSourcePath: sourcePath, transcriptSegments: compactTranscript };
  }

  try {
    const compactedClips = await persistSourceSegmentsForClips({ projectId, sourcePath, clips });
    const masterSourcePath = await retainMasterSource(projectId, sourcePath);
    if (managedPath(sourcePath) !== managedPath(masterSourcePath)) {
      await safeRemoveManagedPath(sourcePath);
    }
    return {
      clips: compactedClips,
      localSourcePath: masterSourcePath || sourcePath,
      transcriptSegments: compactTranscript,
    };
  } catch (error) {
    console.warn(`OpenClips could not compact source for ${projectId}: ${error.message || error}`);
    return { clips, localSourcePath: sourcePath, transcriptSegments: compactTranscript };
  }
}

async function persistSourceSegmentsForClips({ projectId, sourcePath, clips, sourceAlreadyTrimmed = false }) {
  const compacted = [];
  try {
    for (const clip of clips) {
      const sourceSegmentPath = path.join(SOURCE_DIR, `${projectId}-${clip.id}-source.mp4`);
      if (sourceAlreadyTrimmed) {
        await fsp.copyFile(sourcePath, sourceSegmentPath);
      } else {
        await createSourceSegment({
          sourcePath,
          outputPath: sourceSegmentPath,
          start: Number(clip.start || 0),
          duration: Math.max(0.1, Number(clip.duration || (Number(clip.end || 0) - Number(clip.start || 0)) || 0.1)),
        });
      }
      compacted.push({
        ...clip,
        sourceSegmentPath,
      });
    }
  } catch (error) {
    await cleanupClipAssets(compacted, { includeSourceSegments: true });
    throw error;
  }
  return compacted;
}

async function createSourceSegment({ sourcePath, outputPath, start, duration }) {
  const safeStart = Math.max(0, Number(start || 0));
  const safeDuration = Math.max(0.1, Number(duration || 0.1));
  const copyArgs = [
    "-y",
    "-ss",
    safeStart.toFixed(3),
    "-i",
    sourcePath,
    "-t",
    safeDuration.toFixed(3),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  try {
    await runCommand("ffmpeg", copyArgs, { timeoutMs: 1000 * 60 * 8 });
    return;
  } catch {
    await safeRemoveManagedPath(outputPath);
  }

  try {
    await runCommand("ffmpeg", [
      "-y",
      "-ss",
      safeStart.toFixed(3),
      "-i",
      sourcePath,
      "-t",
      safeDuration.toFixed(3),
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-threads",
      String(FFMPEG_THREADS),
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ], { timeoutMs: 1000 * 60 * 12 });
  } catch (error) {
    await safeRemoveManagedPath(outputPath);
    throw error;
  }
}

function compactTranscriptSegments(segments = [], clips = []) {
  const windows = (clips || [])
    .map((clip) => ({ start: Number(clip.start || 0), end: Number(clip.end || 0) }))
    .filter((window) => Number.isFinite(window.start) && Number.isFinite(window.end) && window.end > window.start);
  if (!windows.length) return [];

  const compact = [];
  const seen = new Set();
  for (const window of windows) {
    for (const segment of segmentsForWindow(segments, window.start, window.end)) {
      const trimmed = trimSegmentToWindow(segment, window);
      if (!trimmed) continue;
      const key = `${trimmed.start}:${trimmed.end}:${trimmed.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      compact.push(trimmed);
    }
  }
  return compact.sort((a, b) => a.start - b.start);
}

function trimSegmentToWindow(segment, window) {
  const start = Math.max(Number(segment.start || 0), window.start);
  const end = Math.min(Number(segment.end || 0), window.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const words = (segment.words || [])
    .filter((word) => Number(word.end || 0) > window.start && Number(word.start || 0) < window.end)
    .map((word) => ({
      start: round(clamp(Number(word.start || start), start, end)),
      end: round(clamp(Number(word.end || end), start, end)),
      word: String(word.word || "").trim(),
    }))
    .filter((word) => word.word && word.end > word.start);
  return {
    ...segment,
    start: round(start),
    end: round(end),
    text: words.length ? words.map((word) => word.word).join(" ") : String(segment.text || "").replace(/\s+/g, " ").trim(),
    words,
  };
}

function resolveClipRenderSource(project, clip) {
  if (hasManagedFile(clip?.sourceSegmentPath)) {
    return {
      sourcePath: managedPath(clip.sourceSegmentPath),
      start: 0,
      sourceAlreadyTrimmed: true,
    };
  }
  if (hasManagedFile(project?.localSourcePath)) {
    return {
      sourcePath: managedPath(project.localSourcePath),
      start: Number(clip?.start || 0),
      sourceAlreadyTrimmed: false,
    };
  }
  return null;
}

function clipWindowFromStoredClip(clip) {
  const start = Math.max(0, Number(clip?.start || 0));
  const duration = Math.max(0.1, Number(clip?.duration || (Number(clip?.end || 0) - start) || 0.1));
  return {
    start,
    end: start + duration,
    duration,
  };
}

function segmentsForClipRender(segments, window, sourceAlreadyTrimmed) {
  const selected = segmentsForWindow(segments, window.start, window.end);
  if (!sourceAlreadyTrimmed) return selected;
  return shiftSegments(selected, -window.start);
}

function shiftSegments(segments, offset) {
  return (segments || []).map((segment) => ({
    ...segment,
    start: round(Math.max(0, Number(segment.start || 0) + offset)),
    end: round(Math.max(0.1, Number(segment.end || 0) + offset)),
    words: (segment.words || []).map((word) => ({
      ...word,
      start: round(Math.max(0, Number(word.start || 0) + offset)),
      end: round(Math.max(0.1, Number(word.end || 0) + offset)),
    })),
  }));
}

function wrapText(value, maxChars) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["OPENCLIPS"];
}

function srtTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hour = Math.floor(totalSec / 3600);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const min = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const GROQ_CLIENT_TIMEOUT_MS = 90000;
// ─── NVIDIA API ───────────────────────────────────────────────────────────────

let cachedNvidiaApiKeys = null;
let nvidiaKeyRoundRobin = 0;

function getNvidiaApiKeys() {
  if (cachedNvidiaApiKeys) return cachedNvidiaApiKeys;
  const keys = [];
  const seen = new Set();
  const addKeys = (raw) => {
    String(raw || "")
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((k) => { if (!seen.has(k)) { seen.add(k); keys.push(k); } });
  };
  addKeys(process.env.NVIDIA_API_KEYS);
  addKeys(process.env.NVIDIA_API_KEY);
  addKeys(process.env.OPENCLIPS_NVIDIA_API_KEY);
  cachedNvidiaApiKeys = keys;
  return keys;
}

function hasNvidiaApiKey() {
  return getNvidiaApiKeys().length > 0;
}

// DeepSeek key pool — separate from Kimi to avoid shared rate limits
let cachedDeepSeekApiKeys = null;
function getDeepSeekApiKeys() {
  if (cachedDeepSeekApiKeys) return cachedDeepSeekApiKeys;
  const keys = [];
  const seen = new Set();
  const addKeys = (raw) => String(raw || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean)
    .forEach(k => { if (!seen.has(k)) { seen.add(k); keys.push(k); } });
  addKeys(process.env.NVIDIA_DEEPSEEK_API_KEYS);
  addKeys(process.env.NVIDIA_DEEPSEEK_API_KEY);
  // Fallback to general NVIDIA pool only if no dedicated keys
  if (!keys.length) addKeys(process.env.NVIDIA_API_KEYS);
  cachedDeepSeekApiKeys = keys;
  return keys;
}
function hasDeepSeekApiKey() { return getDeepSeekApiKeys().length > 0; }

function nvidiaKeyForSlot(slot) {
  const keys = getNvidiaApiKeys();
  if (!keys.length) return null;
  const offset = slot != null && Number.isFinite(Number(slot))
    ? Math.abs(Number(slot)) % keys.length
    : nvidiaKeyRoundRobin++ % keys.length;
  return keys[offset % keys.length];
}

async function callNvidiaChat(messages, { model, maxTokens = 1600, temperature = 0.35, topP, extraBody, label = "NVIDIA", keySlot, keyPool, attempts = 3, timeoutMs = 180000 } = {}) {
  const keys = keyPool || getNvidiaApiKeys();
  if (!keys.length) throw new Error("NVIDIA_API_KEYS not set");
  const payload = { model, messages, max_tokens: maxTokens, temperature, stream: false };
  if (topP != null) payload.top_p = topP;
  if (extraBody) Object.assign(payload, extraBody);
  const body = JSON.stringify(payload);
  let lastError;
  const baseOffset = keySlot != null && Number.isFinite(Number(keySlot))
    ? Math.abs(Number(keySlot)) % keys.length
    : nvidiaKeyRoundRobin++ % keys.length;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const key = keys[(baseOffset + attempt) % keys.length];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`NVIDIA ${label} HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`NVIDIA ${label} HTTP ${res.status}: ${err.slice(0, 200)}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < attempts - 1) continue;
    }
  }
  throw lastError || new Error(`NVIDIA ${label} failed after ${attempts} attempts`);
}

// ─── GROQ KEY MANAGEMENT ──────────────────────────────────────────────────────

let groqKeyRoundRobin = 0;
let cachedGroqApiKeys = null;

function getGroqApiKeys() {
  if (cachedGroqApiKeys) return cachedGroqApiKeys;
  const keys = [];
  const seen = new Set();
  const addKeys = (raw) => {
    String(raw || "")
      .split(/[\s,]+/)
      .map((key) => key.trim())
      .filter(Boolean)
      .forEach((key) => {
        if (seen.has(key)) return;
        seen.add(key);
        keys.push(key);
      });
  };
  addKeys(process.env.GROQ_API_KEYS);
  addKeys(process.env.GROQ_API_KEY);
  cachedGroqApiKeys = keys;
  return keys;
}

function hasGroqApiKey() {
  return getGroqApiKeys().length > 0;
}

// Returns the configured chat model ID
function groqChatModel() {
  return process.env.OPENCLIPS_GROQ_CHAT_MODEL || "openai/gpt-oss-120b";
}

// Reasoning models need reasoning_effort + max_completion_tokens instead of max_tokens
const REASONING_MODELS = new Set(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
function isReasoningModel(model) {
  return REASONING_MODELS.has(model);
}

// Build the right completion params for any model
function groqChatParams(model, { maxTokens = 1600, temperature = 0.35, reasoningEffort = "medium", responseFormat } = {}) {
  const reasoning = isReasoningModel(model);
  const params = {
    model,
    temperature: reasoning ? 1 : temperature,
    ...(reasoning
      ? { max_completion_tokens: maxTokens, reasoning_effort: reasoningEffort }
      : { max_tokens: maxTokens }),
  };
  if (responseFormat && !reasoning) params.response_format = responseFormat;
  return params;
}

function groqAiModeLabel() {
  const count = getGroqApiKeys().length;
  return count > 1 ? `Groq (${count} keys)` : "Groq";
}

function groqSlotForId(id) {
  const value = String(id || "");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

async function withGroqRetry(operation, { label, attempts = 3, keySlot, timeout = GROQ_CLIENT_TIMEOUT_MS } = {}) {
  const keys = getGroqApiKeys();
  if (!keys.length) throw new Error("No Groq API keys configured");

  let lastError;
  let keyOffset = keySlot != null && Number.isFinite(Number(keySlot))
    ? Math.abs(Number(keySlot)) % keys.length
    : groqKeyRoundRobin++ % keys.length;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const apiKey = keys[(keyOffset + attempt - 1) % keys.length];
    const client = new Groq({ apiKey, timeout });
    try {
      return await operation(client);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableGroqError(error)) break;
      const status = Number(error?.status || error?.code || 0);
      const message = String(error?.message || "").toLowerCase();
      const rateLimited = status === 429
        || message.includes("rate_limit")
        || message.includes("tokens per minute");
      if (rateLimited && keys.length > 1) {
        keyOffset += 1;
      }
      await sleep(retryDelayMs(error, attempt));
    }
  }
  throw lastError;
}

function isRetryableGroqError(error) {
  const status = Number(error?.status || error?.code || 0);
  const message = String(error?.message || "").toLowerCase();
  return status === 429
    || status === 500
    || status === 502
    || status === 503
    || status === 504
    || message.includes("rate_limit")
    || message.includes("tokens per minute")
    || message.includes("temporarily unavailable");
}

function retryDelayMs(error, attempt) {
  const header = typeof error?.headers?.get === "function" ? error.headers.get("retry-after") : null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(120000, seconds * 1000);
  return Math.min(90000, 18000 * attempt);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 1000 * 60 * 5;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT_DIR });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      // Parse FFmpeg real-time progress: "time=HH:MM:SS.ss"
      if (options.onProgress) {
        const match = text.match(/time=(\d+):(\d+):([\d.]+)/);
        if (match) {
          const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
          options.onProgress(secs);
        }
      }
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} failed (${code}): ${stderr.slice(-2400)}`));
      }
    });
  });
}

// ─── Sports processing ────────────────────────────────────────────────────────

async function processSportsProject(projectId, { skipBufferSchedule = false } = {}) {
  const project = projects[projectId];
  if (!project) return;

  try {
    assertPipelineConfigured();
    await updateProject(projectId, { status: "fetching", statusLabel: "Importing source", progress: 10 });

    const importResult = project.localSourcePath && fs.existsSync(project.localSourcePath)
      ? { sourcePath: project.localSourcePath, title: "" }
      : await downloadVideo(project.sourceUrl, projectId);
    const sourcePath = importResult.sourcePath;
    const probe = await probeVideo(sourcePath);

    await updateProject(projectId, {
      title: importResult.title || project.title,
      sourceChannel: importResult.channel || importResult.uploader || project.sourceChannel || "",
      sourceUploader: importResult.uploader || project.sourceUploader || "",
      sourceDescription: String(importResult.description || project.sourceDescription || "").slice(0, 1400),
      localSourcePath: sourcePath,
      duration: probe.duration,
      dimensions: { width: probe.width, height: probe.height },
      progress: 22,
      statusLabel: "Preparing audio",
    });

    const groqSlot = groqSlotForId(projectId);
    if (!probe.hasVideo) {
      throw new Error("Audio-only files are not allowed. A video track is required.");
    }
    if (!probe.hasAudio) {
      throw new Error("This video has no audio track. Groq transcription is required.");
    }

    let segments = project.sourceUrl
      ? await fetchSourceCaptions(project.sourceUrl, projectId, probe.duration)
      : [];
    if (hasUsableTranscriptSegments(segments)) {
      await updateProject(projectId, { status: "transcribing", statusLabel: "Using source captions", progress: 34 });
    } else {
      const audioPath = path.join(AUDIO_DIR, `${projectId}.mp3`);
      try {
        await extractAudio(sourcePath, audioPath);
        await updateProject(projectId, { status: "transcribing", statusLabel: "Transcribing commentary", progress: 34 });
        segments = await transcribeAudio(audioPath, probe.duration, { keySlot: groqSlot });
      } finally {
        await safeRemoveManagedPath(audioPath);
      }
    }

    const sourceContext = await inferSportsContext({
      project: projects[projectId],
      segments,
      keySlot: groqSlot + 1,
    });

    await updateProject(projectId, {
      transcriptSegments: segments,
      sourceContext,
      status: "analyzing",
      statusLabel: "Finding game moments",
      progress: 52,
    });

    const candidates = await planSportsClips({
      project: projects[projectId],
      segments,
      duration: probe.duration,
      keySlot: groqSlot + 2,
    });
    if (!candidates.length) {
      throw new Error("Groq did not return any clip candidates.");
    }

    await updateProject(projectId, { status: "rendering", statusLabel: "Rendering highlight clips", progress: 64 });

    const count = Math.min(candidates.length, DEFAULT_CLIP_COUNT);
    const renderedByIndex = new Array(count);
    let completedRenders = 0;
    await Promise.all(candidates.slice(0, count).map(async (candidate, index) => {
      const window = normalizeClipWindow({
        start: candidate.start,
        end: candidate.end,
        sourceDuration: probe.duration,
        clipLength: project.clipLength,
      });
      const clipId = crypto.randomUUID();
      const baseName = `${slugify(candidate.title || `clip-${index + 1}`)}-${clipId.slice(0, 8)}`;
      const clipPath = path.join(CLIP_DIR, `${baseName}.mp4`);
      const thumbPath = path.join(THUMB_DIR, `${baseName}.jpg`);
      const srtPath = path.join(CLIP_DIR, `${baseName}.srt`);
      const xmlPath = path.join(CLIP_DIR, `${baseName}.xml`);
      const clipSegments = segmentsForWindow(segments, window.start, window.end);
      await fsp.writeFile(srtPath, createSrt(clipSegments, window.start, window.end, candidate.title));
      await fsp.writeFile(xmlPath, createXml(projects[projectId], candidate, window));

      await renderClip({
        sourcePath,
        outputPath: clipPath,
        start: window.start,
        duration: window.duration,
        title: candidate.title,
        hook: candidate.hook,
        focus: candidate.focus,
        sourceContext: projects[projectId].sourceContext,
        score: candidate.score,
        segments: clipSegments,
        layout: "sports",
        hasAudio: probe.hasAudio,
        sourceProbe: probe,
        sport: projects[projectId].sport || "basketball",
        onProgress: (fraction) => {
          const sliceSize = 30 / count;
          const base = 64 + index * sliceSize;
          const pct = Math.round(base + fraction * sliceSize);
          updateProject(projectId, {
            progress: pct,
            statusLabel: `Rendering clip ${index + 1}/${count}… ${Math.round(fraction * 100)}%`,
          });
        },
      });
      await generateThumbnail(clipPath, thumbPath);

      renderedByIndex[index] = {
        id: clipId,
        title: candidate.title,
        hook: candidate.hook || candidate.title,
        focus: candidate.focus,
        reasoning: candidate.reasoning,
        emotion: candidate.emotion,
        score: Math.round(candidate.score),
        tags: candidate.tags || [],
        scoreboard: candidate.scoreboard || "",
        players: candidate.players || "",
        start: round(window.start),
        end: round(window.end),
        duration: round(window.duration),
        filePath: clipPath,
        thumbnailPath: thumbPath,
        srtPath,
        xmlPath,
        downloadUrl: toMediaUrl(clipPath),
        thumbnailUrl: toMediaUrl(thumbPath),
        srtUrl: toMediaUrl(srtPath),
        xmlUrl: toMediaUrl(xmlPath),
        renderedAt: Date.now(),
      };

      completedRenders += 1;
      const progress = 64 + Math.round((completedRenders / count) * 30);
      await updateProject(projectId, { clips: renderedByIndex.filter(Boolean), progress });
    }));
    const rendered = renderedByIndex.filter(Boolean);
    const compacted = await compactProjectStorage({
      projectId,
      sourcePath,
      clips: rendered,
      segments,
    });

    if (!skipBufferSchedule) {
      await updateProject(projectId, {
        clips: compacted.clips,
        localSourcePath: compacted.localSourcePath,
        transcriptSegments: compacted.transcriptSegments,
        status: "scheduling",
        statusLabel: "Scheduling with Buffer",
        progress: 96,
      });
      await scheduleProjectClipsToBuffer(projectId);
    }

    await updateProject(projectId, {
      clips: skipBufferSchedule ? compacted.clips : projects[projectId].clips,
      localSourcePath: compacted.localSourcePath,
      transcriptSegments: compacted.transcriptSegments,
      status: "ready",
      statusLabel: "Ready",
      progress: 100,
      error: "",
    });
  } catch (error) {
    await updateProject(projectId, {
      status: "failed",
      statusLabel: "Failed",
      progress: 100,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function inferSportsContext({ project, segments, keySlot } = {}) {
  const sport = String(project.sport || "Sports");
  requireGroqApiKeys();
  const hasRealTranscript = segments.some((s) => String(s.text || "").trim().length > 8);
  if (!hasRealTranscript) {
    throw new Error("Groq transcript did not return usable speech segments.");
  }

  const transcript = segments.slice(0, 60)
    .map((s) => `${formatClock(s.start)} ${String(s.text || "").replace(/\s+/g, " ").trim()}`)
    .join("\n").slice(0, 4000);

  const prompt = `Infer sports broadcast context.

Title: ${project.title}
Sport: ${sport}
Channel: ${project.sourceChannel || "Unknown"}
Description: ${String(project.sourceDescription || "").slice(0, 600)}

Commentary excerpt:
${transcript}

Return ONLY JSON:
{"teams":"Team A vs Team B or empty","sport":"${sport}","event":"game or tournament name if clear","contextLine":"short 3-6 word context","hookAngle":"what makes this game compelling"}`;

  const _sportsCtxModel = groqChatModel();
  const response = await withGroqRetry((client) => client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    ...groqChatParams(_sportsCtxModel, { maxTokens: 300, temperature: 0.12, responseFormat: { type: "json_object" } }),
  }), { label: "Groq sports context", attempts: 2, keySlot, timeout: 60000 });

  const parsed = JSON.parse(cleanJson(response.choices?.[0]?.message?.content || "{}"));
  if (!parsed.contextLine && !parsed.hookAngle && !parsed.teams) {
    throw new Error("Groq sports context inference returned empty data.");
  }

  return {
    channel: parsed.teams || project.sourceChannel || project.sourceUploader || "",
    guest: "",
    topic: parsed.sport || sport,
    contextLine: parsed.contextLine || sport,
    hookAngle: parsed.hookAngle || `Best ${sport} moments`,
    sport: parsed.sport || sport,
    teams: parsed.teams || "",
    event: parsed.event || "",
  };
}

async function planSportsClips({ project, segments, duration, keySlot } = {}) {
  const sport = String(project.sport || "Sports");
  requireGroqApiKeys();
  const hasRealTranscript = segments.some((s) => String(s.text || "").trim().length > 8);

  if (!hasRealTranscript) {
    throw new Error("Groq transcript did not return usable speech segments.");
  }

  const analysisChunks = transcriptChunksForAnalysis(segments, project.clipLength);
  const transcript = compactTranscriptForPrompt(analysisChunks);
  const context = project.sourceContext || {};

  const prompt = `You are a viral sports clip editor. Your ONLY job is finding moments people will share, replay, and comment on.

Title: ${project.title}
Teams: ${context.teams || context.channel || "Unknown"}
Event: ${context.event || sport}
What makes this compelling: ${context.hookAngle || `Best ${sport} moments`}

VIRAL SPORTS MOMENTS — hunt for these:
1. RECORD-BREAKERS — any stat milestone, all-time record, franchise first
2. CLUTCH MOMENTS — tied game, final seconds, must-score/must-stop situations
3. DISBELIEF PLAYS — something so good the commentator loses composure
4. COMEBACK SWINGS — lead changes, momentum shifts that flip the entire narrative
5. CROWD ERUPTION — plays where the crowd noise tells the story alone
6. CONTROVERSIAL CALLS — anything disputed, flagrant, ejection-worthy
7. PLAYER REACTIONS — raw celebrations, frustration, teammates going wild
8. HISTORIC FIRSTS — debut records, season bests, generational plays

RULES:
- Return 5 to 8 clips. Rank by how much someone would NEED to share this.
- Each clip: 15-55 seconds. Include lead-up + the play + immediate reaction.
- "hook": 3-7 ALL-CAPS words that serve as the on-screen title. ALWAYS name the player and/or team. Be specific.
  GREAT: "CURRY BREAKS ALL-TIME RECORD", "LEBRON GAME WINNER AT BUZZER", "WARRIORS COMPLETE THE COMEBACK", "REF BLOWS THIS CALL??"
  BAD: "Nice Play", "Big Moment", "Good Shot", "Highlights"
- "tags": 2-4 moment-type labels (e.g. ["Buzzer beater", "Game winner", "Record"])
- "scoreboard": score at the moment if inferable from commentary (e.g. "LAL 108 · GSW 110")
- "players": comma-separated names of players involved in the play
- "score": virality 0-99. Buzzer beaters, records, ejections = 90+. Good plays = 70-85.
- Return ONLY JSON:
{"clips":[{"chunk":1,"start":0,"end":30,"title":"short title","hook":"PUNCHY HOOK TEXT","score":94,"emotion":"disbelief","reasoning":"why someone MUST share this","tags":["Tag1","Tag2"],"scoreboard":"","players":""}]}

Transcript:
${transcript}`;

  const response = await withGroqRetry((client) => client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    ...groqChatParams(groqChatModel(), { maxTokens: 1400, temperature: 0.25, responseFormat: { type: "json_object" } }),
  }), { label: "Groq sports clip planning", attempts: 3, keySlot });

  const raw = response.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(cleanJson(raw));
  const clips = Array.isArray(parsed.clips) ? parsed.clips : [];
  const normalized = clips.map((clip, index) => {
    const base = normalizeCandidate(clip, index, duration, analysisChunks);
    if (!base) return null;
    return {
      ...base,
      tags: Array.isArray(clip.tags) ? clip.tags.slice(0, 4).map((t) => String(t).trim()).filter(Boolean) : [],
      scoreboard: String(clip.scoreboard || "").trim().slice(0, 40),
      players: String(clip.players || "").trim().slice(0, 120),
    };
  }).filter(Boolean);

  if (!normalized.length) {
    throw new Error("Groq sports clip planning returned no valid clips.");
  }
  return normalized.slice(0, 8);
}

// ─── End sports processing ────────────────────────────────────────────────────
