# OpenClips Workflow Reference

## Project Statuses

| Status | Meaning |
|---|---|
| `queued` | Waiting to start processing |
| `fetching` | Downloading source video via yt-dlp |
| `transcribing` | Extracting / transcribing audio with Groq |
| `analyzing` | AI clip selection running |
| `rendering` | FFmpeg vertical clip export in progress |
| `scheduling` | Uploading to cloud storage + sending to Buffer |
| `ready` | All clips rendered and scheduled |
| `failed` | Processing stopped with an error |

## API Endpoints (base: `http://localhost:3000`)

### Projects

| Method | Path | Body / Notes |
|---|---|---|
| `GET` | `/api/projects` | List all podcast projects (excludes Sports) |
| `GET` | `/api/projects/:id` | Single project with clips |
| `POST` | `/api/projects` | Create project. Body: `{ sourceUrl }` or multipart `video` file |
| `DELETE` | `/api/projects/:id` | Remove project and all assets |
| `POST` | `/api/projects/:id/reprocess` | Re-download + re-analyse from original source |
| `POST` | `/api/projects/:id/rerender` | Re-render clips from retained source segment |

### Clips

| Method | Path | Body |
|---|---|---|
| `PATCH` | `/api/projects/:id/clips/:clipId` | Edit `hook`, `title`, `focus`, `reasoning` |
| `POST` | `/api/projects/:id/clips/:clipId/rerender` | Re-render single clip |
| `POST` | `/api/projects/:id/clips/:clipId/schedule` | Schedule to Buffer (see below) |

### Buffer Schedule Endpoint

```
POST /api/projects/:id/clips/:clipId/schedule
Content-Type: application/json

{
  "channelIds": ["buffer-channel-id-1", "buffer-channel-id-2"],
  "mode": "customScheduled",
  "dueAt": "2025-01-15T15:00:00.000Z",
  "mediaUrl": "https://optional-public-url/clip.mp4"
}
```

Response includes `scheduled` array with `{ channelId, postId }` per channel.

### Health Check

```
GET /api/health
```

Returns `{ ok, tools: { ffmpeg, ytDlp, groq, buffer, githubStorage, ... } }`.

## Monitoring Processing

### Via API

Poll `GET /api/projects/:id` and watch `status` + `progress` fields.

Batch status check:
```bash
node -e "
  const r = await fetch('http://localhost:3000/api/projects');
  const { projects } = await r.json();
  for (const p of projects) {
    console.log(p.status.padEnd(12), p.progress + '%', p.title?.slice(0, 60));
  }
"
```

### Via data/projects.json

```bash
node -e "
  import { readFileSync } from 'fs';
  const ps = JSON.parse(readFileSync('data/projects.json', 'utf8'));
  for (const p of Object.values(ps)) {
    console.log(p.status.padEnd(12), p.title?.slice(0, 60));
  }
"
```

## Rerunning a Failed Project

```bash
# Reprocess (re-download + re-analyse) if source URL is available:
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/reprocess

# Rerender only (uses retained source segment, faster):
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/rerender
```

## Rerunning a Single Clip

```bash
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/clips/CLIP_ID/rerender
```

## Starting the Server

```bash
# From the repo root
npm run dev
```

Server listens on `http://localhost:3000`. Do not restart while ffmpeg render jobs are active -- check `status` fields first.
