"""Original synthesized scores: one musical style per franchise theme. numpy/scipy only, no samples.
score(path, theme, n_players) writes a 45s stereo WAV cut to the film timeline (0-6 intro, 6-12 story, 12-36 players, 36-41.2 roll call, 41.2 crest).
Each style in STY is plain data: tempo, key, chord progression, and 16-step patterns per section (I intro, S story, P players) for drums, bass, chords and lead.
To change a team's music edit its STY entry; to add an instrument add a function to INST."""
import numpy as np, scipy.signal as sg, wave
SR=48000;D=45.0;N=int(SR*D);P0=12.0;C0=36.0;L0=41.2
rs=np.random.RandomState(7)
def hz(m):return 440*2**((m-69)/12)
def lp(x,fc,o=2):b,a=sg.butter(o,min(fc,SR/2-200)/(SR/2));return sg.lfilter(b,a,x)
def hp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2),'high');return sg.lfilter(b,a,x)
def bp(x,lo,hi):b,a=sg.butter(2,[lo/(SR/2),hi/(SR/2)],'band');return sg.lfilter(b,a,x)
def tt(d):return np.arange(int(d*SR))/SR
def env(n,a,d):e=np.exp(-np.arange(n)/SR/d);q=max(1,int(a*SR));e[:q]*=np.linspace(0,1,q);return e
def saw(f,d,det=.004):t=tt(d);return sum(2*((t*f*(1+x))%1)-1 for x in(-det,0,det))/3
def fade(x,ms=8):n=min(len(x)//2,int(SR*ms/1000));x=x.copy();x[-n:]*=np.linspace(1,0,n);return x
# ---- instruments: f(freq, seconds) -> mono ----
def ks(f,d,bright=.6,decay=.997):          # plucked string (Karplus-Strong)
    n=max(2,int(SR/f));x=np.zeros(int(d*SR));b=rs.uniform(-1,1,n);x[:n]=lp(b,2000+bright*9000,1) if bright<1 else b
    a=np.zeros(n+2);a[0]=1;a[n]=-.5*decay;a[n+1]=-.5*decay;return fade(sg.lfilter([1],a,x))
def piano(f,d):
    t=tt(d);x=sum(np.sin(2*np.pi*f*k*np.sqrt(1+.0004*k*k)*t)*np.exp(-t*(1.2+.9*k))/k**1.1 for k in range(1,9));h=hp(rs.randn(len(t)),2000)*np.exp(-t*90)*.15
    e=np.ones(len(t));e[:int(.003*SR)]=np.linspace(0,1,int(.003*SR));return fade((x+h)*e)
def rhodes(f,d):t=tt(d);return fade(np.sin(2*np.pi*f*t+1.6*np.exp(-t*5)*np.sin(2*np.pi*f*14*t)*.25+.9*np.exp(-t*3)*np.sin(2*np.pi*f*t))*np.exp(-t*1.6)*(1+.12*np.sin(2*np.pi*5*t)))
def bell(f,d):t=tt(d);return fade(sum(a*np.sin(2*np.pi*f*r*t)*np.exp(-t/dc) for r,a,dc in[(1,1,.7),(2.76,.5,.4),(5.4,.3,.25)]))
def marimba(f,d):t=tt(d);return fade((np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*f*4*t)*np.exp(-t*30))*np.exp(-t*7))
def sq(f,d):t=tt(d);return fade(np.sign(np.sin(2*np.pi*f*t))*.6*np.exp(-t*2.5))
def tri(f,d):t=tt(d);return fade((2*np.abs(2*((t*f)%1)-1)-1)*np.exp(-t*1.5))
def sawlead(f,d):n=int(d*SR);return fade(lp(saw(f,d,.006),2600)*env(n,.004,max(.08,d*.6)))
def pad(f,d):n=int(d*SR);e=np.minimum(1,np.minimum(np.arange(n)/SR/.5,(n-np.arange(n))/SR/.4));return lp(saw(f,d,.007),1100)*e
def brass(f,d):n=int(d*SR);e=np.minimum(1,np.arange(n)/SR/.04)*np.exp(-np.arange(n)/SR/max(.25,d*.9));return fade(lp(saw(f,d,.003)+.5*saw(f*2,d,.003),1800)*e)
def organ(f,d):t=tt(d);return fade(sum(a*np.sin(2*np.pi*f*k*t) for k,a in[(1,1),(2,.6),(3,.4),(4,.25),(6,.15)])*np.minimum(1,t/.01))
def power(f,d,mute=False):                 # distorted guitar fifth
    dc=.985 if mute else .9975;x=ks(f,d,1,dc)+ks(f*1.498,d,1,dc)+.7*ks(f*2,d,1,dc);return fade(lp(np.tanh(x*9),3800)*(.9 if mute else 1))
