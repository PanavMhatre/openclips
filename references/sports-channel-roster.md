# OpenClips Sports Channel Roster

Static fallback roster — used only when dynamic query generation fails.
The dynamic system (`generate-sports-queries.mjs`) picks the best content based on live
headlines and YouTube trending, so this list is intentionally season-agnostic.

## Hard rules

- **Never use audio-only uploads.** All source videos must have a real video track.
- **Minimum video length**: 120 seconds (2 min) — catches full highlight compilations.
- **Focus on**: match highlights, key plays, post-game reactions, fight highlights, finals moments.

## Multi-sport broadcast channels (evergreen)

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| ESPN | @ESPN | best sports highlights 2026 | 3 |
| Bleacher Report | @BleacherReport | bleacher report highlights 2026 | 3 |
| Sky Sports | @SkySports | sky sports best moments 2026 | 2 |
| CBS Sports | @CBSSports | CBS sports best highlights 2026 | 2 |
| Fox Sports | @FOXSports | fox sports highlights 2026 | 2 |
| NBC Sports | @NBCSports | NBC sports highlights 2026 | 2 |

## Major sports channels (evergreen)

| Name | Channel / Handle | Search Alias | Weight |
|------|-----------------|--------------|--------|
| NBA | @NBA | NBA best plays highlights 2026 | 3 |
| NFL Network | @NFLNetwork | NFL game highlights 2026 | 2 |
| UFC | @UFC | UFC fight highlights knockouts 2026 | 2 |
| Premier League | @premierleague | premier league best goals 2026 | 2 |
| UEFA Champions League | @ChampionsLeague | champions league highlights 2026 | 2 |
| Formula 1 | @Formula1 | formula 1 race highlights 2026 | 1 |
