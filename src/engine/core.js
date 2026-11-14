// NYC Dynasty League — franchise cinematic engine. Deterministic: frame = render(ctx,t), t in seconds.
// CFG (injected by scripts/build_cinematics.py from site/data/canonical.json) = {theme, team, manager, sub, lines:[..3], players:[{f,l,num,pos,tm,ppg,pts,starts,nick,role,small}]}
// Timeline (45s): 0-6 intro · 6-12 season storyline · 12-36 player showcase · 36-41.2 roll call · 41.2-45 crest
// Second edition (CFG.v2): four acts cut on the music's beat grid. v2 = {beat, a2:[card starts.., end], cards:[{k,big,sub}], ps:[player starts.., end], c0, l0, payoff}
const V2=CFG.v2||null;
const W=1920,H=1080,DUR=V2&&V2.dur?V2.dur:45,FPS=30,NP_=CFG.players.length,P0=V2?V2.ps[0]:12,PD=24/NP_,C0=V2?V2.c0:36,L0=V2?V2.l0:41.2,A2=V2?V2.a2[0]:6;
const pStart=i=>V2?V2.ps[i]:P0+i*PD,pDur=i=>V2?V2.ps[i+1]-V2.ps[i]:PD;
const SERIF="'Cinzel',serif",SANS="'Barlow Condensed',sans-serif",TECH="'Orbitron',sans-serif",BOLD="'Bebas Neue',sans-serif";
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const seg=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, eoe=x=>x>=1?1:1-Math.pow(2,-10*x);
const mix=(a,b,x)=>a+(b-a)*x;
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
let T; // active theme

// ---------- procedural textures ----------
function noiseTex(seed,size,r,g,b,pow){
  const N=size,c=mk(N,N),x=c.getContext('2d'),im=x.createImageData(N,N),R=rng(seed);
  const oct=[];for(let o=0;o<5;o++){const n=4<<o,a=new Float32Array(n*n);for(let i=0;i<a.length;i++)a[i]=R();oct.push([n,a])}
  const sm=u=>u*u*(3-2*u);
  for(let y=0;y<N;y++)for(let X=0;X<N;X++){let v=0,amp=.5,tot=0;
    for(const[n,a]of oct){const fx=X/N*n,fy=y/N*n,x0=Math.floor(fx),y0=Math.floor(fy),u=sm(fx-x0),w=sm(fy-y0),x1=(x0+1)%n,y1=(y0+1)%n;
      v+=amp*mix(mix(a[y0*n+x0],a[y0*n+x1],u),mix(a[y1*n+x0],a[y1*n+x1],u),w);tot+=amp;amp*=.5}
    v=Math.pow(cl((v/tot-.28)/.5),pow);const i=(y*N+X)*4;im.data[i]=r;im.data[i+1]=g;im.data[i+2]=b;im.data[i+3]=v*255}
  x.putImageData(im,0,0);return c}
let TEX={};
function initTex(){
  T=THEMES[CFG.theme];
  TEX.c1=noiseTex(11,256,120,138,165,1.5);TEX.c2=noiseTex(29,256,70,84,110,1.2);TEX.c3=noiseTex(47,256,200,214,235,2.2);
  TEX.warm=noiseTex(83,256,201,153,90,1.8);
  TEX.a=noiseTex(61,256,...T.tint1,1.6);TEX.b=noiseTex(73,256,...T.tint2,1.3);
  TEX.grain=[1,2,3,4].map(s=>{const c=mk(256,256),x=c.getContext('2d'),im=x.createImageData(256,256),R=rng(900+s);
    for(let i=0;i<im.data.length;i+=4){const v=R()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}x.putImageData(im,0,0);return c});
}
function tile(ctx,tex,ox,oy,scale,alpha,comp){
  ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation=comp||'screen';ctx.imageSmoothingQuality='high';
  const s=256*scale;ox=((ox%s)+s)%s-s;oy=((oy%s)+s)%s-s;
  for(let x=ox;x<W;x+=s)for(let y=oy;y<H;y+=s)ctx.drawImage(tex,x,y,s+1,s+1);ctx.restore()}

// ---------- lightning ----------
function bolt(seed,x0,y0,x1,y1,disp){const R=rng(seed);let pts=[[x0,y0],[x1,y1]];
  for(let k=0;k<6;k++){const n=[];for(let i=0;i<pts.length-1;i++){const[a,b]=[pts[i],pts[i+1]];n.push(a,[(a[0]+b[0])/2+(R()-.5)*disp,(a[1]+b[1])/2+(R()-.5)*disp*.35])}n.push(pts[pts.length-1]);pts=n;disp*=.55}
  const br=[];for(let i=0;i<3;i++){const p=pts[8+Math.floor(R()*(pts.length-24))];br.push([p,[p[0]+(R()-.5)*420,p[1]+140+R()*220],R()*1e6|0])}
  return{pts,br}}
