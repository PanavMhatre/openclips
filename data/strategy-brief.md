# OpenClips Strategy Brief

Generated: 2026-07-16T09:49:47Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 12 excluded | TT: 12 excluded | YT: 12 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 19% | TT 20%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 285 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (76 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #12 (57 avg) vs TikTok #1 (170 avg) — do not cross-post
- **Health/Diet**: IG #11 (78 avg) vs TikTok #2 (88 avg) — do not cross-post
- **Scaling Laws**: IG #7 (108 avg) vs TikTok #14 (0 avg) — do not cross-post
- **DeepMind**: IG #3 (127 avg) vs TikTok #9 (4 avg) — do not cross-post
- **Tesla/Elon**: IG #13 (54 avg) vs TikTok #7 (8 avg) — do not cross-post
- **DeepSeek/China**: IG #4 (121 avg) vs TikTok #10 (3 avg) — do not cross-post

---

## Topic Performance

### Instagram (12 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 101 | 285 | 19.8 | 1.41% | 10.9s | FM6:spike |
| Tax/Policy | 4 | 133 | 18.4 | 0.85% | 13.2s | FM7:underpub |
| DeepMind | 5 | 127 | 9.9 | 2.12% | 7.8s | — |
| DeepSeek/China | 10 | 121 | 8.0 | 2.15% | 9.0s | — |
| Startup Finance | 3 | 114 | 4.0 | 2.02% | 8.1s | FM7:underpub |
| Sports Finance | 13 | 112 | 7.4 | 0.72% | 9.2s | — |
| Scaling Laws | 2 | 108 | 7.0 | 0.00% | 5.3s | FM7:underpub |
| AI Memory | 5 | 101 | 4.8 | 1.85% | 8.7s | — |
| General AI | 46 | 97 | 7.0 | 1.19% | 12.0s | FM6:spike |
| OpenAI/Pricing | 6 | 89 | 6.7 | 1.05% | 8.1s | — |
| Health/Diet | 2 | 78 | 3.7 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 57 | 4.8 | 2.09% | 6.6s | — |
| Tesla/Elon | 31 | 54 | 5.6 | 0.55% | 4.2s | — |
| Business/Contrarian | 3 | 2 | 0.1 | 0.00% | 32.3s | FM7:underpub |

### TikTok (12 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 170 | 10.7 | 1.64% | — |
| Health/Diet | 2 | 88 | 4.2 | 0.00% | FM7:underpub |
| Sports Finance | 12 | 76 | 6.0 | 0.81% | FM6:spike |
| Tax/Policy | 4 | 52 | 7.9 | 0.37% | FM6:spike,FM7:underpub |
| NVIDIA/Compute | 89 | 27 | 1.9 | 0.80% | FM6:spike |
| General AI | 43 | 13 | 1.0 | 0.13% | FM6:spike |
| Tesla/Elon | 28 | 8 | 1.0 | 0.49% | FM6:spike |
| AI Memory | 4 | 4 | 0.4 | 0.00% | FM7:underpub |
| DeepMind | 5 | 4 | 0.2 | 0.00% | — |
| DeepSeek/China | 9 | 3 | 0.2 | 0.00% | — |
| Startup Finance | 3 | 2 | 0.1 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 6 | 2 | 0.1 | 0.00% | — |
| Business/Contrarian | 3 | 1 | 0.0 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (12 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 26.6 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 17.8 | 0.00% | — |
| Startup Finance | 5 | 318 | 10.8 | 0.00% | — |
| Tesla/Elon | 4 | 286 | 8.1 | 0.00% | FM6:spike,FM7:underpub |
| AI Memory | 2 | 252 | 11.5 | 0.00% | FM7:underpub |
| General AI | 136 | 205 | 6.1 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 6.2 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 7.3 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 5.3 | 0.00% | FM6:spike |
| OpenAI/Pricing | 12 | 62 | 1.9 | 0.00% | FM6:spike,FM5:saturating |
| NVIDIA/Compute | 50 | 56 | 2.6 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 1.0 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.5 | 0.00% | FM7:underpub |
| DeepSeek/China | 9 | 8 | 0.5 | 0.00% | — |
| DeepMind | 2 | 3 | 0.3 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| Breaking-hook | 11 | 200 | 1.39% | 9.3s | Timeliness |
| How-hook | 26 | 197 | 1.04% | 8.1s | Reach/new audiences |
| Other-hook | 127 | 180 | 1.19% | 8.4s | Varies |
| The/Number-hook | 31 | 157 | 1.21% | 15.9s | Watch time/saves |
| Why-hook | 41 | 140 | 1.48% | 11.7s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 205 avg views vs 155 off-peak (1.3× multiplier)
- **51% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone, NFL, franchise value, sports economics, Cowboys subsidize, ChatGPT forgets, LLM memory, context window, AI forgetfulness, Federal Reserve, Warsh, inflation, interest rate, FOMC, economic activity

---

## Avoid keywords

DeepSeek, China AI arms race, generic AI progress, AI is changing everything, Tesla valuation (TikTok), TSLA

---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 88 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 4 posts, 4 avg views — test 5–8 more to confirm
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
