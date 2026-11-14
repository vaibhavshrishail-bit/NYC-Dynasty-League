// Playoff and draft-position maths, shared by the homepage, Stakes Center and franchise pages.
// Two kinds of answer, kept separate on purpose:
//   exact()    - arithmetic that is certain whatever the scores are (who has clinched a top-five seed, who cannot reach one)
//   simulate() - probabilities from thousands of simulated finishes (anything that depends on points, including the sixth seed)
// League rules live here: seeds 1-5 by record (points for breaks ties), seed 6 = most points for among the rest, bracket reseeded each round (Commissioner's Playbook 2026-27).
function rng32(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedTeams(rows, nPlayoff) { // rows: [{id,w,pf}] -> ids in seed order 1..12
  const rec = [...rows].sort((a, b) => b.w - a.w || b.pf - a.pf), top = rec.slice(0, nPlayoff - 1), rest = rec.slice(nPlayoff - 1);
  const wild = [...rest].sort((a, b) => b.pf - a.pf)[0]; return [...top, wild, ...rest.filter((r) => r !== wild)].map((r) => r.id);
}
// Early in a season a team's own scoring is too thin to trust, so it is blended with a preseason expectation (t.prior = { mu, w }).
// w is 1 before Week 1 and falls to 0 after six games (priorWeight), so from Week 6 on the model is this season's results only.
function priorWeight(games) { return Math.max(0, (6 - games) / 6); }
function modelOf(L) { const m = {}; for (const [id, t] of Object.entries(L.teams)) { const obs = 0.7 * t.ppg + 0.3 * t.last3, w = t.prior ? t.prior.w : 0;
  m[id] = { mu: w >= 1 || !isFinite(obs) ? t.prior.mu : w > 0 ? (1 - w) * obs + w * t.prior.mu : obs, sd: Math.max(18, 0.5 * (isFinite(t.sd) && t.sd > 0 ? t.sd : L.league_sd) + 0.5 * L.league_sd), u: 8 * w }; } return m; } // u: how unsure the model is about the team's true level (points per game) while the preseason expectation still carries weight
// seed: pass the same number to two calls to compare them on the same simulated seasons (the difference between them is then far less noisy).
function simulate(C, L, forced = {}, n = 8000, seed = null) {
  const R = rng32(seed ?? (20260 + Object.keys(forced).length * 7919 + Object.values(forced).reduce((a, b) => a + b, 0))), M = modelOf(L), ids = C.franchises.map((f) => f.roster_id), NP = C.playoff_teams;
  const norm = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }, off = {}, draw = (id) => M[id].mu + off[id] + M[id].sd * norm();
  const base = Object.fromEntries(C.franchises.map((f) => [f.roster_id, { w: f.wins, pf: f.pf }])), games = Object.entries(L.schedule).flatMap(([w, prs]) => prs.map(([a, b]) => ({ w, a, b, key: `${w}:${a}-${b}` })));
  const out = Object.fromEntries(ids.map((id) => [id, { playoff: 0, top5: 0, sixth: 0, bye: 0, champ: 0, seed: Array(12).fill(0), slot: Array(6).fill(0), wins: 0 }]));
  const play = (a, b) => (draw(a) > draw(b) ? a : b);
  for (let i = 0; i < n; i++) {
    const st = {}; for (const id of ids) { st[id] = { id, w: base[id].w, pf: base[id].pf }; off[id] = M[id].u ? M[id].u * norm() : 0; }
    for (const g of games) { let sa = draw(g.a), sb = draw(g.b); const f = forced[g.key]; if (f && ((f === g.a) !== (sa > sb))) [sa, sb] = [sb, sa]; st[g.a].pf += sa; st[g.b].pf += sb; (sa > sb ? st[g.a] : st[g.b]).w++; }
    const s = seedTeams(Object.values(st), NP);
    s.forEach((id, k) => { const o = out[id]; o.seed[k]++; o.wins += st[id].w; if (k < NP) o.playoff++; if (k < NP - 1) o.top5++; if (k === NP - 1) o.sixth++; if (k < 2) o.bye++; if (k >= NP) o.slot[11 - k]++; });
    const w45 = play(s[3], s[4]), w36 = play(s[2], s[5]), lo = w36 === s[5] ? w36 : w45, hi = w36 === s[5] ? w45 : w36; /* reseeded: seed 1 meets the lowest seed left */ const f1 = play(s[0], lo), f2 = play(s[1], hi); out[play(f1, f2)].champ++;
  }
  for (const id of ids) { const o = out[id]; for (const k of ['playoff', 'top5', 'sixth', 'bye', 'champ']) o[k] /= n; o.seed = o.seed.map((x) => x / n); o.slot = o.slot.map((x) => x / n); o.wins /= n; o.miss = 1 - o.playoff; }
  return out;
}
function exact(C, L, extraWins = {}) { // certain facts about the top-five seeds only; the sixth seed is points-based and never certain before the last week
  const left = Object.fromEntries(C.franchises.map((f) => [f.roster_id, 0])); for (const prs of Object.values(L.schedule)) for (const [a, b] of prs) { left[a]++; left[b]++; }
  const w = Object.fromEntries(C.franchises.map((f) => [f.roster_id, f.wins + (extraWins[f.roster_id] || 0)])), res = {};
  for (const f of C.franchises) { const id = f.roster_id, mine = w[id], max = mine + left[id];
    const canCatch = C.franchises.filter((o) => o.roster_id !== id && w[o.roster_id] + left[o.roster_id] >= mine).length, ahead = C.franchises.filter((o) => o.roster_id !== id && w[o.roster_id] > max).length;
    res[id] = { clinched_top5: canCatch <= C.playoff_teams - 2, out_of_top5: ahead >= C.playoff_teams - 1, max_wins: max, games_left: left[id] }; }
  return res;
}
function thisWeek(C, L) { // every win/loss combination of the coming week: who would clinch or drop out of the top-five race
  const wk = String(L.current_week), prs = L.schedule[wk] || [], now = exact(C, L), found = {};
  const L2 = { ...L, schedule: Object.fromEntries(Object.entries(L.schedule).filter(([w]) => w !== wk)) };
  for (let mask = 0; mask < 1 << prs.length; mask++) { const win = {}; prs.forEach(([a, b], i) => { win[mask >> i & 1 ? a : b] = 1; }); const ex = exact(C, L2, win);
    for (const f of C.franchises) { const id = f.roster_id, r = (found[id] ||= { clinchWin: 0, clinchLose: 0, outWin: 0, outLose: 0, nWin: 0, nLose: 0 }), won = !!win[id]; won ? r.nWin++ : r.nLose++;
      if (ex[id].clinched_top5 && !now[id].clinched_top5) won ? r.clinchWin++ : r.clinchLose++; if (ex[id].out_of_top5 && !now[id].out_of_top5) won ? r.outWin++ : r.outLose++; } }
  return { now, found };
}
function topFiveNote(tw, id) { const r = tw.found[id], n = tw.now[id], o = [];
  if (n.clinched_top5) return 'Has clinched a top-five seed.'; if (n.out_of_top5) return 'Cannot finish in the top five; the only route is the sixth seed on points.';
  if (r.nWin && r.clinchWin === r.nWin) o.push('Clinches a top-five seed with a win.'); else if (r.clinchWin) o.push('Can clinch a top-five seed with a win and help.');
  if (r.clinchLose) o.push(r.clinchLose === r.nLose ? 'Clinches a top-five seed even with a loss.' : 'Could clinch a top-five seed even with a loss, with help.');
  if (r.nLose && r.outLose === r.nLose) o.push('A loss ends its top-five chances.'); else if (r.outLose) o.push('A loss could end its top-five chances, depending on other results.');
  if (r.outWin) o.push('Could fall out of top-five reach even with a win.'); return o.join(' '); }
function winChance(L, a, b) { const M = modelOf(L), z = (M[a].mu - M[b].mu) / Math.sqrt(M[a].sd ** 2 + M[b].sd ** 2 + M[a].u ** 2 + M[b].u ** 2), t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
  const p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z >= 0 ? p : 1 - p; }

// ---- Certainty: what is PROVEN, as opposed to simulated. Returns { [roster_id]: { playoff, top5 } } with 'certain', 'impossible' or null. ----
// Proven in: a top-five seed is clinched by arithmetic (exact()). Proven in or out: the regular season is complete, so the six are known.
// Never proven out earlier, because the sixth seed goes to the highest scorer and points are unbounded until the last regular-season week ends.
function certainty(C, L) {
  const out = {}, done = !Object.keys(L.schedule || {}).length || C.through_week >= L.regular_season_end, ex = done ? null : exact(C, L);
  C.standings.forEach((id, i) => { out[id] = done ? { playoff: i < C.playoff_teams ? 'certain' : 'impossible', top5: i < C.playoff_teams - 1 ? 'certain' : 'impossible', final: true }
    : { playoff: ex[id].clinched_top5 ? 'certain' : null, top5: ex[id].clinched_top5 ? 'certain' : null, final: false }; });
  return out;
}
