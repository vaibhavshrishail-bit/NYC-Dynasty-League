#!/usr/bin/env python3
"""Build the 12 franchise cinematics from live Sleeper JSON.
  python3 scripts/build_cinematics.py config            # write build/cine/<slug>.json + html (fast)
  python3 scripts/build_cinematics.py stills            # contact-sheet stills into build/stills
  python3 scripts/build_cinematics.py render [slug ...] # audio + frames + mp4 into site/cinematics
"""
import sys,os,json,base64,asyncio,subprocess,importlib.util
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));E=ROOT+'/src/engine';DATA=ROOT+'/site/data/sleeper';B=ROOT+'/build/cine';OUT=ROOT+'/site/cinematics'
POS={'QB':'QUARTERBACK','RB':'RUNNING BACK','WR':'WIDE RECEIVER','TE':'TIGHT END','K':'KICKER','DL':'DEFENSIVE LINE','DE':'DEFENSIVE LINE','DT':'DEFENSIVE LINE','LB':'LINEBACKER','DB':'DEFENSIVE BACK','CB':'DEFENSIVE BACK','S':'DEFENSIVE BACK','DEF':'DEFENSE'}
def J(p):return json.load(open(p))
def ordinal(n):return f"{n}{'TH' if 10<=n%100<=20 else {1:'ST',2:'ND',3:'RD'}.get(n%10,'TH')}"
def configs():
    idx=J(DATA+'/index.json');season=str(idx['seasons'][0]['season']);S=f'{DATA}/seasons/{season}'
    fr=J(E+'/franchises.json');players=J(DATA+'/players.json');users={u['user_id']:u for u in J(S+'/users.json')};rosters=J(S+'/rosters.json');mu=J(S+'/matchups.json')
    pts={};weeks=0
    for w,ms in mu.items():
        if not any((m.get('points') or 0)>0 for m in ms):continue
        weeks=max(weeks,int(w))
        for m in ms:
            for pid,v in (m.get('players_points') or {}).items():pts[pid]=pts.get(pid,0)+(v or 0)
    titles={}
    for s in idx['seasons'][1:]:
        d=f"{DATA}/seasons/{s['season']}";ro={r['roster_id']:r['owner_id'] for r in J(d+'/rosters.json')}
        for m in J(d+'/winners_bracket.json') or []:
            if m.get('p')==1 and m.get('w'):titles.setdefault(ro[m['w']],[]).append(int(s['season']))
    byp=sorted(rosters,key=lambda r:-(r['settings'].get('fpts',0)+r['settings'].get('fpts_decimal',0)/100))
    prank={r['roster_id']:i+1 for i,r in enumerate(byp)}
    themes_hon=json.loads(subprocess.check_output(['node','-e',"const SERIF=0,SANS=0,TECH=0,BOLD=0,H=1080,W=1920,P0=7.5;"+open(E+'/themes.js').read()+";console.log(JSON.stringify(Object.fromEntries(Object.entries(THEMES).map(([k,v])=>[k,v.hon]))))"]))
    out=[]
    for r in rosters:
        f=fr[str(r['roster_id'])]
        if f['owner_id']!=r['owner_id']:print(f"WARNING roster {r['roster_id']}: owner changed ({f['owner_id']} -> {r['owner_id']}); update franchises.json",file=sys.stderr)
        u=users.get(r['owner_id'],{});name=f.get('brand') or (u.get('metadata') or {}).get('team_name') or f.get('fallback_name') or 'Team '+u.get('display_name','')
        top=sorted([p for p in (r.get('players') or []) if p in players],key=lambda p:-pts.get(p,0))[:6][::-1]
        hon=themes_hon[f['theme']];pl=[]
        for i,pid in enumerate(top):
            p=players[pid];num=p.get('number');pos=p.get('position') or (p.get('fantasy_positions') or ['?'])[0]
            pl.append({'id':pid,'f':(p.get('first_name') or '').upper(),'l':(p.get('last_name') or '').upper(),'n':str(num) if num is not None else pos,'num':str(num) if num is not None else '',
                       'pos':POS.get(pos,pos),'tm':p.get('team') or 'FA','pts':f"{pts.get(pid,0):.1f}",'hon':hon[i]})
        s=r['settings'];ti=sorted(titles.get(r['owner_id'],[]));rec=f"{s['wins']}–{s['losses']}"+(f"–{s['ties']}" if s.get('ties') else '')
        line1=f"{rec}   ·   {ordinal(prank[r['roster_id']])} IN POINTS"+(f"   ·   {len(ti)}× CHAMPION" if ti else '')
        out.append({'slug':f['slug'],'roster_id':r['roster_id'],'owner_id':r['owner_id'],'theme':f['theme'],'team':name.strip().upper(),'team_display':name.strip(),'manager':f['manager'],
                    'sleeper_team_name':(u.get('metadata') or {}).get('team_name'),'line1':line1,'line2':f['tagline'],'sub':f"{f['manager'].upper()}  ·  NYC DYNASTY LEAGUE  ·  EST. 2022",
                    'record':rec,'points_rank':prank[r['roster_id']],'titles':ti,'season':season,'through_week':weeks,'players':pl})
    return sorted(out,key=lambda c:c['roster_id'])
