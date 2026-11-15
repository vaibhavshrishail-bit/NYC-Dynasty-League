// The rivalry "tale of the tape" share card, used by rivalry.html and by the download link inside each matchup on week.html.
// rivalryCard(canvas, canonical, league, A, B) paints the card and resolves true, or resolves false when the two have never met.
// Colour: the first franchise is always blue and the second always red in every bar, dot, ribbon and label, because two
// franchises' own colours can be nearly the same. Crests are drawn unchanged. Every medal is a rule applied to Sleeper results.
function rivalryCard(cv, c, L, A, B) { const x = cv.getContext('2d'), T = (id) => c.byRoster[id], a = A.roster_id, b = B.roster_id, ta = c.themes[A.theme], tb = c.themes[B.theme];
  const KA = '#5ab0f5', KB = '#ff6b81', KAr = '90,176,245', KBr = '255,107,129', keyOf = (id) => (id === a ? KA : KB);
  const g = L.meetings.filter((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a)).map((m) => (m.a === a ? { ...m, x: m.pa, y: m.pb } : { ...m, x: m.pb, y: m.pa }));
  if (!g.length) return Promise.resolve(false);
  const rec = (f) => { const s = g.filter(f); return [s.filter((m) => m.x > m.y).length, s.filter((m) => m.x < m.y).length]; }, all = rec(() => true), reg = rec((m) => m.type === 'regular'), post = rec((m) => ['playoff', 'championship', 'placement'].includes(m.type));
  const by = (f) => g.reduce((p, m) => (f(m) > f(p) ? m : p)), close = by((m) => -Math.abs(m.x - m.y)), last = g[g.length - 1];
  let st = 0, sw = null; for (let i = g.length - 1; i >= 0; i--) { const w = g[i].x > g[i].y ? a : b; if (sw === null) sw = w; if (w !== sw) break; st++; }
  let best = { n: 0 }; { let n = 0, w = null; for (const m of g) { const z = m.x > m.y ? a : b; if (z === w) n++; else { w = z; n = 1; } if (n > best.n) best = { n, w }; } }
  const next = Object.entries(L.schedule).find(([w, prs]) => prs.some((p) => p.includes(a) && p.includes(b))), finals = g.filter((m) => m.type === 'championship');
    // ---- share card: a tale of the tape. Every badge is a rule applied to the results; nothing is written by hand. ----
    const Wc=1080,BN="'Bebas Neue'",BC="'Barlow Condensed'",mA=A.manager.toUpperCase(),mB=B.manager.toUpperCase(),n=g.length,sh=all[0]/n,ldr=all[0]===all[1]?null:(all[0]>all[1]?a:b),lsh=Math.max(sh,1-sh);
    const level=!ldr?['DEAD EVEN','Nobody owns this one']:lsh>=.8&&n>=5?['TOTAL OWNERSHIP',`${T(ldr).manager} has won ${Math.round(lsh*100)}% of the meetings`]:lsh>=.65?['DOMINATION',`${T(ldr).manager} has won ${Math.round(lsh*100)}% of the meetings`]:lsh>=.56?['UPPER HAND',`${T(ldr).manager} leads, but it is close`]:['COIN FLIP','One game separates them'];
    const mg=(m)=>Math.abs(m.x-m.y),ko=g.filter((m)=>m.type==='playoff'||m.type==='championship'),koA=ko.filter((m)=>m.x>m.y).length,koB=ko.length-koA,blow=by(mg),ssn=g.filter((m)=>m.s===c.season),bestLoss=g.filter((m)=>m.x!==m.y).reduce((p,m)=>!p||Math.min(m.x,m.y)>Math.min(p.x,p.y)?m:p,null);
    // ---- medals: each one is a rule applied to the results. tier: 3 gold, 2 silver, 1 bronze. mult: a "×n" tag on the medal. ----
    const medals=[],W_=(m)=>m.x>m.y?a:b,nmW=(id)=>T(id).manager,hi=g.reduce((p,m)=>Math.max(m.x,m.y)>Math.max(p.x,p.y)?m:p,g[0]),tight=g.filter((m)=>mg(m)<10).length,unb=n>=3&&(all[0]===0||all[1]===0);
    let prevRun=0;if(n>=3&&W_(g[n-1])!==W_(g[n-2])){for(let k=n-2;k>=0&&W_(g[k])===W_(g[n-2]);k--)prevRun++}
    if(st>=2)medals.push({who:sw,tier:st>=4?3:st===3?2:1,mult:st,t:'HOT STREAK',d:`${nmW(sw)} has won the last ${st}`,ic:'flame'});
    if(finals.length)medals.push({who:W_(finals[finals.length-1]),tier:3,mult:finals.length>1?finals.length:0,t:'TITLE GAME',d:finals.map((m)=>`${m.s}: ${nmW(W_(m))}`).join(' · '),ic:'cup'});
    if(unb)medals.push({who:all[0]?a:b,tier:3,mult:0,t:`UNBEATEN ${Math.max(all[0],all[1])}–0`,d:`${nmW(all[0]?a:b)} has never lost this matchup`,ic:'crown'});
    if(ko.length&&koA!==koB)medals.push({who:koA>koB?a:b,tier:2,mult:Math.max(koA,koB)>1?Math.max(koA,koB):0,t:'SEASON ENDER',d:`${nmW(koA>koB?a:b)} leads the playoff games ${Math.max(koA,koB)}–${Math.min(koA,koB)}`,ic:'skull'});
    if(best.n>=3&&best.n>st)medals.push({who:best.w,tier:best.n>=5?3:2,mult:best.n,t:'DYNASTY RUN',d:`${nmW(best.w)}'s longest streak in the series`,ic:'bolt'});
    if(prevRun>=2)medals.push({who:W_(g[n-1]),tier:prevRun>=4?3:2,mult:0,t:'STREAK BREAKER',d:`${nmW(W_(g[n-1]))} ended ${nmW(W_(g[n-2]))}'s run of ${prevRun}`,ic:'break'});
    if(blow&&mg(blow)>=35)medals.push({who:W_(blow),tier:mg(blow)>=60?3:2,mult:0,t:`BLOWOUT +${mg(blow).toFixed(1)}`,d:`${nmW(W_(blow))}, ${blow.s} Week ${blow.w}`,ic:'boom'});
    if(close&&mg(close)<5)medals.push({who:W_(close),tier:mg(close)<1?3:1,mult:0,t:`PHOTO FINISH ${mg(close).toFixed(2)}`,d:`${nmW(W_(close))} survived, ${close.s} Week ${close.w}`,ic:'eye'});
    if(Math.max(hi.x,hi.y)>=170)medals.push({who:W_(hi),tier:Math.max(hi.x,hi.y)>=190?3:2,mult:0,t:`FIREPOWER ${Math.max(hi.x,hi.y).toFixed(1)}`,d:`${nmW(W_(hi))}, top score of the series, ${hi.s} Week ${hi.w}`,ic:'target'});
    if(ssn.length>=2&&ssn.every((m)=>W_(m)===W_(ssn[0])))medals.push({who:W_(ssn[0]),tier:2,mult:0,t:`${c.season} SWEEP`,d:`${nmW(W_(ssn[0]))} won both meetings this season`,ic:'broom'});
    if(tight>=2)medals.push({who:null,tier:1,mult:tight,t:'NAIL-BITERS',d:`${tight} of ${n} meetings decided by under 10`,ic:'pulse'});
    if(bestLoss&&Math.min(bestLoss.x,bestLoss.y)>=150)medals.push({who:bestLoss.x>bestLoss.y?b:a,tier:1,mult:0,t:`ROBBED AT ${Math.min(bestLoss.x,bestLoss.y).toFixed(1)}`,d:`${nmW(bestLoss.x>bestLoss.y?b:a)} scored that and lost, ${bestLoss.s}`,ic:'mask'});
    if(n&&!medals.length)medals.push({who:W_(last),tier:1,mult:0,t:'LAST WORD',d:`${nmW(W_(last))} won the most recent meeting`,ic:'bolt'});
    medals.sort((p,q)=>q.tier-p.tier);const ms=medals.slice(0,6);
    const IC={flame:'M20 3c2 8 10 10 10 20a10 10 0 0 1-20 0c0-4 2-6 4-8 0 4 2 5 3 5 0-6 1-11 3-17z',cup:'M11 5h18v10a9 9 0 0 1-18 0zM11 8H5c0 6 3 8 6 8M29 8h6c0 6-3 8-6 8M20 24v6M12 35h16M14 30h12v5H14z',skull:'M20 4c8 0 13 5 13 12 0 4-2 7-5 9v7H12v-7c-3-2-5-5-5-9C7 9 12 4 20 4zM14 18a3 3 0 1 0 0-.1M26 18a3 3 0 1 0 0-.1M17 32v-5M23 32v-5',bolt:'M23 3L8 23h10l-2 14 16-21H21z',boom:'M20 2l4 10 10-5-5 10 9 4-9 4 4 10-10-5-3 9-3-9-10 5 5-10-10-4 10-4-5-10 10 5z',eye:'M3 20c5-9 11-12 17-12s12 3 17 12c-5 9-11 12-17 12S8 29 3 20zM20 14a6 6 0 1 0 0 12 6 6 0 0 0 0-12',broom:'M30 4L18 20M12 18l10 8-6 10H6zM10 28l8 6',mask:'M4 12c10-4 22-4 32 0 0 12-6 20-16 20S4 24 4 12zM11 17h6M23 17h6M14 25c4 2 8 2 12 0',crown:'M5 30h30M6 26L4 10l9 8 7-12 7 12 9-8-2 16z',break:'M4 20h10l4-9 5 18 4-9h9M20 3v6M20 31v6',target:'M20 4a16 16 0 1 0 0 32 16 16 0 0 0 0-32zM20 11a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM20 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4',pulse:'M3 21h8l3-10 6 20 4-14 3 4h10'};
    const TIER={3:['#fff6c2','#ffd24a','#a8780a','GOLD'],2:['#ffffff','#cfd8e6','#66788f','SILVER'],1:['#ffe0c2','#d98f55','#74401a','BRONZE']};
    const rows=Math.ceil(ms.length/3),HB=st>=2?128:0,Hc=590+HB+236+(rows?84+rows*268:0)+166+118+58;
    const logo=new Image();
    const paint=()=>{cv.width=Wc;cv.height=Hc;x.textBaseline='alphabetic';
      const fit=(str,font,size,maxW)=>{let z=size;x.font=`${font.replace('%',z)}`;while(x.measureText(str).width>maxW&&z>14){z-=2;x.font=font.replace('%',z)}return z};
      const sp=(t,px)=>{x.letterSpacing=px+'px';return t};
      // field: league navy, a soft glow in each franchise's colour behind its crest, fine diagonal lines
      const bg=x.createLinearGradient(0,0,0,Hc);bg.addColorStop(0,'#0f1b33');bg.addColorStop(.45,'#0b1220');bg.addColorStop(1,'#080d18');x.fillStyle=bg;x.fillRect(0,0,Wc,Hc);
      for(const[tt,cx0]of[[ta,205],[tb,Wc-205]]){const gl=x.createRadialGradient(cx0,270,10,cx0,270,330);gl.addColorStop(0,`rgba(${tt.flash},.42)`);gl.addColorStop(1,`rgba(${tt.flash},0)`);x.fillStyle=gl;x.fillRect(cx0-340,0,680,590)}
      x.save();x.beginPath();x.rect(0,0,Wc,590);x.clip();x.globalAlpha=.05;x.strokeStyle='#fff';x.lineWidth=2;for(let k=-600;k<Wc;k+=30){x.beginPath();x.moveTo(k,590);x.lineTo(k+320,0);x.stroke()}x.restore();
      // masthead: the league's logo between its name and the file title
      x.fillStyle='#e9eef7';x.font=`600 24px ${BC}`;x.textAlign='right';sp('',6);x.fillText('NYC DYNASTY LEAGUE',Wc/2-74,70);x.textAlign='left';x.fillText('RIVALRY FILE',Wc/2+80,70);x.letterSpacing='0px';
      if(logo.complete&&logo.naturalWidth){x.save();x.beginPath();x.arc(Wc/2,66,52,0,7);x.clip();x.drawImage(logo,Wc/2-54,12,108,108);x.restore();x.beginPath();x.arc(Wc/2,66,52,0,7);x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=2;x.stroke()}
      crestCanvas(x,ta,205,262,118);crestCanvas(x,tb,Wc-205,262,118);
      x.textAlign='center';fit(mA,`400 %px ${BN}`,96,400);x.fillStyle='#fff';x.fillText(mA,205,470);fit(mB,`400 %px ${BN}`,96,400);x.fillText(mB,Wc-205,470);
      fit(A.team_name.toUpperCase(),`600 %px ${BC}`,28,400);x.fillStyle=KA;x.fillText(A.team_name.toUpperCase(),205,506);fit(B.team_name.toUpperCase(),`600 %px ${BC}`,28,400);x.fillStyle=KB;x.fillText(B.team_name.toUpperCase(),Wc-205,506);
      x.fillStyle='#c9d2e0';x.font=`600 24px ${BC}`;x.fillText(`${A.record} IN ${c.season}`,205,540);x.fillText(`${B.record} IN ${c.season}`,Wc-205,540);x.fillStyle=KA;x.beginPath();x.roundRect(205-80,552,160,9,5);x.fill();x.fillStyle=KB;x.beginPath();x.roundRect(Wc-205-80,552,160,9,5);x.fill();
      // the series score on a gold-framed plate
      x.fillStyle='#070b14';x.beginPath();x.roundRect(Wc/2-172,158,344,248,20);x.fill();x.strokeStyle='#ffd24a';x.lineWidth=4;x.stroke();x.strokeStyle='rgba(255,210,74,.35)';x.lineWidth=2;x.beginPath();x.roundRect(Wc/2-160,170,320,224,13);x.stroke();
      x.fillStyle='#ffd24a';x.font=`600 22px ${BC}`;sp('',5);x.fillText('ALL-TIME SERIES',Wc/2,208);x.letterSpacing='0px';
      fit(`${all[0]}–${all[1]}`,`400 %px ${BN}`,176,300);x.fillStyle='#fff';x.fillText(`${all[0]}–${all[1]}`,Wc/2,356);x.fillStyle='#9fb0c8';x.font=`600 21px ${BC}`;x.fillText(`${n} MEETING${n>1?'S':''} SINCE ${g[0].s}`,Wc/2,384);
      // the league's red, white and blue rule
      [['#d81f44',0],['#f2f4f8',5],['#2f6fe0',10]].forEach(([col,dy])=>{x.fillStyle=col;x.fillRect(0,576+dy,Wc,5)});
      let y=591;
      // streak banner
      if(st>=2){const kr=sw===a?KAr:KBr,gr=x.createLinearGradient(0,y,Wc,y);gr.addColorStop(0,`rgba(${kr},.85)`);gr.addColorStop(.6,`rgba(${kr},.4)`);gr.addColorStop(1,`rgba(${kr},.08)`);x.fillStyle='#070b14';x.fillRect(0,y,Wc,HB);x.fillStyle=gr;x.fillRect(0,y,Wc,HB);
        x.save();x.translate(60,y+24);x.scale(2,2);x.fillStyle='#fff';x.fill(new Path2D(IC.flame));x.restore();
        x.textAlign='left';x.fillStyle='#fff';fit(`${T(sw).manager.toUpperCase()} HAS WON ${st} STRAIGHT`,`400 %px ${BN}`,70,Wc-150-250);x.fillText(`${T(sw).manager.toUpperCase()} HAS WON ${st} STRAIGHT`,150,y+70);
        x.font=`600 22px ${BC}`;sp('',4);x.fillStyle='#f2f4f8';x.fillText(`ACTIVE STREAK · ${st>=4?'ON A TEAR':st===3?'ROLLING':'HEATING UP'}`,150,y+104);x.letterSpacing='0px';
        const l8=g.slice(-8),r0=13;l8.forEach((m,i)=>{const px=Wc-60-(l8.length-1-i)*34,wn=W_(m);x.beginPath();x.arc(px,y+52,r0,0,7);x.fillStyle=keyOf(wn);x.fill();if(i>=l8.length-st){x.strokeStyle='#fff';x.lineWidth=3;x.stroke()}});
        x.textAlign='right';x.fillStyle='#dfe7f3';x.font=`600 18px ${BC}`;sp('',2);x.fillText(`LAST ${l8.length} · NEWEST RIGHT`,Wc-46,y+96);x.letterSpacing='0px';y+=HB}
      // dominance meter
      y+=50;x.textAlign='left';x.fillStyle='#ffd24a';x.font=`600 22px ${BC}`;sp('',5);x.fillText('LEVEL OF DOMINANCE',60,y);x.letterSpacing='0px';
      x.textAlign='right';x.fillStyle='#9fb0c8';x.font=`600 22px ${BC}`;x.fillText(level[1].toUpperCase(),Wc-60,y);
      x.textAlign='left';x.fillStyle='#fff';x.font=`400 84px ${BN}`;x.fillText(level[0],60,y+78);
      const bx=60,bw=Wc-120,byy=y+100,bh=34,wa=Math.max(.04,Math.min(.96,sh))*bw;x.fillStyle=KA;x.beginPath();x.roundRect(bx,byy,wa-3,bh,[8,0,0,8]);x.fill();x.fillStyle=KB;x.beginPath();x.roundRect(bx+wa+3,byy,bw-wa-3,bh,[0,8,8,0]);x.fill();
      x.font=`700 26px ${BC}`;x.textAlign='left';x.fillStyle=KA;x.fillText(`${mA} ${Math.round(sh*100)}%`,bx,byy+bh+32);x.textAlign='right';x.fillStyle=KB;x.fillText(`${Math.round((1-sh)*100)}% ${mB}`,bx+bw,byy+bh+32);
      x.strokeStyle='#fff';x.lineWidth=2;x.setLineDash([4,5]);x.beginPath();x.moveTo(bx+bw/2,byy-8);x.lineTo(bx+bw/2,byy+bh+8);x.stroke();x.setLineDash([]);
      y+=186;
      // medals
      if(ms.length){x.fillStyle='rgba(255,255,255,.08)';x.fillRect(60,y,Wc-120,2);y+=50;x.textAlign='left';x.fillStyle='#ffd24a';x.font=`600 22px ${BC}`;sp('',5);x.fillText('MEDALS EARNED',60,y);x.letterSpacing='0px';x.textAlign='right';x.fillStyle='#9fb0c8';x.fillText(`${medals.length} IN THIS RIVALRY${medals.length>ms.length?' · TOP '+ms.length+' SHOWN':''}`,Wc-60,y);y+=34;
        const cw=(Wc-120-2*20)/3,ch=248,star=(cx0,cy0,ro,ri,pts)=>{x.beginPath();for(let k=0;k<pts*2;k++){const an=-Math.PI/2+k*Math.PI/pts,rr=k%2?ri:ro;x[k?'lineTo':'moveTo'](cx0+Math.cos(an)*rr,cy0+Math.sin(an)*rr)}x.closePath()};
        ms.forEach((md,i)=>{const inRow=Math.min(3,ms.length-Math.floor(i/3)*3),cx0=60+(i%3)*(cw+20)+(3-inRow)*(cw+20)/2,cy0=y+Math.floor(i/3)*(ch+20),mx=cx0+cw/2,my=cy0+84,[c1,c2,c3]=TIER[md.tier],oc=md.who?keyOf(md.who):'#9fb0c8';
          x.fillStyle='#111a2c';x.beginPath();x.roundRect(cx0,cy0,cw,ch,16);x.fill();x.strokeStyle=md.tier===3?'rgba(255,210,74,.7)':'rgba(255,255,255,.12)';x.lineWidth=md.tier===3?3:2;x.stroke();
          const gl=x.createRadialGradient(mx,my,8,mx,my,120);gl.addColorStop(0,md.tier===3?'rgba(255,210,74,.34)':md.tier===2?'rgba(207,216,230,.22)':'rgba(217,143,85,.22)');gl.addColorStop(1,'rgba(0,0,0,0)');x.save();x.beginPath();x.roundRect(cx0,cy0,cw,ch,16);x.clip();x.fillStyle=gl;x.fillRect(cx0,cy0,cw,ch);x.restore();
          // ribbon tails in the owner's colour, then a starburst, a ring and a faceted core
          x.fillStyle=oc;for(const s of[-1,1]){x.beginPath();x.moveTo(mx+s*8,my+40);x.lineTo(mx+s*40,my+40);x.lineTo(mx+s*48,my+80);x.lineTo(mx+s*29,my+70);x.lineTo(mx+s*14,my+82);x.closePath();x.fill()}
          const mg1=x.createLinearGradient(mx-70,my-70,mx+70,my+70);mg1.addColorStop(0,c1);mg1.addColorStop(.5,c2);mg1.addColorStop(1,c3);
          star(mx,my,md.tier===3?76:70,md.tier===3?60:58,md.tier===3?16:12);x.fillStyle=mg1;x.fill();x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=2;x.stroke();
          x.beginPath();x.arc(mx,my,54,0,7);x.fillStyle='#0a1120';x.fill();x.strokeStyle=c2;x.lineWidth=3;x.stroke();
          const mg2=x.createLinearGradient(mx,my-46,mx,my+46);mg2.addColorStop(0,c1);mg2.addColorStop(1,c2);x.beginPath();for(let k=0;k<6;k++){const an=Math.PI/6+k*Math.PI/3;x[k?'lineTo':'moveTo'](mx+Math.cos(an)*45,my+Math.sin(an)*45)}x.closePath();x.fillStyle=mg2;x.fill();
          x.save();x.translate(mx-30,my-30);x.scale(1.5,1.5);x.strokeStyle='#0a1120';x.lineWidth=2.6;x.lineJoin='round';x.lineCap='round';x.stroke(new Path2D(IC[md.ic]));x.restore();
          x.save();x.beginPath();x.arc(mx,my,45,Math.PI*1.1,Math.PI*1.75);x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=4;x.stroke();x.restore();
          if(md.mult>1){x.beginPath();x.arc(mx+52,my+40,25,0,7);x.fillStyle='#d81f44';x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.stroke();x.textAlign='center';x.fillStyle='#fff';x.font=`400 30px ${BN}`;x.fillText('×'+md.mult,mx+52,my+51)}
          x.textAlign='center';fit(md.t,`400 %px ${BN}`,40,cw-24);x.fillStyle='#fff';x.fillText(md.t,mx,cy0+210);fit(md.d.toUpperCase(),`600 %px ${BC}`,19,cw-24);x.fillStyle=md.who?oc:'#b6c0d0';x.fillText(md.d.toUpperCase(),mx,cy0+234)});
        y+=rows*(ch+20)}
      // last five
      y+=46;const l5=g.slice(-5),pw=(Wc-120-4*12)/5;x.textAlign='left';x.fillStyle='#ffd24a';x.font=`600 22px ${BC}`;sp('',5);x.fillText(`LAST ${l5.length>1?l5.length+' MEETINGS':'MEETING'}`,60,y);x.letterSpacing='0px';
      l5.forEach((m,i)=>{const px=60+i*(pw+12),wn=m.x>m.y,kc=wn?KA:KB;x.fillStyle='#111a2c';x.beginPath();x.roundRect(px,y+16,pw,96,12);x.fill();x.fillStyle=kc;x.beginPath();x.roundRect(px,y+16,pw,8,[12,12,0,0]);x.fill();
        x.textAlign='center';x.fillStyle=kc;fit((wn?mA:mB),`400 %px ${BN}`,34,pw-16);x.fillText(wn?mA:mB,px+pw/2,y+60);x.fillStyle='#fff';x.font=`600 22px ${BC}`;x.fillText(`${Math.max(m.x,m.y).toFixed(1)}–${Math.min(m.x,m.y).toFixed(1)}`,px+pw/2,y+84);x.fillStyle='#8fa0b8';x.font=`600 17px ${BC}`;x.fillText(`${m.s} WK ${m.w}${m.type==='championship'?' · FINAL':m.type==='playoff'?' · PLAYOFF':''}`,px+pw/2,y+104)});
      y+=150;
      // tale of the tape numbers
      const cols=[[`${reg[0]}–${reg[1]}`,'REGULAR SEASON'],[`${post[0]}–${post[1]}`,'PLAYOFFS'],[`${(g.reduce((q,m)=>q+m.x,0)/n).toFixed(1)}–${(g.reduce((q,m)=>q+m.y,0)/n).toFixed(1)}`,'AVERAGE SCORE'],[next?`WEEK ${next[0]}`:'—',next?'NEXT MEETING':'NO GAME LEFT IN '+c.season]],tw=(Wc-120)/cols.length;
      cols.forEach((cc,i)=>{const cx1=60+tw*i+tw/2;x.textAlign='center';x.fillStyle=i===3&&next?'#ffd24a':'#fff';fit(cc[0],`400 %px ${BN}`,56,tw-16);x.fillText(cc[0],cx1,y+44);x.fillStyle='#8fa0b8';x.font=`600 18px ${BC}`;sp('',2);x.fillText(cc[1],cx1,y+72);x.letterSpacing='0px';if(i){x.strokeStyle='#2a3b55';x.lineWidth=2;x.beginPath();x.moveTo(60+tw*i,y+4);x.lineTo(60+tw*i,y+76);x.stroke()}});
      [['#d81f44',0],['#f2f4f8',4],['#2f6fe0',8]].forEach(([col,dy])=>{x.fillStyle=col;x.fillRect(0,Hc-12+dy,Wc,4)});
      x.textAlign='center';x.fillStyle='#7f90aa';x.font=`600 18px ${BC}`;sp('',2);x.fillText(`${mA} LISTED FIRST  ·  EVERY NUMBER IS A SLEEPER RESULT  ·  THROUGH WEEK ${c.through_week}`,Wc/2,Hc-30);x.letterSpacing='0px'};

  const fonts = document.fonts.ready.then(() => Promise.all(["400 100px 'Bebas Neue'", "600 30px 'Barlow Condensed'", "700 24px 'Barlow Condensed'"].map((f) => document.fonts.load(f))));
  const img = new Promise((res) => { logo.onload = logo.onerror = () => res(); logo.src = (typeof _base === 'function' ? _base() : '') + 'assets/brand/logo-192.png'; });
  return Promise.all([fonts, img]).then(() => { paint(); return true; }); }
