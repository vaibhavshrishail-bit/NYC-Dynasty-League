// Twelve franchise looks. Each theme: palette, display font, scene painter, particles, emblem glyph, niche shape, honorifics.
// All imagery is original and procedural. scene(ctx,t,e,fl): e = brightness 0..1, fl = beat flash 0..1.
const base={flashK:.5,niche:'arch',disp:SERIF,dw:900,dw2:700,pale:'#fff1d6',txt:'#cfd6e4',hot:'#fff3d6',nicheTop:'#1c140b',ink:'#06070a'};
function ridge(ctx,seed,y,amp,col,ox){const R=rng(seed),ph=[R()*9,R()*9,R()*9];ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=W;x+=12){const u=(x+ox)/W;ctx.lineTo(x,y-amp*(.5*Math.sin(u*5+ph[0])+.3*Math.sin(u*13+ph[1])+.2*Math.sin(u*29+ph[2])))}ctx.lineTo(W,H);ctx.fill()}
function skyline(ctx,seed,baseY,minH,maxH,col,ox,lit,e,t){const R=rng(seed);let x=-300-ox;
  while(x<W+300){const w=70+R()*120,h=minH+R()*(maxH-minH);ctx.fillStyle=col;ctx.fillRect(x,baseY-h,w,h+400);
    if(lit)for(let wy=baseY-h+16;wy<baseY-10;wy+=26)for(let wx=x+10;wx<x+w-14;wx+=20){const r=R();if(r<.22){ctx.fillStyle=`rgba(${lit},${(.35+.5*R())*e})`;ctx.fillRect(wx,wy,9,13)}}
    x+=w+4+R()*10}}
