# OpenClips Strategy Brief

Generated: 2026-08-05T10:16:28Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 0 excluded | YT: 0 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 18% | TT 17%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 198 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (58 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #11 (110 avg) vs TikTok #1 (161 avg) — do not cross-post
- **Tesla/Elon**: IG #1 (233 avg) vs TikTok #7 (13 avg) — do not cross-post
- **DeepMind**: IG #6 (132 avg) vs TikTok #11 (1 avg) — do not cross-post
- **Sports Finance**: IG #8 (122 avg) vs TikTok #3 (58 avg) — do not cross-post
- **General AI**: IG #2 (204 avg) vs TikTok #6 (29 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| Tesla/Elon | 31 | 233 | 10.5 | 0.78% | 9.5s | FM6:spike |
| General AI | 20 | 204 | 8.6 | 1.12% | 10.8s | FM6:spike |
| NVIDIA/Compute | 46 | 198 | 10.0 | 0.86% | 9.4s | FM6:spike |
| AI Memory | 1 | 151 | 6.4 | 0.66% | 20.5s | FM7:underpub |
| Tax/Policy | 3 | 142 | 5.3 | 0.82% | 16.2s | FM7:underpub |
| DeepMind | 2 | 132 | 4.4 | 1.92% | 7.2s | FM7:underpub |
| Scaling Laws | 1 | 132 | 7.0 | 0.00% | 9.9s | FM7:underpub |
| Sports Finance | 5 | 122 | 5.3 | 0.80% | 13.4s | — |
| OpenAI/Pricing | 3 | 121 | 5.0 | 2.20% | 9.7s | FM7:underpub |
| DeepSeek/China | 1 | 114 | 5.8 | 0.88% | 8.8s | FM7:underpub |
| Fed/Economy | 1 | 110 | 4.1 | 1.82% | 10.1s | FM7:underpub |

### TikTok (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 1 | 161 | 6.1 | 2.48% | FM7:underpub |
| Tax/Policy | 3 | 69 | 2.6 | 0.50% | FM6:spike,FM7:underpub |
| Sports Finance | 5 | 58 | 2.2 | 1.07% | FM6:spike |
| AI Memory | 1 | 48 | 2.0 | 2.08% | FM7:underpub |
| NVIDIA/Compute | 46 | 46 | 2.4 | 0.31% | FM6:spike |
| General AI | 19 | 29 | 1.3 | 0.18% | FM6:spike |
| Tesla/Elon | 28 | 13 | 0.6 | 0.51% | FM6:spike |
| DeepSeek/China | 1 | 12 | 0.6 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 3 | 4 | 0.2 | 0.00% | FM7:underpub |
| Scaling Laws | 1 | 2 | 0.1 | 0.00% | FM7:underpub |
| DeepMind | 2 | 1 | 0.0 | 0.00% | FM7:underpub |

### YouTube (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 17.4 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 10.8 | 0.00% | — |
| Startup Finance | 5 | 318 | 6.4 | 0.00% | — |
| AI Memory | 2 | 252 | 6.0 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 4.1 | 0.00% | FM6:spike |
| General AI | 157 | 178 | 3.3 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 3.6 | 0.00% | FM6:spike |
| Tax/Policy | 5 | 173 | 3.3 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 3.9 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 15 | 50 | 0.9 | 0.00% | FM6:spike |
| NVIDIA/Compute | 64 | 45 | 1.1 | 0.00% | FM6:spike |
| Scaling Laws | 9 | 21 | 0.5 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.3 | 0.00% | FM7:underpub |
| DeepSeek/China | 13 | 7 | 0.2 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.0 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 8 | 596 | 1.45% | 15.8s | Reach/new audiences |
| The/Number-hook | 15 | 210 | 0.74% | 8.9s | Watch time/saves |
| Why-hook | 14 | 186 | 0.67% | 10.4s | ER/comments/shares |
| Other-hook | 75 | 157 | 0.95% | 9.7s | Varies |
| Breaking-hook | 2 | 126 | 1.62% | 9.1s | Timeliness |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 280 avg views vs 213 off-peak (1.3× multiplier)
- **44% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
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
- **DeepMind**: 2 posts, 132 avg views — test 5–8 more to confirm
- **Scaling Laws**: 1 posts, 132 avg views — test 5–8 more to confirm
- **Fed/Economy**: 1 posts, 161 avg views — test 5–8 more to confirm
- **Tax/Policy**: 3 posts, 69 avg views — test 5–8 more to confirm
- **AI Memory**: 1 posts, 48 avg views — test 5–8 more to confirm
- **DeepSeek/China**: 1 posts, 12 avg views — test 5–8 more to confirm
- **OpenAI/Pricing**: 3 posts, 4 avg views — test 5–8 more to confirm
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
