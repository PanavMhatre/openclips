---
name: openclips-buffer-publisher
description: Run the full OpenClips → Buffer publishing loop. Finds the newest podcast videos from configured YouTube channels, processes them through OpenClips (transcription + AI clip selection + vertical rendering), ranks the top clips, and schedules them to all configured Buffer channels on the next open publishing day.
argument-hint: "[--dry-run] [--skip-fetch] [--date YYYY-MM-DD]"
allowed-tools: Bash Read Write Edit Glob Grep
---

# OpenClips Buffer Publisher

## Environment snapshot

```!
cd /Users/panavmhatre/Desktop/Coding/OpenClips

echo "=== Working directory ==="
pwd

echo ""
echo "=== yt-dlp / ffmpeg ==="
yt-dlp --version 2>/dev/null || echo "yt-dlp: NOT FOUND"
ffmpeg -version 2>/dev/null | head -1 || echo "ffmpeg: NOT FOUND"

echo ""
echo "=== yt-dlp config ==="
cat ~/.config/yt-dlp/config 2>/dev/null || echo "(no config — run: node scripts/setup-ytdlp.mjs)"

echo ""
echo "=== OpenClips server ==="
curl -s --max-time 3 http://localhost:3000/api/health 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    t = d.get('tools', {})
    print('Running. Tools:', ', '.join(k for k, v in t.items() if v))
    missing = [k for k, v in t.items() if not v]
    if missing: print('Missing:', ', '.join(missing))
except: print('Not running')
" 2>/dev/null || echo "Not running"

echo ""
echo "=== Ledger (last 2 entries) ==="
python3 -c "
import json, os
p = os.path.expanduser('~/.codex/openclips-buffer-publisher-ledger.json')
if os.path.exists(p):
    data = json.load(open(p))
    for e in data[-2:]:
        clips = e.get('clips', [])
        n_posted = sum(1 for c in clips if c.get('postIds'))
        print(f\"  {e['date']}  {len(clips)} clips  {n_posted} with post IDs\")
else:
    print('  (empty)')
" 2>/dev/null

echo ""
echo "=== .env keys present ==="
python3 -c "
import os
keys = ['GROQ_API_KEY', 'BUFFER_API_KEY', 'BUFFER_CHANNEL_IDS', 'GITHUB_STORAGE_TOKEN']
for k in keys:
    v = os.environ.get(k, '')
    print(f'  {k}: {\"SET\" if v else \"MISSING\"} {(\"(\" + v[:8] + \"...\") if v else \"\"}')
" 2>/dev/null
```

## Arguments

$ARGUMENTS

Parse any of these flags from $ARGUMENTS:
- `--dry-run` → run the full workflow but call `buffer-schedule.mjs --dry-run` instead of live scheduling
- `--skip-fetch` → skip YouTube search and re-use the most recent ready projects already in OpenClips
- `--date YYYY-MM-DD` → pass `--date=YYYY-MM-DD` to the scheduler to force a specific publishing date

## Your task

Run the full OpenClips → Buffer publishing loop in order. All scripts live in `scripts/` inside the workspace. Work from the workspace root (`/Users/panavmhatre/Desktop/Coding/OpenClips`).

---

### Step 0 — Pre-flight checks

Before doing anything else:

1. If yt-dlp or ffmpeg is missing, stop and tell the user what to install (`brew install yt-dlp ffmpeg`).
2. If `GROQ_API_KEY` or `BUFFER_API_KEY` is missing from the environment, stop and tell the user which `.env` keys to fill in.
3. If `~/.config/yt-dlp/config` does not exist or does not contain `--no-check-certificate`, run:
   ```
   node scripts/setup-ytdlp.mjs
   ```
4. If `~/.config/yt-dlp/cookies.txt` does not exist, warn the user once that YouTube may rate-limit and continue. Do not stop.

---

### Step 1 — Start OpenClips server (if not running)

Check `http://localhost:3000/api/health`. If it does not respond:

```bash
npm run dev &
```

Wait up to 10 seconds for it to become healthy. If it never responds, stop and report the error output.

