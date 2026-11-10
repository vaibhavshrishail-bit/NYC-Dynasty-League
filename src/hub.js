const TEAMS=DATA.teams,BY={};TEAMS.forEach(t=>BY[t.manager]=t);
// ---------- franchise identities (original design; nothing here is league data) ----------
const ID={
 Soham:{slug:'rb-shelter',p:'#7fb069',p2:'#cfeab9',deep:'#12261a',frame:'penta',glyph:'shelter',motto:'Every back gets a home.',fx:{shape:'dot',vy:-.25,vx:.1,n:60}},
 Advaith:{slug:'first-indians',p:'#f29f3d',p2:'#ffd9a3',deep:'#2c1705',frame:'circle',glyph:'sun',motto:'First in line.',fx:{shape:'line',vy:-.9,vx:0,n:50}},
 Nihar:{slug:'spider-jan',p:'#e0425f',p2:'#ffb3c0',deep:'#0f1436',frame:'octa',glyph:'web',motto:'Brand new day. Same web.',fx:{shape:'web',vy:.12,vx:.12,n:26}},
 Dev:{slug:'develeper',p:'#4be38a',p2:'#c5ffd9',deep:'#04190e',frame:'square',glyph:'code',motto:'Ship wins.',fx:{shape:'char',vy:1.6,vx:0,n:70}},
 Alan:{slug:'best-not-miss',p:'#f5c94a',p2:'#fff0b8',deep:'#221a03',frame:'ring',glyph:'aim',motto:'Three rings. Still aiming.',fx:{shape:'ring',vy:-.15,vx:0,n:22}},
 Varun:{slug:'zay',p:'#ff7fb0',p2:'#ffd3e4',deep:'#2c0a1c',frame:'diamond',glyph:'gem',motto:'Every win begins with Zay.',fx:{shape:'diamond',vy:-.3,vx:.05,n:46}},
 Achal:{slug:'handcuffs',p:'#a9b7c6',p2:'#eef3f8',deep:'#0f161d',frame:'hex',glyph:'cuffs',motto:'Locked in.',fx:{shape:'ring',vy:.2,vx:-.1,n:30}},
 Manas:{slug:'twin-bowers',p:'#3fd0c0',p2:'#c4fff6',deep:'#04221f',frame:'shield',glyph:'arches',motto:'Two towers at tight end.',fx:{shape:'line',vy:-.5,vx:0,n:44}},
 Shiamak:{slug:'lamario',p:'#ff4d3d',p2:'#ffc2b8',deep:'#2c0906',frame:'block',glyph:'boost',motto:'Level up.',fx:{shape:'square',vy:-.7,vx:0,n:44}},
 Vaibhav:{slug:'pantheon',p:'#c9995a',p2:'#f3d7a0',deep:'#1f1507',frame:'circle',glyph:'temple',motto:'Built for the heavens.',fx:{shape:'ember',vy:-.6,vx:.15,n:80}},
 Taylor:{slug:'fannin-flames',p:'#ff8a2a',p2:'#ffd6a8',deep:'#2c1002',frame:'shield2',glyph:'flame',motto:'Keep it burning.',fx:{shape:'ember',vy:-1.3,vx:0,n:110}},
 Dhiraj:{slug:'nabers',p:'#a78bfa',p2:'#e2d8ff',deep:'#150d30',frame:'circle2',glyph:'heart',motto:'Love thy Nabers.',fx:{shape:'dot',vy:-.2,vx:-.1,n:70}}};
const poly=(n,r,rot)=>'M'+Array.from({length:n},(_,i)=>{const a=rot+i*2*Math.PI/n;return(100+r*Math.cos(a)).toFixed(1)+' '+(100+r*Math.sin(a)).toFixed(1)}).join('L')+'Z';
const FRAME={circle:'M100 9a91 91 0 1 0 .01 0z',circle2:'M100 9a91 91 0 1 0 .01 0z',ring:'M100 9a91 91 0 1 0 .01 0z',hex:poly(6,94,Math.PI/6),octa:poly(8,95,Math.PI/8),diamond:'M100 5L195 100L100 195L5 100Z',
 shield:'M20 20H180V104C180 152 142 182 100 196C58 182 20 152 20 104Z',shield2:'M100 6L182 40V112C182 156 140 184 100 196C60 184 18 156 18 112V40Z',square:'M40 16H160A24 24 0 0 1 184 40V160A24 24 0 0 1 160 184H40A24 24 0 0 1 16 160V40A24 24 0 0 1 40 16Z',
 block:'M16 16H184V184H16Z',penta:'M100 8L188 72V186H12V72Z'};
