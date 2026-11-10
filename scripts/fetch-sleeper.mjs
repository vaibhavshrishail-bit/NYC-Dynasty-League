// Pulls NYC Dynasty League data from Sleeper's public read-only API into static JSON.
// Runs in GitHub Actions (Node 20+, no dependencies). Read-only: never writes to Sleeper.
import { mkdir, writeFile } from 'node:fs/promises';
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
  for (let w = 1; w <= lastWeek; w++) {
    const m = await get(`/league/${id}/matchups/${w}`);
    if (m && m.length) matchups[w] = m;
    if (current) { const t = await get(`/league/${id}/transactions/${w}`); if (t && t.length) transactions[w] = t; }
  }
  const picks = {};
  for (const d of drafts || []) picks[d.draft_id] = await get(`/draft/${d.draft_id}/picks`);
  await save(dir + '/league', league); await save(dir + '/users', users); await save(dir + '/rosters', rosters);
  await save(dir + '/winners_bracket', winners); await save(dir + '/losers_bracket', losers);
  await save(dir + '/traded_picks', traded); await save(dir + '/drafts', drafts);
  await save(dir + '/draft_picks', picks); await save(dir + '/matchups', matchups);
  if (current) await save(dir + '/transactions', transactions);
  for (const r of rosters || []) for (const p of r.players || []) rostered.add(p);
  for (const w of Object.values(matchups)) for (const m of w) for (const p of m.players || []) rostered.add(p);
  for (const dp of Object.values(picks)) for (const p of dp || []) rostered.add(p.player_id);
  seasons.push({ season: s, league_id: id, name: league.name, status: league.status });
  id = league.previous_league_id; current = false;
}
// Full player file is large; keep only players this league has touched, and only display fields.
const all = await get('/players/nfl');
const keep = ['player_id','full_name','first_name','last_name','position','fantasy_positions','team','number','age','years_exp','college','height','weight','status','injury_status','depth_chart_position','depth_chart_order'];
const players = {};
for (const pid of rostered) { const p = all[pid]; if (p) players[pid] = Object.fromEntries(keep.map((k) => [k, p[k] ?? null])); }
await save('players', players);
await save('index', { league_id: LEAGUE_ID, seasons, nfl_state: state, players: Object.keys(players).length });
console.log(`Saved ${seasons.length} seasons, ${Object.keys(players).length} players`);
