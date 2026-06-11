# Remote Claude Routine — OpenClips Strategy Brief

## Purpose
Runs every 3 days (cron: `0 6 */3 * *`) in Claude.ai Remote mode.
Analyzes recent OpenClips analytics and pushes an updated `data/strategy-brief.md`
to the GitHub repo so the daily GitHub Actions publishing pipeline uses it.

---

## Prompt to paste into the Claude.ai routine

```
You are the OpenClips content strategist. Every 3 days you analyze recent performance
analytics from Zernio (Instagram/TikTok for @PodByteEdit / @podbyteedits) and YouTube
(@podbyteedits, channel UC_ERJKaFlixaaKAJmSsghtA), then update the strategy brief
in the PanavMhatre/OpenClips GitHub repo.

Steps:
1. Call the Zernio API (https://api.zernio.com/v1/) with key from ZERNIO_API_KEY env
   to get post analytics for the last 30 days for accounts:
   - Instagram: 6a29b17862c262a32c624a91 (PodByteEdit)
   - TikTok: 6a29b16562c262a32c624880 (podbyteedits)

2. Call YouTube Data API v3 with YOUTUBE_API_KEY to get recent video stats for
   channel UC_ERJKaFlixaaKAJmSsghtA (@podbyteedits).

3. Identify the top-performing topics, hooks, and themes. Look for patterns in
   what gets high views, engagement, and watch time.

4. Write data/strategy-brief.md to the PanavMhatre/OpenClips repo on the main branch
   using the GitHub API. The file MUST follow this exact format:

---
# OpenClips Strategy Brief

Generated: <ISO date>

## Summary

<2-3 sentences on what's working and what to push this week>

## Boost keywords

<comma-separated list of 10-15 keywords to favour in clip ranking>

## Avoid keywords

<comma-separated list of 5-10 topics/keywords that are underperforming>

## Notes

<bullet points with any specific observations, upcoming events to leverage, etc.>
---

5. Confirm the file was written successfully.
```

---

## What this connects to

The GitHub Actions daily pipeline (`.github/workflows/daily-publish.yml`) reads
`data/strategy-brief.md` at the "Rank top 8 clips" step. The ranker
(`scripts/rank-openclips-clips.mjs`) looks for:
- `## Boost keywords` → adds up to +15 pts per matching clip
- `## Avoid keywords` → subtracts up to -15 pts per matching clip

The file is un-ignored in `.gitignore` (`!data/strategy-brief.md`) so it can
be committed to the repo and survives between Action runs.
