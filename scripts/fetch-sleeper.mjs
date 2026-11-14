// Pulls NYC Dynasty League data from Sleeper's public read-only API into static JSON.
// Runs in GitHub Actions (Node 20+, no dependencies). Read-only: never writes to Sleeper.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID || '1312585067658223616';
const OUT = process.env.OUT_DIR || 'site/data/sleeper';
const API = 'https://api.sleeper.app/v1';
const get = async (p) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(API + p);
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error('Sleeper request failed: ' + p);
};
const save = async (name, data) => {
  await mkdir(OUT + '/' + name.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(`${OUT}/${name}.json`, JSON.stringify(data));
};
const state = await get('/state/nfl');
await save('state', state);
const seasons = [];
const rostered = new Set();
let id = LEAGUE_ID, current = true;
while (id && id !== '0') {
  const league = await get('/league/' + id);
  if (!league) break;
  const s = league.season, dir = 'seasons/' + s;
  const [users, rosters, winners, losers, traded, drafts] = await Promise.all([
    get(`/league/${id}/users`), get(`/league/${id}/rosters`),
    get(`/league/${id}/winners_bracket`), get(`/league/${id}/losers_bracket`),
    get(`/league/${id}/traded_picks`), get(`/league/${id}/drafts`),
  ]);
  const lastWeek = current && String(state.season) === String(s) && state.season_type === 'regular'
    ? Math.max(1, state.week) : 18;
  const matchups = {}, transactions = {};
  // current season: fetch every week through 17 so the remaining schedule (pairings with 0 points) is available to the site
  for (let w = 1; w <= (current ? 17 : lastWeek); w++) {
    const m = await get(`/league/${id}/matchups/${w}`);
    if (m && m.length) matchups[w] = m;
    if (current && w <= lastWeek) { const t = await get(`/league/${id}/transactions/${w}`); if (t && t.length) transactions[w] = t; }
  }
  const picks = {};
  for (const d of drafts || []) picks[d.draft_id] = await get(`/draft/${d.draft_id}/picks`);
  await save(dir + '/league', league); await save(dir + '/users', users); await save(dir + '/rosters', rosters);
  await save(dir + '/winners_bracket', winners); await save(dir + '/losers_bracket', losers);
  await save(dir + '/traded_picks', traded); await save(dir + '/drafts', drafts);
  await save(dir + '/draft_picks', picks); await save(dir + '/matchups', matchups);
  if (current) await save(dir + '/transactions', transactions);
  else { // finished seasons: trades only, fetched once (they never change) so the timeline and the trade ledger can show every season
    const f = `${OUT}/${dir}/transactions.json`; let old = null; try { old = JSON.parse(await (await import('node:fs/promises')).readFile(f, 'utf8')); } catch {}
    if (!old) { const tr = {}; for (let w = 1; w <= 18; w++) { const t = await get(`/league/${id}/transactions/${w}`); const only = (t || []).filter((x) => x.type === 'trade' && x.status === 'complete'); if (only.length) tr[w] = only; } await save(dir + '/transactions', tr); old = tr; }
    for (const list of Object.values(old)) for (const t of list) for (const pid of Object.keys(t.adds || {})) rostered.add(pid); }
  for (const r of rosters || []) for (const p of r.players || []) rostered.add(p);
  for (const w of Object.values(matchups)) for (const m of w) for (const p of m.players || []) rostered.add(p);
  for (const dp of Object.values(picks)) for (const p of dp || []) rostered.add(p.player_id);
  seasons.push({ season: s, league_id: id, name: league.name, status: league.status });
  id = league.previous_league_id; current = false;
}
// NFL schedule (for bye weeks). Unofficial endpoint: optional, never fails the run; the last good copy stays in the repo.
for (const host of ['https://api.sleeper.app', 'https://api.sleeper.com']) {
  try { const r = await fetch(`${host}/schedule/nfl/regular/${state.season}`); if (!r.ok) continue; const g = await r.json();
    if (Array.isArray(g) && g.length > 100) { await save('nfl_schedule', g); console.log('NFL schedule saved', g.length); break; } } catch {}
}
// Kickoff times for this week and next (ESPN's public scoreboard feed). Optional: if it is unreachable or its shape changes,
// nothing is written and the site falls back to showing game days without times. Times are stored in UTC; pages show Eastern Time.
try {
  const fix = { WSH: 'WAS', LA: 'LAR', JAC: 'JAX' }, prevK = await readFile(`${OUT}/nfl_kickoffs.json`, 'utf8').then(JSON.parse).catch(() => ({})), outK = { ...prevK };
  for (const w of [state.week, state.week + 1]) { if (state.season_type !== 'regular' || w > 18) continue;
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${w}&dates=${state.season}`); if (!r.ok) continue; const j = await r.json();
    const gs = (j.events || []).map((e) => { const cp = e.competitions?.[0], t = (ha) => { const x = cp?.competitors?.find((q) => q.homeAway === ha)?.team?.abbreviation; return x ? (fix[x] || x) : null; }, when = new Date(e.date);
      return t('home') && t('away') && !isNaN(when) ? { home: t('home'), away: t('away'), kickoff: when.toISOString(), state: cp?.status?.type?.state || null } : null; }).filter(Boolean);
    if (gs.length >= 8) outK[w] = gs; }
  if (Object.keys(outK).length) { await save('nfl_kickoffs', outK); console.log('Kickoff times saved for weeks', Object.keys(outK).join(', ')); }
} catch (e) { console.log('Kickoff times not available:', e.message); }
// Weekly player projections (unofficial endpoint, optional). Raw stat lines; the site applies this league's own scoring to them.
// One file per week, refreshed only while that week is current, so earlier weeks keep what was known at the time.
if (state.season_type === 'regular') for (const host of ['https://api.sleeper.app', 'https://api.sleeper.com']) {
  try { const q = ['QB', 'RB', 'WR', 'TE', 'K', 'DL', 'LB', 'DB'].map((p) => 'position[]=' + p).join('&');
    const r = await fetch(`${host}/projections/nfl/${state.season}/${state.week}?season_type=regular&${q}`); if (!r.ok) continue; const g = await r.json();
    if (Array.isArray(g) && g.length > 200) { const o = {}; for (const x of g) if (rostered.has(String(x.player_id)) && x.stats) o[x.player_id] = { stats: x.stats, team: x.team, opponent: x.opponent, game_id: x.game_id };
      await save(`projections/${state.week}`, o); console.log('projections saved', Object.keys(o).length); break; } } catch {}
}
// Full player file is large; keep only players this league has touched, and only display fields.
const all = await get('/players/nfl');
const keep = ['player_id','full_name','first_name','last_name','position','fantasy_positions','team','number','age','years_exp','college','height','weight','status','injury_status','depth_chart_position','depth_chart_order'];
const players = {};
for (const pid of rostered) { const p = all[pid]; if (p) players[pid] = Object.fromEntries(keep.map((k) => [k, p[k] ?? null])); }
await save('players', players);
await save('index', { league_id: LEAGUE_ID, seasons, nfl_state: state, players: Object.keys(players).length });
console.log(`Saved ${seasons.length} seasons, ${Object.keys(players).length} players`);
