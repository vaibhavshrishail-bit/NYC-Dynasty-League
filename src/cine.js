// THE PANTHEON — franchise cinematic. Deterministic: frame = render(t), t in seconds.
const W=1920,H=1080,DUR=25,FPS=30;
const BRONZE='#c9995a',BRONZE_HI='#f3d7a0',BRONZE_LO='#6b4a22',INK='#06070a';
const SERIF="'Cinzel',serif",SANS="'Barlow Condensed',sans-serif";
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const seg=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, eoe=x=>x>=1?1:1-Math.pow(2,-10*x);
const mix=(a,b,x)=>a+(b-a)*x;
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}

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
  TEX.c1=noiseTex(11,256,120,138,165,1.5);TEX.c2=noiseTex(29,256,70,84,110,1.2);TEX.c3=noiseTex(47,256,200,214,235,2.2);
  TEX.warm=noiseTex(83,256,201,153,90,1.8);
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
function bronzeGrad(ctx,y0,y1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'#fbe6b8');g.addColorStop(.28,'#d9a862');g.addColorStop(.5,'#8a5c28');g.addColorStop(.62,'#e2b676');g.addColorStop(1,'#4a2f12');return g}
function templeSil(ctx,cx,by,s,rim){
  ctx.save();ctx.translate(cx,by);ctx.scale(s,s);
  const P=new Path2D('M-560 0 L-470 -70 L-380 -96 L-330 -150 L330 -150 L380 -96 L470 -70 L560 0 Z');
  const T=new Path2D('M-300 -150 h600 v-14 h-600z M-280 -164 h560 v-12 h-560z M-262 -360 h524 v-22 h-524z M-286 -382 L0 -492 L286 -382 Z');
  ctx.fillStyle='#020305';ctx.fill(P);ctx.fill(T);
  for(let i=0;i<8;i++){const x=-252+i*72-14;ctx.fillRect(x,-362,28,188);ctx.fillRect(x-5,-366,38,8);ctx.fillRect(x-5,-184,38,8)}
  ctx.beginPath();ctx.arc(0,-420,16,0,7);ctx.fillStyle=`rgba(190,215,255,${.15+rim*.85})`;ctx.fill();
  if(rim>0){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(170,200,255,${rim*.9})`;ctx.lineWidth=2.2;ctx.shadowColor='#8fb4ff';ctx.shadowBlur=14;
    ctx.beginPath();ctx.moveTo(-286,-382);ctx.lineTo(0,-492);ctx.lineTo(286,-382);ctx.stroke();
    for(let i=0;i<8;i++){const x=-252+i*72-14;ctx.beginPath();ctx.moveTo(x+(i<4?28:0),-360);ctx.lineTo(x+(i<4?28:0),-176);ctx.globalAlpha=.55;ctx.stroke()}}
  ctx.restore()}
function rain(ctx,t,a){if(a<=0)return;const R=rng(5);ctx.save();ctx.strokeStyle='rgba(190,205,230,1)';ctx.lineWidth=1.2;
  for(let i=0;i<260;i++){const x0=R()*2300-200,sp=1500+R()*900,ph=R(),len=40+R()*70,al=.05+R()*.14;const y=((ph+t*sp/1300)%1)*1300-100;
    ctx.globalAlpha=al*a;ctx.beginPath();ctx.moveTo(x0-y*.18,y);ctx.lineTo(x0-(y+len)*.18,y+len);ctx.stroke()}ctx.restore()}
function embers(ctx,t,a,seed,n){const R=rng(seed);ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){const x=R()*W,sp=30+R()*90,ph=R(),sz=1+R()*2.6,sw=R()*6.28,al=.25+R()*.6;const p=(ph+t*sp/1100)%1,y=H-p*1100+40;
    ctx.globalAlpha=a*al*Math.sin(p*Math.PI);ctx.fillStyle=i%3?'#ffb866':'#ffe2b0';ctx.shadowColor='#ff9a3c';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(x+Math.sin(sw+t*1.3)*40,y,sz,0,7);ctx.fill()}ctx.restore()}
function post(ctx,t,f){
  const v=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*1.05);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.78)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.07;ctx.globalCompositeOperation='overlay';const g=TEX.grain[f%4],ox=(f*97)%256,oy=(f*53)%256;
  for(let x=-ox;x<W;x+=512)for(let y=-oy;y<H;y+=512)ctx.drawImage(g,x,y,512,512);ctx.restore();
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,138);ctx.fillRect(0,H-138,W,138)}

// ---------- emblem ----------
const EM={ring:new Path2D('M100 8a92 92 0 1 0 .01 0z'),ring2:new Path2D('M100 17a83 83 0 1 0 .01 0z'),
  ped:new Path2D('M38 80 L100 40 L162 80 Z'),ocu:new Path2D('M100 57a8 8 0 1 0 .01 0z'),ent:new Path2D('M36 83h128v9h-128z'),
  cols:[46,68,122,144].map(x=>new Path2D(`M${x} 96h10v46h-10z`)),bolt:new Path2D('M108 94 L86 124 L99 124 L91 146 L116 113 L102 113 Z'),
  st1:new Path2D('M34 145h132v6h-132z'),st2:new Path2D('M26 154h148v6h-148z')};
function laurel(ctx,p){for(const sgn of[-1,1])for(let i=0;i<9;i++){if(i/9>p)break;const a=Math.PI/2+sgn*(.32+i*.2),r=75.5,x=100+Math.cos(a)*r,y=100+Math.sin(a)*r;
  ctx.save();ctx.translate(x,y);ctx.rotate(a+sgn*1.05);ctx.beginPath();ctx.ellipse(0,0,6.5,2.4,0,0,7);ctx.fill();ctx.restore()}}
function emblem(ctx,cx,cy,size,p,glow){ // p: 0..1 build progress
  ctx.save();ctx.translate(cx-size/2,cy-size/2);ctx.scale(size/200,size/200);
  const draw=(path,a,b,len)=>{const q=seg(p,a,b);if(q<=0)return;ctx.setLineDash([len*q,len]);ctx.stroke(path)};
  ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=BRONZE_HI;ctx.shadowColor='#ffb04a';ctx.shadowBlur=18*glow;
  ctx.lineWidth=3;draw(EM.ring,0,.45,580);ctx.lineWidth=1;draw(EM.ring2,.1,.5,525);
  ctx.lineWidth=2.4;draw(EM.ped,.15,.5,280);draw(EM.ent,.25,.55,280);EM.cols.forEach((c,i)=>draw(c,.3+i*.04,.62+i*.04,115));draw(EM.st1,.4,.7,280);draw(EM.st2,.45,.75,310);draw(EM.ocu,.3,.6,52);draw(EM.bolt,.35,.7,140);
  const f=seg(p,.55,1);if(f>0){ctx.setLineDash([]);ctx.globalAlpha=f;ctx.shadowBlur=8*glow;ctx.fillStyle=bronzeGrad(ctx,30,165);
    ctx.fill(EM.ped,'evenodd');ctx.fill(EM.ent);EM.cols.forEach(c=>ctx.fill(c));ctx.fill(EM.st1);ctx.fill(EM.st2);
    ctx.fillStyle='#07080b';ctx.fill(EM.ocu);ctx.fillStyle='#fff3d6';ctx.shadowColor='#ffd58a';ctx.shadowBlur=22*glow;ctx.fill(EM.bolt);
    ctx.fillStyle=BRONZE;ctx.shadowBlur=4;laurel(ctx,f)}
  ctx.restore()}

// ---------- scenes ----------
function sStorm(ctx,t){
  const fl=flashAt(t,STRIKES),z=1+eio(seg(t,0,4.6))*.16;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#04060a');g.addColorStop(.55,'#0c111b');g.addColorStop(1,'#05070b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(W/2,H*.56);ctx.scale(z,z);ctx.translate(-W/2,-H*.56);
  tile(ctx,TEX.c2,t*14,40,7,.55+fl*.4);tile(ctx,TEX.c1,-t*26,-90+t*6,5,.42+fl*.55);
  for(const s of STRIKES){const d=t-s.t;if(d>=0&&d<.5){if(!s.b)s.b=bolt(s.t*1000|0,s.a[0],s.a[1],s.a[2],s.a[3],s.a[4]);strokeBolt(ctx,s.b,(d<.08?1:d<.14?.2:d<.24?.9:Math.exp(-(d-.24)*9)),s.w)}}
  if(fl>0){const r=ctx.createRadialGradient(960,420,0,960,420,1100);r.addColorStop(0,`rgba(150,180,255,${fl*.5})`);r.addColorStop(1,'rgba(150,180,255,0)');ctx.fillStyle=r;ctx.fillRect(-200,-200,W+400,H+400)}
  templeSil(ctx,960,960,1.02,fl);
  tile(ctx,TEX.c3,t*46,330,9,.2+fl*.25);
  ctx.restore();
  const fog=ctx.createLinearGradient(0,700,0,H);fog.addColorStop(0,'rgba(8,11,18,0)');fog.addColorStop(1,'rgba(8,11,18,.95)');ctx.fillStyle=fog;ctx.fillRect(0,700,W,H);
  rain(ctx,t,1);
  const a=seg(t,1.3,2.1)*(1-seg(t,4.0,4.5));
  if(a>0){ctx.save();ctx.globalAlpha=a;ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=24;
    text(ctx,'NYC DYNASTY LEAGUE',W/2,246+ (1-eo(seg(t,1.3,2.3)))*18,`600 34px ${SANS}`,'#dfe6f3',mix(34,22,eo(seg(t,1.3,3))));
    ctx.globalAlpha=a*seg(t,1.9,2.6);ctx.fillStyle=BRONZE;ctx.fillRect(W/2-eo(seg(t,1.9,3))*170,268,eo(seg(t,1.9,3))*340,2);
    text(ctx,'YEAR FIVE',W/2,312,`500 26px ${SERIF}`,BRONZE_HI,16);ctx.restore()}
}
function column(ctx,x,top,bot,w,side,lit){
  const g=ctx.createLinearGradient(x-w/2,0,x+w/2,0),c=side<0?[0,1]:[1,0];
  g.addColorStop(c[0],`rgba(${20+lit*150|0},${16+lit*105|0},${14+lit*50|0},1)`);g.addColorStop(.5,'#0b0b0d');g.addColorStop(c[1],'#030304');
  ctx.fillStyle=g;ctx.fillRect(x-w/2,top,w,bot-top);
  ctx.fillStyle='rgba(0,0,0,.35)';for(let i=1;i<6;i++)ctx.fillRect(x-w/2+i*w/6,top,Math.max(1,w*.03),bot-top);
  ctx.fillStyle='#050506';ctx.fillRect(x-w*.68,top-w*.16,w*1.36,w*.2);ctx.fillRect(x-w*.68,bot-w*.1,w*1.36,w*.22)}
function hall(ctx,t,speed,glowA){
  ctx.fillStyle='#030304';ctx.fillRect(0,0,W,H);const cx=W/2,cy=520;
  const r=ctx.createRadialGradient(cx,cy,0,cx,cy,760);r.addColorStop(0,`rgba(255,214,150,${.95*glowA})`);r.addColorStop(.12,`rgba(214,150,70,${.6*glowA})`);r.addColorStop(.5,`rgba(90,52,18,${.22*glowA})`);r.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
  tile(ctx,TEX.warm,t*30,t*8,6,.16*glowA,'lighter');
  // floor
  const fg=ctx.createLinearGradient(0,cy,0,H);fg.addColorStop(0,`rgba(120,80,36,${.5*glowA})`);fg.addColorStop(.25,'rgba(22,15,9,.9)');fg.addColorStop(1,'#020202');ctx.fillStyle=fg;ctx.fillRect(0,cy,W,H-cy);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(201,153,90,${.16*glowA})`;ctx.lineWidth=1.5;
  for(let i=-9;i<=9;i++){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+i*420,H+300);ctx.stroke()}
  for(let k=0;k<14;k++){const zz=((k-(t*speed)%1)+14)%14+.35,y=cy+300/zz;if(y<H+50){ctx.globalAlpha=cl(1.2-zz/12);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}ctx.restore();
  // columns, far->near
  const cols=[];for(let k=0;k<12;k++){const zz=((k-(t*speed)%1)+12)%12+.42;cols.push(zz)}cols.sort((a,b)=>b-a);
  for(const zz of cols){const sc=1/zz,w=150*sc,top=cy-640*sc,bot=cy+300*sc,lit=cl(.9-zz/9)*glowA;ctx.globalAlpha=cl(zz/.9-.45+.2);
    for(const s of[-1,1])column(ctx,cx+s*560*sc,top,bot,w,s,lit);
    ctx.fillStyle='#040405';ctx.fillRect(cx-620*sc,top-70*sc,1240*sc,56*sc)}
  ctx.globalAlpha=1}
function sHall(ctx,t){
  hall(ctx,t,.75,seg(t,4.5,5.2));
  const lines=[['FOUR SEASONS.  TWO NAMES ON THE TROPHY.',4.85,6.1,36],['THE HEAVENS ARE DUE A NEW ORDER.',6.15,7.5,44]];
  for(const[s,a,b,sz]of lines){const p=seg(t,a,a+.5)*(1-seg(t,b-.3,b));if(p<=0)continue;ctx.save();ctx.globalAlpha=p;ctx.shadowColor='#000';ctx.shadowBlur=30;
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,480,W,120);
    text(ctx,s,W/2,555,`700 ${sz}px ${SERIF}`,'#fff1d6',mix(18,8,eo(seg(t,a,b))));ctx.restore()}
}
const PLAYERS=[
 {f:'AMON-RA',l:'ST. BROWN',n:'14',pos:'WIDE RECEIVER',tm:'DET',ep:'THE SUN GOD'},
 {f:'ASHTON',l:'JEANTY',n:'2',pos:'RUNNING BACK',tm:'LV',ep:'THE THUNDER'},
 {f:'TETAIROA',l:'MCMILLAN',n:'4',pos:'WIDE RECEIVER',tm:'CAR',ep:'THE TITAN'},
 {f:'OMARION',l:'HAMPTON',n:'8',pos:'RUNNING BACK',tm:'LAC',ep:'THE HAMMER'},
 {f:'JUSTIN',l:'HERBERT',n:'10',pos:'QUARTERBACK',tm:'LAC',ep:'THE LIGHTNING ARM'},
 {f:'AIDAN',l:'HUTCHINSON',n:'97',pos:'DEFENSIVE LINE',tm:'DET',ep:'THE WAR GOD'}];