// glyphs live in a 100x100 box
const GLYPH={
 shelter:[{d:'M50 14L90 48H79V86H21V48H10ZM41 86V64a9 9 0 0 1 18 0V86Z',f:1}],
 sun:[{d:'M18 70A32 32 0 0 1 82 70Z',f:1},{d:'M8 80H92V87H8Z',f:1},{d:'M50 28V12M27 37L17 25M73 37L83 25M14 56L2 50M86 56L98 50',s:6}],
 web:[{d:'M50 8V92M8 50H92M20 20L80 80M80 20L20 80',s:2.5},{d:'M50 22C58 30 70 30 70 30C70 30 70 42 78 50C70 58 70 70 70 70C70 70 58 70 50 78C42 70 30 70 30 70C30 70 30 58 22 50C30 42 30 30 30 30C30 30 42 30 50 22Z',s:3},{d:'M50 36C55 41 60 40 60 40C60 40 59 45 64 50C59 55 60 60 60 60C60 60 55 59 50 64C45 59 40 60 40 60C40 60 41 55 36 50C41 45 40 40 40 40C40 40 45 41 50 36Z',s:3},{d:'M50 6C62 20 80 20 80 20C80 20 80 38 94 50C80 62 80 80 80 80C80 80 62 80 50 94C38 80 20 80 20 80C20 80 20 62 6 50C20 38 20 20 20 20C20 20 38 20 50 6Z',s:3}],
 code:[{d:'M34 28L12 50L34 72M66 28L88 50L66 72M59 18L41 82',s:9}],
 aim:[{d:'M50 18a32 32 0 1 0 .01 0z',s:6},{d:'M50 36a14 14 0 1 0 .01 0z',s:4},{d:'M50 2V28M50 72V98M2 50H28M72 50H98',s:6},{d:'M50 44a6 6 0 1 0 .01 0z',f:1}],
 gem:[{d:'M30 18H70L92 42L50 92L8 42Z',f:1},{d:'M8 42H92M30 18L40 42L50 92M70 18L60 42L50 92M50 18L40 42M50 18L60 42',s:2.5,dark:1}],
 cuffs:[{d:'M36 28a22 22 0 1 0 .01 0z',s:9},{d:'M64 28a22 22 0 1 0 .01 0z',s:9}],
 arches:[{d:'M10 90V42a17 17 0 0 1 34 0V90h-10V42a7 7 0 0 0-14 0V90ZM56 90V42a17 17 0 0 1 34 0V90h-10V42a7 7 0 0 0-14 0V90Z',f:1},{d:'M4 90H96V96H4Z',f:1}],
 boost:[{d:'M50 8L88 44H66L50 29L34 44H12Z',f:1},{d:'M50 46L88 82H66L50 67L34 82H12Z',f:1}],
 flame:[{d:'M52 6C58 30 84 40 80 66C78 84 63 95 50 95C36 95 20 84 20 66C20 50 31 44 35 28C42 39 44 44 46 47C44 30 46 17 52 6ZM50 58C56 67 63 71 61 80C60 87 55 90 50 90C45 90 39 86 39 79C39 71 46 67 50 58Z',f:1}],
 heart:[{d:'M50 88C20 66 8 50 8 34C8 21 19 12 31 12C39 12 46 16 50 25C54 16 61 12 69 12C81 12 92 21 92 34C92 50 80 66 50 88Z',f:1},{d:'M50 46L66 58V72H34V58Z',f:1,dark:1}]};
