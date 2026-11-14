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

### The living layer (added November 2026)
- **What "complete" means.** A week is complete only when Sleeper's NFL clock (`state.week`) has moved past it. Points on the board are not enough; Thursday scores appear mid-week. `through_week` is the last complete week, `current_week` the one being played or coming up, `week_in_progress` true once any score exists. Everything historical (results, streaks, head-to-head, records) uses complete weeks only.
- `scripts/build-weekly.mjs` writes two files:
  - `site/data/weekly.json`: the current week's preview (lineups as set, Sleeper projections scored with this league's settings, modeled win chance, headline, story, "when it swings" by game day, head-to-head, "how each side wins", live points while the week is played), weekly awards for every complete week, and season-to-date highlights. All sentences are templates in that script.
  - `site/data/history.json`: one snapshot per complete week of seeds, records, power rankings and playoff odds. **Append-only**: a week already in the file is never recalculated. Weeks 1–9 are marked `reconstructed` (calculated afterwards with the model as it was on 13 Nov 2026); every later week is `recorded` when it finishes. Do not delete this file: reconstructing it would rewrite what the site showed.
- `site/data/sleeper/projections/<week>.json` is refreshed only while that week is current, so past weeks keep the projections as they were. The endpoint is unofficial; without it the preview falls back to the scoring model and says so.
- New and changed pages: `week.html` (The Fallout recap with awards, The Hype Show preview with downloadable matchup posters), `universe.html` (The Race: playoff-race chart, power-rankings bump chart, schedule gauntlet, all sharing one franchise and week selection), `playoffs.html` (the Chaos Machine: picks for every remaining week, bracket), `rivalry.html` (rivalry web, The Receipts), `index.html` (live hero, Time Machine selector, season highlights).
- Named rivalries used to tag matchups are in `src/config/rivalries.json` (from the Commissioner's Playbook; roster 6's are left out because its manager changed).
- Jersey colours live in two places that must match: `NFLC` in `site/assets/app.js` (website) and `NFL` in `src/engine/core.js` (films).
- Weekly awards are calculated, not chosen. Definitions: Main Character = the winning-side starter whose points most exceeded the final margin; Heartbreaker = highest score by a losing team; Chaos = biggest upset by scoring average coming in; Steamroller = widest margin; Defensive Menace = top IDP starter; Collapse = biggest shortfall against a team's own average; Juggernaut = top of the power rankings.

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
- Open: confirm the bracket and draft-order rules; kickoff times are not in the data (windows are by game day only); posters are made in the visitor's browser, not pre-rendered; Sleeper avatars are still not shown; trades before the current season are not loaded; a moving playoff bracket view for Weeks 15–17 has not been built.
- The site is plain HTML, CSS and JS with no build step. A React + Vite + TypeScript shell was the stated preference and has not been done.
- Rendering video is the only step that needs a capable session; everything else updates itself.
- A checkpoint of the site before the league-hub work is on the branch `checkpoint-pre-league-hub`.

## Polish cycle (Nov 2026): design system v3 and the six-destination layout

Checkpoint before this work: branch `checkpoint-pre-polish`.

**Navigation.** Six destinations in `NAV` (`site/assets/app.js`): League Pulse (`./`), Matchups (`week.html`), Playoffs (`playoffs.html`), Franchises (`./#franchises`), Rivalries (`rivalry.html`), Archives (`archives.html`). Desktop shows a top bar; at 820px and below `nav()` also renders a fixed bottom tab bar (`.tabbar`). `universe.html` is now a sub-page of Playoffs ("The race so far"), linked by `subnav()`. No URL was removed.

**Page rules.** One primary story per screen, then a clear next action; reference material goes in `details.fold`.
- `index.html`: hero (matchup of the week, headline, `why`) → this week strip → playoff picture | power rankings → rivalry spotlight → four awards → season so far → Franchise HQ → films → standings (folded). Time Machine mode shows the sticky `.tmbar` and hides `#nowonly`, so no current-week content appears beside a past week.
- `week.html`: each game is a `details.mx` accordion. Summary = names, records, projected points, win chance, first headline line. Inside: headline, why it matters, jerseys, story, how each side wins, poster; then folds for game-day windows, head-to-head and lineups. `#m<n>` in the address opens that game.
- `playoffs.html`: leads with "What happens if [franchise] beats [opponent]?", Wins / Loses / Reset scenario, four result cards showing baseline → scenario, who else moves. Everything else is folded (`data-f` keys keep folds open across redraws). `#draft` opens the draft fold.
- `universe.html`: below 860px the charts use a narrow viewBox with full-height tap columns per week (no precision tapping), ◀ ▶ week buttons, a scrollable franchise chip row, and a card list for the gauntlet. Desktop keeps point clicks and adds crests to line-end labels.
- `rivalry.html`: "1. Pick a franchise 2. Pick a rival" steps drive the web's two-click selection.
- The chosen franchise is remembered in `localStorage` (`nyc.team`) via `myTeam` and pre-selects on Playoffs, the race and Rivalries.

