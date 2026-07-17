# OpenClips Strategy Brief

Generated: 2026-07-17T09:30:32Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 14 excluded | TT: 14 excluded | YT: 14 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 18% | TT 18%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 292 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (83 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #13 (57 avg) vs TikTok #1 (170 avg) — do not cross-post
- **Health/Diet**: IG #12 (78 avg) vs TikTok #2 (88 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (191 avg) vs TikTok #7 (14 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (292 avg) vs TikTok #5 (28 avg) — do not cross-post

---

## Topic Performance

### Instagram (14 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 103 | 292 | 20.7 | 1.43% | 11.5s | FM6:spike |
| Tesla/Elon | 33 | 191 | 33.9 | 0.88% | 9.3s | FM6:spike |
| General AI | 42 | 166 | 20.1 | 1.31% | 8.9s | FM6:spike |
| Sports Finance | 12 | 133 | 11.3 | 0.90% | 11.9s | — |
| Tax/Policy | 4 | 133 | 16.1 | 0.85% | 13.2s | FM7:underpub |
| AI Memory | 5 | 131 | 11.2 | 1.99% | 12.8s | — |
| DeepMind | 5 | 127 | 9.2 | 2.12% | 7.8s | — |
| DeepSeek/China | 10 | 121 | 7.5 | 2.15% | 9.0s | — |
| Startup Finance | 3 | 114 | 3.9 | 2.02% | 8.1s | FM7:underpub |
| OpenAI/Pricing | 6 | 110 | 9.6 | 1.05% | 9.7s | — |
| Scaling Laws | 2 | 108 | 6.6 | 0.00% | 5.3s | FM7:underpub |
| Health/Diet | 2 | 78 | 3.5 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 57 | 4.3 | 2.09% | 6.6s | — |
| Business/Contrarian | 2 | 0 | 0.0 | 0.00% | 0.0s | FM7:underpub |

### TikTok (14 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 170 | 9.8 | 1.64% | — |
| Health/Diet | 2 | 88 | 4.0 | 0.00% | FM7:underpub |
| Sports Finance | 11 | 83 | 5.9 | 0.89% | FM6:spike,FM5:saturating |
| Tax/Policy | 4 | 52 | 6.9 | 0.37% | FM6:spike,FM7:underpub |
| NVIDIA/Compute | 91 | 28 | 2.6 | 0.82% | FM6:spike |
| General AI | 39 | 16 | 2.3 | 0.17% | FM6:spike |
| Tesla/Elon | 30 | 14 | 3.2 | 0.52% | FM6:spike |
| AI Memory | 4 | 6 | 0.8 | 0.00% | FM7:underpub |
| DeepMind | 5 | 4 | 0.2 | 0.00% | — |
| DeepSeek/China | 9 | 3 | 0.2 | 0.00% | — |
| Startup Finance | 3 | 2 | 0.1 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 6 | 2 | 0.2 | 0.00% | — |
| Business/Contrarian | 2 | 1 | 0.0 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (14 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 25.9 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 17.3 | 0.00% | — |
| Startup Finance | 5 | 318 | 10.4 | 0.00% | — |
| Tesla/Elon | 4 | 286 | 7.8 | 0.00% | FM6:spike,FM7:underpub |
| AI Memory | 2 | 252 | 11.0 | 0.00% | FM7:underpub |
| General AI | 140 | 199 | 5.7 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 6.0 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 7.0 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 5.1 | 0.00% | FM6:spike |
| OpenAI/Pricing | 12 | 62 | 1.8 | 0.00% | FM6:spike,FM5:saturating |
| NVIDIA/Compute | 51 | 55 | 2.4 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 1.0 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.5 | 0.00% | FM7:underpub |
| DeepSeek/China | 9 | 8 | 0.5 | 0.00% | — |
| DeepMind | 2 | 3 | 0.3 | 0.00% | FM7:underpub,FM5:saturating |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 23 | 365 | 1.35% | 12.2s | Reach/new audiences |
| The/Number-hook | 30 | 224 | 1.23% | 9.8s | Watch time/saves |
| Breaking-hook | 11 | 223 | 1.69% | 10.9s | Timeliness |
| Other-hook | 129 | 200 | 1.28% | 10.1s | Varies |
| Why-hook | 41 | 151 | 1.44% | 9.8s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 260 avg views vs 191 off-peak (1.4× multiplier)
- **52% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, ChatGPT forgets, LLM memory, context window, AI forgetfulness, DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone, Federal Reserve, Warsh, inflation, interest rate, FOMC, economic activity

---

## Avoid keywords

DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 88 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 4 posts, 6 avg views — test 5–8 more to confirm
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