let uid=0;
function emblem(m,opt){opt=opt||{};const I=ID[m],g='g'+(++uid),t=BY[m],stars=m==='Alan'?3:m==='Taylor'?1:0;
 let body;
 if(I.glyph==='temple')body=`<g class="gl" fill="url(#${g})"><path d="M38 80L100 40L162 80Z M100 57a8 8 0 1 0 .01 0z" fill-rule="evenodd"/><path d="M36 83h128v9h-128z"/>${[46,68,122,144].map(x=>`<path d="M${x} 96h10v46h-10z"/>`).join('')}<path d="M34 145h132v6h-132zM26 154h148v6h-148z"/><path d="M108 94L86 124L99 124L91 146L116 113L102 113Z" fill="#fff3d6"/>${[-1,1].map(s=>Array.from({length:9},(_,i)=>{const a=Math.PI/2+s*(.32+i*.2),x=100+Math.cos(a)*75.5,y=100+Math.sin(a)*75.5;return`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="2.4" transform="rotate(${((a+s*1.05)*180/Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${I.p}"/>`}).join('')).join('')}</g>`;
 else body=`<g class="gl"><g transform="translate(${stars?52:50} ${stars?58:50}) scale(${stars?.96:1})">${GLYPH[I.glyph].map(q=>q.f?`<path d="${q.d}" fill="${q.dark?'#08080b':`url(#${g})`}" fill-rule="evenodd"/>`:`<path d="${q.d}" fill="none" stroke="${q.dark?'#08080b':`url(#${g})`}" stroke-width="${q.s}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>${Array.from({length:stars},(_,i)=>`<path transform="translate(${100+(i-(stars-1)/2)*20} 34) scale(.9)" d="M0-8L2.4-2.6L8-2.6L3.6 1.2L5 7L0 3.6L-5 7L-3.6 1.2L-8-2.6L-2.4-2.6Z" fill="${I.p2}"/>`).join('')}</g>`;
 const extra=I.frame==='ring'||I.glyph==='temple'?`<path d="M100 18a82 82 0 1 0 .01 0z" fill="none" stroke="${I.p}" stroke-width="1" opacity=".7"/>`:I.frame==='circle2'?`<path d="M100 20a80 80 0 1 0 .01 0z" fill="none" stroke="${I.p}" stroke-width="1.5" stroke-dasharray="3 6"/>`:I.frame==='block'?`<path d="M16 62H184M16 138H184M70 16V62M130 16V62M100 138V184" stroke="${I.p}" stroke-width="1" opacity=".35"/>`:'';
 return`<svg class="em ${opt.still?'still':''}" viewBox="0 0 200 200" role="img" aria-label="${t.team} emblem"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${I.p2}"/><stop offset="1" stop-color="${I.p}"/></linearGradient><radialGradient id="${g}b" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="${I.deep}"/><stop offset="1" stop-color="#050507"/></radialGradient><clipPath id="${g}c"><path d="${FRAME[I.frame]}"/></clipPath></defs>
 <path d="${FRAME[I.frame]}" fill="url(#${g}b)"/>${opt.still?'':`<g clip-path="url(#${g}c)"><path class="sheen" d="M100 100L60 -60L140 -60Z" fill="${I.p}" opacity=".16"/></g>`}${extra}
 <path class="fr-s" d="${FRAME[I.frame]}" fill="none" stroke="url(#${g})" stroke-width="4" stroke-linejoin="round" pathLength="700"/>${body}</svg>`}
function glyphOnly(m){const I=ID[m];if(I.glyph==='temple')return`<svg class="wm" viewBox="0 0 200 200"><path fill="${I.p}" d="M38 80L100 40L162 80ZM36 83h128v9h-128zM46 96h10v46h-10zM68 96h10v46h-10zM122 96h10v46h-10zM144 96h10v46h-10zM34 145h132v6h-132zM26 154h148v6h-148z"/></svg>`;
 return`<svg class="wm" viewBox="0 0 100 100">${GLYPH[I.glyph].filter(q=>!q.dark).map(q=>q.f?`<path d="${q.d}" fill="${I.p}" fill-rule="evenodd"/>`:`<path d="${q.d}" fill="none" stroke="${I.p}" stroke-width="${q.s}" stroke-linecap="round"/>`).join('')}</svg>`}