const THEMES={
temple:{...base,metal:['#fbe6b8','#d9a862','#8a5c28','#e2b676','#4a2f12'],hi:'#f3d7a0',mid:'#c9995a',glow:'#ffb04a',flash:'214,150,70',tint1:[201,153,90],tint2:[70,84,110],flashK:1,ownFlash:true,bolt:true,zoom:0,txt:'#dfe6f3',
  hon:['THE HERALD','THE TITAN','THE HAMMER','THE ORACLE','THE WAR GOD','KING OF THE GODS'],
  glyph:[{d:'M38 80 L100 40 L162 80 Z'},{d:'M36 83h128v9h-128z'},...[46,68,122,144].map(x=>({d:`M${x} 96h10v46h-10z`})),{d:'M34 145h132v6h-132z'},{d:'M26 154h148v6h-148z'},{d:'M100 57a8 8 0 1 0 .01 0z',f:'ink'},{d:'M108 94 L86 124 L99 124 L91 146 L116 113 L102 113 Z',f:'hot'}],
  scene(ctx,t,e,fl){const z=1+eio(seg(t,0,4.6))*.16;sky(ctx,[[0,'#04060a'],[.55,'#0c111b'],[1,'#05070b']]);
    ctx.save();ctx.translate(W/2,H*.56);ctx.scale(z,z);ctx.translate(-W/2,-H*.56);
    tile(ctx,TEX.c2,t*14,40,7,(.55+fl*.4)*e);tile(ctx,TEX.c1,-t*26,-90+t*6,5,(.42+fl*.55)*e);
    if(e===1)for(const s of STRIKES){const d=t-s.t;if(d>=0&&d<.5){if(!s.b)s.b=bolt(s.t*1000|0,...s.a);strokeBolt(ctx,s.b,(d<.08?1:d<.14?.2:d<.24?.9:Math.exp(-(d-.24)*9)),s.w)}}
    if(fl>0)glowAt(ctx,960,420,1100,'150,180,255',fl*.5,'source-over');
    templeSil(ctx,960,960,1.02,fl);tile(ctx,TEX.c3,t*46,330,9,(.2+fl*.25)*e);ctx.restore();
    const fog=ctx.createLinearGradient(0,700,0,H);fog.addColorStop(0,'rgba(8,11,18,0)');fog.addColorStop(1,'rgba(8,11,18,.95)');ctx.fillStyle=fog;ctx.fillRect(0,700,W,H);if(e===1)rain(ctx,t,1)},
  back(ctx,t,e){hall(ctx,t,e>.9?.75:.35,e)},
  fx(ctx,t,a){if(t>P0)motes(ctx,t,a,71,70,'#ffb866','#ffe2b0','#ff9a3c')}},
eclipse:{...base,niche:'round',metal:['#ffffff','#ece4de','#9a2430','#f6cfc6','#2a070c'],hi:'#ffd9d0',mid:'#e0463e',glow:'#ff4a3a',flash:'255,90,70',tint1:[210,60,50],tint2:[70,60,95],nicheTop:'#220a0e',pale:'#fff3ee',wipe:'255,225,215',
  hon:['THE SURVIVOR','THE SECOND WIND','THE LAST STAND','THE COMEBACK','THE UNKILLABLE','ONE MORE DAY'],
  glyph:[{d:'M100 40a40 40 0 1 0 .01 0z M100 49a31 31 0 1 0 .01 0z',eo:1},{d:'M126 50a6 6 0 1 0 .01 0z',f:'hot'},{d:'M36 134h36l7-18 9 34 9-28 6 12h61v6h-65l-3-6-8 26-10-36-3 8h-39z'}],
  scene(ctx,t,e,fl){sky(ctx,[[0,'#020204'],[.6,'#0a0508'],[.86,'#2a0a10'],[1,'#080305']]);const R=rng(66);
    for(let i=0;i<150;i++){const x=R()*W,y=R()*700,s=R();ctx.fillStyle=`rgba(255,235,230,${(.15+.55*s)*(.6+.4*Math.sin(t*1.7+i))*e})`;ctx.fillRect(x,y,1.4+s,1.4+s)}
    tile(ctx,TEX.b,t*8,0,8,.25*e);const cx=960,cy=470,pu=.5+.5*Math.sin(t*1.1);
    glowAt(ctx,cx,cy,760,'200,40,40',(.3+.12*pu+fl*.3)*e);glowAt(ctx,cx,cy,380,'255,170,150',(.55+fl*.3)*e);glowAt(ctx,cx,cy,240,'255,255,255',.75*e);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(cx,cy);ctx.rotate(t*.03);for(let i=0;i<28;i++){ctx.rotate(Math.PI/14);const L=420+R()*380+Math.sin(t*.6+i)*40;ctx.fillStyle=`rgba(255,140,120,${.05*e})`;ctx.beginPath();ctx.moveTo(150,-10);ctx.lineTo(L,0);ctx.lineTo(150,10);ctx.fill()}ctx.restore();
    ctx.fillStyle='#010102';ctx.beginPath();ctx.arc(cx,cy,172,0,7);ctx.fill();
    glowAt(ctx,cx+122,cy-122,60+fl*120,'255,255,255',(.5+.5*pu+fl)*e);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';const y0=830,off=(t*260)%420;
    for(const[lw,al,bl]of[[7,.25,24],[2.4,.9,8]]){ctx.strokeStyle=`rgba(255,80,66,${al*e})`;ctx.shadowColor='#ff4a3a';ctx.shadowBlur=bl;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(-460,y0);
      for(let x=-420-off;x<W+420;x+=420){ctx.lineTo(x+150,y0);ctx.lineTo(x+170,y0-26);ctx.lineTo(x+190,y0+34);ctx.lineTo(x+214,y0-150);ctx.lineTo(x+240,y0+70);ctx.lineTo(x+262,y0-18);ctx.lineTo(x+280,y0);ctx.lineTo(x+420,y0)}ctx.stroke()}ctx.restore()},
  fx(ctx,t,a){motes(ctx,t,a*.6,166,60,'#ff8a70','#ffe2d8','#ff4a3a',.6)}},
bunker:{...base,disp:BOLD,dw:400,dw2:400,nameSize:150,lineScale:1.5,niche:'rect',metal:['#ffe9b0','#f2b233','#8a5a10','#f7c95a','#3d2a08'],hi:'#ffd36b',mid:'#f2a91e',glow:'#ff9a1e',flash:'255,170,40',tint1:[150,140,125],tint2:[90,85,80],nicheTop:'#1a1710',pale:'#f4efe2',
  hon:['THE SENTRY','THE BULWARK','THE GENERATOR','THE VAULT DOOR','THE WARDEN','LAST LINE OF DEFENSE'],
  glyph:[{d:'M52 150 V96 A48 48 0 0 1 148 96 V150 Z'},{d:'M84 150 V106 A16 16 0 0 1 116 106 V150 Z',f:'ink'},{d:'M97 112 h6 v32 h-6z',f:'hot'},{d:'M40 154h120v6h-120z'}],
  scene(ctx,t,e,fl){sky(ctx,[[0,'#08090b'],[.6,'#15130f'],[1,'#050505']]);tile(ctx,TEX.a,t*5,0,8,.22*e);
    ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=2;for(let x=120;x<W;x+=280){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=250;y<H;y+=250){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    const sl=10+34*(.5+.5*Math.sin(t*.9))*e+fl*40;glowAt(ctx,960,640,620,'255,160,40',(.35+fl*.4)*e);
    ctx.fillStyle='#090909';ctx.fillRect(700,300,520,640);ctx.strokeStyle=`rgba(242,169,30,${.5*e})`;ctx.lineWidth=4;ctx.strokeRect(700,300,520,640);
    ctx.fillStyle=`rgba(255,214,130,${.9*e})`;ctx.shadowColor='#ff9a1e';ctx.shadowBlur=60;ctx.fillRect(960-sl/2,300,sl,640);ctx.shadowBlur=0;
    for(const x of[760,1140])for(let y=360;y<900;y+=90){ctx.fillStyle='#1c1a16';ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fill()}
    const b=.5+.5*Math.sin(t*4.2);glowAt(ctx,960,230,260,'255,120,20',(.25+.5*b)*e);ctx.fillStyle=`rgba(255,${150+b*80|0},60,${e})`;ctx.fillRect(930,214,60,26);
    ctx.save();ctx.globalAlpha=.55*e;ctx.beginPath();ctx.rect(0,896,W,46);ctx.clip();ctx.fillStyle='#0a0a0a';ctx.fillRect(0,896,W,46);ctx.fillStyle='#f2a91e';for(let x=-80+(t*20)%120;x<W+80;x+=120){ctx.beginPath();ctx.moveTo(x,942);ctx.lineTo(x+46,896);ctx.lineTo(x+106,896);ctx.lineTo(x+60,942);ctx.fill()}ctx.restore()},
  fx(ctx,t,a){motes(ctx,t,a*.6,14,60,'#ffd9a0','#fff','#ffb040',.4)}},
dawn:{...base,niche:'round',metal:['#fff2c9','#ffc15e','#b5562a','#ffd27a','#4a1f1a'],hi:'#ffd98a',mid:'#f08a4b',glow:'#ff8a3c',flash:'255,150,80',tint1:[255,170,120],tint2:[120,90,150],nicheTop:'#2a1622',wipe:'255,236,205',
  hon:['FIRST LIGHT','THE TRAILBLAZER','THE HORIZON','THE DAYBREAK','THE VANGUARD','THE RISING SUN'],
  glyph:[{d:'M64 124 A36 36 0 0 1 136 124 Z',f:'hot'},{d:'M40 128h120v7h-120z'},{d:'M98 58h4v20h-4z'},{d:'M57 79l3-3 13 14-3 3z'},{d:'M143 79l-3-3-13 14 3 3z'},{d:'M40 110h18v4h-18z'},{d:'M142 110h18v4h-18z'},{d:'M56 143h88v5h-88z'},{d:'M74 155h52v5h-52z'}],
  scene(ctx,t,e,fl){const r=eio(seg(t,0,25)),sy=800-r*260;sky(ctx,[[0,'#090d24'],[.5,'#3a2850'],[.74,'#c4553c'],[.86,'#f4a35a'],[1,'#f4a35a']]);
    tile(ctx,TEX.b,t*8,0,8,.35*e);glowAt(ctx,960,sy,760,'255,170,90',(.5+fl*.3)*e);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(960,sy);for(let i=0;i<18;i++){ctx.rotate(Math.PI/9);ctx.fillStyle=`rgba(255,200,130,${.045*e})`;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1500,-50+Math.sin(t*.4+i)*14);ctx.lineTo(1500,50);ctx.fill()}ctx.restore();
    const sg=ctx.createRadialGradient(960,sy,0,960,sy,150);sg.addColorStop(0,'#fffbe6');sg.addColorStop(.7,'#ffd27a');sg.addColorStop(1,'#ff9a4a');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(960,sy,150,0,7);ctx.fill();
    ridge(ctx,3,760,150,'#5a2c40',t*6);ridge(ctx,5,840,130,'#2e1626',t*14);ridge(ctx,7,930,110,'#12090f',t*26)},
  fx(ctx,t,a){motes(ctx,t,a*.5,22,50,'#ffe2b0','#fff','#ffb060',.5)}},
city:{...base,disp:BOLD,dw:400,dw2:400,nameSize:150,lineScale:1.5,niche:'rect',metal:['#f1f6ff','#9fc2ff','#3b5ea8','#b9d2ff','#152447'],hi:'#bcd4ff',mid:'#5f8fe6',glow:'#5a8cff',flash:'120,160,255',tint1:[110,130,190],tint2:[60,70,120],nicheTop:'#101830',pale:'#eef3ff',wipe:'225,236,255',
  hon:['THE NIGHT WATCH','THE ROOFTOP','THE SKYLINE','THE HIGH WIRE','THE HEADLINE','TOAST OF THE TOWN'],
  glyph:[{d:'M48 150V98h20v52z'},{d:'M72 150V72h24v78z'},{d:'M100 150V54h22v96z'},{d:'M126 150V88h24v62z'},{d:'M40 153h120v6h-120z'},{d:'M142 50a9 9 0 1 0 .01 0z',f:'hot'}],
  scene(ctx,t,e,fl){sky(ctx,[[0,'#040612'],[.6,'#111a3a'],[.85,'#2b2550'],[1,'#0a0a18']]);const R=rng(31);
    for(let i=0;i<130;i++){const x=R()*W,y=R()*560,s=R();ctx.fillStyle=`rgba(220,230,255,${(.2+.6*s)*(.6+.4*Math.sin(t*2+i))*e})`;ctx.fillRect(x,y,1.6+s,1.6+s)}
    glowAt(ctx,1440,300,420,'170,200,255',.35*e);ctx.fillStyle=`rgba(236,242,255,${.95*e})`;ctx.beginPath();ctx.arc(1440,300,70,0,7);ctx.fill();
    tile(ctx,TEX.b,t*10,60,8,.3*e);skyline(ctx,21,900,220,520,'#0b1024',t*8,'150,180,255',e*.5,t);skyline(ctx,22,960,120,430,'#05070f',t*20,'255,206,120',e,t);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineWidth=1.4;for(let i=0;i<7;i++){const x0=i*340-200;const g=ctx.createLinearGradient(x0,138,x0+900,900),p=(t*.22+i*.17)%1;
      g.addColorStop(0,'rgba(200,220,255,.05)');g.addColorStop(cl(p-.05),'rgba(200,220,255,.05)');g.addColorStop(p,`rgba(255,255,255,${.7*e})`);g.addColorStop(cl(p+.05),'rgba(200,220,255,.05)');g.addColorStop(1,'rgba(200,220,255,.05)');
      ctx.strokeStyle=g;ctx.beginPath();ctx.moveTo(x0,138);ctx.lineTo(x0+900,900);ctx.stroke()}ctx.restore();
    if(fl>0)glowAt(ctx,960,500,1100,'150,180,255',fl*.3)},
  fx(ctx,t,a){motes(ctx,t,a*.4,41,40,'#bcd4ff','#fff','#5a8cff',.5)}},
circuit:{...base,disp:TECH,dw:900,dw2:700,nameSize:104,numScale:.6,lineScale:.9,niche:'hex',metal:['#eafff4','#5dffb0','#0f8a5a','#8dffc9','#04301f'],hi:'#8dffc9',mid:'#22d38a',glow:'#1cff9a',flash:'40,255,160',tint1:[40,200,140],tint2:[20,90,110],nicheTop:'#06201a',pale:'#eafff4',txt:'#b9d8cd',hot:'#eafff4',wipe:'200,255,230',
  hon:['THE PATCH','THE COMPILER','THE KERNEL','THE OVERCLOCK','ROOT ACCESS','THE MAINFRAME'],
  glyph:[{d:'M72 72h56v56h-56z'},{d:'M86 86h28v28h-28z',f:'ink'},{d:'M94 94h12v12h-12z',f:'hot'},...[80,97,114].flatMap(v=>[{d:`M52 ${v}h20v5h-20z`},{d:`M128 ${v}h20v5h-20z`},{d:`M${v} 52h5v20h-5z`},{d:`M${v} 128h5v20h-5z`}])],
  scene(ctx,t,e,fl){ctx.fillStyle='#020707';ctx.fillRect(0,0,W,H);glowAt(ctx,960,560,900,'20,160,110',(.22+fl*.3)*e);const R=rng(8);ctx.lineWidth=2;ctx.lineJoin='round';
    for(let i=0;i<70;i++){let x=Math.round(R()*32)*60,y=Math.round(R()*18)*60;const pts=[[x,y]];for(let k=0;k<5;k++){if(k%2)y+=(Math.round(R()*6)-3)*60;else x+=(Math.round(R()*8)-4)*60;pts.push([x,y])}
      ctx.strokeStyle=`rgba(34,211,138,${.2*e})`;ctx.beginPath();pts.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
      for(const p of[pts[0],pts[5]]){ctx.fillStyle=`rgba(93,255,176,${.45*e})`;ctx.fillRect(p[0]-4,p[1]-4,8,8)}
      const q=((t*.3+R())%1)*5,j=Math.floor(q),f=q-j,a=pts[j],b=pts[j+1],px=mix(a[0],b[0],f),py=mix(a[1],b[1],f);glowAt(ctx,px,py,26,'140,255,200',.9*e);ctx.fillStyle='#eafff4';ctx.fillRect(px-2,py-2,4,4)}},
  fx(ctx,t,a){motes(ctx,t,a*.5,51,40,'#5dffb0','#eafff4','#1cff9a',.6,true)}},
range:{...base,niche:'round',metal:['#fff6d0','#f0c64a','#8f6a12','#ffe08a','#3a2a05'],hi:'#ffe08a',mid:'#e0b030',glow:'#ffc83a',flash:'255,205,80',tint1:[220,180,80],tint2:[90,80,60],nicheTop:'#1a1608',
  hon:['THE SPOTTER','THE STEADY HAND','THE TIGHT GROUP','THE LONG SHOT','THE DEADEYE','THE BULLSEYE'],
  glyph:[{d:'M100 46a54 54 0 1 0 .01 0z M100 58a42 42 0 1 0 .01 0z',eo:1},{d:'M100 72a28 28 0 1 0 .01 0z M100 83a17 17 0 1 0 .01 0z',eo:1},{d:'M100 92a8 8 0 1 0 .01 0z',f:'hot'},{d:'M98 34h4v20h-4z'},{d:'M98 146h4v20h-4z'},{d:'M34 98h20v4h-20z'},{d:'M146 98h20v4h-20z'}],
  scene(ctx,t,e,fl){ctx.fillStyle='#060504';ctx.fillRect(0,0,W,H);glowAt(ctx,960,540,820,'200,150,40',(.25+fl*.4)*e);tile(ctx,TEX.b,t*6,0,8,.18*e);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(960,540);
    for(let k=0;k<9;k++){const r=((k+t*.22)%9)/9*1150+20;ctx.strokeStyle=`rgba(240,198,74,${(.5-r/2600)*e})`;ctx.lineWidth=k%3?1.5:4;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke()}
    ctx.strokeStyle=`rgba(240,198,74,${.3*e})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-W,0);ctx.lineTo(W,0);ctx.moveTo(0,-H);ctx.lineTo(0,H);ctx.stroke();
    for(let i=-20;i<=20;i++){ctx.fillStyle=`rgba(240,198,74,${.45*e})`;ctx.fillRect(i*48-1,-(i%5?7:16),2,(i%5?14:32));ctx.fillRect(-(i%5?7:16),i*48-1,(i%5?14:32),2)}
    ctx.rotate(t*.5);const g=ctx.createConicGradient(0,0,0);g.addColorStop(0,`rgba(255,220,120,${.22*e})`);g.addColorStop(.12,'rgba(255,220,120,0)');g.addColorStop(1,'rgba(255,220,120,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1200,0,7);ctx.fill();ctx.restore();
    glowAt(ctx,960,540,70+fl*80,'255,240,190',.8*e)},
  fx(ctx,t,a){motes(ctx,t,a*.5,61,45,'#ffe08a','#fff','#ffc83a',.5)}},
casino:{...base,disp:BOLD,dw:400,dw2:400,nameSize:150,lineScale:1.5,niche:'round',metal:['#fffbe8','#f3e3a8','#b08d3c','#fff0c0','#4a3a12'],hi:'#fff0c0',mid:'#d9b85a',glow:'#ffe08a',flash:'255,236,170',tint1:[40,170,110],tint2:[20,80,60],nicheTop:'#0d2a1d',ink:'#04100b',pale:'#fffbe8',
  hon:['THE ANTE','THE WILD CARD','THE HOT HAND','THE HIGH ROLLER','THE HOUSE EDGE','THE JACKPOT'],
  glyph:[{d:'M62 54h76a10 10 0 0 1 10 10v72a10 10 0 0 1-10 10h-76a10 10 0 0 1-10-10v-72a10 10 0 0 1 10-10z'},...[[76,78],[124,78],[76,122],[124,122]].map(([x,y])=>({d:`M${x} ${y-8}a8 8 0 1 0 .01 0z`,f:'ink'})),{d:'M100 91a9 9 0 1 0 .01 0z',f:'hot'}],
  scene(ctx,t,e,fl){const g=ctx.createRadialGradient(960,520,60,960,520,1150);g.addColorStop(0,'#127048');g.addColorStop(.55,'#07361f');g.addColorStop(1,'#020b07');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);tile(ctx,TEX.a,t*4,t*3,5,.14*e,'overlay');
    ctx.strokeStyle=`rgba(217,184,90,${.35*e})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(960,560,820,330,0,0,7);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(960,560,780,300,0,0,7);ctx.stroke();
    glowAt(ctx,960,300,700,'255,240,190',(.16+fl*.3)*e);const R=rng(17);
    for(let i=0;i<11;i++){const x=R()*W,y0=R()*H,s=60+R()*90,sp=10+R()*26,rot=R()*6+t*(R()-.5)*1.2,y=((y0-t*sp)%(H+200)+H+200)%(H+200)-100,n=1+Math.floor(R()*6);
      ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=(.2+R()*.3)*e;ctx.fillStyle='#fffbe8';ctx.beginPath();ctx.roundRect(-s/2,-s/2,s,s,s*.16);ctx.fill();ctx.fillStyle='#0a2a1a';
      const P=[[0,0],[-1,-1],[1,1],[1,-1],[-1,1],[-1,0],[1,0]],sel=[[0],[1,2],[0,1,2],[1,2,3,4],[0,1,2,3,4],[1,2,3,4,5,6]][n-1];for(const j of sel){ctx.beginPath();ctx.arc(P[j][0]*s*.26,P[j][1]*s*.26,s*.085,0,7);ctx.fill()}ctx.restore()}},
  fx(ctx,t,a){motes(ctx,t,a*.5,71,40,'#fff0c0','#fff','#ffe08a',.4)}},
beach:{...base,disp:BOLD,dw:400,dw2:400,nameSize:150,lineScale:1.5,niche:'arch',metal:['#fff6dc','#ffc46b','#e0567a','#ffd98f','#4a1640'],hi:'#ffd98f',mid:'#ff8a5c',glow:'#ff7a5a',flash:'255,150,110',tint1:[255,150,130],tint2:[130,70,150],nicheTop:'#2a1238',pale:'#fff6dc',wipe:'255,230,205',
  hon:['THE SEA BREEZE','THE RIPTIDE','THE HIGH TIDE','THE SUNSET','THE BIG WAVE','THE LIFEGUARD'],
  glyph:[{d:'M100 54a24 24 0 1 0 .01 0z',f:'hot'},...[116,132,148].map(y=>({d:`M44 ${y}q14-10 28 0t28 0 28 0 28 0v7q-14-10-28 0t-28 0-28 0-28 0z`}))],
  scene(ctx,t,e,fl){sky(ctx,[[0,'#170f3c'],[.38,'#7a2a66'],[.6,'#e2564f'],[.7,'#f79a45'],[.705,'#2b123a'],[1,'#07040f']]);tile(ctx,TEX.b,t*6,-80,9,.3*e);
    glowAt(ctx,960,730,800,'255,150,80',(.5+fl*.3)*e);ctx.save();ctx.beginPath();ctx.rect(0,0,W,760);ctx.clip();const sg=ctx.createLinearGradient(0,520,0,760);sg.addColorStop(0,'#fff3b8');sg.addColorStop(1,'#ff6a4a');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(960,720,200,0,7);ctx.fill();ctx.restore();
    const R=rng(9);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<110;i++){const y=765+R()*R()*320,sp=(y-760)/320,w=(30+R()*160)*(.4+sp),x=960+(R()-.5)*(260+sp*1500);ctx.fillStyle=`rgba(255,${170+R()*60|0},110,${(.5-sp*.35)*(.5+.5*Math.sin(t*2.4+i*1.7))*e})`;ctx.fillRect(x-w/2,y,w,2+sp*3)}ctx.restore();
    for(const[px,s]of[[150,1],[1790,-1]]){ctx.save();ctx.translate(px,1000);ctx.scale(s,1);ctx.strokeStyle='#07040c';ctx.fillStyle='#07040c';ctx.lineWidth=26;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(40,-320,150,-560);ctx.stroke();
      ctx.translate(150,-560);for(let k=0;k<7;k++){const a=-2.9+k*.5+Math.sin(t*.8+k)*.04;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(Math.cos(a)*190,Math.sin(a)*190-70,Math.cos(a)*330,Math.sin(a)*330+70);ctx.quadraticCurveTo(Math.cos(a)*200,Math.sin(a)*200-20,0,0);ctx.lineWidth=10;ctx.stroke();ctx.fill()}ctx.restore()}},
  fx(ctx,t,a){motes(ctx,t,a*.4,81,36,'#ffd98f','#fff','#ff7a5a',.4)}},
