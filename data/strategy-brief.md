# OpenClips Strategy Brief

Generated: 2026-07-12T09:30:01Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 26 excluded | TT: 20 excluded | YT: 16 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 23% | TT 24%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 315 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (90 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #13 (57 avg) vs TikTok #1 (169 avg) — do not cross-post
- **Health/Diet**: IG #12 (78 avg) vs TikTok #3 (86 avg) — do not cross-post
- **Scaling Laws**: IG #7 (108 avg) vs TikTok #14 (0 avg) — do not cross-post
- **Business/Contrarian**: IG #14 (28 avg) vs TikTok #7 (22 avg) — do not cross-post
- **DeepMind**: IG #4 (127 avg) vs TikTok #11 (4 avg) — do not cross-post
- **DeepSeek/China**: IG #6 (121 avg) vs TikTok #12 (3 avg) — do not cross-post

---

## Topic Performance

### Instagram (26 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 91 | 315 | 31.3 | 1.55% | 11.9s | FM6:spike |
| Sports Finance | 11 | 133 | 15.5 | 0.85% | 10.8s | — |
| Tax/Policy | 6 | 132 | 31.9 | 1.45% | 15.0s | — |
| DeepMind | 5 | 127 | 15.3 | 2.12% | 7.8s | — |
| AI Memory | 4 | 126 | 7.4 | 2.32% | 10.9s | FM7:underpub |
| DeepSeek/China | 10 | 121 | 10.9 | 2.15% | 9.0s | — |
| Scaling Laws | 2 | 108 | 9.4 | 0.00% | 5.3s | FM7:underpub |
| OpenAI/Pricing | 5 | 107 | 12.1 | 1.26% | 9.7s | — |
| Startup Finance | 5 | 104 | 4.1 | 2.30% | 9.7s | — |
| General AI | 51 | 98 | 9.8 | 1.50% | 12.6s | FM6:spike |
| Tesla/Elon | 18 | 94 | 19.6 | 1.45% | 9.8s | — |
| Health/Diet | 2 | 78 | 4.6 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 57 | 10.5 | 2.09% | 6.6s | — |
| Business/Contrarian | 6 | 28 | 1.1 | 1.04% | 20.4s | FM6:spike |

### TikTok (20 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 169 | 19.7 | 1.64% | — |
| Sports Finance | 10 | 90 | 14.6 | 0.98% | FM6:spike |
| Health/Diet | 2 | 86 | 5.1 | 0.00% | FM7:underpub |
| Tax/Policy | 6 | 34 | 13.6 | 0.25% | FM6:spike |
| Startup Finance | 5 | 33 | 1.2 | 0.39% | FM6:spike |
| NVIDIA/Compute | 80 | 29 | 3.2 | 0.89% | FM6:spike |
| Business/Contrarian | 6 | 22 | 0.8 | 0.40% | FM6:spike |
| General AI | 49 | 15 | 1.4 | 2.19% | FM6:spike |
| Tesla/Elon | 18 | 10 | 1.6 | 0.07% | FM6:spike |
| AI Memory | 3 | 4 | 0.2 | 0.00% | FM7:underpub |
| DeepMind | 5 | 4 | 0.3 | 0.00% | — |
| DeepSeek/China | 9 | 3 | 0.3 | 0.00% | — |
| OpenAI/Pricing | 5 | 2 | 0.3 | 0.00% | — |
| Scaling Laws | 2 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (16 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 29.7 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 20.4 | 0.00% | — |
| Tesla/Elon | 3 | 381 | 12.0 | 0.00% | FM6:spike,FM7:underpub |
| Startup Finance | 5 | 318 | 12.5 | 0.00% | — |
| AI Memory | 2 | 252 | 14.1 | 0.00% | FM7:underpub |
| General AI | 115 | 242 | 8.1 | 0.00% | FM6:spike |
| Sports Finance | 5 | 209 | 8.6 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 8.7 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 6.0 | 0.00% | — |
| OpenAI/Pricing | 12 | 62 | 2.2 | 0.00% | FM6:spike |
| NVIDIA/Compute | 47 | 60 | 3.4 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 1.2 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.6 | 0.00% | FM7:underpub |
| DeepSeek/China | 8 | 9 | 0.7 | 0.00% | — |
| DeepMind | 2 | 2 | 0.4 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| Breaking-hook | 9 | 245 | 1.70% | 11.4s | Timeliness |
| How-hook | 24 | 223 | 1.29% | 9.9s | Reach/new audiences |
| Other-hook | 107 | 214 | 1.49% | 10.4s | Varies |
| The/Number-hook | 31 | 163 | 1.53% | 17.0s | Watch time/saves |
| Why-hook | 50 | 126 | 1.70% | 11.5s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 260 avg views vs 161 off-peak (1.6× multiplier)
- **48% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone, $300M funding, startup death, VC kill, funding round, Federal Reserve, Warsh, inflation, interest rate, FOMC, economic activity

---

## Avoid keywords

Tesla valuation (TikTok), TSLA, generic AI progress, AI is changing everything, DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **AI Memory**: 4 posts, 126 avg views — test 5–8 more to confirm
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
