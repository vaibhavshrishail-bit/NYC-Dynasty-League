# Site review, Nov 15 2026 (after Week 9, Week 10 in progress)

Method: 13 pages measured at 390px in Chromium with a 4x-slowed CPU (length, DOM size, contrast, heading order, tap targets, labels); built data compared with Sleeper's live API from the live site; the same numbers compared across pages. Not tested: Safari/WebKit, a physical phone, screen readers, the films' audio.

## Scores (out of 10)
- Accuracy 9: 0 mismatches against Sleeper (12 records/points/rosters, 33 traded picks, 6 Week 9 games, 727 player totals, 773 rank pairs). Playoff odds identical on Pulse, War Room and franchise page.
- Visual quality 7.5: consistent masthead/headings/cards; weak spots are page length, mixed dark/light panels, small text in chips.
- Usability 7: picker, search, inspector, in-place live scores work; weak spots are length (Pulse and Archives 14 screens, Draft 12), dense Draft grid, no "jump to" within long pages.
- Accessibility 6.5 (automated only): one h1 per page, all controls labelled, no missing alt; 21 text nodes under 12px on Pulse, 178 small tap targets on Draft, 48 on Archives, 18 on franchise pages, a few low-contrast chips.
- Performance 8: first paint under 0.3s on a slowed CPU locally; about 1 MB uncompressed on a first visit; Draft page has 15,800 DOM nodes.
- Reliability 7.5: deploy blocks on failing checks; two failed deploys in two days were both test faults; scheduled rebuild coverage had a Sunday-morning gap (fixed).

## Findings to act on
1. Timeline: "Week 17 · Champion decided" shown for the season in progress (reads as already decided).
2. Power rankings: momentum label can read oddly (0–9 team "Rising").
3. Pulse length with a franchise chosen; my-franchise panel is three stacked cards on phones.
4. Draft every-round grid: 178 tap targets under 40px on a phone.
5. Archives: 14 screens, small tap targets in tables, gold stars on cream at 1.4:1 contrast.
6. Chips under 12px (team tags in awards at 11.2px before the last fix, "THRILLER" at 2.9:1).
7. Long pages have no section index.
8. Race page: 30 contrast flags in the schedule gauntlet, to verify by eye.
9. Safari/iPhone never tested by the builder.