function strokeBolt(ctx,b,a,w,depth=0){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';ctx.lineCap='round';
  for(const[lw,al,bl,col]of[[w*5,.22,40,'#7fa8ff'],[w*2,.6,16,'#bcd4ff'],[w*.8,1,4,'#ffffff']]){
    ctx.globalAlpha=a*al;ctx.strokeStyle=col;ctx.shadowColor='#9cc0ff';ctx.shadowBlur=bl;ctx.lineWidth=lw;ctx.beginPath();
    b.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke()}
  ctx.restore();
  if(depth<1)for(const[p,q,s]of b.br)strokeBolt(ctx,{pts:bolt(s,p[0],p[1],q[0],q[1],120).pts,br:[]},a*.55,w*.5,1)}
const STRIKES=[{t:.95,b:null,a:[420,138,300,640,300],w:2.2},{t:2.35,b:null,a:[1040,138,930,560,360],w:3.4},{t:3.55,b:null,a:[1530,138,1650,700,300],w:2.4},{t:3.72,b:null,a:[700,138,820,520,260],w:2}];
function flashAt(t,list){let f=0;for(const s of list){const d=t-s.t;if(d>=0&&d<1.2){const fl=d<.08?1:d<.14?.25:d<.22?.85:Math.exp(-(d-.22)*5)*.6;f=Math.max(f,fl*(s.k||1))}}return f}

// ---------- shared bits ----------
function text(ctx,s,x,y,font,fill,ls,align){ctx.font=font;ctx.letterSpacing=(ls||0)+'px';ctx.textAlign=align||'center';ctx.fillStyle=fill;ctx.fillText(s,x,y);ctx.letterSpacing='0px'}
function metal(ctx,y0,y1){const g=ctx.createLinearGradient(0,y0,0,y1);[0,.28,.5,.62,1].forEach((s,i)=>g.addColorStop(s,T.metal[i]));return g}
function sky(ctx,stops,y0=0,y1=H){const g=ctx.createLinearGradient(0,y0,0,y1);for(const[s,c]of stops)g.addColorStop(s,c);ctx.fillStyle=g;ctx.fillRect(0,y0,W,y1-y0)}
function glowAt(ctx,x,y,r,rgb,a,comp){ctx.save();ctx.globalCompositeOperation=comp||'lighter';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore()}
function rain(ctx,t,a){if(a<=0)return;const R=rng(5);ctx.save();ctx.strokeStyle='rgba(190,205,230,1)';ctx.lineWidth=1.2;
  for(let i=0;i<260;i++){const x0=R()*2300-200,sp=1500+R()*900,ph=R(),len=40+R()*70,al=.05+R()*.14;const y=((ph+t*sp/1300)%1)*1300-100;
    ctx.globalAlpha=al*a;ctx.beginPath();ctx.moveTo(x0-y*.18,y);ctx.lineTo(x0-(y+len)*.18,y+len);ctx.stroke()}ctx.restore()}
function motes(ctx,t,a,seed,n,c1,c2,glow,speed=1,square=false){const R=rng(seed);ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){const x=R()*W,sp=(30+R()*90)*speed,ph=R(),sz=1+R()*2.6,sw=R()*6.28,al=.25+R()*.6;const p=(ph+t*sp/1100)%1,y=H-p*1100+40;
    ctx.globalAlpha=a*al*Math.sin(p*Math.PI);ctx.fillStyle=i%3?c1:c2;ctx.shadowColor=glow;ctx.shadowBlur=10;const xx=x+Math.sin(sw+t*1.3)*40;
    if(square)ctx.fillRect(xx,y,sz*2.4,sz*2.4);else{ctx.beginPath();ctx.arc(xx,y,sz,0,7);ctx.fill()}}ctx.restore()}
function post(ctx,t,f){
  const v=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*1.05);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.78)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.07;ctx.globalCompositeOperation='overlay';const g=TEX.grain[f%4],ox=(f*97)%256,oy=(f*53)%256;
  for(let x=-ox;x<W;x+=512)for(let y=-oy;y<H;y+=512)ctx.drawImage(g,x,y,512,512);ctx.restore();
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,138);ctx.fillRect(0,H-138,W,138)}