// ---------- verified moments (Commissioner's Playbook 2026-27) ----------
const MOMENTS={
 Alan:['2022: snuck in at 7-7, upset Achal\'s league-best 11-3 squad in the semifinal, then beat Dhiraj 121.98–116.68 for the first ring.','2023: tied for the best record at 10-4, lost the final to Taylor.','2024: wire to wire at 12-2, then 165.20–99.42 over Manas, the largest title-game margin on record (65.78).','2025: 159.80–136.70 over Manas for a third ring in four seasons.'],
 Taylor:['2023 champion at 10-4: 153.16–91.24 over Alan in the final.','The only manager other than Alan with a title.','Unluckiest manager 2022–25 on the Luck Index: −9.1 (55.4% actual win rate vs 64.5% all-play).'],
 Dhiraj:['2022: reached the league\'s first-ever final, lost to Alan 121.98–116.68.','2023: toilet-bowl loss at 3-11. Punishment: Hot Ones wings.','Elected Vice Commissioner for 2026-27.'],
 Manas:['2024: reached the final, lost to Alan 165.20–99.42.','2025: knocked out 12-2 Nihar in the semifinal, 139.00–120.56, then lost the final to Alan 159.80–136.70.','Back-to-back finals, still chasing the first ring.'],
 Nihar:['2023: tied for the league\'s best record at 10-4.','2025: league-best 12-2, eliminated by Manas in the semifinal, 139.00–120.56.','5-0 all-time against both Advaith and Varun.'],
 Achal:['2022: league-best 11-3, upset by Alan in the semifinal.','2024: fell to 1-13, two years after the best record in the league.','Regular season 1-4 vs Dev, but 2-0 against him in the postseason.'],
 Vaibhav:['2022: toilet-bowl loss at 6-8. Punishment: Bachelorette-style video, the league\'s original precedent.','2024: second toilet-bowl loss in three years (5-9). Punishment: full clown costume at a baseball game.','2026: elected Commissioner for the 2026-27 season.','Preseason 2026: #2 dynasty value in the league (53,609 KTC), tagged the clearest "rising threat".'],
 Varun:['2025: toilet-bowl loss at 7-7. Punishment: Showtime on the subway.','0-5 all-time vs Nihar and 0-4 vs Manas.'],
 Dev:['#2 regular-season win rate in league history, 2022–25 (66.1%).','Luckiest manager on the Luck Index: +11.5 (66.1% actual vs 54.5% all-play).','6-0 against Soham, the most lopsided series in the league.'],
 Soham:['0-6 against Dev, the most lopsided series in the league.','4-1 against Achal, his strongest series.','Drew the hardest 2026 schedule in the league (rank 1 of 12).'],
 Advaith:['0-5 all-time against Nihar, a marquee rivalry played twice in 2026.','Dead even with Dhiraj (4-4) and Manas (2-2).','Third-luckiest manager on the Luck Index (+4.1).'],
 Shiamak:['Preseason 2026: Tier 2, "The Glass Cannon", with the second-best title odds in the model (25.8%).','0-4 all-time against Alan.','6-2 against Varun, including 3-0 in the postseason brackets.']};
const EPITHET={'Amon-Ra St. Brown':'The Sun God','Ashton Jeanty':'The Thunder','Tetairoa McMillan':'The Titan','Omarion Hampton':'The Hammer','Justin Herbert':'The Lightning Arm','Aidan Hutchinson':'The War God'};
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)],esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const app=$('#app'),iris=$('#iris');let focus='Vaibhav',view='hub';
function theme(m){const I=ID[m],s=document.body.style;s.setProperty('--p',I.p);s.setProperty('--p2',I.p2);s.setProperty('--deep',I.deep);FX.set(I)}
const titles=m=>DATA.history.filter(h=>h.champ===m).map(h=>h.y),pct=(w,l)=>w+l?(100*w/(w+l)).toFixed(1)+'%':'—';
// ---------- ambient fx ----------
const FX=(()=>{const c=$('#fx'),x=c.getContext('2d');let P=[],cfg=ID.Vaibhav,w,h,dpr;
 function size(){dpr=Math.min(2,devicePixelRatio||1);w=c.width=innerWidth*dpr;h=c.height=innerHeight*dpr}
 function seed(){const f=cfg.fx;P=Array.from({length:f.n},()=>({x:Math.random()*w,y:Math.random()*h,s:.4+Math.random(),a:Math.random()*6.28,o:.15+Math.random()*.6,ch:'01{}<>/;=+'[Math.random()*10|0]}))}
 function tick(t){x.clearRect(0,0,w,h);const f=cfg.fx,col=cfg.p,c2=cfg.p2;x.lineWidth=dpr;
  if(f.shape==='web'){x.strokeStyle=col;for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y);if(d<w*.16+90*dpr){x.globalAlpha=.16*(1-d/(w*.16+90*dpr));x.beginPath();x.moveTo(P[i].x,P[i].y);x.lineTo(P[j].x,P[j].y);x.stroke()}}}
  for(const p of P){p.y+=f.vy*p.s*dpr*1.2;p.x+=(f.vx+Math.sin(p.a+t/1400)*.25)*p.s*dpr;if(p.y<-20)p.y=h+20;if(p.y>h+20)p.y=-20;if(p.x<-20)p.x=w+20;if(p.x>w+20)p.x=-20;
   x.globalAlpha=p.o*(f.shape==='ember'?.5+.5*Math.sin(p.a+t/300):1)*.8;x.fillStyle=x.strokeStyle=p.s>1?c2:col;const r=p.s*dpr;
   if(f.shape==='line'){x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x,p.y+26*r);x.stroke()}
   else if(f.shape==='char'){x.font=`${11*dpr+r*3}px monospace`;x.fillText(p.ch,p.x,p.y)}
   else if(f.shape==='ring'){x.beginPath();x.arc(p.x,p.y,7*r+3,0,7);x.stroke()}
   else if(f.shape==='diamond'){x.beginPath();x.moveTo(p.x,p.y-5*r);x.lineTo(p.x+3.5*r,p.y);x.lineTo(p.x,p.y+5*r);x.lineTo(p.x-3.5*r,p.y);x.fill()}
   else if(f.shape==='square'){x.fillRect(p.x,p.y,5*r,5*r)}
   else{x.beginPath();x.arc(p.x,p.y,(f.shape==='ember'?1.7:1.3)*r,0,7);x.fill()}}
  x.globalAlpha=1;requestAnimationFrame(tick)}
 addEventListener('resize',()=>{size();seed()});size();seed();requestAnimationFrame(tick);
 return{set(I){if(I===cfg)return;cfg=I;seed()}}})();
