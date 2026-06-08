# OpenClips Workflow Reference

## Server

Start the dev server from the workspace root:

```bash
npm run dev
# OpenClips running at http://localhost:3000
```

The server must be running for all API calls. It listens on `PORT` (default 3000).

## API Endpoints

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all podcast projects (sorted newest first) |
| POST | `/api/projects` | Submit a new project — body: `{ sourceUrl }` or multipart `video` file |
| GET | `/api/projects/:id` | Get a single project |
| DELETE | `/api/projects/:id` | Delete a project and all its assets |
| POST | `/api/projects/:id/reprocess` | Re-run the full pipeline (requires original source on disk) |
| POST | `/api/projects/:id/rerender` | Re-render clips only (keeps transcript and clip windows) |

### Clips

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/projects/:id/clips/:clipId` | Edit hook / title / focus — triggers re-render if content changed |
| POST | `/api/projects/:id/clips/:clipId/rerender` | Re-render a single clip |
| POST | `/api/projects/:id/clips/:clipId/schedule` | Schedule a clip to Buffer manually |

### Buffer

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/buffer/channels` | List connected Buffer channels |

### Health

```bash
curl http://localhost:3000/api/health
```

Returns `{ ok, tools: { ffmpeg, ffprobe, ytDlp, groq, buffer, discordStorage, githubStorage, publicMediaBase } }`.

## Project Status Flow

```
queued → fetching → transcribing → analyzing → rendering → scheduling → ready
                                                                  ↓
                                                               failed
```

| Status | Meaning |
|--------|---------|
| `queued` | Waiting for a render slot |
| `fetching` | Downloading source video via yt-dlp |
| `transcribing` | Groq Whisper is transcribing audio |
| `analyzing` | Groq LLM is finding viral moments |
| `rendering` | ffmpeg is encoding vertical clips |
| `scheduling` | Uploading clips and posting to Buffer |
| `ready` | All done, clips available |
| `failed` | Pipeline error — check `project.error` |

## Monitoring Projects via API

Poll `/api/projects` and filter by status to monitor batch progress:

```bash
watch -n 5 'curl -s http://localhost:3000/api/projects | node -e "
  const d = JSON.parse(require(\"fs\").readFileSync(\"/dev/stdin\",\"utf8\"));
  d.projects.forEach(p => console.log(p.status.padEnd(12), p.progress + \"%\", p.title));
"'
```

Or check `data/projects.json` directly (file is updated after each status change).

## Re-running a Failed Project

If a project fails but the source URL is still valid:

```bash
# Reprocess from scratch (re-downloads, re-transcribes, re-renders)
curl -s -X POST http://localhost:3000/api/projects/<id>/reprocess
```

If the source file is still on disk, reprocess is fast. If the source is gone, delete and resubmit.

## Re-rendering Clips Only

If transcript is intact but you want fresh renders (e.g., after updating hooks):

```bash
curl -s -X POST http://localhost:3000/api/projects/<id>/rerender
```

## Rerendering a Single Clip

```bash
curl -s -X POST http://localhost:3000/api/projects/<id>/clips/<clipId>/rerender
```

## Storage Layout

```
data/
  projects.json     Project metadata
  uploads/          Uploaded video files (temporary)
  sources/          Source videos after yt-dlp import (temporary unless KEEP_FULL_SOURCE=true)
  clips/            Rendered vertical MP4s + SRT + XML
  thumbs/           JPEG thumbnails
  audio/            Extracted MP3 audio (temporary)
  captions/         Source caption files (temporary)
  overlays/         Generated overlay PNG files
```

Per-clip source segments are kept after rendering to enable single-clip rerender without the full source.
Set `OPENCLIPS_KEEP_FULL_SOURCE=true` to retain the full imported source permanently.

## ffmpeg Jobs

OpenClips limits concurrent ffmpeg render jobs via `OPENCLIPS_MAX_RENDER_JOBS` (default: 1).
Do not restart the server while ffmpeg jobs are active — jobs in progress are lost.

To check if any jobs are active:
- Watch the `statusLabel` field on projects (e.g., "Rendering clip 1/3… 54%").
- Or check `GET /api/projects` for projects with status `rendering`.