// ---------- emblem: ring + theme glyph + laurel ----------
const RING=new Path2D('M100 8a92 92 0 1 0 .01 0z'),RING2=new Path2D('M100 17a83 83 0 1 0 .01 0z');
let GLY;
function laurel(ctx,p){for(const sgn of[-1,1])for(let i=0;i<9;i++){if(i/9>p)break;const a=Math.PI/2+sgn*(.32+i*.2),r=75.5,x=100+Math.cos(a)*r,y=100+Math.sin(a)*r;
  ctx.save();ctx.translate(x,y);ctx.rotate(a+sgn*1.05);ctx.beginPath();ctx.ellipse(0,0,6.5,2.4,0,0,7);ctx.fill();ctx.restore()}}
function emblem(ctx,cx,cy,size,p,glow){
  GLY=GLY||T.glyph.map(g=>({...g,p:new Path2D(g.d)}));
  ctx.save();ctx.translate(cx-size/2,cy-size/2);ctx.scale(size/200,size/200);
  const draw=(path,a,b,len)=>{const q=seg(p,a,b);if(q<=0)return;ctx.setLineDash([len*q,len]);ctx.stroke(path)};
  ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=T.hi;ctx.shadowColor=T.glow;ctx.shadowBlur=18*glow;
  ctx.lineWidth=3;draw(RING,0,.45,580);ctx.lineWidth=1;draw(RING2,.1,.5,525);
  ctx.lineWidth=2.2;GLY.forEach((g,i)=>draw(g.p,.15+i*.03,.55+i*.03,420));
  const f=seg(p,.55,1);if(f>0){ctx.setLineDash([]);ctx.globalAlpha=f;ctx.shadowBlur=8*glow;
    for(const g of GLY){if(g.f==='ink'){ctx.fillStyle=T.ink;ctx.shadowBlur=0}else if(g.f==='hot'){ctx.fillStyle=T.hot;ctx.shadowColor=T.glow;ctx.shadowBlur=22*glow}else{ctx.fillStyle=metal(ctx,40,160);ctx.shadowColor=T.glow;ctx.shadowBlur=8*glow}
      ctx.fill(g.p,g.eo?'evenodd':'nonzero')}
    ctx.fillStyle=T.mid;ctx.shadowBlur=4;laurel(ctx,f)}
  ctx.restore()}

// ---------- jersey: original generic football jersey in the player's NFL team colours (no logos or uniform artwork) ----------
const NFL={ARI:['#97233F','#101010','#fff'],ATL:['#16181c','#A71930','#fff'],BAL:['#241773','#9E7C0C','#fff'],BUF:['#00338D','#C60C30','#fff'],CAR:['#0085CA','#101820','#fff'],CHI:['#0B162A','#C83803','#fff'],CIN:['#15171a','#FB4F14','#FB4F14'],CLE:['#311D00','#FF3C00','#fff'],
 DAL:['#041E42','#869397','#fff'],DEN:['#FB4F14','#002244','#fff'],DET:['#0076B6','#B0B7BC','#fff'],GB:['#203731','#FFB612','#fff'],HOU:['#03202F','#A71930','#fff'],IND:['#002C5F','#A2AAAD','#fff'],JAX:['#006778','#D7A22A','#fff'],KC:['#E31837','#FFB81C','#fff'],
 LV:['#141414','#A5ACAF','#C8CDD0'],LAC:['#0080C6','#FFC20E','#fff'],LAR:['#003594','#FFD100','#FFD100'],MIA:['#008E97','#FC4C02','#fff'],MIN:['#4F2683','#FFC62F','#fff'],NE:['#002244','#C60C30','#fff'],NO:['#16181c','#D3BC8D','#D3BC8D'],NYG:['#0B2265','#A71930','#fff'],
 NYJ:['#125740','#e9eeea','#fff'],PHI:['#004C54','#A5ACAF','#fff'],PIT:['#16181c','#FFB612','#fff'],SF:['#AA0000','#B3995D','#fff'],SEA:['#002244','#69BE28','#fff'],TB:['#D50A0A','#34302B','#fff'],TEN:['#0C2340','#4B92DB','#fff'],WAS:['#5A1414','#FFB612','#fff'],FA:['#2a2d34','#8d909b','#fff']};
