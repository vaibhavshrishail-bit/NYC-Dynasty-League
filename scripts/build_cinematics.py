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
def ORD(n):return ordinal(n)
def configs():
    """One config per franchise, taken entirely from site/data/canonical.json (the single source of truth)."""
    c=J(ROOT+'/site/data/canonical.json');wild=[f for f in c['franchises'] if f['seed']==c['playoff_teams']][0];bestout=max(f['wins'] for f in c['franchises'] if f['seed']>=c['playoff_teams'])
    left=c['playoff_week_start']-1-c['through_week'];out=[]
    for f in c['franchises']:
        st=f['streak'] or {'type':'','length':0};ti=f['titles']
        l1=f"{f['record']}   ·   "+(f"{ORD(f['seed'])} SEED" if f['in_playoff_position'] else f"{ORD(f['seed'])} IN THE STANDINGS")+f"   ·   {ORD(f['points_rank'])} IN POINTS"
        if f['losses']==0 and f['wins']>0:a='THE ONLY UNBEATEN TEAM LEFT'
        elif f['wins']==0:a='STILL HUNTING THE FIRST WIN'
        elif st['length']>=3:a=f"WINNERS OF {st['length']} STRAIGHT" if st['type']=='W' else f"{st['length']} STRAIGHT LOSSES"
        elif ti:a=f"{len(ti)}× CHAMPION"
        else:a=''
        if f['seed']<c['playoff_teams']:
            g=f['wins']-bestout;b=f"{g} GAME{'S' if g!=1 else ''} CLEAR IN THE TOP FIVE" if g>0 else 'TOP-FIVE SEED ON THE POINTS TIEBREAK'
        elif f['seed']==c['playoff_teams']:b='SIXTH SEED AS THE TOP SCORER OUTSIDE THE FIVE'
        else:b=f"{wild['pf']-f['pf']:.1f} POINTS OFF THE SIXTH SEED"
        l2=(a+'   ·   ' if a else '')+b+f"   ·   {left} TO PLAY"
        if ti and 'CHAMPION' not in l2:l1+=f"   ·   {len(ti)}× CHAMPION"
        pl=[]
        for p in f['featured'][::-1]:
            r=p['reason'].split(' · ')[0];role='' if 'starter points' in r or 'small sample' in r else r.upper().replace('PPG ','')
            pl.append({'id':p['player_id'],'f':(p['first_name'] or '').upper(),'l':(p['last_name'] or '').upper(),'num':'' if p['number'] is None else str(p['number']),'pos':POS.get(p['position'],p['position']),'tm':p['nfl_team'],
                       'ppg':p['ppg'],'pts':f"{p['points']:.1f}",'starts':p['starts'],'nick':(p['nickname'] or '').upper(),'nick_source':p['nickname_source'],'role':role,'small':p['starts']<c['through_week']/2})
        name=f['team_name'].strip()
        out.append({'slug':f['slug'],'roster_id':f['roster_id'],'owner_id':f['owner_id'],'theme':f['theme'],'team':name.upper(),'team_display':name,'manager':f['manager'],
                    'lines':[l1,l2,f['tagline']],'sub':f"{f['manager'].upper()}  ·  NYC DYNASTY LEAGUE  ·  EST. 2022",'record':f['record'],'seed':f['seed'],'points_rank':f['points_rank'],'titles':ti,
                    'season':str(c['season']),'through_week':c['through_week'],'duration':45,'players':pl})
    return out
def html(c,audio=None):
    s=open(E+'/shell.html').read().replace('/*FONTS*/',open(E+'/fonts.css').read()).replace('/*CORE*/',open(E+'/core.js').read()).replace('/*THEMES*/',open(E+'/themes.js').read())
    s=s.replace('/*TITLE*/',c['team_display']).replace('/*CFG*/',json.dumps(c)).replace('/*AUDIO*/','data:audio/mp4;base64,'+base64.b64encode(open(audio,'rb').read()).decode() if audio else '')
    os.makedirs(B,exist_ok=True);p=f"{B}/{c['slug']}.html";open(p,'w').write(s);return p
async def frames(c,times=None,fps=30,n=1350):
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
            d=await pg.evaluate('window.__frame(43.6,0.9)');open(f"{B}/{c['slug']}.poster.jpg",'wb').write(base64.b64decode(d.split(',')[1]))
        await b.close()
        if errs:print(c['slug'],'PAGE ERRORS',errs[:3]);return False
        return True
def render(c):
    spec=importlib.util.spec_from_file_location('audio',E+'/audio.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
    os.makedirs(B,exist_ok=True);os.makedirs(OUT,exist_ok=True);wav=f"{B}/{c['slug']}.wav";m4a=f"{B}/{c['slug']}.m4a"
    a.score(wav,c['theme'],len(c['players']));subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',wav,'-c:a','aac','-b:a','128k',m4a])
    html(c,m4a);assert asyncio.run(frames(c))
    subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',f"{B}/{c['slug']}.video.mp4",'-i',m4a,'-c:v','copy','-c:a','copy','-shortest','-movflags','+faststart',f"{OUT}/{c['slug']}.mp4"])
    subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i',f"{B}/{c['slug']}.poster.jpg",'-vf','scale=960:-2','-q:v','4',f"{OUT}/{c['slug']}.jpg"])
    print('rendered',c['slug'],os.path.getsize(f"{OUT}/{c['slug']}.mp4")//1024,'KB',flush=True)
if __name__=='__main__':
    cmd=sys.argv[1] if len(sys.argv)>1 else 'config';cs=configs();want=sys.argv[2:]
    sel=[c for c in cs if not want or c['slug'] in want]
    if cmd=='config':
        for c in cs:html(c)
        os.makedirs(OUT,exist_ok=True);json.dump({'generated_from':'Sleeper API via scripts/fetch-sleeper.mjs','season':cs[0]['season'],'through_week':cs[0]['through_week'],'generation':2,'franchises':cs},open(OUT+'/manifest.json','w'),indent=1)
        for c in cs:print(c['roster_id'],c['slug'],c['theme'],'|',c['team'],'|',' / '.join(c['lines']),'|',len(c['players']),'players')
    elif cmd=='stills':
        for c in sel:html(c);print(c['slug'],asyncio.run(frames(c,times=[2.4,4.6,7.0,9.2,13.2,24.5,35.0,39.6,40.9,43.6])))
    elif cmd=='render':
        for c in sel:render(c)
