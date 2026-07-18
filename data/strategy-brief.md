# OpenClips Strategy Brief

Generated: 2026-07-18T09:11:26Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 13 excluded | TT: 13 excluded | YT: 13 excluded
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 288 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (91 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Fed/Economy**: IG #13 (57 avg) vs TikTok #1 (170 avg) — do not cross-post
- **Health/Diet**: IG #12 (78 avg) vs TikTok #3 (88 avg) — do not cross-post
- **Tesla/Elon**: IG #2 (191 avg) vs TikTok #7 (15 avg) — do not cross-post
- **NVIDIA/Compute**: IG #1 (288 avg) vs TikTok #5 (30 avg) — do not cross-post

---

## Topic Performance

### Instagram (13 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 106 | 288 | 20.1 | 1.45% | 11.4s | FM6:spike |
| Tesla/Elon | 33 | 191 | 28.4 | 0.88% | 9.3s | FM6:spike |
| General AI | 40 | 177 | 22.0 | 1.41% | 9.6s | FM6:spike |
| Sports Finance | 11 | 133 | 10.6 | 0.92% | 11.7s | — |
| Tax/Policy | 4 | 133 | 14.4 | 0.85% | 13.2s | FM7:underpub |
| AI Memory | 5 | 131 | 9.8 | 1.99% | 12.8s | — |
| DeepMind | 5 | 127 | 8.5 | 2.12% | 7.8s | — |
| DeepSeek/China | 10 | 121 | 7.0 | 2.15% | 9.0s | — |
| Startup Finance | 2 | 116 | 3.9 | 2.12% | 7.2s | FM7:underpub |
| OpenAI/Pricing | 7 | 111 | 14.4 | 1.48% | 9.6s | — |
| Scaling Laws | 2 | 108 | 6.2 | 0.00% | 5.3s | FM7:underpub |
| Health/Diet | 2 | 78 | 3.4 | 0.36% | 7.9s | FM7:underpub |
| Fed/Economy | 5 | 57 | 3.9 | 2.09% | 6.6s | — |
| Business/Contrarian | 1 | 0 | 0.0 | 0.00% | 0.0s | FM7:underpub |

### TikTok (13 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 170 | 9.1 | 1.64% | — |
| Sports Finance | 10 | 91 | 5.9 | 0.97% | FM6:spike,FM5:saturating |
| Health/Diet | 2 | 88 | 3.9 | 0.00% | FM7:underpub |
| Tax/Policy | 4 | 52 | 6.1 | 0.37% | FM6:spike,FM7:underpub,FM5:saturating |
| NVIDIA/Compute | 94 | 30 | 3.4 | 0.82% | FM6:spike |
| General AI | 37 | 24 | 4.9 | 0.18% | FM6:spike |
| Tesla/Elon | 30 | 15 | 2.5 | 0.52% | FM6:spike |
| AI Memory | 4 | 6 | 0.8 | 0.00% | FM6:spike,FM7:underpub |
| DeepMind | 5 | 4 | 0.2 | 0.00% | — |
| DeepSeek/China | 9 | 3 | 0.2 | 0.00% | — |
| Startup Finance | 2 | 2 | 0.1 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 7 | 2 | 0.2 | 0.00% | — |
| Business/Contrarian | 1 | 1 | 0.0 | 0.00% | FM7:underpub |
| Scaling Laws | 2 | 0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (13 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 25.3 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 16.7 | 0.00% | — |
| Startup Finance | 5 | 318 | 10.1 | 0.00% | — |
| Tesla/Elon | 4 | 286 | 7.6 | 0.00% | FM6:spike,FM7:underpub |
| AI Memory | 2 | 252 | 10.5 | 0.00% | FM7:underpub |
| General AI | 144 | 194 | 5.4 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 5.8 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 6.7 | 0.00% | FM7:underpub |
| Tax/Policy | 5 | 173 | 5.0 | 0.00% | FM6:spike |
| OpenAI/Pricing | 13 | 57 | 1.7 | 0.00% | FM6:spike |
| NVIDIA/Compute | 52 | 55 | 2.4 | 0.00% | FM6:spike |
| Scaling Laws | 8 | 24 | 0.9 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.5 | 0.00% | FM7:underpub |
| DeepSeek/China | 10 | 7 | 0.5 | 0.00% | — |
| DeepMind | 2 | 3 | 0.2 | 0.00% | FM7:underpub,FM5:saturating |
| Health/Diet | 3 | 2 | 0.1 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 20 | 407 | 1.47% | 12.6s | Reach/new audiences |
| The/Number-hook | 29 | 231 | 1.34% | 10.0s | Watch time/saves |
| Breaking-hook | 11 | 223 | 1.69% | 10.9s | Timeliness |
| Other-hook | 135 | 198 | 1.30% | 10.1s | Varies |
| Why-hook | 38 | 160 | 1.51% | 10.3s | ER/comments/shares |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 252 avg views vs 198 off-peak (1.3× multiplier)
- **54% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
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
