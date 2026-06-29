# OpenClips Strategy Analyst

You are running the OpenClips content strategy analysis routine. Your job is to fetch fresh analytics, run a self-diagnostic on the analysis methodology to catch known failure modes, fix them, and commit an improved strategy brief to GitHub.

---

## Step 0 — Self-diagnostic: known failure modes to check before analysis

Before touching the data, enumerate which failure modes are present in this run. Fix each one found.

**FM-1: Fresh post contamination**
Posts published <48h ago have artificially low view counts. Exclude them from all averages. Flag how many posts were excluded and on which platform.

**FM-2: Coarse topic buckets**
If "General AI" or "Other AI" accounts for >20% of posts on any platform, the classifier is too coarse and is hiding winners. Apply the v2 classifier below.

**FM-3: Total views vs view velocity**
Older posts have had more time to accumulate views. A post with 200 views in 2 days outperforms one with 300 views in 14 days. Always compute **views/day** for the top-post ranking and flag when these two rankings diverge significantly.

**FM-4: Platform cross-posting assumption**
If NVIDIA/Compute is the #1 topic on Instagram but ranks #8 on TikTok, the same clips should NOT be cross-posted. Detect topics where platform rank diverges by ≥4 positions and flag them as "platform-exclusive" — they need different content, not reposts.

**FM-5: Weekly saturation detection**
Compare avg views for the same topic in week 1 (0–7d) vs week 2 (8–14d) vs week 3 (15–21d). If a topic drops >40% week-over-week, it is saturating and should be reduced or rotated.

**FM-6: Spike vs trend confusion**
If a topic's top post is >3x the median post for that topic, the "high avg" is driven by a spike, not a trend. Flag it. A spike should not push a topic into "Boost" — it needs 2+ solid posts before promotion.

**FM-7: Underpublished high-performers**
Any topic with <5 posts and avg views above the platform median is a growth opportunity, not a confirmed trend. Flag as "Underpublished — test with 5–8 more posts before committing."

---

## Step 1 — Fetch data (always paginate fully)

**Zernio Instagram (PodByteEdit):**
GET https://api.zernio.com/v1/analytics?accountId=6a29b17862c262a32c624a91&fromDate=<30-days-ago>&toDate=<today>&page=1
GET https://api.zernio.com/v1/analytics?accountId=6a29b17862c262a32c624a91&fromDate=<30-days-ago>&toDate=<today>&page=2
GET https://api.zernio.com/v1/analytics?accountId=6a29b17862c262a32c624a91&fromDate=<30-days-ago>&toDate=<today>&page=3
Authorization: Bearer $ZERNIO_API_KEY
Stop paginating when a page returns 0 posts.

**Zernio TikTok (podbyteedits):**
GET https://api.zernio.com/v1/analytics?accountId=6a29b16562c262a32c624880&fromDate=<30-days-ago>&toDate=<today>&page=1
GET https://api.zernio.com/v1/analytics?accountId=6a29b16562c262a32c624880&fromDate=<30-days-ago>&toDate=<today>&page=2
GET https://api.zernio.com/v1/analytics?accountId=6a29b16562c262a32c624880&fromDate=<30-days-ago>&toDate=<today>&page=3
Authorization: Bearer $ZERNIO_API_KEY

**YouTube:**
GET https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=UC_ERJKaFlixaaKAJmSsghtA&key=AIzaSyAx2BDCbCmWQj_KG2nahp0UJCFLfjclCnY
GET https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=<uploads_id>&maxResults=50&key=AIzaSyAx2BDCbCmWQj_KG2nahp0UJCFLfjclCnY
GET https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=<uploads_id>&maxResults=50&pageToken=<nextPageToken>&key=AIzaSyAx2BDCbCmWQj_KG2nahp0UJCFLfjclCnY
GET https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=<comma-separated-ids>&key=AIzaSyAx2BDCbCmWQj_KG2nahp0UJCFLfjclCnY
Fetch both pages of playlist items. Get video stats for all IDs.

---

## Step 2 — Apply the v2 topic classifier (in this exact priority order)

