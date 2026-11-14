// Matchup visuals shared by the weekly preview: the kickoff-window timeline and the shareable poster.
// Everything here is drawn from weekly.json; nothing is invented. Colours for canvas are literal because canvas cannot read CSS variables.

// Cumulative score through each kickoff window. A finished window uses what was actually scored; the rest use projections.
function swingSeries(g) {
  const W = g.timeline ? g.timeline.windows : [], live = !!g.live; let a = 0, b = 0;
  const pts = W.map((w) => { const act = live && w.state === 'final', da = act ? w.a.actual : w.a.projected, db = act ? w.b.actual : w.b.projected; a += da; b += db; return { w, da, db, a, b, actual: act }; });
  let lead = 0; pts.forEach((p) => { const s = Math.sign(p.a - p.b); p.change = !!(lead && s && s !== lead); if (s) lead = s; });
  const swing = pts.reduce((m, p, i) => (Math.abs(p.da - p.db) > Math.abs(pts[m].da - pts[m].db) ? i : m), 0);
  return { pts, swing, totalA: a, totalB: b };
}

function timelineHTML(g, sel, A, B, width) {
  const T = g.timeline; if (!T || !T.windows.length) return '<p class="note">No kickoff windows to show for this matchup.</p>';
  const S = swingSeries(g), n = S.pts.length, i0 = sel == null ? S.swing : sel, W = Math.max(240, Math.min(width || 640, 900)), H = W < 480 ? 250 : 270, x0 = 40, x1 = W - 12, y0 = 22, y1 = H - 58, tiny = (x1 - x0) / n < 84, TINY = { 'THU NIGHT': 'THU', 'SUN EARLY': 'EARLY', 'SUN 1:00': '1PM', 'SUN LATE': 'LATE', 'SUN NIGHT': 'SNF', 'MON NIGHT': 'MNF' }, lab = (w) => (tiny ? TINY[w.short] || w.short.split(' ')[0] : w.short), max = Math.max(S.totalA, S.totalB, 1) * 1.08;
  const X = (i) => x0 + (i + 1) / n * (x1 - x0), Y = (v) => y1 - v / max * (y1 - y0), f2 = (v) => v.toFixed(2);
  const path = (k) => { let d = `M${x0} ${Y(0)}`, prev = 0; S.pts.forEach((p, i) => { d += `L${X(i) - (x1 - x0) / n * .5} ${Y(prev)}L${X(i) - (x1 - x0) / n * .5} ${Y(p[k])}L${X(i)} ${Y(p[k])}`; prev = p[k]; }); return d; };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative points by kickoff window: ${esc(A.manager)} ${f2(S.totalA)}, ${esc(B.manager)} ${f2(S.totalB)}">`;
  for (const v of [0, .5, 1]) s += `<line x1="${x0}" x2="${x1}" y1="${Y(max / 1.08 * v)}" y2="${Y(max / 1.08 * v)}" stroke="#2a3b55"/><text x="${x0 - 6}" y="${Y(max / 1.08 * v) + 5}" text-anchor="end" fill="#b6c0d0" font-size="14">${Math.round(max / 1.08 * v)}</text>`;
  S.pts.forEach((p, i) => { const cx = X(i) - (x1 - x0) / n * .5, on = i === i0; s += `<rect x="${X(i) - (x1 - x0) / n}" y="${y0 - 8}" width="${(x1 - x0) / n}" height="${y1 - y0 + 8}" fill="${on ? 'rgba(255,255,255,.07)' : 'transparent'}"/>`;
    s += `<text x="${cx}" y="${H - 34}" text-anchor="middle" fill="${on ? '#fff' : '#b6c0d0'}" font-size="14" font-weight="${on ? 700 : 600}">${esc(lab(p.w))}</text>${tiny ? '' : `<text x="${cx}" y="${H - 16}" text-anchor="middle" fill="#8fa0b8" font-size="13">${p.w.times.length ? esc(p.w.times[0].replace(':00', '')) + (p.w.times.length > 1 ? '+' : '') : p.w.state === 'final' ? 'final' : ''}</text>`}`;
    if (p.change) { const lx = Math.max(cx, x0 + 46), near = S._lcx != null && lx - S._lcx < 96; if (!near) { s += `<text x="${lx}" y="${y0 - 6}" text-anchor="middle" fill="#ffd24a" font-size="13" font-weight="700">LEAD CHANGE</text>`; S._lcx = lx; } } // two changes in neighbouring windows: only the first is labelled so the labels never collide
    if (i === S.swing) s += `<text x="${Math.min(Math.max(cx, x0 + 44), x1 - 44)}" y="${H - (tiny ? 14 : 1)}" text-anchor="middle" fill="#ffd24a" font-size="13" font-weight="700">${tiny ? 'SWING' : 'BIGGEST SWING'}</text>`; });
  s += `<path d="${path('b')}" fill="none" stroke="#ff6b84" stroke-width="4" stroke-linejoin="round"/><path d="${path('a')}" fill="none" stroke="#4db8f0" stroke-width="4" stroke-linejoin="round"/>`;
  const end = S.pts[n - 1], ya = Y(end.a), yb = Y(end.b), dy = Math.abs(ya - yb) < 16 ? (ya < yb ? -1 : 1) * 8 : 0;
  s += `<text x="${x1}" y="${ya - 6 + dy}" text-anchor="end" fill="#4db8f0" font-size="16" font-weight="700">${f2(end.a)}</text><text x="${x1}" y="${yb + 18 - dy}" text-anchor="end" fill="#ff6b84" font-size="16" font-weight="700">${f2(end.b)}</text></svg>`;
  const p = S.pts[i0], w = p.w, remA = S.totalA - p.a, remB = S.totalB - p.b, row = (q) => `<div class="pr2">${nflBadge(q.nfl_team)}<span>${esc(q.name)}<small>${esc(q.rank || q.position)} · ${esc(q.opp)}${q.kickoff ? ' · ' + esc(q.kickoff) + ' ET' : ''}</small></span><b>${p.actual && q.live != null ? f2(q.live) : q.projected != null ? f2(q.projected) : '—'}</b></div>`;
  const side = (k, F, cls) => `<div class="${cls}"><h5><span>${esc(F.manager.toUpperCase())}</span><span>${f2(k === 'a' ? p.da : p.db)}</span></h5>${w[k].players.length ? w[k].players.map(row).join('') : '<p class="note" style="margin:6px 0">Nobody starting in this window.</p>'}</div>`;
  return `<div class="tl">${s}<div class="tlw" role="group" aria-label="Kickoff windows">${S.pts.map((q, i) => `<button data-tw="${i}" aria-pressed="${i === i0}"><b>${esc(q.w.short)}</b><small>${q.w.times.length ? esc(q.w.times.join(' · ')) + ' ET' : esc(q.w.label)}</small><small>${q.w.state === 'final' ? 'final' : q.w.state === 'live' ? 'in progress' : 'upcoming'}</small></button>`).join('')}</div>
   <p class="tlsum"><b>${esc(w.label)}${w.md ? ', ' + esc(w.md) : ''}:</b> ${esc(A.manager)} ${f2(p.da)}, ${esc(B.manager)} ${f2(p.db)} ${p.actual ? '(scored)' : '(projected)'}. After this window ${esc(p.a >= p.b ? A.manager : B.manager)} ${p.a === p.b ? 'is level' : 'leads'} ${f2(Math.max(p.a, p.b))}–${f2(Math.min(p.a, p.b))}; still to come: ${esc(A.manager)} ${f2(remA)}, ${esc(B.manager)} ${f2(remB)}.</p>
   <div class="tlp">${side('a', A, 'a')}${side('b', B, 'r')}</div>
   <p class="note" style="margin-top:8px">${T.has_times ? 'Kickoff times are Eastern Time.' : 'Kickoff times are not available right now, so windows are grouped by game day.'} Solid numbers marked "scored" are actual; everything else is a projection. Not lineup advice.</p></div>`;
}