def b808(f,d):t=tt(d);ph=2*np.pi*np.cumsum(f*(1+1.2*np.exp(-t*45)))/SR;return fade(np.tanh(np.sin(ph)*2.2)*np.exp(-t/max(.25,d*.7)))
def sawbass(f,d):n=int(d*SR);return fade(lp(saw(f,d,.003),500)*env(n,.004,max(.1,d*.8)))
def timp(f,d):t=tt(d);return fade(np.sin(2*np.pi*np.cumsum(f*(1+.5*np.exp(-t*30)))/SR)*np.exp(-t*3)+lp(rs.randn(len(t)),400)*np.exp(-t*40)*.5)
INST=dict(ks=lambda f,d:ks(f,d,.7),nylon=lambda f,d:ks(f,d,.35,.996),piano=piano,rhodes=rhodes,bell=bell,marimba=marimba,sq=sq,tri=tri,saw=sawlead,pad=pad,brass=brass,organ=organ,power=power,
          mute=lambda f,d:power(f,d,True),b808=b808,sawbass=sawbass,pluck=lambda f,d:ks(f,d,.25,.995),timp=timp)
# ---- drums ----
def kick(deep=1.0):t=tt(.45);return np.sin(2*np.pi*np.cumsum(45+110*np.exp(-t*28*deep))/SR)*np.exp(-t*9)+hp(rs.randn(len(t)),3000)*np.exp(-t*300)*.2
def snare():t=tt(.28);return bp(rs.randn(len(t)),900,7000)*np.exp(-t*22)+.5*np.sin(2*np.pi*190*t)*np.exp(-t*30)
def clap():t=tt(.3);x=bp(rs.randn(len(t)),900,5000)*np.exp(-t*18);g=np.zeros(len(t));[g.__setitem__(slice(int(o*SR),int((o+.012)*SR)),1) for o in(0,.012,.026)];g[int(.04*SR):]=1;return x*g
def rim():t=tt(.08);return (np.sin(2*np.pi*1700*t)+.5*np.sin(2*np.pi*820*t))*np.exp(-t*70)
def hat(op=False):t=tt(.3 if op else .07);return hp(rs.randn(len(t)),7000)*np.exp(-t*(12 if op else 80))
def ride():t=tt(.6);return (hp(rs.randn(len(t)),6000)*.5+sum(np.sin(2*np.pi*f*t) for f in(3120,4410,5870))*.12)*np.exp(-t*6)
def shaker():t=tt(.09);e=np.minimum(1,t/.02)*np.exp(-t*45);return bp(rs.randn(len(t)),4000,9000)*e
def tom(f=80):t=tt(.5);return np.sin(2*np.pi*np.cumsum(f*(1+1.2*np.exp(-t*40)))/SR)*np.exp(-t*8)+lp(rs.randn(len(t)),600)*np.exp(-t*50)*.4
def crash():t=tt(2.5);return hp(rs.randn(len(t)),4000)*np.exp(-t*1.6)
def nz(d,f):t=tt(d);return bp(rs.randn(len(t)),f*.6,f*1.6)*np.exp(-t/d*5)   # chip noise drum
KITS=dict(rock=dict(k=lambda:kick(),s=snare,h=hat,o=lambda:hat(True)),trap=dict(k=lambda:kick(.6),s=clap,h=hat,o=lambda:hat(True)),soft=dict(k=lambda:kick(1.4)*.7,s=rim,h=shaker,o=shaker),
          jazz=dict(k=lambda:kick(1.4)*.5,s=lambda:snare()*.5,h=ride,o=ride),orch=dict(k=lambda:tom(62),s=lambda:tom(96),h=shaker,o=shaker),chip=dict(k=lambda:nz(.12,200),s=lambda:nz(.1,2500),h=lambda:nz(.03,8000),o=lambda:nz(.08,8000)),
          house=dict(k=lambda:kick(.8),s=clap,h=hat,o=lambda:hat(True)))
