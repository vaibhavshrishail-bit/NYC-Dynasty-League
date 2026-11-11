# Handoff — NYC Dynasty League Cinematic Universe

Read this first in any new session. Everything needed to maintain the site is in this repo.

## What this is
A free, static public website for the 12-team NYC Dynasty League (Sleeper league `1312585067658223616`).
Hosted on GitHub Pages from `site/`. No paid hosting, database or AI inference at runtime.

## How data flows
1. `.github/workflows/refresh-and-deploy.yml` runs on every push to `main`, every 6 hours, and on manual dispatch.
2. `scripts/fetch-sleeper.mjs` (read-only Sleeper API) writes raw JSON to `site/data/sleeper/`.
3. `scripts/build-canonical.mjs` reconciles identities and writes `site/data/canonical.json`. If an owner ID does not match the config it exits non-zero, the commit is skipped and the site keeps serving the last good data.
4. The job commits the data and publishes `site/` to GitHub Pages.

A Claude session usually cannot reach `api.sleeper.app` directly. It does not need to: `git pull` and read `site/data/`.
To force a refresh, push any commit (an empty one works).

## One source of truth
`site/data/canonical.json` is the only current-season source. The Hub (`site/index.html`), franchise pages (`site/franchise.html?f=<slug>`) and the video build all read it. Never hardcode a team name, owner, record or roster anywhere else.
It holds, per franchise: IDs, live team name, manager, record, seed, streak, weekly results, generated storyline, featured players with points per start, owner nicknames, all-time head-to-head, season history and future picks. `generated_at` is the last-successful-update stamp shown on the site.
`docs/RECONCILIATION.md` is a readable snapshot of it; regenerate it after identity changes.

## Franchise identity
- Franchises are keyed by Sleeper `roster_id`, verified against `owner_id`. Team names are mutable and are always read live.
- `src/config/franchises.json` holds only what Sleeper cannot supply: URL slug, manager first name (override per user ID), cinematic theme, tagline, former names and managers.
- Roster 10 (owner `871044882217775104`, the commissioner) is currently **Die Another Day**. "The Pantheon" is a former name only.
- Roster 6 is **Nishant's Free Rollers** (owner `723759051976011776`) from 2026. Varun (`870740122004553728`) managed it 2022–2025 and is not in the 2026 league.
- If an owner changes, the build fails with a clear message: update `franchises.json`, then re-render that franchise's video.
- Slugs are permanent URL identifiers. Old links (`?f=pantheon`, `?f=varun`, `/hub/`) redirect.

## Player nicknames
Owner-assigned nicknames come live from Sleeper roster metadata (`p_nick_<player_id>`) and always win. `src/config/nicknames.json` holds `blocked` (owner nicknames kept off the public site, with the reason) and `creative` (nicknames written for the films, each marked `real` or `creative`). Emoji are stripped because the film fonts cannot draw them.

## Layout
- `site/` — the published site: `index.html` (Hub), `franchise.html`, `cinematics/` (MP4s, posters, gallery), `assets/` (shared CSS, JS, fonts), `data/`.
- `src/config/` — identity and nickname config.
- `src/engine/` — cinematic engine: `core.js` (timeline, acts), `themes.js` (13 looks; `temple` is retired), `audio.py`, `shell.html`, `fonts.css`.
- `scripts/` — `fetch-sleeper.mjs`, `build-canonical.mjs`, `build_cinematics.py`.
- `src/build_*.py`, `src/hub*`, `src/poster.css`, `src/league.json` — the September prototype. Not used by the site; kept for reference to the Commissioner's Playbook content.

## Standing rules from the commissioner
- Never change anything in Sleeper (rosters, lineups, settings). Read-only.
- No fabricated player images, logos, stats or history. Every number on screen must come from the Sleeper JSON.
- No player photographs unless properly licensed and recorded in `docs/ASSET_MANIFEST.md`.
- Nothing is sent to the league without his approval.
- Routine artistic choices do not need sign-off.

## Status
- Done: canonical data, Hub, 12 franchise pages, 12 first-generation cinematics (25s, six players, total points).
- Next: second-generation cinematics (about 45s, up to 10 players from `featured`, points per start, nicknames), season documentary, then Rivalry Engine and Playoff War Room.
- The site is plain HTML, CSS and JS with no build step. A React + Vite + TypeScript shell was the stated preference and has not been done.