// ---- Poster: 2520 × 5400 PNG (drawn at 1260 × 2700, scaled 2×) ----
function badgeCanvas(x, abbr, cx, cy, h) { const t = nflTeam(abbr), w = h * 2.1; x.save(); x.fillStyle = t.primary; x.strokeStyle = t.secondary; x.lineWidth = Math.max(2, h * .1); x.beginPath(); x.roundRect(cx - w / 2, cy - h / 2, w, h, h * .28); x.fill(); x.stroke();
  x.fillStyle = t.text || '#fff'; x.font = `700 ${Math.round(h * .62)}px 'Barlow Condensed'`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t.abbr, cx, cy + 1); x.restore(); }
function posterTall(g, ctx) {
  const { T, th, c, week } = ctx, A = T(g.a), B = T(g.b), cv = document.createElement('canvas'), SC = 2, W = 1260, H = 2700; cv.width = W * SC; cv.height = H * SC; const x = cv.getContext('2d'); x.scale(SC, SC);
  const BL = '#4db8f0', RD = '#ff6b84', f2 = (v) => v.toFixed(2), U = (s) => String(s).toUpperCase();
  const fit = (txt, font, size, maxW, min = 14) => { let z = size; x.font = font.replace('$', z); while (x.measureText(txt).width > maxW && z > min) { z -= 1; x.font = font.replace('$', z); } return z; };
  const wrap = (txt, maxW) => { const out = []; let line = ''; for (const w of String(txt).split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  // backdrop
  x.fillStyle = '#0b1524'; x.fillRect(0, 0, W, H); let gr = x.createRadialGradient(180, 300, 0, 180, 300, 900); gr.addColorStop(0, 'rgba(77,184,240,.34)'); gr.addColorStop(1, 'rgba(77,184,240,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 1300);
  gr = x.createRadialGradient(W - 180, 300, 0, W - 180, 300, 900); gr.addColorStop(0, 'rgba(255,107,132,.32)'); gr.addColorStop(1, 'rgba(255,107,132,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 1300);
  x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = "400 44px 'Bebas Neue'"; x.fillText('NYC DYNASTY LEAGUE', 60, 84); x.textAlign = 'right'; x.fillStyle = '#7fe0aa'; x.fillText(`WEEK ${week} · ${c.season}`, W - 60, 84);
  const tags = [g.kicker, g.rating].filter(Boolean).map(U); x.font = "700 26px 'Barlow Condensed'"; let tw = tags.reduce((a, t) => a + x.measureText(t).width + 44, 0) + (tags.length - 1) * 14, tx = W / 2 - tw / 2; x.textAlign = 'left';
  tags.forEach((t, i) => { const w = x.measureText(t).width + 44; x.fillStyle = i ? '#f2f4f8' : 'rgba(255,255,255,.12)'; x.beginPath(); x.roundRect(tx, 116, w, 44, 8); x.fill(); x.fillStyle = i ? '#0f1b2d' : '#f2f4f8'; x.fillText(t, tx + 22, 147); tx += w + 14; });
  // the two franchises
  crestCanvas(x, th(g.a), 250, 320, 125); crestCanvas(x, th(g.b), W - 250, 320, 125); x.textAlign = 'center'; x.fillStyle = '#f2f4f8'; x.font = "400 80px 'Bebas Neue'"; x.fillText('VS', W / 2, 350);
  fit(U(A.manager), "400 $px 'Bebas Neue'", 124, 520); x.fillStyle = BL; x.fillText(U(A.manager), 250, 560); fit(U(B.manager), "400 $px 'Bebas Neue'", 124, 520); x.fillStyle = RD; x.fillText(U(B.manager), W - 250, 560);
  x.fillStyle = '#dfe7f3'; fit(`${A.team_name} · ${A.record}`, "600 $px 'Barlow Condensed'", 32, 520); x.fillText(`${A.team_name} · ${A.record}`, 250, 606); fit(`${B.team_name} · ${B.record}`, "600 $px 'Barlow Condensed'", 32, 520); x.fillText(`${B.team_name} · ${B.record}`, W - 250, 606);
  // headline
  x.fillStyle = '#fff'; g.headline.forEach((s, i) => { fit(s, "400 $px 'Bebas Neue'", 70, W - 120, 30); x.fillText(s, W / 2, 716 + i * 76); });
  // projected score and win chance
  x.font = "400 170px 'Bebas Neue'"; x.textAlign = 'right'; x.fillStyle = BL; x.fillText(f2(g.projected[0]), W / 2 - 50, 1010); x.textAlign = 'left'; x.fillStyle = RD; x.fillText(f2(g.projected[1]), W / 2 + 50, 1010);
  x.textAlign = 'center'; x.fillStyle = '#b6c0d0'; x.font = "600 26px 'Barlow Condensed'"; x.fillText('PROJECTED POINTS', W / 2, 870);
  x.fillStyle = RD; x.beginPath(); x.roundRect(160, 1046, W - 320, 16, 8); x.fill(); x.fillStyle = BL; x.beginPath(); x.roundRect(160, 1046, (W - 320) * g.win[0], 16, 8); x.fill();
  x.font = "400 52px 'Bebas Neue'"; x.textAlign = 'left'; x.fillStyle = BL; x.fillText(`${p1(g.win[0])}% TO WIN`, 160, 1122); x.textAlign = 'right'; x.fillStyle = RD; x.fillText(`${p1(g.win[1])}% TO WIN`, W - 160, 1122);
  // featured players: jersey with the real number, team badge, position, projection
  const fp = [...g.featured_a, ...g.featured_b]; fp.forEach((p, i) => { const r = i > 2, cx = 60 + 95 + i * 190 + (r ? 0 : 0), top = 1170; x.fillStyle = r ? 'rgba(255,107,132,.10)' : 'rgba(77,184,240,.10)'; x.beginPath(); x.roundRect(cx - 88, top, 176, 330, 12); x.fill(); x.fillStyle = r ? RD : BL; x.fillRect(cx - 88, top, 176, 6);
    jerseyCanvas(x, p, cx, top + 118, .2); x.textAlign = 'center'; x.fillStyle = '#fff'; const nm = U(p.name); fit(nm, "400 $px 'Bebas Neue'", 30, 164, 15); x.fillText(nm, cx, top + 236); badgeCanvas(x, p.nfl_team, cx - 26, top + 266, 30);
    x.fillStyle = '#dfe7f3'; x.font = "600 24px 'Barlow Condensed'"; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(p.rank || p.position, cx + 14, top + 267); x.textBaseline = 'alphabetic'; x.textAlign = 'center'; x.fillStyle = r ? RD : BL; x.font = "400 34px 'Bebas Neue'"; x.fillText(p.projected != null ? f2(p.projected) : '', cx, top + 316); });
  // why it matters
  let y = 1570; x.textAlign = 'center'; x.fillStyle = '#7fe0aa'; x.font = "700 26px 'Barlow Condensed'"; x.fillText('WHY IT MATTERS', W / 2, y); x.fillStyle = '#f2f4f8'; x.font = "600 34px 'Barlow Condensed'"; wrap(g.why || g.story.split('. ')[0] + '.', W - 160).slice(0, 2).forEach((l, i) => x.fillText(l, W / 2, y + 46 + i * 42));
  // when it swings
  y = 1730; x.fillStyle = '#fff'; x.font = "400 52px 'Bebas Neue'"; x.textAlign = 'left'; x.fillText('WHEN IT SWINGS', 60, y); x.textAlign = 'right'; x.fillStyle = '#b6c0d0'; x.font = "600 24px 'Barlow Condensed'"; x.fillText(g.timeline && g.timeline.has_times ? 'CUMULATIVE POINTS BY KICKOFF WINDOW · EASTERN TIME' : 'CUMULATIVE POINTS BY GAME DAY', W - 60, y - 6);
  const S = swingSeries(g), n = S.pts.length || 1, cx0 = 110, cx1 = W - 70, cy0 = y + 40, cy1 = y + 330, mx = Math.max(S.totalA, S.totalB, 1) * 1.1, X = (i) => cx0 + (i + 1) / n * (cx1 - cx0), Y = (v) => cy1 - v / mx * (cy1 - cy0);
  x.strokeStyle = '#2a3b55'; x.lineWidth = 2; for (const v of [0, .5, 1]) { x.beginPath(); x.moveTo(cx0, Y(mx / 1.1 * v)); x.lineTo(cx1, Y(mx / 1.1 * v)); x.stroke(); x.fillStyle = '#8fa0b8'; x.textAlign = 'right'; x.font = "600 22px 'Barlow Condensed'"; x.fillText(String(Math.round(mx / 1.1 * v)), cx0 - 10, Y(mx / 1.1 * v) + 7); }
  const line = (k, col) => { x.strokeStyle = col; x.lineWidth = 7; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx0, Y(0)); let prev = 0; S.pts.forEach((p, i) => { const m = X(i) - (cx1 - cx0) / n * .5; x.lineTo(m, Y(prev)); x.lineTo(m, Y(p[k])); x.lineTo(X(i), Y(p[k])); prev = p[k]; }); x.stroke(); };
  if (S.pts.length) { x.fillStyle = 'rgba(255,210,74,.10)'; x.fillRect(X(S.swing) - (cx1 - cx0) / n, cy0 - 10, (cx1 - cx0) / n, cy1 - cy0 + 10); line('b', RD); line('a', BL);
    S.pts.forEach((p, i) => { const m = X(i) - (cx1 - cx0) / n * .5; x.textAlign = 'center'; x.fillStyle = '#fff'; fit(p.w.short, "700 $px 'Barlow Condensed'", 26, (cx1 - cx0) / n - 10, 15); x.fillText(p.w.short, m, cy1 + 38); x.fillStyle = '#b6c0d0'; x.font = "600 22px 'Barlow Condensed'"; x.fillText(p.w.times.length ? p.w.times[0] + (p.w.times.length > 1 ? ' +' : '') : (p.w.md || ''), m, cy1 + 66);
      x.font = "600 22px 'Barlow Condensed'"; x.fillStyle = BL; x.fillText(f2(p.da), m - 44, cy1 + 96); x.fillStyle = RD; x.fillText(f2(p.db), m + 44, cy1 + 96); if (i === S.swing) { x.fillStyle = '#ffd24a'; x.font = "700 20px 'Barlow Condensed'"; x.fillText('BIGGEST SWING', m, cy0 - 18); } }); }
  // series and how each side wins
  y = 2210; x.textAlign = 'center'; x.fillStyle = '#7fe0aa'; x.font = "400 46px 'Bebas Neue'"; const ser = g.series.games && !g.series.first_for_managers ? (g.series.a === g.series.b ? `ALL-TIME SERIES LEVEL ${g.series.a}-${g.series.b}` : `${U((g.series.a > g.series.b ? A : B).manager)} LEADS THE ALL-TIME SERIES ${Math.max(g.series.a, g.series.b)}-${Math.min(g.series.a, g.series.b)}`) : 'FIRST MEETING BETWEEN THESE MANAGERS'; fit(ser, "400 $px 'Bebas Neue'", 46, W - 120, 24); x.fillText(ser, W / 2, y);
  const col = (lines, title, cx, c2) => { x.fillStyle = c2 === BL ? 'rgba(77,184,240,.10)' : 'rgba(255,107,132,.10)'; x.beginPath(); x.roundRect(cx - 275, y + 36, 550, 330, 12); x.fill(); x.fillStyle = c2; x.fillRect(cx - 275, y + 36, 550, 6); x.textAlign = 'left'; x.font = "400 40px 'Bebas Neue'"; x.fillText(title, cx - 250, y + 96);
    x.fillStyle = '#f2f4f8'; x.font = "600 26px 'Barlow Condensed'"; let yy = y + 138; lines.slice(0, 3).forEach((l) => { const ws = wrap(l, 480).slice(0, 3); x.fillStyle = c2; x.fillText('•', cx - 250, yy); x.fillStyle = '#f2f4f8'; ws.forEach((q, k) => x.fillText(q, cx - 226, yy + k * 30)); yy += ws.length * 30 + 12; }); };
  col(g.how_a, `HOW ${U(A.manager)} WINS`, 60 + 275, BL); col(g.how_b, `HOW ${U(B.manager)} WINS`, W - 60 - 275, RD);
  x.textAlign = 'center'; x.fillStyle = '#8fa0b8'; x.font = "600 22px 'Barlow Condensed'"; x.fillText('Projected points and modeled win chance from league data · team badges and jerseys are original graphics in team colours · not lineup advice', W / 2, H - 44);
  return cv;
}
