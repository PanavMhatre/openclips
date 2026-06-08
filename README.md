# OpenClips

OpenClips is a local OpusClip-style clipping dashboard. It accepts a local video file or a public video URL, uses `yt-dlp` for URL imports, `ffmpeg` for vertical clip exports, Groq for transcription and clip analysis, and Buffer for automatic queue scheduling after render.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Requirements

- Node.js 20+
- `ffmpeg`
- `ffprobe`
- `yt-dlp` for public URL imports
- `GROQ_API_KEY` and/or `GROQ_API_KEYS` for Groq transcription and clip selection (required)
- `BUFFER_API_KEY` for automatic Buffer queue scheduling after each render (required)
- `DISCORD_WEBHOOK_URL` or GitHub storage settings so Buffer receives a public clip URL

If Groq, Buffer, or media upload configuration is missing, project processing fails instead of using local fallbacks.

## Buffer scheduling

Set `BUFFER_API_KEY` (required). After clips render, OpenClips automatically uploads each clip and adds it to the Buffer queue on all connected channels, or only the channels listed in `BUFFER_CHANNEL_IDS`. Manual rescheduling from the clip editor still works.

Podcast renders include subtle generated background music by default. Set `OPENCLIPS_BACKGROUND_MUSIC=false` to disable it or tune the level with `OPENCLIPS_BACKGROUND_MUSIC_VOLUME`.

## Storage

OpenClips treats imported source videos, extracted audio, source captions, and overlay images as scratch data. After a successful render it keeps the final clips plus short per-clip source snippets for rerendering, then removes the full imported source unless `OPENCLIPS_KEEP_FULL_SOURCE=true` is set.