const ROMAN=['I','II','III','IV','V','VI'],P0=7.5,PD=1.8;
let numCv;
function numeral(n,glint){const c=numCv||(numCv=mk(900,700)),x=c.getContext('2d');x.clearRect(0,0,900,700);
  x.font=`900 ${n.length>1?430:520}px ${SERIF}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=bronzeGrad(x,130,580);x.fillText(n,450,372);
  x.globalCompositeOperation='source-atop';const gx=-300+glint*1500,g=x.createLinearGradient(gx,0,gx+260,160);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,248,225,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,900,700);
  x.globalCompositeOperation='source-over';x.lineWidth=2;x.strokeStyle='rgba(255,236,196,.55)';x.strokeText(n,450,372);return c}
function sPlayer(ctx,t,i){
  const pl=PLAYERS[i],lt=t-(P0+i*PD),p=lt/PD,side=i%2?1:-1,inn=eoe(seg(lt,0,.55)),out=seg(lt,PD-.14,PD);
  hall(ctx,t*.35+i*3.3,.35,.55);
  ctx.fillStyle='rgba(3,3,5,.55)';ctx.fillRect(0,0,W,H);
  const drift=(p-.5)*40,nx=W/2+side*430+side*(1-inn)*260-side*drift,ny=575;
  // niche
  ctx.save();ctx.translate(nx,ny);const k=(1.12-inn*.12+p*.03)*.9;ctx.scale(k,k);
  const np=new Path2D('M-300 380 V-120 A300 300 0 0 1 300 -120 V380 Z');
  const ng=ctx.createLinearGradient(0,-420,0,380);ng.addColorStop(0,'#1c140b');ng.addColorStop(.5,'#0b0907');ng.addColorStop(1,'#020202');ctx.fillStyle=ng;ctx.fill(np);
  ctx.save();ctx.clip(np);const rg=ctx.createRadialGradient(0,-60,20,0,-60,520);rg.addColorStop(0,'rgba(214,150,70,.42)');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(-320,-440,640,840);
  ctx.globalAlpha=inn;ctx.shadowColor='rgba(255,170,70,.55)';ctx.shadowBlur=50;ctx.drawImage(numeral(pl.n,seg(lt,.25,1.25)),-450,-390+(1-inn)*60);ctx.restore();
  ctx.strokeStyle=BRONZE;ctx.lineWidth=3;ctx.shadowColor='#ff9d3c';ctx.shadowBlur=18;ctx.stroke(np);ctx.lineWidth=1;ctx.shadowBlur=0;ctx.strokeStyle='rgba(243,215,160,.5)';
  ctx.stroke(new Path2D('M-282 380 V-120 A282 282 0 0 1 282 -120 V380'));ctx.restore();
  // text block
  const tx=W/2-side*60-side*(1-inn)*-120+side*drift*.4, al=side<0?'left':'right',bx=side<0?W/2+20:W/2-20,xx=bx+(1-inn)*side*-90+side*-drift*.5;
  ctx.save();ctx.globalAlpha=seg(lt,.12,.5);ctx.shadowColor='#000';ctx.shadowBlur=26;
  text(ctx,ROMAN[i]+'  /  VI',xx,372,`500 26px ${SERIF}`,BRONZE,8,al);
  text(ctx,pl.f,xx,452,`600 54px ${SANS}`,'#e9e2d2',14,al);
  ctx.font=`900 132px ${SERIF}`;let fs=132;const mw=ctx.measureText(pl.l).width;if(mw>740)fs=132*740/mw;
  ctx.fillStyle=bronzeGrad(ctx,480,585);ctx.font=`900 ${fs}px ${SERIF}`;ctx.textAlign=al;ctx.fillText(pl.l,xx,580);
  const lw=eo(seg(lt,.3,.9))*520;ctx.fillStyle=BRONZE;ctx.shadowBlur=0;ctx.fillRect(al==='left'?xx:xx-lw,612,lw,3);
  ctx.globalAlpha=seg(lt,.45,.8);
  text(ctx,pl.pos+'   ·   '+pl.tm+'   ·   #'+pl.n,xx,662,`600 32px ${SANS}`,'#cfd6e4',6,al);
  text(ctx,pl.ep,xx,722,`700 34px ${SERIF}`,BRONZE_HI,12,al);ctx.restore();
  embers(ctx,t,.7,71,50);
  const wf=Math.max(1-seg(lt,0,.22),0)*.9;if(wf>0){ctx.fillStyle=`rgba(225,236,255,${wf*wf})`;ctx.fillRect(0,0,W,H)}
  if(out>0){ctx.fillStyle=`rgba(0,0,0,${out*.85})`;ctx.fillRect(0,0,W,H)}
}
const L0=18.3,LB=bolt(777,960,138,960,470,240);
function sLogo(ctx,t){
  const lt=t-L0,st=lt-.3; // strike at .3
  ctx.fillStyle='#030304';ctx.fillRect(0,0,W,H);
  if(st<0)return;
  const amb=eo(seg(st,0,2.2)),z=1+seg(st,0,6.4)*.05;
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2);
  const r=ctx.createRadialGradient(960,470,0,960,470,900);r.addColorStop(0,`rgba(180,112,44,${.42*amb})`);r.addColorStop(.5,`rgba(60,34,12,${.3*amb})`);r.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
  tile(ctx,TEX.c2,t*10,0,7,.3*amb);tile(ctx,TEX.warm,-t*18,t*6,6,.12*amb,'lighter');
  if(st<.5)strokeBolt(ctx,LB,st<.08?1:st<.14?.3:st<.22?.9:Math.exp(-(st-.22)*10),4);
  const ring=seg(st,.05,1.3);if(ring>0&&ring<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,200,130,${(1-ring)*.7})`;ctx.lineWidth=6*(1-ring)+1;ctx.beginPath();ctx.arc(960,470,160+eo(ring)*820,0,7);ctx.stroke();ctx.restore()}
  const p=eio(seg(st,.1,2.3));
  emblem(ctx,960,440,500+ (1-eo(seg(st,0,1.2)))*60,p,1.2+Math.sin(t*3)*.2);
  // wordmark
  const wp=seg(st,1.9,3.0);if(wp>0){ctx.save();ctx.globalAlpha=wp;ctx.shadowColor='rgba(255,160,60,.6)';ctx.shadowBlur=30;ctx.font=`900 104px ${SERIF}`;ctx.letterSpacing=mix(70,26,eo(wp))+'px';ctx.textAlign='center';ctx.fillStyle=bronzeGrad(ctx,745,835);ctx.fillText('THE PANTHEON',W/2+mix(35,13,eo(wp)),830);ctx.restore()}
  const sp=seg(st,2.9,3.7);if(sp>0){ctx.save();ctx.globalAlpha=sp;const lw=eo(sp)*300;ctx.fillStyle=BRONZE;ctx.fillRect(W/2-lw-400,878,lw,2);ctx.fillRect(W/2+400,878,lw,2);
    text(ctx,'NYC DYNASTY LEAGUE  ·  EST. 2022',W/2,888,`600 28px ${SANS}`,'#dcd3c2',10);ctx.restore()}
  ctx.restore();embers(ctx,t,amb,33,110);
  const wf=st<.1?1:Math.exp(-(st-.1)*4);if(wf>.01){ctx.fillStyle=`rgba(255,244,222,${wf*.92})`;ctx.fillRect(0,0,W,H)}
  const fo=seg(t,24.2,24.95);if(fo>0){ctx.fillStyle=`rgba(0,0,0,${fo})`;ctx.fillRect(0,0,W,H)}
}
function render(ctx,t){
  t=cl(t,0,DUR-1e-6);const f=Math.round(t*FPS);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.setLineDash([]);
  if(t<4.5){sStorm(ctx,t);const x=seg(t,4.3,4.5);if(x>0){ctx.fillStyle=`rgba(0,0,0,${x})`;ctx.fillRect(0,0,W,H)}const fi=1-seg(t,0,.8);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}}
  else if(t<P0){sHall(ctx,t);const fi=1-seg(t,4.5,4.9);if(fi>0){ctx.fillStyle=`rgba(0,0,0,${fi})`;ctx.fillRect(0,0,W,H)}}
  else if(t<L0)sPlayer(ctx,t,Math.min(5,Math.floor((t-P0)/PD)));
  else sLogo(ctx,t);
  post(ctx,t,f)}
