# OpenClips Strategy Brief

Generated: 2026-07-02T10:22:46Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 22 excluded | TT: 22 excluded | YT: 20 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 31% | TT 31%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 285 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (129 avg views) and Crypto (169 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Investing**: IG #100 (0 avg) vs TikTok #2 (153 avg) — do not cross-post
- **Tax/Policy**: IG #2 (130 avg) vs TikTok #15 (1 avg) — do not cross-post
- **AI Memory**: IG #3 (126 avg) vs TikTok #13 (4 avg) — do not cross-post
- **Fed/Economy**: IG #13 (35 avg) vs TikTok #3 (136 avg) — do not cross-post
- **Business/Contrarian**: IG #14 (32 avg) vs TikTok #6 (74 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (285 avg) vs TikTok #7 (36 avg) — do not cross-post

---

## Topic Performance

### Instagram (22 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 45 | 285 | 63.7 | 2.13% | 11.5s | FM6:spike |
| Tax/Policy | 2 | 130 | 7.1 | 2.66% | 18.6s | FM7:underpub |
| AI Memory | 4 | 126 | 17.8 | 2.32% | 10.9s | FM7:underpub |
| Crypto | 1 | 125 | 5.3 | 0.80% | 25.7s | FM7:underpub |
| DeepMind | 2 | 118 | 25.3 | 3.37% | 7.1s | FM7:underpub |
| Sports Finance | 10 | 111 | 9.5 | 0.57% | 9.4s | — |
| Startup Finance | 5 | 103 | 6.7 | 2.30% | 9.6s | — |
| DeepSeek/China | 3 | 103 | 19.1 | 0.28% | 10.5s | FM7:underpub |
| Health/Diet | 2 | 78 | 11.3 | 0.36% | 7.9s | FM7:underpub |
| OpenAI/Pricing | 3 | 71 | 9.0 | 0.97% | 9.9s | FM7:underpub,FM5:saturating |
| Tesla/Elon | 12 | 66 | 7.1 | 1.25% | 8.8s | — |
| General AI | 47 | 66 | 5.8 | 1.12% | 12.5s | FM6:spike |
| Fed/Economy | 5 | 35 | 3.5 | 1.73% | 5.3s | FM6:spike |
| Business/Contrarian | 9 | 32 | 1.7 | 1.46% | 18.4s | FM6:spike |

### TikTok (22 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Crypto | 2 | 169 | 7.2 | 0.74% | FM7:underpub |
| Investing | 1 | 153 | 5.3 | 3.27% | FM7:underpub |
| Fed/Economy | 5 | 136 | 13.9 | 1.15% | — |
| Sports Finance | 10 | 129 | 9.6 | 1.06% | FM5:saturating |
| Health/Diet | 2 | 84 | 12.1 | 0.00% | FM7:underpub |
| Business/Contrarian | 9 | 74 | 3.5 | 0.72% | FM6:spike |
| NVIDIA/Compute | 42 | 36 | 10.1 | 1.58% | FM6:spike |
| Startup Finance | 5 | 33 | 1.9 | 0.39% | FM6:spike |
| General AI | 44 | 21 | 1.7 | 3.06% | FM6:spike |
| Tesla/Elon | 11 | 10 | 1.8 | 0.00% | FM6:spike |
| DeepMind | 2 | 6 | 1.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 1 | 4 | 1.0 | 0.00% | FM7:underpub |
| AI Memory | 3 | 4 | 0.5 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 3 | 3 | 0.2 | 0.00% | FM7:underpub |
| Tax/Policy | 2 | 1 | 0.1 | 0.00% | FM7:underpub |

### YouTube (20 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 42.1 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 557 | 32.5 | 0.00% | — |
| Tax/Policy | 2 | 432 | 23.0 | 0.00% | FM7:underpub |
| Tesla/Elon | 3 | 380 | 17.5 | 0.00% | FM6:spike,FM7:underpub |
| General AI | 78 | 356 | 18.1 | 0.00% | FM6:spike |
| Sports Finance | 3 | 348 | 24.2 | 0.00% | FM7:underpub,FM5:saturating |
| Startup Finance | 5 | 318 | 20.7 | 0.00% | — |
| AI Memory | 2 | 252 | 31.8 | 0.00% | FM7:underpub |
| Fed/Economy | 2 | 173 | 17.6 | 0.00% | FM7:underpub |
| NVIDIA/Compute | 23 | 118 | 14.2 | 0.00% | FM6:spike |
| OpenAI/Pricing | 10 | 73 | 3.8 | 0.00% | FM6:spike |
| Scaling Laws | 4 | 47 | 5.2 | 0.00% | FM6:spike,FM7:underpub |
| AI Hardware | 1 | 10 | 1.7 | 0.00% | FM7:underpub |
| DeepSeek/China | 3 | 8 | 1.6 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.3 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 15 | 172 | 1.27% | 8.9s | Reach/new audiences |
| The/Number-hook | 25 | 153 | 1.54% | 18.7s | Watch time/saves |
| Other-hook | 62 | 141 | 1.52% | 9.3s | Varies |
| Why-hook | 40 | 115 | 1.68% | 12.0s | ER/comments/shares |
| Breaking-hook | 8 | 106 | 1.26% | 10.6s | Timeliness |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 286 avg views vs 82 off-peak (3.5× multiplier)
- **37% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, $300M funding, startup death, VC kill, funding round

---

## Avoid keywords

AI subscription, $2000 AI, OpenAI $200B valuation, generic AI progress, AI is changing everything, Tesla valuation (TikTok), TSLA

---

## Weekly Saturation Watch

- **OpenAI/Pricing** (IG): wk1 117 → wk2 69 → wk3 26 views — reduce by 30–50%

---

## Underpublished Opportunities

- **Tax/Policy**: 2 posts, 130 avg views — test 5–8 more to confirm
- **AI Memory**: 4 posts, 126 avg views — test 5–8 more to confirm
- **Crypto**: 1 posts, 125 avg views — test 5–8 more to confirm
- **DeepMind**: 2 posts, 118 avg views — test 5–8 more to confirm
- **Crypto**: 2 posts, 169 avg views — test 5–8 more to confirm
- **Investing**: 1 posts, 153 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 84 avg views — test 5–8 more to confirm
- **DeepMind**: 2 posts, 6 avg views — test 5–8 more to confirm
- **DeepSeek/China**: 1 posts, 4 avg views — test 5–8 more to confirm
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