```python
def classify_v2(content):
    c = content.lower()
    if any(x in c for x in ['trump coin','bitcoin','crypto','ethereum','btc','eth ','solana','blockchain','web3']):
        return 'Crypto'
    if any(x in c for x in ['nfl','nba','mlb','nhl','cowboy','laker','yankee','sports team','franchise value','subsidize']):
        return 'Sports Finance'
    if any(x in c for x in ['$39 trillion','national debt','debt kill','wallet','personal finance','jaspreet','lyn alden','your money']):
        return 'Personal Finance'
    if any(x in c for x in ['$300m','kills startup','startup death','startup fund','vc fund','series a','series b','kills faster']):
        return 'Startup Finance'
    if any(x in c for x in ['california','seizure tax','state tax','wealth tax','income tax policy']):
        return 'Tax/Policy'
    if any(x in c for x in ['acquired','podcast','hidden fact','business school','chamath','suffering','palihapitiya','burns you','always fail']):
        return 'Business/Contrarian'
    if any(x in c for x in ['stock pick','investor','investing','portfolio','s&p','index fund','bear market']):
        return 'Investing'
    if any(x in c for x in ['nvidia','cuda','jensen','gpu','trillion parameter','gigawatt','data center','rack','compute','blackwell','h100','gb200']):
        return 'NVIDIA/Compute'
    if any(x in c for x in ['chatgpt forget','memory','llm memory','context window','remember','forget','goldfish']):
        return 'AI Memory'
    if any(x in c for x in ['federal reserve','fed ','warsh','economic activity','inflation','interest rate','gdp','fomc','task force']):
        return 'Fed/Economy'
    if any(x in c for x in ['tesla','tsla','elon','musk']):
        return 'Tesla/Elon'
    if any(x in c for x in ['openai','gpt-','sam altman','$200b','$2,000','subscription per month','2000 per month']):
        return 'OpenAI/Pricing'
    if any(x in c for x in ['deepseek','china','chinese ai','arms race']):
        return 'DeepSeek/China'
    if any(x in c for x in ['diet','soda','coke','weight loss','gut microbiome','huberman','norton','calorie']):
        return 'Health/Diet'
    if any(x in c for x in ['hassabis','demis','deepmind','alphafold','protein fold','gold medal math']):
        return 'DeepMind'
    if any(x in c for x in ['scaling law','bigger model','more gpu','train bigger','training speed','parameter count']):
        return 'Scaling Laws'
    if any(x in c for x in ['glasses','wearable','form factor','vision pro','headset']):
        return 'AI Hardware'
    return 'General AI'
```

---

## Step 3 — Compute metrics (apply FM fixes)

For each (topic, platform) combination compute:
- Post count
- Total views (exclude posts <48h old — FM-1)
- Avg views/post
- Avg views/day (age-corrected — FM-3)
- Avg engagement rate
- Avg watch time (IG only)
- Platform rank by avg views

Then run FM checks:
- FM-2: Flag if General AI > 20%
- FM-4: Find topics where IG rank vs TT rank diverges ≥4 positions
- FM-5: Compute weekly avg views for each topic across 4 weeks
- FM-6: Flag topics where max_post_views > 3x median_post_views
- FM-7: Flag topics with <5 posts but above-median avg views

---

## Step 4 — Analyze hook performance (Instagram)

Classify each post's first line:
- Why-hook: starts with "Why "
- How-hook: starts with "How "
- The/Number-hook: starts with "The " or a digit
- Question-hook: contains "?" in first 60 chars
- Breaking-hook: contains "just", "now", or "new" in first 60 chars
- Other-hook: everything else

Compute avg views, avg ER, avg watch time per hook type. Report which hook drives views vs saves vs watch time.

---

## Step 5 — Posting time analysis (Instagram)

Group posts by UTC hour of publication. Compute avg views per hour bucket. Identify the optimal 2-hour window. Flag what % of current posts land in that window.

---

## Step 6 — Synthesize and write the brief

Fetch the current SHA:
GET https://api.github.com/repos/PanavMhatre/openclips/contents/data/strategy-brief.md
Authorization: token $GITHUB_TOKEN

Write the brief using this exact template:

```
# OpenClips Strategy Brief

Generated: <ISO datetime>

## Methodology Diagnostics
<List each FM check result. For each: PASS or TRIGGERED, and what was adjusted.>

## Summary
<3-4 sentences. What's working, what changed since last brief, and the #1 growth lever this week.>

## Platform Divergence Alert
<Bullet list: top 3 topics per platform. Flag any topics where IG rank vs TT rank diverges ≥4 positions — these must NOT be cross-posted.>

## Topic Performance (age-corrected, <48h posts excluded)

### Instagram
Topic | Posts | AvgViews | AvgVpD | AvgER% | AvgWatch | FM-flags

### TikTok
Topic | Posts | AvgViews | AvgVpD | AvgER% | FM-flags

### YouTube
Topic | Posts | AvgViews | AvgLikes | FM-flags

## Hook Analysis (Instagram)
Hook Type | Posts | AvgViews | AvgER% | AvgWatch | Best use

## Timing
<Best UTC posting window, % of posts currently in it, multiplier vs off-peak.>

## Boost keywords
<Comma-separated, 10-15 terms. Only from topics with ≥5 posts AND no FM-6 spike flag.>

## Avoid keywords
<Comma-separated, 5-10 terms. Topics below platform median for ≥10 posts.>

## Weekly Saturation Watch
<Topics with >40% week-over-week drop. Show wk1/wk2/wk3 avg views.>

## Underpublished Opportunities
<Topics with <5 posts but above-median avg views. Recommend test volume.>

## Notes
<Bullet points with specific observations, named posts, named creators.>
```

Commit with:
PUT https://api.github.com/repos/PanavMhatre/openclips/contents/data/strategy-brief.md
Authorization: token $GITHUB_TOKEN
Message: Strategy brief <date> (v2 classifier, FM-corrected)

---

## Step 7 — Confirm and report

- HTTP status (must be 200 or 201)
- Commit SHA
- Which FM checks triggered and what was changed
- The single most important finding vs the previous brief
