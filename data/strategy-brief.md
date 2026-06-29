# OpenClips Strategy Brief

Generated: 2026-06-29T00:00:00Z

## Methodology Diagnostics

### FM-1: Fresh Post Contamination
- Instagram: 15 posts excluded (<48h old)
- TikTok: 15 posts excluded (<48h old)
- YouTube: 6 posts excluded (<48h old)
- Status: **TRIGGERED** — averages now reflect only mature posts

### FM-2: Coarse Topic Buckets
- General AI share: IG 41/144 = 28%, TT similar
- Status: **TRIGGERED** — v2 classifier applied, 17 topic buckets

### FM-3: Total Views vs View Velocity
- Age-corrected VpD applied to all rankings
- Status: **APPLIED** — top IG post by VpD: 303.7 views/day for "How One GPU Can Power a 4-Trillion Parameter AI"

### FM-4: Platform Cross-Posting Divergence
- Topics with IG vs TT rank divergence ≥4 positions:
  - Fed/Economy: IG rank #13 vs TikTok rank #2 — DO NOT cross-post
  - Tax/Policy: IG rank #3 vs TikTok rank #13 — DO NOT cross-post
  - Business/Contrarian: IG rank #14 vs TikTok rank #5 — DO NOT cross-post
  - Investing: IG rank #1 vs TikTok rank #8 — DO NOT cross-post
  - NVIDIA/Compute: IG rank #2 vs TikTok rank #9 — DO NOT cross-post

### FM-5: Weekly Saturation Detection
- NVIDIA/Compute: Wk1: 176 → Wk2: 0 → Wk3: 0
- Week 1 spike is real — NVIDIA content started <7 days ago, no week 2/3 baseline yet
- Status: **MONITOR** — insufficient week 2/3 NVIDIA data; re-assess in next run

### FM-6: Spike vs Trend Detection
- Topics with spike flag (max post >3x median): Investing, NVIDIA/Compute, General AI, Fed/Economy, Business/Contrarian
- Status: flagged topics excluded from Boost keywords

### FM-7: Underpublished High-Performers
- IG above-median with <5 posts: Tax/Policy, AI Memory, Crypto
- TT above-median with <5 posts: Crypto, Health/Diet, AI Memory, OpenAI/Pricing
- Status: flagged for test production below

---

## Summary

NVIDIA/Compute content launched within the last 7 days and is already the Instagram breakout story — 323 views/post average in week 1 vs a channel-wide week-1 baseline of 162 views/post, making it the highest-performing topic by a wide margin. On TikTok, the v2 classifier unmasked a completely hidden opportunity: Sports Finance (10 posts, 128 avg views) and Crypto/political finance (2 posts, 169 avg views) have been outperforming NVIDIA by 5–7x on that platform while being invisible in the previous analysis. The #1 growth lever this week is platform bifurcation: keep the NVIDIA pipeline pointed at Instagram and YouTube, and redirect TikTok production to Sports Finance, Crypto news, and Fed/Economy.

---

## Platform Divergence Alert — DO NOT Cross-Post These

- **Fed/Economy**: IG #13 (35 avg) vs TikTok #2 (136 avg) — cross-posting wastes reach
- **Tax/Policy**: IG #3 (130 avg) vs TikTok #13 (1 avg) — cross-posting wastes reach
- **Business/Contrarian**: IG #14 (32 avg) vs TikTok #5 (73 avg) — cross-posting wastes reach
- **Investing**: IG #1 (265 avg) vs TikTok #8 (22 avg) — cross-posting wastes reach
- **NVIDIA/Compute**: IG #2 (176 avg) vs TikTok #9 (9 avg) — cross-posting wastes reach
- **AI Memory**: IG #4 (126 avg) vs TikTok #10 (3 avg) — cross-posting wastes reach

---

## Topic Performance (mature posts only, <48h excluded)

