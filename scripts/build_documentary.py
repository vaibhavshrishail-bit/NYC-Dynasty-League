#!/usr/bin/env python3
"""Season documentary. Every number comes from site/data/canonical.json; chapters are plain data, so the film can be re-cut by editing chapters() below.
  python3 scripts/build_documentary.py facts    # print the facts each chapter uses
  python3 scripts/build_documentary.py stills   # test frames into build/stills
  python3 scripts/build_documentary.py render   # site/documentary/season-2026.mp4
"""
import sys,os,json,base64,asyncio,subprocess,importlib.util
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));E=ROOT+'/src/engine';B=ROOT+'/build/doc';OUT=ROOT+'/site/documentary'
def J(p):return json.load(open(p))
def up(s):return s.strip().upper()
def facts():
    c=J(ROOT+'/site/data/canonical.json');F={f['roster_id']:f for f in c['franchises']};S=[F[i] for i in c['standings']];wk=c['through_week']
    games=[(r['week'],f,r['pf'],F[r['opp']],r['pa']) for f in c['franchises'] for r in f['results'] if r['opp'] and f['roster_id']<r['opp']]
    top=S[0];marg=[(r['week'],r['pf']-r['pa'],F[r['opp']]) for r in top['results']];scare=min(marg,key=lambda m:m[1])
    best=max(((r['pf'],r['week'],f) for f in c['franchises'] for r in f['results']),key=lambda x:x[0])
    close=min(games,key=lambda g:abs(g[2]-g[4]));cw,cl=(close[1],close[3]) if close[2]>close[4] else (close[3],close[1])
    hot=max((f for f in S if f['streak'] and f['streak']['type']=='W' and f is not top),key=lambda f:f['streak']['length'])
    wild=S[c['playoff_teams']-1];outs=S[c['playoff_teams']-1:]
    pl=sorted([dict(p,team=f['team_name']) for f in c['franchises'] for p in f['featured'] if p['starts']>=wk*2/3],key=lambda p:-p['ppg'])
    idp=[p for p in pl if p['position'] in('DL','LB','DB')][0]
    act={};[act.__setitem__(r,act.get(r,0)+1) for t in c['trades'] for r in t['rosters']];mx=max(act.values())
    return dict(c=c,F=F,S=S,wk=wk,games=len(games),avg=sum(f['pf'] for f in c['franchises'])/(len(games)*2),top=top,marg=marg,scare=scare,best=best,close=close,cw=cw,cl=cl,hot=hot,wild=wild,outs=outs,stars=pl[:3],idp=idp,
                trades=len(c['trades']),moved=sum(len(t['players']) for t in c['trades']),picks=sum(len(t['picks']) for t in c['trades']),active=[F[r] for r,n in act.items() if n==mx],active_n=mx,
                last=S[-1],second_last=S[-2],left=c['playoff_week_start']-1-wk)
