# OpenClips Buffer Publisher

Run the full publishing pipeline:
1. Discover the latest long-form video from each channel in `references/channel-roster.md` using the YouTube Data API v3.
2. Submit each URL to the local OpenClips server (`POST /api/projects`) for download, transcription, clip selection, and vertical rendering.
3. Poll `GET /api/projects` every 60 seconds until all submitted projects reach `status = "ready"` or `status = "failed"`. Log progress.
4. Run `node scripts/buffer-schedule.mjs --dry-run` and show the output. Ask the user to confirm before proceeding.
5. On confirmation, run `node scripts/buffer-schedule.mjs` (live) to schedule the top 5 clips to all three Buffer channels at 9:00 / 10:30 / 12:00 / 1:30 / 3:00 PM CT on the next unscheduled date.

## Required environment (must be in `.env` or shell)

| Variable | Purpose |
|---|---|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key — used by `latest-youtube-search.mjs` |
| `YT_COOKIES_FILE` | Path to Netscape cookies file — used by server yt-dlp calls |
| `GROQ_API_KEY` | Primary Groq key for transcription/analysis |
| `BUFFER_API_KEY` | Buffer API bearer token |
| `BUFFER_CHANNEL_IDS` | Comma-separated Buffer channel IDs (3 channels) |

## Step-by-step commands

```bash
# 1. Discover URLs
YOUTUBE_API_KEY=$YOUTUBE_API_KEY \
  node scripts/latest-youtube-search.mjs --count 1 --json > /tmp/yt-urls.json

# 2. Submit to OpenClips
node scripts/submit-openclips-projects.mjs --json < /tmp/yt-urls.json

# 3. Poll until ready (check every 60 s)
while true; do
  node -e "
    const r = await fetch('http://localhost:3000/api/projects');
    const { projects } = await r.json();
    const active = projects.filter(p => !['ready','failed'].includes(p.status));
    const ready = projects.filter(p => p.status === 'ready');
    const failed = projects.filter(p => p.status === 'failed');
    console.log(new Date().toLocaleTimeString(), '| active:', active.length, '| ready:', ready.length, '| failed:', failed.length);
    for (const p of projects) console.log(' ', p.status.padEnd(12), p.progress+'%', p.title?.slice(0,55));
    if (!active.length) process.exit(0);
  "
  sleep 60
done

# 4. Dry run — review before committing
BUFFER_CHANNEL_IDS=$BUFFER_CHANNEL_IDS \
  node scripts/buffer-schedule.mjs --dry-run

# 5. Live schedule (after confirmation)
BUFFER_CHANNEL_IDS=$BUFFER_CHANNEL_IDS \
  node scripts/buffer-schedule.mjs
```

## Channels (18 total)

**Tech & AI:** Lex Fridman, Y Combinator, a16z, Sequoia Capital, Greylock, Cognitive Revolution, Dwarkesh Podcast, BG2 Pod

**Finance & Business:** All-In Podcast, My First Million, Acquired Podcast, 20VC, Invest Like the Best, Patrick Boyle, Founders Podcast, How I Built This, Starter Story, The Knowledge Project

## Clip scoring (buffer-schedule.mjs internal ranking)

| Adjustment | Condition |
|---|---|
| base | `clip.score` from AI analysis (0–100) |
| +8 | clip has GitHub or Discord cloud URL |
| +5 | hook contains a named person or company |
| −10 | hook or focus is missing |
| −12 | clip already has a Buffer schedule |
| −20 | hook matches a generic/weak pattern |

## Schedule slots (America/Chicago)

9:00 AM · 10:30 AM · 12:00 PM · 1:30 PM · 3:00 PM

Published to all three Buffer channels simultaneously. Ledger at `~/.openclips/buffer-ledger.json` prevents duplicate dates.
