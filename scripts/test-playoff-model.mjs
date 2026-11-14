// Focused checks on the maths behind the Playoff War Room. Run: node scripts/test-playoff-model.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const code = await readFile(new URL('../site/assets/sim.js', import.meta.url), 'utf8');
const S = new Function(code + '; return { seedTeams, simulate, exact, thisWeek, winChance };')();
const C = JSON.parse(await readFile(new URL('../site/data/canonical.json', import.meta.url))), L = JSON.parse(await readFile(new URL('../site/data/league.json', import.meta.url)));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('seeds 1-5 by record, points for breaks ties', () => {
  const rows = [{ id: 1, w: 9, pf: 900 }, { id: 2, w: 7, pf: 1000 }, { id: 3, w: 7, pf: 1100 }, { id: 4, w: 6, pf: 800 }, { id: 5, w: 5, pf: 950 }, { id: 6, w: 5, pf: 940 }, { id: 7, w: 2, pf: 1500 }, { id: 8, w: 4, pf: 700 }];
  assert.deepEqual(S.seedTeams(rows, 6).slice(0, 5), [1, 3, 2, 4, 5]);
});
t('seed 6 is the highest scorer among the rest, whatever its record', () => {
  const rows = [{ id: 1, w: 9, pf: 900 }, { id: 2, w: 7, pf: 1000 }, { id: 3, w: 7, pf: 1100 }, { id: 4, w: 6, pf: 800 }, { id: 5, w: 5, pf: 950 }, { id: 6, w: 5, pf: 940 }, { id: 7, w: 2, pf: 1500 }, { id: 8, w: 4, pf: 700 }];
  const s = S.seedTeams(rows, 6); assert.equal(s[5], 7); assert.deepEqual(s.slice(6), [6, 8]);
});
t('six franchises qualify in every simulated season', () => {
  const o = S.simulate(C, L, {}, 2000), sum = Object.values(o).reduce((a, x) => a + x.playoff, 0);
  assert.ok(Math.abs(sum - 6) < 1e-9); assert.ok(Math.abs(Object.values(o).reduce((a, x) => a + x.champ, 0) - 1) < 1e-9);
  assert.ok(Math.abs(Object.values(o).reduce((a, x) => a + x.bye, 0) - 2) < 1e-9);
});
t('the same scenario always returns the same numbers', () => {
  const wk = Object.keys(L.schedule)[0]; if (!wk) return; const [a, b] = L.schedule[wk][0], f = { [`${wk}:${a}-${b}`]: a };
  assert.deepEqual(S.simulate(C, L, f, 3000), S.simulate(C, L, f, 3000));
});
t('forcing a win never lowers that franchise below forcing the loss', () => {
  for (const [wk, prs] of Object.entries(L.schedule).slice(0, 2)) for (const [a, b] of prs) {
    const k = `${wk}:${a}-${b}`, w = S.simulate(C, L, { [k]: a }, 4000), l = S.simulate(C, L, { [k]: b }, 4000);
    assert.ok(w[a].playoff >= l[a].playoff - 0.02, `${k} for ${a}`); assert.ok(l[b].playoff >= w[b].playoff - 0.02, `${k} for ${b}`);
  }
});
t('a forced result is applied in every simulated season', () => {
  const wk = Object.keys(L.schedule)[0]; if (!wk) return; const [a, b] = L.schedule[wk][0], k = `${wk}:${a}-${b}`;
  const only = { ...L, schedule: { [wk]: [[a, b]] } }, f = C.franchises.find((x) => x.roster_id === a);
  assert.ok(Math.abs(S.simulate(C, only, { [k]: a }, 500)[a].wins - (f.wins + 1)) < 1e-9);
  assert.ok(Math.abs(S.simulate(C, only, { [k]: b }, 500)[a].wins - f.wins) < 1e-9);
});
t('reseeding: seed 1 can only meet the 6 seed in the semifinal when the 6 seed wins', () => {
  assert.match(code, /lo = w36 === s\[5\] \? w36 : w45/); // the single place the bracket rule lives
});
t('a clinched top-five seed is never reported for a team that can still be caught by five others', () => {
  const ex = S.exact(C, L); for (const f of C.franchises) { const r = ex[f.roster_id];
    if (r.clinched_top5) { const catchers = C.franchises.filter((o) => o.roster_id !== f.roster_id && ex[o.roster_id].max_wins >= f.wins).length; assert.ok(catchers <= C.playoff_teams - 2); } }
});
t('league structure: six playoff teams, playoffs weeks 15-17, identities match Sleeper owners', () => {
  assert.equal(C.playoff_teams, 6); assert.equal(C.playoff_week_start, 15); assert.equal(C.franchises.length, 12);
  assert.equal(new Set(C.franchises.map((f) => f.roster_id)).size, 12); assert.ok(C.franchises.every((f) => f.manager && f.team_name));
});
t('records and points agree with the saved week-by-week results', () => {
  for (const f of C.franchises) { assert.equal(f.results.filter((r) => r.result === 'W').length, f.wins); assert.ok(Math.abs(f.results.reduce((a, r) => a + r.pf, 0) - f.pf) < 0.06); assert.equal(f.results.length, C.through_week); }
});
// ---- probability display and certainty ----
const appjs = await readFile(new URL('../site/assets/app.js', import.meta.url), 'utf8');
const pctSrc = appjs.match(/const pct = [^\n]+/)[0], p1Src = appjs.match(/const p1 = [^\n]+/)[0], F = new Function(pctSrc + '\n' + p1Src + '\nreturn { pct, p1 };')();
const S2 = new Function(code + '; return { certainty };')();
t('zero hits in the simulation prints "<1%", never "0%"', () => { assert.equal(F.pct(0), '<1%'); assert.equal(F.pct(0.0001), '<1%'); assert.equal(F.pct(0.0049), '<1%'); assert.equal(F.p1(0), '<0.1'); });
t('all hits in the simulation prints ">99%", never "100%"', () => { assert.equal(F.pct(1), '>99%'); assert.equal(F.pct(0.9951), '>99%'); assert.equal(F.p1(1), '>99.9'); });
t('values near the edges round honestly', () => { assert.equal(F.pct(0.005), '1%'); assert.equal(F.pct(0.0149), '1%'); assert.equal(F.pct(0.994), '99%'); assert.equal(F.pct(0.5), '50%'); assert.equal(F.p1(0.757), '75.7'); });
t('"0%" and "100%" appear only with proof', () => { assert.equal(F.pct(0, 'impossible'), '0%'); assert.equal(F.pct(1, 'certain'), '100%'); assert.equal(F.pct(0.3, null), '30%');
  for (let i = 0; i <= 1000; i++) { const v = F.pct(i / 1000); assert.ok(v !== '0%' && v !== '100%', v); } });