def jer(p,cap2):return {'l':up(p['last_name']),'num':'' if p['number'] is None else str(p['number']),'tm':p['nfl_team'],'ppg':p['ppg'],'cap':up(p['name']),'cap2':cap2}
def chapters(x):
    c,S,top,hot,wild,wk=x['c'],x['S'],x['top'],x['hot'],x['wild'],x['wk'];second=S[1];L=lambda at,y,text,**k:dict(type='line',at=at,y=y,text=text,**k)
    seq=lambda f:''.join(r['result'] for r in f['results'])
    lost=max((len(s) for s in seq(wild).split('W')),default=0)
    ch=[
     dict(theme='city',dur=7,dim=.5,beats=[L(.8,430,'NYC DYNASTY LEAGUE',size=92,color='hi'),L(1.8,520,f"{c['season']}   ·   YEAR FIVE",font='sans',size=40,ls=18),L(3.4,660,f"{wk} WEEKS.   {x['games']} GAMES.   ONE TEAM HAS NOT LOST.",font='sans',size=44,ls=8)]),
     dict(theme=top['theme'],dur=14,roman='I',title='THE UNBEATEN',beats=[dict(type='emblem',at=.4,theme=top['theme'],x=330,y=470,size=300),L(1.0,690,up(top['team_name']),x=330,size=40,max=520,color='hi'),L(1.4,740,up(top['manager'])+(f"   ·   {len(top['titles'])}× CHAMPION" if top['titles'] else ''),x=330,font='sans',size=28,ls=8,color='txt'),
        dict(type='stat',at=1.6,x=820,y=400,text=top['record'],label='RECORD',size=170),dict(type='stat',at=2.6,x=1190,y=400,v=top['pf']/wk,label='POINTS PER WEEK',sub=f"LEAGUE AVERAGE {x['avg']:.1f}",size=170),dict(type='stat',at=3.6,x=1580,y=400,v=sum(m[1] for m in x['marg'])/wk,pre='+',label='AVERAGE MARGIN',size=170),
        dict(type='cols',at=5.2,x=640,y=780,w=1120,h=170,items=[{'label':f"WK {w}",'v':round(m,1),'hi':m==x['scare'][1]} for w,m,o in x['marg']]),
        L(8.6,880,f"ONE SCARE: WEEK {x['scare'][0]}, BY {x['scare'][1]:.2f} OVER {up(x['scare'][2]['team_name'])}",font='sans',size=32,ls=6,x=1200,until=11.0),
        ]+([L(11.2,880,f"WEEK {x['best'][1]}: {x['best'][0]:.2f}, THE HIGHEST SCORE OF THE SEASON",font='sans',size=32,ls=6,x=1200,color='hi')] if x['best'][2] is top else [])),
     dict(theme=hot['theme'],dur=12,roman='II',title='THE CHASE',beats=[dict(type='emblem',at=.4,theme=second['theme'],x=480,y=430,size=240),L(1.0,600,up(second['team_name']),x=480,size=36,max=700,color='hi'),L(1.4,650,f"{second['record']}   ·   {up(second['manager'])}",x=480,font='sans',size=30,ls=8),
        L(2.2,720,f"{up(second['featured'][0]['name'])}: {second['featured'][0]['ppg']:.1f} POINTS PER START",x=480,font='sans',size=30,ls=5,color='txt',max=760),
        dict(type='emblem',at=4.6,theme=hot['theme'],x=1440,y=430,size=240),L(5.2,600,up(hot['team_name']),x=1440,size=36,max=700,color='hi'),L(5.6,650,f"{hot['record']}   ·   {up(hot['manager'])}",x=1440,font='sans',size=30,ls=8),
        dict(type='dots',at=6.4,x=1440,y=730,gap=62,r=24,seq=seq(hot)),L(8.6,830,f"WINNERS OF {hot['streak']['length']} STRAIGHT",x=1440,font='sans',size=36,ls=8,color='hi')]),
     dict(theme=wild['theme'],dur=15,roman='III',title='THE LINE',beats=[L(.9,320,'FIVE SEEDS GO TO THE BEST RECORDS.',font='sans',size=40,ls=8),L(2.1,380,'THE SIXTH GOES TO THE HIGHEST SCORER LEFT.',font='sans',size=40,ls=8,color='hi'),
        dict(type='bars',at=3.6,x=760,y=450,w=700,row=54,floor=min(f['pf'] for f in x['outs'])*.82,items=[{'label':f"{up(f['team_name'])}  {f['record']}",'v':f['pf'],'hi':f is wild,'note':'SIXTH SEED' if f is wild else ''} for f in x['outs']]),
        L(8.2,880,f"{up(wild['team_name'])}: LOST {lost} STRAIGHT, THEN WON {wild['streak']['length']}." if lost>=3 and wild['streak']['type']=='W' else f"{up(wild['team_name'])} HOLD IT ON POINTS.",font='sans',size=36,ls=6,until=11.4),
        L(11.5,880,f"WEEK {x['close'][0]}: {up(x['cw']['team_name'])} BY {abs(x['close'][2]-x['close'][4]):.2f}. THE CLOSEST GAME OF THE YEAR.",font='sans',size=36,ls=6,color='hi')]),
     dict(theme='casino',dur=9,roman='IV',title='THE MARKET',beats=[dict(type='stat',at=.8,x=520,y=520,v=x['trades'],dec=0,label='TRADES',size=220),dict(type='stat',at=1.7,x=960,y=520,v=x['moved'],dec=0,label='PLAYERS MOVED',size=220),dict(type='stat',at=2.6,x=1400,y=520,v=x['picks'],dec=0,label='DRAFT PICKS MOVED',size=220),
        L(4.6,760,'MOST ACTIVE: '+' AND '.join(up(f['manager']) for f in x['active'])+f", IN {x['active_n']} DEALS EACH" if len(x['active'])>1 else f"MOST ACTIVE: {up(x['active'][0]['manager'])}, IN {x['active_n']} DEALS",font='sans',size=40,ls=8,color='hi')]),
     dict(theme='inferno',dur=11,roman='V',title='THE STARS',beats=[dict(type='jerseys',at=.8,x=960,y=440,gap=440,sc=.5,step=1.3,players=[jer(p,up(p['team'])) for p in x['stars']]+[jer(x['idp'],'TOP DEFENDER')]),
        L(7.2,880,'POINTS PER START FOR THEIR FRANCHISE, LEAGUE SCORING',font='sans',size=28,ls=8,color='txt')]),
     dict(theme=x['last']['theme'],dur=8,roman='VI',title='THE BASEMENT',beats=[dict(type='emblem',at=.4,theme=x['last']['theme'],x=560,y=450,size=250),L(1.0,630,up(x['last']['team_name']),x=560,size=36,max=700,color='hi'),dict(type='stat',at=1.4,x=560,y=800,text=x['last']['record'],label='STILL HUNTING THE FIRST WIN' if x['last']['wins']==0 else 'LAST PLACE',size=120),
        dict(type='emblem',at=3.2,theme=x['second_last']['theme'],x=1360,y=450,size=250),L(3.8,630,up(x['second_last']['team_name']),x=1360,size=36,max=700,color='hi'),dict(type='stat',at=4.2,x=1360,y=800,text=x['second_last']['record'],label='THE TOILET BOWL IS WATCHING',size=120)]),
     dict(theme='city',dur=12,dim=.74,roman='VII',title=f"{x['left']} WEEKS LEFT",beats=[dict(type='grid',at=.6,y=360,teams=[{'theme':f['theme'],'name':up(f['team_name']),'rec':f['record']} for f in S]),
        dict(type='dim',at=7.0,a=.86),L(7.4,520,f"PLAYOFFS BEGIN WEEK {c['playoff_week_start']}",size=84,color='hi'),L(8.2,610,f"NYC DYNASTY LEAGUE   ·   {c['season']}",font='sans',size=36,ls=16)]),
    ]
    t=0
    for k in ch:k['t0']=t;t+=k['dur']
    return {'dur':t,'chapters':ch,'season':c['season'],'through_week':wk}
