# Channel Roster

Source YouTube channels for the OpenClips Buffer publishing workflow.
Add or remove rows to control which channels are scraped by `scripts/latest-youtube-search.mjs`.

Each row is: `| Channel Display Name | @handle | Category |`
The handle (`@username`) is used to scrape the channel's `/videos` page directly via yt-dlp.
This works reliably on cloud IPs without bot-check issues (unlike ytsearch).

## Posting Mix

| Weight | Sources |
|--------|---------|
| 40% | My First Million, Alex Hormozi, Codie Sanchez |
| 35% | Y Combinator, a16z, Acquired, All-In Podcast |
| 25% | Lex Fridman, Diary of a CEO, Tim Ferriss, The Knowledge Project, Invest Like the Best |

---

## Tier 1 — High Frequency (40%)

| Channel Name | @handle | Category |
|---|---|---|
| My First Million | @MyFirstMillionPod | Business/Ideas |
| Alex Hormozi | @AlexHormozi | Business |
| Codie Sanchez | @codiesanchez | Business |

## Tier 2 — VC & Startup (35%)

| Channel Name | @handle | Category |
|---|---|---|
| Y Combinator | @ycombinator | Tech/VC |
| a16z | @a16z | Tech/VC |
| Acquired | @AcquiredFM | Business/VC |
| All-In Podcast | @allinpodcast | Tech/Finance |

## Tier 3 — Long-form Podcast (25%)

| Channel Name | @handle | Category |
|---|---|---|
| Lex Fridman | @lexfridman | Tech/AI |
| The Diary of a CEO | @TheDiaryOfACEO | Business |
| Tim Ferriss | @timferriss | Business/Life |
| The Knowledge Project | @ShaneAParrish | Business/Thinking |
| Invest Like the Best | @InvestLiketheBest | Finance/Investing |

---

## Notes

- Each `@handle` is scraped from `https://www.youtube.com/@handle/videos` — the channel's public /videos tab.
- Videos shorter than 5 minutes are skipped (`yt-dlp --match-filter "duration > 300"`).
- `--playlist-end 4` fetches the 4 most recent uploads per channel and picks the first one over 5 min.
- To fetch more per channel: `node scripts/latest-youtube-search.mjs --limit 2`
- If a handle returns a 404, yt-dlp will log an error — update the handle and retry.
- `@AcquiredFM` and `@InvestLiketheBest` updated from previous broken handles.

## Benched

Not used for this channel — keep for AI-news or testing:
Graham Stephan, Meet Kevin, Andrei Jikh, Patrick Bet-David, NVIDIA AI, Google DeepMind,
OpenAI, Anthropic, Fireship, Theo (t3.gg), ThePrimeagen, Sequoia Capital, Matt Wolfe.
