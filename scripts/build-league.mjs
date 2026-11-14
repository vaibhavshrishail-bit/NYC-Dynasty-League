// Builds site/data/league.json: everything the League Pulse, Stakes Center, Rivalry Central, week pages and Archives need
// beyond canonical.json. Pure arithmetic on Sleeper data: no AI, no judgement calls that are not written down here.
// Runs in GitHub Actions right after build-canonical.mjs.
import { readFile, writeFile } from 'node:fs/promises';
const J = async (p) => JSON.parse(await readFile(p, 'utf8'));
const D = 'site/data/sleeper', C = await J('site/data/canonical.json'), season = String(C.season), S = `${D}/seasons/${season}`;
const [matchups, players, idx] = await Promise.all([J(`${S}/matchups.json`), J(`${D}/players.json`), J(`${D}/index.json`)]);
const sched = await J(`${D}/nfl_schedule.json`).catch(() => null);
const F = Object.fromEntries(C.franchises.map((f) => [f.roster_id, f])), ids = C.franchises.map((f) => f.roster_id);
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100, mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const W = C.through_week, regEnd = C.playoff_week_start - 1, cur = C.current_week || Math.min(W + 1, 17);
const POSMAP = { DE: 'DL', DT: 'DL', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', OLB: 'LB', ILB: 'LB' }, pos = (p) => { const x = p?.position || p?.fantasy_positions?.[0] || '?'; return POSMAP[x] || x; };
const IDP = new Set(['DL', 'LB', 'DB']), pname = (id) => players[id]?.full_name || `${players[id]?.first_name || ''} ${players[id]?.last_name || id}`.trim();

// ---------- every meeting, every season (roster_id is stable; owners may differ and are recorded) ----------
const meetings = [], seasons = [];
for (const s of [...idx.seasons].reverse()) {
  const d = `${D}/seasons/${s.season}`, lg = await J(`${d}/league.json`), mu = await J(`${d}/matchups.json`), ro = await J(`${d}/rosters.json`), us = Object.fromEntries((await J(`${d}/users.json`)).map((u) => [u.user_id, u]));
  const wb = (await J(`${d}/winners_bracket.json`).catch(() => null)) || [], lb = (await J(`${d}/losers_bracket.json`).catch(() => null)) || [], pws = lg.settings.playoff_week_start;
  const tag = (w, a, b) => { if (w < pws) return 'regular'; const r = w - pws + 1, hit = (br) => br.find((m) => m.r === r && ((m.t1 === a && m.t2 === b) || (m.t1 === b && m.t2 === a)));
    const x = hit(wb); if (x) return x.p === 1 ? 'championship' : x.p ? 'placement' : 'playoff'; return hit(lb) ? 'toilet' : 'consolation'; };
  for (const [w, ms] of Object.entries(mu)) { if (s.season === season && Number(w) > C.through_week) continue; /* in-progress weeks are not results */ const g = {}; for (const m of ms) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m);
    for (const pr of Object.values(g)) { if (pr.length !== 2 || !pr.some((m) => (m.points || 0) > 0)) continue; const [a, b] = pr.sort((x, y) => x.roster_id - y.roster_id);
      meetings.push({ s: Number(s.season), w: Number(w), a: a.roster_id, b: b.roster_id, pa: a.points, pb: b.points, type: tag(Number(w), a.roster_id, b.roster_id) }); } }
  const h = C.history.find((x) => x.season === Number(s.season));
  seasons.push({ season: Number(s.season), complete: s.season !== season, champion: h?.champion_roster ?? null, runner_up: h?.runner_up_roster ?? null, toilet_bowl: h?.toilet_bowl_roster ?? null,
    standings: ro.map((r) => ({ roster_id: r.roster_id, handle: us[r.owner_id]?.display_name || null, same_owner: r.owner_id === F[r.roster_id].owner_id, wins: r.settings.wins, losses: r.settings.losses,
      pf: r2((r.settings.fpts || 0) + (r.settings.fpts_decimal || 0) / 100), pa: r2((r.settings.fpts_against || 0) + (r.settings.fpts_against_decimal || 0) / 100) })).sort((x, y) => y.wins - x.wins || y.pf - x.pf) });
}
meetings.sort((x, y) => x.s - y.s || x.w - y.w);
const side = (m, id) => (m.a === id ? { pf: m.pa, pa: m.pb, opp: m.b } : { pf: m.pb, pa: m.pa, opp: m.a });
const h2h = (a, b) => { const g = meetings.filter((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a)); let w = 0, l = 0; for (const m of g) { const x = side(m, a); x.pf > x.pa ? w++ : x.pf < x.pa && l++; } return { games: g.length, w, l }; };