def html(doc,audio=None):
    s=open(E+'/shell.html').read().replace('/*FONTS*/',open(E+'/fonts.css').read()).replace('/*CORE*/',open(E+'/core.js').read()).replace('/*THEMES*/',open(E+'/themes.js').read()+'\nconst DOC='+json.dumps(doc)+';\n'+open(E+'/doc.js').read())
    s=s.replace('/*TITLE*/','Season documentary').replace('/*CFG*/',json.dumps({'theme':'city','team':'','manager':'','sub':'','lines':[],'players':[{}]})).replace('/*AUDIO*/','data:audio/mp4;base64,'+base64.b64encode(open(audio,'rb').read()).decode() if audio else '')
    os.makedirs(B,exist_ok=True);open(B+'/doc.html','w').write(s)
async def frames(doc,times=None,fps=30,part=None):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);pg=await b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+B+'/doc.html');await pg.evaluate('window.__ready')
        if times:
            os.makedirs(ROOT+'/build/stills',exist_ok=True)
            for tm in times:d=await pg.evaluate(f'window.__frame({tm},0.8)');open(f"{ROOT}/build/stills/doc_{tm:06.2f}.jpg",'wb').write(base64.b64decode(d.split(',')[1]))
        else:
            n=int(doc['dur']*fps);a,b_,tag=(0,n,'') if not part else (n*part[0]//part[1],n*(part[0]+1)//part[1],f'.part{part[0]}')
            ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-crf','23','-preset','slow','-pix_fmt','yuv420p',B+f'/doc.video{tag}.mp4'],stdin=subprocess.PIPE)
            for i in range(a,b_):d=await pg.evaluate(f'window.__frame({i/fps},0.9)');ff.stdin.write(base64.b64decode(d.split(',')[1]))
            ff.stdin.close();assert ff.wait()==0
            d=await pg.evaluate('window.__frame(2.6,0.9)');open(B+'/doc.poster.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        await b.close();print('page errors',errs[:3]);return not errs
if __name__=='__main__':
    cmd=sys.argv[1] if len(sys.argv)>1 else 'facts';x=facts();doc=chapters(x)
    if cmd=='facts':
        for k in doc['chapters']:
            print(f"\n[{k['t0']:>4}s +{k['dur']}s] {k.get('roman','')} {k.get('title','COLD OPEN')} ({k['theme']})")
            for b in k['beats']:print('   ',b['type'],b.get('text') or b.get('label') or '',b.get('v',''),[ (i['label'],i['v']) for i in b.get('items',[])] or '',[(p['cap'],p['ppg']) for p in b.get('players',[])] or '',b.get('seq',''))
        print('\ntotal',doc['dur'],'s')
    elif cmd=='stills':
        html(doc);asyncio.run(frames(doc,times=[float(a) for a in sys.argv[2:]] or [k['t0']+k['dur']-.6 for k in doc['chapters']]))
    elif cmd in('render','audio','part','finish'):
        # 'render' does everything in one go. On a session with a 10-minute command limit use: audio, then part 0 K ... part K-1 K (can run side by side), then finish K.
        spec=importlib.util.spec_from_file_location('da',E+'/doc_audio.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a);os.makedirs(B,exist_ok=True);os.makedirs(OUT,exist_ok=True)
        hits=[k['t0']+b['at'] for k in doc['chapters'] for b in k['beats'] if b['type'] in('stat','emblem')]
        if cmd in('render','audio'):a.doc_score(B+'/doc.wav',doc['dur'],[k['t0'] for k in doc['chapters']],hits);
        if cmd in('render','audio'):subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',B+'/doc.wav','-c:a','aac','-b:a','128k',B+'/doc.m4a'])
        name=f"season-{doc['season']}"
        if cmd in('render','audio'):html(doc,B+'/doc.m4a')
        if cmd=='audio':sys.exit(0)
        if cmd=='render':assert asyncio.run(frames(doc))
        if cmd=='part':assert asyncio.run(frames(doc,part=(int(sys.argv[2]),int(sys.argv[3]))));print('part done',sys.argv[2],flush=True);sys.exit(0)
        if cmd=='finish':
            k=int(sys.argv[2]);open(B+'/parts.txt','w').write(''.join(f"file 'doc.video.part{i}.mp4'\n" for i in range(k)))
            subprocess.check_call(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',B+'/parts.txt','-c','copy',B+'/doc.video.mp4'])
        subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',B+'/doc.video.mp4','-i',B+'/doc.m4a','-c:v','copy','-c:a','copy','-shortest','-movflags','+faststart',f"{OUT}/{name}.mp4"])
        subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',B+'/doc.poster.jpg','-vf','scale=960:-2','-q:v','4',f"{OUT}/{name}.jpg"])
        json.dump({'season':doc['season'],'through_week':doc['through_week'],'duration':doc['dur'],'chapters':[{'start':k['t0'],'title':k.get('title','Cold open')} for k in doc['chapters']]},open(f"{OUT}/{name}.json",'w'),indent=1)
        print('rendered',name,os.path.getsize(f"{OUT}/{name}.mp4")//1024,'KB')
