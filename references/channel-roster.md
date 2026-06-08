# Channel Roster

Source channels for OpenClips podcast clip discovery. Each row provides the YouTube handle/URL used by `scripts/latest-youtube-search.mjs` and the human-readable name shown in logs.

## Tech & AI

| Search Name | YouTube Handle / URL | Category |
|---|---|---|
| Lex Fridman Podcast | @lexfridman | Tech / AI |
| Y Combinator | @ycombinator | Tech / Startups |
| a16z | @a16z | Tech / VC |
| Sequoia Capital | @sequoiacapital | Tech / VC |
| Greylock | @greylockvc | Tech / VC |
| Cognitive Revolution | @cognitiverevolutionpodcast | AI |
| Dwarkesh Podcast | @dwarkeshpatel | Tech / AI |
| BG2 Pod | @bg2pod | Tech / AI |

## Finance & Business

| Search Name | YouTube Handle / URL | Category |
|---|---|---|
| All-In Podcast | @allin | Tech / Finance |
| My First Million | @myfirstmillion | Business |
| Acquired Podcast | @acquiredfm | Business |
| 20VC | @20vc | VC / Startups |
| Invest Like the Best | @iltb_podcast | Finance |
| Patrick Boyle | @pboyle | Finance |
| Founders Podcast | @founderspodcast1 | Business |
| How I Built This | @guy_raz | Business |
| Starter Story | @starterstory | Business |
| The Knowledge Project | @tkppodcast | Mental Models |

## Format

Each row in this file maps to one `yt-dlp` search target. The script pulls the **latest 1-3 videos** per channel. Add or remove rows here to control which channels feed the queue.

```
# To add a channel, append a row:
| Display Name | @handle_or_url | Category |
```

The `latest-youtube-search.mjs` script reads this file, strips table formatting, and extracts the YouTube Handle / URL column (column index 1).