**Copy variation.** `vary(list, ...seed)` in `scripts/build-weekly.mjs` picks phrasing deterministically from roster ids and the week, so wording changes week to week but never between refreshes. Each game now carries `stakes` (playoff chance now / with a win / with a loss) and a `why` sentence. `win` is stored to three decimals so the bar and the headline agree.

**Checks (run locally, not in CI).** Start `python3 -m http.server 8765` in `site/`, then:
- `python3 scripts/ux-audit.py <outdir>`: 8 pages × 1440/768/390/320; reports horizontal overflow, page height, text under 12px, tap targets under 30px, console errors; saves screenshots.
- `python3 scripts/ux-interact.py`: time machine in/out, scenario win/reset, fold persistence, deep links, chart tap and save, poster download, rivalry selection, old URLs.

**Known and unresolved.** Nameplates on the jersey graphics render at 5–7px on phones (decorative; the name is printed underneath at 17px+). Headline/story templates have not been tuned against the Weeks 1–9 previews (not yet provided). No benchmark against other league sites was run. Charts were not screen-reader tested beyond labels and titles.

## Newsletter library and Playbook rules (13 Nov 2026)
See `docs/reference/NEWSLETTER_ARCHIVE.md`. The commissioner's Weeks 1–8 previews and the League History series are stored in `site/library/` and listed in `site/data/library.json`; Archives shows them under "Newsletter library". Reseeding and the draft-order rule are now taken from the Commissioner's Playbook and are no longer flagged as unconfirmed (`sim.js` reseeds after Week 15).

## Playoff War Room 2.0 (13 Nov 2026)
Checkpoint before this work: branch `checkpoint-pre-warroom2`. Only `site/playoffs.html` was rebuilt; its styles are scoped to `body.wr` inside that file, so no other page changed look.

**Design.** Warm off-white page (`#f3f0e8`) with white analytical cards; deep navy (`#0f1b2d`, not black) only for the hero/flagship diagram and the bracket. Body 18px, secondary 15px, nothing under 13px; primary controls 44px or taller.

**One shared state** (`S` in the page script): `me` (franchise), `wk` (historical week, `null` = now), `forced` (scenario picks). Every section re-renders from it in `draw()`, so sections cannot disagree. Choosing a historical week clears the scenario and vice versa; a sticky bar says HYPOTHETICAL or HISTORICAL with Reset / Return to current week.

**Sections.** A "Road to the playoffs" (`road()`): the franchise's playoff chance after each week (filled dot = win, hollow = loss), dashed gold rings on its biggest swings, a NOW marker, and a fork to the win and loss outcomes of this week's game. Phones and tablets (<1000px) get a separate composition sized to the screen in CSS pixels, with no other teams' lines and full-height tap columns. B What if: now / win / lose table from three real simulations, plus "Test other games". C league-wide ranking with week stepper. D road ahead: per-game leverage (playoff chance with a win and with a loss in that game alone, 4,000 simulations each). E reseeded bracket. F folds: exact clinch notes, full table, draft order (`#draft`), method, data status.

**Turning points** are computed, never written by hand: weeks where the saved playoff chance moved 12 points or more, described by that week's actual result, plus the longest streak of three or more.

**Result finalization policy** (`scripts/build-weekly.mjs`, history section): a week counts once Sleeper's NFL week has moved past it. The latest completed week's snapshot has `status: "open"` and is rewritten if its results change at a later refresh (stat corrections, marked `corrected_at`); when the next week completes it becomes `"locked"` and is never recalculated. A week in progress is never counted.

