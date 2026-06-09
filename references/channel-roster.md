# OpenClips Channel Roster

Source YouTube channels for the podcast-clips pipeline.
**Only these 12 channels.** Do not add others without explicit approval.

## Posting mix targets
- **40%** — My First Million, Alex Hormozi, Codie Sanchez / BigDeal
- **35%** — Y Combinator, a16z, Acquired, All-In Podcast
- **25%** — Lex Fridman, Diary of a CEO, Tim Ferriss, The Knowledge Project, Invest Like the Best

## Tier A — 40% (business / money / ideas)

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| My First Million | @MyFirstMillionPod | my first million podcast | 3 |
| Alex Hormozi | @AlexHormozi | alex hormozi |  3 |
| Codie Sanchez | @CodieSanchez | codie sanchez contrarian thinking | 2 |

## Tier B — 35% (startup / VC / tech)

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| Y Combinator | @ycombinator | y combinator startup school | 2 |
| a16z | @a16z | a16z podcast | 2 |
| Acquired | @AcquiredFM | acquired podcast ben gilbert david rosenthal | 2 |
| All-In Podcast | @allin | all-in podcast chamath sacks friedberg | 2 |

## Tier C — 25% (long-form / wisdom)

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| Lex Fridman | @lexfridman | lex fridman podcast | 2 |
| The Diary of a CEO | @TheDiaryOfACEO | diary of a ceo steven bartlett | 2 |
| Tim Ferriss | @timferriss | tim ferriss show | 1 |
| The Knowledge Project | @ShaneAParrish | knowledge project shane parrish | 1 |
| Invest Like the Best | @InvestLiketheBest | invest like the best patrick oshaughnessy | 1 |

---

## Hard rules

- **Never use audio-only uploads.** All source videos must have a real video track.
  The search script enforces this via `vcodec` check + title filter.
- **Do not source from:** Graham Stephan, Meet Kevin, Andrei Jikh, Patrick Bet-David,
  NVIDIA AI, DeepMind, OpenAI, Anthropic, Fireship, Theo, ThePrimeagen.
  Keep those for a separate AI-news channel if needed.
- The "Weight" column controls how many results are fetched per run
  (higher = more videos submitted = more clips in the pool from that channel).
- `latest-youtube-search.mjs` picks the newest upload longer than 20 min per channel.
- Update this file whenever you add or remove a source channel.
