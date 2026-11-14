// Builds the "living" layer: site/data/weekly.json (this week's preview, live scores, weekly awards, season highlights)
// and site/data/history.json (one snapshot per completed week of standings, power rankings and playoff odds).
// history.json: the latest completed week stays 'open' and is rewritten if its results change (stat corrections); once the next week completes it is 'locked' and never recalculated.
// No AI. Every sentence below is a template filled from Sleeper numbers.
import { readFile, writeFile } from 'node:fs/promises';
import { kickoffWindow } from './kickoff-windows.mjs';
const J = async (p) => JSON.parse(await readFile(p, 'utf8'));
const D = 'site/data/sleeper', C = await J('site/data/canonical.json'), L = await J('site/data/league.json'), S = `${D}/seasons/${C.season}`;
const [matchups, players, lg, riv, sched] = await Promise.all([J(`${S}/matchups.json`), J(`${D}/players.json`), J(`${S}/league.json`), J('src/config/rivalries.json'), J(`${D}/nfl_schedule.json`).catch(() => [])]);
const sim = new Function(await readFile('site/assets/sim.js', 'utf8') + '; return { simulate, seedTeams, modelOf, winChance, priorWeight };')();
const F = Object.fromEntries(C.franchises.map((f) => [f.roster_id, f])), ids = C.franchises.map((f) => f.roster_id), W = C.through_week, cur = C.current_week, regEnd = C.playoff_week_start - 1;
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100, mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1), sdv = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
// An upset is decided before the game, not after it: the winner must have gone in as a clear underdog on the site's own model
// (this season's scoring so far, blended with the preseason expectation while that still carries weight). The old rule compared
// season averages only, which after one week called a favourite an underdog. Threshold: 40% or less to win.
const UPSET_MAX = 0.40;
function preGameModel(w) { const PRE0 = L.preseason, rows = {}; for (const f of C.franchises) { const sc = f.results.filter((r) => r.week < w).map((r) => r.pf); rows[f.roster_id] = { ppg: sc.length ? mean(sc) : NaN, last3: sc.length ? mean(sc.slice(-3)) : NaN, sd: sc.length > 1 ? sdv(sc) : 0, ...(PRE0 ? { prior: { mu: PRE0.mu[f.roster_id], w: sim.priorWeight(w - 1) } } : {}) }; }
  const sds = Object.values(rows).map((r) => r.sd).filter((x) => x > 0); return { teams: rows, league_sd: sds.length ? mean(sds) : 25 }; }
function upsetOf(w) { if (w === 1 && !L.preseason) return null; const Lw = preGameModel(w), gs = (L.weeks[w] || {}).games || [];
  const c = gs.map((m) => { const win = m.pa > m.pb ? m.a : m.b, lose = win === m.a ? m.b : m.a, p = sim.winChance(Lw, win, lose); return { winner: win, loser: lose, winner_pts: Math.max(m.pa, m.pb), loser_pts: Math.min(m.pa, m.pb), win_prob: r2(p), gap: r2(0.5 - p) }; }).filter((x) => isFinite(x.win_prob) && x.win_prob <= UPSET_MAX).sort((a, b) => a.win_prob - b.win_prob);
  return c[0] || null; }
const pcu = (p) => Math.round(p * 100) + '%';
const POSMAP = { DE: 'DL', DT: 'DL', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', OLB: 'LB', ILB: 'LB' }, pos = (p) => { const x = p?.position || p?.fantasy_positions?.[0] || '?'; return POSMAP[x] || x; };
const IDP = new Set(['DL', 'LB', 'DB']), nm = (id) => players[id]?.full_name || `${players[id]?.first_name || ''} ${players[id]?.last_name || id}`.trim(), U = (s) => String(s).toUpperCase();
const mgr = (id) => F[id].manager, best = (arr, f) => (arr.length ? arr.reduce((x, y) => (f(y) > f(x) ? y : x)) : null);
const meet = (a, b) => L.meetings.filter((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a)).map((m) => (m.a === a ? { ...m, x: m.pa, y: m.pb } : { ...m, x: m.pb, y: m.pa }));
const SLOT = { SUPER_FLEX: 'SFLEX', IDP_FLEX: 'IDP', REC_FLEX: 'FLEX', WRRB_FLEX: 'FLEX' }, slots = C.roster_positions.map((s) => SLOT[s] || s);
const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ---------- weekly awards (completed weeks) ----------
const awards = {};
for (let w = 1; w <= W; w++) { const ms = matchups[w] || [], g = {}; for (const m of ms) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m);
  const games = Object.values(g).filter((x) => x.length === 2).map(([a, b]) => (a.points >= b.points ? { win: a, lose: b } : { win: b, lose: a }));
  const st = (m) => (m.starters || []).map((p, i) => ({ player_id: p, name: nm(p), position: pos(players[p]), nfl_team: players[p]?.team || 'FA', points: m.starters_points?.[i] ?? 0, roster_id: m.roster_id })).filter((x) => x.player_id !== '0');
  const before = (id) => { const s = F[id].results.filter((r) => r.week < w).map((r) => r.pf); return s.length ? mean(s) : null; };
  const mc = best(games.flatMap((x) => st(x.win).map((p) => ({ ...p, margin: r2(x.win.points - x.lose.points), opp: x.lose.roster_id, swing: p.points - (x.win.points - x.lose.points) }))), (p) => p.swing);
  const hb = best(games, (x) => x.lose.points), col = w > 1 ? best(ms.map((m) => ({ roster_id: m.roster_id, points: m.points, average_before: r1(before(m.roster_id)), short: r1(before(m.roster_id) - m.points) })), (x) => x.short) : null;
  const blow = best(games, (x) => x.win.points - x.lose.points), wk = L.weeks[w], rank = [...ms].sort((a, b) => b.points - a.points);
  awards[w] = { main_character: mc && { ...mc, swing: r2(mc.swing), decisive: mc.swing > 0 }, heartbreaker: hb && { roster_id: hb.lose.roster_id, points: hb.lose.points, opp: hb.win.roster_id, opp_points: hb.win.points, week_rank: rank.findIndex((m) => m.roster_id === hb.lose.roster_id) + 1 },
    collapse: col && col.short > 0 ? col : null, chaos: upsetOf(w), menace: wk?.top_idp || null, steamroller: blow && { roster_id: blow.win.roster_id, opp: blow.lose.roster_id, points: blow.win.points, opp_points: blow.lose.points, margin: r2(blow.win.points - blow.lose.points) } }; }

