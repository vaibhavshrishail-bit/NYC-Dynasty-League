# Video production

## Requirements
Python 3 with `playwright`, `numpy`, `scipy`; Google Chrome at `/usr/bin/google-chrome`; `ffmpeg`; Node.
Rendering is done in a Claude session or locally, not in GitHub Actions. The MP4s are committed to `site/cinematics/` and `site/documentary/`.

## Franchise cinematics (45 seconds each)
    git pull                                              # get the latest canonical.json
    python3 scripts/build_cinematics.py config            # rebuild manifest.json and preview HTML, print a summary (seconds)
    python3 scripts/build_cinematics.py stills [slug...]  # ten test frames per film into build/stills
    python3 scripts/build_cinematics.py render [slug...]  # full render into site/cinematics

Slugs: soham advaith nihar dev alan nishant achal manas shiamak vaibhav taylor dhiraj.
A film takes about 10 minutes alone, or about 15 minutes each with two running side by side on a 2-core machine. Run two processes with different slugs; more than two gains nothing.
`build/` is scratch space and is git-ignored. `build/cine/<slug>.html` is a playable, scrubbable version of each film.

### Timeline
| Time | Act | Source |
|---|---|---|
| 0–6s | World, league title, team name, manager | theme + canonical |
| 6–12s | Three lines: the record, the season, the creed | generated from canonical; the creed is the tagline in `franchises.json` |
| 12–36s | Player showcase, 24s shared equally by up to 10 players, counting up to the leading scorer | `featured` in canonical |
| 36–41.2s | Roll call: every featured jersey with points per start | same list |
| 41.2–45s | Crest, team name, manager | theme + canonical |

### Players and numbers
The film uses exactly the `featured` list in `site/data/canonical.json`, which is also the "Who has carried this team" list on the franchise page. To change who appears, change the selection rule in `scripts/build-canonical.mjs`, never the film config.
- Points per start: points scored in weeks the player was in this franchise's starting lineup this season, divided by those starts. League scoring, IDP included.
- "Small sample" is shown when a player has started fewer than half the weeks.
- Nicknames in quotes: owner-assigned in Sleeper first, then the small set of established real-world nicknames in `src/config/nicknames.json`. Where there is none, only the verified role label is shown (leading scorer, top defender, hot streak).
- Jerseys: a generic jersey shape drawn in code, coloured from the `NFL` table in `core.js` (primary, trim, number colour per team). No logos, wordmarks or real uniform artwork. Update the table if a team rebrands.

## Season documentary (about 90 seconds)
    python3 scripts/build_documentary.py facts            # print every fact each chapter will show; read this first
    python3 scripts/build_documentary.py stills [seconds...]
    python3 scripts/build_documentary.py render           # site/documentary/season-2026.mp4, .jpg, .json (about 25 minutes)

If a single command cannot run for 25 minutes, render in parts (these can run side by side):

    python3 scripts/build_documentary.py audio
    python3 scripts/build_documentary.py part 0 4   # then part 1 4, part 2 4, part 3 4
    python3 scripts/build_documentary.py finish 4

The film is a list of chapters in `chapters()` in that script. Each chapter has a theme (backdrop), a title and a list of beats: `line`, `stat`, `emblem`, `bars`, `cols`, `dots`, `jerseys`, `grid`, `dim`. Beats are drawn by `src/engine/doc.js`. Every value is computed in `facts()` from canonical.json, so re-running after new weeks updates the numbers; re-read the `facts` output, because the story may have changed (for example the unbeaten team may have lost) and chapter wording may need editing. To extend it into a full-season recap, add chapters; durations add up automatically.

The Week 9 film is a finished historical piece: do not overwrite `season-2026.mp4`. For a later film (playoff race, postseason, full-season retrospective), copy `chapters()` into a new function, change the output name near the end of the script, and add an entry to `site/documentary/index.json` so it appears in the Archives.

## Changing only the music
Edit the team's entry in `STY` in `src/engine/audio.py`. The picture does not need re-rendering if `build/cine/<slug>.video.mp4` still exists: regenerate the WAV with `python3 src/engine/audio.py build/aud <theme>`, encode it to AAC and mux it onto the video with ffmpeg (`-c:v copy`). Otherwise run `render` for that slug.

## When to re-render
Rosters and standings move weekly, so films date. Re-render after trades, at milestones, or before sharing. Always run `config` or `facts` first and read the output.

## Changing a look
Edit the theme in `src/engine/themes.js`, run `stills` for that slug, look at the frames, then `render`. Then run `sh scripts/export-themes.sh` so the website crests match.