// ---------- hub ----------
function focusHTML(m){const t=BY[m],I=ID[m],ti=titles(m);
 return`${emblem(m)}<div class="eyebrow">Tier ${t.tier} · ${esc(t.tierName)}</div><h2>${esc(t.team)}</h2><div class="gm">${esc(t.manager)} · @${esc(t.handle)}</div><div class="motto">${esc(I.motto)}</div>
 <div class="chips"><span class="chip">Reg. season <b>${t.reg[0]}-${t.reg[1]}</b></span><span class="chip">Titles <b>${ti.length}</b></span><span class="chip">Title odds <b>${esc(t.mc.champ)}</b></span></div>
 <button class="enter" data-enter="${m}">Enter franchise</button>`}
function renderHub(){view='hub';theme(focus);
 app.innerHTML=`<div class="hub"><header><div><div class="eyebrow">The Cinematic Universe</div><h1>NYC Dynasty League</h1></div><div class="yr">YEAR FIVE<br>2026</div></header>
 <div class="stage"><div class="focus" id="focus" aria-live="polite">${focusHTML(focus)}</div>
 <div class="rail" role="listbox" aria-label="Franchises">${TEAMS.map((t,i)=>`<button class="tile ${t.manager===focus?'on':''}" role="option" data-m="${t.manager}" style="--tp:${ID[t.manager].p};animation-delay:${.05*i}s" aria-label="${esc(t.team)}, ${esc(t.manager)}">${emblem(t.manager,{still:1})}<span>${esc(t.manager)}</span></button>`).join('')}</div></div>
 <footer>Tap a crest to preview, tap again or press Enter franchise to go in. Rosters: Sleeper snapshot ${DATA.meta.snapshot.slice(0,10)}. History, tiers, odds and rivalries: ${esc(DATA.meta.playbook)}. No 2026 in-season results are included.</footer></div>`}
function setFocus(m){if(m===focus)return;focus=m;theme(m);$('#focus').innerHTML=focusHTML(m);$$('.tile').forEach(b=>b.classList.toggle('on',b.dataset.m===m))}
// ---------- franchise ----------
function starCards(t){const m=t.manager;let list=t.core.map(c=>({...c}));
 if(m==='Vaibhav')for(const n of['Justin Herbert','Aidan Hutchinson']){const r=t.roster.find(p=>p.n===n);if(r)list.push({n,p:r.p})}
 const mx=Math.max(...TEAMS.flatMap(x=>x.core.map(c=>c.ktc)));
 return`<div class="stars ${list.length>4?'six':''}">${list.map((c,i)=>{const r=t.roster.find(p=>p.n===c.n),sp=c.n.split(' '),fn=sp.shift(),ln=sp.join(' ');
  return`<button class="card rv" style="--d:${i*.09}s" aria-label="${esc(c.n)}"><div class="num">${r&&r.num!=null?r.num:''}</div><div class="pos">${c.p}${r?' · '+r.t:''}</div><div class="fn">${esc(fn)}</div><div class="ln">${esc(ln)}</div>${EPITHET[c.n]&&m==='Vaibhav'?`<div class="ep">${EPITHET[c.n]}</div>`:''}
  <div class="meta">${r?`Age ${r.age} · Year ${r.exp+1}`:'Not on Sept 8 roster snapshot'}${c.ktc?`<br>Dynasty value ${c.ktc.toLocaleString()}<i><u style="--w:${(100*c.ktc/mx).toFixed(0)}%"></u></i>`:''}</div></button>`}).join('')}</div>`}