**Checks.** `node scripts/test-playoff-model.mjs` (10 checks: seeding rule, sixth seed on points, six qualifiers per simulation, determinism, forced results, reseeding, clinch arithmetic, identities, results reconcile). It also runs in the GitHub workflow before data is committed, so a failing check leaves the last good site in place. `python3 scripts/ux-warroom-audit.py <outdir>` renders the page at 320/375/390/430/768/1440 and reports overflow, text under 13px, contrast under 4.5:1, tap targets under 40px and near-black share. `scripts/ux-interact.py` covers franchise select, win scenario, reset, historical week, keyboard activation, other games and the draft deep link.

**Not done.** `universe.html` (full twelve-line chart and schedule matrix) keeps the older dark look and is linked from the War Room. The reference article named in the brief could not be opened from the build environment. No screen-reader pass beyond labels, roles and keyboard activation. Weeks 1–9 probabilities are reconstructions.

## Sitewide stability and design-system sprint (14 Nov 2026)
Checkpoint before this work: branch `checkpoint-pre-sitewide`. Route list: `docs/SITE_INVENTORY.md`.

**One design system.** All colours are tokens defined once at the end of `site/assets/app.css` ("DESIGN TOKENS"). Pages are light by default (`--bg` warm off-white, `--card` white). Any element in the dark scope list (`.dark`, `.nav`, `.card`, `.hero`, `.hero2`, `details.mx`, `.panel`, `.aw`, `svg.chart`, `#web`, `.side`, `.film`, `.banner`) re-declares the same tokens for navy, so one component style works on both surfaces. Never write a hex colour in a page; use a token. Alias tokens (`--ink`, `--mut`, `--rule`) must be re-declared inside the dark scope because custom properties resolve where they are declared. The War Room component classes (`band`, `cardw`, `b2`, `q`, `tg`, `fd`, `tw2`, `w-row`, `cmp`) now live in `app.css` and are available to every page. Every `<body>` has class `wr`; the two film galleries add `dark`.

**Root causes of "breaks after clicking" and the fixes.**
1. Pages re-render whole sections with `innerHTML`, which destroys the browser's scroll anchor, so content jumped when anything above changed height. Fix: `keepPlace(fn)` in `app.js` remembers the control the reader touched and restores its screen position after the re-render. Used by the War Room, race, rivalry and homepage. Any new re-render must go through it.
2. Charts were drawn in a fixed desktop coordinate space and scaled down, so labels shrank to 10px at tablet widths. Fix: below 1000–1100px the charts are drawn in real pixels for the container (`narrow()` in `playoffs.html` and `universe.html`) and redrawn on resize.
3. Wide tables forced sideways scrolling inside cards on phones. Fix: `labelTables()` in `app.js` tags each cell with its column heading and CSS turns rows into labelled cards at 600px and below (`table.stk`, `table.kv`).
4. Tight display line-heights (0.82–0.92) made headings collide with the labels around them. Fixed in the shared heading styles.
5. The franchise picker re-centred on every redraw. It now keeps its scroll position unless the selected chip is out of view.
6. Rivalry web was simply removed on phones. It is replaced there by a tap-to-pick "against everyone" list.

**Automated browser test.** `python3 tests/site_test.py` opens every route at 320/375/390/430/768/1024/1440, performs the interaction sequences in the file (War Room lifecycle, matchup accordions, time machine, race, rivalry, franchise video, archives, and the 14-step phone journey) and after every step checks: sideways scroll, text or controls off-screen, clipped text, overlapping text, small text, small tap targets, charts rendered, stuck loading text, duplicate ids, JavaScript errors, failed requests, and scroll jumps. `--shots DIR` saves a screenshot per state; `--quick` runs 390 and 1440 only; `--smoke` loads pages without interacting; `--root DIR` tests another copy; `--only a,b` limits routes. Last local full run: 424 states, 0 critical.
The publish workflow runs `tests/site_test.py --ci` after the data build and the model checks. In CI only hard breakage fails the run (sideways scroll, JS error, failed request, chart not rendered, stuck loading, an interaction that cannot be performed); layout heuristics are reported as warnings because fonts differ between machines. A failed run publishes nothing, so the last good site stays up.

**Week-transition rehearsal.** On a throwaway copy, set `nfl_state.week` in `site/data/sleeper/index.json` to a later week (or `season_type` to `post`), run the three build scripts and `tests/site_test.py --smoke --root <copy>/site`. Rehearsed for Week 11, Week 15 and the postseason: all pages load cleanly. The model check "records agree with results" fails in the rehearsal because Sleeper's win totals are not updated in the copy; in production that same check is the guard that stops a week being published before Sleeper's records and scores agree.

