# OpenClips Strategy Brief

Generated: 2026-07-30T10:05:13Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 0 excluded | YT: 0 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 18% | TT 19%
- Status: PASS

### FM-3 View velocity (age-corrected)
- VpD (views per day) column applied to all topic tables
- Status: **APPLIED**

### FM-4 Platform cross-posting divergence
- Topics where IG rank vs TT rank diverges ≥4 positions: see Divergence Alert below

### FM-5 Weekly saturation detection
- Applied per-topic: wk1/wk2/wk3 averages computed, FM5:saturating flag set if >40% wk-over-wk drop

### FM-6 Spike vs trend
- Topics where max_post > 3× median flagged as FM6:spike and excluded from Boost keywords

### FM-7 Underpublished high-performers
- Topics with <5 posts above platform median flagged as FM7:underpub

---

## Summary

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 283 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (51 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #11 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (223 avg) vs TikTok #7 (12 avg) — do not cross-post
- **Tax/Policy**: IG #7 (133 avg) vs TikTok #2 (52 avg) — do not cross-post
- **DeepMind**: IG #6 (134 avg) vs TikTok #10 (2 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (283 avg) vs TikTok #5 (33 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 83 | 283 | 14.7 | 0.91% | 11.0s | FM6:spike,FM5:saturating |
| Tesla/Elon | 34 | 223 | 13.6 | 0.83% | 9.6s | FM6:spike,FM5:saturating |
| General AI | 34 | 196 | 9.7 | 1.36% | 10.0s | FM6:spike |
| AI Memory | 1 | 151 | 8.6 | 0.66% | 20.5s | FM7:underpub |
| Sports Finance | 7 | 139 | 6.9 | 0.86% | 12.5s | — |
| DeepMind | 3 | 134 | 5.4 | 1.28% | 8.3s | FM7:underpub |
| Tax/Policy | 4 | 133 | 6.2 | 0.85% | 13.2s | FM7:underpub |
| DeepSeek/China | 9 | 119 | 4.6 | 2.39% | 8.6s | — |
| OpenAI/Pricing | 5 | 119 | 5.7 | 1.50% | 9.2s | — |
| Scaling Laws | 3 | 116 | 5.9 | 0.00% | 6.8s | FM7:underpub |
| Fed/Economy | 1 | 110 | 5.4 | 1.82% | 10.1s | FM7:underpub |

### TikTok (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 7.8 | 2.48% | FM7:underpub |
| Tax/Policy | 4 | 52 | 2.5 | 0.37% | FM6:spike,FM7:underpub |
| Sports Finance | 6 | 51 | 2.5 | 0.89% | FM6:spike |
| AI Memory | 1 | 44 | 2.5 | 2.27% | FM7:underpub |
| NVIDIA/Compute | 75 | 33 | 2.4 | 0.25% | FM6:spike |
| General AI | 33 | 25 | 1.3 | 0.22% | FM6:spike |
| Tesla/Elon | 31 | 12 | 0.7 | 0.50% | FM6:spike |
| DeepSeek/China | 9 | 4 | 0.2 | 0.00% | — |
| OpenAI/Pricing | 5 | 3 | 0.2 | 0.00% | — |
| DeepMind | 3 | 2 | 0.1 | 0.00% | FM7:underpub |
| Scaling Laws | 3 | 1 | 0.1 | 0.00% | FM7:underpub |

### YouTube (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 19.4 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 12.3 | 0.00% | — |
| Startup Finance | 5 | 318 | 7.3 | 0.00% | — |
| AI Memory | 2 | 252 | 7.0 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 4.6 | 0.00% | FM6:spike |
| General AI | 157 | 178 | 3.7 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 4.1 | 0.00% | FM6:spike |
| Tax/Policy | 5 | 173 | 3.7 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 4.6 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 15 | 50 | 1.1 | 0.00% | FM6:spike |
| NVIDIA/Compute | 64 | 45 | 1.3 | 0.00% | FM6:spike |
| Scaling Laws | 9 | 21 | 0.6 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 13 | 7 | 0.3 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 16 | 463 | 1.29% | 13.8s | Reach/new audiences |
| Breaking-hook | 4 | 430 | 2.12% | 10.3s | Timeliness |
| Other-hook | 121 | 205 | 1.02% | 10.4s | Varies |
| The/Number-hook | 20 | 198 | 0.93% | 9.1s | Watch time/saves |
| Why-hook | 23 | 177 | 1.04% | 9.4s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 293 avg views vs 253 off-peak (1.2× multiplier)
- **48% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize

---

## Avoid keywords

DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- **NVIDIA/Compute** (IG): wk1 0 → wk2 268 → wk3 121 views — reduce by 30–50%
- **Tesla/Elon** (IG): wk1 0 → wk2 409 → wk3 237 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 1 posts, 151 avg views — test 5–8 more to confirm
- **DeepMind**: 3 posts, 134 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 1 posts, 44 avg views — test 5–8 more to confirm
- **Crypto (TikTok)**: likely <5 posts — highest TikTok avg. Run 8 posts next 7 days.
- **AI Memory**: severely underproduced across all platforms; target 3 posts/week.
- **DeepMind achievements**: highest ER posts (6%+); schedule 1/week.

---

## Notes

- Jensen Huang direct-quote format ("just revealed", "casually drops") consistently yields 3.6–4.5% ER vs 0.7–1.5% for narrator summaries.
- The/Number-hooks drive the longest Instagram watch time (19s avg) — use for saves/algorithm reach.
- How-hooks drive the most raw views — use for audience growth posts.
- Why-hooks drive highest ER — use for shares/comments campaigns.
- YouTube contrarian finance (Acquired, $300M kills startups, Cowboys NFL finance) outperforms most AI clips.
- OpenAI/Pricing content averages <3 YouTube views and near-zero TikTok — halt production.