function rivalCards(t){return`<div class="rivals">${t.rivals.map((r,i)=>{const o=BY[r.opp],tot=r.rec[0]+r.rec[1];
 return`<button class="rival rv" data-go="${r.opp}" style="--rp:${ID[r.opp].p};--d:${i*.06}s">${emblem(r.opp,{still:1})}<div><span class="tag ${r.tag[0]==='M'?'mq':''}">${r.tag}</span> <span class="who">· Wk ${esc(r.wk)}</span><h4>${esc(o.team)}</h4><div class="who">${esc(r.opp)}</div>
 <div class="rec">${r.rec[0]}–${r.rec[1]}<span class="bar"><u style="width:${tot?100*r.rec[0]/tot:0}%"></u></span></div><div class="split">REG ${r.split[0]}-${r.split[1]} · CHAMP ${r.split[2]}-${r.split[3]} · TOILET ${r.split[4]}-${r.split[5]}</div><p>${esc(r.blurb)}</p></div></button>`}).join('')}</div>`}
function historyHTML(t){const m=t.manager;
 const yrs=DATA.history.map((h,i)=>{let res='',hit=false;if(h.champ===m){res='Champion · '+h.champRec;hit=true}else if(h.runner===m){res='Runner-up';hit=true}else if(h.last===m){res='Toilet bowl · '+h.lastRec;hit=true}
  return`<div class="yr rv ${hit?'hit':''}" style="--d:${i*.08}s"><div class="y">${h.y}</div><div class="res">${res||'&nbsp;'}</div><p>${hit?esc(h.champ===m||h.runner===m?`Final: ${BY[h.champ].manager} def. ${h.runner}, ${h.score}.`:`Punishment: ${h.punish}.`):''}</p><div class="lg">League champion: ${esc(h.champ)} (${h.champRec}) · Final ${h.score}</div></div>`}).join('');
 const opp=Object.entries(DATA.h2h[m]).sort((a,b)=>b[1][0]/(b[1][0]+b[1][1])-a[1][0]/(a[1][0]+a[1][1]));
 const led=opp.map(([o,v])=>{const tot=v[0]+v[1];return`<button class="lrow" data-row><span class="nm">${o}</span><span class="bar"><u style="--w:${100*v[0]/tot}%"></u><u class="l" style="--w:${100*v[1]/tot}%"></u></span><span class="r">${v[0]}–${v[1]}</span><span class="dt">Regular season ${v[2]}-${v[3]} · Postseason brackets ${v[4]}-${v[5]} · vs ${esc(BY[o].team)}</span></button>`}).join('');
 return`<div class="tl">${yrs}</div><ul class="moments rv">${(MOMENTS[m]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <h3 class="serif" style="margin:30px 0 2px;font-size:22px;letter-spacing:.06em">All-time ledger, 2022–2025</h3><div class="sub" style="opacity:.65;font-size:15px">Record against every other manager, both brackets included. Tap a row for the split.</div><div class="ledger rv">${led}</div>
 <h3 class="serif" style="margin:30px 0 2px;font-size:22px;letter-spacing:.06em">2026 preseason outlook</h3><div class="sub" style="opacity:.65;font-size:15px">150,000-trial Monte Carlo from the Playbook, offense and flex only. Run before Week 1; not updated for in-season results.</div>
 <div class="odds rv"><div><b>${esc(t.mc.playoff)}</b><span>Playoff odds</span></div><div><b>${esc(t.mc.champ)}</b><span>Title odds</span></div><div><b>${t.sos.rank} of 12</b><span>Schedule difficulty</span></div><div><b>${t.luck>0?'+':''}${t.luck}</b><span>Luck index 22–25</span></div></div>`}
let rf={pos:'ALL',st:'ALL',q:''};
function rosterList(t){const L=t.roster.filter(p=>(rf.pos==='ALL'||p.p===rf.pos)&&(rf.st==='ALL'||p.s===rf.st)&&(!rf.q||p.n.toLowerCase().includes(rf.q)));
 return`<div class="count">${L.length} of ${t.roster.length} players</div><div class="ros">${L.map((p,i)=>`<div class="pl" style="animation-delay:${Math.min(i,20)*.015}s"><span class="ps">${p.p}</span><span class="n">${esc(p.n)}<small>${p.t}${p.num!=null?' · #'+p.num:''}${p.age?' · Age '+p.age:''}${p.exp!=null?' · Yr '+(p.exp+1):''}</small></span><span class="st ${p.s}">${p.s==='ir'?'IR':p.s}</span></div>`).join('')||'<div style="opacity:.6;padding:12px 0">No players match.</div>'}</div>`}
