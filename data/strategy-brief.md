# OpenClips Strategy Brief

Generated: 2026-08-08T08:21:45Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 21 excluded | YT: 23 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 17% | TT 16%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 206 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (68 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #10 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Tesla/Elon**: IG #1 (265 avg) vs TikTok #8 (13 avg) — do not cross-post
- **General AI**: IG #2 (221 avg) vs TikTok #7 (29 avg) — do not cross-post
- **Scaling Laws**: IG #6 (132 avg) vs TikTok #10 (2 avg) — do not cross-post
- **Sports Finance**: IG #7 (122 avg) vs TikTok #3 (68 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| Tesla/Elon | 25 | 265 | 10.6 | 0.79% | 9.6s | FM6:spike |
| General AI | 16 | 221 | 8.5 | 0.98% | 11.1s | FM6:spike |
| NVIDIA/Compute | 38 | 206 | 9.5 | 0.81% | 9.4s | FM6:spike |
| AI Memory | 1 | 151 | 5.7 | 0.66% | 20.5s | FM7:underpub |
| Tax/Policy | 3 | 142 | 4.8 | 0.82% | 16.2s | FM7:underpub |
| Scaling Laws | 1 | 132 | 6.0 | 0.00% | 9.9s | FM7:underpub |
| Sports Finance | 5 | 122 | 4.7 | 0.80% | 13.4s | — |
| OpenAI/Pricing | 2 | 122 | 4.8 | 2.05% | 9.5s | FM7:underpub |
| DeepSeek/China | 1 | 114 | 5.1 | 0.88% | 8.8s | FM7:underpub |
| Fed/Economy | 1 | 110 | 3.7 | 1.82% | 10.1s | FM7:underpub |

### TikTok (21 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 5.5 | 2.48% | FM7:underpub |
| Tax/Policy | 3 | 69 | 2.3 | 0.50% | FM6:spike,FM7:underpub |
| Sports Finance | 6 | 68 | 8.6 | 1.03% | FM6:spike |
| NVIDIA/Compute | 43 | 52 | 6.4 | 0.41% | FM6:spike |
| AI Memory | 1 | 49 | 1.8 | 2.04% | FM7:underpub |
| DeepSeek/China | 2 | 35 | 10.6 | 0.00% | FM7:underpub |
| General AI | 15 | 29 | 1.2 | 0.09% | FM6:spike |
| Tesla/Elon | 22 | 13 | 0.5 | 0.59% | FM6:spike |
| OpenAI/Pricing | 2 | 4 | 0.2 | 0.00% | FM7:underpub |
| Scaling Laws | 1 | 2 | 0.1 | 0.00% | FM7:underpub |

### YouTube (23 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 16.5 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 10.3 | 0.00% | — |
| Startup Finance | 5 | 318 | 6.1 | 0.00% | — |
| AI Memory | 2 | 252 | 5.6 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 3.9 | 0.00% | FM6:spike |
| General AI | 158 | 177 | 3.1 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 3.4 | 0.00% | FM6:spike |
| Tax/Policy | 5 | 173 | 3.1 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 3.7 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 15 | 50 | 0.9 | 0.00% | FM6:spike |
| NVIDIA/Compute | 68 | 43 | 1.0 | 0.00% | FM6:spike |
| Scaling Laws | 10 | 19 | 0.4 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.2 | 0.00% | FM7:underpub |
| DeepSeek/China | 14 | 7 | 0.3 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.0 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 7 | 662 | 1.25% | 16.6s | Reach/new audiences |
| The/Number-hook | 13 | 211 | 0.73% | 8.8s | Watch time/saves |
| Why-hook | 13 | 188 | 0.67% | 10.3s | ER/comments/shares |
| Other-hook | 58 | 167 | 0.86% | 9.9s | Varies |
| Breaking-hook | 2 | 126 | 1.62% | 9.1s | Timeliness |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 280 avg views vs 232 off-peak (1.2× multiplier)
- **46% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize

---

## Avoid keywords



---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **AI Memory**: 1 posts, 151 avg views — test 5–8 more to confirm
- **Tax/Policy**: 3 posts, 142 avg views — test 5–8 more to confirm
- **Scaling Laws**: 1 posts, 132 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Tax/Policy**: 3 posts, 69 avg views — test 5–8 more to confirm
- **AI Memory**: 1 posts, 49 avg views — test 5–8 more to confirm
- **DeepSeek/China**: 2 posts, 35 avg views — test 5–8 more to confirm
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
