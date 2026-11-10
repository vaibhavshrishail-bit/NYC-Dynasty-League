import json
r=lambda p:open(p).read()
hub=r('src/hub.js');core=hub[:hub.index('// ---------- verified moments')]
js=r'''
const A=BY.Vaibhav,B=BY.Shiamak,$=s=>document.querySelector(s);
const pick=(T,names)=>names.map(n=>T.roster.find(p=>p.n===n));
const card=p=>{const s=p.n.split(' '),f=s.shift();return `<div class="pc"><div class="n">${p.num}</div><div><div class="fn">${f}</div><div class="ln">${s.join(' ')}</div><div class="ps">${p.p} · ${p.t}</div></div></div>`};
$('.em.l').outerHTML=emblem('Vaibhav',{still:1}).replace('class="em still"','class="em l still"');
$('.em.r').outerHTML=emblem('Shiamak',{still:1}).replace('class="em still"','class="em r still"');
$('.wm.l').outerHTML=glyphOnly('Vaibhav').replace('class="wm"','class="wm l"').replaceAll(ID.Vaibhav.p,'#9cc2ff');
$('.wm.r').outerHTML=glyphOnly('Shiamak').replace('class="wm"','class="wm r"').replaceAll(ID.Shiamak.p,'#ffb0a6');
$('.cards.l').innerHTML=pick(A,A.core.slice(0,3).map(c=>c.n)).map(card).join('');
$('.cards.r').innerHTML=pick(B,['Jahmyr Gibbs','Jonathan Taylor','Lamar Jackson']).map(card).join('');
const h=DATA.h2h.Vaibhav.Shiamak,num=s=>parseFloat(String(s).replace(/[,%]/g,''));
const rows=[['REG. SEASON 22–25',A.reg.join('-'),B.reg.join('-'),A.reg[0],B.reg[0]],['POWER TIER','Tier '+A.tier,'Tier '+B.tier,-A.tier,-B.tier],['PROJ. OFFENSE PTS',A.projPts,B.projPts],['DYNASTY VALUE',A.ktc.toLocaleString(),B.ktc.toLocaleString()],['TITLE ODDS',A.mc.champ,B.mc.champ]];
$('#rows').innerHTML=rows.map(([k,a,b,x,y])=>{x=x??num(a);y=y??num(b);return `<div class="row"><div class="a ${x>y?'w':''}">${a}</div><div class="k">${k}</div><div class="b ${y>x?'w':''}">${b}</div></div>`}).join('');
$('#h2h').textContent=`PANTHEON LEAD ${h[0]}–${h[1]} · THROUGH 2025`;
window.__ok=document.fonts.ready.then(()=>true);
'''
html=f'''<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pantheon vs Super Lamario Bros — Matchup Poster</title><style>{r('src/fonts.css')}{r('src/poster.css')}</style></head><body><div id="p">
<div class="half L"></div><div class="half R"></div><svg class="wm l"></svg><svg class="wm r"></svg>
<svg class="grain" width="1200" height="1800"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0"/></filter><rect width="1200" height="1800" filter="url(#n)"/></svg>
<div class="shade"></div>
<svg class="seam" viewBox="0 0 1200 1800"><defs><filter id="gl" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="9"/></filter></defs>
<linearGradient id="fd" gradientUnits="userSpaceOnUse" x1="0" y1="1180" x2="0" y2="1340"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient><mask id="mk"><rect width="1200" height="1800" fill="url(#fd)"/></mask><g mask="url(#mk)" fill="none" stroke-linejoin="round" stroke-linecap="round"><path id="bolt" d="M744 0 L716 150 L742 196 L690 330 L724 392 L662 560 L690 610 L642 800 L668 846 L610 1010 L640 1060 L580 1230 L604 1280 L548 1450 L574 1500 L500 1680 L456 1800" stroke="#fff" stroke-width="16" filter="url(#gl)" opacity=".9"/><path d="M744 0 L716 150 L742 196 L690 330 L724 392 L662 560 L690 610 L642 800 L668 846 L610 1010 L640 1060 L580 1230 L604 1280 L548 1450 L574 1500 L500 1680 L456 1800" stroke="#fff" stroke-width="5"/>
</g></svg>
<div class="top"><div class="lg">NYC DYNASTY LEAGUE</div><br><div class="wk"><span class="a">MARQUEE RIVALRY</span><span class="b">WEEK 13 · THE REMATCH</span></div></div>
<svg class="em l"></svg><svg class="em r"></svg><div class="vs">VS</div>
<div class="tn l"><h2>THE<br>PANTHEON</h2><div class="gm">VAIBHAV</div><div class="tier">TIER 3 · NARROW WAY THROUGH</div></div>
<div class="tn r"><h2>SUPER LAMARIO<br>BROS</h2><div class="gm">SHIAMAK</div><div class="tier">TIER 2 · THE GLASS CANNON</div></div>
<div class="cards l"></div><div class="cards r"></div>
<div class="hl"><div class="big">GODS VS. THE GLASS CANNON</div><div class="q">“One of the more evenly matched series on the whole schedule.”</div><div class="h2h" id="h2h"></div></div>
<div class="tape"><div id="rows"></div></div>
<div class="ft">Rosters: Sleeper snapshot 2026-09-08 · Series, tiers and preseason figures: Commissioner’s Playbook 2026-27 · 2026 results not included</div>
</div><script>const DATA={r('src/league.json').replace('</','<\\/')};
{core}
{js}</script></body></html>'''
open('out/pantheon-matchup-poster.html','w').write(html)