Q={'m':[0,3,7],'M':[0,4,7],'5':[0,7,12],'m7':[0,3,7,10],'M7':[0,4,7,11],'7':[0,4,7,10]}
# pattern: 16 steps per bar. x hit, X accent, r roll (hats), . rest.  chord=(inst, patterns, octave, length in steps)  lead=(inst, patterns, octave, arp order)
STY={
 'bunker':dict(name='industrial metal',bpm=100,root=40,prog=[(0,'5'),(0,'5'),(-4,'5'),(-2,'5')],kit='rock',kick={'S':'x.......x.......','P':'x..x..x.x..x..x.'},snare={'P':'....X.......X...'},hat={'S':'x...x...x...x...','P':'x.x.x.x.x.x.x.x.'},
   bass=('sawbass',{'S':'x.......x.......','P':'x..x..x.x..x..x.'},0,3),chord=('mute',{'S':'x.......x.......','P':'x.xx..x.x.xx..x.'},0,2),lead=('pad',{'I':'x...............'},1,[0],16)),
 'dawn':dict(name='piano and strings',bpm=84,root=50,prog=[(0,'M'),(-3,'m'),(5,'M'),(7,'M')],kit='soft',kick={'P':'x.......x.....x.'},snare={'P':'....x.......x...'},hat={},
   bass=('pluck',{'S':'x...............','P':'x.......x.......'},-1,8),chord=('pad',{'I':'x...............','S':'x...............','P':'x...............'},0,16),lead=('piano',{'I':'x...x...x...x...','S':'x.x.x.x.x.x.x.x.','P':'x.x.x.x.x.x.x.x.'},1,[0,1,2,3,2,1,2,1],6)),
 'city':dict(name='jazzy boom-bap',bpm=90,swing=.16,root=48,prog=[(0,'m7'),(5,'7'),(-2,'M7'),(-5,'7')],kit='rock',kick={'S':'x.........x.....','P':'x.....x...x.....'},snare={'P':'....X.......X...'},hat={'S':'x.x.x.x.x.x.x.x.','P':'x.x.x.x.x.x.x.xr'},
   bass=('pluck',{'S':'x.......x.......','P':'x.....x.x.....x.'},-1,5),chord=('rhodes',{'I':'x...............','S':'x.....x.........','P':'x..x......x.....'},0,7),lead=('bell',{'P':'........x...x.x.'},2,[2,1,0,1,3,2],5)),
 'circuit':dict(name='synthwave',bpm=124,root=45,prog=[(0,'m'),(0,'m'),(-4,'M'),(-2,'M')],kit='house',kick={'S':'x.......x.......','P':'x...x...x...x...'},snare={'P':'....x.......x...'},hat={'S':'..x...x...x...x.','P':'..x...x...x...xo'},
   bass=('sawbass',{'S':'..x...x...x...x.','P':'..x...x...x...x.'},0,2),chord=('pad',{'I':'x...............','S':'x...............','P':'x...............'},1,16),lead=('saw',{'I':'x.x.x.x.x.x.x.x.','S':'xxxxxxxxxxxxxxxx','P':'xxxxxxxxxxxxxxxx'},2,[0,1,2,3,2,1],1.5)),
 'range':dict(name='orchestral',bpm=100,root=38,prog=[(0,'m'),(-4,'M'),(-2,'M'),(0,'m')],kit='orch',kick={'S':'x.......x.......','P':'x..x..x.x..x..x.'},snare={'P':'......x.......xx'},hat={},
   bass=('timp',{'S':'x...............','P':'x.......x.......'},0,6),chord=('brass',{'S':'x...............','P':'x.......x..x....'},1,6),lead=('saw',{'I':'x.xxx.xxx.xxx.xx','S':'x.xxx.xxx.xxx.xx','P':'x.xxx.xxx.xxx.xx'},2,[0,0,1,0,0,2,0,0,1,0,0,2],1)),
 'casino':dict(name='swing jazz',bpm=132,swing=.3,root=43,prog=[(0,'7'),(5,'7'),(0,'7'),(7,'7')],kit='jazz',kick={'P':'x.......x.......'},snare={'P':'....x.......x...'},hat={'I':'x...x.x.x...x.x.','S':'x...x.x.x...x.x.','P':'x...x.x.x...x.x.'},
   bass=('pluck',{'I':'x...x...x...x...','S':'x...x...x...x...','P':'x...x...x...x...'},-1,4,'walk'),chord=('piano',{'S':'..x.............','P':'..x.......x..x..'},1,2),lead=('piano',{'P':'........x.x.x...'},2,[3,2,1,2,0,1],3)),
 'beach':dict(name='island groove',bpm=96,root=48,prog=[(0,'M'),(5,'M'),(7,'M'),(5,'M')],kit='soft',kick={'S':'x...............','P':'x.......x.......'},snare={'P':'....x.......x...'},hat={'S':'x.x.x.x.x.x.x.x.','P':'x.x.x.x.x.x.x.x.'},
   bass=('pluck',{'S':'x.......x.......','P':'x.....x.x.......'},-1,5),chord=('nylon',{'S':'..x...x...x...x.','P':'..x...x...x...x.'},1,1.5),lead=('marimba',{'I':'x..x..x.x..x..x.','S':'x..x..x.x..x..x.','P':'x..x..x.x..x..x.'},2,[0,1,2,1,3,2,1,2],3)),
 'blueprint':dict(name='lo-fi piano',bpm=80,root=45,prog=[(0,'m7'),(-4,'M7'),(3,'M7'),(-2,'7')],kit='soft',kick={'S':'x.........x.....','P':'x.....x...x.....'},snare={'P':'....x.......x...'},hat={'P':'..x...x...x...x.'},
   bass=('pluck',{'S':'x...............','P':'x.........x.....'},-1,8),chord=('piano',{'I':'x.........x.....','S':'x.....x...x.....','P':'x.....x...x.....'},0,8),lead=('ks',{'P':'..x..x....x..x..'},2,[2,3,1,2,0,1],3)),
 'arcade':dict(name='chiptune',bpm=140,root=48,prog=[(0,'m'),(-4,'M'),(-2,'M'),(0,'m')],kit='chip',kick={'S':'x.......x.......','P':'x...x...x...x...'},snare={'P':'....x.......x...'},hat={'S':'..x...x...x...x.','P':'..x.x.x...x.x.x.'},
   bass=('tri',{'S':'x.x.x.x.x.x.x.x.','P':'x.x.x.x.x.x.x.x.'},0,1.5),chord=('sq',{'I':'xxxxxxxxxxxxxxxx','S':'xxxxxxxxxxxxxxxx'},1,1,'arp'),lead=('sq',{'P':'x.x.xx.xx.x.xxx.'},2,[0,2,1,3,2,1,0,2,3,1],2)),
 'eclipse':dict(name='dark trap',bpm=140,root=37,prog=[(0,'m'),(0,'m'),(-4,'M'),(-2,'M')],kit='trap',kick={'P':'x.........x..x..'},snare={'S':'........x.......','P':'........X.......'},hat={'S':'x...x...x...x...','P':'x.x.x.x.x.xrx.xr'},
   bass=('b808',{'P':'x.........x..x..'},0,7),chord=('pad',{'I':'x...............','S':'x...............'},1,16),lead=('piano',{'I':'x.....x...x.....','S':'x.....x...x.....','P':'x.....x...x...x.'},2,[0,2,1,0,2,1,3],6)),
 'inferno':dict(name='hard rock',bpm=150,root=40,prog=[(0,'5'),(3,'5'),(5,'5'),(-2,'5')],kit='rock',kick={'S':'x.......x.......','P':'x.x...x.x.x...x.'},snare={'P':'....X.......X...'},hat={'S':'x...x...x...x...','P':'o.x.x.x.o.x.x.x.'},
   bass=('sawbass',{'S':'x.......x.......','P':'x.x.x.x.x.x.x.x.'},0,2),chord=('power',{'I':'x...............','S':'x.......x.......','P':'x.x.x.x.x.x.x.x.'},0,2.2),lead=('saw',{'P':'............x.xx'},3,[2,1,0],2)),
 'neighborhood':dict(name='acoustic folk',bpm=100,root=43,prog=[(0,'M'),(-3,'m'),(5,'M'),(7,'M')],kit='soft',kick={'P':'x.......x.......'},snare={},hat={'S':'..x...x...x...x.','P':'..x...x...x...x.'},
   bass=('pluck',{'S':'x...............','P':'x.......x.......'},-1,7),chord=('ks',{'I':'x...............','S':'x.......x.......','P':'x...x.x...x.x.x.'},1,6,'strum'),lead=('ks',{'I':'x.x.x.x.x.x.x.x.','S':'x.x.x.x.x.x.x.x.'},2,[0,2,1,2,3,2,1,2],4)),
}
STY['temple']=STY['range']
def beat(theme):return 60/STY[theme]['bpm']
def score(path,theme,n=10,v2=None):
    """v2 (second edition) = dict(a2=[card starts.., end], ps=[player starts.., end], c0, l0): every cue lands on those cut times, which the build script snaps to this style's beat grid."""
    global rs,P0,C0,L0;P0,C0,L0=(v2['ps'][0],v2['c0'],v2['l0']) if v2 else (12.0,36.0,41.2);A2=v2['a2'][0] if v2 else 6.0
    rs=np.random.RandomState(7+sum(map(ord,theme)));s=STY[theme];PD=24.0/n;step=60/s['bpm']/4;sw=s.get('swing',0)*step*2;kit=KITS[s['kit']]
    bus={k:[np.zeros(N),np.zeros(N)] for k in('drum','bass','chord','lead','fx')}
    def add(b,sig,at,pan=0.0,g=1.0):
        i=int(at*SR);m=min(len(sig),N-i)
        if m<=0 or i<0:return
        bus[b][0][i:i+m]+=sig[:m]*g*(1-max(pan,0));bus[b][1][i:i+m]+=sig[:m]*g*(1+min(pan,0))
    sec=lambda t:'I' if t<A2 else 'S' if t<P0 else 'P'
    k=0;walk=0;ai=0
    while k*step<L0-.05:
        pos=k%16;bar=k//16;t=k*step+(sw if pos%4==2 else 0);S=sec(k*step);deg,q=s['prog'][bar%len(s['prog'])];tones=Q[q];base=s['root']+deg;build=min(1,max(.55,(k*step)/C0+.45))
        for nm,bn,fn,g in(('kick','drum',kit['k'],1.0),('snare','drum',kit['s'],.8)):
            c=s[nm].get(S,'')[pos:pos+1]
            if c in('x','X'):add(bn,fn(),t,0,g*(1.15 if c=='X' else 1)*build)
        c=s['hat'].get(S,'')[pos:pos+1]
        if c=='x':add('drum',kit['h'](),t,.3,.34*(1 if pos%4==0 else .7))
        elif c=='o':add('drum',kit['o'](),t,.3,.4)
        elif c=='r':[add('drum',kit['h'](),t+j*step/4,.3,.26+.05*j) for j in range(4)]
        inst,pats,octv,ln=s['bass'][:4]
        if pats.get(S,'')[pos:pos+1] in('x','X'):
            if len(s['bass'])>4:m=base+12*octv+[0,tones[1],tones[2],tones[1]+(1 if walk%2 else -1)][walk%4];walk+=1
            else:m=base+12*octv
            add('bass',INST[inst](hz(m),ln*step),t,0,1)
        inst,pats,octv,ln=s['chord'][:4];mode=s['chord'][4] if len(s['chord'])>4 else ''
        if pats.get(S,'')[pos:pos+1] in('x','X'):
            if mode=='arp':add('chord',INST[inst](hz(base+12*octv+tones[k%len(tones)]),ln*step),t,-.3,.5)
            else:
                for j,iv in enumerate(tones):add('chord',INST[inst](hz(base+12*octv+iv),ln*step),t+(j*.014 if mode=='strum' else 0),(-.35+.35*j) if inst not in('power','mute') else (-.5 if k%2 else .5)*.6,1/len(tones)**.5)
        inst,pats,octv,arp,ln=s['lead']
        if pats.get(S,'')[pos:pos+1] in('x','X'):
            a=arp[ai%len(arp)];ai+=1;iv=tones[a%len(tones)]+12*(a//len(tones));add('lead',INST[inst](hz(base+12*octv+iv),ln*step),t,.25*(-1)**ai,1)
        k+=1
    # ---- film cues shared by every style ----
    def impact(f0=85):t=tt(1.4);return np.sin(2*np.pi*np.cumsum(35+(f0-35)*np.exp(-t*9))/SR)*np.exp(-t*2.4)+lp(rs.randn(len(t)),300)*np.exp(-t*9)*.6
    def whoosh(d=.45):m=int(d*SR);return bp(rs.randn(m),400,5000)*np.linspace(0,1,m)**3
    add('fx',lp(rs.randn(N),500)*np.interp(np.arange(N)/SR,[0,.8,5,9,12],[0,1,1,.3,0]),0,0,.12)
    add('fx',whoosh(.5),2.7,0,.6);add('fx',impact(100),3.2,0,1.0)
    for j,at in enumerate(v2['a2'][:-1] if v2 else (6.0,8.0,10.0)):add('fx',whoosh(.4),at-.4,(-1)**j*.3,.4);add('fx',impact(60 if not v2 else 70+12*j),at,0,.5 if not v2 else .85)
    if v2:   # riser into the player run, so act three arrives rather than starts
        m=int(1.7*SR);qq=np.linspace(0,1,m);add('fx',hp(rs.randn(m),900)*qq**2*.55+np.sin(2*np.pi*np.cumsum(180+1500*qq**2)/SR)*qq**2*.28,P0-1.7,0,.8);add('drum',crash()*.5,P0,0,.9)
    for i in range(n):at=(v2['ps'][i] if v2 else P0+i*PD);add('fx',whoosh(.45 if not v2 else min(.45,(v2['ps'][i+1]-v2['ps'][i])*.4)),at-.3,(-1)**i*.4,.5);add('fx',impact(90),at,0,.75)
    st=min(.34,(L0-C0-1.9)/n)
    for j in range(n):add('fx',impact(80+4*j),C0+.35+j*st,(-1)**j*.3,.6)
    r=0.0;x=C0+2.2
    while x<L0-.02:add('drum',kit['s'](),x,0,.35+.5*(x-C0-2.2)/(L0-C0-2.2));x+=max(.045,.16-.12*(x-C0-2.2)/(L0-C0-2.2))
    m=int(2.2*SR);qq=np.linspace(0,1,m);add('fx',hp(rs.randn(m),800)*qq**2*.6+np.sin(2*np.pi*np.cumsum(200+1400*qq**2)/SR)*qq**2*.3,L0-2.2,0,.8)
    if v2:   # hard stop: a breath of near-silence before the crest lands
        i0,i1=int((L0-.34)*SR),int(L0*SR)
        for b_ in bus.values():
            for ch in b_:ch[i0:i1]*=np.linspace(1,0,i1-i0)**3
    # ---- crest: final chord in the style's own chord instrument, plus a hit and a cymbal ----
    inst,_,octv,_=s['chord'][:4];deg,q=s['prog'][0];fin='power' if inst=='mute' else inst if inst not in('sq',) else 'sq'
    for j,iv in enumerate(Q[q]+[12]):add('chord',INST[fin](hz(s['root']+12*octv+iv),3.6),L0+j*.02,(-.4+.27*j),1.3/2)
    add('bass',INST[s['bass'][0]](hz(s['root']+12*s['bass'][2]),3.4),L0,0,1.2);add('fx',impact(110),L0,0,1.2);add('drum',crash()*.6,L0,0,1);add('drum',kit['k'](),L0,0,1.2)
    lvl=dict(drum=.78,bass=.72,chord=.6,lead=.5,fx=.5);L=np.zeros(N);R=np.zeros(N)
    for b,(l,r_) in bus.items():
        pk=max(np.max(np.abs(l)),np.max(np.abs(r_)),1e-9);L+=l/pk*lvl[b];R+=r_/pk*lvl[b]
    ir=rs.randn(int(1.6*SR))*np.exp(-np.arange(int(1.6*SR))/SR/.4);ir=lp(ir,5000)
    def rv(x):w=sg.fftconvolve(x,ir)[:N];return x+w/np.max(np.abs(w))*np.max(np.abs(x))*.16
    L=rv(L);R=rv(R);pk=max(np.max(np.abs(L)),np.max(np.abs(R)));L=np.tanh(L/pk*1.8)*.89;R=np.tanh(R/pk*1.8)*.89
    f=np.interp(np.arange(N)/SR,[0,.3,44.3,45],[0,1,1,0]);L*=f;R*=f
    w=wave.open(path,'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.stack([L,R],1)*32767).astype('<i2').tobytes());w.close()
if __name__=='__main__':
    import sys,os
    for th in sys.argv[2:] or list(STY):score(os.path.join(sys.argv[1],th+'.wav'),th);print(th,STY[th]['name'])
