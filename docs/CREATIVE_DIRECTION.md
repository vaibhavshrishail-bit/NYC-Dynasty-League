# Creative direction

Every franchise cinematic is 45 seconds, 1920×1080, 30 fps, and shares one five-act structure so the set feels like a series: world and name, the season in three lines, the player showcase, the roll call, the crest. The exact timeline is in `VIDEO_PRODUCTION.md`.

What makes each one bespoke is its theme: palette, display typeface, environment, particle effect, card frame, emblem, tagline and musical key.

| Roster | Manager | Theme | World | Typeface |
|---|---|---|---|---|
| 1 | Soham | bunker | Blast door, amber beacon, hazard tape | Bebas Neue |
| 2 | Advaith | dawn | Sunrise over layered ridgelines | Cinzel |
| 3 | Nihar | city | Night skyline, moon, glinting wires | Bebas Neue |
| 4 | Dev | circuit | Circuit traces with travelling pulses | Orbitron |
| 5 | Alan | range | Gold target rings and sweep | Cinzel |
| 6 | Nishant | casino | Green felt, tumbling dice | Bebas Neue |
| 7 | Achal | beach | Sunset, sea shimmer, palms | Bebas Neue |
| 8 | Manas | blueprint | Drafting grid, construction lines | Orbitron |
| 9 | Shiamak | arcade | Neon grid and pixel sky | Orbitron |
| 10 | Vaibhav | eclipse | Total eclipse, crimson corona, heartbeat trace | Cinzel |
| 11 | Taylor | inferno | Rising fire and embers | Cinzel |
| 12 | Dhiraj | neighborhood | Dusk street, lit windows, fireflies | Bebas Neue |

Themes were chosen from the team names in use in November 2026. They are attached to the roster, so a renamed team keeps its look until `franchises.json` is edited.

## Rules
- All imagery is original and procedural (canvas drawing code). Nothing is traced or copied from existing artwork, logos, characters or games, including where a team name is a pun on one.
- No photographs of players. Each player is shown as a generic jersey in his NFL team's colours with his name and number, plus points per start. The jersey is the hero of the card; it moves on its own layer in front of the frame for parallax, with a light sweep.
- Statistics are the headline: points per start is the largest type on a player card and counts up.
- Nicknames follow the hierarchy owner-assigned, then established real-world, and are always in quotes. Invented nicknames are not used; a verified role label is shown instead.
- The three story lines are generated from data. Only the third, the creed, is creative writing.
- Team name and manager come from canonical.json at render time. Nothing about identity is typed into a theme.

## Dual branding
The official identity is the live Sleeper team name and manager. The cinematic identity is the crest, world and palette. Sleeper avatars are recorded in canonical.json but not displayed: they have not been reviewed, and an avatar that is a photograph of a real person or artwork of an existing character will not be used in the films in any case.

## Documentary
Chapters borrow the worlds of the franchises they are about (the unbeaten team's chapter plays in its world), opening and closing on the night skyline. Tone is NFL-Films plain: short declarative lines, one idea on screen at a time, numbers that count up.

## Crests on the site
The Hub and franchise pages draw each crest as SVG from the same glyph and palette the film uses (`site/data/themes.json`, exported from `themes.js`), so a franchise looks the same in all three places. Re-export after editing a theme (see the command in `docs/VIDEO_PRODUCTION.md`).

The `temple` theme belonged to roster 10's former identity, The Pantheon, and is retired.
