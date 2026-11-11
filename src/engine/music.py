"""Twelve original scores, one genre per franchise theme, synthesized with numpy/scipy (no samples).
score(path, theme, n_players) writes a 45s stereo WAV cut to the film: 0-6 intro, 6-12 build, 12-36 groove (one bar per player card),
36-41.2 climax, 41.2 final hit. Tempo is derived from the card length so every bar lands on a player.
GENRES maps theme -> (genre function, key root in Hz, major?, beats per bar). To change a franchise's music, edit its row or its function."""
import numpy as np, scipy.signal as sg, wave
SR=48000;D=45.0;N=int(SR*D);P0=12.0;C0=36.0;L0=41.2
def _lp(x,fc,o=2):b,a=sg.butter(o,min(fc,SR/2-200)/(SR/2));return sg.lfilter(b,a,x)
def _hp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2),'high');return sg.lfilter(b,a,x)
def _bp(x,lo,hi):b,a=sg.butter(2,[lo/(SR/2),hi/(SR/2)],'band');return sg.lfilter(b,a,x)
def _env(n,a,d):e=np.exp(-np.arange(n)/SR/d);q=max(1,int(a*SR));e[:q]*=np.linspace(0,1,q);return e
def _t(d):return np.arange(int(d*SR))/SR
class Kit:
    def __init__(s,seed):s.rs=np.random.RandomState(seed)
    # ---- pitched ----
    def piano(s,f,d=1.6,bright=1.0):
        t=_t(d);x=np.zeros(len(t))
        for h in range(1,9):x+=np.sin(2*np.pi*f*h*np.sqrt(1+.0004*h*h)*t)*np.exp(-t*(1.6+.9*h)/max(.4,d/1.6))*bright**(h-1)/h**1.3
        x[:int(.012*SR)]+=_hp(s.rs.randn(int(.012*SR)),2500)*.25;return x*_env(len(t),.003,d)
    def ep(s,f,d=1.5):  # electric piano: sine carrier with a decaying bell partial
        t=_t(d);m=np.sin(2*np.pi*f*14*t)*np.exp(-t*18)*.6+np.sin(2*np.pi*f*t)*np.exp(-t*3)*.8;return np.sin(2*np.pi*f*t+m)*_env(len(t),.004,d/2.2)*(1+.12*np.sin(2*np.pi*5.2*t))
    def pluck(s,f,d=1.2,damp=.996,bright=.5):  # Karplus-Strong string
        n=int(d*SR);P=max(2,int(SR/f));a=np.zeros(P+2);a[0]=1;a[P]=-damp*(1-bright*.5);a[P+1]=-damp*bright*.5
        x=np.zeros(n);x[:P]=s.rs.uniform(-1,1,P);return sg.lfilter([1],a,x)
    def strum(s,fs,d=1.4,up=False,gap=.013,damp=.997):
        n=int((d+gap*len(fs))*SR);x=np.zeros(n)
        for i,f in enumerate(fs[::-1] if up else fs):g=s.pluck(f,d,damp,.45);o=int(i*gap*SR);x[o:o+len(g)]+=g[:n-o]
        return x/len(fs)**.5
    def dist(s,fs,d=.5,mute=False,gain=9):  # overdriven guitar: plucked power chord through a soft clipper and cabinet filter
        x=sum(s.pluck(f,d,.9955 if mute else .9993,.35) for f in fs);x=np.tanh(x*gain/len(fs)**.5);x=_lp(_hp(x,90),3800,3)
        return x*(_env(len(x),.002,.07 if mute else d*.9))
    def lead(s,f,d=1.0,gain=6):
        t=_t(d);x=np.tanh((sg.sawtooth(2*np.pi*f*t+.4*np.sin(2*np.pi*5.5*t))*.7+np.sin(2*np.pi*f*2*t)*.3)*gain);return _lp(x,3200,3)*_env(len(t),.02,d*.7)
    def b808(s,f,d=1.4):t=_t(d);ph=2*np.pi*np.cumsum(f*(1+2.5*np.exp(-t*38)))/SR;return np.tanh(np.sin(ph)*2.4)*_env(len(t),.002,d/2.6)
    def sub(s,f,d=.5):t=_t(d);return (np.sin(2*np.pi*f*t)+.3*np.sin(4*np.pi*f*t))*_env(len(t),.006,d/2.2)
    def upright(s,f,d=.6):t=_t(d);return (np.sin(2*np.pi*f*t)+.5*np.sin(4*np.pi*f*t)*np.exp(-t*9)+.25*np.sin(6*np.pi*f*t)*np.exp(-t*14))*_env(len(t),.004,d/2.4)
    def sawbass(s,f,d=.2,cut=900):t=_t(d);return _lp(sg.sawtooth(2*np.pi*f*t)+sg.sawtooth(2*np.pi*f*1.007*t),cut,3)*_env(len(t),.002,d/2)
    def square(s,f,d=.15,duty=.5):t=_t(d);return sg.square(2*np.pi*f*t,duty)*_env(len(t),.001,d/1.5)*.5
    def tri(s,f,d=.2):t=_t(d);return sg.sawtooth(2*np.pi*f*t,.5)*_env(len(t),.002,d/1.4)
    def pad(s,fs,d,cut=1100):t=_t(d);x=sum(sg.sawtooth(2*np.pi*f*(1+dt)*t) for f in fs for dt in(-.005,0,.006))/(3*len(fs));e=np.minimum(1,np.minimum(t/(d*.25),(d-t)/(d*.25)));return _lp(x,cut)*e
    def brass(s,fs,d=.5):t=_t(d);x=sum(sg.sawtooth(2*np.pi*f*t)+sg.sawtooth(2*np.pi*f*1.004*t) for f in fs)/len(fs);e=_env(len(t),.03,d);c=_lp(x,900)*.6+_lp(x,2600)*e*.8;return c*np.minimum(1,(d-t)/.06)*e**.3
    def organ(s,fs,d):t=_t(d);x=sum(np.sin(2*np.pi*f*h*t)*a for f in fs for h,a in((1,1),(2,.6),(3,.35),(4,.2),(6,.12)))/len(fs);return x*(1+.25*np.sin(2*np.pi*6.3*t))*np.minimum(1,np.minimum(t/.03,(d-t)/.08))
    def bell(s,f,d=1.6):t=_t(d);return sum(a*np.sin(2*np.pi*f*r*t)*np.exp(-t/dd) for r,a,dd in((1,1,.7),(2.01,.5,.5),(3.02,.3,.3),(4.2,.2,.2)))*.5
    def steel(s,f,d=.7):t=_t(d);return (np.sin(2*np.pi*f*t)+.55*np.sin(2*np.pi*f*2*t)*np.exp(-t*7)+.35*np.sin(2*np.pi*f*3.98*t)*np.exp(-t*14))*_env(len(t),.003,d/3)
    # ---- drums ----
    def kick(s,punch=1.0,d=.42):t=_t(d);return np.sin(2*np.pi*np.cumsum(46+130*punch*np.exp(-t*34))/SR)*_env(len(t),.001,.13)+_hp(s.rs.randn(len(t)),3000)*np.exp(-t*220)*.12
    def snare(s,d=.24,tone=190):t=_t(d);return np.sin(2*np.pi*tone*t)*np.exp(-t*26)*.5+_bp(s.rs.randn(len(t)),900,7000)*np.exp(-t*20)*.8
    def clap(s):t=_t(.22);e=sum(np.exp(-np.maximum(t-o,0)*70)*(t>=o) for o in(0,.011,.023))/2;return _bp(s.rs.randn(len(t)),1000,6000)*e
    def hat(s,d=.05,open_=False):t=_t(.3 if open_ else d);return _hp(s.rs.randn(len(t)),7000)*np.exp(-t*(14 if open_ else 90))*.5
    def ride(s,acc=1.0):t=_t(.5);return (_hp(s.rs.randn(len(t)),6000)*np.exp(-t*9)*.35+np.sin(2*np.pi*5400*t)*np.exp(-t*12)*.08)*acc
    def crash(s):t=_t(1.6);return _hp(s.rs.randn(len(t)),4500)*np.exp(-t*2.6)*.5
    def tom(s,f=90):t=_t(.45);return np.sin(2*np.pi*np.cumsum(f*(1+1.1*np.exp(-t*36)))/SR)*_env(len(t),.002,.14)
    def rim(s):t=_t(.06);return (np.sin(2*np.pi*1700*t)+np.sin(2*np.pi*820*t))*np.exp(-t*90)*.5
    def shaker(s):t=_t(.07);return _hp(s.rs.randn(len(t)),5000)*np.sin(np.pi*t/.07)**2*.3
    def anvil(s,f=440):t=_t(1.2);return sum(a*np.sin(2*np.pi*f*r*t)*np.exp(-t/dd) for r,a,dd in((1,1,.5),(2.76,.7,.35),(5.4,.5,.2),(8.93,.3,.12)))*.3
    def impact(s,f0=85):t=_t(1.5);return np.sin(2*np.pi*np.cumsum(35+(f0-35)*np.exp(-t*9))/SR)*_env(len(t),.002,.42)+_lp(s.rs.randn(len(t)),300)*_env(len(t),.001,.12)*.6
    def whoosh(s,d=.5):n=int(d*SR);return _bp(s.rs.randn(n),400,5000)*np.linspace(0,1,n)**3
    def riser(s,d=2.2):n=int(d*SR);q=np.linspace(0,1,n);return _hp(s.rs.randn(n),800)*q**2*.5+np.sin(2*np.pi*np.cumsum(200+1400*q**2)/SR)*q**2*.25