// ---------- all-time records ----------
const flat = meetings.flatMap((m) => [{ ...m, id: m.a, ...side(m, m.a) }, { ...m, id: m.b, ...side(m, m.b) }]);
const best = (arr, f) => arr.reduce((x, y) => (f(y) > f(x) ? y : x));
const game = (g) => ({ season: g.s, week: g.w, roster_id: g.id, opp: g.opp, pf: g.pf, pa: g.pa, type: g.type });
const winStreaks = () => { let top = null; for (const id of ids) { let n = 0, start = null; for (const g of flat.filter((x) => x.id === id && x.type === 'regular')) { if (g.pf > g.pa) { if (!n) start = g; n++; if (!top || n > top.length) top = { roster_id: id, length: n, from: { season: start.s, week: start.w }, to: { season: g.s, week: g.w } }; } else n = 0; } } return top; };
const seasonRows = seasons.flatMap((s) => s.standings.map((t) => ({ ...t, season: s.season, complete: s.complete })));
const records = { high_score: game(best(flat, (g) => g.pf)), low_score: game(best(flat, (g) => -g.pf)), biggest_win: game(best(flat, (g) => g.pf - g.pa)), closest_game: game(best(flat.filter((g) => g.pf > g.pa), (g) => -(g.pf - g.pa))),
  most_points_season: (({ roster_id, season, pf, handle }) => ({ roster_id, season, pf, handle }))(best(seasonRows.filter((r) => r.complete), (r) => r.pf)),
  best_record_season: (({ roster_id, season, wins, losses, handle }) => ({ roster_id, season, wins, losses, handle }))(best(seasonRows.filter((r) => r.complete), (r) => r.wins * 1e4 + r.pf)),
  longest_win_streak: winStreaks(),
  all_time: ids.map((id) => { const g = flat.filter((x) => x.id === id && x.type === 'regular'), po = flat.filter((x) => x.id === id && ['playoff', 'championship'].includes(x.type));
    return { roster_id: id, wins: g.filter((x) => x.pf > x.pa).length, losses: g.filter((x) => x.pf < x.pa).length, pf: r1(g.reduce((a, x) => a + x.pf, 0)), playoff_wins: po.filter((x) => x.pf > x.pa).length, playoff_losses: po.filter((x) => x.pf < x.pa).length,
      titles: C.history.filter((h) => h.champion_roster === id).map((h) => h.season), finals: C.history.filter((h) => h.champion_roster === id || h.runner_up_roster === id).length, toilet_bowls: C.history.filter((h) => h.toilet_bowl_roster === id).map((h) => h.season) }; }).sort((x, y) => y.wins - x.wins || y.pf - x.pf) };

// ---------- this season: form, all-play, power rankings ----------
const wk = (w) => matchups[w] || [], scoresOf = (id, upto = W) => F[id].results.filter((r) => r.week <= upto).map((r) => r.pf);
const allPlay = (id, upto) => { let w = 0, l = 0; for (let k = 1; k <= upto; k++) { const me = wk(k).find((m) => m.roster_id === id)?.points; if (me == null) continue; for (const m of wk(k)) if (m.roster_id !== id) me > m.points ? w++ : me < m.points && l++; } return { w, l, pct: w / ((w + l) || 1) }; };
const form = (id, upto) => { const s = scoresOf(id, upto); return { ppg: mean(s), last3: mean(s.slice(-3)), sd: sd(s), ap: allPlay(id, upto) }; };
const power = (upto) => { const f = Object.fromEntries(ids.map((id) => [id, form(id, upto)])), mp = Math.max(...ids.map((id) => f[id].ppg)), ml = Math.max(...ids.map((id) => f[id].last3));
  const sc = (id) => 100 * (0.4 * f[id].ap.pct + 0.35 * f[id].ppg / mp + 0.25 * f[id].last3 / ml); return [...ids].sort((a, b) => sc(b) - sc(a)).map((id) => ({ id, score: r1(sc(id)) })); };
