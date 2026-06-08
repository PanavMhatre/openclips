# Buffer Scheduling Reference

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BUFFER_API_KEY` | Yes (live) | Buffer GraphQL API bearer token |
| `BUFFER_CHANNEL_IDS` | Yes (live) | Comma-separated Buffer channel IDs for the three destination channels |
| `OPENCLIPS_PUBLIC_BASE_URL` | Optional | Base URL mapping `/media/clips/...` paths to public MP4 URLs |
| `OPENCLIPS_BUFFER_LEDGER` | Optional | Ledger file path. Default: `~/.openclips/buffer-ledger.json` |

## Schedule Times (America/Chicago)

Five clips per publishing day, spaced 90 minutes apart:

| Slot | Local Time (CT) |
|---|---|
| Clip 1 | 9:00 AM |
| Clip 2 | 10:30 AM |
| Clip 3 | 12:00 PM |
| Clip 4 | 1:30 PM |
| Clip 5 | 3:00 PM |

## Ledger File

The ledger tracks every date that has already been scheduled to prevent duplicate days.

Default path: `~/.openclips/buffer-ledger.json`
Override: set `OPENCLIPS_BUFFER_LEDGER` in `.env` or the environment.

Structure:
```json
{
  "scheduledDates": ["2025-01-10", "2025-01-11"],
  "entries": [
    {
      "date": "2025-01-10",
      "scheduledAt": "2025-01-09T20:00:00.000Z",
      "clips": [
        {
          "rank": 1,
          "projectId": "...",
          "clipId": "...",
          "hook": "HOOK TEXT",
          "dueAt": "2025-01-10T15:00:00.000Z",
          "channelIds": ["id1", "id2", "id3"],
          "postIds": ["buffer-post-id-1", "buffer-post-id-2", "buffer-post-id-3"]
        }
      ]
    }
  ]
}
```

## Dry Run

Always run dry-run first to confirm date selection, times, and clip assignments:

```bash
BUFFER_CHANNEL_IDS=id1,id2,id3 node scripts/buffer-schedule.mjs --dry-run
```

Dry-run output shows the full schedule table without writing to Buffer or the ledger.

## Live Scheduling Prerequisites

Before running live:

1. `BUFFER_API_KEY` is set and valid.
2. `BUFFER_CHANNEL_IDS` contains exactly three channel IDs (or as many as needed).
3. All five ranked clips have cloud-accessible MP4 URLs (`githubMediaUrl` or `discordMediaUrl`) OR `OPENCLIPS_PUBLIC_BASE_URL` is set to a publicly reachable base URL.
4. The target date is not already in the ledger.
5. Dry-run completed without errors.

## Live Scheduling

```bash
node scripts/buffer-schedule.mjs
```

The script:
1. Re-ranks clips from the current OpenClips projects.
2. Picks the next date not in the ledger.
3. Posts each clip to every channel at the assigned time via the OpenClips schedule API.
4. Appends the date + post IDs to the ledger.

## Buffer GraphQL API

OpenClips handles Buffer API calls internally through `POST /api/projects/:id/clips/:clipId/schedule`. The external scripts use that endpoint rather than calling Buffer directly. The server resolves media URLs (GitHub -> Discord -> local upload) and handles rate-limit retries.

Buffer channel IDs can be found via:
```bash
curl http://localhost:3000/api/buffer/channels | node -e "
  const chunks = []; process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    const { channels } = JSON.parse(Buffer.concat(chunks));
    channels.forEach(c => console.log(c.id, c.service, c.displayName));
  });
"
```
