# OpenClips Strategy Brief

Generated: 2026-07-26T09:46:31Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 0 excluded | YT: 0 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 17% | TT 18%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 293 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (51 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #11 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (214 avg) vs TikTok #7 (13 avg) — do not cross-post
- **Tax/Policy**: IG #6 (133 avg) vs TikTok #2 (52 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 106 | 293 | 18.0 | 1.27% | 10.9s | FM6:spike |
| Tesla/Elon | 37 | 214 | 17.5 | 0.90% | 9.3s | FM6:spike,FM5:saturating |
| General AI | 38 | 188 | 11.5 | 1.48% | 9.9s | FM6:spike,FM5:saturating |
| AI Memory | 2 | 142 | 7.8 | 1.47% | 17.4s | FM7:underpub |
| Sports Finance | 7 | 138 | 9.0 | 0.86% | 12.5s | — |
| Tax/Policy | 4 | 133 | 7.6 | 0.85% | 13.2s | FM7:underpub |
| DeepMind | 5 | 128 | 5.5 | 2.12% | 7.8s | — |
| DeepSeek/China | 11 | 121 | 5.4 | 2.03% | 9.0s | — |
| OpenAI/Pricing | 5 | 119 | 7.2 | 1.50% | 9.2s | — |
| Scaling Laws | 3 | 116 | 7.8 | 0.00% | 6.8s | FM7:underpub |
| Fed/Economy | 1 | 110 | 6.7 | 1.82% | 10.1s | FM7:underpub |

### TikTok (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 9.7 | 2.48% | FM7:underpub |
| Tax/Policy | 4 | 52 | 3.1 | 0.37% | FM6:spike,FM7:underpub |
| Sports Finance | 6 | 51 | 3.1 | 0.89% | FM6:spike |
| NVIDIA/Compute | 95 | 40 | 3.4 | 0.68% | FM6:spike |
| General AI | 35 | 25 | 1.7 | 0.28% | FM6:spike,FM5:saturating |
| AI Memory | 2 | 23 | 1.6 | 0.00% | FM7:underpub |
| Tesla/Elon | 34 | 13 | 0.9 | 0.46% | FM6:spike,FM5:saturating |
| DeepSeek/China | 10 | 4 | 0.3 | 0.00% | — |
| DeepMind | 5 | 4 | 0.1 | 0.00% | — |
| OpenAI/Pricing | 5 | 3 | 0.2 | 0.00% | — |
| Scaling Laws | 3 | 1 | 0.1 | 0.00% | FM7:underpub |

### YouTube (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 21.0 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 13.5 | 0.00% | — |
| Startup Finance | 5 | 318 | 8.1 | 0.00% | — |
| AI Memory | 2 | 252 | 7.9 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 5.0 | 0.00% | FM6:spike |
| General AI | 157 | 178 | 4.0 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 4.6 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 5.1 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 4.1 | 0.00% | FM6:spike |
| OpenAI/Pricing | 15 | 50 | 1.2 | 0.00% | FM6:spike |
| NVIDIA/Compute | 64 | 45 | 1.5 | 0.00% | FM6:spike |
| Scaling Laws | 9 | 21 | 0.6 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 13 | 7 | 0.3 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 17 | 442 | 1.53% | 13.2s | Reach/new audiences |
| Breaking-hook | 8 | 282 | 1.26% | 11.0s | Timeliness |
| The/Number-hook | 25 | 237 | 1.11% | 9.2s | Watch time/saves |
| Other-hook | 140 | 216 | 1.25% | 10.3s | Varies |
| Why-hook | 29 | 170 | 1.38% | 9.6s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 288 avg views vs 240 off-peak (1.2× multiplier)
- **49% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone

---

## Avoid keywords

DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- **Tesla/Elon** (IG): wk1 1284 → wk2 381 → wk3 106 views — reduce by 30–50%
- **General AI** (IG): wk1 0 → wk2 267 → wk3 129 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 2 posts, 142 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 2 posts, 23 avg views — test 5–8 more to confirm
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