const prNow = power(W), prPrev = W > 1 ? power(W - 1) : prNow, leagueSd = mean(ids.map((id) => form(id, W).sd));
const lineup = (id) => (wk(W).find((m) => m.roster_id === id)?.starters || []).filter((p) => p !== '0' && players[p]);
const byeOf = sched ? (() => { const t = {}; for (let w = 1; w <= 18; w++) { const on = new Set(sched.filter((g) => g.week === w).flatMap((g) => [g.home, g.away])); if (!on.size) continue; for (const tm of new Set(sched.flatMap((g) => [g.home, g.away]))) if (!on.has(tm)) t[tm] = w; } return t; })() : null;
const schedule = {}; for (let w = W + 1; w <= regEnd; w++) { const g = {}; for (const m of wk(w)) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m.roster_id); const pr = Object.values(g).filter((x) => x.length === 2).map((x) => x.sort((a, b) => a - b)); if (pr.length) schedule[w] = pr; }
const teams = {};
for (const id of ids) { const f = form(id, W), sc = scoresOf(id), rk = prNow.findIndex((x) => x.id === id) + 1, pk = prPrev.findIndex((x) => x.id === id) + 1, fr = F[id];
  const ratio = f.last3 / f.ppg, label = f.ap.pct >= 0.75 && ratio >= 0.95 ? 'Dominant' : ratio >= 1.07 ? 'Rising' : ratio <= 0.93 ? 'Falling' : 'Steady';
  const my = flat.filter((g) => g.id === id), hi = best(my, (g) => g.pf), ro = (await J(`${S}/rosters.json`)).find((r) => r.roster_id === id);
  const notable = Object.entries(matchups).filter(([w]) => Number(w) <= W).flatMap(([w, ms]) => { const me = ms.find((m) => m.roster_id === id); return (me?.starters || []).map((p, i) => ({ week: Number(w), player_id: p, name: pname(p), position: pos(players[p]), points: me.starters_points?.[i] ?? 0 })); }).filter((x) => x.player_id !== '0').sort((a, b) => b.points - a.points).slice(0, 3);
  const opp = []; for (const [w, prs] of Object.entries(schedule)) { const pr = prs.find((x) => x.includes(id)); if (pr) opp.push({ week: Number(w), opp: pr.find((x) => x !== id) }); }
  const byes = byeOf ? Object.fromEntries(Object.keys(schedule).map((w) => [w, lineup(id).filter((p) => byeOf[players[p].team] === Number(w)).map((p) => pname(p))])) : null;
  teams[id] = { ppg: r1(f.ppg), last3: r1(f.last3), sd: r1(f.sd), all_play: { w: f.ap.w, l: f.ap.l }, scores: sc, power: { rank: rk, prev: pk, score: prNow[rk - 1].score }, momentum: { label, detail: `${r1(f.last3)} a week over the last three, ${r1(f.ppg)} on the season` },
    remaining: opp, sos: opp.length ? r1(mean(opp.map((o) => form(o.opp, W).ppg))) : null, byes,
    franchise_high: game(hi), notable, roster: (ro.players || []).filter((p) => players[p]).map((p) => ({ name: pname(p), position: pos(players[p]), nfl_team: players[p].team || 'FA', starter: (ro.starters || []).includes(p), taxi: (ro.taxi || []).includes(p), ir: (ro.reserve || []).includes(p) }))
      .sort((a, b) => 'QB RB WR TE K DL LB DB'.split(' ').indexOf(a.position) - 'QB RB WR TE K DL LB DB'.split(' ').indexOf(b.position) || a.name.localeCompare(b.name)) }; }