// ---------- player awards (about players and position groups, never managers) ----------
// Every award is a ranking of Sleeper points for that week. A player can win only one solo award per week; the next best takes the other.
for (let w = 1; w <= W; w++) { const ms = matchups[w] || [], g = {}; for (const m of ms) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m);
  const res = {}; for (const [a, b] of Object.values(g).filter((x) => x.length === 2)) { res[a.roster_id] = { won: a.points > b.points, opp: b.roster_id, margin: r2(a.points - b.points) }; res[b.roster_id] = { won: b.points > a.points, opp: a.roster_id, margin: r2(b.points - a.points) }; }
  const P = (pid, pts, rid) => ({ rank: C.player_ranks?.[pid] || null, player_id: pid, name: nm(pid), position: pos(players[pid]), nfl_team: players[pid]?.team || 'FA', points: r2(pts ?? 0), roster_id: rid });
  const starters = ms.flatMap((m) => (m.starters || []).map((p, i) => P(p, m.starters_points?.[i], m.roster_id)).filter((x) => x.player_id !== '0'));
  const bench = ms.flatMap((m) => (m.players || []).filter((p) => !(m.starters || []).includes(p)).map((p) => P(p, m.players_points?.[p], m.roster_id)));
  const used = new Set(), list = [], f2 = (x) => x.toFixed(2), by = (a) => [...a].sort((x, y) => y.points - x.points);
  const solo = (key, label, pool, text) => { const srt = by(pool), p = srt.find((x) => !used.has(x.player_id) && x.points > 0); if (!p) return; used.add(p.player_id); const ahead = srt[0].player_id !== p.player_id ? srt[0] : null; list.push({ key, label, big: p.name, points: p.points, roster_id: p.roster_id, players: [p], text: text(p, ahead ? `behind only ${ahead.name}, who takes another award this week` : null) }); };
  const unit = (key, label, test, word, min = 2) => { const c = ms.map((m) => { const pl = by(starters.filter((x) => x.roster_id === m.roster_id && test(x))); return { roster_id: m.roster_id, pl, points: r2(pl.reduce((a, x) => a + x.points, 0)) }; }).filter((x) => x.pl.length >= min).sort((x, y) => y.points - x.points)[0]; if (!c) return;
    list.push({ key, label, big: c.pl.slice(0, 5).map((x) => x.name.split(' ').slice(1).join(' ') || x.name).join(' · '), points: c.points, roster_id: c.roster_id, players: c.pl, text: c.pl.length === 1 ? `${c.pl[0].name} put up ${f2(c.points)} for ${mgr(c.roster_id)}, the most any lineup got from its ${word}.` : `${mgr(c.roster_id)}'s ${word} combined for ${f2(c.points)}, the best group in the league: ${c.pl.map((x) => `${x.name} ${f2(x.points)}`).join(', ')}.` }); };
  const side = (p) => `${mgr(p.roster_id)}${res[p.roster_id] ? (res[p.roster_id].won ? `, who won by ${f2(res[p.roster_id].margin)}` : `, who lost by ${f2(-res[p.roster_id].margin)}`) : ''}`;
  const mc0 = awards[w].main_character;
  solo('mvp', 'WEEK MVP', starters, (p) => `${f2(p.points)} points at ${p.position}, the highest score by any starter in the league, for ${side(p)}.`);
  if (mc0) solo('main_character', 'THE MAIN CHARACTER', starters.filter((x) => res[x.roster_id]?.won && x.points > res[x.roster_id].margin), (p) => `${f2(p.points)} for ${mgr(p.roster_id)} in a game decided by ${f2(res[p.roster_id].margin)}: take those points away and it is a loss.`);
  solo('menace', 'THE DEFENSIVE MENACE', starters.filter((x) => IDP.has(x.position)), (p, b) => `${f2(p.points)} from the ${p.position} spot, ${b ? `the best defensive score of the week ${b}` : 'the best defensive score of the week'}, for ${side(p)}.`);
  unit('idp_unit', 'THE IDP UNIT', (x) => IDP.has(x.position), 'defensive starters', 3);
  unit('receiver_room', 'THE RECEIVER ROOM', (x) => x.position === 'WR', 'wide receivers');
  unit('backfield', 'THE BACKFIELD', (x) => x.position === 'RB', 'running backs');
  unit('te_mafia', 'THE TIGHTEST END', (x) => x.position === 'TE', 'tight ends', 1);
  solo('field_general', 'THE FIELD GENERAL', starters.filter((x) => x.position === 'QB'), (p, b) => `${f2(p.points)}, the top quarterback score of the week${b ? ' ' + b : ''}, for ${side(p)}.`);
  solo('boot', 'THE BOOT', starters.filter((x) => x.position === 'K'), (p) => `${f2(p.points)} from the kicker, the most by any starting kicker this week, for ${side(p)}.`);
  solo('wasted', 'THE WASTED MASTERPIECE', starters.filter((x) => res[x.roster_id] && !res[x.roster_id].won), (p, b) => `${f2(p.points)} in a losing effort${b ? ` (${b})` : ''}: ${mgr(p.roster_id)} still fell to ${mgr(res[p.roster_id].opp)} by ${f2(-res[p.roster_id].margin)}.`);
  solo('bench_mob', 'THE BENCH MOB', bench, (p) => `${f2(p.points)} points that did not count: he was not in ${mgr(p.roster_id)}'s starting lineup.`);
  awards[w].list = list; }

