# OpenClips Strategy Brief

Generated: 2026-06-29T01:28:13Z

## Methodology Diagnostics

### FM-1: Fresh Post Contamination
- Instagram: 15 posts excluded (<48h old) — Jun 28 posts (9) + Jun 27 20:08–20:18 UTC posts (6)
- TikTok: 15 posts excluded (<48h old) — same window
- YouTube: Most recent 6 videos excluded (<48h)
- Status: **TRIGGERED** — 309.5 vs 419 raw avg for NVIDIA/Compute; exclusions are critical this week

### FM-2: Coarse Topic Buckets
- Before v2: General AI captured 41/144 IG posts (28%), 38/134 TT posts (28%)
- After v2: 17 distinct buckets; General AI now 19 mature IG posts (15%) and 15 mature TT posts (13%)
- Status: **TRIGGERED** — v2 classifier applied; previous brief's "Investing #1 on IG (265 avg)" was misclassification of NVIDIA posts. Corrected to NVIDIA/Compute #1 (309.5 avg)

### FM-3: Total Views vs View Velocity
- Age-corrected VpD computed for all platforms
- IG VpD top 3: "Why NVIDIA Gave Up Profits for CUDA" (1277 views/6d = 212.8 VpD), "How One GPU Can Power a 4-Trillion Parameter AI" (1259 views/5d = 251.8 VpD), "The 4 Trillion Parameter Secret NVIDIA Hid" (535 views/4d = 133.8 VpD)
- Status: **APPLIED**

### FM-4: Platform Cross-Posting Divergence
- Topics with IG vs TT rank divergence ≥4 positions (DO NOT cross-post):
  - Fed/Economy: IG #16 (57 avg) vs TT #1 (178 avg) — diff=15 ← most extreme
  - Tax/Policy: IG #2 (130 avg) vs TT #17 (1 avg) — diff=15
  - Business/Contrarian: IG #17 (32 avg) vs TT #4 (73 avg) — diff=13
  - Scaling Laws: IG #5 (118 avg) vs TT #16 (1 avg) — diff=11
  - AI Memory: IG #4 (123 avg) vs TT #14 (3 avg) — diff=10
  - NVIDIA/Compute: IG #1 (310 avg) vs TT #10 (15 avg) — diff=9
  - Health/Diet: IG #13 (72 avg) vs TT #5 (70 avg) — diff=8
  - DeepSeek/China: IG #8 (90 avg) vs TT #15 (1 avg) — diff=7
  - DeepMind: IG #7 (105 avg) vs TT #13 (4 avg) — diff=6
  - Investing: IG #15 (63 avg) vs TT #9 (15 avg) — diff=6
- Status: **TRIGGERED** — 10 of 17 topics diverge by ≥4 ranks; IG and TikTok require fully separate content pipelines

### FM-5: Weekly Saturation Detection (Instagram)
- NVIDIA/Compute: Wk1: 309 avg (15 posts) | Wk2: n/a | Wk3: n/a — topic started this week, no baseline yet
- Startup Finance: Wk2: 81 avg (10 posts) → Wk3: 47 avg (5 posts) → **-42% drop** — TRIGGERED
- OpenAI/Pricing: Wk1: 109 avg (7 posts) → Wk3: 43 avg (4 posts) → **-60% drop** — TRIGGERED
- Status: **TRIGGERED** for Startup Finance and OpenAI/Pricing; NVIDIA/Compute unconfirmed (monitor Wk2 starting Jun 30)

### FM-6: Spike vs Trend Detection
- NVIDIA/Compute IG: max 1,277 vs median 129 → spike ratio 9.9x → FM6 **TRIGGERED**
- Investing IG: max ~135 vs median ~62 → spike ratio 2.2x → PASS (no spike)
- Business/Contrarian IG: max 135 vs median 8 → spike ratio 16.9x → FM6 **TRIGGERED**
- General AI IG: FM6 **TRIGGERED**
- Status: NVIDIA/Compute, Business/Contrarian, General AI flagged — spike posts excluded from Boost keywords

### FM-7: Underpublished High-Performers
- IG above-median (>110v) with <5 posts: Tax/Policy (2p, 130 avg), Crypto (1p, 125 avg), AI Memory (3p, 123 avg), Scaling Laws (2p, 118 avg)
- TT above-median (>2.5v) with <5 posts: Crypto (2p, 169 avg), Health/Diet (4p, 70 avg), Tesla/Elon (4p, 40 avg), DeepMind (2p, 4.5 avg)
- Status: **TRIGGERED** — Crypto on TikTok is the single highest-yield underpublished opportunity

