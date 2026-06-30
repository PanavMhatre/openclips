# OpenClips Strategy Brief

Generated: 2026-06-30T14:00:00Z

## Methodology Diagnostics

### FM-1 Fresh post contamination
- IG: 15 excluded | TT: 15 excluded | YT: 15 excluded
- Status: **APPLIED** — all averages use only posts ≥48h old

### FM-2 Coarse topic buckets
- General AI share: IG 26% | TT 25%
- Status: **TRIGGERED — v2 classifier applied (17 buckets). Down from 33%/33% in morning brief; 10 IG posts reclassified out.**

### FM-3 View velocity (age-corrected)
- VpD (views per day) column applied to all topic tables
- Status: **APPLIED**

### FM-4 Platform cross-posting divergence
- 12 topics diverge ≥4 positions between IG and TikTok — see Divergence Alert below

### FM-5 Weekly saturation detection
- Applied per-topic: wk1/wk2/wk3 averages computed, FM5:saturating flag set if >40% wk-over-wk drop
- **NEW ALERT**: NVIDIA/Compute (IG) now triggers FM5:saturating — not present in morning brief

### FM-6 Spike vs trend
- Topics where max_post > 3× median flagged as FM6:spike and excluded from Boost keywords

### FM-7 Underpublished high-performers
- Topics with <5 posts above platform median flagged as FM7:underpub

---

## Summary

Two major shifts since the 10:45 UTC brief. First, Investing has emerged as Instagram's #1 topic (254 avg views, 9 posts) — content previously buried in General AI is now surfacing as a distinct winner, though FM6:spike and FM5:saturating flags require validation before committing production. Second, NVIDIA/Compute on Instagram has crossed into saturation territory (FM5:saturating now triggered) after holding the top spot for two weeks; a rotation toward DeepSeek/China and Tax/Policy is overdue. On YouTube, DeepSeek/China jumped from 8 avg views (2 posts) to 588 avg views (4 posts) — the clearest underpublished growth vector this week. The #1 platform split decision: Instagram owns Investing, Tax/Policy, DeepSeek/China, and NVIDIA (rotating out); TikTok needs Finance-first production (Crypto, Fed/Economy, Sports Finance) with zero cross-posting from IG.

---

## Platform Divergence Alert — Do NOT Cross-Post These

- **Investing**: IG #1 (254 avg) vs TikTok #9 (19 avg) — IG-only; do not cross-post
- **Tax/Policy**: IG #3 (130 avg) vs TikTok #16 (1 avg) — IG-only; do not cross-post
- **DeepSeek/China**: IG #4 (126 avg) vs TikTok #14 (2 avg) — IG-only; do not cross-post
- **AI Memory**: IG #5 (126 avg) vs TikTok #12 (4 avg) — IG-only; do not cross-post
- **NVIDIA/Compute**: IG #2 (230 avg) vs TikTok #7 (25 avg) — IG-only; do not cross-post
- **DeepMind**: IG #7 (124 avg) vs TikTok #11 (4 avg) — IG-only; do not cross-post
- **Fed/Economy**: IG #15 (35 avg) vs TikTok #2 (136 avg) — TikTok-only; do not cross-post
- **Business/Contrarian**: IG #16 (34 avg) vs TikTok #5 (73 avg) — TikTok-stronger; do not cross-post
- **Crypto**: IG #6 (125 avg) vs TikTok #1 (169 avg) — TikTok-stronger
- **Sports Finance**: IG #8 (110 avg) vs TikTok #3 (128 avg) — similar both platforms (safe to cross-post)

---

## Topic Performance (age-corrected, <48h posts excluded)

