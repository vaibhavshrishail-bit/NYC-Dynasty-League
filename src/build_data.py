import json,re
d=json.load(open('/home/claude/data/snap.json'))
man=d['manifest']; d=d['data']; P=d['players']
txt=open('/home/claude/data/playbook.txt').read()
lines=[l.strip() for l in txt.split('\n') if l.strip()]
H={'sohamdeval':'Soham','adv1996':'Advaith','nigeluno02':'Nihar','Develeper':'Dev','alanadams':'Alan','chutneyman':'Varun','AchalK':'Achal','swagrawal':'Manas','shiamak':'Shiamak','VS96':'Vaibhav','taylorjgardner1996':'Taylor','Dbanda23':'Dhiraj'}
U={u['user_id']:u for u in d['users']}
teams={}
for r in d['rosters']:
    u=U[r['owner_id']]; m=H[u['display_name']]
    name=(u['metadata'].get('team_name') or 'Team Develeper').strip()
    if m=='Vaibhav': name='The Pantheon'
    ros=[]
    for pid in r['players']:
        p=P[pid]
        st='starter' if pid in r['starters'] else 'taxi' if pid in (r['taxi'] or []) else 'ir' if pid in (r['reserve'] or []) else 'bench'
        ros.append(dict(n=p.get('full_name') or (p['first_name']+' '+p['last_name']),p=p['position'],t=p.get('team') or 'FA',num=p.get('number'),age=p.get('age'),exp=p.get('years_exp'),s=st))
    order={'QB':0,'RB':1,'WR':2,'TE':3,'K':4,'DL':5,'LB':6,'DB':7}
    ros.sort(key=lambda x:(order.get(x['p'],9),{'starter':0,'bench':1,'taxi':2,'ir':3}[x['s']],x['n']))
    teams[m]=dict(id=r['roster_id'],manager=m,handle=u['display_name'],team=name,roster=ros,rivals=[])
# tiers
tier=None;tn=None
TN={1:'The Juggernaut',2:'The Glass Cannon',3:'Narrow Way Through',4:'More Questions Than Answers',5:'Long Season Ahead'}
i=0
while i<len(lines):
    l=lines[i]
    m=re.match(r'TIER (\d)',l)
    if m: tier=int(m.group(1))
    if l in teams and i+1<len(lines) and 'Commissioner-Projected' in lines[i+1]:
        T=teams[l]; T['tier']=tier; T['tierName']=TN[tier]
        T['proj']=int(re.search(r'(\d+)(st|nd|rd|th)',lines[i+1]).group(1))
        j=i+2; assert lines[j]=='CURRENT STRENGTH'; T['strength']=lines[j+1]
        assert lines[j+2]=='CORE DYNASTY ASSETS'
        core=[]
        k=j+3
        while lines[k]!='ROSTER NOTES':
            mm=re.match(r'(.+) \((\w+), (\d+)\)',lines[k]); core.append(dict(n=mm.group(1),p=mm.group(2),ktc=int(mm.group(3)))); k+=1
        T['core']=core; T['notes']=lines[k+1]
        mm=re.search(r'([\d.]+) proj.*· ([\d,]+) KTC',lines[k+2]); T['projPts']=float(mm.group(1)); T['ktc']=int(mm.group(2).replace(',',''))
    i+=1
# tables
for l in lines:
    c=[x.strip().replace('\\','') for x in l.strip('|').split('|')]
    if l.startswith('|') and c[0] in teams:
        T=teams[c[0]]
        if len(c)==7 and '%' in c[1]: T['mc']=dict(playoff=c[1],bye=c[2],champ=c[3],finish=float(c[4]),odds=c[6])
        if len(c)==6 and 'of 12' in c[1]: T['sos']=dict(rank=int(c[1].split()[0]),avg=float(c[2]),trio=c[3],stretch=c[5])
        if len(c)==12 and c[0] in teams and re.match(r'\d+-\d+R',c[1]) is None: pass