**Moving to the 2027 league.** Sleeper creates a new league id each season, linked by `previous_league_id`.
1. In `src/config/franchises.json` set the league id to the 2027 league (the fetch script walks `previous_league_id` back, so history stays).
2. Check each roster's `owner_id` against the config; the build stops with a clear error if a roster changed hands. Add any new manager's first name; move the old one to `former_managers`.
3. Push. The workflow fetches, rebuilds and tests. `site/data/history.json` is per-season: archive the 2026 file as `history-2026.json` before the first 2027 build so the Time Machine starts fresh.
4. Franchise films and the documentary are static files; they stay until someone re-renders them (see `VIDEO_PRODUCTION.md`).

**Still open.** Player imagery remains jersey graphics. Chart screen-reader support is labels and keyboard only. `universe.html` and `rivalry.html` charts use franchise accent colours on navy panels rather than light surfaces. Scheduled refreshes are configured every six hours but GitHub has been running them about twice a day.

## Visual, accuracy and matchup upgrade (14 Nov 2026)
Checkpoint before this work: branch `checkpoint-pre-visual-upgrade`.

**Probability display (one system).** `pct(x, cert)` and `p1(x, cert)` in `site/assets/app.js` are the only formatters. A simulated value can never print as `0%` or `100%`: zero hits in 8,000 simulations is `<1%`, every hit is `>99%`. `0%` / `100%` print only when the caller passes proof from `certainty(C, L)` in `site/assets/sim.js`: a top-five seed clinched by arithmetic, or the regular season being complete. Nobody is ever shown as eliminated while regular-season games remain, because the sixth seed is decided on points. The build script has its own `p1` for headline text. History stores raw numbers only; reconstructed weeks stay labelled.

**NFL team identity.** `NFL` registry in `app.js` (32 teams: name, abbreviation, primary and secondary colour, `logo`). `nflBadge(abbr)` draws an original badge (abbreviation on team colours); `playerToken()` and `jerseySVG()` show a jersey with the player's real number. **No NFL logo files, mascot art or player photographs are in the repository.** Finding: none of the candidate sources (league and team sites, ESPN/Sleeper image CDNs, logo repositories) grants a licence to redistribute team marks or player photos on a public site, so the site uses original graphics. If the league obtains permission, add `site/assets/nfl/<ABBR>.svg` and set `NFL_LOGOS.<ABBR> = true`; every badge on the site switches to the logo with automatic fallback. Team shown for a player is the current team from Sleeper; badges are therefore only used on current-week lineups, the latest week's awards and current rosters, not on older weeks.

**When it swings.** `scripts/fetch-sleeper.mjs` saves `site/data/sleeper/nfl_kickoffs.json` (this week and next) from ESPN's public scoreboard feed. `scripts/kickoff-windows.mjs` classifies each kickoff in Eastern Time (Thursday night, Sunday morning/international, 1:00, late afternoon, Sunday night, Monday night, Thanksgiving, Friday, Saturday). `build-weekly.mjs` writes `game.timeline` (`has_times`, windows with each side's players, projections and actual points). `site/assets/matchup.js` draws the interactive timeline and the poster. If the feed is unavailable the timeline groups by game day and says so. The feed is unofficial; if ESPN changes it, nothing breaks, the times just disappear.

**Poster.** `posterTall()` in `matchup.js` draws a 2520 × 5400 PNG: crests, headline, projected score, win chance, three featured players a side with jersey, team badge and position, why it matters, the kickoff-window chart, series, how each side wins. "View and download poster" opens it in the lightbox first.

**Lightbox.** `openLightbox()` in `app.js`; any `<a data-lb="title">` opens its image whole, fitted to the screen width, scrollable, with a visible Close button and Esc. Used for posters and the newsletter library.