// ---------- season highlights (always recomputed from completed weeks, so they move when results do) ----------
const wkList = Object.keys(awards).map(Number), pick = (f, get) => { const c = wkList.map((w) => ({ week: w, ...get(w) })).filter((x) => x.v != null); return c.length ? best(c, f) : null; };
let streak = null; for (const f of C.franchises) { let n = 0, s = 0; for (const r of f.results) { if (r.result === 'W') { if (!n) s = r.week; n++; if (!streak || n > streak.length) streak = { roster_id: f.roster_id, length: n, from: s, to: r.week }; } else n = 0; } }
const season = { biggest_upset: pick((x) => x.v, (w) => ({ v: awards[w].chaos?.gap, ...awards[w].chaos })), high_score: pick((x) => x.v, (w) => ({ v: L.weeks[w].high.pf, ...L.weeks[w].high })),
  closest: pick((x) => -x.v, (w) => ({ v: Math.abs(L.weeks[w].closest.pa - L.weeks[w].closest.pb), ...L.weeks[w].closest })), biggest_margin: pick((x) => x.v, (w) => ({ v: awards[w].steamroller?.margin, ...awards[w].steamroller })),
  best_player: pick((x) => x.v, (w) => ({ v: L.weeks[w].top_player.points, ...L.weeks[w].top_player })), best_defender: pick((x) => x.v, (w) => ({ v: L.weeks[w].top_idp.points, ...L.weeks[w].top_idp })),
  heartbreak: pick((x) => x.v, (w) => ({ v: awards[w].heartbreaker?.points, ...awards[w].heartbreaker })), longest_win_streak: streak };

// ---------- the season so far: one headline moment per completed week, plus season leaders ----------
const story = []; { let hiSoFar = 0, tot = {};
  for (const w of wkList.sort((a, b) => a - b)) { const d = L.weeks[w], a = awards[w], cl = d.closest, cg = Math.abs(cl.pa - cl.pb), up = a.chaos, hi = d.high, bl = a.steamroller, mvp = a.list.find((x) => x.key === 'mvp'), newHigh = hi.pf > hiSoFar && w > 1;
    const cw = cl.pa > cl.pb ? cl.a : cl.b, clo = cl.pa > cl.pb ? cl.b : cl.a;
    const ev = cg < 3 ? { kind: 'thriller', head: `DECIDED BY ${cg.toFixed(2)}`, text: `${mgr(cw)} edged ${mgr(clo)} ${Math.max(cl.pa, cl.pb).toFixed(2)}–${Math.min(cl.pa, cl.pb).toFixed(2)}.`, rosters: [cw, clo] }
      : up && up.win_prob <= 0.30 ? { kind: 'upset', head: `${U(mgr(up.winner))} STUNS ${U(mgr(up.loser))}`, text: `${mgr(up.winner)} went in with a ${pcu(up.win_prob)} chance to win on the site's model, and beat ${mgr(up.loser)} ${up.winner_pts.toFixed(2)}–${up.loser_pts.toFixed(2)}.`, rosters: [up.winner, up.loser] }
      : newHigh ? { kind: 'record', head: `${hi.pf.toFixed(2)}: A NEW SEASON HIGH`, text: `${mgr(hi.roster_id)} posted the biggest score of the season to that point.`, rosters: [hi.roster_id] }
      : bl && bl.margin >= 40 ? { kind: 'rout', head: `${U(mgr(bl.roster_id))} BY ${bl.margin.toFixed(2)}`, text: `${mgr(bl.roster_id)} beat ${mgr(bl.opp)} ${bl.points.toFixed(2)}–${bl.opp_points.toFixed(2)}, the widest margin of the week.`, rosters: [bl.roster_id, bl.opp] }
      : up ? { kind: 'upset', head: `${U(mgr(up.winner))} OVER ${U(mgr(up.loser))}`, text: `${mgr(up.winner)} had a ${pcu(up.win_prob)} chance going in and won ${up.winner_pts.toFixed(2)}–${up.loser_pts.toFixed(2)}.`, rosters: [up.winner, up.loser] }
      : { kind: 'high', head: `${U(mgr(hi.roster_id))} TOPS THE WEEK`, text: `${hi.pf.toFixed(2)} was the high score of Week ${w}.`, rosters: [hi.roster_id] };
    hiSoFar = Math.max(hiSoFar, hi.pf);
    story.push({ week: w, ...ev, high: hi, closest: { winner: cw, loser: clo, margin: r2(cg) }, mvp: mvp && { name: mvp.big, points: mvp.points, roster_id: mvp.roster_id, nfl_team: mvp.players[0].nfl_team, position: mvp.players[0].position } });
    for (const m of matchups[w] || []) (m.starters || []).forEach((p, i) => { if (p !== '0') { const t = (tot[p] ||= { player_id: p, name: nm(p), position: pos(players[p]), nfl_team: players[p]?.team || 'FA', points: 0, starts: 0, roster_id: m.roster_id }); t.points += m.starters_points?.[i] ?? 0; t.starts++; t.roster_id = m.roster_id; } }); }
  const lead = Object.values(tot).map((t) => ({ ...t, points: r2(t.points) })).sort((a, b) => b.points - a.points);
  season.top_starters = lead.slice(0, 5); season.top_defender_season = lead.find((t) => IDP.has(t.position)) || null;
  const cnt = {}; for (const w of wkList) for (const a of awards[w].list) if (a.players.length === 1) { const p = a.players[0]; (cnt[p.player_id] ||= { name: p.name, nfl_team: p.nfl_team, roster_id: p.roster_id, n: 0 }).n++; }
  season.most_awards = Object.values(cnt).sort((a, b) => b.n - a.n)[0] || null;
  const hs = {}; for (const w of wkList) hs[L.weeks[w].high.roster_id] = (hs[L.weeks[w].high.roster_id] || 0) + 1; const hb = Object.entries(hs).sort((a, b) => b[1] - a[1])[0]; season.most_weekly_highs = hb ? { roster_id: +hb[0], n: hb[1] } : null; }

// ---------- history snapshots (append-only) ----------
const hist = await J('site/data/history.json').catch(() => ({ _note: 'One snapshot per completed week. "reconstructed" weeks were calculated after the fact with the current model from results through that week; "recorded" weeks were saved when that week finished and are never recalculated.', weeks: {} }));
const firstBuild = Object.keys(hist.weeks).length === 0;
const PRE = L.preseason, MODEL = 2; // model 2: early weeks are blended with the preseason expectation
if (PRE) { const rows = ids.map((id) => ({ roster_id: id, wins: 0, losses: 0, pf: 0, ppg: PRE.mu[id], last3: PRE.mu[id], sd: 25, prior: { mu: PRE.mu[id], w: 1 } })), schedule = {};
  for (let k = 1; k <= regEnd; k++) { const g = {}; for (const m of matchups[k] || []) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m.roster_id); const pr = Object.values(g).filter((x) => x.length === 2).map((x) => x.sort((a, b) => a - b)); if (pr.length) schedule[k] = pr; }
  const o = sim.simulate({ franchises: rows, playoff_teams: C.playoff_teams }, { teams: Object.fromEntries(rows.map((r) => [r.roster_id, r])), league_sd: 25, schedule }, {}, 6000);
  hist.preseason = { basis_season: PRE.basis_season, note: PRE.note, expected_ppg: PRE.mu, power: [...ids].sort((a, b) => PRE.mu[b] - PRE.mu[a]), odds: Object.fromEntries(ids.map((id) => [id, { playoff: r2(o[id].playoff), top5: r2(o[id].top5), sixth: r2(o[id].sixth), champ: r2(o[id].champ) }])) }; }