### Instagram (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | AvgWatch | Flags |
|---|---|---|---|---|---|---|
| Investing | 9 | 254 | 44.2 | 1.96% | 9.6s | FM6:spike,FM5:saturating |
| NVIDIA/Compute | 34 | 230 | 63.2 | 2.26% | 11.4s | FM6:spike,FM5:saturating |
| Tax/Policy | 2 | 130 | 7.9 | 2.66% | 18.6s | FM7:underpub |
| DeepSeek/China | 2 | 126 | 48.5 | 0.42% | 10.9s | FM7:underpub |
| AI Memory | 4 | 126 | 24.4 | 2.32% | 10.9s | FM7:underpub |
| Crypto | 1 | 125 | 5.7 | 0.80% | 25.7s | FM7:underpub |
| DeepMind | 1 | 124 | 60.4 | 4.03% | 8.4s | FM7:underpub |
| Sports Finance | 9 | 110 | 12.3 | 0.63% | 9.3s | FM5:saturating |
| Startup Finance | 5 | 103 | 7.7 | 2.30% | 9.6s | — |
| Health/Diet | 2 | 78 | 15.4 | 0.36% | 7.9s | — |
| Tesla/Elon | 11 | 72 | 11.1 | 1.36% | 9.7s | — |
| OpenAI/Pricing | 3 | 71 | 12.0 | 0.97% | 9.9s | FM5:saturating |
| General AI | 35 | 58 | 4.8 | 1.16% | 13.8s | FM6:spike,FM5:saturating |
| Personal Finance | 4 | 47 | 3.6 | 0.33% | 4.8s | — |
| Fed/Economy | 5 | 35 | 4.4 | 1.73% | 5.3s | FM6:spike,FM5:saturating |
| Business/Contrarian | 8 | 34 | 2.0 | 1.05% | 20.0s | FM6:spike |

### TikTok (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgER% | Flags |
|---|---|---|---|---|---|
| Crypto | 2 | 169 | 7.8 | 0.74% | FM7:underpub |
| Fed/Economy | 5 | 136 | 17.1 | 1.15% | — |
| Sports Finance | 10 | 128 | 11.6 | 1.06% | — |
| Health/Diet | 2 | 83 | 16.5 | 0.00% | FM7:underpub |
| Business/Contrarian | 9 | 73 | 3.9 | 0.73% | FM6:spike |
| Startup Finance | 5 | 33 | 2.1 | 0.39% | FM6:spike |
| NVIDIA/Compute | 32 | 25 | 8.2 | 1.87% | FM6:spike,FM5:saturating |
| General AI | 34 | 24 | 1.3 | 0.95% | FM6:spike |
| Investing | 9 | 19 | 1.0 | 0.36% | FM6:spike |
| Tesla/Elon | 11 | 10 | 3.0 | 0.00% | FM6:spike |
| DeepMind | 1 | 4 | 1.9 | 0.00% | — |
| AI Memory | 3 | 4 | 0.7 | 0.00% | — |
| OpenAI/Pricing | 3 | 3 | 0.2 | 0.00% | — |
| DeepSeek/China | 3 | 2 | 0.7 | 0.00% | — |
| Personal Finance | 4 | 1 | 0.1 | 25.00% | — |
| Tax/Policy | 2 | 1 | 0.1 | 0.00% | — |

### YouTube (15 fresh posts excluded)

| Topic | Posts | AvgViews | VpD | AvgLikes | Flags |
|---|---|---|---|---|---|
| Crypto | 1 | 1062 | 48.7 | 14 | FM7:underpub |
| Business/Contrarian | 9 | 668 | 38.8 | 6 | — |
| DeepSeek/China | 4 | 588 | 22.3 | 1 | FM7:underpub |
| Sports Finance | 10 | 476 | 31.4 | 3 | — |
| Fed/Economy | 5 | 464 | 38.9 | 5 | FM6:spike |
| Tax/Policy | 2 | 432 | 25.6 | 4 | FM7:underpub |
| Tesla/Elon | 12 | 414 | 22.1 | 4 | — |
| General AI | 36 | 354 | 20.1 | 4 | FM6:spike |
| OpenAI/Pricing | 2 | 350 | 18.5 | 2 | — |
| Startup Finance | 5 | 318 | 23.6 | 2 | — |
| Personal Finance | 4 | 141 | 10.6 | 2 | — |
| AI Memory | 4 | 138 | 22.6 | 0 | FM6:spike |
| Investing | 9 | 119 | 16.3 | 1 | FM6:spike |
| NVIDIA/Compute | 32 | 69 | 10.0 | 1 | FM6:spike |
| Health/Diet | 2 | 2 | 0.5 | 0 | — |
| DeepMind | 1 | 1 | 0.5 | 0 | — |

---

## Hook Analysis (Instagram)

| Hook Type | Posts | AvgViews | AvgER% | AvgWatch | Best use |
|---|---|---|---|---|---|
| How-hook | 15 | 172 | 1.27% | 8.9s | Reach/new audiences |
| Other-hook | 54 | 133 | 1.53% | 9.0s | Varies |
| Why-hook | 37 | 114 | 1.63% | 12.0s | ER/comments/shares |
| The/Number-hook | 22 | 97 | 1.63% | 19.4s | Watch time/saves |
| Breaking-hook | 7 | 88 | 1.64% | 12.2s | Timeliness |

