// Season documentary, second edition. DOC2 = {dur, beat, bar, titles, shots:[{t0,dur,type,theme,...}]} is built by scripts/build_documentary2.py
// from the site's own data files, so the film re-cuts itself every time the data changes. Loaded after core.js and themes.js; replaces render().
// Every shot moves: the backdrop pushes in and drifts, each cut lands on a bar with a flash and a shake, numbers count, lines draw.
TITLES=DOC2.titles||{};
function setTheme(n){CURT=n;T=THEMES[n];if(!T._a){T._a=noiseTex(61,256,...T.tint1,1.6);T._b=noiseTex(73,256,...T.tint2,1.3)}TEX.a=T._a;TEX.b=T._b;GLY=T._g||(T._g=T.glyph.map(g=>({...g,p:new Path2D(g.d)})))}
function emb(ctx,theme,x,y,size,p,glow=1){const k=T,g=GLY,c=CURT;setTheme(theme);emblem(ctx,x,y,size,p,glow);T=k;GLY=g;CURT=c;TEX.a=k._a;TEX.b=k._b}
const HI=(theme)=>THEMES[theme].hi,pc=(x)=>x>.99?'>99%':x<.01?'<1%':Math.round(x*100)+'%';
const back=(x)=>{const c1=1.70158,c3=c1+1;return x>=1?1:1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}; // overshoot
function slam(ctx,s,x,y,font,size,color,p,ls=4,align){if(p<=0)return;const k=1+(1-eoe(p))*1.6;ctx.save();ctx.globalAlpha=Math.min(1,p*3);ctx.translate(x,y);ctx.scale(k,k);ctx.shadowColor='#000';ctx.shadowBlur=30;text(ctx,s,0,0,font.replace('%',size),color,ls,align);ctx.restore()}
function plate(ctx,x,y,w,h,a=.55,r=14){ctx.save();ctx.fillStyle=`rgba(6,9,16,${a})`;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.restore()}

