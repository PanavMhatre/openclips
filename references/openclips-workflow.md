# OpenClips Workflow Reference

API base: `http://localhost:3000` (override with `OPENCLIPS_URL` env var)

---

## Project Lifecycle

```
queued → fetching → transcribing → analyzing → rendering → ready
                                                          → error
```

- **queued** — waiting for a render slot
- **fetching** — downloading source video via yt-dlp
- **transcribing** — extracting audio and running Groq Whisper
- **analyzing** — selecting clip windows with Groq LLM
- **rendering** — ffmpeg producing vertical MP4 clips
- **ready** — all clips rendered and available
- **error** — processing failed; `project.error` has details

---

## Key API Endpoints

### List all projects
```
GET /api/projects
→ { projects: Project[] }
```
Returns all non-Sports projects sorted newest first.

### Submit a new project (URL)
```
POST /api/projects
Content-Type: application/json
{ "sourceUrl": "https://www.youtube.com/watch?v=..." }
→ 202 { project: Project }
```

### Check project status
```
GET /api/projects/:id
→ { project: Project }
```

### Reprocess a failed project (re-runs full pipeline from source)
```
POST /api/projects/:id/reprocess
→ 202 { project: Project }
```
Requires the source video to still exist (`canReprocessProject` = true).

### Re-render clips only (skip transcription/analysis)
```
POST /api/projects/:id/rerender
→ 202 { project: Project }
```
Requires `project.clips` to have retained source segments.

### Re-render a single clip
```
POST /api/projects/:id/clips/:clipId/rerender
→ 202 { project: Project }
```

### Delete a project
```
DELETE /api/projects/:id
→ { ok: true }
```

### Schedule a clip to Buffer
```
POST /api/projects/:id/clips/:clipId/schedule
Content-Type: application/json
{
  "channelIds": ["<bufferId1>", "<bufferId2>"],
  "mode": "customScheduled",          // or "addToQueue"
  "dueAt": "2024-06-15T14:00:00.000Z" // ISO 8601 UTC, required for customScheduled
}
→ 201 { ok: true, scheduled: [...], failed: [...], clip: Clip }
```

### List Buffer channels
```
GET /api/buffer/channels
→ { configured: bool, channels: Channel[], organizations: Org[] }
```

### Health check (shows which tools are available)
```
GET /api/health
→ { ok: true, tools: { ffmpeg, ffprobe, ytDlp, groq, buffer, ... } }
```

---

## Project Object Shape

```json
{
  "id": "uuid",
  "title": "Video title from yt-dlp",
  "sourceUrl": "https://...",
  "status": "ready",
  "statusLabel": "Ready",
  "progress": 100,
  "duration": 3600,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z",
  "clips": [ /* Clip[] */ ],
  "error": ""
}
```

## Clip Object Shape

```json
{
  "id": "uuid",
  "title": "Clip title",
  "hook": "The viral one-liner hook text",
  "focus": "What this clip teaches or demonstrates",
  "reasoning": "Why this was selected as a strong moment",
  "score": 82,
  "start": 312.5,
  "end": 358.2,
  "duration": 45.7,
  "downloadUrl": "/media/clips/clip-name-a1b2c3d4.mp4",
  "thumbnailUrl": "/media/thumbs/clip-name-a1b2c3d4.jpg",
  "srtUrl": "/media/clips/clip-name-a1b2c3d4.srt",
  "bufferSchedules": []
}
```

---

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `status: error`, error contains "Groq" | Missing or exhausted `GROQ_API_KEY` | Check `.env`, add key |
| `status: error`, error contains "audio" | Source video has no audio | Skip this URL |
| Project stuck in `fetching` | yt-dlp failed or URL region-locked | Check `yt-dlp` version, try alternate URL |
| Project stuck in `rendering` | ffmpeg OOM / timeout | Reduce `OPENCLIPS_MAX_RENDER_JOBS` to 1 |
| Clips render but `downloadUrl` is `/media/...` path | Local path only, no public URL configured | Set `OPENCLIPS_PUBLIC_BASE_URL` or configure Discord/GitHub storage |

---

## Monitoring Processing

Poll `GET /api/projects/:id` or read `data/projects.json` directly:

```bash
# Watch a project's status every 10 seconds
watch -n 10 "curl -s http://localhost:3000/api/projects/<id> | node -e \"const d=require('fs').readFileSync('/dev/stdin','utf8'); const p=JSON.parse(d).project; console.log(p.statusLabel, p.progress+'%', p.error||'')\""
```

Or inspect via the data file:
```bash
node -e "
const p = JSON.parse(require('fs').readFileSync('data/projects.json'));
Object.values(p).forEach(proj =>
  console.log(proj.status.padEnd(12), proj.progress+'%'.padEnd(5), proj.title?.slice(0,60))
);
"
```