for (let w = 1; w <= W; w++) { const prevSnap0 = hist.weeks[w], stale = PRE && prevSnap0 && (prevSnap0.model !== MODEL || prevSnap0.basis !== PRE.basis_season) && sim.priorWeight(w) > 0 && prevSnap0.source === 'reconstructed'; const prevSnap = stale ? null : prevSnap0; if (prevSnap && w < W) { prevSnap.status = 'locked'; continue; } // only the latest completed week stays open to stat corrections
  const rows = ids.map((id) => { const rs = F[id].results.filter((r) => r.week <= w), sc = rs.map((r) => r.pf); return { roster_id: id, wins: rs.filter((r) => r.result === 'W').length, losses: rs.filter((r) => r.result === 'L').length, pf: r2(sc.reduce((a, b) => a + b, 0)), ppg: mean(sc), last3: mean(sc.slice(-3)), sd: sdv(sc), ...(PRE ? { prior: { mu: PRE.mu[id], w: sim.priorWeight(w) } } : {}) }; });
  const schedule = {}; for (let k = w + 1; k <= regEnd; k++) { const g = {}; for (const m of matchups[k] || []) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m.roster_id); const pr = Object.values(g).filter((x) => x.length === 2).map((x) => x.sort((a, b) => a - b)); if (pr.length) schedule[k] = pr; }
  const Cw = { franchises: rows, playoff_teams: C.playoff_teams }, Lw = { teams: Object.fromEntries(rows.map((r) => [r.roster_id, r])), league_sd: mean(rows.map((r) => r.sd)) || 25, schedule };
  const o = sim.simulate(Cw, Lw, {}, 6000), ap = (id) => { let x = 0, y = 0; for (let k = 1; k <= w; k++) { const me = matchups[k].find((m) => m.roster_id === id).points; for (const m of matchups[k]) if (m.roster_id !== id) me > m.points ? x++ : me < m.points && y++; } return x / ((x + y) || 1); };
  const mp = Math.max(...rows.map((r) => r.ppg)), ml = Math.max(...rows.map((r) => r.last3)), ps = (r) => 100 * (0.4 * ap(r.roster_id) + 0.35 * r.ppg / mp + 0.25 * r.last3 / ml);
  const snap = { model: MODEL, ...(PRE && sim.priorWeight(w) > 0 ? { basis: PRE.basis_season } : {}), source: prevSnap ? prevSnap.source : stale ? 'reconstructed' : firstBuild && w < W ? 'reconstructed' : w === W && !firstBuild ? 'recorded' : 'reconstructed', saved_at: prevSnap ? prevSnap.saved_at : new Date().toISOString(), status: w === W ? 'open' : 'locked', seeds: sim.seedTeams(rows.map((r) => ({ id: r.roster_id, w: r.wins, pf: r.pf })), C.playoff_teams),
    records: Object.fromEntries(rows.map((r) => [r.roster_id, { w: r.wins, l: r.losses, pf: r.pf }])), power: [...rows].sort((a, b) => ps(b) - ps(a)).map((r) => r.roster_id),
    odds: Object.fromEntries(ids.map((id) => [id, { playoff: r2(o[id].playoff), top5: r2(o[id].top5), sixth: r2(o[id].sixth), champ: r2(o[id].champ) }])) };
  const same = prevSnap && JSON.stringify(prevSnap.records) === JSON.stringify(snap.records); // unchanged results: keep the saved snapshot exactly
  if (same) { prevSnap.status = snap.status; prevSnap.model ??= MODEL; } else { if (prevSnap) snap.corrected_at = new Date().toISOString(); hist.weeks[w] = snap; } }
await writeFile('site/data/history.json', JSON.stringify(hist));
// The game that moved the playoff race most each week: the biggest change in one team's playoff chance from the week before (preseason for Week 1).
const pcw = (x) => (x > 0.99 ? '>99%' : x < 0.01 ? '<1%' : Math.round(x * 100) + '%');
const swingOf = (w) => { const now = hist.weeks[w], bef = w > 1 ? hist.weeks[w - 1] : hist.preseason; if (!now || !bef) return null; let b = null;
  for (const gm of L.weeks[w].games) for (const [me, opp, mp, op] of [[gm.a, gm.b, gm.pa, gm.pb], [gm.b, gm.a, gm.pb, gm.pa]]) { const d = now.odds[me].playoff - bef.odds[me].playoff; if (!b || Math.abs(d) > Math.abs(b.delta)) b = { roster_id: me, opp, won: mp > op, pf: mp, pa: op, from: bef.odds[me].playoff, to: now.odds[me].playoff, delta: r2(d) }; }
  if (!b || Math.abs(b.delta) < 0.1) return null; const wn = b.won ? b.roster_id : b.opp, ls = b.won ? b.opp : b.roster_id;
  return { ...b, head: `${U(F[wn].team_name)} ${awards[w].chaos && awards[w].chaos.winner === wn && awards[w].chaos.loser === ls ? 'UPSET' : 'BEAT'} ${U(F[ls].team_name)}`, text: `${mgr(wn)} beat ${mgr(ls)} ${Math.max(b.pf, b.pa).toFixed(2)}–${Math.min(b.pf, b.pa).toFixed(2)}, and ${mgr(b.roster_id)}'s playoff chance went from ${pcw(b.from)} to ${pcw(b.to)}: the biggest move in the race that week.` }; };
for (const e of story) { const sw = swingOf(e.week); if (sw) { e.swing = sw; if (Math.abs(sw.delta) >= 0.25) Object.assign(e, { kind: 'swing', head: sw.head, text: sw.text, rosters: [sw.won ? sw.roster_id : sw.opp, sw.won ? sw.opp : sw.roster_id] }); } }
season.biggest_swing = story.filter((e) => e.swing).map((e) => ({ week: e.week, ...e.swing })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] || null;

