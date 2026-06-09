---
name: openclips-buffer-publisher
description: Automate the OpenClips podcast publishing loop. Use when Codex needs to find the newest videos from the configured tech, AI, finance, or business YouTube channels; load them into OpenClips; wait for generated clips; rank the top five clips; and schedule those clips to three Buffer channels on the next unscheduled publishing day.
---

# OpenClips Buffer Publisher

## Overview

Use this skill for the repeatable OpenClips batch workflow: newest source videos in, ranked vertical clips out, then live Buffer scheduling. **Always follow through to live scheduling** — do not stop at dry-run unless the user explicitly asks for a plan-only output.

Default workspace: `/home/user/openclips`  
Default OpenClips URL: `http://localhost:3000`  
Default timezone: `America/Chicago`

## Session startup (ALWAYS run first)

Before doing anything YouTube-related, run the yt-dlp setup script:

```bash
node scripts/setup-yt-dlp.mjs
```

This installs the auth cookies and config into `~/.config/yt-dlp/` so every yt-dlp call is authenticated. **Skip this and YouTube downloads will be blocked.** If cookies have expired, export fresh ones from a browser logged into YouTube and overwrite `references/youtube-cookies.txt`.

## YouTube bot-detection rules (CRITICAL)

Submitting multiple YouTube URLs simultaneously triggers concurrent yt-dlp processes, which causes 429 rate-limits and permanently locks the server IP. **Videos must be submitted one at a time.**

- `submit-openclips-projects.mjs` handles this automatically — it waits for each download to start before queuing the next, with a 45-second gap.
- **Never** pipe many URLs at once and skip staggering.
- **Never** restart the server while a yt-dlp download is in progress.
- If projects fail with 403 or "Sign in to confirm you're not a bot" — the IP is flagged. Start a fresh session (new container = new IP) and run `setup-yt-dlp.mjs` first.

## Deduplication rule (CRITICAL)

**Never schedule the same clip twice.** Before scheduling any clip, check:

1. For OpenClips-tracked clips: skip clips where `clip.bufferSchedules` has any entry with `status: "scheduled"`.
2. For `run-schedule-now.mjs` (standalone mode): skip filenames already in `ledger.scheduledClipFiles`.
3. For `buffer-schedule.mjs` (API mode): skip clip IDs already in `ledger.scheduledClipIds`.

If all available clips are already scheduled, report that fact and stop — do not re-schedule.

## Workflow

### Fast path (no server / no yt-dlp / no ffmpeg)

When pre-rendered clips already exist in `clips/`:

```bash
node scripts/run-schedule-now.mjs --live
```

This uploads each new clip in `clips/` to GitHub storage, schedules all three Buffer channels at the configured CT times, and updates the ledger. It skips any clip filename already in the ledger.

### Full pipeline path (server + yt-dlp + ffmpeg available)

1. **Session setup** (FIRST — every session)
   ```bash
   node scripts/setup-yt-dlp.mjs
   ```

2. **Source newest videos**
   - Read `references/channel-roster.md` for channels.
   - Run `node scripts/latest-youtube-search.mjs` to get fresh URLs via yt-dlp.

3. **Load into OpenClips**
   - Start OpenClips if needed: `npm run dev`
   - Run: `node scripts/latest-youtube-search.mjs | node scripts/submit-openclips-projects.mjs`
   - The script staggeres submissions automatically (45s between each).
   - Do not restart the server while ffmpeg jobs are active.

4. **Wait for rendering**
   - Monitor `GET /api/projects` or `data/projects.json` until target projects reach `status: "ready"`.
   - If a project fails, call `POST /api/projects/:id/reprocess` (requires source video).

5. **Rank clips**
   - Run: `node scripts/rank-openclips-clips.mjs`
   - This automatically excludes already-scheduled clips.
   - Confirm all 5 candidates have valid `downloadUrl` values.

6. **Schedule to Buffer — always live**
   - Run: `node scripts/buffer-schedule.mjs --live`
   - Or pipe from rank: `node scripts/rank-openclips-clips.mjs --json | node scripts/buffer-schedule.mjs --live --stdin-clips`
   - The script posts to all three channel IDs at 9:00, 10:30, 12:00, 13:30, 15:00 CT.
   - On success, the ledger is updated and the date is locked so it won't be reused.
   - Report the Buffer post IDs to confirm scheduling succeeded.

## Schedule times (America/Chicago)

| Slot | Local CT | UTC (CDT, summer) |
|---|---|---|
| 1 | 9:00 AM | 14:00 UTC |
| 2 | 10:30 AM | 15:30 UTC |
| 3 | 12:00 PM | 17:00 UTC |
| 4 | 1:30 PM | 18:30 UTC |
| 5 | 3:00 PM | 20:00 UTC |

## Scripts

| Script | Purpose |
|---|---|
| `scripts/setup-yt-dlp.mjs` | **Run first every session.** Sets up yt-dlp cookies + config. |
| `scripts/run-schedule-now.mjs --live` | Standalone: upload clips/ → GitHub → Buffer. No server required. |
| `scripts/latest-youtube-search.mjs` | Find newest YouTube URLs from channel roster via yt-dlp. |
| `scripts/submit-openclips-projects.mjs` | Queue source URLs one-at-a-time into OpenClips (staggered). |
| `scripts/rank-openclips-clips.mjs` | Rank ready clips; excludes already-scheduled ones. |
| `scripts/buffer-schedule.mjs --live` | Schedule top 5 via OpenClips API → Buffer. |

## Required environment variables

| Variable | Required for |
|---|---|
| `BUFFER_API_KEY` | All Buffer operations |
| `BUFFER_CHANNEL_IDS` | Targeting specific channels (3 IDs) |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub storage uploads |
| `GITHUB_STORAGE_REPO` | `PanavMhatre/openclips-media` (default) |
| `GITHUB_STORAGE_BRANCH` | e.g. `main` |
| `GITHUB_STORAGE_DIR` | e.g. `clips` |
| `GROQ_API_KEY` | Full pipeline (transcription + analysis) |
| `OPENCLIPS_BUFFER_LEDGER` | Optional — custom ledger path |

## Completion checklist

Before reporting the task as done:

- [ ] Confirmed no clip was already in the ledger / already had `bufferSchedules` entries.
- [ ] All scheduled clips have confirmed Buffer post IDs in the output.
- [ ] Ledger was saved with the new date and clip identifiers.
- [ ] Reported how many channels each clip was posted to.

## References

- `references/channel-roster.md` — YouTube channel list for discovery.
- `references/youtube-cookies.txt` — YouTube auth cookies (gitignored, refresh if bot-detection triggers).
- `references/openclips-workflow.md` — API reference, project states, reprocess endpoints.
- `references/buffer-scheduling.md` — Buffer API details, ledger format, media URL requirements.
