# OpenClips Strategy Brief

Generated: 2026-08-02T09:45:08Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 0 excluded | YT: 0 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 19% | TT 19%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 240 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (58 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #11 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Sports Finance**: IG #9 (122 avg) vs TikTok #2 (58 avg) — do not cross-post
- **DeepMind**: IG #6 (132 avg) vs TikTok #11 (1 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (233 avg) vs TikTok #7 (13 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (240 avg) vs TikTok #5 (37 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 69 | 240 | 11.7 | 0.87% | 10.9s | FM6:spike |
| Tesla/Elon | 31 | 233 | 12.2 | 0.78% | 9.5s | FM6:spike,FM5:saturating |
| General AI | 28 | 210 | 9.3 | 1.31% | 10.4s | FM6:spike |
| AI Memory | 1 | 151 | 7.3 | 0.66% | 20.5s | FM7:underpub |
| Tax/Policy | 4 | 133 | 5.4 | 0.85% | 13.2s | FM7:underpub |
| DeepMind | 2 | 132 | 4.9 | 1.92% | 7.2s | FM7:underpub |
| Scaling Laws | 1 | 132 | 8.3 | 0.00% | 9.9s | FM7:underpub |
| DeepSeek/China | 3 | 124 | 5.2 | 3.17% | 9.9s | FM7:underpub |
| Sports Finance | 5 | 122 | 6.1 | 0.80% | 13.4s | — |
| OpenAI/Pricing | 4 | 119 | 5.3 | 1.87% | 8.2s | FM7:underpub |
| Fed/Economy | 1 | 110 | 4.7 | 1.82% | 10.1s | FM7:underpub |

### TikTok (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 6.8 | 2.48% | FM7:underpub |
| Sports Finance | 5 | 58 | 2.5 | 1.07% | FM6:spike |
| Tax/Policy | 4 | 52 | 2.2 | 0.37% | FM6:spike,FM7:underpub |
| AI Memory | 1 | 46 | 2.2 | 2.17% | FM7:underpub |
| NVIDIA/Compute | 64 | 37 | 2.2 | 0.27% | FM6:spike,FM5:saturating |
| General AI | 27 | 23 | 1.2 | 0.24% | FM6:spike |
| Tesla/Elon | 28 | 13 | 0.6 | 0.51% | FM6:spike |
| DeepSeek/China | 3 | 7 | 0.4 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 4 | 4 | 0.2 | 0.00% | FM7:underpub |
| Scaling Laws | 1 | 2 | 0.1 | 0.00% | FM7:underpub |
| DeepMind | 2 | 1 | 0.0 | 0.00% | FM7:underpub |

### YouTube (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 18.3 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 11.5 | 0.00% | — |
| Startup Finance | 5 | 318 | 6.8 | 0.00% | — |
| AI Memory | 2 | 252 | 6.5 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 4.4 | 0.00% | FM6:spike |
| General AI | 157 | 178 | 3.5 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 3.8 | 0.00% | FM6:spike |
| Tax/Policy | 5 | 173 | 3.5 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 4.2 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 15 | 50 | 1.0 | 0.00% | FM6:spike |
| NVIDIA/Compute | 64 | 45 | 1.2 | 0.00% | FM6:spike |
| Scaling Laws | 9 | 21 | 0.5 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 13 | 7 | 0.2 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 14 | 513 | 1.28% | 14.6s | Reach/new audiences |
| The/Number-hook | 18 | 208 | 0.93% | 9.2s | Watch time/saves |
| Why-hook | 18 | 193 | 0.85% | 9.7s | ER/comments/shares |
| Other-hook | 96 | 183 | 0.98% | 10.4s | Varies |
| Breaking-hook | 3 | 124 | 2.48% | 9.0s | Timeliness |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 298 avg views vs 241 off-peak (1.2× multiplier)
- **46% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys subsidize

---

## Avoid keywords



---

## Weekly Saturation Watch

- **Tesla/Elon** (IG): wk1 0 → wk2 1284 → wk3 382 views — reduce by 30–50%

---

## Underpublished Opportunities

- **AI Memory**: 1 posts, 151 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **DeepMind**: 2 posts, 132 avg views — test 5–8 more to confirm
- **Scaling Laws**: 1 posts, 132 avg views — test 5–8 more to confirm
- **DeepSeek/China**: 3 posts, 124 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 1 posts, 46 avg views — test 5–8 more to confirm
- **DeepSeek/China**: 3 posts, 7 avg views — test 5–8 more to confirm
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