**Draft board.** Section `#draft` in `playoffs.html` (`drawG`). One card per first-round pick: most likely slot, confidence, original franchise, current holder, a 12-cell probability strip. Tap for detail (today's slot, simulated landing spots, range, all picks that holder owns). Recalculates under any scenario. Ownership is from Sleeper's traded-picks record; how picks moved is not stored.

**Dynasty Universe.** The rivalry web has four layers (`layer` in `rivalry.html`): every game, playoff games, this season's trades, draft picks owed. Layer → franchise → rival → the full head-to-head file. Phones get the same layers as a list.

**Tests.** `node scripts/test-playoff-model.mjs` now has 24 checks (adds probability display, certainty, kickoff windows, registry, timeline totals). `tests/site_test.py` adds kickoff-window selection, poster open/close, lightbox fit, draft-board drill-down and the network layers.

**What is automated and what is not.**
| Feature | Automated by the GitHub workflow | Notes |
|---|---|---|
| Scores, matchups, standings, rosters, records | Yes | Sleeper, every scheduled run |
| Projections | Yes | Unofficial Sleeper endpoint; falls back to the model |
| Playoff odds, scenarios, draft board | Yes | Calculated in the browser from the refreshed data |
| Weekly preview text, headlines, tags, awards, season highlights | Yes | `build-weekly.mjs` |
| Historical snapshots | Yes | Latest week open to corrections, earlier weeks locked |
| Rivalry records, network layers | Yes | Trades layer covers the current season only |
| Kickoff-window timeline | Yes, if the ESPN feed responds | Falls back to game days |
| Matchup posters | Yes | Drawn in the visitor's browser on demand; nothing to generate weekly |
| Franchise films and the documentary | **No** | Static files; re-rendering is a manual job (see VIDEO_PRODUCTION.md) |
| Newsletter library | **No** | Copied once from Nihar's archive |
| Season rollover to 2027 | **Manual, documented** | See the sitewide sprint section above |

**Not done in this cycle.** The cinematic video rebuild (see VIDEO_PRODUCTION.md, "Next edition plan"). NFL logos, mascots and player photographs (see the finding above). A separate mobile-size poster export.

## Dynasty Timeline and the second-edition film (14 Nov 2026)
`site/timeline.html`: season rail (2022 → now) → that season's moments on a vertical rail → tap a moment for detail and links. Events are computed in the page from `league.json` (meetings, records, seasons), `canonical.json` (trades, franchise seasons, former managers) and `weekly.json` (season highlights); filters by kind, and a "follow a franchise" select dims everything else. Linked from Archives and the homepage films block; covered by `tests/site_test.py` (`timeline` flow). Trades exist for the current season only, and team names from earlier seasons are not stored, so earlier seasons name the manager of that season and the current team name.
Second-edition film pipeline: see VIDEO_PRODUCTION.md, "Second edition". One reference film exists (`site/cinematics/vaibhav-v2.mp4`); it is not linked from any page yet.

## Feedback round: nine screenshot fixes, preseason odds, player awards, trade ledger, film notes (Week 10)

What changed and where:

- **Standings cut line** (`site/index.html`): the sixth-place row used class `cut`, which collided with the War Room `.cut` component. It is now `sixth` (dashed red line with a PLAYOFF LINE label).
- **Week by week bars** (`site/franchise.html`, `.weeks` rules at the end of `app.css`): bar and opponent line share one scale. The black line sits at the opponent's real score, above the bar in a loss. The margin is printed under each week.
- **Preseason expectation** (`site/assets/sim.js` `priorWeight`, `modelOf`; `scripts/build-league.mjs` `preseason`; `scripts/build-weekly.mjs` history loop):
  each franchise starts from last season's points per game for the same roster spot, pulled halfway to the league average. Weight is 100% before Week 1 and falls by a sixth per game to zero after six games. While the prior has weight the simulation also draws an uncertainty in each team's true level (8 points per game times the weight). `history.json` now has `preseason` (odds, expected points, power order) and reconstructed Weeks 1 to 5 were rebuilt with `model: 2`. Weeks 6 on are unchanged. Charts on the War Room and the race page start at a PRE point. It is a scoring-based proxy, not a roster valuation.
- **Weekly awards** (`scripts/build-weekly.mjs` "player awards"; `awardItem` in `app.js`): `weekly.json` `awards[w].list` holds eleven awards per week, all for players or position groups (Week MVP, Main Character, Defensive Menace, IDP Unit, Receiver Room, Backfield, TE Mafia, Field General, The Boot, Wasted Masterpiece, Bench Mob). A player wins at most one solo award a week; the text says so when the true top scorer already holds another award. The older manager-based fields are kept for the hero and season highlights.
- **Recap results** (`site/week.html`, `.resg/.res`): result cards, winner over loser, instead of the three-column row that squeezed on phones.
- **Trade ledger and draft capital board** (`site/rivalry.html` `tradesView`, `picksView`): the two layers no longer use the bar list. Trades: a week rail of cards showing what each side received, with a franchise filter and season chips. Picks: a ladder ordered by firsts then total, and a board per franchise (season by round) where each crest is the pick's original owner, dashed crests are own picks held elsewhere, and tapping a crest tells that pick's story. `canonical.json` trades now carry `from_roster`, `position`, `nfl_team`.
- **Past-season trades**: `scripts/fetch-sleeper.mjs` fetches completed trades for finished seasons once (they never change) into `seasons/<year>/transactions.json`; `build-canonical.mjs` writes `past_trades` and `trade_seasons`. The ledger and the Dynasty Timeline show them once the first refresh after this change has run.
- **Rivalry share card** (`site/rivalry.html` `paint`): portrait "tale of the tape": series score, level of dominance meter, up to four rule-based badges (kill streak, title games, season ender, longest run, blowout, photo finish, sweep, robbed), last five meetings, split records. Height adapts to the number of badges.
- **The season so far** (`site/index.html` `#hl`; `weekly.json` `season_story`): one headline per completed week on a rail (race swing of 25 points or more, thriller, upset, season high, rout), with MVP, high score, race swing and the No. 1 seed, plus a grid of season leaders.
- **Race swings**: `season_story[].swing` is the game behind the biggest one-team change in playoff chance each week; shown on the homepage rail and as moments on the Dynasty Timeline.
- **Dynasty Timeline bug**: 2025 threw `typeLabel is not a function` (it is an object) and the page kept showing 2026. Fixed; the browser test now opens every season.
- **Film, second pass** (`scripts/build_cinematics.py`, `src/engine/*`): no player cut under about 2.2 seconds and the film runs as long as that needs (`V2.dur`); each player's tag is their season rank at the position (total points in this league's scoring across every rostered player); `src/music/` holds an optional licensed track per film with a credit line; `auto2` re-renders the films listed in `src/config/films.json`; `.github/workflows/render-films.yml` does that weekly.

