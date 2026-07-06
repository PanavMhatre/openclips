# OpenClips Strategy Brief

Generated: 2026-07-06T11:50:33Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 23 excluded | TT: 19 excluded | YT: 17 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 29% | TT 29%
- Status: **TRIGGERED — v2 classifier applied (17 buckets)**

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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 339 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (119 avg views) and Crypto (169 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #14 (35 avg) vs TikTok #2 (137 avg) — do not cross-post
- **Business/Contrarian**: IG #15 (34 avg) vs TikTok #5 (83 avg) — do not cross-post
- **Health/Diet**: IG #13 (78 avg) vs TikTok #4 (84 avg) — do not cross-post
- **AI Memory**: IG #2 (126 avg) vs TikTok #11 (4 avg) — do not cross-post
- **Tax/Policy**: IG #6 (122 avg) vs TikTok #14 (1 avg) — do not cross-post
- **Scaling Laws**: IG #8 (108 avg) vs TikTok #15 (0 avg) — do not cross-post

---

## Topic Performance

### Instagram (23 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 64 | 339 | 60.8 | 1.86% | 11.4s | FM6:spike |
| AI Memory | 4 | 126 | 11.3 | 2.32% | 10.9s | FM7:underpub |
| Crypto | 1 | 125 | 4.5 | 0.80% | 25.7s | FM7:underpub |
| DeepMind | 3 | 124 | 21.6 | 2.24% | 8.2s | FM7:underpub |
| Sports Finance | 12 | 122 | 12.0 | 0.64% | 9.6s | — |
| Tax/Policy | 3 | 122 | 17.2 | 2.08% | 13.7s | FM7:underpub |
| DeepSeek/China | 10 | 121 | 25.7 | 2.15% | 9.0s | — |
| Scaling Laws | 2 | 108 | 19.3 | 0.00% | 5.3s | FM7:underpub |
| Startup Finance | 5 | 104 | 5.3 | 2.30% | 9.7s | — |
| Tesla/Elon | 14 | 83 | 9.2 | 1.36% | 9.9s | — |
| OpenAI/Pricing | 4 | 82 | 10.7 | 0.72% | 10.8s | FM7:underpub |
| General AI | 55 | 78 | 9.6 | 1.31% | 11.9s | FM5:saturating |
| Health/Diet | 2 | 78 | 7.1 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 35 | 2.5 | 1.73% | 5.3s | FM6:spike |
| Business/Contrarian | 8 | 34 | 1.5 | 1.05% | 20.0s | FM6:spike |

### TikTok (19 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Crypto | 2 | 169 | 6.1 | 0.74% | FM7:underpub |
| Fed/Economy | 5 | 137 | 9.8 | 1.15% | — |
| Sports Finance | 11 | 119 | 6.7 | 0.96% | FM5:saturating |
| Health/Diet | 2 | 84 | 7.7 | 0.00% | FM7:underpub |
| Business/Contrarian | 8 | 83 | 3.3 | 0.81% | FM6:spike |
| Startup Finance | 5 | 33 | 1.5 | 0.39% | FM6:spike |
| NVIDIA/Compute | 57 | 29 | 3.9 | 1.18% | FM6:spike |
| General AI | 53 | 22 | 1.8 | 2.55% | FM6:spike |
| Tesla/Elon | 14 | 8 | 0.8 | 0.00% | FM6:spike |
| DeepMind | 3 | 5 | 0.6 | 0.00% | FM7:underpub |
| AI Memory | 3 | 4 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 9 | 3 | 0.6 | 0.00% | — |
| OpenAI/Pricing | 4 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |
| Tax/Policy | 3 | 1 | 0.2 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.1 | 0.00% | FM7:underpub |

### YouTube (17 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 36.0 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 26.2 | 0.00% | — |
| Tax/Policy | 2 | 432 | 18.9 | 0.00% | FM7:underpub |
| Tesla/Elon | 3 | 381 | 14.8 | 0.00% | FM6:spike,FM7:underpub |
| Sports Finance | 3 | 348 | 18.8 | 0.00% | FM7:underpub |
| Startup Finance | 5 | 318 | 16.3 | 0.00% | — |
| General AI | 93 | 299 | 12.5 | 0.00% | FM6:spike |
| AI Memory | 2 | 252 | 21.0 | 0.00% | FM7:underpub |
| Fed/Economy | 2 | 173 | 12.5 | 0.00% | FM7:underpub |
| NVIDIA/Compute | 33 | 84 | 7.0 | 0.00% | FM6:spike |
| OpenAI/Pricing | 11 | 67 | 3.0 | 0.00% | FM6:spike |
| Scaling Laws | 7 | 27 | 2.1 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 1.0 | 0.00% | FM7:underpub |
| DeepSeek/China | 7 | 8 | 1.1 | 0.00% | — |
| Health/Diet | 3 | 2 | 0.2 | 0.00% | FM6:spike,FM7:underpub |
| DeepMind | 1 | 0 | 0.0 | 0.00% | FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| Breaking-hook | 10 | 232 | 1.53% | 10.8s | Timeliness |
| Other-hook | 92 | 200 | 1.44% | 9.8s | Varies |
| How-hook | 17 | 165 | 1.28% | 8.8s | Reach/new audiences |
| The/Number-hook | 27 | 151 | 1.70% | 17.8s | Watch time/saves |
| Why-hook | 46 | 116 | 1.72% | 11.6s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 270 avg views vs 131 off-peak (2.1× multiplier)
- **43% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, $300M funding, startup death, VC kill, funding round

---

## Avoid keywords

Tesla valuation (TikTok), TSLA, generic AI progress, AI is changing everything, DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- **General AI** (IG): wk1 133 → wk2 121 → wk3 53 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 4 posts, 126 avg views — test 5–8 more to confirm
- **Crypto**: 1 posts, 125 avg views — test 5–8 more to confirm
- **DeepMind**: 3 posts, 124 avg views — test 5–8 more to confirm
- **Tax/Policy**: 3 posts, 122 avg views — test 5–8 more to confirm
- **Crypto**: 2 posts, 169 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 84 avg views — test 5–8 more to confirm
- **DeepMind**: 3 posts, 5 avg views — test 5–8 more to confirm
- **AI Memory**: 3 posts, 4 avg views — test 5–8 more to confirm
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