const SHOT={
 // ---- cold open: twelve crests punch in on the eighth notes, then the title slams ----
 open(ctx,s,lt){const e8=DOC2.beat/2,n=s.teams.length,tb=DOC2.bar*2;
  s.teams.forEach((tm,i)=>{const p=seg(lt,i*e8,i*e8+.5);if(p<=0)return;const c=i%6,r=Math.floor(i/6),out=eio(seg(lt,tb-.1,tb+.5)),x=mix(W/2+(c-2.5)*270,W/2+(c-2.5)*300,out),y=mix(390+r*290,r?862:226,out),sz=mix(210,124,out)*back(seg(lt,i*e8,i*e8+.35));
   ctx.save();ctx.globalAlpha=1-out*.45;emb(ctx,tm.theme,x,y,sz,p,1.2);ctx.restore()});
  const q=seg(lt,tb,tb+.5);slam(ctx,'NYC DYNASTY LEAGUE',W/2,520,`400 %px ${BOLD}`,190,'#fff',q,10);
  const q2=seg(lt,tb+DOC2.beat,tb+DOC2.beat+.4);if(q2>0){ctx.save();ctx.globalAlpha=q2;ctx.fillStyle=T.hi;ctx.fillRect(W/2-eo(q2)*420,566,eo(q2)*840,4);text(ctx,s.sub,W/2,640+(1-eo(q2))*20,`600 46px ${SANS}`,T.hi,16);ctx.restore()}
  const q3=seg(lt,tb+DOC2.beat*3,tb+DOC2.beat*3+.4);if(q3>0){ctx.save();ctx.globalAlpha=q3;text(ctx,s.line,W/2,740,`600 40px ${SANS}`,'#dfe7f3',8);ctx.restore()}},
 // ---- the race: every franchise's playoff chance, drawn week by week ----
 race(ctx,s,lt){const x0=250,x1=1420,y0=250,y1=860,n=s.labels.length,X=(i)=>x0+(x1-x0)*i/(n-1),Y=(v)=>y1-(y1-y0)*v,prog=eio(seg(lt,.5,s.dur-2.0))*(n-1);
  slam(ctx,'THE RACE',W/2,214,`400 %px ${BOLD}`,64,'#fff',seg(lt,0,.4),12);
  ctx.save();ctx.globalAlpha=seg(lt,.1,.6);plate(ctx,x0-70,y0-26,1560,y1-y0+86,.6);
  for(const g of[0,.25,.5,.75,1]){ctx.strokeStyle=g===.5?'rgba(255,255,255,.5)':'rgba(255,255,255,.14)';ctx.lineWidth=g===.5?2:1;ctx.setLineDash(g===.5?[10,10]:[]);ctx.beginPath();ctx.moveTo(x0,Y(g));ctx.lineTo(x1,Y(g));ctx.stroke();ctx.setLineDash([]);text(ctx,Math.round(g*100)+'%',x0-16,Y(g)+8,`600 22px ${SANS}`,'#9fb0c8',1,'right')}
  s.labels.forEach((l,i)=>{const on=i<=prog+.01;text(ctx,l,X(i),y1+44,`600 ${on?26:22}px ${SANS}`,on?'#fff':'#6f809a',2)});
  const wi=Math.min(n-1,Math.floor(prog+.001));ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(X(prog)-2,y0,4,y1-y0);ctx.restore();
  const ends=s.lines.map((ln)=>{const i=Math.min(n-2,Math.floor(prog)),f=prog-i,v=prog>=n-1?ln.v[n-1]:mix(ln.v[i],ln.v[i+1],f);return {ln,v,y:Y(v)}});
  for(const e of ends){const ln=e.ln;ctx.save();ctx.strokeStyle=HI(ln.theme);ctx.lineWidth=ln.top?5:3;ctx.globalAlpha=(ln.top?1:.55)*seg(lt,.3,.7);ctx.lineJoin='round';ctx.shadowColor=HI(ln.theme);ctx.shadowBlur=ln.top?14:0;ctx.beginPath();ctx.moveTo(X(0),Y(ln.v[0]));
   for(let i=1;i<=Math.floor(prog);i++)ctx.lineTo(X(i),Y(ln.v[i]));ctx.lineTo(X(prog),e.y);ctx.stroke();ctx.beginPath();ctx.arc(X(prog),e.y,ln.top?9:6,0,7);ctx.fillStyle=HI(ln.theme);ctx.fill();ctx.restore()}
  // end labels, pushed apart so they never collide
  const so=[...ends].sort((a,b)=>a.y-b.y);let ly=-1e9;for(const e of so){e.ly=Math.max(e.y,ly+38);ly=e.ly}const over=ly-(y1+10);if(over>0)for(const e of so)e.ly-=over*((e.ly-so[0].ly)/Math.max(1,ly-so[0].ly));
  const la=seg(lt,.6,1.1);for(const e of so){ctx.save();ctx.globalAlpha=la;const lx=1470;ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(prog)+12,e.y);ctx.lineTo(lx-8,e.ly-8);ctx.stroke();
   text(ctx,e.ln.name,lx,e.ly,`600 30px ${SANS}`,HI(e.ln.theme),2,'left');text(ctx,pc(e.v),lx+250,e.ly,`600 30px ${SANS}`,'#fff',1,'right');ctx.restore()}
  const q=seg(lt,s.dur-1.7,s.dur-1.3);if(q>0){ctx.save();ctx.globalAlpha=q;text(ctx,s.note,x0+(x1-x0)/2,y0+10,`600 30px ${SANS}`,'#ffd24a',6);ctx.restore()}},
 // ---- one week: the headline game, the week's MVP, the swing in the race ----
 week(ctx,s,lt){const d=s.dur,A=s.a,B=s.b,t1=d*.11,t2=d*.42,t3=d*.6;
  const big=seg(lt,0,.3),mv=eio(seg(lt,t1,t1+.35));ctx.save();const sz=mix(330,92,mv),x=mix(W/2,250,mv),y=mix(600,238,mv);slam(ctx,'WEEK '+s.week,x,y,`400 %px ${BOLD}`,sz,'#fff',big,mix(18,6,mv));ctx.restore();
  const kq=seg(lt,t1+.2,t1+.5);if(kq>0){ctx.save();ctx.globalAlpha=kq;const kw=ctx.measureText?0:0;ctx.fillStyle=s.col;ctx.beginPath();ctx.roundRect(420,196,300,50,8);ctx.fill();text(ctx,s.kind,570,232,`600 30px ${SANS}`,'#0a1120',6);
   const f=`400 %px ${BOLD}`;text(ctx,s.head,760,240,f.replace('%',fit(ctx,s.head,f,70,1040,3)),'#fff',3,'left');ctx.restore()}
  // the duel: crests fly in from the wings, scores count up, the loser dims
  const cin=back(seg(lt,t1+.1,t1+.6)),cnt=eo(seg(lt,t1+.5,t1+1.5)),res=seg(lt,t1+1.5,t1+1.8);
  for(const[tm,sx,dir,win]of[[A,560,-1,A.s>B.s],[B,1360,1,B.s>A.s]]){const x=sx+dir*(1-cin)*900,dimm=win?1:1-res*.5;ctx.save();ctx.globalAlpha=Math.min(1,cin*2)*dimm;
   emb(ctx,tm.theme,x,470,mix(250,win?280:232,res),1,win?1+res:1);ctx.shadowColor='#000';ctx.shadowBlur=18;const f=`400 %px ${BOLD}`;text(ctx,tm.name,x,660,f.replace('%',fit(ctx,tm.name,f,62,520,3)),HI(tm.theme),3);
   text(ctx,tm.team,x,700,`600 26px ${SANS}`,'#b6c0d0',4);ctx.restore();
   ctx.save();ctx.globalAlpha=seg(lt,t1+.4,t1+.7)*dimm;ctx.shadowColor=win?HI(tm.theme):'#000';ctx.shadowBlur=win?30*res:14;text(ctx,(tm.s*cnt).toFixed(2),x,810,`400 ${win?mix(120,138,res):120}px ${BOLD}`,win?'#fff':'#c9d2e0',2);ctx.restore()}
  const vq=seg(lt,t1+.5,t1+.8);if(vq>0){ctx.save();ctx.globalAlpha=vq*(1-res);text(ctx,'VS',W/2,490,`400 80px ${BOLD}`,'#fff',6);ctx.globalAlpha=res;text(ctx,'FINAL',W/2,450,`600 30px ${SANS}`,'#ffd24a',10);text(ctx,'BY '+Math.abs(A.s-B.s).toFixed(2),W/2,510,`400 72px ${BOLD}`,'#fff',3);ctx.restore()}
  // lower third: the MVP on the left, the race swing on the right
  const mq=back(seg(lt,t2,t2+.45));if(mq>0&&s.mvp){ctx.save();ctx.globalAlpha=Math.min(1,mq*2);const bx=120-(1-mq)*300;plate(ctx,bx,846,780,84,.8,12);ctx.fillStyle='#ffd24a';ctx.fillRect(bx,846,8,84);
   ctx.save();ctx.translate(bx+62,890);ctx.scale(.085,.085);jersey(ctx,s.mvp,0,false);ctx.restore();text(ctx,'WEEK MVP',bx+112,878,`600 22px ${SANS}`,'#ffd24a',6,'left');
   const f=`400 %px ${BOLD}`,nm=s.mvp.name+(s.mvp.rank?'  ·  '+s.mvp.rank:'');text(ctx,nm,bx+112,920,f.replace('%',fit(ctx,nm,f,40,500,2)),'#fff',2,'left');text(ctx,(s.mvp.pts*eo(seg(lt,t2+.2,t2+1))).toFixed(1),bx+760,912,`400 60px ${BOLD}`,'#ffd24a',1,'right');ctx.restore()}
  const sq=back(seg(lt,t3,t3+.45));if(sq>0&&s.swing){ctx.save();ctx.globalAlpha=Math.min(1,sq*2);const bx=1020+(1-sq)*300,sw=s.swing,up=sw.to>sw.from,cu=eio(seg(lt,t3+.3,t3+1.3)),v=mix(sw.from,sw.to,cu),col=up?'#57e39a':'#ff6b6b';plate(ctx,bx,846,780,84,.8,12);ctx.fillStyle=col;ctx.fillRect(bx,846,8,84);
   text(ctx,sw.name+"'S PLAYOFF CHANCE",bx+28,878,`600 22px ${SANS}`,col,5,'left');ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(bx+28,894,470,22);ctx.fillStyle=col;ctx.fillRect(bx+28,894,470*v,22);ctx.fillStyle='#fff';ctx.fillRect(bx+28+470*sw.from-2,888,4,34);
   text(ctx,pc(sw.from)+'  →  '+pc(v),bx+760,914,`400 50px ${BOLD}`,'#fff',1,'right');ctx.restore()}},
 // ---- the stars: the season's top scorers, with their rank at the position ----
 stars(ctx,s,lt){slam(ctx,'THE STARS',W/2,214,`400 %px ${BOLD}`,64,'#fff',seg(lt,0,.4),12);const n=s.players.length,st=(s.dur-2.2)/n;
  s.players.forEach((pl,i)=>{const a=.4+i*st,p=back(seg(lt,a,a+.5));if(p<=0)return;const x=W/2+(i-(n-1)/2)*340,cu=eo(seg(lt,a+.2,a+1.2));
   ctx.save();ctx.globalAlpha=Math.min(1,p*2);ctx.translate(x,500-(1-p)*420);ctx.rotate((1-p)*(i%2?-.5:.5));ctx.scale(.36,.36);jersey(ctx,pl,seg(lt,a+.2,a+1.3),false);ctx.restore();
   ctx.save();ctx.globalAlpha=seg(lt,a+.25,a+.6);ctx.shadowColor='#000';ctx.shadowBlur=14;const rk=seg(lt,a+.3,a+.6);ctx.fillStyle='#ffd24a';ctx.beginPath();ctx.roundRect(x-70,646,140,48,8);ctx.fill();text(ctx,pl.rank||pl.pos,x,682,`400 ${mix(60,40,eoe(rk))}px ${BOLD}`,'#0a1120',2);
   const f=`400 %px ${BOLD}`;text(ctx,pl.name,x,746,f.replace('%',fit(ctx,pl.name,f,42,320,2)),'#fff',2);text(ctx,(pl.pts*cu).toFixed(1),x,826,`400 76px ${BOLD}`,T.hi,1);text(ctx,'POINTS  ·  '+pl.mgr,x,862,`600 22px ${SANS}`,'#b6c0d0',4);ctx.restore()})},
 // ---- the line: the standings assemble, then the playoff line is drawn ----
 table(ctx,s,lt){slam(ctx,'THE LINE',W/2,206,`400 %px ${BOLD}`,60,'#fff',seg(lt,0,.4),12);const rh=54,x0=300,w=1320,y0=236;
  s.rows.forEach((r,i)=>{const a=.3+i*.12,p=back(seg(lt,a,a+.4));if(p<=0)return;const y=y0+i*rh+(i>=s.cut?16:0),x=x0+(1-p)*(i%2?500:-500);ctx.save();ctx.globalAlpha=Math.min(1,p*2);plate(ctx,x,y,w,rh-6,i<s.cut?.72:.5,8);ctx.fillStyle=HI(r.theme);ctx.fillRect(x,y,8,rh-6);
   text(ctx,String(i+1),x+48,y+35,`400 36px ${BOLD}`,'#fff',1);emb(ctx,r.theme,x+110,y+(rh-6)/2,44,1,.3);text(ctx,r.name,x+150,y+35,`400 36px ${BOLD}`,HI(r.theme),2,'left');text(ctx,r.team,x+400,y+33,`600 24px ${SANS}`,'#b6c0d0',2,'left');
   text(ctx,r.rec,x+820,y+35,`400 36px ${BOLD}`,'#fff',2);text(ctx,r.pf.toFixed(1),x+940,y+33,`600 26px ${SANS}`,'#dfe7f3',1);
   const bq=eo(seg(lt,a+.3,a+1.2));ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x+1020,y+17,200,14);ctx.fillStyle=i<s.cut?'#57e39a':'#9fb0c8';ctx.fillRect(x+1020,y+17,200*r.odds*bq,14);text(ctx,pc(r.odds*bq+(1-bq)*0),x+1300,y+34,`600 26px ${SANS}`,'#fff',1,'right');ctx.restore()});
  const lq=eo(seg(lt,2.2,3.0));if(lq>0){const y=y0+s.cut*rh+4;ctx.save();ctx.strokeStyle='#ff6b6b';ctx.lineWidth=4;ctx.setLineDash([16,10]);ctx.shadowColor='#ff6b6b';ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(W/2-lq*700,y);ctx.lineTo(W/2+lq*700,y);ctx.stroke();ctx.restore()}
  ctx.save();ctx.globalAlpha=seg(lt,.4,.8);text(ctx,'RECORD',x0+820,y0-8,`600 18px ${SANS}`,'#9fb0c8',4);text(ctx,'POINTS',x0+940,y0-8,`600 18px ${SANS}`,'#9fb0c8',4);text(ctx,'PLAYOFF CHANCE',x0+1160,y0-8,`600 18px ${SANS}`,'#9fb0c8',4);ctx.restore()},
 // ---- close: the crests circle, the countdown lands ----
 close(ctx,s,lt){const n=s.teams.length;s.teams.forEach((tm,i)=>{const p=seg(lt,i*.06,i*.06+.6),an=i/n*Math.PI*2+lt*.22,rx=760,ry=300;if(p<=0)return;const z=Math.sin(an);ctx.save();ctx.globalAlpha=p*(.45+.55*(z+1)/2);emb(ctx,tm.theme,W/2+Math.cos(an)*rx,540+z*ry,110+40*(z+1)/2,1,.6);ctx.restore()});
  plate(ctx,W/2-560,360,1120,360,.62,24);slam(ctx,s.big,W/2,520,`400 %px ${BOLD}`,170,'#fff',seg(lt,DOC2.beat*2,DOC2.beat*2+.5),8);
  const q=seg(lt,DOC2.beat*4,DOC2.beat*4+.4);if(q>0){ctx.save();ctx.globalAlpha=q;text(ctx,s.sub,W/2,606,`600 44px ${SANS}`,'#ffd24a',12);text(ctx,s.foot,W/2,672,`600 30px ${SANS}`,'#dfe7f3',10);ctx.restore()}}
};
function render(ctx,t){
  t=cl(t,0,DOC2.dur-1e-6);const f=Math.round(t*FPS);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.setLineDash([]);ctx.letterSpacing='0px';ctx.textBaseline='alphabetic';
  let si=DOC2.shots.length-1;for(let i=0;i<DOC2.shots.length;i++)if(t<DOC2.shots[i].t0+DOC2.shots[i].dur){si=i;break}const s=DOC2.shots[si],lt=t-s.t0;setTheme(s.theme);
  // camera: a steady push with a sideways drift (direction alternates per shot), a kick on every beat, a shake on every cut
  const bp=(t/DOC2.beat)%1,kick=Math.exp(-bp*7)*.012,z=1.04+seg(lt,0,s.dur)*.12+kick,dx=(si%2?-1:1)*(seg(lt,0,s.dur)-.5)*90,R=rng(f*7+3),sh=Math.exp(-lt*8)*(si?18:0);
  ctx.save();ctx.translate(W/2+dx+(R()-.5)*sh,H*.56+(R()-.5)*sh);ctx.scale(z,z);ctx.translate(-W/2,-H*.56);T.scene(ctx,t,.9,0);ctx.restore();
  ctx.fillStyle=`rgba(3,4,9,${s.dim??.6})`;ctx.fillRect(0,0,W,H);T.fx(ctx,t,.7);
  ctx.save();ctx.translate((R()-.5)*sh*.6,(R()-.5)*sh*.6);SHOT[s.type](ctx,s,lt);ctx.restore();
  // cut: a hot flash and a streak wiping across
  if(si){const wf=1-seg(lt,0,.22);if(wf>0){ctx.fillStyle=`rgba(255,246,228,${wf*wf*.8})`;ctx.fillRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,W,0),c=1-wf;g.addColorStop(Math.max(0,c-.25),'rgba(255,255,255,0)');g.addColorStop(c,`rgba(255,255,255,${wf*.7})`);g.addColorStop(Math.min(1,c+.05),'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}}
  const fi=1-seg(t,0,.5);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}const fo=seg(t,DOC2.dur-1.4,DOC2.dur-.15);if(fo>0){ctx.fillStyle=`rgba(0,0,0,${fo})`;ctx.fillRect(0,0,W,H)}
  // progress rail: where we are in the season
  if(s.type==='week'){const n=DOC2.weeks,x0=W/2-n*26;ctx.save();for(let i=1;i<=n;i++){ctx.fillStyle=i<s.week?'rgba(255,255,255,.55)':i===s.week?'#ffd24a':'rgba(255,255,255,.18)';ctx.fillRect(x0+(i-1)*52,160,44,6)}ctx.restore()}
  post(ctx,t,f)}
