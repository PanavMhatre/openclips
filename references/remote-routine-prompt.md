# Remote Claude Routine — OpenClips Strategy Brief

## Purpose
Runs every 3 days (cron: `0 6 */3 * *`) in Claude.ai Remote mode.
Analyzes recent OpenClips analytics and commits an updated `data/strategy-brief.md`
to the GitHub repo so the daily GitHub Actions publishing pipeline uses it.

---

## Prompt to paste into the Claude.ai routine

```
You are the OpenClips content strategist. Every 3 days you analyze recent performance
analytics from Zernio (Instagram/TikTok) and YouTube, then commit an updated strategy
brief to the GitHub repo PanavMhatre/OpenClips so the daily publishing pipeline uses it.

Step 1 — Fetch Zernio analytics (last 30 days):
  GET https://api.zernio.com/v1/analytics?accountId=6a29b17862c262a32c624a91&fromDate=<30-days-ago>&toDate=<today>
  Header: Authorization: Bearer <YOUR_ZERNIO_API_KEY>
  (Instagram — PodByteEdit)

  GET https://api.zernio.com/v1/analytics?accountId=6a29b16562c262a32c624880&fromDate=<30-days-ago>&toDate=<today>
  Header: Authorization: Bearer <YOUR_ZERNIO_API_KEY>
  (TikTok — podbyteedits)

Step 2 — Fetch YouTube stats for own channel:
  GET https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=UC_ERJKaFlixaaKAJmSsghtA&key=AIzaSyAx2BDCbCmWQj_KG2nahp0UJCFLfjclCnY
  Then fetch video stats for the uploads playlist (up to 50 videos).

Step 3 — Analyze: identify top-performing topics, hooks, and themes by engagement
  and views. Note what's working and what isn't.

Step 4 — Commit data/strategy-brief.md to GitHub using the API:

  First get the current file SHA:
  GET https://api.github.com/repos/PanavMhatre/openclips/contents/data/strategy-brief.md
  Header: Authorization: token <YOUR_GITHUB_TOKEN>

  Then PUT the new content (base64-encoded):
  PUT https://api.github.com/repos/PanavMhatre/openclips/contents/data/strategy-brief.md
  Header: Authorization: token <YOUR_GITHUB_TOKEN>
  Body:
  {
    "message": "Strategy brief update <date>",
    "content": "<base64 of the brief>",
    "sha": "<sha from GET above>",
    "branch": "main"
  }

  The brief MUST use this exact format so the ranker can parse it:

  # OpenClips Strategy Brief

  Generated: <ISO date>

  ## Summary

  <2-3 sentences on what's working and what to push this week>

  ## Boost keywords

  <comma-separated list of 10-15 keywords — topics that get high engagement>

  ## Avoid keywords

  <comma-separated list of 5-10 topics that underperform>

  ## Notes

  <bullet points with specific observations>

Step 5 — Confirm the PUT returned HTTP 200 or 201 and log the commit SHA.
```

---

## How it connects to the pipeline

- GitHub Action runs daily at 2am CST → `git checkout` pulls latest repo including this file
- Ranker (`scripts/rank-openclips-clips.mjs`) reads `## Boost keywords` (+15 pts) and `## Avoid keywords` (-15 pts)
- File is tracked in git (`!data/strategy-brief.md` in .gitignore) so it persists across all runs
