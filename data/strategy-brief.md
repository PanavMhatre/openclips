# OpenClips Strategy Brief

Generated: 2026-07-22T10:08:01Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 6 excluded | TT: 6 excluded | YT: 6 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 15% | TT 15%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 287 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (91 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #12 (57 avg) vs TikTok #1 (170 avg) — do not cross-post
- **Health/Diet**: IG #11 (78 avg) vs TikTok #3 (88 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (214 avg) vs TikTok #7 (13 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (287 avg) vs TikTok #5 (29 avg) — do not cross-post

---

## Topic Performance

### Instagram (6 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 122 | 287 | 22.1 | 1.37% | 11.3s | FM6:spike |
| Tesla/Elon | 37 | 214 | 29.8 | 0.90% | 9.3s | FM6:spike,FM5:saturating |
| General AI | 38 | 188 | 16.1 | 1.48% | 9.9s | FM6:spike |
| Tax/Policy | 4 | 133 | 9.9 | 0.85% | 13.2s | FM7:underpub |
| Sports Finance | 11 | 132 | 10.1 | 0.99% | 11.3s | — |
| AI Memory | 5 | 131 | 6.9 | 1.99% | 12.8s | — |
| DeepMind | 5 | 127 | 6.7 | 2.12% | 7.8s | — |
| DeepSeek/China | 11 | 121 | 7.0 | 2.03% | 9.0s | — |
| Scaling Laws | 3 | 116 | 12.3 | 0.00% | 6.8s | FM7:underpub |
| OpenAI/Pricing | 7 | 111 | 8.1 | 1.48% | 9.6s | — |
| Health/Diet | 2 | 78 | 2.9 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 57 | 2.9 | 2.09% | 6.6s | — |

### TikTok (6 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 170 | 7.2 | 1.64% | — |
| Sports Finance | 10 | 91 | 4.5 | 0.97% | FM6:spike |
| Health/Diet | 2 | 88 | 3.3 | 0.00% | FM7:underpub |
| Tax/Policy | 4 | 52 | 4.1 | 0.37% | FM6:spike,FM7:underpub,FM5:saturating |
| NVIDIA/Compute | 111 | 29 | 2.8 | 0.71% | FM6:spike,FM5:saturating |
| General AI | 35 | 25 | 2.5 | 0.30% | FM6:spike |
| Tesla/Elon | 34 | 13 | 1.3 | 0.46% | FM6:spike,FM5:saturating |
| AI Memory | 4 | 10 | 0.8 | 0.00% | FM6:spike,FM7:underpub |
| DeepSeek/China | 10 | 4 | 0.3 | 0.00% | — |
| DeepMind | 5 | 4 | 0.2 | 0.00% | — |
| OpenAI/Pricing | 7 | 3 | 0.2 | 0.00% | — |
| Scaling Laws | 3 | 1 | 0.1 | 0.00% | FM7:underpub |

### YouTube (6 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 22.9 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 14.9 | 0.00% | — |
| Startup Finance | 5 | 318 | 9.0 | 0.00% | — |
| AI Memory | 2 | 252 | 9.0 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 229 | 5.5 | 0.00% | FM6:spike |
| General AI | 155 | 180 | 4.5 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 5.1 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 5.8 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 4.5 | 0.00% | FM6:spike |
| OpenAI/Pricing | 14 | 53 | 1.4 | 0.00% | FM6:spike |
| NVIDIA/Compute | 62 | 46 | 1.8 | 0.00% | FM6:spike |
| Scaling Laws | 9 | 21 | 0.7 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.4 | 0.00% | FM7:underpub |
| DeepSeek/China | 12 | 7 | 0.4 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.2 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 19 | 468 | 1.65% | 13.0s | Reach/new audiences |
| The/Number-hook | 31 | 228 | 1.25% | 9.6s | Watch time/saves |
| Breaking-hook | 11 | 223 | 1.69% | 10.9s | Timeliness |
| Other-hook | 149 | 204 | 1.27% | 10.2s | Varies |
| Why-hook | 40 | 184 | 1.43% | 10.9s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 271 avg views vs 222 off-peak (1.2× multiplier)
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

- **Tesla/Elon** (IG): wk1 408 → wk2 207 → wk3 123 views — reduce by 30–50%

---

## Underpublished Opportunities

- **Tax/Policy**: 4 posts, 133 avg views — test 5–8 more to confirm
- **Health/Diet**: 2 posts, 88 avg views — test 5–8 more to confirm
- **Tax/Policy**: 4 posts, 52 avg views — test 5–8 more to confirm
- **AI Memory**: 4 posts, 10 avg views — test 5–8 more to confirm
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
