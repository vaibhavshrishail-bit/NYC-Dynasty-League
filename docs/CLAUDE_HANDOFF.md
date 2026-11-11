# Handoff — NYC Dynasty League Cinematic Universe

Read this first in any new session. Everything needed to maintain the site is in this repo.

## What this is
A free, static public website for the 12-team NYC Dynasty League (Sleeper league `1312585067658223616`).
Hosted on GitHub Pages from `site/`. No paid hosting, database or AI inference at runtime.

## How data flows
1. `.github/workflows/refresh-and-deploy.yml` runs on every push to `main`, every 6 hours, and on manual dispatch.
2. Job `refresh` runs `scripts/fetch-sleeper.mjs` (read-only Sleeper API) and commits JSON to `site/data/sleeper/`.
3. Job `deploy` publishes `site/` to GitHub Pages.

A Claude session usually cannot reach `api.sleeper.app` directly. It does not need to: `git pull` and read `site/data/sleeper/`.
To force a refresh, push any commit (an empty one works).

## Franchise identity
Franchises are keyed by Sleeper `roster_id`, with `owner_id` as a check — never by team name, which managers change often.
The mapping (slug, manager first name, theme, tagline) is `src/engine/franchises.json`.
- Roster 10 (owner `871044882217775104`) is the commissioner's franchise. Its brand is fixed as "The Pantheon" whatever the Sleeper name says.
- Roster 6 changed hands: it is now Nishant's "Free Rollers" (previously Varun).
- If a roster's owner changes, the build prints a warning; update `franchises.json`.

## Layout
- `site/` — the published site. `site/cinematics/` holds the 12 MP4s, poster JPGs and `manifest.json`.
- `src/engine/` — cinematic engine: `core.js` (timeline, acts), `themes.js` (12 looks), `audio.py` (score synth), `shell.html`, `fonts.css`.
- `scripts/build_cinematics.py` — builds configs, stills and videos. See `docs/VIDEO_PRODUCTION.md`.
- `src/build_*.py`, `src/hub*`, `src/poster.css`, `src/league.json` — the earlier prototype (hub and poster), built from a September snapshot and the Commissioner's Playbook.

## Standing rules from the commissioner
- Never change anything in Sleeper (rosters, lineups, settings). Read-only.
- No fabricated player images, logos, stats or history. Every number on screen must come from the Sleeper JSON.
- No player photographs unless properly licensed and recorded in `docs/ASSET_MANIFEST.md`.
- Nothing is sent to the league without his approval.
- Routine artistic choices do not need sign-off.

## Not built yet
Rivalry matchup generator, playoff war room bracket, season documentary trailer, and the move of the site shell to React + Vite + TypeScript.
The hub still shows the September snapshot and should be rebuilt on the live JSON.