---

## Timing

- **Optimal window: 20:00–21:00 UTC** — 224 avg views (24 posts) vs ~70 off-peak (3.2× multiplier)
- **Secondary window: 12:00–13:00 UTC** — 188 avg views (11 posts)
- 21:00 UTC slot also strong: 165 avg (26 posts)
- Shift all posts not yet scheduled into 20:00–21:00 UTC first; 12:00 is a solid second slot

---

## Boost keywords

NFL, franchise value, Cowboys subsidize, startup death, VC kill, $300M funding, liquidation preference, index fund, portfolio, stock pick

*Only from topics with ≥5 posts and no FM6:spike: Startup Finance (IG), Sports Finance (TT), Fed/Economy (TT)*

---

## Avoid keywords

TSLA, Tesla valuation, generic AI progress, AI is changing everything, $2000 AI subscription, OpenAI $200B valuation, pre-training is dying (TikTok)

---

## Weekly Saturation Watch

- **NVIDIA/Compute** (IG): NOW SATURATING — FM5:saturating triggered this run (was only FM6:spike in morning brief). Reduce IG NVIDIA frequency immediately; rotate to DeepSeek/China and Tax/Policy.
- **NVIDIA/Compute** (TikTok): FM6:spike + FM5:saturating — 25 avg views; stop NVIDIA TikTok production.
- **Sports Finance** (IG): FM5:saturating — reduce cadence by 30–50%.
- **General AI** (IG): FM5:saturating — confirmed dead category; stop unclassified clip production.
- **Fed/Economy** (IG): FM5:saturating — IG audience does not want Fed content.

---

## Underpublished Opportunities

- **DeepSeek/China** (YouTube): 4 posts, 588 avg views, 22.3 VpD — highest confirmed velocity among underpub topics. Run 6–8 more YT uploads this week.
- **DeepSeek/China** (Instagram): 2 posts, 126 avg views, 48.5 VpD — do not cross-post TikTok versions; create IG-native cuts. Run 5–8 more.
- **Tax/Policy** (IG): 2 posts, 130 avg views, 18.6s watch time — strong saves signal. Run 5–8 more.
- **AI Memory** (IG): 4 posts, 126 avg views — test 5–8 more before committing; nearing confirmation threshold.
- **Crypto** (TikTok): 2 posts, 169 avg views — highest TikTok avg. Run 8 posts over next 7 days.
- **Crypto** (YouTube): 1 post, 1062 avg views — single spike, cannot promote yet. Run 4 more to confirm.
- **DeepMind** (IG): 1 post, 124 avg views, 4.03% ER — schedule 1/week minimum.
- **Investing** (IG): 9 posts, 254 avg views BUT FM6:spike + FM5:saturating — validate which posts are driving the number before ramping production. Do not treat as confirmed trend yet.

---

## Notes

- **Biggest change this run**: Investing on IG surfaced at #1 (254 avg) from apparent zero — driven by posts containing "investor/investing/portfolio" that were previously bucketed as General AI. FM6:spike applies; identify the specific top posts before treating this as a trend.
- **NVIDIA rotation alert**: First time NVIDIA/Compute triggers FM5:saturating on IG. Two weeks of heavy NVIDIA production has hit the ceiling. Start shifting production slots to DeepSeek/China and Tax/Policy.
- **YouTube divergence from IG/TikTok**: YouTube rewards Business/Contrarian (668 avg) and Finance content (Sports Finance 476, Fed/Economy 464) — very different from IG which rewards technical AI. YouTube content should be primarily Finance-angle clips, not NVIDIA clips (69 avg on YT).
- **TikTok Investing collapse**: Dropped from 153 avg (1 post, old brief) to 19 avg (9 posts) — the single post was a spike. Investing is NOT a TikTok category.
- How-hooks drive the most raw IG views (172 avg); The/Number-hooks drive longest watch time (19.4s) — use for saves/algorithm reach; Why-hooks drive highest ER (1.63%).
- Jensen Huang direct-quote format ("casually reveals", "just dropped") consistently outperforms narrator summaries by 2–3× ER.
- DeepSeek/China TikTok: 3 new posts published today (June 30, excluded by FM-1). Given TikTok DeepSeek/China averages 2 views, this production batch is likely to underperform — monitor over next 48h.