---

## Summary

Live data from Zernio confirms a critical correction vs the previous brief: NVIDIA/Compute is decisively Instagram's #1 topic at **309.5 avg views** (15 mature posts, FM-6 spike flag noted), not Investing as previously reported — the earlier classification was lumping NVIDIA posts into the wrong bucket. TikTok's platform is now led by the **Fed/Economy (Warsh batch: 177.6 avg, 5 posts)** with 9 of 10 divergent topics confirming these platforms require fully separate content strategies. The #1 growth lever this week is **Crypto on TikTok**: only 2 posts, 169 avg views, highest platform avg by a wide margin, and completely untested at scale. On the IG side, a second NVIDIA viral post just exited the 48-hour exclusion window (1,460 views on "One GPU Can Run Trillion-Parameter AI") suggesting NVIDIA saturation risk from Jun 30 onward should be watched closely.

---

## Platform Divergence Alert — DO NOT Cross-Post These

- **NVIDIA/Compute**: IG #1 (310 avg) vs TikTok #10 (15 avg) — NVIDIA content belongs on IG + YouTube ONLY
- **Fed/Economy**: IG #16 (57 avg) vs TikTok #1 (178 avg) — Warsh/macro content is TikTok-exclusive
- **Tax/Policy**: IG #2 (130 avg) vs TikTok #17 (1 avg) — Chamath tax clips are IG-only
- **Business/Contrarian**: IG #17 (32 avg) vs TikTok #4 (73 avg) — Chamath/Palihapitiya clips belong on TikTok
- **AI Memory**: IG #4 (123 avg) vs TikTok #14 (3 avg) — memory/goldfish clips are IG + YouTube only
- **Scaling Laws**: IG #5 (118 avg) vs TikTok #16 (1 avg) — scaling skeptic clips are IG + YouTube only
- **Health/Diet**: IG #13 (72 avg) vs TikTok #5 (70 avg) — roughly platform-neutral; safe to post both but watch IG underperformance

---

## Topic Performance (mature posts only, <48h excluded)

### Instagram (15 fresh posts excluded; 129 mature posts analyzed)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | FM-flags |
|---|---|---|---|---|---|---|
| NVIDIA/Compute | 15 | 309.5 | 75.3 | 1.55% | 12.9s | FM6:spike |
| Tax/Policy | 2 | 129.5 | 8.7 | 2.66% | 18.6s | FM7:underpub |
| Crypto | 1 | 125.0 | 0.80% | 0.80% | 25.7s | FM7:underpub |
| AI Memory | 3 | 123.3 | 38.8 | 1.60% | 10.8s | FM7:underpub |
| Scaling Laws | 2 | 118.0 | 21.0 | 2.13% | 11.1s | FM7:underpub |
| Sports Finance | 5 | 110.0 | 10.8 | 0.15% | 11.3s | — |
| DeepMind | 6 | 104.8 | 23.3 | 1.89% | 10.3s | — |
| DeepSeek/China | 4 | 90.2 | 27.6 | 1.75% | 8.5s | — |
| Personal Finance | 4 | 88.2 | 4.7 | 0.00% | 6.1s | — |
| Tesla/Elon | 3 | 86.7 | 18.6 | 0.24% | 11.0s | — |
| OpenAI/Pricing | 11 | 85.2 | 22.4 | 1.15% | 8.6s | FM5:saturating |
| Startup Finance | 16 | 72.5 | 6.1 | 1.65% | 7.9s | FM5:saturating |
| Health/Diet | 4 | 72.2 | 20.5 | 0.37% | 16.9s | FM7:underpub |
| General AI | 19 | 64.3 | 10.5 | 1.08% | 5.5s | FM6:spike |
| Investing | 20 | 62.9 | 6.9 | 1.66% | 7.7s | — |
| Fed/Economy | 5 | 57.4 | 8.9 | 1.90% | 7.7s | — |
| Business/Contrarian | 9 | 32.2 | 2.1 | 1.46% | 11.5s | FM6:spike |

### TikTok (15 fresh posts excluded; 119 mature posts analyzed)