ST=lambda n:2**(n/12)
class Song:
    """Beat grid and mixer. bars = [(start_time, section, chord_root_hz, third_semitones)], section in intro/build/main/climax."""
    def __init__(s,theme,n,key,major,k,prog=None):
        s.K=Kit(11+sum(map(ord,theme)));s.L=np.zeros(N);s.R=np.zeros(N);s.SL=np.zeros(N);s.SR_=np.zeros(N);s.n=n;s.PD=24.0/n;s.k=k;s.b=s.PD/k;s.key=key;s.major=major
        prog=prog or ([(0,4),(7,4),(9,3),(5,4)] if major else [(0,3),(8,4),(3,4),(10,4)]);pre=n//2;t0=P0-pre*s.PD;s.bars=[]
        for i in range(pre):s.bars.append((t0+i*s.PD,'intro' if i<pre-min(2,pre-1) else 'build')+tuple(s._ch(prog,i)))
        for i in range(n):s.bars.append((P0+i*s.PD,'main')+tuple(s._ch(prog,i)))
        i=0
        while C0+i*s.PD<L0-.05:s.bars.append((C0+i*s.PD,'climax')+tuple(s._ch(prog,i)));i+=1
        s.final=(key,4 if major else 3)
    def _ch(s,prog,i):r,th=prog[i%len(prog)];f=s.key*ST(r);return (f/2 if f>s.key*1.45 else f,th)
    def add(s,x,t,g=1.0,pan=0.0,sfx=False):
        i=int(t*SR)
        if i<0:x=x[-i:];i=0
        n=min(len(x),N-i)
        if n<=0:return
        A,B=(s.SL,s.SR_) if sfx else (s.L,s.R);A[i:i+n]+=x[:n]*g*(1-max(pan,0));B[i:i+n]+=x[:n]*g*(1+min(pan,0))
    def tones(s,root,th,octv=1):return [root*octv,root*octv*ST(th),root*octv*ST(7)]
    def render(s,path):
        K=s.K;cut=np.ones(N);a=int((L0-.06)*SR);b=int(L0*SR);cut[a:b]=np.linspace(1,0,b-a);cut[b:]=0;s.L*=cut;s.R*=cut   # the groove stops dead on the crest
        # film cues, same in every genre: title hit, three story lines, a whoosh into each card, climax riser, final hit
        s.add(K.whoosh(.5),2.7,.2,sfx=True);s.add(K.impact(100),3.2,.8,sfx=True)
        for j,at in enumerate((6.0,8.0,10.0)):s.add(K.whoosh(.4),at-.4,.14,(-1)**j*.3,sfx=True);s.add(K.impact(60),at,.4,sfx=True)
        for i in range(s.n):s.add(K.whoosh(.4),P0+i*s.PD-.4,.16,(-1)**i*.4,sfx=True);s.add(K.impact(80),P0+i*s.PD,.42,sfx=True)
        s.add(K.riser(2.2),L0-2.2,.3,sfx=True);s.add(K.impact(110),L0,1.0,sfx=True);s.add(K.crash(),L0,.5,sfx=True)
        rs=K.rs;ir=rs.randn(int(1.8*SR))*np.exp(-np.arange(int(1.8*SR))/SR/.45);ir=_lp(ir,5000);out=[]
        for M,S_ in((s.L,s.SL),(s.R,s.SR_)):
            m=M/max(1e-9,np.max(np.abs(M)))*.8;w=sg.fftconvolve(m,ir)[:N];m=m+w/np.max(np.abs(w))*.14;x=m+S_/max(1e-9,np.max(np.abs(S_)))*.42;out.append(x)
        mx=max(np.max(np.abs(out[0])),np.max(np.abs(out[1])));f=np.interp(np.arange(N)/SR,[0,.3,44.2,45],[0,1,1,0])
        L,R=[np.tanh(x/mx*1.5)*.9*f for x in out]
        w=wave.open(path,'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.stack([L,R],1)*32767).astype('<i2').tobytes());w.close()
# ---------------- genres ----------------
def trap(S):
    K,b,k=S.K,S.b,S.k;S.add(K.pad(S.tones(S.key,3,2),12.5,700),0,.35)
    for j,(t,sec,r,th) in enumerate(S.bars):
        mel=[r*4*ST(x) for x in (0,th,7,12,7,th,10,7)]
        for i in range(k*2):
            if sec!='intro' or i%2==0:S.add(K.bell(mel[(i*3+j)%8],1.0),t+i*b/2,.16 if i%2 else .26,.3*(-1)**i)
        if sec=='intro':continue
        S.add(K.b808(r/2,S.PD*.6),t,.95);S.add(K.kick(1.2),t,.8)
        if sec!='build':S.add(K.b808(r/2*ST(7 if j%2 else 0),S.PD*.3),t+b*2.5,.8);S.add(K.kick(1.2),t+b*2.5,.7);S.add(K.clap(),t+b*2,.7);S.add(K.snare(),t+b*2,.35)
        for i in range(k*4):
            roll=(j%2==1 and i>=k*4-4) or sec=='climax'
            if i%2==0 or roll:S.add(K.hat(.03),t+i*b/4,(.3 if i%4==0 else .2)*(1.3 if roll else 1),.25)
        if j%4==3:S.add(K.hat(.3,True),t+b*3.5,.3,-.2)
    S.add(K.b808(S.key/2,3.5),L0,1.0);S.add(K.bell(S.key*8,3),L0+.1,.4)
def piano(S):
    K,b,k=S.K,S.b,S.k
    for j,(t,sec,r,th) in enumerate(S.bars):
        arp=[r*2*ST(x) for x in (0,7,12,th+12,7,12,th+12,19)]
        for i in range(k*2):
            if sec=='intro' and i%2:continue
            S.add(K.piano(arp[i%8],1.4,.75),t+i*b/2,.5 if i%4==0 else .32,.25*np.sin(i))
        S.add(K.piano(r,S.PD,.6),t,.6,-.2);S.add(K.piano(r*2*ST(th),S.PD,.6),t,.3,.2)
        if sec in('main','climax'):
            mel=[19,24,22,19,17,19,15,12];S.add(K.piano(r*4*ST(mel[j%8]-(1 if th==3 and mel[j%8]%12==4 else 0)),1.8,.9),t+b,.4,.1);S.add(K.upright(r,b*1.6),t,.55);S.add(K.upright(r*ST(7),b),t+b*2,.4)
            for i in range(k):S.add(K.rim(),t+i*b+b/2,.12,.3);S.add(K.kick(.5),t+i*b,.3 if i%2==0 else 0)
        if sec=='climax':[S.add(K.piano(r*4*ST(x),.5),t+i*b/4,.3) for i,x in enumerate([0,th,7,12]*k)]
    S.add(K.piano(S.key,4,.8),L0,.9);[S.add(K.piano(f*2,4,.8),L0+.04*i,.5) for i,f in enumerate(S.tones(*S.final))]
def techno(S):
    K,b,k=S.K,S.b,S.k;S.add(K.pad(S.tones(S.key,3,4),12.5,1400),0,.25)
    for j,(t,sec,r,th) in enumerate(S.bars):
        seq=[0,0,12,0,7,0,12,10]
        for i in range(k*4):
            if sec=='intro' and i%4:continue
            cut=500+(2600 if sec=='climax' else 1500)*(.5+.5*np.sin(j*.9+i*.2));S.add(K.sawbass(r*ST(seq[i%8]),b/4*.9,cut),t+i*b/4,.5)
        if sec=='intro':continue
        for i in range(k):
            S.add(K.kick(1.0),t+i*b,.9);S.add(K.hat(.3,True),t+i*b+b/2,.22,.2)
            if sec!='build' and i%2:S.add(K.clap(),t+i*b,.5)
        if sec!='build':
            for i in range(k*2):S.add(K.square(r*4*ST([0,th,7,12,7,th][(i+j)%6]),b/2*.6,.3),t+i*b/2,.13,.4*(-1)**i)
        if sec=='climax':[S.add(K.snare(.1),t+i*b/4,.2+.03*i) for i in range(k*4)]
    S.add(K.sawbass(S.key/2,3.5,400),L0,1.0);S.add(K.pad(S.tones(S.key,3,4),3.6,2400),L0,.5)
def boombap(S):
    K,b,k=S.K,S.b,S.k;sw=b*.16
    for j,(t,sec,r,th) in enumerate(S.bars):
        ch=[r*2,r*2*ST(th),r*2*ST(7),r*2*ST(10 if th==3 else 11)]
        for bt in ((0,2.5) if sec!='intro' else (0,)):[S.add(K.ep(f,S.PD*.55),t+bt*b+.012*i,.3,.3*(-1)**i) for i,f in enumerate(ch)]
        if sec=='intro':continue
        S.add(K.kick(.9),t,.95);S.add(K.kick(.9),t+b*2.5,.8);S.add(K.upright(r,b*1.4),t,.8);S.add(K.upright(r*ST(7),b*.8),t+b*2.5,.6);S.add(K.upright(r*ST(10),b*.6),t+b*3.5,.5)
        if sec!='build':
            S.add(K.snare(.22,170),t+b,.75);S.add(K.snare(.22,170),t+b*3,.75)
            if j%2:S.add(K.kick(.9),t+b*1.75,.6)
            mel=[12,15,17,19,17,15,12,10];S.add(K.ep(r*4*ST(mel[j%8]),.9),t+b*1.5+sw,.28,.2);S.add(K.ep(r*4*ST(mel[(j+3)%8]),.9),t+b*3.5+sw,.24,-.2)
        for i in range(k*2):S.add(K.hat(.04),t+i*b/2+(sw if i%2 else 0),.3 if i%2==0 else .18,.2)
        if sec=='climax':[S.add(K.snare(.1,200),t+i*b/4,.15+.02*i) for i in range(k*4)]
    [S.add(K.ep(f,3.6),L0+.02*i,.6) for i,f in enumerate([S.key*2,S.key*2*ST(3),S.key*2*ST(7),S.key*2*ST(10)])];S.add(K.upright(S.key,3),L0,1.0)
def chip(S):
    K,b,k=S.K,S.b,S.k
    for j,(t,sec,r,th) in enumerate(S.bars):
        arp=[0,th,7,12];mel=[12,12,15,17,19,17,15,10]
        for i in range(k*4):
            if sec=='intro' and i%2:continue
            S.add(K.square(r*4*ST(arp[i%4]+(12 if (i//4)%2 else 0)),b/4*.8,.25),t+i*b/4,.16,.5*(-1)**i)
        if sec=='intro':continue
        for i in range(k*2):S.add(K.tri(r*ST(0 if i%4<3 else 7),b/2*.8),t+i*b/2,.6)
        for i in range(k):
            S.add(K.kick(.8,.2),t+i*b,.7 if i%2==0 else 0)
            if i%2 and sec!='build':S.add(K.hat(.09),t+i*b,.55);S.add(K.snare(.12,260),t+i*b,.35)
        if sec!='build':[S.add(K.square(r*8*ST(mel[(i+j*2)%8]),b*.9,.5),t+i*b,.2) for i in range(k)]
        if sec=='climax':[S.add(K.square(r*8*ST(i),b/4,.5),t+i*b/4,.14) for i in range(k*4)]
    for i,x in enumerate((0,4,7,12,16,19,24)):S.add(K.square(S.key*4*ST(x),.5 if i<6 else 3,.5),L0+i*.07,.3)
    S.add(K.tri(S.key,3.5),L0,.9)
def rock(S):
    K,b,k=S.K,S.b,S.k;hb=60/66
    for i in range(int(12/hb)):S.add(K.kick(.6),i*hb,.7);S.add(K.kick(.5),i*hb+.22,.45)       # heartbeat under the intro
    S.add(K.pad([S.key,S.key*ST(7),S.key*2],12.5,600),0,.4)
    for j,(t,sec,r,th) in enumerate(S.bars):
        pc=[r,r*ST(7),r*2]
        if sec=='intro':S.add(K.dist(pc,S.PD,False,5),t,.25);continue
        S.add(K.crash(),t,.3 if sec!='build' else .15);S.add(K.dist(pc,b*1.5),t,.55)
        for i in range(k):
            if i:S.add(K.dist(pc,b*.45,True),t+i*b,.5 if i%2 else .6,.25*(-1)**i)
            S.add(K.sub(r,b*.8),t+i*b,.5)
            if sec!='build':S.add(K.kick(1.0),t+i*b,.9 if i%2==0 else .5);S.add(K.hat(.05),t+i*b+b/2,.2,.3)
            if sec!='build' and i%4==2:S.add(K.snare(),t+i*b,.85)
        if sec in('main','climax') and j%2:S.add(K.lead(r*4*ST([7,10,12,15][j//2%4]),S.PD*.9),t,.3,.2)
        if sec=='climax':[S.add(K.tom(120-8*i),t+i*b/2,.5) for i in range(k*2)]
    S.add(K.dist([S.key,S.key*ST(7),S.key*2,S.key*2*ST(7)],3.6,False,12),L0,1.0);S.add(K.sub(S.key/2,3.4),L0,.8)
def metal(S):
    K,b,k=S.K,S.b,S.k
    for j,(t,sec,r,th) in enumerate(S.bars):
        pc=[r,r*ST(7),r*2];riff=[0,0,0,3,0,0,5,0,0,0,7,0,6,0,5,3]
        if sec=='intro':S.add(K.dist(pc,S.PD,False,7),t,.35);S.add(K.tom(70),t,.5);continue
        for i in range(k*2):
            f=r*ST(riff[(i+j*4)%16]);S.add(K.dist([f,f*ST(7),f*2],b/2*.9,riff[(i+j*4)%16]==0,11),t+i*b/2,.6 if i%4==0 else .48,.2*(-1)**i);S.add(K.sub(f,b/2*.8),t+i*b/2,.45)
            if sec!='build':S.add(K.kick(1.1,.2),t+i*b/2,.85)
        for i in range(k):
            S.add(K.hat(.05),t+i*b,.25,.3)
            if sec!='build' and i%2:S.add(K.snare(.25,210),t+i*b,.9)
        S.add(K.crash(),t,.35)
        if sec in('main','climax'):S.add(K.lead(r*4*ST([12,15,17,19][j%4]),S.PD*.95,8),t,.28,.25);S.add(K.lead(r*4*ST([7,10,12,15][j%4]),S.PD*.95,8),t,.2,-.25)
        if sec=='climax':[S.add(K.snare(.1,230),t+i*b/4,.3+.02*i) for i in range(k*4)]
    S.add(K.dist([S.key/2,S.key,S.key*ST(7),S.key*2],3.6,False,14),L0,1.0);S.add(K.sub(S.key/2,3.4),L0,.9)
def acoustic(S):
    K,b,k=S.K,S.b,S.k
    for j,(t,sec,r,th) in enumerate(S.bars):
        ch=[r,r*ST(7),r*2,r*2*ST(th),r*2*ST(7),r*4];pat=[(0,0,1),(1,0,.7),(1.5,1,.5),(2.5,1,.6),(3,0,.8),(3.5,1,.5)] if sec!='intro' else [(0,0,.9)]
        for bt,upst,g in pat:S.add(K.strum(ch,b*1.6,bool(upst)),t+bt*b,.75*g,.15 if upst else -.15)
        if sec=='intro':continue
        S.add(K.upright(r,b*1.5),t,.7);S.add(K.upright(r*ST(7),b),t+b*2,.5)
        for i in range(k*2):S.add(K.shaker(),t+i*b/2,.5 if i%2 else .3,.3)
        if sec!='build':
            S.add(K.kick(.7),t,.7);S.add(K.kick(.7),t+b*2.5,.5);S.add(K.rim(),t+b,.3);S.add(K.rim(),t+b*3,.3)
            mel=[16,19,24,23,19,16,14,12] if S.major else [15,19,24,22,19,15,14,12];S.add(K.piano(r*2*ST(mel[j%8]),1.6,.85),t,.5,.2);S.add(K.piano(r*2*ST(mel[(j+2)%8]),1.2,.85),t+b*2,.42,.2)
        if sec=='climax':[S.add(K.strum(ch,b*.5,i%2==1),t+i*b/2,.6) for i in range(k*2)]
    S.add(K.strum([S.key,S.key*ST(7),S.key*2,S.key*2*ST(4 if S.major else 3),S.key*2*ST(7),S.key*4],4,False,.03),L0,1.0);S.add(K.piano(S.key*4,3.5),L0+.2,.5)
def soul(S):
    K,b,k=S.K,S.b,S.k
    for j,(t,sec,r,th) in enumerate(S.bars):
        ch=[r*2,r*2*ST(th),r*2*ST(7),r*2*ST(11 if th==4 else 10)];S.add(K.organ(ch,S.PD*.98),t,.3 if sec!='intro' else .4)
        if sec=='intro':continue
        walk=[0,th,7,9 if th==4 else 10];[S.add(K.upright(r*ST(walk[i%4]),b*.9),t+i*b,.75) for i in range(k)]
        for i in range(k):
            if i%2==0:S.add(K.kick(.8),t+i*b,.85)
            elif sec!='build':S.add(K.clap(),t+i*b,.8);S.add(K.snare(.18,180),t+i*b,.3)
            S.add(K.shaker(),t+i*b+b/2,.5,.3);S.add(K.hat(.04),t+i*b,.2,-.3)
        if sec!='build':
            for bt,g in((.5,.5),(1.5,.4),(2.75,.5)):[S.add(K.ep(f,b*.9),t+bt*b,.26*g*2,.2) for f in ch[1:]]
            mel=[16,14,12,9,12,14,16,19];S.add(K.ep(r*4*ST(mel[j%8]),1.2),t+b*3,.34,.25)
        if sec=='climax':[S.add(K.clap(),t+i*b/2,.5) for i in range(k*2)]
    S.add(K.organ([S.key*2,S.key*2*ST(4),S.key*2*ST(7),S.key*4],3.6),L0,.7);S.add(K.upright(S.key,3),L0,1.0)
def swing(S):
    K,b,k=S.K,S.b,S.k;tr=b*2/3
    for j,(t,sec,r,th) in enumerate(S.bars):
        ch=[r*2*ST(th),r*2*ST(7),r*2*ST(10),r*4*ST(2)];walk=[0,th,7,9,12,10,7,5]
        if sec=='intro':
            [S.add(K.upright(r*ST(walk[i%8]),b*.9),t+i*b,.7) for i in range(0,k,2)];S.add(K.ride(),t,.5);continue
        for i in range(k):
            S.add(K.upright(r*ST(walk[i%8] if i<k-1 else 11),b*.95),t+i*b,.9);S.add(K.ride(1.0 if i%2==0 else .8),t+i*b,.6,.3)
            if i%2:S.add(K.ride(.6),t+i*b+tr,.45,.3);S.add(K.hat(.05),t+i*b,.45,-.3)
        if sec!='build':
            for bt in (1+2/3,3+2/3,5,6+2/3)[:(k//2)]:[S.add(K.piano(f,b*.5,.9),t+bt*b,.34,-.2) for f in ch]
            S.add(K.brass([r*4,r*4*ST(th),r*4*ST(7)],b*.45),t,.5,.2);S.add(K.brass([r*4*ST(10),r*4*ST(th+12),r*8],b*.3),t+(k-1+2/3)*b,.4,.2);S.add(K.kick(.6),t,.5)
        if sec=='climax':[S.add(K.snare(.1,220),t+i*b/3,.25+.02*i) for i in range(k*3)]
    S.add(K.brass([S.key*2,S.key*4,S.key*4*ST(3),S.key*4*ST(7),S.key*4*ST(10)],3.2),L0,.9);S.add(K.upright(S.key,3),L0,1.0);S.add(K.ride(),L0,.8)
def march(S):
    K,b,k=S.K,S.b,S.k;S.add(K.pad([S.key/2,S.key,S.key*ST(7)],12.5,500),0,.5)
    for j,(t,sec,r,th) in enumerate(S.bars):
        S.add(K.brass([r,r*ST(7),r*2],S.PD*.95),t,.5 if sec!='intro' else .3);S.add(K.tom(58),t,.9)
        if sec=='intro':continue
        S.add(K.anvil(r*4),t,.4,.3);S.add(K.tom(58),t+b*2,.7);S.add(K.tom(70),t+b*3.5,.5)
        pat=[1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1]
        for i in range(k*4):
            if pat[i%16] or sec=='climax':S.add(K.snare(.09,230),t+i*b/4,(.6 if i%4==0 else .28)*(1.2 if sec=='climax' else 1),.15)
        if sec in('main','climax'):
            mel=[12,12,15,12,17,15,12,10];S.add(K.brass([r*4*ST(mel[j%8])],b*1.8),t+b,.34,-.2);S.add(K.brass([r*4*ST(mel[(j+1)%8])],b*.9),t+b*3,.3,-.2)
    S.add(K.brass([S.key/2,S.key,S.key*ST(7),S.key*2,S.key*2*ST(3)],3.6),L0,1.0);S.add(K.anvil(S.key*4),L0,.6);S.add(K.tom(50),L0,1.0)
def reggae(S):
    K,b,k=S.K,S.b,S.k
    for j,(t,sec,r,th) in enumerate(S.bars):
        ch=[r*4,r*4*ST(th),r*4*ST(7)]
        for i in range(k):
            if sec!='intro' or i%2:S.add(K.strum(ch,.16,True,.006,.985),t+i*b+b/2,.6,.3)
        if sec=='intro':S.add(K.steel(r*4*ST(12),1.0),t,.3);continue
        bl=[(0,0,1.2),(1.5,0,.5),(2,7,.9),(3,th,.5),(3.5,5,.5)];[S.add(K.upright(r*ST(x),b*d),t+bt*b,.95) for bt,x,d in bl]
        S.add(K.kick(.9),t+b*2,.9);S.add(K.rim(),t+b*2,.6);S.add(K.rim(),t+b*3.5,.3 if j%2 else 0)
        for i in range(k*2):S.add(K.hat(.04),t+i*b/2,.28 if i%2 else .16,-.3)
        if sec!='build':
            mel=[16,19,16,12,14,16,12,7] if S.major else [15,19,15,12,14,15,12,7]
            for i,bt in enumerate((0,.75,1.5,2.5,3.25)):S.add(K.steel(r*4*ST(mel[(i+j*2)%8]),.6),t+bt*b,.34,-.25)
        if sec=='climax':[S.add(K.tom(140-10*(i%6)),t+i*b/4,.35) for i in range(k*4)]
    [S.add(K.steel(f,3),L0+.05*i,.6) for i,f in enumerate([S.key*4,S.key*4*ST(4),S.key*4*ST(7),S.key*8])];S.add(K.upright(S.key,3),L0,1.0)
#            theme: (genre, key root Hz, major, beats per bar, label)
GENRES={'range':(trap,58.27,False,4,'Trap: 808s, hi-hat rolls, dark bells'),'blueprint':(piano,73.42,False,4,'Minimalist piano with upright bass'),'circuit':(techno,55.0,False,6,'Techno: four-on-the-floor, acid bass'),
 'city':(boombap,61.74,False,4,'Boom-bap with electric piano'),'arcade':(chip,65.41,False,8,'Chiptune'),'eclipse':(rock,73.42,False,8,'Heartbeat intro into driving rock guitar'),
 'inferno':(metal,61.74,False,8,'Metal: fast riffs, double kick, harmonised leads'),'dawn':(acoustic,98.0,True,4,'Strummed acoustic guitar and piano'),'neighborhood':(soul,87.31,True,4,'Soul: organ, electric piano, handclaps'),
 'casino':(swing,73.42,False,8,'Swing: walking bass, ride cymbal, brass stabs'),'bunker':(march,55.0,False,4,'Military march: snare rolls, low brass, anvil'),'beach':(reggae,82.41,True,4,'Reggae: offbeat guitar, one-drop, steel drum'),
 'temple':(march,73.42,False,4,'retired')}
def score(path,theme,n=10):
    g,key,major,k,_=GENRES[theme];prog=[(0,3),(5,3),(7,4),(0,3)] if g is swing else None
    S=Song(theme,n,key,major,k,prog);g(S);S.render(path)
if __name__=='__main__':
    import sys;score(sys.argv[2],sys.argv[1],int(sys.argv[3]) if len(sys.argv)>3 else 10)
