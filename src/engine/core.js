// NYC Dynasty League — franchise cinematic engine. Deterministic: frame = render(ctx,t), t in seconds.
// CFG (injected by scripts/build_cinematics.py) = {theme, team, manager, line1, line2, players:[{f,l,n,pos,tm,pts,hon}]}
const W=1920,H=1080,DUR=25,FPS=30,P0=7.5,PD=1.8,L0=18.3;
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

// ---------- acts ----------
function sOpen(ctx,t){
  const fl=flashAt(t,STRIKES)*T.flashK,z=1+eio(seg(t,0,4.6))*(T.zoom??.12);
  ctx.save();ctx.translate(W/2,H*.56);ctx.scale(z,z);ctx.translate(-W/2,-H*.56);T.scene(ctx,t,1,fl);ctx.restore();
  if(fl>0&&!T.ownFlash){ctx.fillStyle=`rgba(${T.flash},${fl*.22})`;ctx.fillRect(0,0,W,H)}
  T.fx(ctx,t,1);
  const a=seg(t,1.3,2.1)*(1-seg(t,4.0,4.5));
  if(a>0){ctx.save();ctx.globalAlpha=a;ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=24;
    text(ctx,'NYC DYNASTY LEAGUE',W/2,246+(1-eo(seg(t,1.3,2.3)))*18,`600 34px ${SANS}`,T.txt,mix(34,22,eo(seg(t,1.3,3))));
    ctx.globalAlpha=a*seg(t,1.9,2.6);ctx.fillStyle=T.mid;ctx.fillRect(W/2-eo(seg(t,1.9,3))*170,268,eo(seg(t,1.9,3))*340,2);
    text(ctx,'YEAR FIVE',W/2,312,`${T.dw2} 26px ${T.disp}`,T.hi,16);ctx.restore()}
}
function fit(ctx,s,font,size,max,ls=0){ctx.font=`${font.replace('%',size)}`;ctx.letterSpacing=ls+'px';const w=ctx.measureText(s).width;ctx.letterSpacing='0px';return w>max?size*max/w:size}
function sLines(ctx,t){
  (T.back||T.scene)(ctx,t,seg(t,4.5,5.2)*(T.back?1:.7),0);if(!T.back){ctx.fillStyle='rgba(2,2,4,.35)';ctx.fillRect(0,0,W,H)}
  T.fx(ctx,t,.6);
  const ks=T.lineScale||1,lines=[[CFG.line1,4.85,6.1,38*ks],[CFG.line2,6.15,7.5,46*ks]];
  for(const[s,a,b,sz]of lines){const p=seg(t,a,a+.5)*(1-seg(t,b-.3,b));if(p<=0)continue;ctx.save();ctx.globalAlpha=p;ctx.shadowColor='#000';ctx.shadowBlur=30;
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,480,W,120);const ls=mix(18,8,eo(seg(t,a,b))),f=`${T.dw} %px ${T.disp}`;
    text(ctx,s,W/2,555,f.replace('%',fit(ctx,s,f,sz,1640,18)),T.pale,ls);ctx.restore()}
}
const NICHES={arch:'M-300 380 V-120 A300 300 0 0 1 300 -120 V380 Z',rect:'M-290 380 V-410 H290 V380 Z',hex:'M0 -430 L300 -260 V210 L0 380 L-300 210 V-260 Z',round:'M0 -410 a395 395 0 1 0 .01 0z',
  shield:'M-290 -410 H290 V120 Q290 300 0 380 Q-290 300 -290 120 Z'};