Checks: `scripts/test-playoff-model.mjs` has 26 checks (new: preseason odds, awards). `tests/site_test.py` covers the new ledger, board and all timeline seasons.

## Draft Room, crest v2, ranks and punishments (Week 10, second pass)

- **Draft Room** (`site/draft.html`, seventh navigation item): round-one projected board (moved from the War Room, which now links here), a grid of who holds every pick in every round for each draft year, the draft-capital ladder and all twelve boards (`pickBoard` in `app.js`, also used on franchise pages).
- **Crest v2** (`emblem` and `crestCanvas` in `app.js`): a self-contained medallion with its own dark field, metal rim and white keyline, so it reads on light and dark. Every page uses these two functions. The films draw their own crest in `src/engine/core.js` and pick the change up only when re-rendered.
- **Season position ranks**: `canonical.json` `player_ranks` (total points in league scoring through the last completed week). Used on franchise pages, previews, posters, award chips and the films.
- **Toilet Bowl punishments**: `src/config/punishments.json`, shown through `punishOf` / `punishTag`.
- **Season titles on the Dynasty Timeline**: `seasonTitle` / `seasonSub` in `site/timeline.html`, generated from results (first crown, dethrones, takes the crown back, back-to-back, three-peat, wire to wire).
- **Hype banner**: "NEXT UP" names the unbeaten team's actual opponent; a data check enforces it.

### Crest glyphs and championship stars
- Glyphs live in `src/engine/themes.js` (`glyph:`). After editing run `sh scripts/export-themes.sh` to refresh `site/data/themes.json`. Glyph parts can be filled `ink`, `hot`, `mid`, `hi` or (default) the metal gradient.
- Redrawn from scratch: eclipse (Die Another Day: heart with a live pulse), bunker (The RB shelter: roof over a football), beach (Its your bye week: palm, island, sun).
- Championship stars: `loadLeague` copies each franchise's title count onto its theme; `emblem` and `crestCanvas` draw one gold star per title on the upper rim. Films and existing poster images keep the old crest until re-rendered.