t('no franchise is declared eliminated while regular-season games remain', () => { const ct = S2.certainty(C, L); if (Object.keys(L.schedule).length) for (const f of C.franchises) assert.notEqual(ct[f.roster_id].playoff, 'impossible'); });
t('a mathematical clinch is reported as certain and matches the exact arithmetic', () => { const ct = S2.certainty(C, L), ex = S.exact(C, L); if (Object.keys(L.schedule).length) for (const f of C.franchises) assert.equal(ct[f.roster_id].playoff === 'certain', !!ex[f.roster_id].clinched_top5); });
t('once the regular season is complete, exactly six are certain and six impossible', () => { const ct = S2.certainty(C, { ...L, schedule: {} }), v = Object.values(ct); assert.equal(v.filter((x) => x.playoff === 'certain').length, 6); assert.equal(v.filter((x) => x.playoff === 'impossible').length, 6); });
t('a synthetic clinch: a team no five others can catch is certain; a winless team is still not eliminated', () => {
  const fr = Array.from({ length: 12 }, (_, i) => ({ roster_id: i + 1, wins: i === 0 ? 12 : i === 11 ? 0 : 5, losses: 0, pf: 1000 - i, results: [] })), C2 = { ...C, franchises: fr, standings: fr.map((f) => f.roster_id), byRoster: Object.fromEntries(fr.map((f) => [f.roster_id, f])), through_week: 12 };
  const L2 = { ...L, schedule: { 13: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]], 14: [[1, 3], [2, 4], [5, 7], [6, 8], [9, 11], [10, 12]] } }, ct = S2.certainty(C2, L2);
  assert.equal(ct[1].playoff, 'certain'); assert.equal(ct[12].playoff, null); });