const ROMAN=['I','II','III','IV','V','VI'];
let numCv,NP;
function numeral(n,glint){const c=numCv||(numCv=mk(900,700)),x=c.getContext('2d');x.clearRect(0,0,900,700);
  x.font=`${T.dw} ${(n.length>1?430:520)*(T.numScale||1)}px ${T.disp}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=metal(x,130,580);x.fillText(n,450,372);
  x.globalCompositeOperation='source-atop';const gx=-300+glint*1500,g=x.createLinearGradient(gx,0,gx+260,160);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,250,235,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,900,700);
  x.globalCompositeOperation='source-over';x.lineWidth=2;x.strokeStyle='rgba(255,255,255,.4)';x.strokeText(n,450,372);return c}
function sPlayer(ctx,t,i){
  const pl=CFG.players[i],lt=t-(P0+i*PD),p=lt/PD,side=i%2?1:-1,inn=eoe(seg(lt,0,.55)),out=seg(lt,PD-.14,PD);
  (T.back||T.scene)(ctx,T.back?t*.35+i*3.3:t,.55,0);
  ctx.fillStyle='rgba(3,3,5,.6)';ctx.fillRect(0,0,W,H);
  const drift=(p-.5)*40,nx=W/2+side*430+side*(1-inn)*260-side*drift,ny=575;
  ctx.save();ctx.translate(nx,ny);const k=(1.12-inn*.12+p*.03)*.9;ctx.scale(k,k);
  NP=NP||new Path2D(NICHES[T.niche]);
  const ng=ctx.createLinearGradient(0,-420,0,380);ng.addColorStop(0,T.nicheTop);ng.addColorStop(.5,T.ink);ng.addColorStop(1,'#020202');ctx.fillStyle=ng;ctx.fill(NP);
  ctx.save();ctx.clip(NP);const rg=ctx.createRadialGradient(0,-60,20,0,-60,520);rg.addColorStop(0,`rgba(${T.flash},.38)`);rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(-420,-440,840,840);
  ctx.globalAlpha=inn;ctx.shadowColor=T.glow;ctx.shadowBlur=50;ctx.drawImage(numeral(pl.n,seg(lt,.25,1.25)),-450,-390+(1-inn)*60);ctx.restore();
  ctx.strokeStyle=T.mid;ctx.lineWidth=3;ctx.shadowColor=T.glow;ctx.shadowBlur=18;ctx.stroke(NP);
  ctx.lineWidth=1;ctx.shadowBlur=0;ctx.strokeStyle=T.hi;ctx.globalAlpha=.5;ctx.scale(.94,.94);ctx.translate(0,-2);ctx.stroke(NP);ctx.restore();
  const al=side<0?'left':'right',bx=side<0?W/2+20:W/2-20,xx=bx+(1-inn)*side*-90+side*-drift*.5;
  ctx.save();ctx.globalAlpha=seg(lt,.12,.5);ctx.shadowColor='#000';ctx.shadowBlur=26;
  text(ctx,ROMAN[i]+'  /  VI',xx,352,`${T.dw2} 26px ${T.disp}`,T.mid,8,al);
  text(ctx,pl.f,xx,432,`600 54px ${SANS}`,T.pale,14,al);
  const nf=`${T.dw} %px ${T.disp}`,fs=fit(ctx,pl.l,nf,T.nameSize||132,740);
  ctx.fillStyle=metal(ctx,460,565);ctx.font=nf.replace('%',fs);ctx.textAlign=al;ctx.fillText(pl.l,xx,560);
  const lw=eo(seg(lt,.3,.9))*520;ctx.fillStyle=T.mid;ctx.shadowBlur=0;ctx.fillRect(al==='left'?xx:xx-lw,592,lw,3);
  ctx.globalAlpha=seg(lt,.45,.8);
  text(ctx,pl.pos+'   ·   '+pl.tm+(pl.num?'   ·   #'+pl.num:''),xx,642,`600 32px ${SANS}`,T.txt,6,al);
  text(ctx,pl.hon,xx,704,`${T.dw2} 34px ${T.disp}`,T.hi,T.disp===SERIF?12:8,al);
  text(ctx,pl.pts+' PTS   ·   2026 SEASON',xx,756,`600 28px ${SANS}`,T.txt,7,al);ctx.restore();
  T.fx(ctx,t,.7);
  const wf=Math.max(1-seg(lt,0,.22),0)*.9;if(wf>0){ctx.fillStyle=`rgba(${T.wipe||'225,236,255'},${wf*wf})`;ctx.fillRect(0,0,W,H)}
  if(out>0){ctx.fillStyle=`rgba(0,0,0,${out*.85})`;ctx.fillRect(0,0,W,H)}
}
const LB=bolt(777,960,138,960,470,240);
function sLogo(ctx,t){
  const lt=t-L0,st=lt-.3;
  ctx.fillStyle=T.ink;ctx.fillRect(0,0,W,H);
  if(st<0){ctx.fillStyle='#020203';ctx.fillRect(0,0,W,H);return}
  const amb=eo(seg(st,0,2.2)),z=1+seg(st,0,6.4)*.05;
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2);
  ctx.globalAlpha=.35*amb;T.scene(ctx,t,.5,0);ctx.globalAlpha=1;ctx.fillStyle='rgba(2,2,4,.55)';ctx.fillRect(0,0,W,H);
  glowAt(ctx,960,470,900,T.flash,.34*amb);
  tile(ctx,TEX.b,t*10,0,7,.22*amb);tile(ctx,TEX.a,-t*18,t*6,6,.12*amb,'lighter');
  if(T.bolt&&st<.5)strokeBolt(ctx,LB,st<.08?1:st<.14?.3:st<.22?.9:Math.exp(-(st-.22)*10),4);
  const ring=seg(st,.05,1.3);if(ring>0&&ring<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(${T.flash},${(1-ring)*.7})`;ctx.lineWidth=6*(1-ring)+1;ctx.beginPath();ctx.arc(960,470,160+eo(ring)*820,0,7);ctx.stroke();ctx.restore()}
  emblem(ctx,960,440,500+(1-eo(seg(st,0,1.2)))*60,eio(seg(st,.1,2.3)),1.2+Math.sin(t*3)*.2);
  const wp=seg(st,1.9,3.0);if(wp>0){ctx.save();ctx.globalAlpha=wp;ctx.shadowColor=T.glow;ctx.shadowBlur=30;const f=`${T.dw} %px ${T.disp}`,ls=mix(70,26,eo(wp)),fs=fit(ctx,CFG.team,f,104,1500,26);
    ctx.font=f.replace('%',fs);ctx.letterSpacing=ls*fs/104+'px';ctx.textAlign='center';ctx.fillStyle=metal(ctx,830-fs*.8,830+fs*.45);ctx.fillText(CFG.team,W/2+ls*fs/208,830);ctx.restore()}
  const sp=seg(st,2.9,3.7);if(sp>0){ctx.save();ctx.globalAlpha=sp;const lw=eo(sp)*260;ctx.fillStyle=T.mid;ctx.fillRect(W/2-lw-460,878,lw,2);ctx.fillRect(W/2+460,878,lw,2);
    text(ctx,CFG.sub,W/2,888,`600 28px ${SANS}`,T.txt,9);ctx.restore()}
  ctx.restore();T.fx(ctx,t,amb);
  const wf=st<.1?1:Math.exp(-(st-.1)*4);if(wf>.01){ctx.fillStyle=`rgba(${T.wipe||'255,244,222'},${wf*.92})`;ctx.fillRect(0,0,W,H)}
  const fo=seg(t,24.2,24.95);if(fo>0){ctx.fillStyle=`rgba(0,0,0,${fo})`;ctx.fillRect(0,0,W,H)}
}
function render(ctx,t){
  t=cl(t,0,DUR-1e-6);const f=Math.round(t*FPS);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.setLineDash([]);ctx.letterSpacing='0px';
  if(t<4.5){sOpen(ctx,t);const x=seg(t,4.3,4.5);if(x>0){ctx.fillStyle=`rgba(0,0,0,${x})`;ctx.fillRect(0,0,W,H)}const fi=1-seg(t,0,.8);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}}
  else if(t<P0){sLines(ctx,t);const fi=1-seg(t,4.5,4.9);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}}
  else if(t<L0)sPlayer(ctx,t,Math.min(5,Math.floor((t-P0)/PD)));
  else sLogo(ctx,t);
  post(ctx,t,f)}