const JP=new Path2D('M-150 -262 Q0 -222 150 -262 L252 -230 L374 -90 L288 -14 L228 -80 L228 292 Q0 320 -228 292 L-228 -80 L-288 -14 L-374 -90 L-252 -230 Z');
function jersey(ctx,pl,glint,full=true){const[c1,c2,c3]=NFL[pl.tm]||NFL.FA;
  ctx.save();ctx.shadowColor=T.glow;ctx.shadowBlur=full?46:20;ctx.fillStyle=c1;ctx.fill(JP);ctx.shadowBlur=0;ctx.clip(JP);
  const g=ctx.createLinearGradient(0,-270,0,310);g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(.35,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.5)');ctx.fillStyle=g;ctx.fillRect(-400,-280,800,620);
  const sd=ctx.createLinearGradient(-230,0,230,0);sd.addColorStop(0,'rgba(0,0,0,.45)');sd.addColorStop(.18,'rgba(0,0,0,0)');sd.addColorStop(.82,'rgba(0,0,0,0)');sd.addColorStop(1,'rgba(0,0,0,.45)');ctx.fillStyle=sd;ctx.fillRect(-230,-280,460,620);
  ctx.fillStyle=c2;for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(s*340,-128);ctx.lineTo(s*374,-90);ctx.lineTo(s*288,-14);ctx.lineTo(s*256,-50);ctx.fill();ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(s*318,-152);ctx.lineTo(s*330,-139);ctx.lineTo(s*246,-62);ctx.lineTo(s*236,-74);ctx.fill();ctx.globalAlpha=1}
  ctx.fillRect(-228,262,456,10);
  if(full){ctx.globalAlpha=.07;ctx.fillStyle='#000';for(let y=-250;y<300;y+=14)for(let x=-224+(y/14%2)*7;x<228;x+=14)ctx.fillRect(x,y,3,3);ctx.globalAlpha=1}
  ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle=c3;ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineJoin='round';
  const nm=pl.l.replace(/ (JR\.|SR\.|II|III|IV)$/,''),nf=`600 %px ${SANS}`,ns=fit(ctx,nm,nf,58,350,5);ctx.font=nf.replace('%',ns);ctx.letterSpacing='5px';ctx.lineWidth=5;ctx.strokeText(nm,2,-128);ctx.fillText(nm,2,-128);ctx.letterSpacing='0px';
  if(pl.num){ctx.font=`400 ${pl.num.length>1?330:350}px ${BOLD}`;ctx.lineWidth=14;ctx.strokeStyle=c2===c3?'rgba(0,0,0,.6)':c2;ctx.strokeText(pl.num,0,196);ctx.fillText(pl.num,0,196)}
  if(glint>0&&glint<1){const gx=-520+glint*1040,gg=ctx.createLinearGradient(gx,0,gx+200,120);gg.addColorStop(0,'rgba(255,255,255,0)');gg.addColorStop(.5,'rgba(255,255,255,.34)');gg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gg;ctx.fillRect(-400,-280,800,620)}
  ctx.restore();ctx.save();ctx.strokeStyle=c2;ctx.lineWidth=full?9:7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-150,-262);ctx.quadraticCurveTo(0,-222,150,-262);ctx.stroke();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.stroke(JP);ctx.restore()}