| Topic | Posts | AvgViews | VpD | AvgER% | FM-flags |
|---|---|---|---|---|---|
| Fed/Economy | 5 | 177.6 | 27.5 | 1.34% | — |
| Crypto | 2 | 169.0 | 8.4 | 0.74% | FM7:underpub |
| Personal Finance | 5 | 80.4 | 3.9 | 0.68% | FM6:spike |
| Business/Contrarian | 9 | 73.2 | 4.2 | 0.73% | FM6:spike |
| Health/Diet | 4 | 70.2 | 20.0 | 0.21% | FM7:underpub |
| Sports Finance | 5 | 54.2 | 8.3 | 0.53% | FM6:spike |
| General AI | 15 | 49.0 | 2.6 | 0.53% | FM6:spike |
| Tesla/Elon | 4 | 40.0 | 1.8 | 0.82% | FM6:spike |
| Investing | 18 | 15.3 | 1.1 | 0.11% | FM6:spike |
| NVIDIA/Compute | 14 | 14.7 | 4.5 | 0.21% | FM6:spike |
| OpenAI/Pricing | 10 | 13.7 | 1.0 | 0.00% | FM6:spike |
| Startup Finance | 16 | 11.4 | 0.8 | 0.12% | FM6:spike |
| DeepMind | 2 | 4.5 | 1.7 | 0.00% | FM7:underpub |
| AI Memory | 3 | 3.0 | 0.9 | 0.00% | FM7:underpub |
| DeepSeek/China | 3 | 1.3 | 0.1 | 0.00% | — |
| Tax/Policy | 2 | 1.0 | 0.1 | 0.00% | — |
| Scaling Laws | 1 | 1.0 | 0.2 | 0.00% | — |

### YouTube (partial — top 100 videos analyzed, Jun 18–28 coverage; older videos not fetched)

| Topic | Posts | AvgViews | AvgLikes | FM-flags |
|---|---|---|---|---|
| Sports Finance | 1 | 519.0 | 2.0 | FM7:underpub |
| AI Memory | 1 | 503.0 | 1.0 | FM7:underpub |
| Startup Finance | 1 | 428.0 | 6.0 | FM7:underpub |
| Fed/Economy | 5 | 299.4 | 1.4 | — |
| NVIDIA/Compute | 9 | 295.1 | 5.4 | FM6:spike |
| DeepMind | 1 | 146.0 | 2.0 | FM7:underpub |
| Scaling Laws | 2 | 90.5 | 0.5 | — |
| OpenAI/Pricing | 1 | 15.0 | 0.0 | FM7:underpub |
| DeepSeek/China | 1 | 11.0 | 1.0 | FM7:underpub |

*Note: YouTube data covers most recent 100 videos only (Jun 18–28). Full 30-day data requires fetching older playlist pages — run manual refresh for complete YouTube breakdown.*

---

## Hook Analysis (Instagram, 129 mature posts)

| Hook Type | Posts | AvgViews | AvgER% | AvgWatch | Best use |
|---|---|---|---|---|---|
| How-hook | 15 | 172.3 | 1.27% | 8.9s | New audiences, reach — drives highest views |
| Why-hook | 37 | 111.0 | 1.53% | 10.3s | ER, comments, saves |
| The/Number-hook | 23 | 96.9 | 1.38% | 8.6s | Watch time moderate |
| Breaking-hook | 6 | 79.3 | 1.91% | 13.0s | Timeliness — highest ER but low sample |
| Other-hook | 48 | 79.8 | 1.17% | 8.1s | Lowest performing |

**Key insight**: How-hooks (172 avg) outperform Why-hooks (111 avg) by 55% — underused at only 15/129 posts (12%). Priority action: shift more NVIDIA clips to "How One GPU..." format.

---

## Timing

- **Best window: 20:00–21:00 UTC** — 44 posts, avg 168 views (1.64x vs off-peak)
- **Second-best: 12:00–13:00 UTC** — 14 posts, avg 103 views (1.00x)
- **Currently 34% of mature posts land in the best window** — shift remaining 66% toward 20–21 UTC
- Lowest performing: 17:00–18:00 UTC (avg 65 views, 0.63x)

---

## Boost keywords

Cowboys, NFL franchise value, Fed rate decision, Warsh task force, economic activity, trump coin, crypto wipes, $39 trillion debt, jaspreet, wallet

*Note: Only topics with ≥5 posts AND no FM-6 spike flag qualify. NVIDIA/Compute excluded from boost keywords due to FM-6 spike flag.*

---

## Avoid keywords

TikTok-specific: CUDA, GPU, trillion parameter, Jensen Huang, NVIDIA (all IG-exclusive topics)
IG-specific: federal reserve, Warsh, economic forecasting (TikTok-exclusive)
Both platforms (underperforming): DeepSeek, Chinese AI, AI arms race

