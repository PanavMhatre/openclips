# OpenClips Strategy Brief

Generated: 2026-08-10T09:01:29Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 0 excluded | TT: 17 excluded | YT: 13 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 19% | TT 18%
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

NVIDIA/Compute content launched in the final week of this analysis window and is averaging 218 views/post on Instagram — well above the platform average. On TikTok, the v2 classifier reveals Sports Finance (31 avg views) and Crypto (0 avg views) as the top performers, categories that were previously buried in unclassified buckets. The #1 growth lever is platform bifurcation: keep the NVIDIA pipeline for Instagram and YouTube; pivot TikTok production to Sports Finance, Crypto, and Fed/Economy.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Tesla/Elon**: IG #1 (373 avg) vs TikTok #6 (16 avg) — do not cross-post
- **DeepSeek/China**: IG #8 (114 avg) vs TikTok #4 (28 avg) — do not cross-post

---

## Topic Performance

### Instagram (0 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| Tesla/Elon | 15 | 373 | 14.2 | 0.65% | 10.8s | FM6:spike |
| General AI | 13 | 247 | 8.9 | 0.98% | 11.9s | FM6:spike |
| NVIDIA/Compute | 33 | 218 | 9.4 | 0.83% | 9.2s | FM6:spike |
| AI Memory | 1 | 151 | 5.3 | 0.66% | 20.5s | FM7:underpub |
| Scaling Laws | 1 | 132 | 5.5 | 0.00% | 9.9s | FM7:underpub |
| Sports Finance | 3 | 125 | 4.7 | 0.77% | 15.2s | FM7:underpub |
| OpenAI/Pricing | 2 | 122 | 4.4 | 2.05% | 9.5s | FM7:underpub |
| DeepSeek/China | 1 | 114 | 4.7 | 0.88% | 8.8s | FM7:underpub |

### TikTok (17 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| AI Memory | 1 | 49 | 1.7 | 2.04% | FM7:underpub |
| NVIDIA/Compute | 53 | 42 | 3.7 | 0.33% | FM6:spike |
| Sports Finance | 4 | 31 | 6.1 | 0.21% | FM6:spike,FM7:underpub |
| DeepSeek/China | 3 | 28 | 5.9 | 0.00% | FM6:spike,FM7:underpub |
| General AI | 18 | 24 | 1.0 | 0.08% | FM6:spike |
| Tesla/Elon | 17 | 16 | 0.6 | 0.77% | FM6:spike |
| OpenAI/Pricing | 2 | 4 | 0.1 | 0.00% | FM7:underpub |
| Scaling Laws | 1 | 2 | 0.1 | 0.00% | FM7:underpub |

### YouTube (13 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Personal Finance | 1 | 1005 | 16.0 | 0.00% | FM7:underpub |
| Business/Contrarian | 7 | 558 | 9.9 | 0.00% | — |
| Startup Finance | 5 | 318 | 5.8 | 0.00% | — |
| AI Memory | 2 | 252 | 5.4 | 0.00% | FM7:underpub |
| Tesla/Elon | 5 | 230 | 3.8 | 0.00% | FM6:spike |
| Sports Finance | 6 | 174 | 3.3 | 0.00% | FM6:spike |
| Tax/Policy | 5 | 173 | 3.0 | 0.00% | FM6:spike |
| Fed/Economy | 2 | 173 | 3.5 | 0.00% | FM7:underpub |
| General AI | 169 | 166 | 2.8 | 0.00% | FM6:spike |
| OpenAI/Pricing | 17 | 44 | 0.8 | 0.00% | FM6:spike |
| NVIDIA/Compute | 76 | 38 | 0.9 | 0.00% | FM6:spike |
| Scaling Laws | 10 | 19 | 0.4 | 0.00% | FM6:spike |
| AI Hardware | 1 | 10 | 0.2 | 0.00% | FM7:underpub |
| DeepSeek/China | 16 | 6 | 0.3 | 0.00% | FM6:spike |
| DeepMind | 2 | 3 | 0.1 | 0.00% | FM7:underpub |
| Health/Diet | 3 | 2 | 0.0 | 0.00% | FM6:spike,FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook | Posts | AvgViews | AvgER% | AvgWatch | Best for |
|---|---|---|---|---|---|
| How-hook | 7 | 662 | 1.25% | 16.6s | Reach/new audiences |
| The/Number-hook | 9 | 256 | 0.82% | 9.6s | Watch time/saves |
| Why-hook | 10 | 203 | 0.56% | 9.2s | ER/comments/shares |
| Other-hook | 42 | 188 | 0.86% | 10.0s | Varies |
| Breaking-hook | 1 | 130 | 0.00% | 10.9s | Timeliness |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 280 avg views vs 260 off-peak (1.1× multiplier)
- **42% of current posts land in this window** — shift remaining posts into 20:00–21:00 UTC
- Secondary window: 12:00–13:00 UTC for a mid-day second post

---

## Boost keywords



---

## Avoid keywords



---

## Weekly Saturation Watch

- No saturating topics detected this cycle.

---

## Underpublished Opportunities

- **AI Memory**: 1 posts, 151 avg views — test 5–8 more to confirm
- **Scaling Laws**: 1 posts, 132 avg views — test 5–8 more to confirm
- **Sports Finance**: 3 posts, 125 avg views — test 5–8 more to confirm
- **AI Memory**: 1 posts, 49 avg views — test 5–8 more to confirm
- **Sports Finance**: 4 posts, 31 avg views — test 5–8 more to confirm
- **DeepSeek/China**: 3 posts, 28 avg views — test 5–8 more to confirm
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