function rosterHTML(t){const pos=['ALL','QB','RB','WR','TE','K','DL','LB','DB'],st=[['ALL','All'],['starter','Starters'],['bench','Bench'],['taxi','Taxi'],['ir','IR']];
 return`<input class="search" id="q" type="search" placeholder="Search this roster" aria-label="Search roster" value="${esc(rf.q)}"><div class="filters" id="fpos">${pos.map(p=>`<button class="fbtn ${rf.pos===p?'on':''}" data-pos="${p}">${p}</button>`).join('')}</div><div class="filters" id="fst">${st.map(([k,l])=>`<button class="fbtn ${rf.st===k?'on':''}" data-st="${k}">${l}</button>`).join('')}</div><div id="rlist">${rosterList(t)}</div>`}
function renderFr(m){view=m;focus=m;theme(m);rf={pos:'ALL',st:'ALL',q:''};const t=BY[m],I=ID[m],ti=titles(m),i=TEAMS.indexOf(t),pv=TEAMS[(i+11)%12].manager,nx=TEAMS[(i+1)%12].manager;
 const fin=DATA.history.filter(h=>h.champ===m||h.runner===m).length;
 app.innerHTML=`<div class="fr"><div class="nav"><button class="back" data-hub>← Hub</button><div class="tabs"><a href="#stars" data-sec="stars">Stars</a><a href="#rivals" data-sec="rivals">Rivals</a><a href="#history" data-sec="history">History</a><a href="#roster" data-sec="roster">Roster</a></div><button class="pn" data-go="${pv}" aria-label="Previous franchise">‹</button><button class="pn" data-go="${nx}" aria-label="Next franchise">›</button></div>
 <div class="hero">${glyphOnly(m)}${emblem(m)}<div class="eyebrow" style="position:relative">Tier ${t.tier} · ${esc(t.tierName)}</div><h1>${esc(t.team)}</h1><div class="gm">${esc(t.manager)} · @${esc(t.handle)}</div><div class="motto">${esc(I.motto)}</div>${m==='Vaibhav'?'<button class="watch" data-cine>▶ Watch the cinematic</button>':''}</div>
 <div class="strip rv"><div><b>${t.reg[0]}-${t.reg[1]}</b><span>Reg. season 22–25</span></div><div><b>${pct(t.reg[0],t.reg[1])}</b><span>Win rate</span></div><div><b>${ti.length}</b><span>Titles${ti.length?' · '+ti.map(y=>"'"+String(y).slice(2)).join(' '):''}</span></div><div><b>${fin}</b><span>Finals</span></div><div><b>${t.proj}${['th','st','nd','rd'][t.proj<4?t.proj:0]}</b><span>Commish projection</span></div></div>
 <section id="stars"><h3>The Stars</h3><div class="sub">Core dynasty assets named in the Playbook${m==='Vaibhav'?', plus the two other faces of the cinematic':''}. Jersey, team and age from the Sept 8 Sleeper snapshot.</div>${starCards(t)}
 <div class="scout rv"><div><small>CURRENT STRENGTH</small>${esc(t.strength)}</div><div><small>ROSTER NOTES</small>${esc(t.notes)}<br><span style="opacity:.6;font-size:14px">${t.projPts} projected offense + flex points · ${t.ktc.toLocaleString()} KTC dynasty value (preseason)</span></div></div></section>
 <section id="rivals"><h3>The Rivals</h3><div class="sub">The ${t.rivals.length} rivalries that define ${esc(t.manager)}'s 2026 schedule. All-time records run through 2025. Tap a rival to cross into their franchise.</div>${rivalCards(t)}</section>
 <section id="history"><h3>The History</h3><div class="sub">Four completed seasons. Highlighted years are the ones where this franchise reached the final or the bottom of the toilet bowl.</div>${historyHTML(t)}</section>
 <section id="roster"><h3>The Roster</h3><div class="sub">${t.roster.length} players as of the ${DATA.meta.snapshot.slice(0,10)} Sleeper snapshot. Moves made since then are not reflected.</div><div id="rwrap">${rosterHTML(t)}</div></section>
 <footer style="margin-top:40px">Sources: Sleeper league ${DATA.meta.leagueId} snapshot (${DATA.meta.snapshot.slice(0,10)}); ${esc(DATA.meta.playbook)}. Crests, colors and mottos are original designs for this project. Player portraits are intentionally replaced by jersey numerals.</footer></div>`;
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});$$('.rv').forEach(e=>io.observe(e));
 $('#q').addEventListener('input',e=>{rf.q=e.target.value.trim().toLowerCase();$('#rlist').innerHTML=rosterList(t)})}
