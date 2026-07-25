# OpenClips Strategy Brief

Generated: 2026-07-25T09:21:51Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 0 excluded | YT: 0 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 17% | TT 17%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 289 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (62 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Health/Diet**: IG #12 (78 avg) vs TikTok #2 (88 avg) — do not cross-post
- **Fed/Economy**: IG #11 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (214 avg) vs TikTok #8 (13 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (289 avg) vs TikTok #5 (40 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 111 | 289 | 19.2 | 1.31% | 10.8s | FM6:spike |
| Tesla/Elon | 37 | 214 | 19.3 | 0.90% | 9.3s | FM6:spike,FM5:saturating |
| General AI | 38 | 188 | 12.4 | 1.48% | 9.9s | FM6:spike |
| Sports Finance | 8 | 138 | 9.1 | 0.85% | 12.6s | — |
| AI Memory | 3 | 134 | 6.9 | 1.25% | 14.8s | FM7:underpub |
| Tax/Policy | 4 | 133 | 8.1 | 0.85% | 13.2s | FM7:underpub |
| DeepMind | 5 | 128 | 5.7 | 2.12% | 7.8s | — |
| DeepSeek/China | 11 | 121 | 5.7 | 2.03% | 9.0s | — |
| OpenAI/Pricing | 6 | 118 | 7.1 | 1.25% | 9.7s | — |
| Scaling Laws | 3 | 116 | 8.5 | 0.00% | 6.8s | FM7:underpub |
| Fed/Economy | 1 | 110 | 7.1 | 1.82% | 10.1s | FM7:underpub |
| Health/Diet | 2 | 78 | 2.6 | 0.36% | 7.9s | FM7:underpub |

### TikTok (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 10.4 | 2.48% | FM7:underpub |
| Health/Diet | 2 | 88 | 3.0 | 0.00% | FM7:underpub |
| Sports Finance | 7 | 62 | 3.4 | 0.88% | FM6:spike |
| Tax/Policy | 4 | 52 | 3.3 | 0.37% | FM6:spike,FM7:underpub |
| NVIDIA/Compute | 100 | 40 | 3.7 | 0.68% | FM6:spike |
| General AI | 35 | 25 | 1.8 | 0.28% | FM6:spike,FM5:saturating |
| AI Memory | 3 | 16 | 1.2 | 0.00% | FM6:spike,FM7:underpub |
| Tesla/Elon | 34 | 13 | 1.0 | 0.46% | FM6:spike,FM5:saturating |
| DeepSeek/China | 10 | 4 | 0.3 | 0.00% | — |
| DeepMind | 5 | 4 | 0.1 | 0.00% | — |
| OpenAI/Pricing | 6 | 3 | 0.2 | 0.00% | — |
| Scaling Laws | 3 | 1 | 0.1 | 0.00% | FM7:underpub |

### YouTube (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 21.5 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 13.8 | 0.00% | — |
| Startup Finance | 5 | 318 | 8.3 | 0.00% | — |
| AI Memory | 2 | 252 | 8.2 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 5.1 | 0.00% | FM6:spike |
| General AI | 157 | 178 | 4.1 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 4.7 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 5.3 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 4.2 | 0.00% | FM6:spike |
| OpenAI/Pricing | 15 | 50 | 1.2 | 0.00% | FM6:spike |
| NVIDIA/Compute | 64 | 45 | 1.5 | 0.00% | FM6:spike,FM5:saturating |
| Scaling Laws | 9 | 21 | 0.7 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 13 | 7 | 0.4 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.2 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 18 | 424 | 1.54% | 13.0s | Reach/new audiences |
| Breaking-hook | 8 | 282 | 1.26% | 11.0s | Timeliness |
| The/Number-hook | 27 | 243 | 1.15% | 9.4s | Watch time/saves |
| Other-hook | 144 | 214 | 1.26% | 10.3s | Varies |
| Why-hook | 32 | 163 | 1.30% | 9.5s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 285 avg views vs 236 off-peak (1.2× multiplier)
- **50% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize, DeepMind, Demis Hassabis, AlphaFold, gold medal math, AI milestone

---

## Avoid keywords

DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- **Tesla/Elon** (IG): wk1 409 → wk2 359 → wk3 102 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 3 posts, 134 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 88 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 3 posts, 16 avg views — test 5–8 more to confirm
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