### League logo, upset rule, Wednesday films
- **League logo** (supplied by the commissioner; five stars = fifth season, so the artwork needs a sixth star for 2027): `site/assets/brand/logo-{64,192,512}.png` (favicon, navigation, homepage header, link preview image) and `src/engine/league-logo.png` (documentary open and close).
- **Upset rule** (`upsetOf` in `scripts/build-weekly.mjs`): an upset is decided before the game. The winner must have had a 40% or lower chance on the site's model going in (this season's scoring so far, blended with the preseason expectation while it still has weight). The old rule compared season averages only and, after one week, called a favourite an underdog. "UPSET" / "STUNS" appear in a headline only when that week has an upset under this rule; a data check enforces it. Sleeper's own pre-game projections are not stored for past weeks, so they are not used.
- **Wednesday films**: `.github/workflows/render-films.yml` runs Wednesdays at 11:40 UTC (6:40am Eastern in winter, 7:40am in summer) and re-renders the documentary second edition and the approved franchise films from fresh data.

## Refinement round (audit brief, 14 November): what was reproduced and fixed

Baseline for the audit: `1529ce1`. Each item was reproduced on that version before it was changed. Regression checks live in `tests/regression_test.py` (browser) and `scripts/test-playoff-model.mjs` (data); both run before every publish.

| Finding | Reproduced? | Fix |
|---|---|---|
| Historical awards showed current position ranks | Yes (Week 8: Swift RB9, Hooker DB24, Schwesinger LB8) | `site/data/ranks.json` holds one snapshot per completed week; awards read the snapshot for their own week (RB4, DB18, LB17). `rank_through` is stored on each award player. |
| Rank population depended on league rosters | Yes | `fetch-sleeper.mjs` now fetches every NFL player's weekly stats and scores them with the league's `scoring_settings` (`seasons/<y>/nfl_points.json`). `build-canonical.mjs` uses it only if it agrees with the league's own scores for rostered players (97% within 0.01 over at least 100 comparisons); otherwise it falls back to roster points and says so in `rank_basis.population`. League-scored points always win where they exist, so nothing is counted twice. |
| Film gallery accumulated franchise links | Yes | One persistent link (`#vl`), updated with the selected film. |
| "Try this week's scenarios" opened the War Room on the wrong franchise | Yes (links had no franchise) | Franchise, matchup and draft links carry `?f=`; URL beats the remembered franchise, which beats the default. Draft stakes opens the Draft Room. |
| Image viewer let focus reach the page behind | Yes (focus left the viewer every few Tabs) | Native `<dialog>` with `showModal()`, Tab wrap, Escape, focus returned to the opener. |
| Race chart "Save as image" produced nothing | **Not reproduced** in headless Chromium at 390 and 1440 (both files downloaded). The old code used a data-URL download, which some mobile browsers ignore. | Replaced with one shared path (`exportSvgPng`, `saveBlob`, `exportButton` in `app.js`): explicit SVG size, inlined styles, Blob URLs, `toBlob`, non-blank check, visible progress/success/failure, and a viewer fallback where downloads are unsupported. Output is at least 1800px wide. Not yet verified in Safari/WebKit (no WebKit build in this workspace). |
| This week's win chance differed between Matchups and the franchise page | Yes (two models) | The franchise table uses the Matchups lineup forecast for the current week and labels later weeks "season strength". |
| Preview described Thursday as upcoming after it was final; pregame totals shown beside live ones | Yes | `live_forecast` per game: expected final = points scored + projections for players still to play; win chance narrows with the share unplayed. Pregame projection is kept and labelled. Lineup players carry `game_state` (final, live, upcoming, bye) so a zero from a finished game is not the same as not started. |
| Race page said "every chart follows" but the gauntlet stayed current | Yes | The gauntlet is labelled as current and the claim is corrected. |

Rank definitions now in force: metric = season total fantasy points under this league's scoring through the snapshot week; position = primary Sleeper position (DE/DT → DL, CB/S → DB, OLB/ILB → LB); ties ordered by player id; population as stated in `rank_basis`. Points-per-game, weekly and projection ranks are not shown anywhere yet.

### After the first refresh with NFL-wide stats (14 November, 20:11 UTC)
- `nfl_points.json` arrived for Weeks 1 to 9 (about 1,800 players a week). All 2,733 comparisons against the league's own player scores agreed exactly, so the local scoring matches Sleeper's and the rank population is now **all NFL players**.
- Effect: a player's games before he was rostered now count. Example: Amani Hooker's Week 8 snapshot moved from DB18 (52.2 points while rostered) to DB1 (103.9 points in all games).

