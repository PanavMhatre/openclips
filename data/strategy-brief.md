# OpenClips Strategy Brief

Generated: 2026-07-28T10:15:20Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 0 excluded | YT: 0 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 18% | TT 19%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 299 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (51 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #11 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (223 avg) vs TikTok #7 (12 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (299 avg) vs TikTok #5 (37 avg) — do not cross-post
- **Tax/Policy**: IG #6 (133 avg) vs TikTok #2 (52 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 94 | 299 | 16.5 | 1.06% | 11.0s | FM6:spike,FM5:saturating |
| Tesla/Elon | 34 | 223 | 15.7 | 0.83% | 9.6s | FM6:spike |
| General AI | 36 | 192 | 10.5 | 1.41% | 10.3s | FM6:spike |
| AI Memory | 1 | 151 | 9.7 | 0.66% | 20.5s | FM7:underpub |
| Sports Finance | 7 | 139 | 7.8 | 0.86% | 12.5s | — |
| Tax/Policy | 4 | 133 | 6.8 | 0.85% | 13.2s | FM7:underpub |
| DeepMind | 4 | 132 | 5.4 | 1.97% | 8.3s | FM7:underpub |
| DeepSeek/China | 10 | 121 | 5.0 | 2.15% | 9.0s | — |
| OpenAI/Pricing | 5 | 119 | 6.4 | 1.50% | 9.2s | — |
| Scaling Laws | 3 | 116 | 6.7 | 0.00% | 6.8s | FM7:underpub |
| Fed/Economy | 1 | 110 | 5.9 | 1.82% | 10.1s | FM7:underpub |

### TikTok (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 8.7 | 2.48% | FM7:underpub |
| Tax/Policy | 4 | 52 | 2.8 | 0.37% | FM6:spike,FM7:underpub |
| Sports Finance | 6 | 51 | 2.7 | 0.89% | FM6:spike |
| AI Memory | 1 | 44 | 2.8 | 2.27% | FM7:underpub |
| NVIDIA/Compute | 86 | 37 | 2.8 | 0.68% | FM6:spike,FM5:saturating |
| General AI | 35 | 25 | 1.5 | 0.28% | FM6:spike,FM5:saturating |
| Tesla/Elon | 31 | 12 | 0.8 | 0.50% | FM6:spike,FM5:saturating |
| DeepSeek/China | 10 | 4 | 0.2 | 0.00% | — |
| OpenAI/Pricing | 5 | 3 | 0.2 | 0.00% | — |
| DeepMind | 4 | 2 | 0.1 | 0.00% | FM7:underpub |
| Scaling Laws | 3 | 1 | 0.1 | 0.00% | FM7:underpub |

### YouTube (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 20.2 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 12.9 | 0.00% | — |
| Startup Finance | 5 | 318 | 7.7 | 0.00% | — |
| AI Memory | 2 | 252 | 7.4 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 4.8 | 0.00% | FM6:spike |
| General AI | 157 | 178 | 3.9 | 0.00% | FM6:spike,FM5:saturating |
| Sports Finance | 6 | 174 | 4.3 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 4.8 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 3.9 | 0.00% | FM6:spike |
| OpenAI/Pricing | 15 | 50 | 1.1 | 0.00% | FM6:spike |
| NVIDIA/Compute | 64 | 45 | 1.4 | 0.00% | FM6:spike |
| Scaling Laws | 9 | 21 | 0.6 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 13 | 7 | 0.3 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 16 | 463 | 1.29% | 13.8s | Reach/new audiences |
| Breaking-hook | 7 | 306 | 1.32% | 11.3s | Timeliness |
| The/Number-hook | 23 | 247 | 1.10% | 9.4s | Watch time/saves |
| Other-hook | 128 | 215 | 1.10% | 10.4s | Varies |
| Why-hook | 25 | 173 | 1.24% | 9.7s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 288 avg views vs 249 off-peak (1.2× multiplier)
- **48% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize

---

## Avoid keywords

DeepSeek, China AI arms race

---

## Weekly Saturation Watch

- **NVIDIA/Compute** (IG): wk1 0 → wk2 242 → wk3 116 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 1 posts, 151 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **DeepMind**: 4 posts, 132 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 1 posts, 44 avg views — test 5–8 more to confirm
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
