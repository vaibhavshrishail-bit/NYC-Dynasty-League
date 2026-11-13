// Builds the "living" layer: site/data/weekly.json (this week's preview, live scores, weekly awards, season highlights)
// and site/data/history.json (one snapshot per completed week of standings, power rankings and playoff odds).
// history.json is append-only: a week's snapshot is written once and never recalculated, so what the site showed then stays what it shows.
// No AI. Every sentence below is a template filled from Sleeper numbers.
import { readFile, writeFile } from 'node:fs/promises';
const J = async (p) => JSON.parse(await readFile(p, 'utf8'));
const D = 'site/data/sleeper', C = await J('site/data/canonical.json'), L = await J('site/data/league.json'), S = `${D}/seasons/${C.season}`;
const [matchups, players, lg, riv, sched] = await Promise.all([J(`${S}/matchups.json`), J(`${D}/players.json`), J(`${S}/league.json`), J('src/config/rivalries.json'), J(`${D}/nfl_schedule.json`).catch(() => [])]);
const sim = new Function(await readFile('site/assets/sim.js', 'utf8') + '; return { simulate, seedTeams, modelOf, winChance };')();
const F = Object.fromEntries(C.franchises.map((f) => [f.roster_id, f])), ids = C.franchises.map((f) => f.roster_id), W = C.through_week, cur = C.current_week, regEnd = C.playoff_week_start - 1;
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100, mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1), sdv = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
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
    collapse: col && col.short > 0 ? col : null, chaos: wk?.upset || null, menace: wk?.top_idp || null, steamroller: blow && { roster_id: blow.win.roster_id, opp: blow.lose.roster_id, points: blow.win.points, opp_points: blow.lose.points, margin: r2(blow.win.points - blow.lose.points) } }; }

// ---------- season highlights (always recomputed from completed weeks, so they move when results do) ----------
const wkList = Object.keys(awards).map(Number), pick = (f, get) => { const c = wkList.map((w) => ({ week: w, ...get(w) })).filter((x) => x.v != null); return c.length ? best(c, f) : null; };
let streak = null; for (const f of C.franchises) { let n = 0, s = 0; for (const r of f.results) { if (r.result === 'W') { if (!n) s = r.week; n++; if (!streak || n > streak.length) streak = { roster_id: f.roster_id, length: n, from: s, to: r.week }; } else n = 0; } }
const season = { biggest_upset: pick((x) => x.v, (w) => ({ v: awards[w].chaos?.gap, ...awards[w].chaos })), high_score: pick((x) => x.v, (w) => ({ v: L.weeks[w].high.pf, ...L.weeks[w].high })),
  closest: pick((x) => -x.v, (w) => ({ v: Math.abs(L.weeks[w].closest.pa - L.weeks[w].closest.pb), ...L.weeks[w].closest })), biggest_margin: pick((x) => x.v, (w) => ({ v: awards[w].steamroller?.margin, ...awards[w].steamroller })),
  best_player: pick((x) => x.v, (w) => ({ v: L.weeks[w].top_player.points, ...L.weeks[w].top_player })), best_defender: pick((x) => x.v, (w) => ({ v: L.weeks[w].top_idp.points, ...L.weeks[w].top_idp })),
  heartbreak: pick((x) => x.v, (w) => ({ v: awards[w].heartbreaker?.points, ...awards[w].heartbreaker })), longest_win_streak: streak };

