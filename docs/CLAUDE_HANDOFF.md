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

## The league hub (pages and what feeds them)
| Page | File | What it shows |
|---|---|---|
| League Pulse (home) | `site/index.html` | Current week, matchup of the week, headlines, playoff odds, power rankings, standouts, then the franchise grid and standings |
| Franchise HQ | `site/franchise.html?f=<slug>` | Cinematic, storyline, playoff path, remaining schedule with bye exposure, weekly results, top contributors, head-to-head, history, draft position, picks, roster |
| Stakes Center | `site/playoffs.html` | Playoff odds table, pick-the-winners scenarios, exact clinch notes, remaining schedule, rookie draft position |
| Rivalry Central | `site/rivalry.html?a=<slug>&b=<slug>` | Any two franchises: series split by game type, landmarks, every meeting, downloadable share card |
| Weekly | `site/week.html?w=<n>` | Recap for completed weeks, preview for upcoming ones |
| Archives | `site/archives.html` | Champions, all-time table, records, final standings by season, films, current-season trade log |
| Films | `site/documentary/`, `site/cinematics/` | Documentary archive (`documentary/index.json` lists films; add an entry per new film) and the 12 cinematics |

Everything is static and data-driven. Nothing on these pages is typed by hand, so the weekly "publishing pipeline" is the scheduled refresh: when Sleeper has new scores, the recap, preview, rankings, headlines and odds all change on their own.

- `scripts/build-league.mjs` writes `site/data/league.json`: every meeting since 2022 with its game type, all-time records, season standings, per-team form, power rankings, momentum, remaining schedule, bye weeks, weekly recaps, matchup-of-the-week scoring and headlines. Each formula is written out in that file and repeated on the page that uses it.
- `site/assets/sim.js` holds the playoff maths: `seedTeams` (the seeding rule), `simulate` (8,000 simulated finishes, in the browser), `exact`/`thisWeek` (certain clinch arithmetic for the top five), `winChance`.
- `site/assets/app.js` holds shared helpers, the crest drawing and the site navigation (`NAV`).
- Bye weeks come from an unofficial Sleeper schedule endpoint. If it stops working the last saved copy is used; if there is none, bye exposure is simply hidden.

### Scope rule
The site describes; it does not advise. No trade, waiver, draft-target or start/sit recommendations. Win chances and odds are labelled as model estimates.

## League rules that are not in Sleeper
- Playoff seeding: seeds 1–5 are the best records with points for as the tiebreaker; seed 6 is the highest points for among the other seven. Implemented in `scripts/build-canonical.mjs`.
- Bracket: Sleeper is configured for a fixed bracket (no reseeding) with one week per round, and the 2025 bracket was played that way, so the championship is Week 17. **Unconfirmed:** the commissioner's brief mentioned reseeding. If the league reseeds, change the two bracket lines at the end of the loop in `simulate()`.
- Rookie draft order: **unconfirmed.** Past drafts look like non-playoff teams in reverse regular-season order, then playoff teams by result, but not every past slot fits. The site says so wherever it shows a projected slot (`rules.draft_flag` in `build-league.mjs`).
- Toilet Bowl: the loser is the `w` of the placement-1 game in Sleeper's losers bracket (verified against the Commissioner's Playbook for 2022–2025).

## Status
- Done: canonical data, League Pulse, Franchise HQ, Stakes Center, Rivalry Central, weekly recaps and previews, Archives, 12 cinematics (45s), Week 9 documentary.
- Preserved as finished work: the 12 cinematics and `site/documentary/season-2026.mp4`. Do not re-render them without a reason.
- Open: confirm the bracket and draft-order rules; Sleeper avatars are still not shown; trades before the current season are not loaded; a moving playoff bracket view for Weeks 15–17 has not been built.
- The site is plain HTML, CSS and JS with no build step. A React + Vite + TypeScript shell was the stated preference and has not been done.
- Rendering video is the only step that needs a capable session; everything else updates itself.
- A checkpoint of the site before the league-hub work is on the branch `checkpoint-pre-league-hub`.