// ---------- weekly recaps ----------
const weeks = {};
for (let w = 1; w <= W; w++) { const gs = meetings.filter((m) => m.s === C.season && m.w === w), st = wk(w).flatMap((m) => (m.starters || []).map((p, i) => ({ roster_id: m.roster_id, player_id: p, name: pname(p), position: pos(players[p]), nfl_team: players[p]?.team || 'FA', points: m.starters_points?.[i] ?? 0 }))).filter((x) => x.player_id !== '0');
  const before = Object.fromEntries(ids.map((id) => [id, w > 1 ? mean(scoresOf(id, w - 1)) : null]));
  const ups = w > 1 ? gs.map((m) => { const win = m.pa > m.pb ? m.a : m.b, lose = win === m.a ? m.b : m.a; return { winner: win, loser: lose, winner_pts: Math.max(m.pa, m.pb), loser_pts: Math.min(m.pa, m.pb), winner_ppg_before: r1(before[win]), loser_ppg_before: r1(before[lose]), gap: r1(before[lose] - before[win]) }; }).filter((x) => x.gap > 0).sort((a, b) => b.gap - a.gap) : [];
  weeks[w] = { games: gs.map((m) => ({ a: m.a, b: m.b, pa: m.pa, pb: m.pb })), top_player: best(st, (x) => x.points), top_idp: best(st.filter((x) => IDP.has(x.position)), (x) => x.points), upset: ups[0] || null,
    closest: (({ a, b, pa, pb }) => ({ a, b, pa, pb }))(best(gs, (m) => -Math.abs(m.pa - m.pb))), high: (() => { const g = best(flat.filter((x) => x.s === C.season && x.w === w), (x) => x.pf); return { roster_id: g.id, pf: g.pf }; })() }; }

// ---------- pulse ----------
const seedOf = (id) => F[id].seed, bubble = (id) => (seedOf(id) >= 4 && seedOf(id) <= 9 ? 1 : seedOf(id) <= 3 ? 0.5 : 0.2), maxPpg = Math.max(...ids.map((id) => teams[id].ppg));
const upcoming = (schedule[cur] || []).map(([a, b]) => { const hh = h2h(a, b), close = Math.max(0, 1 - Math.abs(teams[a].ppg - teams[b].ppg) / 40), stakes = bubble(a) + bubble(b), riv = hh.games >= 4 && Math.abs(hh.w - hh.l) <= 1 ? 0.5 : 0, qual = (teams[a].ppg + teams[b].ppg) / (2 * maxPpg);
  const why = []; if (stakes >= 1.5) why.push('both teams are on or near the playoff line'); else if (stakes >= 1) why.push('playoff positioning is at stake'); if (close >= 0.8) why.push(`the scoring gap is only ${r1(Math.abs(teams[a].ppg - teams[b].ppg))} a week`); if (riv) why.push(`the all-time series is ${hh.w}–${hh.l}`); if (qual >= 0.9) why.push('two of the highest-scoring teams');
  return { week: cur, a, b, score: r2(2 * stakes + 1.5 * close + riv + qual), why, h2h: hh }; }).sort((x, y) => y.score - x.score);