// ---------- history snapshots (append-only) ----------
const hist = await J('site/data/history.json').catch(() => ({ _note: 'One snapshot per completed week. "reconstructed" weeks were calculated after the fact with the current model from results through that week; "recorded" weeks were saved when that week finished and are never recalculated.', weeks: {} }));
const firstBuild = Object.keys(hist.weeks).length === 0;
for (let w = 1; w <= W; w++) { if (hist.weeks[w]) continue;
  const rows = ids.map((id) => { const rs = F[id].results.filter((r) => r.week <= w), sc = rs.map((r) => r.pf); return { roster_id: id, wins: rs.filter((r) => r.result === 'W').length, losses: rs.filter((r) => r.result === 'L').length, pf: r2(sc.reduce((a, b) => a + b, 0)), ppg: mean(sc), last3: mean(sc.slice(-3)), sd: sdv(sc) }; });
  const schedule = {}; for (let k = w + 1; k <= regEnd; k++) { const g = {}; for (const m of matchups[k] || []) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m.roster_id); const pr = Object.values(g).filter((x) => x.length === 2).map((x) => x.sort((a, b) => a - b)); if (pr.length) schedule[k] = pr; }
  const Cw = { franchises: rows, playoff_teams: C.playoff_teams }, Lw = { teams: Object.fromEntries(rows.map((r) => [r.roster_id, r])), league_sd: mean(rows.map((r) => r.sd)) || 25, schedule };
  const o = sim.simulate(Cw, Lw, {}, 6000), ap = (id) => { let x = 0, y = 0; for (let k = 1; k <= w; k++) { const me = matchups[k].find((m) => m.roster_id === id).points; for (const m of matchups[k]) if (m.roster_id !== id) me > m.points ? x++ : me < m.points && y++; } return x / ((x + y) || 1); };
  const mp = Math.max(...rows.map((r) => r.ppg)), ml = Math.max(...rows.map((r) => r.last3)), ps = (r) => 100 * (0.4 * ap(r.roster_id) + 0.35 * r.ppg / mp + 0.25 * r.last3 / ml);
  hist.weeks[w] = { source: firstBuild && w < W ? 'reconstructed' : w === W && !firstBuild ? 'recorded' : 'reconstructed', saved_at: new Date().toISOString(), seeds: sim.seedTeams(rows.map((r) => ({ id: r.roster_id, w: r.wins, pf: r.pf })), C.playoff_teams),
    records: Object.fromEntries(rows.map((r) => [r.roster_id, { w: r.wins, l: r.losses, pf: r.pf }])), power: [...rows].sort((a, b) => ps(b) - ps(a)).map((r) => r.roster_id),
    odds: Object.fromEntries(ids.map((id) => [id, { playoff: r2(o[id].playoff), top5: r2(o[id].top5), sixth: r2(o[id].sixth), champ: r2(o[id].champ) }])) }; }
await writeFile('site/data/history.json', JSON.stringify(hist));

// ---------- this week's preview (and live scores while it is being played) ----------
const prj = await J(`${D}/projections/${cur}.json`).catch(() => null), sc = lg.scoring_settings;
const proj = (pid) => { const s = prj?.[pid]?.stats; return s && Object.keys(s).length > 3 ? r2(Object.entries(s).reduce((a, [k, v]) => a + v * (sc[k] || 0), 0)) : null; };
const gameOf = (team) => sched.find((g) => g.week === cur && (g.home === team || g.away === team));
const model = sim.modelOf(L), phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z >= 0 ? p : 1 - p; };
const lineup = (id) => { const m = (matchups[cur] || []).find((x) => x.roster_id === id); return (m?.starters || []).map((p, i) => { const pl = players[p], g = pl && gameOf(pl.team), d = g ? new Date(g.date + 'T12:00:00Z') : null;
  return { slot: slots[i] || 'FLEX', player_id: p, empty: p === '0' || !pl, name: pl ? nm(p) : 'Empty slot', last_name: pl?.last_name || '', number: pl?.number ?? null, position: pos(pl), nfl_team: pl?.team || 'FA', status: pl?.injury_status || null,
    opp: !pl ? '' : g ? (g.home === pl.team ? 'vs ' + g.away : 'at ' + g.home) : 'BYE', day: d ? DAY[d.getUTCDay()] : null, date: g?.date || null, projected: g ? proj(p) : 0, live: m.starters_points?.[i] ?? null }; }); };
