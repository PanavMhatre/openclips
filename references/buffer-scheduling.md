# Buffer Scheduling Reference

## Required Setup

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BUFFER_API_KEY` | Yes (live) | Buffer GraphQL API bearer token |
| `BUFFER_CHANNEL_IDS` | Yes (live) | Comma-separated Buffer channel IDs for all 3 destination channels |
| `BUFFER_PUBLIC_CLIP_BASE_URL` | Conditional | Base URL that maps `/media/clips/...` paths to public MP4 URLs |
| `OPENCLIPS_BUFFER_LEDGER` | No | Custom path for the schedule ledger (default: `~/.codex/openclips-buffer-publisher-ledger.json`) |
| `OPENCLIPS_PUBLIC_BASE_URL` | Conditional | Alias for `BUFFER_PUBLIC_CLIP_BASE_URL` |

### Getting a Buffer API Key

1. Log in to [buffer.com](https://buffer.com) → Settings → Apps & Integrations → Developers.
2. Create a new app or copy the access token.
3. The token goes into `BUFFER_API_KEY`.

### Finding Channel IDs

Run the channels health endpoint after setting `BUFFER_API_KEY`:

```bash
curl -s http://localhost:3000/api/buffer/channels | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  (d.channels || []).forEach(c => console.log(c.id, c.service, c.name));
"
```

Copy the three channel IDs into `BUFFER_CHANNEL_IDS`.

## Schedule Times

All times are in **America/Chicago** (CST/CDT):

| Slot | Time |
|------|------|
| Clip 1 | 9:00 AM |
| Clip 2 | 10:30 AM |
| Clip 3 | 12:00 PM |
| Clip 4 | 1:30 PM |
| Clip 5 | 3:00 PM |

The script converts these to UTC ISO strings accounting for CST/CDT offset.

## Schedule Ledger

The ledger at `~/.codex/openclips-buffer-publisher-ledger.json` records every date that has been scheduled. The script automatically picks the next unscheduled date.

To view the ledger:

```bash
cat ~/.codex/openclips-buffer-publisher-ledger.json | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('Scheduled dates:', d.scheduledDates);
"
```

To force a specific date (must not be in ledger):

```bash
node scripts/buffer-schedule.mjs --date 2026-06-15 --dry-run
```

## Public Video URLs

Buffer requires clips to be hosted at a **publicly accessible URL**. Three options:

### Option 1: GitHub Storage (Recommended)
Set `GITHUB_STORAGE_REPO`, `GITHUB_STORAGE_BRANCH`, `GITHUB_STORAGE_DIR`, and `GITHUB_STORAGE_TOKEN` in `.env`. OpenClips automatically uploads clips to GitHub after rendering and stores the URL in `clip.githubMediaUrl`.

### Option 2: Discord Webhook
Set `DISCORD_WEBHOOK_URL`. OpenClips uploads clips as Discord attachments and stores the CDN URL in `clip.discordMediaUrl`.

### Option 3: Public Base URL
If OpenClips is publicly reachable (e.g., via ngrok or a VPS), set `BUFFER_PUBLIC_CLIP_BASE_URL` to the public root. The script appends `/media/clips/<filename>.mp4` to form the full URL.

### Option 4: Manual Upload
Run with `--dry-run` to generate the schedule plan, then upload each MP4 manually in the Buffer editor and paste the URL.

## Dry Run

Always run `--dry-run` first to verify the schedule:

```bash
node scripts/buffer-schedule.mjs --dry-run
```

This prints the full plan — dates, times, clip hooks, media URLs — without creating any Buffer posts or updating the ledger.

## Live Run

```bash
BUFFER_API_KEY=xxx \
BUFFER_CHANNEL_IDS=ch_id1,ch_id2,ch_id3 \
node scripts/buffer-schedule.mjs
```

On success:
- Buffer posts are created with `mode: customScheduled` at the specified `dueAt` times.
- The schedule date is written to the ledger so it won't be reused.

## Channel Filtering

If `BUFFER_CHANNEL_IDS` is not set, OpenClips falls back to `BUFFER_CHANNEL_INCLUDE` / `BUFFER_CHANNEL_EXCLUDE` patterns defined in `.env`. The include/exclude logic in the server is pattern-matched on channel name (case-insensitive, compact form). The external `buffer-schedule.mjs` uses explicit `BUFFER_CHANNEL_IDS` only.

## Buffer API Notes

- The GraphQL endpoint is `https://api.buffer.com`.
- `schedulingType: automatic` with `mode: customScheduled` and a `dueAt` ISO timestamp sets a specific publish time.
- `mode: addToQueue` adds to Buffer's sending queue (no specific time).
- For Instagram, metadata sets `type: reel, shouldShareToFeed: true`.
- For YouTube, metadata sets `title` and `categoryId` (default: `22` = People & Blogs).
- For TikTok, metadata sets `title`.
- Buffer rate-limits at 429 — the server retries with backoff; the script does not auto-retry on 429.

## Validation Checklist

Before marking the automation complete:

- [ ] All 5 selected clips have existing MP4 files or cloud URLs
- [ ] Schedule date is not already in the ledger
- [ ] Schedule times are exactly 90 minutes apart starting at 9:00 AM CST
- [ ] Dry run completed without errors
- [ ] For live mode: Buffer returned post IDs for all 5 × 3 = 15 posts
- [ ] For live mode: Ledger was updated with the new date
