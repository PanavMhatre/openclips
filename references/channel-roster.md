# OpenClips Channel Roster

Source YouTube channels for tech, AI, finance, and business content.
Each entry has: the display name, the YouTube channel URL or handle, and
the yt-dlp search alias used by `scripts/latest-youtube-search.mjs`.

## Tech & AI

| Name | Channel / Handle | Search Alias |
|------|-----------------|--------------|
| Lex Fridman | @lexfridman | lex fridman podcast |
| Y Combinator | @ycombinator | y combinator |
| a16z | @a16z | a16z podcast |
| AI Explained | @aiexplained-official | ai explained |
| Two Minute Papers | @TwoMinutePapers | two minute papers |
| Andrej Karpathy | @AndrejKarpathy | andrej karpathy |

## Business & Finance

| Name | Channel / Handle | Search Alias |
|------|-----------------|--------------|
| My First Million | @MyFirstMillionPod | my first million podcast |
| All-In Podcast | @allin | all-in podcast |
| Acquired Podcast | @acquiredpodcast | acquired podcast |
| How Money Works | @HowMoneyWorks | how money works |
| Patrick Boyle | @PBoyle1 | patrick boyle finance |
| Chamath Palihapitiya | @chamath | chamath palihapitiya |

## Science & Deep Tech

| Name | Channel / Handle | Search Alias |
|------|-----------------|--------------|
| Veritasium | @veritasium | veritasium |
| Kurzgesagt | @kurzgesagt | kurzgesagt |
| PBS Space Time | @pbsspacetime | pbs space time |

---

## Notes

- `latest-youtube-search.mjs` picks the **newest upload** from each channel
  that is longer than 20 minutes (podcast-length).
- Update this file whenever you add or remove a source channel.
- The "Search Alias" is passed directly to `yt-dlp ytsearch1:` — keep it
  specific enough that the first result is reliably from the right channel.