Once running, confirm that the health response shows `ffmpeg: true`, `ytDlp: true`, and `groq: true`. If any of these are `false`, warn the user and stop.

---

### Step 2 — Find newest source videos (skip if --skip-fetch)

Unless `--skip-fetch` was passed, run the YouTube search:

```bash
node scripts/latest-youtube-search.mjs --limit=1 --output=/tmp/oc-fresh-urls.json
```

This reads `references/channel-roster.md` and queries each channel for its newest podcast-length video. It writes a JSON array to `/tmp/oc-fresh-urls.json`.

If the script exits with an error (no yt-dlp, all searches fail), stop and report. If some channels return no results, continue with whatever was found.

Read `/tmp/oc-fresh-urls.json` and show the user the list of videos that will be submitted.

---

### Step 3 — Submit source videos to OpenClips

Run:

```bash
node scripts/submit-openclips-projects.mjs \
  --input=/tmp/oc-fresh-urls.json \
  --poll-interval=10000 \
  --timeout=3600000 \
  --output=/tmp/oc-finished-projects.json
```

This queues each URL as an OpenClips project, then polls every 10 seconds until every project reaches `ready` or `failed` (up to 1 hour total).

Print a one-line status update every time the script logs a status change. When polling completes, summarise: how many are `ready`, how many `failed`, and the error message for any that failed.

If zero projects finished as `ready`, stop here with a clear error. Do not proceed to ranking.

---

### Step 4 — Rank clips

Run:

```bash
node scripts/rank-openclips-clips.mjs --top=8 --output=/tmp/oc-top8.json
```

Read `/tmp/oc-top8.json` and print the ranked list:
- Rank, score, title/hook, duration, source project

If fewer than 3 clips are available, warn the user and ask whether to continue. If they say yes, proceed. If they say no, stop.

---

### Step 5 — Schedule to Buffer

**Dry run:**
```bash
node scripts/buffer-schedule.mjs \
  --clips=/tmp/oc-top8.json \
  [--date=YYYY-MM-DD if provided] \
  --dry-run
```

Show the user the full dry-run output (date, times, clip titles, public URLs). Ask them to confirm before proceeding to the live run. Skip this confirmation step only if `--dry-run` was passed to the skill (in that case, stop after showing the dry-run plan).

**Live run** (after confirmation):
```bash
node scripts/buffer-schedule.mjs \
  --clips=/tmp/oc-top8.json \
  [--date=YYYY-MM-DD if provided]
```

On success, print the schedule summary: date, each slot's time and clip title, and the Buffer post IDs.

**If the live run fails** because `OPENCLIPS_PUBLIC_BASE_URL` is not set and GitHub raw URLs return 404:
1. Check whether the clips are in `data/clips/` (they will be if `OPENCLIPS_DELETE_LOCAL_VIDEO_AFTER_CLOUD=false`).
2. If clips are local, tell the user to either set `OPENCLIPS_PUBLIC_BASE_URL` to a reachable base URL, or use the OpenClips UI to schedule manually.
3. If `githubStorage: true` in the health check, tell the user to check that `GITHUB_STORAGE_TOKEN` has read access on the storage repo.

---

### Step 5.5 — Cleanup old source files

After a successful live schedule, always run:

```bash
node scripts/cleanup-old-sources.mjs
```

This deletes source videos (full YouTube downloads) older than 5 days. Clips in `data/clips/` are never touched. Report how much disk space was freed.

---

### Step 6 — Report

Summarise what happened:
- How many source videos were fetched and processed
- How many clips were ranked (and top-5 hooks)
- Publishing date and time slots
- Buffer post IDs (or "dry run — not scheduled")
- Any warnings or failures

If anything failed, tell the user exactly what the next manual step is.

---

## Reference files

- `references/channel-roster.md` — YouTube channels to search
- `references/openclips-workflow.md` — API endpoints, statuses, env vars
- `references/buffer-scheduling.md` — Buffer auth, slots, ledger, URL options

## Undo last schedule

To cancel the most recently scheduled Buffer posts:
```bash
node scripts/buffer-schedule.mjs --undo
```
