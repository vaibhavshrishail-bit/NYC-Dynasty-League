// Builds site/data/canonical.json — the ONE current-season source every page and every video reads.
// Input: site/data/sleeper/* (from fetch-sleeper.mjs), src/config/franchises.json, src/config/nicknames.json.
// Runs in GitHub Actions after every Sleeper refresh. Fails loudly if identities do not reconcile.
import { readFile, writeFile } from 'node:fs/promises';
const J = async (p) => JSON.parse(await readFile(p, 'utf8'));
const D = 'site/data/sleeper';
const idx = await J(`${D}/index.json`), season = String(idx.seasons[0].season), S = `${D}/seasons/${season}`;
const [league, users, rosters, matchups, traded, tx, players, cfg, nickCfg] = await Promise.all([
  J(`${S}/league.json`), J(`${S}/users.json`), J(`${S}/rosters.json`), J(`${S}/matchups.json`), J(`${S}/traded_picks.json`),
  J(`${S}/transactions.json`).catch(() => ({})), J(`${D}/players.json`), J('src/config/franchises.json'), J('src/config/nicknames.json')]);
const U = Object.fromEntries(users.map((u) => [u.user_id, u]));
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const problems = [];
if (rosters.length !== 12) problems.push(`expected 12 rosters, found ${rosters.length}`);
// A week counts as complete only once Sleeper's NFL clock has moved past it. Points on the board are not enough:
// Thursday-night scores appear while the week is still being played.
const st = idx.nfl_state, liveWeek = String(st.season) === season && st.season_type === 'regular' ? st.week : st.season_type === 'post' ? 99 : 0;
const weeks = Object.keys(matchups).map(Number).filter((w) => w < liveWeek && matchups[w].some((m) => (m.points || 0) > 0)).sort((a, b) => a - b);
// ---- Position ranks: one snapshot per completed week, so a past week always shows the rank as it stood then ----
// Metric: season total fantasy points under this league's scoring, through the snapshot week. Population: every NFL player when the
// NFL-wide points file is present and agrees with the league's own scores; otherwise players who have been on a league roster (labelled).
// A player's league-scored points are used whenever Sleeper reports them for a roster; NFL-wide points fill every other week, so games
// played while unrostered, benched, on taxi or IR still count, and nothing is counted twice around trades (one value per player-week).
const RPOS = { DE: 'DL', DT: 'DL', NT: 'DL', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', OLB: 'LB', ILB: 'LB', MLB: 'LB' }, r2c = (x) => Math.round(x * 100) / 100;
const NFLP = await J(`${D}/seasons/${season}/nfl_points.json`).catch(() => null);
const leaguePts = {}; for (const w of weeks) { leaguePts[w] = {}; for (const m of matchups[w]) for (const [pid, pts] of Object.entries(m.players_points || {})) leaguePts[w][pid] = pts || 0; }
let chk = 0, ok = 0, maxDiff = 0; if (NFLP) for (const w of weeks) for (const [pid, pts] of Object.entries(leaguePts[w])) { const n = NFLP.weeks?.[w]?.[pid]; if (n == null || (!pts && !n)) continue; chk++; const d = Math.abs(n - pts); if (d <= 0.011) ok++; maxDiff = Math.max(maxDiff, d); }
const nflOK = !!NFLP && chk >= 100 && ok / chk >= 0.97 && weeks.every((w) => NFLP.weeks?.[w]);
const posOf = (pid) => { const p = players[pid]?.position || NFLP?.players?.[pid]?.[0]; return RPOS[p] || p || null; };
// Eligibility follows Sleeper: a player counts in the list for every position he is eligible at (fantasy_positions), so a DL/LB edge rusher
// is in both the DL list and the LB list. This is what makes the numbers match Sleeper's own position rankings.
const eligOf = (pid) => { const fp = players[pid]?.fantasy_positions || (NFLP?.players?.[pid]?.[1] || '').split('/').filter(Boolean); const e = [...new Set((fp.length ? fp : [players[pid]?.position || NFLP?.players?.[pid]?.[0]]).map((x) => RPOS[x] || x).filter(Boolean))]; const p = posOf(pid); return p && !e.includes(p) ? [p, ...e] : e; };
const ptsAt = (pid, w) => (pid in leaguePts[w] ? leaguePts[w][pid] : nflOK ? NFLP.weeks[w][pid] ?? 0 : 0);
const pop = new Set(weeks.flatMap((w) => Object.keys(leaguePts[w]))); if (nflOK) for (const w of weeks) for (const pid of Object.keys(NFLP.weeks[w])) pop.add(pid);
const RANKS = { basis: { metric: 'Season total fantasy points', scoring: "this league's scoring settings (half-PPR with IDP)", scoring_hash: NFLP?.scoring_hash || null, population: nflOK ? 'all NFL players' : 'players who have been on a league roster this season', position_rule: 'every position a player is eligible at in Sleeper (a DL/LB player is ranked in both lists; the label shown is his primary position); DE/DT count as DL, CB/S as DB, OLB/ILB as LB', ties: 'equal totals are ordered by player id', season: Number(season), source: nflOK ? `Sleeper NFL stats (${NFLP.source}) scored locally, league scores where rostered` : 'Sleeper league matchups', nfl_points_check: NFLP ? { compared: chk, agreed: ok, largest_difference: r2c(maxDiff), fetched_at: NFLP.fetched_at } : null, built_at: new Date().toISOString() }, weeks: {} };
const SEASON_PTS = {}, RANK = {}; { const tot = {};
  for (const w of weeks) { for (const pid of pop) { const v = ptsAt(pid, w); if (v) tot[pid] = r2c((tot[pid] || 0) + v); }
    const g = {}; for (const [pid, pts] of Object.entries(tot)) for (const ps of eligOf(pid)) (g[ps] ||= []).push([pts, pid]);
    const snap = {}; for (const [ps, l] of Object.entries(g)) l.sort((a, b) => b[0] - a[0] || (Number(a[1]) - Number(b[1]))).forEach(([pts, pid], i) => { if (!players[pid]) return; const e = (snap[pid] ||= [null, pts, {}]); e[2][ps] = i + 1; });
    for (const [pid, e] of Object.entries(snap)) { const pp = posOf(pid), k = pp in e[2] ? pp : Object.keys(e[2])[0]; e[0] = k + e[2][k]; if (Object.keys(e[2]).length < 2) e.length = 2; }
    RANKS.weeks[w] = snap; }
  const lastW = weeks[weeks.length - 1]; if (lastW != null) for (const [pid, [rk, pts]] of Object.entries(RANKS.weeks[lastW])) { RANK[pid] = rk; SEASON_PTS[pid] = pts; } RANKS.through_week = lastW == null ? 0 : Number(lastW); }
await writeFile('site/data/ranks.json', JSON.stringify(RANKS));
const through = weeks.length ? weeks[weeks.length - 1] : 0;
const POS = { DE: 'DL', DT: 'DL', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', OLB: 'LB', ILB: 'LB' };
const pos = (p) => { const x = p?.position || p?.fantasy_positions?.[0] || '?'; return POS[x] || x; };
const IDP = new Set(['DL', 'LB', 'DB']);
const cleanNick = (s) => (s || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, '').replace(/\s+/g, ' ').trim();

// ---- all-time history (roster_id is stable across seasons) ----
const history = [], h2h = {}, titles = {};
for (const s of idx.seasons) {
  const d = `${D}/seasons/${s.season}`, ro = await J(`${d}/rosters.json`), us = Object.fromEntries((await J(`${d}/users.json`)).map((u) => [u.user_id, u]));
  const mu = await J(`${d}/matchups.json`), wb = (await J(`${d}/winners_bracket.json`).catch(() => null)) || [];
  const fin = wb.find((m) => m.p === 1 && m.w);
  // Toilet Bowl: in Sleeper's losers bracket the team that keeps 'advancing' is the one that keeps losing; the 'w' of its placement-1 game finishes last.
  // Checked against the Commissioner's Playbook for 2022-2025 (4 of 4 match).
  const lb = (await J(`${d}/losers_bracket.json`).catch(() => null)) || [], tb = s.season !== season ? lb.find((m) => m.p === 1 && m.w) : null;
  if (fin && s.season !== season) (titles[fin.w] ||= []).push(Number(s.season));
  history.push({ season: Number(s.season), champion_roster: s.season !== season && fin ? fin.w : null, runner_up_roster: s.season !== season && fin ? fin.l : null, toilet_bowl_roster: tb ? tb.w : null,
    teams: ro.map((r) => ({ roster_id: r.roster_id, owner_id: r.owner_id, handle: us[r.owner_id]?.display_name || null, wins: r.settings.wins, losses: r.settings.losses,
      pf: r2((r.settings.fpts || 0) + (r.settings.fpts_decimal || 0) / 100) })) });
  for (const [w, ms] of Object.entries(mu)) { if (s.season === season && Number(w) > through) continue; /* a week still being played is not history yet */ const g = {};
    for (const m of ms) if (m.matchup_id) (g[m.matchup_id] ||= []).push(m);
    for (const pair of Object.values(g)) { if (pair.length !== 2 || !pair.some((m) => (m.points || 0) > 0)) continue; const [a, b] = pair;
      for (const [x, y] of [[a, b], [b, a]]) { const e = ((h2h[x.roster_id] ||= {})[y.roster_id] ||= { w: 0, l: 0, t: 0, pf: 0, pa: 0 });
        e.pf = r2(e.pf + x.points); e.pa = r2(e.pa + y.points); x.points > y.points ? e.w++ : x.points < y.points ? e.l++ : e.t++; } } }
}
// ---- current season, per roster ----
const pfOf = (r) => (r.settings.fpts || 0) + (r.settings.fpts_decimal || 0) / 100, paOf = (r) => (r.settings.fpts_against || 0) + (r.settings.fpts_against_decimal || 0) / 100;
// League rule (commissioner, Nov 2026): seeds 1-5 by record, points-for breaks ties; seed 6 is the highest points-for among the other seven.
const byRecord = [...rosters].sort((a, b) => b.settings.wins - a.settings.wins || pfOf(b) - pfOf(a)), ptsOrder = [...rosters].sort((a, b) => pfOf(b) - pfOf(a));
const playoffTeams = league.settings.playoff_teams, top5 = byRecord.slice(0, playoffTeams - 1), rest = byRecord.slice(playoffTeams - 1);
const wild = [...rest].sort((a, b) => pfOf(b) - pfOf(a))[0], chasers = rest.filter((r) => r !== wild), wildNext = [...chasers].sort((a, b) => pfOf(b) - pfOf(a))[0];
const seedOrder = [...top5, wild, ...chasers], fifth = top5[top5.length - 1], bestOut = rest[0];
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const franchises = [];
for (const r of [...rosters].sort((a, b) => a.roster_id - b.roster_id)) {
  const f = cfg[String(r.roster_id)], u = U[r.owner_id];
  if (!f) { problems.push(`roster ${r.roster_id} missing from franchises.json`); continue; }
  if (f.owner_id !== r.owner_id) problems.push(`roster ${r.roster_id}: owner_id is ${r.owner_id} in Sleeper but ${f.owner_id} in franchises.json`);
  if (!u) problems.push(`roster ${r.roster_id}: owner ${r.owner_id} not in league users`);
  const sleeperName = (u?.metadata?.team_name || '').trim();
  const results = [], credit = {};
  for (const w of weeks) { const me = matchups[w].find((m) => m.roster_id === r.roster_id); if (!me) continue;
    const opp = matchups[w].find((m) => m.matchup_id === me.matchup_id && m.roster_id !== r.roster_id);
    results.push({ week: w, opp: opp?.roster_id ?? null, pf: me.points, pa: opp?.points ?? null, result: !opp ? null : me.points > opp.points ? 'W' : me.points < opp.points ? 'L' : 'T' });
    (me.starters || []).forEach((pid, i) => { if (pid === '0') return; const c = (credit[pid] ||= { starts: 0, pts: 0, wk: {}, wins: 0 });
      const v = me.starters_points?.[i] ?? me.players_points?.[pid] ?? 0; c.starts++; c.pts += v; c.wk[w] = v; if (opp && me.points > opp.points) c.wins += v; }); }
  const starterTotal = Object.values(credit).reduce((a, c) => a + c.pts, 0);
  const nicks = r.metadata || {};
  let pool = (r.players || []).filter((pid) => credit[pid] && players[pid]).map((pid) => { const c = credit[pid], p = players[pid], last3 = weeks.slice(-3).filter((w) => w in c.wk);
    const own = cleanNick(nicks['p_nick_' + pid]), blocked = nickCfg.blocked[pid], cr = nickCfg.creative[pid];
    return { player_id: pid, name: p.full_name || `${p.first_name} ${p.last_name}`, first_name: p.first_name, last_name: p.last_name, position: pos(p), nfl_team: p.team || 'FA', number: p.number ?? null,
      starts: c.starts, points: r1(c.pts), ppg: r1(c.pts / c.starts), share: r2(c.pts / starterTotal), last3_ppg: last3.length ? r1(last3.reduce((a, w) => a + c.wk[w], 0) / last3.length) : null,
      nickname: own && !blocked ? own : cr?.nick || null, nickname_source: own && !blocked ? 'owner' : cr ? cr.source : null }; })
    .sort((a, b) => b.points - a.points);
  // selection: points scored while STARTING for THIS franchise; kickers only if one of its top two scorers; at most 10
  const minStarts = Math.max(2, Math.ceil(weeks.length / 3));
  const top2 = new Set(pool.slice(0, 2).map((p) => p.player_id));
  const featured = pool.filter((p) => p.starts >= minStarts && p.share >= 0.04 && (p.position !== 'K' || top2.has(p.player_id))).slice(0, 10);
  const bestIdp = featured.find((p) => IDP.has(p.position)), hot = [...featured].filter((p) => p.last3_ppg != null).sort((a, b) => (b.last3_ppg - b.ppg) - (a.last3_ppg - a.ppg))[0];
  const seenPos = new Set();
  featured.forEach((p, i) => { const why = []; p.rank = RANK[p.player_id] || null; p.season_points = SEASON_PTS[p.player_id] ?? null;
    if (i === 0) why.push("This team's leading scorer");
    if (bestIdp && p.player_id === bestIdp.player_id && i !== 0) why.push("This team's top defender");
    if (hot && p.player_id === hot.player_id && p.last3_ppg - p.ppg >= 2) why.push(`Hot: ${p.last3_ppg} PPG last 3`);
    if (!why.length) why.push(`${Math.round(p.share * 100)}% of starter points`);
    if (p.starts < weeks.length / 2) why.push(`small sample (${p.starts} starts)`);
    seenPos.add(p.position); p.reason = why.join(' · '); });
  const seed = seedOrder.indexOf(r) + 1, prank = ptsOrder.indexOf(r) + 1, w = r.settings.wins, l = r.settings.losses, t = r.settings.ties || 0;
  const rec = results.map((x) => x.result).filter(Boolean); let streakN = 0; for (let i = rec.length - 1; i >= 0 && rec[i] === rec[rec.length - 1]; i--) streakN++;
  const streak = rec.length ? { type: rec[rec.length - 1], length: streakN } : null;
  // storyline: generated only from the numbers above
  const story = [];
  if (l === 0 && w > 0) story.push(`${w}–0 and the only unbeaten team left.`); else if (w === 0 && l > 0) story.push(`Still looking for a first win at 0–${l}.`);
  else story.push(`${w}–${l}${t ? '–' + t : ''}, ${seed <= playoffTeams ? ord(seed) + ' seed' : ord(seed) + ' in the standings'} and ${ord(prank)} in points scored.`);
  if (streak && streak.length >= 3 && !(l === 0) && !(w === 0)) story.push(streak.type === 'W' ? `Winners of ${streak.length} straight.` : `Losers of ${streak.length} straight.`);
  if (prank - seed >= 3) story.push(`The record is running ahead of the scoring.`); else if (seed - prank >= 3 && seed > playoffTeams) story.push(`Scoring like a ${ord(prank)} seed, sitting ${ord(seed)}.`);
  const gamesLeft = league.settings.playoff_week_start - 1 - through;
  const gs = (n) => `${n} game${n === 1 ? '' : 's'}`;
  if (seed < playoffTeams) { const gap = w - bestOut.settings.wins; story.push(gap === 0 ? `Holding a top-five seed on the points tiebreak, ${gamesLeft} to play.` : `${gs(gap)} clear inside the top five with ${gamesLeft} to play.`); }
  else if (seed === playoffTeams) story.push(`Holds the sixth seed as the highest scorer outside the top five, ${r1(pfOf(r) - pfOf(wildNext))} points clear of the next team.`);
  else { const gw = fifth.settings.wins - w, gp = r1(pfOf(wild) - pfOf(r));
    story.push(gw > gamesLeft ? `Only route left is the sixth seed on points: ${gp} behind.` : `${gw === 0 ? 'Level on wins with' : gs(gw) + ' back of'} the top five and ${gp} points behind the sixth-seed race, ${gamesLeft} to play.`); }
  if (featured[0]) story.push(`${featured[0].name} leads the lineup at ${featured[0].ppg} points per start.`);
  const myPicks = [];
  const drafted = new Set([season]);
  for (const yr of [...new Set(traded.map((p) => p.season))].sort()) { if (drafted.has(yr)) continue;
    for (let rd = 1; rd <= 4; rd++) for (const orig of rosters.map((x) => x.roster_id)) { const tp = traded.find((p) => p.season === yr && p.round === rd && p.roster_id === orig);
      if ((tp ? tp.owner_id : orig) === r.roster_id) myPicks.push({ season: Number(yr), round: rd, original_roster: orig }); } }
  franchises.push({ roster_id: r.roster_id, slug: f.slug, owner_id: r.owner_id, sleeper_handle: u?.display_name || null, manager: f.manager,
    team_name: sleeperName || f.fallback_name, team_name_source: sleeperName ? 'sleeper' : 'fallback (owner has set no team name)', former_names: f.former_names || [], former_managers: f.former_managers || [],
    sleeper_team_avatar: u?.metadata?.avatar || null, sleeper_user_avatar: u?.avatar ? `https://sleepercdn.com/avatars/${u.avatar}` : null,
    theme: f.theme, tagline: f.tagline, wins: w, losses: l, ties: t, record: `${w}–${l}${t ? '–' + t : ''}`, pf: r2(pfOf(r)), pa: r2(paOf(r)), seed, points_rank: prank,
    in_playoff_position: seed <= playoffTeams, streak, results, titles: (titles[r.roster_id] || []).filter((y) => history.find((h) => h.season === y).teams.find((x) => x.roster_id === r.roster_id).owner_id === r.owner_id).sort(),
    storyline: story.filter(Boolean), featured, roster_size: (r.players || []).length, future_picks: myPicks,
    h2h: Object.fromEntries(Object.entries(h2h[r.roster_id] || {}).map(([k, v]) => [k, v])),
    seasons: history.map((h) => { const x = h.teams.find((q) => q.roster_id === r.roster_id); return { season: h.season, wins: x.wins, losses: x.losses, pf: x.pf, champion: h.champion_roster === r.roster_id, runner_up: h.runner_up_roster === r.roster_id, toilet_bowl: h.toilet_bowl_roster === r.roster_id, same_owner: x.owner_id === r.owner_id, handle: x.handle }; }) });
}
const punishments = await J('src/config/punishments.json').then((x) => Object.fromEntries(Object.entries(x).filter(([k]) => /^\d{4}$/.test(k)))).catch(() => ({}));
const slugs = franchises.map((f) => f.slug); if (new Set(slugs).size !== slugs.length) problems.push('duplicate slugs');
const trades = []; for (const [w, list] of Object.entries(tx)) for (const t of list) if (t.type === 'trade' && t.status === 'complete')
  trades.push({ week: Number(w), rosters: t.roster_ids, players: Object.entries(t.adds || {}).map(([pid, to]) => ({ player_id: pid, name: players[pid]?.full_name || pid, position: players[pid]?.position || null, nfl_team: players[pid]?.team || null, to_roster: to, from_roster: t.drops?.[pid] ?? null })), picks: (t.draft_picks || []).map((p) => ({ season: p.season, round: p.round, original_roster: p.roster_id, to_roster: p.owner_id, from_roster: p.previous_owner_id ?? null })) });
// Trades from finished seasons (fetched once per season). Absent until the first refresh after this was added.
const mk = (w, t, se) => ({ season: Number(se), week: Number(w), rosters: t.roster_ids, players: Object.entries(t.adds || {}).map(([pid, to]) => ({ player_id: pid, name: players[pid]?.full_name || `Player ${pid}`, position: players[pid]?.position || null, nfl_team: players[pid]?.team || null, to_roster: to, from_roster: t.drops?.[pid] ?? null })), picks: (t.draft_picks || []).map((p) => ({ season: p.season, round: p.round, original_roster: p.roster_id, to_roster: p.owner_id, from_roster: p.previous_owner_id ?? null })) });
const pastTrades = []; for (const s of idx.seasons) { if (String(s.season) === season) continue; const px = await J(`${D}/seasons/${s.season}/transactions.json`).catch(() => null); if (!px) continue;
  for (const [w, list] of Object.entries(px)) for (const t of list) if (t.type === 'trade' && t.status === 'complete') pastTrades.push(mk(w, t, s.season)); }
pastTrades.sort((a, b) => a.season - b.season || a.week - b.week);
const tradeSeasons = idx.seasons.map((s) => Number(s.season)).filter((se) => String(se) === season || pastTrades.some((t) => t.season === se)).sort();
if (problems.length) { console.error('IDENTITY RECONCILIATION FAILED:\n - ' + problems.join('\n - ')); process.exit(1); }
const out = { generated_at: new Date().toISOString(), source: 'Sleeper public API', league_id: league.league_id, league_name: league.name, season: Number(season), through_week: through, current_week: Math.min(liveWeek, 18), week_in_progress: liveWeek <= 18 && (matchups[liveWeek] || []).some((m) => (m.points || 0) > 0),
  playoff_teams: playoffTeams, playoff_rule: 'Seeds 1–5 go to the best records, with points for as the tiebreaker. Seed 6 goes to the highest-scoring team among the other seven.', playoff_week_start: league.settings.playoff_week_start, roster_positions: league.roster_positions.filter((p) => p !== 'BN'), scoring: { rec: league.scoring_settings.rec, pass_td: league.scoring_settings.pass_td, idp: true },
  standings: seedOrder.map((r) => r.roster_id), franchises, history: history.map(({ teams, ...h }) => h), trades: trades.sort((a, b) => a.week - b.week).map((t) => ({ season: Number(season), ...t })), past_trades: pastTrades, player_ranks: RANK, rank_basis: { ...RANKS.basis, through_week: RANKS.through_week }, punishments, trade_seasons: tradeSeasons };
// keep the previous timestamp when nothing but the clock changed, so scheduled runs do not create empty commits
try { const prev = JSON.parse(await readFile('site/data/canonical.json', 'utf8')); const strip = (o) => JSON.stringify({ ...o, generated_at: 0 }); if (strip(prev) === strip(out)) out.generated_at = prev.generated_at; } catch {}
await writeFile('site/data/canonical.json', JSON.stringify(out));
console.log(`canonical.json: ${franchises.length} franchises reconciled, season ${season} through week ${through}`);