---

## Weekly Saturation Watch

- **Startup Finance (IG)**: Wk2: 81 avg → Wk3: 47 avg (-42%) — reduce volume to 1-2 posts/week
- **OpenAI/Pricing (IG)**: Wk1 recent: 109 avg, Wk3 older: 43 avg (-60%) — the $2,000 narrative is exhausted; pause or reframe
- **Investing (IG)**: Volatile — Wk1: 122, Wk2: 49 (-60%), Wk3: 74 (+51%). No clear trend; hold current volume
- **NVIDIA/Compute (IG)**: Wk1 only (15 posts, 309 avg) — MONITOR week starting Jun 30 for first week-over-week comparison

---

## Underpublished Opportunities

- **Crypto (TikTok)**: 2 posts, 169 avg views — #1 TikTok avg by far, highest underpub signal. Run 8 posts over 7 days. Sources: Kyla Scanlon (Trump Coin), Jaspreet Singh (debt/crypto), Chamath macro-crypto angles.
- **AI Memory (IG)**: 3 posts, 123 avg views, 38.8 VpD — strong sustained signal. Proven hooks: "Why ChatGPT Forgets Instantly" (118 views), "The Goldfish Brain Flaw Killing AI" (120 views), "Why LLMs Need True Memory Updates" (132 views). Target: 3 posts/week.
- **Tax/Policy (IG)**: 2 posts, 130 avg views — Chamath California seizure tax content. Test 5 more posts. Caution: TikTok rank #17, IG-only.
- **Scaling Laws (IG)**: 2 posts, 118 avg — "Why Training Bigger Models Is a Sucker's Bet" and "Why Scaling Laws Are Secretly Dying" both perform. Run 3 more test posts.
- **Health/Diet (TikTok)**: 4 posts, 70 avg — Huberman/Norton clips consistently above TT median. Test 5 more posts before committing.
- **Fed/Economy (YouTube)**: 5 posts, 299 avg (Warsh batch) — near-parity with NVIDIA/Compute on YouTube. Underproduced relative to performance.

---

## Notes

- **Critical correction vs previous brief**: The Jun 29 00:00Z brief reported "Investing" as IG #1 at 265 avg. Live data shows this was a misclassification — NVIDIA posts were being bucketed as Investing. NVIDIA/Compute is correctly IG #1 at 309.5 avg. Do not use the previous brief's topic rankings.
- **1,460-view NVIDIA post still excluded**: "One GPU Can Run Trillion-Parameter AI" (Jun 27 20:10 UTC) exits the 48h fresh window at approximately Jun 29 20:10 UTC. Once included, NVIDIA/Compute avg will rise further, making the spike flag (FM-6) even more important to track.
- **Age-corrected VpD top 3 (IG mature)**: "How One GPU Can Power a 4-Trillion Parameter AI" (1259 views/5d = 251.8 VpD), "Why NVIDIA Gave Up Profits for CUDA" (1277 views/6d = 212.8 VpD), "The 4 Trillion Parameter Secret NVIDIA Hid" (535 views/4d = 133.8 VpD).
- **Jensen Huang direct-quote format** ("Jensen casually reveals...", "Jensen admits...") consistently achieves the highest single-post views in NVIDIA/Compute. Replicated across 3 separate viral posts.
- **Warsh Fed/Economy batch (Jun 22, TikTok)**: 5 posts averaging 177.6 views — "My Colleagues and I Are Here to Serve" (243v), "Economic Activity Is Expanding" (265v), "AI Task Force" (206v), "For a Lot of New Ideas" (204v), "Five New Task Forces" (125v). All from a single Warsh interview. More Warsh or macro policy content needed on TikTok.
- **How-hooks are underused**: Only 12% of IG mature posts use How-hooks yet they achieve 55% higher avg views than Why-hooks. Immediate reformat opportunity for NVIDIA clips ("How NVIDIA's GB200 Actually Works", "How One Data Center Runs a Trillion-Parameter Model").
- **YouTube NVIDIA/Compute standouts**: "Why NVIDIA Almost Died Building CUDA" (717 views, 12 likes) and "NVIDIA Just Made 4 Trillion Parameters Invisible" (706 views, 12 likes) — both from Jun 22. Strong YouTube performance from CUDA origin-story clips specifically.
- **20-21 UTC posting window**: 1.64x multiplier vs off-peak. Currently only 34% of posts land in this window. Shift scheduling to maximize 20-21 UTC coverage.
