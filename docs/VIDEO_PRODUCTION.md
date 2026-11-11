# Video production

## Requirements
Python 3 with `playwright`, `numpy`, `scipy`; Google Chrome at `/usr/bin/google-chrome`; `ffmpeg`; Node (for reading themes).
Rendering is done in a Claude session or locally, not in GitHub Actions. The MP4s are committed to `site/cinematics/`.

## Commands
    git pull                                              # get the latest Sleeper JSON
    python3 scripts/build_cinematics.py config            # rebuild manifest.json and preview HTML (seconds)
    python3 scripts/build_cinematics.py stills [slug...]  # five test frames per film into build/stills
    python3 scripts/build_cinematics.py render [slug...]  # full render into site/cinematics (about 3 minutes per film)

Slugs: soham advaith nihar dev alan nishant achal manas shiamak vaibhav taylor dhiraj.
`build/` is scratch space and is git-ignored. `build/cine/<slug>.html` is a playable, scrubbable version of each film.

## How a film is made
1. `configs()` reads `site/data/sleeper/` and builds one config per roster: live team name, record, points rank, titles, and the six highest-scoring players on the current roster.
2. `audio.py` synthesizes a 25s score in the theme's key.
3. Headless Chrome draws each of the 750 frames on a canvas (`window.__frame(t)`); frames are piped to ffmpeg (H.264, CRF 23) and muxed with AAC audio.

## Where the numbers come from
- Player points: sum of `players_points` across every completed week of the current season in this league's matchups, so they use league scoring. A player's weeks spent unrostered are not counted.
- Titles: winner of the `p == 1` game in each past season's winners bracket.
- Points rank: `fpts` in current rosters.

## When to re-render
Rosters and standings move every week, so the films date. Re-render after trades, at milestones, or before sharing. Always run `config` first and read the printed summary before rendering.

## Changing a look
Edit the theme in `src/engine/themes.js`, run `stills` for that slug, look at the frames, then `render`.
