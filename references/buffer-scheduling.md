# Buffer Scheduling Reference

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `BUFFER_API_KEY` | Buffer GraphQL API bearer token (required for live scheduling) |
| `BUFFER_CHANNEL_IDS` | Comma-separated Buffer channel IDs (3 channels). Overrides include/exclude filters. |
| `OPENCLIPS_PUBLIC_BASE_URL` | Public base URL for clip media files (required for Buffer to fetch video assets) |
| `BUFFER_CHANNEL_INCLUDE` | Comma-separated channel name patterns to whitelist (default: `podbyteedits,podbyte`) |
| `BUFFER_CHANNEL_EXCLUDE` | Comma-separated channel name patterns to block (default: `clipvltdaily,clipvlt`) |
| `OPENCLIPS_BUFFER_LEDGER` | Path to the schedule ledger JSON (default: `~/.codex/openclips-buffer-publisher-ledger.json`) |

---

## Schedule Times

All five slots are in **America/Chicago** time:

| Slot | Local Time (CT) |
|---|---|
| 1 | 9:00 AM |
| 2 | 10:30 AM |
| 3 | 12:00 PM |
| 4 | 1:30 PM |
| 5 | 3:00 PM |

Each clip is posted to **all three Buffer channel IDs** at the same time.

---

## Ledger

The schedule ledger at `~/.codex/openclips-buffer-publisher-ledger.json` tracks which dates have already been scheduled. The `buffer-schedule.mjs` script reads it to find the next free date and writes to it after a successful live run.

Format:
```json
{
  "scheduledDates": ["2024-06-10", "2024-06-11"],
  "history": [
    {
      "date": "2024-06-10",
      "scheduledAt": "2024-06-09T20:00:00.000Z",
      "clips": [
        {
          "slot": 1,
          "time": "09:00",
          "dueAt": "2024-06-10T14:00:00.000Z",
          "projectId": "uuid",
          "clipId": "uuid",
          "hook": "Why AI pricing is broken",
          "success": true
        }
      ]
    }
  ]
}
```

To **re-schedule a date** already in the ledger, pass `--date YYYY-MM-DD` explicitly and confirm you want to reuse it, or remove the date from `scheduledDates` manually.

---

## Media URL Requirements

Buffer must be able to fetch the video asset from a public URL. This means:

1. **`OPENCLIPS_PUBLIC_BASE_URL` is set** — clips served via that base URL (e.g., a Cloudflare Tunnel, ngrok, or production deployment), **or**
2. **Discord storage is configured** (`DISCORD_WEBHOOK_URL`) — OpenClips uploads the clip to Discord CDN and passes that URL to Buffer, **or**
3. **GitHub storage is configured** (`GITHUB_STORAGE_*`) — clips uploaded to a public GitHub repo.

If none of these are available, `buffer-schedule.mjs --dry-run` still works and prints the schedule plan. Use the Buffer UI or Comet to manually upload the local MP4 files after getting the dry-run plan.

### Dry run vs live

```bash
# Always run dry-run first
node scripts/buffer-schedule.mjs --dry-run

# Then live when ready
node scripts/buffer-schedule.mjs --live
```

The dry-run validates clip availability, prints the schedule plan with exact UTC timestamps, and exits without calling any APIs.

---

## Buffer API

OpenClips uses the Buffer **GraphQL API** (`https://api.buffer.com/graphql`).

The `createPost` mutation used for scheduled posts:

```graphql
mutation CreatePost {
  createPost(input: {
    text: "..."
    channelId: "..."
    schedulingType: automatic
    mode: customScheduled
    dueAt: "2024-06-10T14:00:00.000Z"
    assets: [{ video: { url: "https://public-url/clip.mp4" } }]
  }) {
    ... on PostActionSuccess { post { id text } }
    ... on MutationError { message }
  }
}
```

For `addToQueue` mode, omit `dueAt` and set `mode: addToQueue`.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Buffer API key is not configured` | `BUFFER_API_KEY` missing | Set in `.env` |
| `No Buffer channels found` | Key valid but no channels match include/exclude filter | Set `BUFFER_CHANNEL_IDS` directly |
| `Buffer needs a public video URL` | No public media URL configured | Set `OPENCLIPS_PUBLIC_BASE_URL` or configure Discord/GitHub storage |
| `Buffer did not return a scheduled post` | API error or rate limit | Check Buffer dashboard, retry |
| `Blocked Buffer channel(s)` | Channel matched exclude filter | Check `BUFFER_CHANNEL_EXCLUDE` in `.env` |
