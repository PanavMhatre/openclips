# Channel Roster

Source channels for OpenClips podcast clip publishing. These are the YouTube channels used by `scripts/latest-youtube-search.mjs` to discover new videos.

## Format

Each row: `| Channel Name | @handle | yt-dlp search query |`

- **Handle** — used for `https://www.youtube.com/@handle/videos` playlist lookups.
- **Search query** — fallback `ytsearch` term when playlist lookup fails.

---

## Tech & AI

| Channel Name | Handle | Search Query |
|---|---|---|
| Lex Fridman Podcast | @lexfridman | Lex Fridman podcast episode |
| Y Combinator | @ycombinator | Y Combinator startup talk |
| Two Minute Papers | @TwoMinutePapers | Two Minute Papers AI research |
| Fireship | @Fireship | Fireship tech explainer |
| The Primeagen | @ThePrimeagen | ThePrimeagen programming opinion |

## Business & Venture

| Channel Name | Handle | Search Query |
|---|---|---|
| All-In Podcast | @allin | All-In Podcast episode |
| My First Million | @myfirstmillionpod | My First Million podcast |
| Acquired | @acquiredfm | Acquired podcast episode |
| a16z | @a16z | a16z andreessen horowitz talk |
| Garry Tan | @garrytan | Garry Tan startup founder |

## Finance & Markets

| Channel Name | Handle | Search Query |
|---|---|---|
| Patrick Boyle | @PatrickBoyleonFinance | Patrick Boyle finance explainer |
| Bankless | @Bankless | Bankless crypto finance |
| Meet Kevin | @MeetKevin | Meet Kevin investing news |

## Science & Education

| Channel Name | Handle | Search Query |
|---|---|---|
| Kurzgesagt | @kurzgesagt | Kurzgesagt science explainer |
| Veritasium | @veritasium | Veritasium physics science |
| Real Engineering | @RealEngineering | Real Engineering how it works |

---

## Notes

- Add new channels by appending rows to any table above.
- The `@handle` column drives playlist-based lookups (faster, 1 API hit per channel).
- The search query column is the fallback — make it specific enough to avoid unrelated results.
- Remove channels you no longer want by deleting or commenting out rows (prefix with `<!--`).