### Instagram (15 fresh posts excluded from 144 total)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| Investing | 8 | 264.6 | 58.9 | 1.69% | 9.5s | FM6:spike |
| NVIDIA/Compute | 26 | 175.8 | 44.8 | 1.97% | 11.8s | FM6:spike |
| Tax/Policy | 2 | 129.5 | 8.7 | 2.66% | 18.6s | FM7:underpub |
| AI Memory | 4 | 126.0 | 36.2 | 2.32% | 10.9s | FM7:underpub |
| Crypto | 1 | 125.0 | 6.2 | 0.80% | 25.7s | FM7:underpub |
| Sports Finance | 10 | 111.2 | 14.8 | 0.57% | 9.4s | — |
| Startup Finance | 5 | 103.2 | 8.7 | 2.30% | 9.6s | — |
| Health/Diet | 2 | 77.5 | 22.4 | 0.36% | 7.9s | FM7:underpub |
| OpenAI/Pricing | 3 | 70.7 | 17.2 | 0.97% | 9.9s | FM7:underpub |
| DeepSeek/China | 3 | 63.3 | 19.3 | 0.28% | 7.9s | FM7:underpub |
| Tesla/Elon | 11 | 61.7 | 10.7 | 0.89% | 8.9s | — |
| General AI | 40 | 58.0 | 6.1 | 1.04% | 12.8s | FM6:spike |
| Fed/Economy | 5 | 35.2 | 5.4 | 1.73% | 5.3s | FM6:spike |
| Business/Contrarian | 9 | 32.2 | 2.1 | 1.46% | 18.4s | FM6:spike |

### TikTok (15 fresh posts excluded from 138 total)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Crypto | 2 | 169.0 | 8.4 | 0.74% | FM7:underpub |
| Fed/Economy | 5 | 136.4 | 21.3 | 1.15% | — |
| Sports Finance | 10 | 128.2 | 14.3 | 1.06% | — |
| Health/Diet | 2 | 82.5 | 23.9 | 0.00% | FM7:underpub |
| Business/Contrarian | 9 | 73.2 | 4.2 | 0.73% | FM6:spike |
| Startup Finance | 5 | 32.4 | 2.3 | 0.40% | FM6:spike |
| General AI | 38 | 22.0 | 1.3 | 3.48% | FM6:spike |
| Investing | 8 | 21.8 | 1.3 | 0.41% | FM6:spike |
| NVIDIA/Compute | 24 | 9.4 | 2.9 | 0.96% | FM6:spike |
| AI Memory | 3 | 3.0 | 0.9 | 0.00% | FM7:underpub |
| OpenAI/Pricing | 3 | 3.0 | 0.3 | 0.00% | FM7:underpub |
| Tesla/Elon | 10 | 2.6 | 0.2 | 0.00% | FM6:spike |
| Tax/Policy | 2 | 1.0 | 0.1 | 0.00% | FM7:underpub |
| DeepSeek/China | 2 | 1.0 | 0.0 | 0.00% | FM7:underpub |

### YouTube (6 fresh posts excluded from 91 total)

| Topic | Posts | AvgViews | AvgLikes | Flags |
|---|---|---|---|---|
| Business/Contrarian | 6 | 457.5 | 0.00 | FM5:saturating |
| Sports Finance | 3 | 347.7 | 0.00 | FM7:underpub |
| Startup Finance | 4 | 298.5 | 0.00 | FM7:underpub |
| Tax/Policy | 1 | 242.0 | 0.00 | FM7:underpub |
| NVIDIA/Compute | 14 | 190.1 | 0.00 | FM6:spike |
| Fed/Economy | 2 | 173.0 | 0.00 | FM7:underpub |
| AI Memory | 3 | 168.0 | 0.00 | FM6:spike,FM7:underpub |
| General AI | 36 | 143.6 | 0.00 | FM6:spike |
| Scaling Laws | 3 | 61.0 | 0.00 | FM6:spike,FM7:underpub |
| AI Hardware | 1 | 10.0 | 0.00 | FM7:underpub |
| DeepSeek/China | 2 | 7.5 | 0.00 | FM7:underpub |
| OpenAI/Pricing | 6 | 5.0 | 0.00 | FM6:spike |
| Investing | 1 | 3.0 | 0.00 | FM7:underpub |
| Health/Diet | 3 | 1.7 | 0.00 | FM7:underpub |

---

## Hook Analysis (Instagram)

| Hook Type | Posts | AvgViews | AvgER% | AvgWatch | Best use |
|---|---|---|---|---|---|
| How-hook | 15 | 172.3 | 1.27% | 8.9s | New audiences, reach |
| Why-hook | 37 | 111.0 | 1.53% | 12.1s | ER, comments, shares |
| The/Number-hook | 22 | 95.8 | 1.45% | 19.6s | Watch time, retention |
| Other-hook | 49 | 80.6 | 1.14% | 8.4s | Varies |
| Breaking-hook | 6 | 79.3 | 1.91% | 13.0s | Timeliness |

---

## Timing