t('saved history never contains a formatted string, only raw probabilities', async () => { const H = JSON.parse(await readFile(new URL('../site/data/history.json', import.meta.url))); for (const w of Object.values(H.weeks)) for (const o of Object.values(w.odds)) { assert.equal(typeof o.playoff, 'number'); assert.ok(o.playoff >= 0 && o.playoff <= 1); assert.ok(['recorded', 'reconstructed'].includes(w.source)); } });
t('a scenario recalculation keeps the same display rules', () => { const wk = Object.keys(L.schedule)[0]; if (!wk) return; const [a, b] = L.schedule[wk][0], o = S.simulate(C, L, { [`${wk}:${a}-${b}`]: a }, 2000); for (const x of Object.values(o)) { const v = F.pct(x.playoff); assert.ok(v !== '0%' && v !== '100%'); } });
// ---- kickoff windows and the NFL team registry ----
const { kickoffWindow } = await import('./kickoff-windows.mjs');
t('kickoff windows: Thursday night, international morning, 1:00, 4:05 and 4:25, Sunday night, Monday night', () => {
  const k = (iso) => kickoffWindow(iso).key;
  assert.equal(k('2026-11-13T01:15:00Z'), 'THU-night'); assert.equal(k('2026-11-15T14:30:00Z'), 'SUN-early'); assert.equal(k('2026-11-15T18:00:00Z'), 'SUN-one');
  assert.equal(k('2026-11-15T21:05:00Z'), 'SUN-late'); assert.equal(k('2026-11-15T21:25:00Z'), 'SUN-late'); assert.equal(k('2026-11-16T01:20:00Z'), 'SUN-night'); assert.equal(k('2026-11-17T01:15:00Z'), 'MON-night');
  assert.equal(kickoffWindow('2026-11-15T21:25:00Z').time, '4:25 PM'); assert.equal(kickoffWindow('2026-11-15T14:30:00Z').time, '9:30 AM'); });
t('kickoff windows: Thanksgiving triple-header, Black Friday, Saturday games, and the daylight-saving change', () => {
  const k = (iso) => kickoffWindow(iso).key;
  assert.equal(k('2026-11-26T17:30:00Z'), 'THU-early'); assert.equal(k('2026-11-26T21:30:00Z'), 'THU-afternoon'); assert.equal(k('2026-11-27T01:20:00Z'), 'THU-night');
  assert.equal(k('2026-11-27T20:00:00Z'), 'FRI-afternoon'); assert.equal(k('2026-12-19T18:00:00Z'), 'SAT-early'); assert.equal(k('2026-12-20T01:15:00Z'), 'SAT-night');
  assert.equal(kickoffWindow('2026-10-25T17:00:00Z').time, '1:00 PM'); assert.equal(kickoffWindow('2026-11-08T18:00:00Z').time, '1:00 PM'); assert.equal(kickoffWindow('not a date'), null); });