// ---------- navigation ----------
function go(m,ev){const r=ev&&ev.target.closest&&ev.target.closest('button');let x=innerWidth/2,y=innerHeight/2;if(r){const b=r.getBoundingClientRect();x=b.left+b.width/2;y=b.top+b.height/2}
 theme(m==='hub'?focus:m);iris.style.setProperty('--ix',x+'px');iris.style.setProperty('--iy',y+'px');iris.className='';void iris.offsetWidth;iris.className='go';
 setTimeout(()=>{m==='hub'?renderHub():renderFr(m);scrollTo(0,0);try{history.replaceState(null,'','#'+(m==='hub'?'hub':ID[m].slug))}catch(e){location.hash=m==='hub'?'hub':ID[m].slug}iris.className='go out';setTimeout(()=>iris.className='',720)},620)}
app.addEventListener('click',e=>{const q=s=>e.target.closest(s);let b;
 if(b=q('.tile')){b.dataset.m===focus?go(focus,e):setFocus(b.dataset.m);return}
 if(b=q('[data-enter]'))return go(b.dataset.enter,e);
 if(b=q('[data-hub]'))return go('hub',e);
 if(b=q('[data-go]'))return go(b.dataset.go,e);
 if(b=q('[data-sec]')){e.preventDefault();$('#'+b.dataset.sec).scrollIntoView({behavior:'smooth'});return}
 if(b=q('[data-row]')){b.classList.toggle('open');return}
 if(b=q('[data-pos]')){rf.pos=b.dataset.pos;$$('#fpos .fbtn').forEach(x=>x.classList.toggle('on',x===b));$('#rlist').innerHTML=rosterList(BY[view]);return}
 if(b=q('[data-st]')){rf.st=b.dataset.st;$$('#fst .fbtn').forEach(x=>x.classList.toggle('on',x===b));$('#rlist').innerHTML=rosterList(BY[view]);return}
 if(b=q('.card')){b.classList.remove('in');void b.offsetWidth;b.classList.add('in');return}
 if(q('[data-cine]'))openCine()});
app.addEventListener('mouseover',e=>{const b=e.target.closest('.tile');if(b&&matchMedia('(hover:hover)').matches)setFocus(b.dataset.m)});
addEventListener('keydown',e=>{if($('#cine').classList.contains('open')){if(e.key==='Escape')closeCine();return}
 if(e.target.tagName==='INPUT')return;const i=TEAMS.indexOf(BY[focus]);
 if(view==='hub'){if(e.key==='ArrowRight')setFocus(TEAMS[(i+1)%12].manager);else if(e.key==='ArrowLeft')setFocus(TEAMS[(i+11)%12].manager);else if(e.key==='ArrowDown')setFocus(TEAMS[(i+4)%12].manager);else if(e.key==='ArrowUp')setFocus(TEAMS[(i+8)%12].manager);else if(e.key==='Enter'&&document.activeElement.tagName!=='BUTTON')go(focus)}
 else{if(e.key==='Escape')go('hub');else if(e.key==='ArrowRight')go(TEAMS[(i+1)%12].manager);else if(e.key==='ArrowLeft')go(TEAMS[(i+11)%12].manager)}});
// ---------- cinematic modal ----------
let cineOn=false,cineT0=0,texReady=false;const au=$('#au'),cc=$('#cine canvas'),cx=cc.getContext('2d');
function openCine(){$('#cine').classList.add('open');if(!texReady){CINE.initTex();texReady=true}cineOn=true;cineT0=performance.now();try{au.currentTime=0;au.play().catch(()=>{})}catch(e){}requestAnimationFrame(cineLoop)}
function cineLoop(){if(!cineOn)return;const t=!au.paused&&au.currentTime>0?au.currentTime:(performance.now()-cineT0)/1000;if(t>=CINE.DUR){CINE.render(cx,CINE.DUR-.01);cineOn=false;$('#cine .hint').textContent='Tap to replay';return}CINE.render(cx,t);requestAnimationFrame(cineLoop)}
function closeCine(){cineOn=false;au.pause();$('#cine').classList.remove('open')}
$('#cine .x').onclick=closeCine;cc.onclick=()=>{if(!cineOn){$('#cine .hint').textContent='The Pantheon · franchise cinematic';openCine()}};
// ---------- boot ----------
document.fonts.ready.then(()=>{const h=location.hash.slice(1),m=Object.keys(ID).find(k=>ID[k].slug===h);m?renderFr(m):renderHub()});
addEventListener('hashchange',()=>{const h=location.hash.slice(1),m=Object.keys(ID).find(k=>ID[k].slug===h);if(m&&view!==m){renderFr(m);scrollTo(0,0)}else if(!m&&view!=='hub'&&(h===''||h==='hub')){renderHub();scrollTo(0,0)}});
