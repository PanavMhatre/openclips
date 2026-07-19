# OpenClips Strategy Brief

Generated: 2026-07-19T09:31:03Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 15 excluded | TT: 15 excluded | YT: 13 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 16% | TT 16%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 283 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (101 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #13 (57 avg) vs TikTok #1 (170 avg) — do not cross-post
- **Health/Diet**: IG #12 (78 avg) vs TikTok #3 (88 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (191 avg) vs TikTok #7 (15 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (283 avg) vs TikTok #5 (29 avg) — do not cross-post

---

## Topic Performance

### Instagram (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 110 | 283 | 20.0 | 1.40% | 11.4s | FM6:spike |
| Tesla/Elon | 33 | 191 | 24.4 | 0.88% | 9.3s | FM6:spike |
| General AI | 37 | 189 | 22.9 | 1.49% | 9.9s | FM6:spike |
| Sports Finance | 10 | 133 | 10.0 | 1.01% | 11.6s | — |
| Tax/Policy | 4 | 133 | 12.9 | 0.85% | 13.2s | FM7:underpub |
| AI Memory | 5 | 131 | 8.8 | 1.99% | 12.8s | — |
| DeepMind | 5 | 127 | 8.0 | 2.12% | 7.8s | — |
| DeepSeek/China | 11 | 121 | 10.1 | 2.03% | 9.0s | — |
| Startup Finance | 1 | 120 | 4.0 | 3.33% | 8.6s | FM7:underpub |
| OpenAI/Pricing | 7 | 111 | 11.7 | 1.48% | 9.6s | — |
| Scaling Laws | 2 | 108 | 5.9 | 0.00% | 5.3s | FM7:underpub |
| Health/Diet | 2 | 78 | 3.2 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 57 | 3.6 | 2.09% | 6.6s | — |

### TikTok (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 170 | 8.5 | 1.64% | — |
| Sports Finance | 9 | 101 | 6.1 | 1.08% | FM6:spike,FM5:saturating |
| Health/Diet | 2 | 88 | 3.7 | 0.00% | FM7:underpub |
| Tax/Policy | 4 | 52 | 5.4 | 0.37% | FM6:spike,FM7:underpub,FM5:saturating |
| NVIDIA/Compute | 98 | 29 | 2.8 | 0.79% | FM6:spike |
| General AI | 34 | 26 | 4.1 | 0.20% | FM6:spike |
| Tesla/Elon | 30 | 15 | 2.1 | 0.52% | FM6:spike,FM5:saturating |
| AI Memory | 4 | 8 | 1.0 | 0.00% | FM6:spike,FM7:underpub |
| DeepSeek/China | 10 | 4 | 0.6 | 0.00% | FM6:spike |
| DeepMind | 5 | 4 | 0.2 | 0.00% | — |
| OpenAI/Pricing | 7 | 2 | 0.2 | 0.00% | — |
| Startup Finance | 1 | 2 | 0.1 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (13 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 24.6 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 16.2 | 0.00% | — |
| Startup Finance | 5 | 318 | 9.8 | 0.00% | — |
| Tesla/Elon | 4 | 286 | 7.4 | 0.00% | FM6:spike,FM7:underpub |
| AI Memory | 2 | 252 | 10.1 | 0.00% | FM7:underpub |
| General AI | 147 | 190 | 5.2 | 0.00% | FM6:spike |
| Sports Finance | 6 | 175 | 5.6 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 6.5 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 4.9 | 0.00% | FM6:spike |
| OpenAI/Pricing | 14 | 53 | 1.5 | 0.00% | FM6:spike |
| NVIDIA/Compute | 54 | 53 | 2.3 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 0.9 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.4 | 0.00% | FM7:underpub |
| DeepSeek/China | 11 | 7 | 0.5 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.2 | 0.00% | FM7:underpub,FM5:saturating |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 17 | 458 | 1.61% | 13.3s | Reach/new audiences |
| The/Number-hook | 28 | 239 | 1.32% | 9.8s | Watch time/saves |
| Breaking-hook | 11 | 223 | 1.69% | 10.9s | Timeliness |
| Other-hook | 139 | 196 | 1.29% | 10.1s | Varies |
| Why-hook | 37 | 172 | 1.54% | 10.8s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 246 avg views vs 205 off-peak (1.2× multiplier)
- **56% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
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
- **AI Memory**: 4 posts, 8 avg views — test 5–8 more to confirm
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