### UX addendum (14 November): status
- **Done**: optional "Which franchise is yours?" panel on the homepage (`mine()` in `site/index.html`). Remembered on the device, dismissible, `?f=` in a link wins. Shows my matchup (scored, expected final, players still to play, win chance with its basis), my stakes, my picks.
- **Not started**: five-tab navigation with a League index, player inspector and search, game-day view tabs, rooting guide and scenario A/B, pick transfer chain, "since your last visit", native share.

## Player inspector, search and game-day scores (Nov 14, 2026)

**Player inspector** (`openPlayer(pid, {week})` in `site/assets/app.js`). One panel for every player: a side panel on wide screens, a full sheet on phones.
- Opens from any element carrying `data-pid` (award chips, franchise player cards, matchup jersey tiles, lineup rows, timeline rows, homepage MVP chips) by click, Enter or Space, from search, or from a link ending `#player=<id>`. Back or Escape closes it and focus returns to what opened it.
- Data: `site/data/player_log.json`, written by `scripts/build-canonical.mjs` (every player in Sleeper's file with a position: name, eligibility, NFL team, number, status, league owner, points for each completed week, total, rank per eligible position, plus the same `basis` block as `ranks.json`). A `null` week means no game on record; it is shown as a dash, never as zero.
- The panel always shows current information and says "through Week N". Opened from a past week (`data-pweek`), it adds a separate line with the rank as it stood after that week, read from `ranks.json`.
- "What this rank means" lists measure, scoring, population, position rule, ties and source from the data file, so the wording cannot drift from the calculation.
- Not included: PPG rank, weekly rank, projection rank, snap or usage data (not in the data we fetch).

**Search** (`openSearch()`; the Search button in the header). Players, franchises, managers, former team names and former managers, in separate groups. A match on a former name says so.

**Game-day scores** (`overlayLive`, `startLivePoll` in `app.js`).
- While the fantasy week is in progress, every page that uses `loadLive()` reads `api.sleeper.app/v1/league/<id>/matchups/<week>` in the visitor's browser (read-only, confirmed reachable from the live site on Nov 14) and lays the scores over the built data. Team totals, player points and timeline windows are replaced; the live expectation is recomputed with the build's own rule using `live_sd` that `build-weekly.mjs` now writes per game.
- Between builds a game window's state is advanced by the clock (started → live, 5 hours after kickoff → final) until the next build confirms it from the schedule. If a starting lineup changed since the build, the expectation is left as built.
- The bar at the bottom shows the source and time; it is rechecked every 3 minutes while the tab is visible. When scores change it offers "Show new scores" (a reload), and reloads by itself when the visitor returns to the tab. If Sleeper can't be reached, the page keeps the built numbers and the bar says so.
- Full rebuilds now also run every 20 minutes during game windows (extra cron lines in `refresh-and-deploy.yml`). GitHub may delay scheduled runs; the browser overlay does not depend on them.
- Tests block `api.sleeper.app` so they read built data only; the overlay is tested with simulated responses (unchanged scores must reproduce the build exactly; changed scores must appear; failure must keep built scores and say so).

Status: inspector, search and overlay implemented and tested in Chromium at 390px and 1280px. Not tested in Safari/WebKit or on a physical phone. The overlay has not been observed during a real live game window yet.

## Rooting guide and scenario A/B (Nov 14, 2026)

Both live in the War Room (`site/playoffs.html`, `drawR()`, section `#rooting`, compare block `#compare`).
- **Rooting guide.** For the chosen franchise, every other game this week is simulated twice (each side winning) on the same 4,000 simulated seasons (`simulate(..., 4000, seed)`; the new optional `seed` argument makes paired runs comparable). The gap is what that game is worth. Gaps under 2 points show "No preference". Measure can be playoff chance, first-round bye or top-five seed. Tapping a result fixes it in the page-wide scenario. "If the week breaks its way / if nothing does" forces every stated preference plus the franchise's own game. It runs on top of any scenario already fixed and is then labelled Hypothetical.
- It describes standings math only: no lineup, trade or waiver suggestions.
- **Scenario A/B.** Save the currently fixed results as A or B (kept in `sessionStorage` key `nyc.scen`, this tab only), then compare Now / A / B for the chosen franchise and, in a fold, for all twelve. Each column is an 8,000-season run with its own seed, so differences of about a point can be noise (stated on the page).
- Known limit: both use the season-strength model for this week's games, not the live lineup forecast, so points already scored this week are not reflected.
- Tests: regression checks that every other game is listed, each verdict matches its bars, tapping fixes the result, and a saved scenario survives a reset. Chromium only.