def html(c,audio=None):
    s=open(E+'/shell.html').read().replace('/*FONTS*/',open(E+'/fonts.css').read()).replace('/*CORE*/',open(E+'/core.js').read()).replace('/*THEMES*/',open(E+'/themes.js').read())
    s=s.replace('/*TITLE*/',c['team_display']).replace('/*CFG*/',json.dumps(c)).replace('/*AUDIO*/','data:audio/mp4;base64,'+base64.b64encode(open(audio,'rb').read()).decode() if audio else '')
    os.makedirs(B,exist_ok=True);p=f"{B}/{c['slug']}.html";open(p,'w').write(s);return p
async def frames(c,times=None,fps=30,n=750):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);pg=await b.new_page(viewport={'width':1300,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));await pg.goto('file://'+f"{B}/{c['slug']}.html");await pg.evaluate('window.__ready')
        if times:
            os.makedirs(ROOT+'/build/stills',exist_ok=True)
            for tm in times:
                d=await pg.evaluate(f'window.__frame({tm},0.8)');open(f"{ROOT}/build/stills/{c['slug']}_{tm:05.2f}.jpg",'wb').write(base64.b64decode(d.split(',')[1]))
        else:
            tmp=f"{B}/{c['slug']}.video.mp4"
            ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-crf','23','-preset','slow','-pix_fmt','yuv420p',tmp],stdin=subprocess.PIPE)
            for i in range(n):
                d=await pg.evaluate(f'window.__frame({i/fps},0.9)');ff.stdin.write(base64.b64decode(d.split(',')[1]))
            ff.stdin.close();assert ff.wait()==0
            d=await pg.evaluate('window.__frame(22.6,0.9)');open(f"{B}/{c['slug']}.poster.jpg",'wb').write(base64.b64decode(d.split(',')[1]))
        await b.close()
        if errs:print(c['slug'],'PAGE ERRORS',errs[:3]);return False
        return True
def render(c):
    spec=importlib.util.spec_from_file_location('audio',E+'/audio.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
    os.makedirs(B,exist_ok=True);os.makedirs(OUT,exist_ok=True);wav=f"{B}/{c['slug']}.wav";m4a=f"{B}/{c['slug']}.m4a"
    a.score(wav,c['theme']);subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',wav,'-c:a','aac','-b:a','128k',m4a])
    html(c,m4a);assert asyncio.run(frames(c))
    subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',f"{B}/{c['slug']}.video.mp4",'-i',m4a,'-c:v','copy','-c:a','copy','-shortest','-movflags','+faststart',f"{OUT}/{c['slug']}.mp4"])
    subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',f"{B}/{c['slug']}.poster.jpg",'-vf','scale=960:-2','-q:v','4',f"{OUT}/{c['slug']}.jpg"])
    print('rendered',c['slug'],os.path.getsize(f"{OUT}/{c['slug']}.mp4")//1024,'KB',flush=True)
if __name__=='__main__':
    cmd=sys.argv[1] if len(sys.argv)>1 else 'config';cs=configs();want=sys.argv[2:]
    sel=[c for c in cs if not want or c['slug'] in want]
    if cmd=='config':
        for c in cs:html(c)
        os.makedirs(OUT,exist_ok=True);json.dump({'generated_from':'Sleeper API via scripts/fetch-sleeper.mjs','season':cs[0]['season'],'through_week':cs[0]['through_week'],'franchises':cs},open(OUT+'/manifest.json','w'),indent=1)
        for c in cs:print(c['roster_id'],c['slug'],c['theme'],'|',c['team'],'|',c['line1'],'|',[p['f'][:1]+'. '+p['l']+' '+p['pts'] for p in c['players']])
    elif cmd=='stills':
        for c in sel:html(c);print(c['slug'],asyncio.run(frames(c,times=[2.6,6.6,9.0,17.5,22.6])))
    elif cmd=='render':
        for c in sel:render(c)
