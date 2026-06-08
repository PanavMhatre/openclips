# Channel Roster

Source YouTube channels for the OpenClips Buffer publishing workflow.
Add or remove rows to control which channels are scraped by `scripts/latest-youtube-search.mjs`.

Each row is: `| Channel Display Name | @handle | Category |`
The handle (`@username`) is used to scrape the channel's `/videos` page directly via yt-dlp.
This works reliably on cloud IPs without bot-check issues (unlike ytsearch).

## Tech & AI

| Channel Name | @handle | Category |
|---|---|---|
| Lex Fridman | @lexfridman | Tech/AI |
| Y Combinator | @ycombinator | Tech/AI |
| a16z | @a16z | Tech/AI |
| Sequoia Capital | @sequoiacapital | Tech/AI |
| NVIDIA AI | @nvidia | Tech/AI |
| Google DeepMind | @googledeepmind | Tech/AI |
| OpenAI | @OpenAI | Tech/AI |
| Anthropic | @anthropic-ai | Tech/AI |
| Matt Wolfe | @mreflow | Tech/AI |
| Fireship | @Fireship | Tech |
| Theo - t3.gg | @t3dotgg | Tech |
| ThePrimeagen | @ThePrimeagen | Tech |

## Finance & Business

| Channel Name | @handle | Category |
|---|---|---|
| All-In Podcast | @allinpodcast | Finance/Business |
| My First Million | @MyFirstMillionPod | Finance/Business |
| The Knowledge Project | @ShaneAParrish | Finance/Business |
| Invest Like the Best | @investlikethebest | Finance/Business |
| Acquired | @acquiredpod | Finance/Business |
| The Tim Ferriss Show | @timferriss | Finance/Business |
| Diary of a CEO | @TheDiaryOfACEO | Finance/Business |
| Patrick Bet-David | @patrickbetdavid | Finance/Business |
| Alex Hormozi | @AlexHormozi | Finance/Business |
| Codie Sanchez | @codiesanchez | Finance/Business |
| Graham Stephan | @GrahamStephan | Finance |
| Andrei Jikh | @andreijikh | Finance |
| Meet Kevin | @MeetKevin | Finance |

## Notes

- Each `@handle` is scraped from `https://www.youtube.com/@handle/videos` — the channel's public /videos tab.
- Videos shorter than 5 minutes are skipped (`yt-dlp --match-filter "duration > 300"`).
- `--playlist-end 4` fetches the 4 most recent uploads per channel and picks the first one over 5 min.
- To fetch more per channel: `node scripts/latest-youtube-search.mjs --limit 2`
- If a handle changes, update this file — yt-dlp will return an error for invalid handles.