const last = weeks[W], headlines = [];
if (last) { const seasonHigh = best(flat.filter((x) => x.s === C.season), (x) => x.pf);
  if (seasonHigh.w === W) headlines.push({ title: `${F[seasonHigh.id].team_name} post the highest score of the season`, detail: `${seasonHigh.pf.toFixed(2)} in Week ${W}.` });
  for (const id of ids) { const g = flat.filter((x) => x.id === id), hi = best(g, (x) => x.pf); if (hi.s === C.season && hi.w === W && g.length > 20 && id !== seasonHigh.id) headlines.push({ title: `${F[id].team_name} set a franchise scoring record`, detail: `${hi.pf.toFixed(2)} is the most this roster spot has scored since the league began in 2022.` }); }
  const cg = last.closest, mg = Math.abs(cg.pa - cg.pb); if (mg < 5) headlines.push({ title: `${F[cg.pa > cg.pb ? cg.a : cg.b].team_name} survive by ${mg.toFixed(2)}`, detail: `The closest game of Week ${W}, against ${F[cg.pa > cg.pb ? cg.b : cg.a].team_name}.` });
  // (the upset headline moved to build-weekly.mjs, which decides upsets from pre-game win chance)
  for (const f of C.franchises) if (f.streak && f.streak.length >= 4) headlines.push({ title: f.streak.type === 'W' ? `${f.team_name} have won ${f.streak.length} straight` : `${f.team_name} have lost ${f.streak.length} straight`, detail: `${f.record} on the season, ${f.in_playoff_position ? 'holding the ' + f.seed + ' seed' : 'outside the playoff line'}.` });
  const tr = C.trades.filter((t) => t.week === W || t.week === cur); if (tr.length) headlines.push({ title: `${tr.length} trade${tr.length > 1 ? 's' : ''} since Week ${W} kicked off`, detail: tr.slice(0, 2).map((t) => t.rosters.map((r) => F[r].team_name).join(' and ')).join('; ') + '.' }); }
// Preseason expectation: last season's points per game for the same roster spot, pulled halfway back to the league average (rosters carry over in a dynasty league, but not perfectly).
const lastS = seasons.filter((s) => s.complete).sort((a, b) => b.season - a.season)[0], preseason = {};
if (lastS) { const pg = Object.fromEntries(lastS.standings.map((t) => [t.roster_id, t.pf / ((t.wins + t.losses) || 1)])), lm = Object.values(pg).reduce((a, b) => a + b, 0) / Object.values(pg).length;
  for (const id of ids) preseason[id] = r1(lm * (1 + 0.5 * ((pg[id] ?? lm) / lm - 1)));
  const pw = Math.max(0, (6 - W) / 6); for (const id of ids) teams[id].prior = { mu: preseason[id], w: Math.round(pw * 100) / 100 }; }
const out = { generated_at: C.generated_at, preseason: lastS ? { basis_season: lastS.season, mu: preseason, note: `Each franchise's ${lastS.season} points per game, pulled halfway back to the league average. It is a starting expectation only: its weight falls from 100% before Week 1 to zero after six games.` } : null, season: C.season, through_week: W, current_week: cur, regular_season_end: regEnd, league_sd: r1(leagueSd),
  rules: { seeding: C.playoff_rule, bracket: 'Six teams, reseeded every round (Commissioner\'s Playbook 2026-27): 4 v 5 and 3 v 6 in Week 15; in Week 16 seed 1 plays the lowest seed still alive and seed 2 plays the other winner; championship in Week 17.',
    bracket_flag: 'Sleeper itself is still set to a fixed bracket, as it was in 2025. If the 6 seed wins in Week 15, Sleeper will show different Week 16 pairings from the Playbook rule unless the setting is changed.',
    draft: 'Commissioner\'s Playbook 2026-27: the six non-playoff teams pick 1–6 in reverse order of regular-season finish, and the six playoff teams pick 7–12 in reverse order of playoff finish. The 6 seed can never receive a top-six pick.',
    draft_flag: 'Projected slots are simulated; the order is only final when the season ends.',
    model: 'Probabilities come from 8,000 simulated finishes of the regular season. Each team\'s weekly score is drawn from a bell curve centred on 70% of its season average plus 30% of its last three weeks, with spread taken from its own week-to-week variation (never less than 18 points).' },
  teams, schedule, nfl_byes: byeOf, weeks, pulse: { matchups: upcoming, upset: last?.upset || null, top_player: last?.top_player || null, top_idp: last?.top_idp || null, headlines: headlines.slice(0, 6), power: prNow.map((x) => x.id) },
  meetings, records, seasons: seasons.reverse() };
await writeFile('site/data/league.json', JSON.stringify(out));
console.log(`league.json: ${meetings.length} meetings, ${Object.keys(schedule).length} scheduled weeks ahead, byes ${byeOf ? 'yes' : 'unavailable'}, ${headlines.length} headlines`);