// ---------- this week's preview (and live scores while it is being played) ----------
const prj = await J(`${D}/projections/${cur}.json`).catch(() => null), sc = lg.scoring_settings;
const proj = (pid) => { const s = prj?.[pid]?.stats; return s && Object.keys(s).length > 3 ? r2(Object.entries(s).reduce((a, [k, v]) => a + v * (sc[k] || 0), 0)) : null; };
const gameOf = (team) => sched.find((g) => g.week === cur && (g.home === team || g.away === team));
const model = sim.modelOf(L), phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z >= 0 ? p : 1 - p; };
const lineup = (id) => { const m = (matchups[cur] || []).find((x) => x.roster_id === id); return (m?.starters || []).map((p, i) => { const pl = players[p], g = pl && gameOf(pl.team), d = g ? new Date(g.date + 'T12:00:00Z') : null;
  return { slot: slots[i] || 'FLEX', rank: C.player_ranks?.[p] || null, player_id: p, empty: p === '0' || !pl, name: pl ? nm(p) : 'Empty slot', last_name: pl?.last_name || '', number: pl?.number ?? null, position: pos(pl), nfl_team: pl?.team || 'FA', status: pl?.injury_status || null,
    opp: !pl ? '' : g ? (g.home === pl.team ? 'vs ' + g.away : 'at ' + g.home) : 'BYE', day: d ? DAY[d.getUTCDay()] : null, date: g?.date || null, projected: g ? proj(p) : 0, live: m.starters_points?.[i] ?? null }; }); };