t('NFL registry: 32 teams, each with a name and two colours, no logo files shipped, and every rostered player maps to a known team', async () => {
  const reg = new Function(appjs.slice(appjs.indexOf('const NFLC ='), appjs.indexOf('};', appjs.indexOf('const NFLC =')) + 2) + '\n' + appjs.slice(appjs.indexOf('const NFL_NAMES'), appjs.indexOf('const nflTeam')) + '\nreturn { NFL, NFLC, NFL_LOGOS };')();
  assert.equal(Object.keys(reg.NFL).length, 32); for (const t of Object.values(reg.NFL)) { assert.ok(t.name.length > 5 && /^#/.test(t.primary) && /^#/.test(t.secondary)); assert.equal(t.logo, null); }
  const WKJ = JSON.parse(await readFile(new URL('../site/data/weekly.json', import.meta.url))); for (const g of WKJ.preview.games) for (const p of [...g.lineup_a, ...g.lineup_b]) if (!p.empty && p.nfl_team !== 'FA') assert.ok(reg.NFL[p.nfl_team], 'unknown team ' + p.nfl_team); });
t('timeline windows add up to the lineup projections and are in kickoff order', async () => {
  const WKJ = JSON.parse(await readFile(new URL('../site/data/weekly.json', import.meta.url))); for (const g of WKJ.preview.games) { const W = g.timeline.windows; for (let i = 1; i < W.length; i++) assert.ok(W[i - 1].start <= W[i].start);
    for (const k of ['a', 'b']) { const sum = W.reduce((a, w) => a + w[k].projected, 0), lu = g['lineup_' + k].filter((p) => !p.empty && p.opp && p.opp !== 'BYE').reduce((a, p) => a + (p.projected || 0), 0); assert.ok(Math.abs(sum - lu) < 0.2, `${sum} vs ${lu}`); } } });
t('preseason expectation: no franchise starts at 0% or 100%, the odds sum to six playoff spots, and the prior has no weight from Week 6', async () => {
  const H = JSON.parse(await readFile(new URL('../site/data/history.json', import.meta.url))), LJ = JSON.parse(await readFile(new URL('../site/data/league.json', import.meta.url)));
  assert.ok(H.preseason, 'history.json has a preseason snapshot'); const o = Object.values(H.preseason.odds).map((x) => x.playoff);
  assert.equal(o.length, 12); for (const p of o) assert.ok(p > 0.02 && p < 0.98, `preseason odds ${p}`); assert.ok(Math.abs(o.reduce((a, b) => a + b, 0) - 6) < 0.05);
  const pw = new Function(await readFile(new URL('../site/assets/sim.js', import.meta.url), 'utf8') + '; return priorWeight;')(); assert.equal(pw(0), 1); assert.equal(pw(6), 0); assert.equal(pw(12), 0); assert.ok(pw(3) > 0 && pw(3) < 1);
  if (LJ.through_week >= 6) for (const t of Object.values(LJ.teams)) assert.equal(t.prior.w, 0); });
t('weekly awards: about ten per week, each tied to named players, no player wins two solo awards in a week', async () => {
  const WKJ = JSON.parse(await readFile(new URL('../site/data/weekly.json', import.meta.url)));
  for (const [w, a] of Object.entries(WKJ.awards)) { assert.ok(a.list.length >= 9 && a.list.length <= 12, `week ${w}: ${a.list.length} awards`); const solo = a.list.filter((x) => x.players.length === 1 && !['te_mafia'].includes(x.key)).map((x) => x.players[0].player_id); assert.equal(new Set(solo).size, solo.length);
    for (const x of a.list) { assert.ok(x.players.length >= 1 && x.players.every((p) => p.name && p.points >= 0)); assert.ok(Math.abs(x.players.reduce((s, p) => s + p.points, 0) - x.points) < 0.05, `${x.key} points add up`); } }
  assert.equal(WKJ.season_story.length, WKJ.through_week); for (const e of WKJ.season_story) assert.ok(e.head && e.text && e.rosters.length); });
console.log(`${n} checks passed`);
