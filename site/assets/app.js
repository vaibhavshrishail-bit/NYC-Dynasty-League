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
const NAV = [['./', 'League Pulse'], ['week.html', 'This Week'], ['universe.html', 'The Race'], ['playoffs.html', 'Chaos Machine'], ['rivalry.html', 'Rivalries'], ['./#franchises', 'Franchises'], ['archives.html', 'Archives'], ['documentary/', 'Films']];
function nav(active, base = '') { return `<nav class="nav" aria-label="Site"><a class="brand" href="${base}./">NYC Dynasty</a><div>${NAV.map(([h, t]) => `<a href="${base}${h}"${t === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</div></nav>`; }
const pct = (x) => (x >= 0.995 ? '>99%' : x > 0 && x < 0.005 ? '<1%' : Math.round(x * 100) + '%');
const typeLabel = { regular: 'Regular season', playoff: 'Playoffs', championship: 'Championship', placement: 'Placement game', toilet: 'Toilet Bowl bracket', consolation: 'Consolation' };
async function loadAll(base = '') { const [c, l] = await Promise.all([loadLeague(base), fetch(base + 'data/league.json', { cache: 'no-cache' }).then((r) => r.json())]); return [c, l]; }
// ---- jerseys: generic shape in NFL team colours (same table as src/engine/core.js; keep the two in step). No logos or uniform artwork. ----
const NFLC = { ARI: ['#97233F', '#101010', '#fff'], ATL: ['#16181c', '#A71930', '#fff'], BAL: ['#241773', '#9E7C0C', '#fff'], BUF: ['#00338D', '#C60C30', '#fff'], CAR: ['#0085CA', '#101820', '#fff'], CHI: ['#0B162A', '#C83803', '#fff'], CIN: ['#15171a', '#FB4F14', '#FB4F14'], CLE: ['#311D00', '#FF3C00', '#fff'],
  DAL: ['#041E42', '#869397', '#fff'], DEN: ['#FB4F14', '#002244', '#fff'], DET: ['#0076B6', '#B0B7BC', '#fff'], GB: ['#203731', '#FFB612', '#fff'], HOU: ['#03202F', '#A71930', '#fff'], IND: ['#002C5F', '#A2AAAD', '#fff'], JAX: ['#006778', '#D7A22A', '#fff'], KC: ['#E31837', '#FFB81C', '#fff'],
  LV: ['#141414', '#A5ACAF', '#C8CDD0'], LAC: ['#0080C6', '#FFC20E', '#fff'], LAR: ['#003594', '#FFD100', '#FFD100'], MIA: ['#008E97', '#FC4C02', '#fff'], MIN: ['#4F2683', '#FFC62F', '#fff'], NE: ['#002244', '#C60C30', '#fff'], NO: ['#16181c', '#D3BC8D', '#D3BC8D'], NYG: ['#0B2265', '#A71930', '#fff'],
  NYJ: ['#125740', '#e9eeea', '#fff'], PHI: ['#004C54', '#A5ACAF', '#fff'], PIT: ['#16181c', '#FFB612', '#fff'], SF: ['#AA0000', '#B3995D', '#fff'], SEA: ['#002244', '#69BE28', '#fff'], TB: ['#D50A0A', '#34302B', '#fff'], TEN: ['#0C2340', '#4B92DB', '#fff'], WAS: ['#5A1414', '#FFB612', '#fff'], FA: ['#2a2d34', '#8d909b', '#fff'] };
const JPATH = 'M-150 -262 Q0 -222 150 -262 L252 -230 L374 -90 L288 -14 L228 -80 L228 292 Q0 320 -228 292 L-228 -80 L-288 -14 L-374 -90 L-252 -230 Z';
function jerseySVG(pl) { const [c1, c2, c3] = NFLC[pl.nfl_team] || NFLC.FA, nm = (pl.last_name || '').toUpperCase().replace(/ (JR\.|SR\.|II|III|IV)$/, ''), num = pl.number == null ? '' : String(pl.number), id = 'j' + _eid++;
  return `<svg viewBox="-390 -280 780 620" role="img" aria-label="${esc(pl.name)}, ${esc(pl.nfl_team)} jersey"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="${id}c"><path d="${JPATH}"/></clipPath></defs>
<path d="${JPATH}" fill="${c1}"/><g clip-path="url(#${id}c)"><rect x="-390" y="-280" width="780" height="620" fill="url(#${id})"/><path d="M340 -128L374 -90 288 -14 256 -50ZM-340 -128L-374 -90 -288 -14 -256 -50Z" fill="${c2}"/><rect x="-228" y="262" width="456" height="10" fill="${c2}"/></g>
<path d="M-150 -262Q0 -222 150 -262" fill="none" stroke="${c2}" stroke-width="9" stroke-linecap="round"/><path d="${JPATH}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
<text x="0" y="-128" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-weight="600" font-size="58" letter-spacing="5" fill="${c3}" stroke="#000" stroke-opacity=".5" stroke-width="5" paint-order="stroke" ${nm.length > 9 ? 'textLength="340" lengthAdjust="spacingAndGlyphs"' : ''}>${esc(nm)}</text>
<text x="0" y="196" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="${num.length > 1 ? 330 : 350}" fill="${c3}" stroke="${c2 === c3 ? '#000' : c2}" stroke-width="14" paint-order="stroke">${esc(num)}</text></svg>`; }
function jerseyCanvas(x, pl, cx, cy, sc) { const [c1, c2, c3] = NFLC[pl.nfl_team] || NFLC.FA, P = new Path2D(JPATH), nm = (pl.last_name || '').toUpperCase().replace(/ (JR\.|SR\.|II|III|IV)$/, ''), num = pl.number == null ? '' : String(pl.number);
  x.save(); x.translate(cx, cy); x.scale(sc, sc); x.fillStyle = c1; x.fill(P); x.save(); x.clip(P); const g = x.createLinearGradient(0, -270, 0, 310); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = g; x.fillRect(-400, -280, 800, 620);
  x.fillStyle = c2; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 340, -128); x.lineTo(s * 374, -90); x.lineTo(s * 288, -14); x.lineTo(s * 256, -50); x.fill(); } x.fillRect(-228, 262, 456, 10); x.restore();
  x.strokeStyle = c2; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(-150, -262); x.quadraticCurveTo(0, -222, 150, -262); x.stroke(); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.35)'; x.stroke(P);
  x.textAlign = 'center'; x.fillStyle = c3; x.lineJoin = 'round'; x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 5; let z = 58; x.font = `600 ${z}px 'Barlow Condensed'`; while (x.measureText(nm).width > 340 && z > 24) { z -= 2; x.font = `600 ${z}px 'Barlow Condensed'`; } x.strokeText(nm, 0, -128); x.fillText(nm, 0, -128);
  if (num) { x.font = `400 ${num.length > 1 ? 330 : 350}px 'Bebas Neue'`; x.lineWidth = 14; x.strokeStyle = c2 === c3 ? '#000' : c2; x.strokeText(num, 0, 196); x.fillText(num, 0, 196); } x.restore(); }
function crestCanvas(x, th, cx, cy, r) { x.save(); x.translate(cx - r, cy - r); x.scale(r / 100, r / 100); x.strokeStyle = th.hi; x.lineWidth = 3; x.beginPath(); x.arc(100, 100, 92, 0, 7); x.stroke(); const gr = x.createLinearGradient(0, 40, 0, 160); [0, .28, .5, .62, 1].forEach((o, i) => gr.addColorStop(o, th.metal[i]));
  for (const p of th.glyph) { x.fillStyle = p.f === 'ink' ? th.ink : p.f === 'hot' ? th.hot : gr; x.fill(new Path2D(p.d), p.eo ? 'evenodd' : 'nonzero'); } x.restore(); }
async function loadLive(base = '') { const [c, l] = await loadAll(base), [w, h] = await Promise.all([fetch(base + 'data/weekly.json', { cache: 'no-cache' }).then((r) => r.json()), fetch(base + 'data/history.json', { cache: 'no-cache' }).then((r) => r.json())]); return [c, l, w, h]; }
const savePng = (cv, name) => { const l = document.createElement('a'); l.download = name; l.href = cv.toDataURL('image/png'); l.click(); };
