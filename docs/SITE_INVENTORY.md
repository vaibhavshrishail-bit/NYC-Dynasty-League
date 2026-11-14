# Route and interaction inventory (Nov 2026)

| Route | What it is | Interactive parts |
|---|---|---|
| `/` (index.html) | League Pulse: hero story, this week, playoff picture, power rankings, rivalry spotlight, awards, season so far, Franchise HQ grid, films, standings | Time Machine select + "Return to current week"; folds (standings, ranking method); franchise cards; links |
| `week.html` | Weekly Matchups. Three modes by week: preview (current), recap (completed), schedule (future) | Mode tabs; week select; one accordion per game; inside each: When it swings, Head-to-head, Lineups folds; poster download; NFL slate and commentary folds; `#m<n>` deep link |
| `playoffs.html` | Playoff War Room: Road to the Playoffs, What if, league race, road ahead, bracket, details | Franchise picker; week columns on the diagram; win/lose fork; now/win/lose table; Test other games (week tabs, picks); scenario chips; Reset; week stepper; Return to current week; hardest-road list; folds (certain, table, draft `#draft`, method, status) |
| `universe.html` | The race so far: playoff chance chart, power rankings chart, schedule gauntlet | Franchise chips; week slider and ◀ ▶; chart points (desktop) or tap columns (phone/tablet); side list; Save chart as image; gauntlet cells |
| `rivalry.html` | Rivalry Central: head-to-head file for any two franchises | Two selects; rivalry web (desktop/tablet, two clicks); "against everyone" list (phone); share-card download; `?a=&b=` deep link |
| `franchise.html?f=<slug>` | Franchise page ×12 | Play cinematic (video); previous/next franchise; links to rivalry files |
| `archives.html` | Record book: champions, all-time table, records, final standings by season, newsletter library, films, trade log | Season select; library folds per week; links to originals |
| `cinematics/` | Gallery of the 12 franchise films | Video players |
| `documentary/` | Documentary library and the Week 9 film | Video player, chapter buttons |
| `hub/` | Old address; redirects to `/` | none |
| `library/…` | Stored newsletter and history page images | none (opened from Archives) |

Shared chrome on every page: top navigation (six destinations), bottom tab bar on phones, footer data stamp.

Every row above except `hub/` and `library/` is exercised by `tests/site_test.py`.
