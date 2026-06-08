# Channel Roster

Source YouTube channels for the OpenClips Buffer publishing workflow.
Add or remove rows to control which channels are scraped by `scripts/latest-youtube-search.mjs`.

Each row is: `| Channel Display Name | yt-dlp Search Term | Category |`
The search term is passed directly to `yt-dlp` as `ytsearch1:<term>`.

## Tech & AI

| Channel Name | Search Term | Category |
|---|---|---|
| Lex Fridman | Lex Fridman podcast | Tech/AI |
| Y Combinator | Y Combinator | Tech/AI |
| a16z | a16z podcast | Tech/AI |
| Andreessen Horowitz | Andreessen Horowitz | Tech/AI |
| Sequoia Capital | Sequoia Capital | Tech/AI |
| NVIDIA AI | NVIDIA AI podcast | Tech/AI |
| Google DeepMind | Google DeepMind | Tech/AI |
| OpenAI | OpenAI | Tech/AI |
| Anthropic | Anthropic AI | Tech/AI |
| Two Minute Papers | Two Minute Papers | Tech/AI |
| AI Explained | AI Explained | Tech/AI |
| Matt Wolfe | Matt Wolfe AI | Tech/AI |
| Fireship | Fireship | Tech |
| Theo - t3.gg | Theo t3.gg | Tech |
| ThePrimeagen | ThePrimeagen | Tech |

## Finance & Business

| Channel Name | Search Term | Category |
|---|---|---|
| All-In Podcast | All-In Podcast | Finance/Business |
| My First Million | My First Million podcast | Finance/Business |
| The Knowledge Project | Farnam Street Knowledge Project podcast | Finance/Business |
| Invest Like the Best | Invest Like the Best podcast | Finance/Business |
| Acquired | Acquired podcast | Finance/Business |
| The Tim Ferriss Show | Tim Ferriss Show podcast | Finance/Business |
| Diary of a CEO | Diary of a CEO | Finance/Business |
| Patrick Bet-David | Patrick Bet-David podcast | Finance/Business |
| Alex Hormozi | Alex Hormozi | Finance/Business |
| Codie Sanchez | Codie Sanchez | Finance/Business |
| Graham Stephan | Graham Stephan | Finance |
| Andrei Jikh | Andrei Jikh | Finance |
| Meet Kevin | Meet Kevin | Finance |

## Notes

- The search term is used for `yt-dlp` `ytsearch` — use the channel's name as it appears in YouTube search for best results.
- Videos shorter than 5 minutes are skipped (yt-dlp `--match-filter "duration > 300"`).
- Results are limited to videos published within the last 60 days.
- To override the per-channel limit run: `node scripts/latest-youtube-search.mjs --limit 2`
