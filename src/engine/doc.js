// Season documentary renderer. Data-driven: DOC = {dur, chapters:[{t0,dur,theme,roman,title,beats:[...]}]} built by scripts/build_documentary.py
// from site/data/canonical.json. Uses the franchise themes as chapter backdrops. Loaded after core.js and themes.js; replaces render().
function setTheme(n){T=THEMES[n];if(!T._a){T._a=noiseTex(61,256,...T.tint1,1.6);T._b=noiseTex(73,256,...T.tint2,1.3)}TEX.a=T._a;TEX.b=T._b;GLY=T._g||(T._g=T.glyph.map(g=>({...g,p:new Path2D(g.d)})))}
function emb(ctx,theme,x,y,size,p){const k=T,g=GLY;setTheme(theme);emblem(ctx,x,y,size,p,1);T=k;GLY=g;TEX.a=k._a;TEX.b=k._b}
const COL=(c)=>({pale:T.pale,hi:T.hi,txt:T.txt,mid:T.mid}[c||'pale']);
const BEAT={
 line(ctx,b,lt){const p=seg(lt,b.at,b.at+.45)*(b.until?1-seg(lt,b.until-.3,b.until):1);if(p<=0)return;ctx.save();ctx.globalAlpha=p;ctx.shadowColor='#000';ctx.shadowBlur=24;
  const f=b.font==='sans'?`600 %px ${SANS}`:`${T.dw} %px ${T.disp}`,sz=(b.size||46)*(b.font==='sans'?1:(T.lineScale||1)),fs=fit(ctx,b.text,f,sz,b.max||1640,b.ls??10);
  text(ctx,b.text,(b.x??W/2)+(1-eo(p))*(b.align==='left'?-40:0),b.y+(1-eo(p))*14,f.replace('%',fs),COL(b.color),mix((b.ls??10)+10,b.ls??10,eo(seg(lt,b.at,b.at+1.5))),b.align);ctx.restore()},
 stat(ctx,b,lt){const p=seg(lt,b.at,b.at+.4);if(p<=0)return;const cu=eo(seg(lt,b.at,b.at+1.1)),v=b.v==null?b.text:(b.pre||'')+(b.v*cu).toFixed(b.dec??1)+(b.suf||'');
  ctx.save();ctx.globalAlpha=p;ctx.shadowColor=T.glow;ctx.shadowBlur=26;text(ctx,v,b.x,b.y,`600 ${b.size||150}px ${SANS}`,T.hi,2);ctx.shadowColor='#000';ctx.shadowBlur=16;
  text(ctx,b.label,b.x,b.y+52,`600 28px ${SANS}`,T.pale,8);if(b.sub)text(ctx,b.sub,b.x,b.y+92,`600 24px ${SANS}`,T.txt,5);ctx.restore()},
 emblem(ctx,b,lt){const p=seg(lt,b.at,b.at+1.4);if(p<=0)return;emb(ctx,b.theme,b.x,b.y,b.size,eio(p))},
 bars(ctx,b,lt){const mx=Math.max(...b.items.map(i=>i.v)),mn=b.floor??0;b.items.forEach((it,i)=>{const a=b.at+i*.22,p=eo(seg(lt,a,a+.8));if(p<=0)return;const y=b.y+i*b.row,w=(it.v-mn)/(mx-mn)*b.w*p;
  ctx.save();ctx.globalAlpha=seg(lt,a,a+.3);ctx.shadowColor='#000';ctx.shadowBlur=12;text(ctx,it.label,b.x-24,y+b.row*.42,`600 ${it.hi?32:28}px ${SANS}`,it.hi?T.hi:T.pale,4,'right');ctx.shadowBlur=0;
  ctx.fillStyle=it.hi?T.hi:'rgba(255,255,255,.28)';if(it.hi){ctx.shadowColor=T.glow;ctx.shadowBlur=22}ctx.fillRect(b.x,y,w,b.row*.52);ctx.shadowBlur=0;
  text(ctx,(it.v*p).toFixed(1)+(it.note?'   '+it.note:''),b.x+w+18,y+b.row*.42,`600 28px ${SANS}`,it.hi?T.hi:T.txt,3,'left');ctx.restore()})},
 cols(ctx,b,lt){const mx=Math.max(...b.items.map(i=>i.v)),bw=b.w/b.items.length;b.items.forEach((it,i)=>{const a=b.at+i*.13,p=eo(seg(lt,a,a+.7));if(p<=0)return;const h=Math.max(4,it.v/mx*b.h*p),x=b.x+i*bw;
  ctx.save();ctx.globalAlpha=seg(lt,a,a+.3);ctx.fillStyle=it.hi?T.pale:T.hi;ctx.shadowColor=T.glow;ctx.shadowBlur=it.hi?26:10;ctx.fillRect(x+bw*.16,b.y-h,bw*.68,h);ctx.shadowColor='#000';ctx.shadowBlur=10;
  text(ctx,(it.pre||'+')+(it.v*p).toFixed(1),x+bw/2,b.y-h-12,`600 24px ${SANS}`,it.hi?T.pale:T.hi,1);text(ctx,it.label,x+bw/2,b.y+32,`600 22px ${SANS}`,T.txt,3);ctx.restore()})},
 dots(ctx,b,lt){[...b.seq].forEach((r,i)=>{const a=b.at+i*.16,p=eoe(seg(lt,a,a+.35));if(p<=0)return;const x=b.x+(i-(b.seq.length-1)/2)*b.gap;ctx.save();ctx.globalAlpha=p;ctx.beginPath();ctx.arc(x,b.y,b.r*(1.5-p*.5),0,7);
  if(r==='W'){ctx.fillStyle=T.hi;ctx.shadowColor=T.glow;ctx.shadowBlur=20;ctx.fill()}else{ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=3;ctx.stroke()}
  ctx.shadowBlur=0;text(ctx,r,x,b.y+b.r*.36,`600 ${b.r}px ${SANS}`,r==='W'?'#000':'rgba(255,255,255,.6)',0);ctx.restore()})},
 jerseys(ctx,b,lt){b.players.forEach((pl,i)=>{const a=b.at+i*(b.step||.9),p=eoe(seg(lt,a,a+.5));if(p<=0)return;const x=b.x+(i-(b.players.length-1)/2)*b.gap;
  ctx.save();ctx.translate(x,b.y-(1-p)*60);ctx.scale(b.sc*(1.2-p*.2),b.sc*(1.2-p*.2));ctx.globalAlpha=p;jersey(ctx,pl,seg(lt,a+.2,a+1.3),false);ctx.restore();
  ctx.save();ctx.globalAlpha=seg(lt,a+.2,a+.6);ctx.shadowColor='#000';ctx.shadowBlur=14;text(ctx,(pl.ppg*eo(seg(lt,a+.2,a+1.1))).toFixed(1),x,b.y+b.sc*330+62,`600 64px ${SANS}`,T.hi,2);
  text(ctx,pl.cap,x,b.y+b.sc*330+100,`600 24px ${SANS}`,T.pale,5);text(ctx,pl.cap2,x,b.y+b.sc*330+134,`600 22px ${SANS}`,T.txt,4);ctx.restore()})},
 dim(ctx,b,lt){const p=seg(lt,b.at,b.at+.6);if(p>0){ctx.fillStyle=`rgba(2,2,5,${p*(b.a||.8)})`;ctx.fillRect(0,0,W,H)}},
 grid(ctx,b,lt){b.teams.forEach((tm,i)=>{const a=b.at+i*.16,p=eoe(seg(lt,a,a+.5));if(p<=0)return;const c=i%6,r=Math.floor(i/6),x=W/2+(c-2.5)*270,y=b.y+r*310;
  ctx.save();ctx.globalAlpha=p;emb(ctx,tm.theme,x,y-(1-p)*30,150,1);ctx.shadowColor='#000';ctx.shadowBlur=12;const f=`600 %px ${SANS}`;text(ctx,tm.name,x,y+112,f.replace('%',fit(ctx,tm.name,f,26,250,3)),r?T.txt:T.pale,3);
  text(ctx,tm.rec,x,y+146,`600 28px ${SANS}`,r?T.txt:T.hi,3);ctx.restore()});
  const lp=eo(seg(lt,b.at+2.4,b.at+3.2));if(lp>0){ctx.save();ctx.strokeStyle=T.hi;ctx.lineWidth=2;ctx.setLineDash([14,10]);ctx.shadowColor=T.glow;ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(W/2-lp*820,b.y+200);ctx.lineTo(W/2+lp*820,b.y+200);ctx.stroke();ctx.setLineDash([]);
   ctx.globalAlpha=lp;text(ctx,'THE PLAYOFF LINE',W/2,b.y+190,`600 22px ${SANS}`,T.hi,10);ctx.restore()}}
};
function render(ctx,t){
  t=cl(t,0,DOC.dur-1e-6);const f=Math.round(t*FPS);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.setLineDash([]);ctx.letterSpacing='0px';ctx.textBaseline='alphabetic';
  const ch=DOC.chapters.find(c=>t>=c.t0&&t<c.t0+c.dur)||DOC.chapters[DOC.chapters.length-1],lt=t-ch.t0;setTheme(ch.theme);
  const z=1+seg(lt,0,ch.dur)*.07;ctx.save();ctx.translate(W/2,H*.56);ctx.scale(z,z);ctx.translate(-W/2,-H*.56);T.scene(ctx,t,.85,0);ctx.restore();
  ctx.fillStyle=`rgba(2,2,5,${ch.dim??.62})`;ctx.fillRect(0,0,W,H);T.fx(ctx,t,.6);
  if(ch.title){const p=seg(lt,.15,.7);ctx.save();ctx.globalAlpha=p;ctx.shadowColor='#000';ctx.shadowBlur=18;text(ctx,ch.roman+'   ·   '+ch.title,W/2,214,`600 30px ${SANS}`,T.hi,mix(26,16,eo(seg(lt,.15,2))));ctx.fillStyle=T.mid;ctx.fillRect(W/2-eo(p)*210,232,eo(p)*420,2);ctx.restore()}
  for(const b of ch.beats)BEAT[b.type](ctx,b,lt);
  const wf=Math.max(1-seg(lt,0,.3),0);if(wf>0&&ch.t0>0){ctx.fillStyle=`rgba(${T.wipe||'255,244,222'},${wf*wf*.85})`;ctx.fillRect(0,0,W,H)}
  const out=seg(lt,ch.dur-.25,ch.dur);if(out>0){ctx.fillStyle=`rgba(0,0,0,${out*.9})`;ctx.fillRect(0,0,W,H)}
  const fi=1-seg(t,0,.8);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}const fo=seg(t,DOC.dur-1.2,DOC.dur-.1);if(fo>0){ctx.fillStyle=`rgba(0,0,0,${fo})`;ctx.fillRect(0,0,W,H)}
  post(ctx,t,f)}