// ---------- acts ----------
function fit(ctx,s,font,size,max,ls=0){ctx.font=`${font.replace('%',size)}`;ctx.letterSpacing=ls+'px';const w=ctx.measureText(s).width;ctx.letterSpacing='0px';return w>max?size*max/w:size}
function sOpen(ctx,t){
  const fl=flashAt(t,STRIKES)*T.flashK+(t>=3.2?Math.exp(-(t-3.2)*5)*.9:0),z=1+eio(seg(t,0,6.2))*(T.zoom??.14);
  ctx.save();ctx.translate(W/2,H*.56);ctx.scale(z,z);ctx.translate(-W/2,-H*.56);T.scene(ctx,t,1,Math.min(1,fl));ctx.restore();
  if(fl>0&&!T.ownFlash){ctx.fillStyle=`rgba(${T.flash},${Math.min(1,fl)*.22})`;ctx.fillRect(0,0,W,H)}
  T.fx(ctx,t,1);
  const a=seg(t,1.2,1.9)*(1-seg(t,2.8,3.15));
  if(a>0){ctx.save();ctx.globalAlpha=a;ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=24;
    text(ctx,'NYC DYNASTY LEAGUE',W/2,246+(1-eo(seg(t,1.2,2.2)))*18,`600 34px ${SANS}`,T.txt,mix(34,22,eo(seg(t,1.2,2.9))));
    ctx.globalAlpha=a*seg(t,1.7,2.3);ctx.fillStyle=T.mid;ctx.fillRect(W/2-eo(seg(t,1.7,2.7))*170,268,eo(seg(t,1.7,2.7))*340,2);
    text(ctx,'YEAR FIVE',W/2,312,`${T.dw2} 26px ${T.disp}`,T.hi,16);ctx.restore()}
  const b=seg(t,3.2,3.9)*(1-seg(t,5.6,6));
  if(b>0){ctx.save();ctx.fillStyle=`rgba(0,0,0,${.5*b})`;ctx.fillRect(0,0,W,H);ctx.globalAlpha=b;ctx.shadowColor=T.glow;ctx.shadowBlur=34;const f=`${T.dw} %px ${T.disp}`,ls=mix(60,18,eo(seg(t,3.2,5.4))),fs=fit(ctx,CFG.team,f,150,1560,18);
    ctx.font=f.replace('%',fs);ctx.letterSpacing=ls*fs/150+'px';ctx.textAlign='center';ctx.fillStyle=metal(ctx,590-fs*.8,590+fs*.45);ctx.fillText(CFG.team,W/2+ls*fs/300,590);ctx.letterSpacing='0px';ctx.shadowBlur=0;
    const lw=eo(seg(t,3.7,4.6))*420;ctx.fillStyle=T.mid;ctx.fillRect(W/2-lw,640,lw*2,3);ctx.globalAlpha=b*seg(t,3.9,4.5);
    text(ctx,'MANAGED BY '+CFG.manager.toUpperCase(),W/2,704,`600 34px ${SANS}`,T.txt,14);ctx.restore()}
}
function sLines(ctx,t){
  (T.back||T.scene)(ctx,t,T.back?1:.75,0);if(!T.back){ctx.fillStyle='rgba(2,2,4,.38)';ctx.fillRect(0,0,W,H)}
  T.fx(ctx,t,.6);const ks=T.lineScale||1;
  CFG.lines.forEach((s,i)=>{const a=6+i*2,b=a+2,p=seg(t,a+.05,a+.5)*(1-seg(t,b-.3,b));if(p<=0)return;ctx.save();ctx.globalAlpha=p;ctx.shadowColor='#000';ctx.shadowBlur=30;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,470,W,140);ctx.fillStyle=T.mid;ctx.fillRect(W/2-eo(seg(t,a,a+1))*300,470,eo(seg(t,a,a+1))*600,2);
    const ls=mix(18,8,eo(seg(t,a,b))),f=`${T.dw} %px ${T.disp}`;text(ctx,s,W/2,558,f.replace('%',fit(ctx,s,f,(i===2?50:44)*ks,1640,18)),i===2?T.hi:T.pale,ls);
    text(ctx,['THE RECORD','THE SEASON','THE CREED'][i],W/2,452,`600 22px ${SANS}`,T.txt,12);ctx.restore()})
}
// Act 2, second edition: three slammed cards (rival, worst day, stakes). Every figure comes from CFG.v2.cards, built from league data.
function sConflict(ctx,t){
  const A=V2.a2,j=Math.max(0,A.findIndex((x,k)=>k<A.length-1&&t>=x&&t<A[k+1])),a=A[j],b=A[j+1],c=V2.cards[j],lt=t-a,d=b-a,inn=eoe(seg(lt,0,.5)),out=seg(lt,d-.16,d);
  (T.back||T.scene)(ctx,t*.5+j*7,T.back?1:.6,0);ctx.fillStyle='rgba(2,2,6,.62)';ctx.fillRect(0,0,W,H);
  const vg=ctx.createRadialGradient(W/2,H/2,200,W/2,H/2,1100);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,j===2?`rgba(${T.flash},.22)`:'rgba(150,20,40,.30)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);T.fx(ctx,t,.5);
  ctx.save();ctx.globalAlpha=(1-out);ctx.shadowColor='#000';ctx.shadowBlur=34;
  const bw=eo(seg(lt,.05,.7))*520;ctx.fillStyle=T.mid;ctx.fillRect(W/2-bw,330,bw*2,3);
  text(ctx,c.k,W/2,300,`600 34px ${SANS}`,T.txt,mix(40,16,eo(seg(lt,0,d))));
  const sc=mix(1.7,1,inn)*(1+seg(lt,.5,d)*.035),fs=fit(ctx,c.big,`400 %px ${BOLD}`,300,1700,6);
  ctx.save();ctx.translate(W/2,600);ctx.scale(sc,sc);ctx.globalAlpha=(1-out)*seg(lt,0,.12);ctx.font=`400 ${fs}px ${BOLD}`;ctx.letterSpacing='6px';ctx.textAlign='center';ctx.fillStyle=j===2?T.hi:T.pale;ctx.fillText(c.big,0,fs*.36);ctx.restore();
  const sp=seg(lt,.45,.95);if(sp>0){ctx.globalAlpha=sp*(1-out);const f=`600 %px ${SANS}`;text(ctx,c.sub,W/2,800,f.replace('%',fit(ctx,c.sub,f,44,1640,6)),T.pale,6)}
  ctx.restore();
  const fl=lt<.07?1:Math.exp(-(lt-.07)*9);if(fl>.02){ctx.fillStyle=`rgba(${T.wipe||'255,244,222'},${fl*.55})`;ctx.fillRect(0,0,W,H)}
  if(out>0){ctx.fillStyle=`rgba(0,0,0,${out*.9})`;ctx.fillRect(0,0,W,H)}
}
const NICHES={arch:'M-300 380 V-120 A300 300 0 0 1 300 -120 V380 Z',rect:'M-290 380 V-410 H290 V380 Z',hex:'M0 -430 L300 -260 V210 L0 380 L-300 210 V-260 Z',round:'M0 -410 a395 395 0 1 0 .01 0z',
  shield:'M-290 -410 H290 V120 Q290 300 0 380 Q-290 300 -290 120 Z'};
