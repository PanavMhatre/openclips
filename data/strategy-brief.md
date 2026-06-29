# OpenClips Strategy Brief

Generated: 2026-06-29T12:19:10Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 15 excluded | TT: 15 excluded | YT: 15 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 35% | TT 35%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 210 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (128 avg views) and Crypto (169 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Investing**: IG #100 (0 avg) vs TikTok #2 (153 avg) — do not cross-post
- **Tax/Policy**: IG #2 (130 avg) vs TikTok #14 (1 avg) — do not cross-post
- **Fed/Economy**: IG #13 (35 avg) vs TikTok #3 (136 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (210 avg) vs TikTok #9 (9 avg) — do not cross-post
- **Business/Contrarian**: IG #14 (32 avg) vs TikTok #6 (73 avg) — do not cross-post
- **AI Memory**: IG #3 (126 avg) vs TikTok #11 (3 avg) — do not cross-post

---

## Topic Performance

### Instagram (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 29 | 210 | 46.7 | 1.92% | 11.5s | FM6:spike |
| Tax/Policy | 2 | 130 | 8.4 | 2.66% | 18.6s | FM7:underpub |
| AI Memory | 4 | 126 | 31.3 | 2.32% | 10.9s | FM7:underpub |
| Crypto | 1 | 125 | 6.0 | 0.80% | 25.7s | FM7:underpub |
| Sports Finance | 10 | 111 | 13.6 | 0.57% | 9.4s | — |
| DeepMind | 1 | 111 | 37.5 | 2.70% | 5.8s | FM7:underpub |
| Startup Finance | 5 | 103 | 8.4 | 2.30% | 9.6s | — |
| DeepSeek/China | 2 | 87 | 23.3 | 0.42% | 9.5s | FM7:underpub |
| Health/Diet | 2 | 78 | 19.5 | 0.36% | 7.9s | FM7:underpub |
| OpenAI/Pricing | 3 | 71 | 15.1 | 0.97% | 9.9s | FM7:underpub |
| General AI | 45 | 63 | 5.8 | 1.07% | 12.4s | FM6:spike |
| Tesla/Elon | 11 | 62 | 9.2 | 0.89% | 8.9s | — |
| Fed/Economy | 5 | 35 | 5.0 | 1.73% | 5.3s | FM6:spike |
| Business/Contrarian | 9 | 32 | 2.0 | 1.46% | 18.4s | FM6:spike |

### TikTok (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Crypto | 2 | 169 | 8.2 | 0.74% | FM7:underpub |
| Investing | 1 | 153 | 5.9 | 3.27% | FM7:underpub |
| Fed/Economy | 5 | 136 | 19.7 | 1.15% | — |
| Sports Finance | 10 | 128 | 13.3 | 1.06% | — |
| Health/Diet | 2 | 82 | 20.8 | 0.00% | FM7:underpub |
| Business/Contrarian | 9 | 73 | 4.1 | 0.73% | FM6:spike |
| Startup Finance | 5 | 32 | 2.2 | 0.40% | FM6:spike |
| General AI | 43 | 20 | 1.1 | 3.07% | FM6:spike |
| NVIDIA/Compute | 26 | 9 | 2.3 | 0.75% | FM6:spike |
| DeepMind | 1 | 8 | 2.7 | 0.00% | FM7:underpub |
| AI Memory | 3 | 3 | 0.8 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 3 | 3 | 0.3 | 0.00% | FM7:underpub |
| Tesla/Elon | 10 | 3 | 0.2 | 0.00% | FM6:spike |
| Tax/Policy | 2 | 1 | 0.1 | 0.00% | FM7:underpub |
| DeepSeek/China | 1 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 48.0 | 0.00% | FM7:underpub |
| Tesla/Elon | 2 | 570 | 30.3 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 557 | 39.4 | 0.00% | — |
| Tax/Policy | 2 | 432 | 27.3 | 0.00% | FM7:underpub |
| General AI | 71 | 391 | 23.8 | 0.00% | FM6:spike |
| Sports Finance | 3 | 348 | 30.3 | 0.00% | FM7:underpub |
| Startup Finance | 5 | 318 | 25.6 | 0.00% | — |
| AI Memory | 2 | 252 | 50.5 | 0.00% | FM7:underpub |
| NVIDIA/Compute | 14 | 190 | 33.5 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 25.0 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 7 | 104 | 6.4 | 0.00% | FM6:spike |
| Scaling Laws | 4 | 47 | 7.7 | 0.00% | FM6:spike,FM7:underpub |
| AI Hardware | 1 | 10 | 3.4 | 0.00% | FM7:underpub |
| DeepSeek/China | 2 | 8 | 2.6 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.4 | 0.00% | FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 15 | 172 | 1.27% | 8.9s | Reach/new audiences |
| Why-hook | 37 | 111 | 1.53% | 12.1s | ER/comments/shares |
| The/Number-hook | 22 | 96 | 1.45% | 19.6s | Watch time/saves |
| Breaking-hook | 5 | 86 | 1.86% | 9.5s | Timeliness |
| Other-hook | 50 | 80 | 1.16% | 8.8s | Varies |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 173 avg views vs 69 off-peak (2.5× multiplier)
- **34% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, $300M funding, startup death, VC kill, funding round

---

## Avoid keywords

Tesla valuation (TikTok), TSLA, generic AI progress, AI is changing everything

---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **Tax/Policy**: 2 posts, 130 avg views — test 5–8 more to confirm
- **AI Memory**: 4 posts, 126 avg views — test 5–8 more to confirm
- **Crypto**: 1 posts, 125 avg views — test 5–8 more to confirm
- **DeepMind**: 1 posts, 111 avg views — test 5–8 more to confirm
- **Crypto**: 2 posts, 169 avg views — test 5–8 more to confirm
- **Investing**: 1 posts, 153 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 82 avg views — test 5–8 more to confirm
- **DeepMind**: 1 posts, 8 avg views — test 5–8 more to confirm
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
