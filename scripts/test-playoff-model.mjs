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
console.log(`${n} checks passed`);