blueprint:{...base,disp:TECH,dw:900,dw2:700,nameSize:104,numScale:.6,lineScale:.9,niche:'rect',metal:['#ffffff','#cfe6ff','#6fa8e8','#e6f2ff','#1d4f90'],hi:'#e6f2ff',mid:'#8fc2ff',glow:'#8fc2ff',flash:'170,210,255',tint1:[150,200,255],tint2:[60,110,190],nicheTop:'#0d315f',ink:'#06182f',pale:'#ffffff',txt:'#c5dcf5',hot:'#ffffff',wipe:'225,240,255',
  hon:['THE SKETCH','THE DRAFT','THE FRAMEWORK','THE KEYSTONE','THE CORNERSTONE','THE MASTER PLAN'],
  glyph:[{d:'M100 52L74 150h8l18-68 18 68h8z'},{d:'M62 128a60 60 0 0 0 76 0l-4-5a54 54 0 0 1-68 0z'},{d:'M100 42a7 7 0 1 0 .01 0z',f:'hot'}],
  scene(ctx,t,e,fl){const g=ctx.createRadialGradient(960,540,100,960,540,1200);g.addColorStop(0,'#12407c');g.addColorStop(1,'#051630');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.strokeStyle=`rgba(255,255,255,${(x%200?.05:.13)*e})`;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=20;y<H;y+=40){ctx.strokeStyle=`rgba(255,255,255,${((y-20)%200?.05:.13)*e})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    const R=rng(4);ctx.save();ctx.strokeStyle=`rgba(230,242,255,${(.55+fl*.4)*e})`;ctx.lineWidth=2;
    for(let i=0;i<16;i++){const p=eo(seg((t*.16+R()*1.3)%1.6,0,1)),x=R()*W,y=140+R()*800,k=i%4,s=120+R()*260;ctx.beginPath();
      if(k===0){ctx.setLineDash([s*6.3*p,9999]);ctx.arc(x,y,s,0,7)}else if(k===1){ctx.setLineDash([s*4*p,9999]);ctx.rect(x,y,s*1.4,s*.6)}else{const a=R()*6.3;ctx.setLineDash([s*3*p,9999]);ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*s*3,y+Math.sin(a)*s*3)}
      ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=`rgba(255,255,255,${.7*p*e})`;ctx.fillRect(x-3,y-3,6,6)}ctx.restore()},
  fx(ctx,t,a){motes(ctx,t,a*.35,91,30,'#cfe6ff','#fff','#8fc2ff',.4,true)}},
arcade:{...base,disp:TECH,dw:900,dw2:700,nameSize:104,numScale:.6,lineScale:.9,niche:'rect',metal:['#fff7c2','#ffd23c','#ff3fa4','#ffe66b','#3b0f6b'],hi:'#6bf3ff',mid:'#ff3fa4',glow:'#ff3fa4',flash:'255,80,190',tint1:[255,80,190],tint2:[80,60,200],nicheTop:'#1a0838',ink:'#07021a',pale:'#fff7e0',txt:'#cfd0ff',hot:'#6bf3ff',wipe:'255,210,245',
  hon:['THE EXTRA LIFE','THE COMBO','THE POWER-UP','THE SPEEDRUN','THE BOSS LEVEL','THE HIGH SCORE'],
  glyph:[{d:'M58 112h84v36h-84z'},{d:'M58 88h12v24h-12z'},{d:'M94 76h12v36h-12z'},{d:'M130 88h12v24h-12z'},{d:'M76 100h12v12h-12z'},{d:'M112 100h12v12h-12z'},{d:'M94 124h12v12h-12z',f:'ink'},{d:'M58 70h12v12h-12z',f:'hot'},{d:'M94 58h12v12h-12z',f:'hot'},{d:'M130 70h12v12h-12z',f:'hot'}],
  scene(ctx,t,e,fl){sky(ctx,[[0,'#05011a'],[.45,'#230a52'],[.58,'#5a1470'],[.585,'#06021a'],[1,'#020108']]);const R=rng(77);
    for(let i=0;i<90;i++){const x=Math.round(R()*W/8)*8,y=Math.round(R()*560/8)*8;ctx.fillStyle=`rgba(${i%4?'255,255,255':'107,243,255'},${(.3+.6*R())*(.5+.5*Math.sin(t*3+i))*e})`;ctx.fillRect(x,y,i%7?4:8,i%7?4:8)}
    glowAt(ctx,960,560,640,'255,70,170',(.4+fl*.4)*e);ctx.save();ctx.beginPath();ctx.rect(0,0,W,632);ctx.clip();const sg=ctx.createLinearGradient(0,330,0,632);sg.addColorStop(0,'#ffe66b');sg.addColorStop(1,'#ff3fa4');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(960,560,230,0,7);ctx.fill();
    ctx.fillStyle='#3a0d62';for(let k=0;k<6;k++)ctx.fillRect(700,470+k*28-(t*8%28),520,4+k*2.2);ctx.restore();
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,63,164,${.7*e})`;ctx.shadowColor='#ff3fa4';ctx.shadowBlur=10;ctx.lineWidth=2;
    for(let i=-16;i<=16;i++){ctx.beginPath();ctx.moveTo(960+i*36,632);ctx.lineTo(960+i*330,H+40);ctx.stroke()}
    for(let k=0;k<14;k++){const zz=((k-(t*.9)%1)+14)%14+.3,y=632+310/zz;if(y<H){ctx.globalAlpha=cl(1.3-zz/11);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}ctx.restore()},
  fx(ctx,t,a){motes(ctx,t,a*.6,101,46,'#6bf3ff','#ffe66b','#ff3fa4',.7,true)}},
inferno:{...base,niche:'shield',metal:['#fff4c4','#ffb13c','#c2310f','#ffc85a','#3d0a05'],hi:'#ffc85a',mid:'#ff6a1e',glow:'#ff5a14',flash:'255,110,30',tint1:[255,120,30],tint2:[200,40,20],nicheTop:'#2a0a05',ink:'#0a0303',wipe:'255,226,190',
  hon:['THE SPARK','THE EMBER','THE KINDLING','THE BLAZE','THE WILDFIRE','THE INFERNO'],
  glyph:[{d:'M100 42C118 70 144 88 138 120C134 144 118 156 100 156C82 156 66 144 62 120C58 98 78 92 84 70C92 80 96 62 100 42Z'},{d:'M100 96C110 110 120 118 116 134C113 146 106 151 100 151C94 151 87 146 85 134C83 122 94 116 100 96Z',f:'hot'}],
  scene(ctx,t,e,fl){ctx.fillStyle='#070202';ctx.fillRect(0,0,W,H);sky(ctx,[[0,'rgba(120,20,5,0)'],[.55,`rgba(190,50,10,${.5*e})`],[1,`rgba(255,150,40,${.95*e})`]],300,H);
    tile(ctx,TEX.b,-t*16,-t*90,9,.55*e,'lighter');tile(ctx,TEX.a,t*12,-t*150,6,(.5+fl*.3)*e,'lighter');tile(ctx,TEX.warm,t*30,-t*230,4,.35*e,'lighter');
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(5,1,1,.96)');g.addColorStop(.42,'rgba(5,1,1,.6)');g.addColorStop(.8,'rgba(5,1,1,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    glowAt(ctx,960,1000,900,'255,130,30',(.45+fl*.4)*e)},
  fx(ctx,t,a){motes(ctx,t,a,111,150,'#ffb866','#ffe2b0','#ff7a1c',1.6)}},
neighborhood:{...base,disp:BOLD,dw:400,dw2:400,nameSize:150,lineScale:1.5,niche:'arch',metal:['#fff4dc','#ffc98a','#c0688a','#ffdcae','#3a1c4a'],hi:'#ffdcae',mid:'#f09a7a',glow:'#ffb070',flash:'255,180,120',tint1:[230,150,170],tint2:[90,80,160],nicheTop:'#241a3a',pale:'#fff4dc',wipe:'255,232,214',
  hon:['THE NEW NEIGHBOR','THE BLOCK CAPTAIN','THE FRONT PORCH','THE STREETLIGHT','THE CORNER HOUSE','PRIDE OF THE BLOCK'],
  glyph:[{d:'M52 100L100 56l48 44h-12v50h-72v-50z'},{d:'M100 138C84 126 82 112 91 109C96 107 100 111 100 115C100 111 104 107 109 109C118 112 116 126 100 138Z',f:'hot'},{d:'M44 153h112v6h-112z'}],
  scene(ctx,t,e,fl){sky(ctx,[[0,'#10102e'],[.45,'#4a2f66'],[.68,'#c9705e'],[.78,'#f2a565'],[1,'#f2a565']]);tile(ctx,TEX.b,t*7,-40,9,.3*e);const R=rng(12);
    for(let i=0;i<60;i++){ctx.fillStyle=`rgba(255,240,230,${R()*.6*e})`;ctx.fillRect(R()*W,R()*380,2,2)}
    ridge(ctx,2,820,60,'#2a1a3a',t*5);ctx.fillStyle='#08070f';ctx.fillRect(0,880,W,H);let x=-120;
    for(let i=0;i<9;i++){const w=190+R()*50,h=150+R()*90,by=884;x+=20+R()*30;ctx.fillStyle='#0b0a16';ctx.fillRect(x,by-h,w,h);ctx.beginPath();ctx.moveTo(x-16,by-h);ctx.lineTo(x+w/2,by-h-70-R()*40);ctx.lineTo(x+w+16,by-h);ctx.fill();ctx.fillRect(x+w*.68,by-h-70,20,60);
      for(let k=0;k<3;k++){if(R()<.8){const wx=x+22+k*(w-44)/3,wy=by-h+34+(k%2)*6,fl2=.75+.25*Math.sin(t*1.3+i+k);glowAt(ctx,wx+18,wy+24,90,'255,190,110',.35*fl2*e);ctx.fillStyle=`rgba(255,${205+R()*30|0},140,${.95*fl2*e})`;ctx.fillRect(wx,wy,36,48);ctx.fillStyle='#0b0a16';ctx.fillRect(wx+17,wy,2,48);ctx.fillRect(wx,wy+23,36,2)}}
      ctx.fillStyle='#140f1c';ctx.fillRect(x+w/2-16,by-64,32,64);x+=w;
      ctx.fillStyle='#07060c';ctx.fillRect(x+8,by-250,5,250);glowAt(ctx,x+10,by-254,150,'255,214,150',(.5+fl*.3)*e);ctx.fillStyle=`rgba(255,236,190,${e})`;ctx.beginPath();ctx.arc(x+10,by-254,8,0,7);ctx.fill()}},
  fx(ctx,t,a){const R=rng(131);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<46;i++){const x=R()*W+Math.sin(t*.7+i)*60,y=420+R()*460+Math.cos(t*.9+i*2)*40,b=Math.max(0,Math.sin(t*2+i*1.9));glowAt(ctx,x,y,14,'230,255,150',.8*b*a);}ctx.restore()}}
};
// ----- temple-only set pieces (The Pantheon) -----
function templeSil(ctx,cx,by,s,rim){
  ctx.save();ctx.translate(cx,by);ctx.scale(s,s);
  const P=new Path2D('M-560 0 L-470 -70 L-380 -96 L-330 -150 L330 -150 L380 -96 L470 -70 L560 0 Z');
  const Tp=new Path2D('M-300 -150 h600 v-14 h-600z M-280 -164 h560 v-12 h-560z M-262 -360 h524 v-22 h-524z M-286 -382 L0 -492 L286 -382 Z');
  ctx.fillStyle='#020305';ctx.fill(P);ctx.fill(Tp);
  for(let i=0;i<8;i++){const x=-252+i*72-14;ctx.fillRect(x,-362,28,188);ctx.fillRect(x-5,-366,38,8);ctx.fillRect(x-5,-184,38,8)}
  ctx.beginPath();ctx.arc(0,-420,16,0,7);ctx.fillStyle=`rgba(190,215,255,${.15+rim*.85})`;ctx.fill();
  if(rim>0){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(170,200,255,${rim*.9})`;ctx.lineWidth=2.2;ctx.shadowColor='#8fb4ff';ctx.shadowBlur=14;
    ctx.beginPath();ctx.moveTo(-286,-382);ctx.lineTo(0,-492);ctx.lineTo(286,-382);ctx.stroke();
    for(let i=0;i<8;i++){const x=-252+i*72-14;ctx.beginPath();ctx.moveTo(x+(i<4?28:0),-360);ctx.lineTo(x+(i<4?28:0),-176);ctx.globalAlpha=.55;ctx.stroke()}}
  ctx.restore()}
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
  const fg=ctx.createLinearGradient(0,cy,0,H);fg.addColorStop(0,`rgba(120,80,36,${.5*glowA})`);fg.addColorStop(.25,'rgba(22,15,9,.9)');fg.addColorStop(1,'#020202');ctx.fillStyle=fg;ctx.fillRect(0,cy,W,H-cy);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(201,153,90,${.16*glowA})`;ctx.lineWidth=1.5;
  for(let i=-9;i<=9;i++){ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+i*420,H+300);ctx.stroke()}
  for(let k=0;k<14;k++){const zz=((k-(t*speed)%1)+14)%14+.35,y=cy+300/zz;if(y<H+50){ctx.globalAlpha=cl(1.2-zz/12);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}ctx.restore();
  const cols=[];for(let k=0;k<12;k++){const zz=((k-(t*speed)%1)+12)%12+.42;cols.push(zz)}cols.sort((a,b)=>b-a);
  for(const zz of cols){const sc=1/zz,w=150*sc,top=cy-640*sc,bot=cy+300*sc,lit=cl(.9-zz/9)*glowA;ctx.globalAlpha=cl(zz/.9-.45+.2);
    for(const s of[-1,1])column(ctx,cx+s*560*sc,top,bot,w,s,lit);
    ctx.fillStyle='#040405';ctx.fillRect(cx-620*sc,top-70*sc,1240*sc,56*sc)}
  ctx.globalAlpha=1}