// Editorial variety without randomness: the same week and matchup always pick the same phrasing, different matchups pick different ones.
const vary = (list, ...seed) => list[Math.abs(seed.reduce((h, x) => (h * 31 + Number(x)) | 0, 7 + cur * 13)) % list.length];
const baseOdds = sim.simulate(C, L, {}, 5000);
const stakeOf = (a, b) => { const key = `${cur}:${a}-${b}`; if (!(L.schedule[cur] || []).some((p) => p[0] === a && p[1] === b)) return null;
  const wa = sim.simulate(C, L, { [key]: a }, 4000), wb = sim.simulate(C, L, { [key]: b }, 4000);
  return { a: { now: r2(baseOdds[a].playoff), win: r2(wa[a].playoff), lose: r2(wb[a].playoff) }, b: { now: r2(baseOdds[b].playoff), win: r2(wb[b].playoff), lose: r2(wa[b].playoff) } }; };
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
  const favLine = vary([`${U(mgr(fav))} IS A ${(fp * 100).toFixed(1)}% FAVORITE BY ${gap.toFixed(2)}.`, `THE NUMBERS LEAN ${U(mgr(fav))} BY ${gap.toFixed(2)}.`, fp < 0.6 ? `CALL IT A COIN FLIP: ${U(mgr(fav))} BY ${gap.toFixed(2)}.` : `${U(mgr(dog))} NEEDS A ${Math.round((1 - fp) * 100)}% SHOT TO LAND.`, `${U(mgr(fav))} ${(fp * 100).toFixed(1)}%. ${U(mgr(dog))} ${((1 - fp) * 100).toFixed(1)}%.`], a, b), series = lead ? `${U(mgr(lead))} LEADS ${Math.max(wa, wb)}-${Math.min(wa, wb)}` : `THE SERIES IS LEVEL AT ${wa}-${wb}`;
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
    rating === 'Upset watch' && `${U(mgr(fav))} IS A ${(fp * 100).toFixed(1)}% FAVORITE THIS TIME.`,
    gap < 5 && vary([`JUST ${gap.toFixed(2)} PROJECTED POINTS BETWEEN THEM.`, `${U(mgr(fav))}'S PROJECTED EDGE: JUST ${gap.toFixed(2)}.`], a, b, 5),
    slide && !winless && `${U(mgr(slide))} LOOKS TO END A ${N(F[slide].streak.length)}-GAME SLIDE.`,
    winless && vary([`SOMETHING HAS TO GIVE.`, `${U(mgr(fav))} IS A ${(fp * 100).toFixed(1)}% FAVORITE.`], a, b, 6),
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
    vary([`${form(a)}; ${form(b)}.`, `Form line: ${form(a)}, while ${form(b)}.`, `${form(b)}. ${form(a)}.`], a, b, 4), have ? `${ta[0].name} (${ta[0].projected.toFixed(2)}) and ${tb[0].name} (${tb[0].projected.toFixed(2)}) carry the highest projections on each side. ${mgr(fav)} is projected ${Math.max(pa, pb).toFixed(2)} to ${Math.min(pa, pb).toFixed(2)}, a ${(fp * 100).toFixed(1)}% favorite.` : `Player projections are not available, so the ${(fp * 100).toFixed(1)}% figure for ${mgr(fav)} comes from season and recent scoring.`,
    [...q(la), ...q(lb)].length ? `On the injury report among the starters: ${[...q(la), ...q(lb)].slice(0, 4).join(', ')}${[...q(la), ...q(lb)].length > 4 ? ' and ' + ([...q(la), ...q(lb)].length - 4) + ' more' : ''}.` : ''].filter(Boolean).join(' ');
  const days = [...new Set([...la, ...lb].filter((x) => x.date).map((x) => x.date))].sort().map((d) => ({ date: d, day: DAY[new Date(d + 'T12:00:00Z').getUTCDay()] }));
  const win = (l) => days.map((d) => { const s = l.filter((x) => x.date === d.date); return { points: r2(s.reduce((t, x) => t + (x.projected || 0), 0)), slots: s.length }; }), wA = win(la), wB = win(lb);
  const how = (me, opp, lm, lo, wm, wo, mine, theirs) => { const o = [], all = [...lm, ...lo]; if (!have) return [`${mgr(me)} averages ${L.teams[me].ppg} a week to ${mgr(opp)}'s ${L.teams[opp].ppg}.`, mine > theirs ? `${mgr(me)} leads the series ${mine}–${theirs}.` : mine === theirs ? `The series is level.` : `${mgr(me)} trails the series ${mine}–${theirs}.`];
    const t = top(lm); o.push(t[0].projected >= Math.max(...all.map((x) => x.projected || 0)) ? `${t[0].name}'s ${t[0].projected.toFixed(2)} is the highest projection in this matchup.` : `${t[0].name} (${t[0].projected.toFixed(2)}) and ${t[1].name} (${t[1].projected.toFixed(2)}) lead ${mgr(me)}'s lineup.`);
    const edge = days.map((d, i) => ({ d, diff: wm[i].points - wo[i].points, i })).filter((x) => x.d.day !== 'SUN' || days.length === 1).sort((x, y) => y.diff - x.diff)[0]; if (edge && edge.diff >= 5) o.push(`${mgr(me)} has ${wm[edge.i].points.toFixed(2)} projected on ${edge.d.day === 'SUN' ? 'Sunday' : edge.d.day === 'MON' ? 'Monday night' : edge.d.day === 'THU' ? 'Thursday night' : edge.d.day} to ${mgr(opp)}'s ${wo[edge.i].points.toFixed(2)}.`);
    if (!g.length || firstMgr) o.push(`${mgr(me)} is ${F[me].record} and averages ${L.teams[me].ppg} a week.`); else if (sw === me && st >= 2) o.push(`${mgr(me)} has won the last ${st} meetings.`); else if (mine > theirs) o.push(`${mgr(me)} leads the series ${mine}–${theirs}.`); else if (mine === 0) o.push(`${mgr(me)} has not beaten ${mgr(opp)} in ${g.length} tries.`); else o.push(`${mgr(me)} last beat ${mgr(opp)} in ${[...g].reverse().find((m) => (me === a ? m.x > m.y : m.y > m.x)).s}.`);
    return o; };
  games.push({ a, b, stakes, why, projected: [pa, pb], win: [Math.round(p * 1000) / 1000, Math.round((1 - p) * 1000) / 1000], source: have ? 'projections' : 'model', rating, kicker, tag, headline: head, story, series: { a: wa, b: wb, games: g.length, first_for_managers: firstMgr }, history: g.map((m) => ({ season: m.s, week: m.w, type: m.type, a: m.x, b: m.y })),
    windows: days.map((d, i) => ({ ...d, a: wA[i], b: wB[i] })), how_a: how(a, b, la, lb, wA, wB, wa, wb), how_b: how(b, a, lb, la, wB, wA, wb, wa), featured_a: ta.slice(0, 3), featured_b: tb.slice(0, 3), lineup_a: la, lineup_b: lb,
    live: C.week_in_progress ? [(matchups[cur].find((m) => m.roster_id === a) || {}).points ?? 0, (matchups[cur].find((m) => m.roster_id === b) || {}).points ?? 0] : null,
    interest: L.pulse.matchups.find((m) => m.a === a && m.b === b)?.score ?? 0 }); }
