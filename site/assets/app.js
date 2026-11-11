// Shared by the Hub and franchise pages. Everything shown comes from data/canonical.json (built from Sleeper).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
async function loadLeague(base = '') {
  const [c, t] = await Promise.all([fetch(base + 'data/canonical.json', { cache: 'no-cache' }).then((r) => r.json()), fetch(base + 'data/themes.json').then((r) => r.json())]);
  c.byRoster = Object.fromEntries(c.franchises.map((f) => [f.roster_id, f])); c.themes = t; return c;
}
function themeVars(el, th) { el.style.setProperty('--c', th.hi); el.style.setProperty('--g', th.flash); }
let _eid = 0;
function emblem(th) { // the same crest the cinematic draws: ring, laurel, theme glyph
  const id = 'm' + _eid++, st = [0, .28, .5, .62, 1].map((o, i) => `<stop offset="${o}" stop-color="${th.metal[i]}"/>`).join('');
  let leaves = ''; for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + s * (.32 + i * .2), x = 100 + Math.cos(a) * 75.5, y = 100 + Math.sin(a) * 75.5;
    leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="2.4" transform="rotate(${((a + s * 1.05) * 180 / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${th.mid}"/>`; }
  const g = th.glyph.map((p) => `<path d="${p.d}" fill="${p.f === 'ink' ? th.ink : p.f === 'hot' ? th.hot : `url(#${id})`}"${p.eo ? ' fill-rule="evenodd"' : ''}/>`).join('');
  return `<svg viewBox="0 0 200 200" role="img" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="40" x2="0" y2="160" gradientUnits="userSpaceOnUse">${st}</linearGradient></defs>
<circle cx="100" cy="100" r="92" fill="none" stroke="${th.hi}" stroke-width="3"/><circle cx="100" cy="100" r="83" fill="none" stroke="${th.hi}" stroke-width="1" opacity=".7"/>${leaves}${g}</svg>`;
}
const fontOf = (th) => `font-family:'${th.font}',serif;font-weight:${th.weight};${th.font === 'Orbitron' ? 'letter-spacing:.02em;font-size:.82em;' : th.font === 'Bebas Neue' ? 'letter-spacing:.04em;font-size:1.18em;' : 'letter-spacing:.03em;'}`;
const stamp = (c) => `Sleeper data through Week ${c.through_week} of ${c.season}. Data last changed ${new Date(c.generated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`;
const stars = (f) => f.titles.length ? ` <span class="stars" title="Champion ${f.titles.join(', ')}" aria-label="${f.titles.length} championship${f.titles.length > 1 ? 's' : ''}">${'★'.repeat(f.titles.length)}</span>` : '';
const NAV = [['./', 'League Pulse'], ['./#franchises', 'Franchises'], ['playoffs.html', 'Playoffs & Draft'], ['rivalry.html', 'Rivalries'], ['week.html', 'Weekly'], ['archives.html', 'Archives'], ['documentary/', 'Films']];
function nav(active, base = '') { return `<nav class="nav" aria-label="Site"><a class="brand" href="${base}./">NYC Dynasty</a><div>${NAV.map(([h, t]) => `<a href="${base}${h}"${t === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</div></nav>`; }
const pct = (x) => (x >= 0.995 ? '>99%' : x > 0 && x < 0.005 ? '<1%' : Math.round(x * 100) + '%');
const typeLabel = { regular: 'Regular season', playoff: 'Playoffs', championship: 'Championship', placement: 'Placement game', toilet: 'Toilet Bowl bracket', consolation: 'Consolation' };
async function loadAll(base = '') { const [c, l] = await Promise.all([loadLeague(base), fetch(base + 'data/league.json', { cache: 'no-cache' }).then((r) => r.json())]); return [c, l]; }