// ---- When it swings: real kickoff windows (Eastern Time). Needs nfl_kickoffs.json; without it the timeline falls back to game days and says so. ----
const KO = await J(process.env.KICKOFFS_FILE || `${D}/nfl_kickoffs.json`).catch(() => null), koList = KO?.[cur] || null;
const windowOf = (team) => { const sg = gameOf(team); if (!sg) return null; const k = koList?.find((x) => x.home === team || x.away === team);
  if (!k) return { key: 'D-' + sg.date, label: ({ THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday' })[DAY[new Date(sg.date + 'T12:00:00Z').getUTCDay()]], short: DAY[new Date(sg.date + 'T12:00:00Z').getUTCDay()], start: sg.date + 'T23:59:00Z', time: null, status: sg.status };
  const e = kickoffWindow(k.kickoff); return { key: e.key, label: e.label, short: e.short, start: k.kickoff, time: e.time, md: e.md, status: sg.status }; };
const timelineOf = (la, lb) => { const W = {}; for (const [side, l] of [['a', la], ['b', lb]]) for (const p of l) { if (p.empty || p.opp === 'BYE' || !p.opp) continue; const w = windowOf(p.nfl_team); if (!w) continue;
    const x = (W[w.key] ||= { key: w.key, label: w.label, short: w.short, start: w.start, md: w.md || null, times: new Set(), statuses: new Set(), a: { projected: 0, actual: 0, players: [] }, b: { projected: 0, actual: 0, players: [] } });
    if (w.start < x.start) x.start = w.start; if (w.time) x.times.add(w.time); x.statuses.add(w.status); x[side].projected += p.projected || 0; x[side].actual += p.live || 0;
    x[side].players.push({ name: p.name, position: p.position, nfl_team: p.nfl_team, number: p.number, opp: p.opp, projected: p.projected, live: p.live, kickoff: w.time }); }
  const ws = Object.values(W).sort((x, y) => (x.start < y.start ? -1 : 1)).map((x) => ({ ...x, times: [...x.times], state: [...x.statuses].every((s) => s === 'complete') ? 'final' : [...x.statuses].some((s) => s === 'complete' || s === 'in_game') ? 'live' : 'upcoming', statuses: undefined,
    a: { ...x.a, projected: r2(x.a.projected), actual: r2(x.a.actual), players: x.a.players.sort((p, q) => (q.projected || 0) - (p.projected || 0)) }, b: { ...x.b, projected: r2(x.b.projected), actual: r2(x.b.actual), players: x.b.players.sort((p, q) => (q.projected || 0) - (p.projected || 0)) } }));
  return { has_times: !!koList, windows: ws }; };
// Editorial variety without randomness: the same week and matchup always pick the same phrasing, different matchups pick different ones.
const vary = (list, ...seed) => list[Math.abs(seed.reduce((h, x) => (h * 31 + Number(x)) | 0, 7 + cur * 13)) % list.length];
const baseOdds = sim.simulate(C, L, {}, 5000);
const stakeOf = (a, b) => { const key = `${cur}:${a}-${b}`; if (!(L.schedule[cur] || []).some((p) => p[0] === a && p[1] === b)) return null;
  const wa = sim.simulate(C, L, { [key]: a }, 4000), wb = sim.simulate(C, L, { [key]: b }, 4000);
  return { a: { now: r2(baseOdds[a].playoff), win: r2(wa[a].playoff), lose: r2(wb[a].playoff) }, b: { now: r2(baseOdds[b].playoff), win: r2(wb[b].playoff), lose: r2(wa[b].playoff) } }; };
const p1 = (x) => (x >= 0.9995 ? '>99.9' : x < 0.0005 ? '<0.1' : (x * 100).toFixed(1)); // never prints a simulated 0.0 or 100.0
const pc = (x) => (x >= 0.995 ? 'over 99%' : x < 0.005 ? 'under 1%' : Math.round(x * 100) + '%');
const tagOf = (a, b) => riv.rivalries.find((r) => r.weeks.includes(cur) && ((r.a === a && r.b === b) || (r.a === b && r.b === a)))?.tag || null;
const games = [];
for (const [a, b] of (L.schedule[cur] || (matchups[cur] ? Object.values(Object.groupBy(matchups[cur].filter((m) => m.matchup_id), (m) => m.matchup_id)).map((x) => x.map((m) => m.roster_id).sort((p, q) => p - q)) : []))) {
  const la = lineup(a), lb = lineup(b), have = prj && [...la, ...lb].filter((p) => p.projected != null).length >= 16, pa = have ? r2(la.reduce((s, p) => s + (p.projected || 0), 0)) : r1(model[a].mu), pb = have ? r2(lb.reduce((s, p) => s + (p.projected || 0), 0)) : r1(model[b].mu);
  const p = phi((pa - pb) / Math.sqrt(model[a].sd ** 2 + model[b].sd ** 2)), fav = p >= 0.5 ? a : b, dog = fav === a ? b : a, fp = Math.max(p, 1 - p), gap = r2(Math.abs(pa - pb));
  const g = meet(a, b), wa = g.filter((m) => m.x > m.y).length, wb = g.filter((m) => m.x < m.y).length, last = g[g.length - 1];
  const lead = wa === wb ? null : wa > wb ? a : b, finals = g.filter((m) => m.type === 'championship'), tag = tagOf(a, b), firstMgr = [a, b].some((id) => F[id].former_managers.length) && g.every((m) => m.s < C.season);
  const rating = fp < 0.57 ? 'Razor-thin' : lead && lead === dog && !firstMgr ? 'Upset watch' : fp < 0.75 ? 'Fair fight' : 'Blowout potential';
  let st = 0, sw = null; for (let i = g.length - 1; i >= 0; i--) { const w = g[i].x > g[i].y ? a : b; if (sw === null) sw = w; if (w !== sw) break; st++; }
  const stakes = stakeOf(a, b), swing = stakes ? { a: stakes.a.win - stakes.a.lose, b: stakes.b.win - stakes.b.lose } : { a: 0, b: 0 }, hot = swing.a >= swing.b ? a : b, hs = stakes ? (hot === a ? stakes.a : stakes.b) : null;
  const favLine = vary([`${U(mgr(fav))} IS A ${p1(fp)}% FAVORITE BY ${gap.toFixed(2)}.`, `THE NUMBERS LEAN ${U(mgr(fav))} BY ${gap.toFixed(2)}.`, fp < 0.6 ? `CALL IT A COIN FLIP: ${U(mgr(fav))} BY ${gap.toFixed(2)}.` : `${U(mgr(dog))} NEEDS A ${Math.round((1 - fp) * 100)}% SHOT TO LAND.`, `${U(mgr(fav))} ${p1(fp)}%. ${U(mgr(dog))} ${((1 - fp) * 100).toFixed(1)}%.`], a, b), series = lead ? `${U(mgr(lead))} LEADS ${Math.max(wa, wb)}-${Math.min(wa, wb)}` : `THE SERIES IS LEVEL AT ${wa}-${wb}`;
  const NUM = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'], N = (n) => NUM[n] || String(n), rec = (id) => F[id].record.replace('–', '-');
  const trail = lead ? (lead === a ? b : a) : null, sweep = g.length >= 3 && !firstMgr && Math.min(wa, wb) === 0, lastGap = last ? Math.abs(last.x - last.y) : null;
  const slide = [a, b].find((id) => F[id].streak && F[id].streak.type === 'L' && F[id].streak.length >= 3), run = [a, b].find((id) => F[id].streak && F[id].streak.type === 'W' && F[id].streak.length >= 3);
  const winless = [a, b].find((id) => F[id].wins === 0 && F[id].losses > 2), perfect = [a, b].find((id) => F[id].losses === 0 && F[id].wins > 2);
  const shared = (() => { const c = {}; for (const x of [...la, ...lb]) { if (!x.opp || x.opp === 'BYE' || x.empty) continue; const k = x.opp.startsWith('at ') ? `${x.nfl_team}-${x.opp.slice(3)}` : `${x.opp.slice(3)}-${x.nfl_team}`; c[k] = (c[k] || 0) + 1; } const t = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return t && t[1] >= 5 ? t : null; })();
  // line one
  const one = !g.length || firstMgr ? vary([`A FIRST MEETING. NO HISTORY TO LEAN ON.`, `NEW MANAGERS. A BLANK LEDGER.`, `FIRST MEETING BETWEEN THESE MANAGERS.`], a, b)
    : perfect && F[a].seed <= 3 && F[b].seed <= 3 ? `${rec(a)} MEETS ${rec(b)}. THE TOP OF THE TABLE COLLIDES.`
    : perfect ? vary([`${U(mgr(perfect))} PUTS ${rec(perfect)} ON THE LINE.`, `STILL UNBEATEN. ${U(mgr(perfect))} IS ${rec(perfect)}.`], a, b)
    : winless ? vary([`${N(F[winless].losses)} WEEKS WITHOUT A WIN.`, `${U(mgr(winless))} IS STILL SEARCHING FOR WIN NUMBER ONE.`], a, b)
    : sweep ? `${N(g.length)} MEETINGS. ${N(g.length)} ${U(mgr(lead))} WINS.`
    : finals.length ? `${U(mgr(finals[finals.length - 1].x > finals[finals.length - 1].y ? a : b))} WON THE ${finals.length > 1 ? 'LAST ' + N(finals.length) + ' TITLE GAMES' : finals[0].s + ' TITLE GAME'} BETWEEN THEM.`
    : F[a].record === F[b].record && F[a].wins > F[a].losses ? `TWO ${rec(a)} TEAMS. ONE LEAVES AHEAD.`
    : lastGap !== null && lastGap < 3 ? `THE LAST MEETING: A ${lastGap.toFixed(2)}-POINT FINISH.`
    : tag ? `RIVALRY WEEK. ${series}.`
    : !lead ? `${N(g.length)} MEETINGS. ${N(wa)} WINS EACH.`
    : st >= 3 ? `${U(mgr(sw))} HAS WON ${N(st)} STRAIGHT IN THIS SERIES.`
    : vary([`${U(mgr(lead))} OWNS THE HISTORY, ${Math.max(wa, wb)}-${Math.min(wa, wb)}.`, `${series}.`, `${U(mgr(lead))} LEADS THE SERIES. ${U(mgr(trail))} WANTS IT BACK.`], a, b, 2);
  // line two: never repeat the fact used in line one
  const two = [
    sweep && `${U(mgr(trail))} NEEDS A DIFFERENT ENDING.`,
    hs && Math.max(swing.a, swing.b) >= 0.2 && vary([`WIN AND ${U(mgr(hot))} IS AT ${pc(hs.win).toUpperCase()}. LOSE AND IT IS ${pc(hs.lose).toUpperCase()}.`, `A ${Math.round(Math.max(swing.a, swing.b) * 100)}-POINT PLAYOFF SWING FOR ${U(mgr(hot))}.`], a, b, 1),
    rating === 'Upset watch' && `${U(mgr(fav))} IS A ${p1(fp)}% FAVORITE THIS TIME.`,
    gap < 5 && vary([`JUST ${gap.toFixed(2)} PROJECTED POINTS BETWEEN THEM.`, `${U(mgr(fav))}'S PROJECTED EDGE: JUST ${gap.toFixed(2)}.`], a, b, 5),
    slide && !winless && `${U(mgr(slide))} LOOKS TO END A ${N(F[slide].streak.length)}-GAME SLIDE.`,
    winless && vary([`SOMETHING HAS TO GIVE.`, `${U(mgr(fav))} IS A ${p1(fp)}% FAVORITE.`], a, b, 6),
    shared && `${N(shared[1])} STARTERS SHARE ${shared[0]}.`,
    run && !perfect && `${U(mgr(run))} BRINGS ${N(F[run].streak.length)} STRAIGHT WINS.`,
    lead && st >= 2 && sw === trail && !one.includes('STRAIGHT') && `${U(mgr(trail))} WON THE LAST ${N(st)}.`,
    favLine].find(Boolean);
  const head = [one, two];
  const why = !stakes ? '' : Math.max(swing.a, swing.b) < 0.03 ? vary([`Neither side's playoff chance moves much on this one: it is about pride, seeding and the head-to-head ledger.`, `The playoff picture barely notices this game. The series record does.`], a, b, 3)
    : `${mgr(hot)} has the most riding on it: a win puts the playoff chance at ${pc(hs.win)}, a loss at ${pc(hs.lose)}.${Math.min(swing.a, swing.b) >= 0.05 ? ` For ${mgr(hot === a ? b : a)} it is ${pc((hot === a ? stakes.b : stakes.a).win)} or ${pc((hot === a ? stakes.b : stakes.a).lose)}.` : ''}`;
  const kicker = !g.length || firstMgr ? 'First manager-to-manager meeting' : tag || (finals.length ? 'Finals matchup repeat' : [a, b].every((id) => F[id].seed >= 4 && F[id].seed <= 9) ? 'Playoff-line game' : [a, b].every((id) => F[id].wins === F[a].wins) ? `Two ${F[a].record} teams` : null);
  const form = (id) => { const f = F[id], lastR = f.results[f.results.length - 1]; return `${mgr(id)} ${f.streak && f.streak.length >= 2 ? `has ${f.streak.type === 'W' ? 'won' : 'lost'} ${f.streak.length} straight` : lastR ? `${lastR.result === 'W' ? 'won' : 'lost'} last week` : 'opens the season'}${lastR ? ` and scored ${lastR.pf.toFixed(2)} in Week ${lastR.week}` : ''}`; };
  const top = (l) => [...l].filter((x) => !x.empty).sort((x, y) => (y.projected || 0) - (x.projected || 0)), ta = top(la), tb = top(lb), q = (l) => l.filter((x) => x.status && /quest|doubt|out|ir/i.test(x.status)).map((x) => `${x.name} (${x.status})`);
  const story = [!g.length ? `${mgr(a)} and ${mgr(b)}'s franchises have never played each other.` : firstMgr ? `These two franchises have met ${g.length} times, but never with these two managers in charge.` : `${lead ? `${mgr(lead)} leads the series ${Math.max(wa, wb)}–${Math.min(wa, wb)}` : `The series is level at ${wa}–${wb}`}${st >= 2 ? `, and ${mgr(sw)} has taken the last ${st}` : ''}. ${mgr(last.x > last.y ? a : b)} won the most recent meeting ${Math.max(last.x, last.y).toFixed(2)}–${Math.min(last.x, last.y).toFixed(2)} in ${last.s}${last.type !== 'regular' ? ` (${last.type === 'championship' ? 'the championship game' : last.type === 'toilet' ? 'Toilet Bowl bracket' : last.type})` : ''}.`,
    vary([`${form(a)}; ${form(b)}.`, `Form line: ${form(a)}, while ${form(b)}.`, `${form(b)}. ${form(a)}.`], a, b, 4), have ? `${ta[0].name} (${ta[0].projected.toFixed(2)}) and ${tb[0].name} (${tb[0].projected.toFixed(2)}) carry the highest projections on each side. ${mgr(fav)} is projected ${Math.max(pa, pb).toFixed(2)} to ${Math.min(pa, pb).toFixed(2)}, a ${p1(fp)}% favorite.` : `Player projections are not available, so the ${p1(fp)}% figure for ${mgr(fav)} comes from season and recent scoring.`,
    [...q(la), ...q(lb)].length ? `On the injury report among the starters: ${[...q(la), ...q(lb)].slice(0, 4).join(', ')}${[...q(la), ...q(lb)].length > 4 ? ' and ' + ([...q(la), ...q(lb)].length - 4) + ' more' : ''}.` : ''].filter(Boolean).join(' ');
  const days = [...new Set([...la, ...lb].filter((x) => x.date).map((x) => x.date))].sort().map((d) => ({ date: d, day: DAY[new Date(d + 'T12:00:00Z').getUTCDay()] }));
  const win = (l) => days.map((d) => { const s = l.filter((x) => x.date === d.date); return { points: r2(s.reduce((t, x) => t + (x.projected || 0), 0)), slots: s.length }; }), wA = win(la), wB = win(lb);
  const how = (me, opp, lm, lo, wm, wo, mine, theirs) => { const o = [], all = [...lm, ...lo]; if (!have) return [`${mgr(me)} averages ${L.teams[me].ppg} a week to ${mgr(opp)}'s ${L.teams[opp].ppg}.`, mine > theirs ? `${mgr(me)} leads the series ${mine}–${theirs}.` : mine === theirs ? `The series is level.` : `${mgr(me)} trails the series ${mine}–${theirs}.`];
    const t = top(lm); o.push(t[0].projected >= Math.max(...all.map((x) => x.projected || 0)) ? `${t[0].name}'s ${t[0].projected.toFixed(2)} is the highest projection in this matchup.` : `${t[0].name} (${t[0].projected.toFixed(2)}) and ${t[1].name} (${t[1].projected.toFixed(2)}) lead ${mgr(me)}'s lineup.`);
    const edge = days.map((d, i) => ({ d, diff: wm[i].points - wo[i].points, i })).filter((x) => x.d.day !== 'SUN' || days.length === 1).sort((x, y) => y.diff - x.diff)[0]; if (edge && edge.diff >= 5) o.push(`${mgr(me)} has ${wm[edge.i].points.toFixed(2)} projected on ${edge.d.day === 'SUN' ? 'Sunday' : edge.d.day === 'MON' ? 'Monday night' : edge.d.day === 'THU' ? 'Thursday night' : edge.d.day} to ${mgr(opp)}'s ${wo[edge.i].points.toFixed(2)}.`);
    if (!g.length || firstMgr) o.push(`${mgr(me)} is ${F[me].record} and averages ${L.teams[me].ppg} a week.`); else if (sw === me && st >= 2) o.push(`${mgr(me)} has won the last ${st} meetings.`); else if (mine > theirs) o.push(`${mgr(me)} leads the series ${mine}–${theirs}.`); else if (mine === 0) o.push(`${mgr(me)} has not beaten ${mgr(opp)} in ${g.length} tries.`); else o.push(`${mgr(me)} last beat ${mgr(opp)} in ${[...g].reverse().find((m) => (me === a ? m.x > m.y : m.y > m.x)).s}.`);
    return o; };
  games.push({ a, b, stakes, why, projected: [pa, pb], win: [Math.round(p * 1000) / 1000, Math.round((1 - p) * 1000) / 1000], source: have ? 'projections' : 'model', rating, kicker, tag, headline: head, story, series: { a: wa, b: wb, games: g.length, first_for_managers: firstMgr }, history: g.map((m) => ({ season: m.s, week: m.w, type: m.type, a: m.x, b: m.y })),
    windows: days.map((d, i) => ({ ...d, a: wA[i], b: wB[i] })), how_a: how(a, b, la, lb, wA, wB, wa, wb), how_b: how(b, a, lb, la, wB, wA, wb, wa), timeline: timelineOf(la, lb), featured_a: ta.slice(0, 3), featured_b: tb.slice(0, 3), lineup_a: la, lineup_b: lb,
    live: C.week_in_progress ? [(matchups[cur].find((m) => m.roster_id === a) || {}).points ?? 0, (matchups[cur].find((m) => m.roster_id === b) || {}).points ?? 0] : null,
    interest: L.pulse.matchups.find((m) => m.a === a && m.b === b)?.score ?? 0 }); }
games.sort((x, y) => (y.tag ? 1 : 0) - (x.tag ? 1 : 0) || y.interest - x.interest);
const slate = [...new Set(sched.filter((g) => g.week === cur).map((g) => g.date))].sort().map((d) => ({ date: d, day: DAY[new Date(d + 'T12:00:00Z').getUTCDay()], games: sched.filter((g) => g.week === cur && g.date === d).map((g) => ({ home: g.home, away: g.away, status: g.status })) }));
const byeTeams = L.nfl_byes ? Object.entries(L.nfl_byes).filter(([, w]) => w === cur).map(([t]) => t).sort() : [];
// overview banner in the house style: two leading records, then what the week holds
const banner = (() => { if (!games.length) return null; const top = C.standings.slice(0, 2).map((id) => F[id]), riv = games.filter((x) => x.tag).length, close = games.filter((x) => x.rating === 'Razor-thin').length, rc = (f) => f.record.replace('–', '-');
  // "NEXT UP" must name the unbeaten team's real opponent this week, never simply the team in second place
  const tg = games.find((x) => x.a === top[0].roster_id || x.b === top[0].roster_id), opp = tg ? F[tg.a === top[0].roster_id ? tg.b : tg.a] : null;
  const h = top[0].losses === 0 && top[0].wins > 2 ? (opp ? `${rc(top[0])} ${U(top[0].manager)}. ${rc(opp)} ${U(opp.manager)} IS NEXT UP.` : `${rc(top[0])} ${U(top[0].manager)}. STILL UNBEATEN.`) : cur >= L.regular_season_end - 2 ? `WEEK ${cur}. THE LINE IS RIGHT THERE.` : `WEEK ${cur} RAISES THE STAKES.`;
  const bits = [riv ? `${riv} rivalry game${riv > 1 ? 's' : ''}` : null, close ? `${close} razor-thin projection${close > 1 ? 's' : ''}` : null, byeTeams.length ? `${byeTeams.length} NFL byes` : null].filter(Boolean);
  return [h, bits.length ? bits.join(' · ') + '.' : `${games.length} games.`]; })();
// last week's commentary: plain sentences from the awards
const aw = awards[W], lw = L.weeks[W], comm = aw ? [aw.chaos ? `The upset of Week ${W}: ${mgr(aw.chaos.winner)} beat ${mgr(aw.chaos.loser)} ${aw.chaos.winner_pts.toFixed(2)}–${aw.chaos.loser_pts.toFixed(2)} after going in with a ${pcu(aw.chaos.win_prob)} chance to win on the site's model.` : `No upsets in Week ${W}: every winner was the higher-scoring team coming in.`,
  `${mgr(lw.high.roster_id)} put up the top score, ${lw.high.pf.toFixed(2)}.`, aw.heartbreaker ? `${mgr(aw.heartbreaker.roster_id)} scored ${aw.heartbreaker.points.toFixed(2)}, the ${['', 'best', 'second-best', 'third-best', 'fourth-best', 'fifth-best', 'sixth-best'][aw.heartbreaker.week_rank] || aw.heartbreaker.week_rank + 'th-best'} total of the week, and still lost to ${mgr(aw.heartbreaker.opp)}.` : ''].filter(Boolean).join(' ') : '';
await writeFile('site/data/weekly.json', JSON.stringify({ generated_at: C.generated_at, season: C.season, through_week: W, current_week: cur, in_progress: !!C.week_in_progress, projections: !!prj, slots, awards, season_highlights: season, season_story: story.map((e) => ({ ...e, top_seed: hist.weeks[e.week]?.seeds[0] ?? null, top_seed_record: hist.weeks[e.week] ? `${hist.weeks[e.week].records[hist.weeks[e.week].seeds[0]].w}–${hist.weeks[e.week].records[hist.weeks[e.week].seeds[0]].l}` : null })),
  preview: { week: cur, games, banner, slate, byes: byeTeams, commentary: comm, note: 'Projected points are Sleeper\'s player projections scored with this league\'s settings, for the lineups currently set. Win chances are a model estimate. Nothing here is lineup advice.' } }));
console.log(`weekly.json: week ${cur} preview with ${games.length} games (${prj ? 'projections' : 'model only'}), awards for ${wkList.length} weeks; history.json has ${Object.keys(hist.weeks).length} weeks`);
