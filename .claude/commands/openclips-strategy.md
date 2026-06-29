---
name: openclips-strategy
description: Read the current OpenClips strategy brief and surface actionable recommendations — top topics, platform divergence alerts, hook types, timing, and underpublished opportunities. Optionally refresh the brief from live analytics first.
argument-hint: "[--refresh]"
allowed-tools: Bash Read Glob
---

# OpenClips Strategy

## Arguments

$ARGUMENTS

- `--refresh` → run `scripts/update-strategy-brief.py` first to pull live Zernio + YouTube data before presenting the brief

## Your task

Surface the key strategic decisions from `data/strategy-brief.md`. This is a data-driven brief generated daily by GitHub Actions — read it and translate it into a tight executive summary the user can act on immediately.

---

### Step 0 — Optionally refresh the brief

If `--refresh` was passed, run:

```bash
cd /home/user/openclips && python3 scripts/update-strategy-brief.py
```

This requires `ZERNIO_API_KEY`, `YOUTUBE_API_KEY`, and `GITHUB_STORAGE_TOKEN` (or `GITHUB_TOKEN`) in the environment. If any are missing, warn the user and skip the refresh — fall back to the cached brief.

---

### Step 1 — Read the brief

Read `data/strategy-brief.md`.

Note the `Generated:` timestamp at the top. If it is more than 36 hours old, warn the user: "Brief is N hours old — consider running with `--refresh`."

---

### Step 2 — Present the strategy

Structure your output as follows. Pull every number directly from the brief — no rounding, no paraphrasing beyond what is needed for clarity.

#### Platform split (lead with this)

State the single most important strategic direction in one sentence — e.g. which platform each content category belongs on. Use the **Platform Divergence Alert** section of the brief to flag any cross-posting traps the user should avoid this week.

#### Top topics by platform

For each platform (IG, TikTok, YouTube), list the top 3 topics by average views. For each topic show: avg views, views/day, ER%, and any FM flags. Bold any FM7:underpub topics — these are the highest-leverage production opportunities.

#### Underpublished opportunities (action queue)

List every FM7:underpub topic that is also above the platform median. For each, give the current post count and the recommended test volume. Present this as a prioritised to-do list.

#### Hook guidance

State which hook type drives the most raw views (audience growth) and which drives the highest ER (shares/engagement). Cite the average views and ER% for each from the brief.

#### Timing

State the optimal posting window in UTC and the view multiplier vs off-peak. State what percentage of current posts land in this window and whether there is room to shift more.

#### Boost / Avoid keywords

List the boost keywords from the brief (topics with ≥5 posts, no FM6 spike, above-median). List the avoid keywords. Keep both lists verbatim.

#### Saturation watch

List any topics flagged FM5:saturating with their wk1→wk2→wk3 view trajectory. Give the recommended volume cut.

---

### Step 3 — One-paragraph "this week" action plan

Synthesise the above into a single paragraph the user can paste into a brief or share with a production team. Lead with the biggest lever, then the second and third priority.

---

## Reference files

- `data/strategy-brief.md` — the FM-corrected analytics brief (updated daily at 07:47 UTC)
- `scripts/update-strategy-brief.py` — fetches Zernio + YouTube and commits a fresh brief
- `.github/workflows/strategy-update.yml` — the scheduled workflow that runs the script
