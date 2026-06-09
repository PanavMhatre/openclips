# Buffer Scheduling Reference

## Authentication

Buffer uses a GraphQL API at `https://api.buffer.com`.

```
Authorization: Bearer <BUFFER_API_KEY>
Content-Type: application/json
```

Set `BUFFER_API_KEY` in `.env` (or your shell environment) before running
any scheduling scripts.

## Channel IDs

Set `BUFFER_CHANNEL_IDS` to a comma-separated list of Buffer channel IDs.

```
BUFFER_CHANNEL_IDS=abc123,def456,ghi789
```

To discover your channel IDs:
```bash
curl -s http://localhost:3000/api/buffer/channels | jq '.channels[].id'
```

Or run the server health check and look at the `buffer: true` field to
confirm the key is loaded, then hit the channels endpoint.

## Scheduling modes

| Mode | `mode` value | Notes |
|------|-------------|-------|
| Add to queue | `addToQueue` | Buffer picks the time slot automatically |
| Custom schedule | `customScheduled` | Requires `dueAt` in ISO 8601 UTC |

`buffer-schedule.mjs` always uses `customScheduled` so slots land at
exact times (9:00, 10:30, 12:00, 13:30, 15:00 America/Chicago).

## Time slots

Clips are published on a single day in ascending order:

| Slot | America/Chicago | UTC (CDT, UTC-5) | UTC (CST, UTC-6) |
|------|-----------------|------------------|------------------|
| 1    | 09:00           | 14:00            | 15:00            |
| 2    | 10:30           | 15:30            | 16:30            |
| 3    | 12:00           | 17:00            | 18:00            |
| 4    | 13:30           | 18:30            | 19:30            |
| 5    | 15:00           | 20:00            | 21:00            |

`buffer-schedule.mjs` handles the CDT/CST offset automatically using the
`Intl.DateTimeFormat` offset for `America/Chicago` on the target date.

## Ledger

The ledger prevents scheduling two batches on the same day.

Default path: `~/.codex/openclips-buffer-publisher-ledger.json`

Override with the `OPENCLIPS_BUFFER_LEDGER` environment variable.

Ledger format:
```json
[
  {
    "date": "2026-06-10",
    "clips": [
      {
        "slot": 1,
        "title": "Why AI Pricing Is Broken",
        "file": "why-ai-pricing-is-broken-c4208fba.mp4",
        "postIds": { "abc123": "post_xxx", "def456": "post_yyy", "ghi789": "post_zzz" }
      }
    ],
    "scheduledAt": "2026-06-09T14:00:00.000Z"
  }
]
```

## Video assets

Buffer requires a **publicly accessible** MP4 URL.

Options in order of preference:
1. `OPENCLIPS_PUBLIC_BASE_URL` — set a reverse-proxy or CDN base URL that
   maps local `clips/` files to public URLs.
2. GitHub raw URLs — if clips are committed to a public repo under `clips/`,
   use `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/clips/<file>`.
3. Discord CDN — the OpenClips server can upload clips to a Discord webhook
   and return the CDN URL.
4. Manual upload — download the clip locally, upload via Buffer web UI.

### GitHub raw URL pattern

```
https://raw.githubusercontent.com/panavmhatre/openclips/<branch>/clips/<filename>
```

`buffer-schedule.mjs` uses this pattern when `OPENCLIPS_PUBLIC_BASE_URL`
is not set and clips are found under `clips/` in the git repo.

## Dry-run

Always run with `--dry-run` first:

```bash
node scripts/buffer-schedule.mjs --dry-run
```

This prints the full schedule plan without calling Buffer or writing the
ledger, so you can verify dates, times, and clip selections.

## Live run

```bash
BUFFER_API_KEY=<token> \
BUFFER_CHANNEL_IDS=<id1,id2,id3> \
node scripts/buffer-schedule.mjs
```

On success, the ledger is updated and post IDs are printed.
