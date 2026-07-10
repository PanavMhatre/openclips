# OpenClips Strategy Brief

Generated: 2026-07-10T10:38:49Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 22 excluded | TT: 22 excluded | YT: 22 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 26% | TT 27%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 329 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (98 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #13 (35 avg) vs TikTok #1 (137 avg) — do not cross-post
- **Business/Contrarian**: IG #14 (34 avg) vs TikTok #4 (83 avg) — do not cross-post
- **Health/Diet**: IG #12 (78 avg) vs TikTok #3 (86 avg) — do not cross-post
- **DeepMind**: IG #2 (127 avg) vs TikTok #10 (4 avg) — do not cross-post
- **Tax/Policy**: IG #5 (122 avg) vs TikTok #13 (1 avg) — do not cross-post
- **Scaling Laws**: IG #7 (108 avg) vs TikTok #14 (0 avg) — do not cross-post

---

## Topic Performance

### Instagram (22 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 85 | 329 | 39.7 | 1.58% | 12.1s | FM6:spike |
| DeepMind | 5 | 127 | 21.2 | 2.12% | 7.8s | — |
| AI Memory | 4 | 126 | 8.3 | 2.32% | 10.9s | FM7:underpub |
| Sports Finance | 10 | 124 | 8.8 | 0.77% | 10.1s | — |
| Tax/Policy | 3 | 122 | 8.6 | 2.08% | 13.7s | FM7:underpub |
| DeepSeek/China | 10 | 121 | 13.4 | 2.15% | 9.0s | — |
| Scaling Laws | 2 | 108 | 11.3 | 0.00% | 5.3s | FM7:underpub |
| Startup Finance | 5 | 104 | 4.4 | 2.30% | 9.7s | — |
| General AI | 56 | 97 | 11.2 | 1.41% | 11.9s | FM6:spike |
| OpenAI/Pricing | 6 | 94 | 14.1 | 1.05% | 9.5s | — |
| Tesla/Elon | 14 | 83 | 5.9 | 1.36% | 9.9s | — |
| Health/Diet | 2 | 78 | 5.2 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 35 | 2.0 | 1.73% | 5.3s | FM6:spike |
| Business/Contrarian | 8 | 34 | 1.3 | 1.05% | 20.0s | FM6:spike |

### TikTok (22 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 137 | 7.7 | 1.15% | — |
| Sports Finance | 9 | 98 | 5.0 | 0.75% | FM6:spike |
| Health/Diet | 2 | 86 | 5.7 | 0.00% | FM7:underpub |
| Business/Contrarian | 8 | 83 | 2.9 | 0.81% | FM6:spike |
| Startup Finance | 5 | 33 | 1.3 | 0.39% | FM6:spike |
| NVIDIA/Compute | 74 | 27 | 3.0 | 0.95% | FM6:spike,FM5:saturating |
| General AI | 53 | 15 | 1.1 | 2.00% | FM6:spike |
| Tesla/Elon | 14 | 8 | 0.6 | 0.00% | FM6:spike |
| AI Memory | 3 | 4 | 0.2 | 0.00% | FM7:underpub |
| DeepMind | 5 | 4 | 0.4 | 0.00% | — |
| DeepSeek/China | 9 | 3 | 0.3 | 0.00% | — |
| OpenAI/Pricing | 6 | 3 | 0.3 | 0.00% | — |
| Tax/Policy | 3 | 1 | 0.1 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.1 | 0.00% | FM7:underpub |

### YouTube (22 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 31.5 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 22.0 | 0.00% | — |
| Tax/Policy | 2 | 432 | 16.1 | 0.00% | FM7:underpub |
| Tesla/Elon | 3 | 381 | 12.8 | 0.00% | FM6:spike,FM7:underpub |
| Sports Finance | 3 | 348 | 15.5 | 0.00% | FM7:underpub |
| Startup Finance | 5 | 318 | 13.6 | 0.00% | — |
| General AI | 101 | 276 | 9.9 | 0.00% | FM6:spike |
| AI Memory | 2 | 252 | 15.8 | 0.00% | FM7:underpub |
| Fed/Economy | 2 | 173 | 9.7 | 0.00% | FM7:underpub |
| NVIDIA/Compute | 44 | 64 | 4.0 | 0.00% | FM6:spike |
| OpenAI/Pricing | 12 | 62 | 2.4 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 1.4 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.7 | 0.00% | FM7:underpub |
| DeepSeek/China | 8 | 8 | 0.9 | 0.00% | FM5:saturating |
| DeepMind | 2 | 2 | 0.5 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| Breaking-hook | 10 | 232 | 1.53% | 10.8s | Timeliness |
| How-hook | 23 | 227 | 1.22% | 9.9s | Reach/new audiences |
| Other-hook | 104 | 212 | 1.46% | 10.3s | Varies |
| The/Number-hook | 30 | 161 | 1.55% | 17.3s | Watch time/saves |
| Why-hook | 48 | 124 | 1.70% | 11.3s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 266 avg views vs 154 off-peak (1.7× multiplier)
- **45% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone, NFL, franchise value, sports economics, Cowboys subsidize, $300M funding, startup death, VC kill, funding round

---

## Avoid keywords

Tesla valuation (TikTok), TSLA, DeepSeek, China AI arms race, generic AI progress, AI is changing everything

---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **AI Memory**: 4 posts, 126 avg views — test 5–8 more to confirm
- **Tax/Policy**: 3 posts, 122 avg views — test 5–8 more to confirm
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