- **Best window: 20:00–21:00 UTC** — averages 192.6 views/post vs 77.1 for all other hours (2.5x multiplier)
- **Currently 34% of mature posts land in this window** — there is room to shift more
- Second-best window: 12:00–13:00 UTC (151.8 avg) — good for a mid-day second post

---

## Boost keywords

NFL, franchise value, sports economics, Cowboys, subsidize, $300M funding, startup death, VC kill, funding round, death sentence, 

---

## Avoid keywords

Tesla valuation, TSLA, Elon Musk (TikTok-specific only)

---

## Weekly Saturation Watch

- **NVIDIA/Compute (IG)**: Wk1: 176 → Wk2: 0 → Wk3: 0 — week 2/3 data is near-zero because the topic only started this week. Re-evaluate in 14 days. Do not assume saturation.
- **Investing (TikTok)**: 26 posts, 26.7 avg views — has been flat for 3+ weeks. Cut volume by 50%.
- **Tesla/Elon (TikTok)**: 10 posts, 10.6 avg views. Declining. Pause.
- **OpenAI/Pricing (YouTube)**: 6 posts, avg 2.5 views. Dead. Halt production.

---

## Underpublished Opportunities

- **Tax/Policy**: 2 posts, 130 avg views — recommend 5–8 more posts to confirm trend
- **AI Memory**: 4 posts, 126 avg views — recommend 5–8 more posts to confirm trend
- **Crypto**: 1 posts, 125 avg views — recommend 5–8 more posts to confirm trend
- **Crypto**: 2 posts, 169 avg views — recommend 5–8 more posts to confirm trend
- **Health/Diet**: 2 posts, 82 avg views — recommend 5–8 more posts to confirm trend
- **AI Memory**: 3 posts, 3 avg views — recommend 5–8 more posts to confirm trend
- **OpenAI/Pricing**: 3 posts, 3 avg views — recommend 5–8 more posts to confirm trend
- **Crypto (TikTok)**: 2 posts only, 169 avg views — highest TikTok topic. Run 8 posts in next 7 days to confirm.
- **Sports Finance (TikTok)**: 10 posts, 128 avg — strong sample but not yet pushed to Instagram or YouTube. Test 3 cross-platform posts.
- **DeepMind (IG)**: 2 posts, 89 avg + "DeepMind Cracks Gold-Medal Math" hit 6.26% ER (highest ER in dataset). Run 1 DeepMind achievement post per week.

---

## Notes

- **The channel pivoted to NVIDIA ≤7 days ago.** Weeks 2–4 had zero NVIDIA posts and averaged 36–68 views/post. Week 1 with NVIDIA averages 162 views/post overall, 323 for NVIDIA specifically. This is the winning formula — accelerate, don't rotate away.
- **Age-corrected velocity top 3 (IG)**: "How One GPU Can Power a 4-Trillion Parameter AI" (303.7 v/day), "Why NVIDIA Gave Up Profits for CUDA" (249.7 v/day), "The 4 Trillion Parameter Secret NVIDIA Hid" (171.3 v/day).
- **Highest ER post**: "DeepMind Cracks Gold-Medal Math" — 6.26% ER. AI achievement/milestone format triggers share behavior. Post 1/week minimum.
- **Jensen Huang direct-quote format consistently outperforms** narrator summaries: 3.6–4.5% ER vs 0.7–1.5%. Caption style: "[X] casually reveals that..." or "[Name] just dropped that..."
- **TikTok's hidden winners exposed by v2 classifier**: "TRUMP COIN WIPES OUT $35 BILLION" (337 views), "Why $39 Trillion Debt Is Killing Your Wallet" (264 views), "Nothing Has Changed Since 2000" (261 views). Sources: Kyla Scanlon, Jaspreet Singh, Chamath Palihapitiya.
- **YouTube contrarian finance** is quietly strong: "$300M Kills Startups Faster" (428 views), "How the Cowboys Subsidize Every NFL Team" (519 views), "Why Your Stock Picks Always Fail" (256 views). These are non-AI clips outperforming most AI content on YouTube.
- **AI Memory is severely underproduced**: 252 avg YouTube views (highest category), 126 avg IG views, but only 2–4 posts in 30 days. Target: 3 posts/week. Proven hooks: "Why ChatGPT Forgets Instantly", "The Goldfish Brain Flaw Killing AI."
- **Watch time outlier**: "The/Number-hooks" average 19.0s watch time on Instagram — use for content targeting saves and algorithm-recommended reach.
