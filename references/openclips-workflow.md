# OpenClips Workflow Reference

## Prerequisites

- Node.js ≥ 18 with ES-module support
- `ffmpeg` and `ffprobe` on `$PATH`
- `yt-dlp` on `$PATH` (for YouTube source discovery)
- `.env` file with `GROQ_API_KEY`, `BUFFER_API_KEY`, `BUFFER_CHANNEL_IDS`
- YouTube cookies (required in cloud/CI environments — see below)

## YouTube cookies (cloud environments)

YouTube blocks unauthenticated yt-dlp requests from cloud IPs with HTTP 429.
You must supply valid browser cookies:

1. Install the [Get cookies.txt LOCALLY](https://github.com/kairi003/Get-cookies.txt-LOCALLY) browser extension.
2. On youtube.com (while signed in), export cookies as `cookies.txt` in Netscape format.
3. Place the file at `~/.config/yt-dlp/cookies.txt`.
4. Run `node scripts/setup-ytdlp.mjs` to write the yt-dlp config file, or
   manually add `--cookies ~/.config/yt-dlp/cookies.txt` to `~/.config/yt-dlp/config`.

Set `YOUTUBE_COOKIES_FILE=/path/to/cookies.txt` in `.env` to use a non-default path.
`scripts/setup-ytdlp.mjs` reads this env var automatically.

## Starting the server

```bash
npm run dev          # development (Vite HMR + Express)
npm run preview      # production build preview
```

Default port: `3000`. Override with `PORT=` in `.env`.

## API Endpoints

### Projects

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List all podcast projects |
| GET | `/api/projects/:id` | Get one project with clips |
| POST | `/api/projects` | Submit a new source URL or file upload |
| DELETE | `/api/projects/:id` | Delete project and its assets |
| POST | `/api/projects/:id/reprocess` | Re-run full pipeline |
| POST | `/api/projects/:id/rerender` | Re-render clips only |

**Submit via URL:**
```bash
curl -s -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"sourceUrl":"<youtube-url>"}'
```

### Project statuses

| Status | Meaning |
|--------|---------|
| `queued` | Waiting for a free render slot |
| `fetching` | Downloading source video |
| `transcribing` | Extracting audio / calling Groq |
| `analyzing` | AI finding viral moments |
| `rendering` | ffmpeg compositing vertical clips |
| `scheduling` | Uploading and scheduling to Buffer |
| `ready` | Done — clips available |
| `failed` | Error — check `project.error` field |

### Clips

| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/projects/:id/clips/:clipId` | Edit hook / title / focus |
| POST | `/api/projects/:id/clips/:clipId/rerender` | Re-render one clip |
| POST | `/api/projects/:id/clips/:clipId/schedule` | Schedule clip to Buffer channels |

### Buffer

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/buffer/channels` | List configured Buffer channels |

### Health

```bash
curl -s http://localhost:3000/api/health | jq .
```

Returns availability of `ffmpeg`, `yt-dlp`, Groq keys, Buffer key, and
cloud storage backends.

## Data files

| Path | Content |
|------|---------|
| `data/projects.json` | Persisted project + clip metadata (gitignored) |
| `data/clips/` | Rendered MP4 files (gitignored) |
| `data/sources/` | Trimmed source segments per clip (gitignored) |
| `clips/` | Clips committed to git as GitHub-storage fallback |

## Rerun a failed project

```bash
# Check what failed
curl -s http://localhost:3000/api/projects/<id> | jq '{status:.project.status,error:.project.error}'

# Reprocess (re-downloads source, re-transcribes, re-renders)
curl -s -X POST http://localhost:3000/api/projects/<id>/reprocess

# Rerender only (keeps transcript, re-runs ffmpeg)
curl -s -X POST http://localhost:3000/api/projects/<id>/rerender
```

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `GROQ_API_KEY` | Yes | — | Transcription + clip analysis |
| `GROQ_API_KEYS` | No | — | Comma-separated pool for parallel jobs |
| `BUFFER_API_KEY` | Yes | — | Buffer GraphQL bearer token |
| `BUFFER_CHANNEL_IDS` | No | — | Explicit comma-separated channel IDs |
| `BUFFER_CHANNEL_INCLUDE` | No | `podbyteedits,podbyte` | Fuzzy-match allow-list |
| `BUFFER_CHANNEL_EXCLUDE` | No | `clipvltdaily,clipvlt` | Fuzzy-match block-list |
| `OPENCLIPS_PUBLIC_BASE_URL` | No | — | Public URL prefix for Buffer media |
| `GITHUB_STORAGE_TOKEN` | No | — | Enables GitHub clip storage |
| `DISCORD_WEBHOOK_URL` | No | — | Enables Discord clip upload |
| `OPENCLIPS_DEFAULT_CLIP_COUNT` | No | `3` | Clips per project |
| `OPENCLIPS_RENDER_FPS` | No | `30` | Render frame rate |