let NP;const pad2=n=>String(n).padStart(2,'0');
function sPlayer(ctx,t,i){
  const pl=CFG.players[i],PDi=pDur(i),kq=Math.max(1,1.9/PDi),lt=(t-pStart(i))*kq,PD=PDi*kq,p=lt/PD,side=i%2?1:-1,inn=eoe(seg(lt,0,.55)),out=seg(lt,PD-.14*kq,PD);
  (T.back||T.scene)(ctx,T.back?t*.35+i*3.3:t,.55,0);
  ctx.fillStyle='rgba(3,3,5,.6)';ctx.fillRect(0,0,W,H);
  const drift=(p-.5)*46,nx=W/2+side*430+side*(1-inn)*260-side*drift,ny=575;
  // frame (far layer), then jersey (near layer) moving at a different rate for parallax
  ctx.save();ctx.translate(nx,ny);const k=(1.1-inn*.1+p*.02)*.9;ctx.scale(k,k);NP=NP||new Path2D(NICHES[T.niche]);
  const ng=ctx.createLinearGradient(0,-420,0,380);ng.addColorStop(0,T.nicheTop);ng.addColorStop(.5,T.ink);ng.addColorStop(1,'#020202');ctx.fillStyle=ng;ctx.fill(NP);
  ctx.save();ctx.clip(NP);const rg=ctx.createRadialGradient(0,-60,20,0,-60,560);rg.addColorStop(0,`rgba(${T.flash},.5)`);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(-420,-440,840,840);ctx.restore();
  ctx.strokeStyle=T.mid;ctx.lineWidth=3;ctx.shadowColor=T.glow;ctx.shadowBlur=18;ctx.stroke(NP);ctx.lineWidth=1;ctx.shadowBlur=0;ctx.strokeStyle=T.hi;ctx.globalAlpha=.5;ctx.scale(.94,.94);ctx.translate(0,-2);ctx.stroke(NP);ctx.restore();
  ctx.save();ctx.translate(nx-side*drift*.9+side*(1-inn)*120,ny-18+(1-inn)*70);const jk=(.92+inn*.14+p*.05)*.98;ctx.scale(jk,jk);ctx.rotate(side*(-.035+p*.03));ctx.globalAlpha=inn;jersey(ctx,pl,seg(lt,.3,1.5));ctx.restore();
  const al=side<0?'left':'right',bx=side<0?W/2+20:W/2-20,xx=bx+(1-inn)*side*-90+side*-drift*.5;
  ctx.save();ctx.globalAlpha=seg(lt,.1,.45);ctx.shadowColor='#000';ctx.shadowBlur=26;
  text(ctx,pad2(i+1)+'  /  '+pad2(NP_),xx,318,`600 26px ${SANS}`,T.mid,8,al);
  text(ctx,pl.f,xx,382,`600 50px ${SANS}`,T.pale,14,al);
  const nf=`${T.dw} %px ${T.disp}`,fs=fit(ctx,pl.l,nf,(T.nameSize||132)*.92,740);
  ctx.fillStyle=metal(ctx,405,505);ctx.font=nf.replace('%',fs);ctx.textAlign=al;ctx.fillText(pl.l,xx,500);
  const lw=eo(seg(lt,.25,.8))*520;ctx.fillStyle=T.mid;ctx.shadowBlur=0;ctx.fillRect(al==='left'?xx:xx-lw,528,lw,3);
  ctx.globalAlpha=seg(lt,.35,.7);text(ctx,pl.pos+'   ·   '+pl.tm,xx,576,`600 30px ${SANS}`,T.txt,6,al);
  // points per start: the headline stat, counts up
  const cu=eo(seg(lt,.4,1.1)),val=(pl.ppg*cu).toFixed(1);ctx.font=`600 150px ${SANS}`;ctx.letterSpacing='2px';const vw=ctx.measureText(pl.ppg.toFixed(1)).width;ctx.letterSpacing='0px';
  ctx.shadowColor=T.glow;ctx.shadowBlur=24;text(ctx,val,al==='left'?xx:xx-230,716,`600 150px ${SANS}`,T.hi,2,al);ctx.shadowColor='#000';ctx.shadowBlur=20;
  const sx=al==='left'?xx+vw+26:xx;text(ctx,'POINTS',sx,656,`600 34px ${SANS}`,T.pale,8,al);text(ctx,'PER START',sx,700,`600 34px ${SANS}`,T.pale,8,al);
  ctx.globalAlpha=seg(lt,.6,.95);text(ctx,pl.pts+' PTS IN '+pl.starts+' STARTS FOR THIS TEAM'+(pl.small?'   ·   SMALL SAMPLE':''),xx,766,`600 26px ${SANS}`,T.txt,5,al);
  const tag=(pl.nick?'“'+pl.nick+'”'+(pl.role?'   ·   ':''):'')+(pl.role||'');if(tag)text(ctx,tag,xx,822,`600 ${fit(ctx,tag,`600 %px ${SANS}`,34,820,6)}px ${SANS}`,T.hi,6,al);
  ctx.restore();T.fx(ctx,t,.7);
  const wf=Math.max(1-seg(lt,0,.22),0)*.9;if(wf>0){ctx.fillStyle=`rgba(${T.wipe||'225,236,255'},${wf*wf})`;ctx.fillRect(0,0,W,H)}
  if(out>0){ctx.fillStyle=`rgba(0,0,0,${out*.85})`;ctx.fillRect(0,0,W,H)}
}
function sClimax(ctx,t){ // roll call: every featured jersey lands on the beat, then the whole line-up surges forward
  const lt=t-C0,span=L0-C0,z=1+eo(seg(lt,span-1.2,span))*.5;
  T.scene(ctx,t,.9,0);ctx.fillStyle='rgba(2,2,4,.62)';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2);
  const n=NP_,rows=n>5?2:1,per=Math.ceil(n/rows),sc=rows===2?.36:.5,gx=Math.min(330,1640/per),step=Math.min(.34,(span-1.9)/n);
  ctx.save();ctx.globalAlpha=seg(lt,0,.4);text(ctx,'THE ONES WHO CARRIED IT',W/2,218,`600 30px ${SANS}`,T.txt,16);ctx.fillStyle=T.mid;ctx.fillRect(W/2-190,236,380,2);ctx.restore();
  for(let j=0;j<n;j++){const pl=CFG.players[n-1-j],r=Math.floor(j/per),c=j%per,cnt=r===rows-1?n-per*(rows-1):per,x=W/2+(c-(cnt-1)/2)*gx,y=rows===2?(r?720:420):560,a=lt-.35-j*step;if(a<0)continue;
    const pop=eoe(seg(a,0,.4)),hit=Math.max(0,1-a/.25);
    ctx.save();ctx.translate(x,y-(1-pop)*50);ctx.scale(sc*(1.25-pop*.25),sc*(1.25-pop*.25));ctx.globalAlpha=pop;jersey(ctx,pl,-1,false);if(hit>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=hit*.7;ctx.fillStyle=`rgb(${T.flash})`;ctx.fill(JP)}ctx.restore();
    ctx.save();ctx.globalAlpha=pop;ctx.shadowColor='#000';ctx.shadowBlur=14;text(ctx,pl.ppg.toFixed(1),x,y+sc*400,`600 ${rows===2?34:44}px ${SANS}`,T.hi,2);ctx.restore()}
  ctx.restore();T.fx(ctx,t,1);
  const wf=seg(lt,span-.35,span);if(wf>0){ctx.fillStyle=`rgba(${T.wipe||'255,244,222'},${wf*wf})`;ctx.fillRect(0,0,W,H)}
}
const LB=bolt(777,960,138,960,470,240);
function sLogo(ctx,t){
  const st=t-L0;ctx.fillStyle=T.ink;ctx.fillRect(0,0,W,H);
  const amb=eo(seg(st,0,1.6)),z=1+seg(st,0,3.8)*.04;
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2);
  ctx.globalAlpha=.35*amb;T.scene(ctx,t,.5,0);ctx.globalAlpha=1;ctx.fillStyle='rgba(2,2,4,.55)';ctx.fillRect(0,0,W,H);
  glowAt(ctx,960,470,900,T.flash,.34*amb);tile(ctx,TEX.b,t*10,0,7,.22*amb);tile(ctx,TEX.a,-t*18,t*6,6,.12*amb,'lighter');
  if(T.bolt&&st<.5)strokeBolt(ctx,LB,st<.08?1:st<.14?.3:st<.22?.9:Math.exp(-(st-.22)*10),4);
  const ring=seg(st,.05,1.2);if(ring>0&&ring<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(${T.flash},${(1-ring)*.7})`;ctx.lineWidth=6*(1-ring)+1;ctx.beginPath();ctx.arc(960,470,160+eo(ring)*820,0,7);ctx.stroke();ctx.restore()}
  emblem(ctx,960,440,500+(1-eo(seg(st,0,1)))*60,eio(seg(st,.05,1.5)),1.2+Math.sin(t*3)*.2);
  const wp=seg(st,1.1,1.9);if(wp>0){ctx.save();ctx.globalAlpha=wp;ctx.shadowColor=T.glow;ctx.shadowBlur=30;const f=`${T.dw} %px ${T.disp}`,ls=mix(70,26,eo(wp)),fs=fit(ctx,CFG.team,f,104,1500,26);
    ctx.font=f.replace('%',fs);ctx.letterSpacing=ls*fs/104+'px';ctx.textAlign='center';ctx.fillStyle=metal(ctx,830-fs*.8,830+fs*.45);ctx.fillText(CFG.team,W/2+ls*fs/208,830);ctx.restore()}
  const sp=seg(st,1.7,2.3);if(sp>0){ctx.save();ctx.globalAlpha=sp;const lw=eo(sp)*260;ctx.fillStyle=T.mid;ctx.fillRect(W/2-lw-460,878,lw,2);ctx.fillRect(W/2+460,878,lw,2);
    const pay=V2&&V2.payoff&&st>=3.0;if(V2&&V2.payoff)ctx.globalAlpha=sp*(st<2.8?1:st<3.0?(3.0-st)/.2:Math.min(1,(st-3.0)/.35));   // second edition: the byline gives way to the stakes
    if(pay)text(ctx,V2.payoff.big,W/2,892,`600 36px ${SANS}`,T.hi,8);else text(ctx,CFG.sub,W/2,888,`600 28px ${SANS}`,T.txt,9);
    if(V2&&V2.credit&&st>=3.0){ctx.globalAlpha=Math.min(1,(st-3.0)/.35)*.8;text(ctx,V2.credit,W/2,932,`600 20px ${SANS}`,T.txt,3)}ctx.restore()}
  ctx.restore();T.fx(ctx,t,amb);
  const wf=st<.1?1:Math.exp(-(st-.1)*4);if(wf>.01){ctx.fillStyle=`rgba(${T.wipe||'255,244,222'},${wf*.92})`;ctx.fillRect(0,0,W,H)}
  const fo=seg(t,DUR-.7,DUR-.05);if(fo>0){ctx.fillStyle=`rgba(0,0,0,${fo})`;ctx.fillRect(0,0,W,H)}
}
function render(ctx,t){
  t=cl(t,0,DUR-1e-6);const f=Math.round(t*FPS);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.setLineDash([]);ctx.letterSpacing='0px';ctx.textBaseline='alphabetic';
  if(t<A2){sOpen(ctx,t);const x=seg(t,A2-.2,A2);if(x>0){ctx.fillStyle=`rgba(0,0,0,${x})`;ctx.fillRect(0,0,W,H)}const fi=1-seg(t,0,.8);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}}
  else if(t<P0){if(V2)sConflict(ctx,t);else{sLines(ctx,t);const fi=1-seg(t,6,6.4);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}}}
  else if(t<C0){let i=NP_-1;if(V2){i=0;while(i<NP_-1&&t>=V2.ps[i+1])i++}else i=Math.min(NP_-1,Math.floor((t-P0)/PD));sPlayer(ctx,t,i)}
  else if(t<L0)sClimax(ctx,t);
  else sLogo(ctx,t);
  post(ctx,t,f)}