# h2h matrix
names=['Soham','Advaith','Nihar','Dev','Alan','Varun','Achal','Manas','Shiamak','Vaibhav','Taylor','Dhiraj']
h2h={}
for l in lines:
    if l.startswith('|'):
        c=[x.strip() for x in l.strip('|').split('|')]
        if c[0] in names and len(c)==12 and re.match(r'\d+-\d+R',c[1]):
            opp=[n for n in names if n!=c[0]]
            h2h[c[0]]={}
            for o,cell in zip(opp,c[1:]):
                mm=re.match(r'(\d+)-(\d+)R(\d+)-(\d+) P(\d+)-(\d+)',cell); h2h[c[0]][o]=[int(x) for x in mm.groups()]
assert len(h2h)==12
for a in names:
    for b in names:
        if a!=b: assert h2h[a][b][0]==h2h[b][a][1],(a,b)
    T=teams[a]; T['reg']=[sum(v[2] for v in h2h[a].values()),sum(v[3] for v in h2h[a].values())]
    T['post']=[sum(v[4] for v in h2h[a].values()),sum(v[5] for v in h2h[a].values())]
# luck
i=lines.index('Luck differential (actual win% − all-play win%)')
vals=[float(x.replace('\\','')) for x in lines[i-12:i]]; nm=lines[i+1:i+13]
for n,v in zip(nm,vals): teams[n]['luck']=v
# rivals
i=0
while i<len(lines):
    m=re.match(r"(\w+)'s Rivals$",lines[i])
    if m and m.group(1) in teams:
        T=teams[m.group(1)]; j=i+2
        while lines[j] in ('MARQUEE RIVALRY','PERSONAL RIVALRY','2X ON SCHEDULE'):
            w,l_=lines[j+3].split('-'); mm=re.match(r'REG (\d+)-(\d+) CHAMP (\d+)-(\d+) TOILET (\d+)-(\d+)',lines[j+4])
            T['rivals'].append(dict(tag=lines[j],opp=lines[j+1],wk=lines[j+2].replace('WK ',''),rec=[int(w),int(l_)],split=[int(x) for x in mm.groups()],blurb=lines[j+5])); j+=6
    i+=1
hist=[
 dict(y=2022,champ='Alan',champRec='7-7',runner='Dhiraj',score='121.98–116.68',last='Vaibhav',lastRec='6-8',note="Alan snuck in at 7-7, upset Achal's league-best 11-3 squad in the semifinal, then beat Dhiraj for the ring.",punish='Bachelorette video submission'),
 dict(y=2023,champ='Taylor',champRec='10-4',runner='Alan',score='153.16–91.24',last='Dhiraj',lastRec='3-11',note='Alan, Nihar and Taylor tied for the best record at 10-4. Taylor blew out Alan in the final.',punish='Hot Ones wings'),
 dict(y=2024,champ='Alan',champRec='12-2',runner='Manas',score='165.20–99.42',last='Vaibhav',lastRec='5-9',note='Alan went wire to wire: 12-2, then the largest championship margin on record (65.78). Achal cratered to 1-13.',punish='Dress up as a clown'),
 dict(y=2025,champ='Alan',champRec='10-4',runner='Manas',score='159.80–136.70',last='Varun',lastRec='7-7',note='Nihar posted the best record at 12-2, but Manas knocked him out in the semifinal, 139.00–120.56, before losing the final to Alan.',punish='Showtime on the subway'),
]
out=dict(meta=dict(league='NYC Dynasty League',leagueId=man['league_id'],snapshot=man['fetched_at_utc'],playbook='Commissioner\'s Playbook 2026-27 (2026-09-08)',season=2026),teams=[teams[n] for n in names],h2h=h2h,history=hist)
for T in out['teams']:
    for k in ['tier','core','mc','sos','luck','reg']: assert k in T,(T['manager'],k)
    print(T['id'],T['manager'],T['team'],'T',T['tier'],'reg',T['reg'],'post',T['post'],len(T['rivals']),'rivals',T['mc']['champ'],T['luck'])
json.dump(out,open('src/league.json','w'),separators=(',',':'),ensure_ascii=False)
import os;print(os.path.getsize('src/league.json'))