games.sort((x, y) => (y.tag ? 1 : 0) - (x.tag ? 1 : 0) || y.interest - x.interest);
const slate = [...new Set(sched.filter((g) => g.week === cur).map((g) => g.date))].sort().map((d) => ({ date: d, day: DAY[new Date(d + 'T12:00:00Z').getUTCDay()], games: sched.filter((g) => g.week === cur && g.date === d).map((g) => ({ home: g.home, away: g.away, status: g.status })) }));
const byeTeams = L.nfl_byes ? Object.entries(L.nfl_byes).filter(([, w]) => w === cur).map(([t]) => t).sort() : [];
// overview banner in the house style: two leading records, then what the week holds
const banner = (() => { if (!games.length) return null; const top = C.standings.slice(0, 2).map((id) => F[id]), riv = games.filter((x) => x.tag).length, close = games.filter((x) => x.rating === 'Razor-thin').length, rc = (f) => f.record.replace('–', '-');
  const h = top[0].losses === 0 && top[0].wins > 2 ? `${rc(top[0])} ${U(top[0].manager)}. ${rc(top[1])} ${U(top[1].manager)}. NEXT UP.` : cur >= L.regular_season_end - 2 ? `WEEK ${cur}. THE LINE IS RIGHT THERE.` : `WEEK ${cur} RAISES THE STAKES.`;
  const bits = [riv ? `${riv} rivalry game${riv > 1 ? 's' : ''}` : null, close ? `${close} razor-thin projection${close > 1 ? 's' : ''}` : null, byeTeams.length ? `${byeTeams.length} NFL byes` : null].filter(Boolean);
  return [h, bits.length ? bits.join(' · ') + '.' : `${games.length} games.`]; })();
// last week's commentary: plain sentences from the awards
const aw = awards[W], lw = L.weeks[W], comm = aw ? [aw.chaos ? `The upset of Week ${W}: ${mgr(aw.chaos.winner)} beat ${mgr(aw.chaos.loser)} ${aw.chaos.winner_pts.toFixed(2)}–${aw.chaos.loser_pts.toFixed(2)} despite averaging ${aw.chaos.winner_ppg_before} a week coming in, against ${aw.chaos.loser_ppg_before}.` : `No upsets in Week ${W}: every winner was the higher-scoring team coming in.`,
  `${mgr(lw.high.roster_id)} put up the top score, ${lw.high.pf.toFixed(2)}.`, aw.heartbreaker ? `${mgr(aw.heartbreaker.roster_id)} scored ${aw.heartbreaker.points.toFixed(2)}, the ${['', 'best', 'second-best', 'third-best', 'fourth-best', 'fifth-best', 'sixth-best'][aw.heartbreaker.week_rank] || aw.heartbreaker.week_rank + 'th-best'} total of the week, and still lost to ${mgr(aw.heartbreaker.opp)}.` : ''].filter(Boolean).join(' ') : '';
await writeFile('site/data/weekly.json', JSON.stringify({ generated_at: C.generated_at, season: C.season, through_week: W, current_week: cur, in_progress: !!C.week_in_progress, projections: !!prj, slots, awards, season_highlights: season,
  preview: { week: cur, games, banner, slate, byes: byeTeams, commentary: comm, note: 'Projected points are Sleeper\'s player projections scored with this league\'s settings, for the lineups currently set. Win chances are a model estimate. Nothing here is lineup advice.' } }));
console.log(`weekly.json: week ${cur} preview with ${games.length} games (${prj ? 'projections' : 'model only'}), awards for ${wkList.length} weeks; history.json has ${Object.keys(hist.weeks).length} weeks`);
