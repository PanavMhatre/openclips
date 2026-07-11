# OpenClips Strategy Brief

Generated: 2026-07-11T09:10:48Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 24 excluded | TT: 18 excluded | YT: 20 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 25% | TT 25%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 317 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (78 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #13 (43 avg) vs TikTok #1 (172 avg) — do not cross-post
- **Health/Diet**: IG #12 (78 avg) vs TikTok #2 (86 avg) — do not cross-post
- **Tax/Policy**: IG #5 (122 avg) vs TikTok #13 (1 avg) — do not cross-post
- **Business/Contrarian**: IG #14 (28 avg) vs TikTok #6 (22 avg) — do not cross-post
- **DeepMind**: IG #3 (127 avg) vs TikTok #10 (4 avg) — do not cross-post
- **Scaling Laws**: IG #7 (108 avg) vs TikTok #14 (0 avg) — do not cross-post

---

## Topic Performance

### Instagram (24 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 90 | 317 | 35.5 | 1.56% | 11.9s | FM6:spike,FM5:saturating |
| Sports Finance | 9 | 136 | 9.0 | 0.86% | 10.9s | — |
| DeepMind | 5 | 127 | 17.8 | 2.12% | 7.8s | — |
| AI Memory | 4 | 126 | 7.8 | 2.32% | 10.9s | FM7:underpub |
| Tax/Policy | 3 | 122 | 7.9 | 2.08% | 13.7s | FM7:underpub |
| DeepSeek/China | 10 | 121 | 12.0 | 2.15% | 9.0s | — |
| Scaling Laws | 2 | 108 | 10.3 | 0.00% | 5.3s | FM7:underpub |
| Startup Finance | 5 | 104 | 4.3 | 2.30% | 9.7s | — |
| General AI | 54 | 97 | 10.7 | 1.50% | 12.3s | FM6:spike |
| OpenAI/Pricing | 6 | 94 | 11.9 | 1.05% | 9.5s | — |
| Tesla/Elon | 20 | 89 | 15.4 | 1.17% | 9.6s | — |
| Health/Diet | 2 | 78 | 4.9 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 4 | 43 | 2.3 | 2.16% | 5.7s | FM6:spike,FM7:underpub |
| Business/Contrarian | 6 | 28 | 1.1 | 1.04% | 20.4s | FM6:spike |

### TikTok (18 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 4 | 172 | 9.1 | 1.44% | FM7:underpub |
| Health/Diet | 2 | 86 | 5.4 | 0.00% | FM7:underpub |
| Sports Finance | 8 | 78 | 4.3 | 0.55% | FM6:spike |
| Startup Finance | 5 | 33 | 1.2 | 0.39% | FM6:spike |
| NVIDIA/Compute | 79 | 30 | 3.9 | 0.90% | FM6:spike,FM5:saturating |
| Business/Contrarian | 6 | 22 | 0.8 | 0.40% | FM6:spike |
| General AI | 52 | 14 | 1.6 | 2.06% | FM6:spike |
| Tesla/Elon | 20 | 10 | 1.8 | 0.06% | FM6:spike,FM5:saturating |
| AI Memory | 3 | 4 | 0.2 | 0.00% | FM7:underpub |
| DeepMind | 5 | 4 | 0.3 | 0.00% | — |
| DeepSeek/China | 9 | 3 | 0.3 | 0.00% | — |
| OpenAI/Pricing | 6 | 3 | 0.3 | 0.00% | — |
| Tax/Policy | 3 | 1 | 0.1 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (20 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 30.6 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 21.2 | 0.00% | — |
| Tax/Policy | 2 | 432 | 15.6 | 0.00% | FM7:underpub |
| Tesla/Elon | 3 | 381 | 12.4 | 0.00% | FM6:spike,FM7:underpub |
| Sports Finance | 3 | 348 | 14.9 | 0.00% | FM7:underpub |
| Startup Finance | 5 | 318 | 13.0 | 0.00% | — |
| General AI | 110 | 253 | 8.8 | 0.00% | FM6:spike |
| AI Memory | 2 | 252 | 14.9 | 0.00% | FM7:underpub |
| Fed/Economy | 2 | 173 | 9.2 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 12 | 62 | 2.3 | 0.00% | FM6:spike |
| NVIDIA/Compute | 47 | 60 | 3.5 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 1.3 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.7 | 0.00% | FM7:underpub |
| DeepSeek/China | 8 | 8 | 0.8 | 0.00% | — |
| DeepMind | 2 | 2 | 0.4 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| Breaking-hook | 9 | 245 | 1.70% | 11.4s | Timeliness |
| How-hook | 24 | 223 | 1.29% | 9.9s | Reach/new audiences |
| Other-hook | 109 | 208 | 1.44% | 10.1s | Varies |
| The/Number-hook | 30 | 165 | 1.58% | 17.3s | Watch time/saves |
| Why-hook | 48 | 126 | 1.72% | 11.5s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 260 avg views vs 156 off-peak (1.7× multiplier)
- **45% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone, $300M funding, startup death, VC kill, funding round

---

## Avoid keywords

DeepSeek, China AI arms race, Tesla valuation (TikTok), TSLA, generic AI progress, AI is changing everything

---

## Weekly Saturation Watch

- **NVIDIA/Compute** (IG): wk1 262 → wk2 447 → wk3 210 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 4 posts, 126 avg views — test 5–8 more to confirm
- **Tax/Policy**: 3 posts, 122 avg views — test 5–8 more to confirm
- **Fed/Economy**: 4 posts, 172 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 86 avg views — test 5–8 more to confirm
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
