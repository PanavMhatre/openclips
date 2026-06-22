# OpenClips Channel Roster

Static fallback roster — used only when dynamic query generation fails.
The dynamic system (`generate-daily-queries.mjs`) picks content based on live
business/tech headlines and YouTube trending, so this list is intentionally broad.

## Hard rules

- **Never use audio-only uploads.** All source videos must have a real video track.
  The search script enforces this via `vcodec` check + title filter.
- **Minimum video length**: 1200 seconds (20 min) — must be long-form podcast/interview content.
- **Focus on**: founder interviews, VC/startup talks, finance breakdowns, AI/tech analysis.
- Do not source from: Graham Stephan, Meet Kevin, Andrei Jikh, Patrick Bet-David,
  NVIDIA AI, DeepMind, OpenAI official, Anthropic official, Fireship, Theo, ThePrimeagen.

## Tier A — Business / money / entrepreneurship

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| My First Million | @MyFirstMillionPod | my first million podcast 2026 | 3 |
| Alex Hormozi | @AlexHormozi | alex hormozi 2026 | 3 |
| Codie Sanchez | @CodieSanchez | codie sanchez contrarian thinking 2026 | 2 |
| Diary of a CEO | @TheDiaryOfACEO | diary of a ceo steven bartlett 2026 | 2 |

## Tier B — Startup / VC / tech / AI

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| Y Combinator | @ycombinator | y combinator startup school 2026 | 2 |
| a16z | @a16z | a16z podcast 2026 | 2 |
| All-In Podcast | @allin | all-in podcast 2026 | 2 |
| Acquired | @AcquiredFM | acquired podcast 2026 | 2 |

## Tier C — Long-form / knowledge / investing

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| Lex Fridman | @lexfridman | lex fridman podcast 2026 | 2 |
| Tim Ferriss | @timferriss | tim ferriss show 2026 | 1 |
| The Knowledge Project | @ShaneAParrish | knowledge project shane parrish 2026 | 1 |
| Invest Like the Best | @InvestLiketheBest | invest like the best 2026 | 1 |
| Andrew Huberman | @hubermanlab | huberman lab business performance 2026 | 1 |
