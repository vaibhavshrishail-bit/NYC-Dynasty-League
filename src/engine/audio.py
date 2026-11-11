"""Original synthesized score, one per theme. numpy/scipy only. score(path, theme) writes a 25s stereo WAV."""
import numpy as np, scipy.signal as sg, wave
SR=48000;D=25.0;N=int(SR*D);t=np.arange(N)/SR
P0=7.5;PD=1.8;L0=18.6
# theme -> (semitone shift from D, major?, ambience)
SPEC={'temple':(0,0,'storm'),'bunker':(-2,0,'hum'),'dawn':(3,1,'wind'),'city':(5,0,'wind'),'circuit':(-4,0,'hum'),'range':(2,0,'wind'),
      'casino':(-5,1,'hum'),'beach':(4,1,'waves'),'blueprint':(1,0,'hum'),'arcade':(5,0,'chip'),'inferno':(-3,0,'fire'),'neighborhood':(-1,1,'night'),'eclipse':(0,0,'hum')}
def score(path,theme):
    semi,major,amb=SPEC[theme];k=2**(semi/12);rs=np.random.RandomState(7+abs(hash(theme))%1000 if False else 7+sum(map(ord,theme)))
    L=np.zeros(N);R=np.zeros(N)
    def add(sig,at,pan=0.0,g=1.0):
        i=int(at*SR);n=min(len(sig),N-i)
        if n<=0 or i<0:return
        L[i:i+n]+=sig[:n]*g*(1-max(pan,0));R[i:i+n]+=sig[:n]*g*(1+min(pan,0))
    def lp(x,fc,o=2):b,a=sg.butter(o,min(fc,SR/2-100)/(SR/2));return sg.lfilter(b,a,x)
    def hp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2),'high');return sg.lfilter(b,a,x)
    def env(n,a,d):e=np.exp(-np.arange(n)/SR/d);q=max(1,int(a*SR));e[:q]*=np.linspace(0,1,q);return e
    def saw(f,n,det=0):tt=np.arange(n)/SR;return sum(2*((tt*f*(1+d))%1)-1 for d in (-det,0,det))/3
    def thunder(dur=3.0,crack=1.0):
        n=int(dur*SR);x=lp(np.cumsum(rs.randn(n))*.02,180)*env(n,.02,dur/3.2);x+=lp(rs.randn(n),90)*env(n,.3,dur/2.5)*.9
        c=hp(rs.randn(int(.25*SR)),1500)*env(int(.25*SR),.001,.05)*crack;x[:len(c)]+=c;return x/np.max(np.abs(x))
    def impact(f0=85):
        n=int(1.6*SR);tt=np.arange(n)/SR;f=35+(f0-35)*np.exp(-tt*9);x=np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.45)
        return x+lp(rs.randn(n),300)*env(n,.001,.12)*.6
    def clang(base=220):
        n=int(2.2*SR);tt=np.arange(n)/SR;x=np.zeros(n)
        for r,a,d in[(1,1,.9),(2.76,.6,.6),(5.4,.4,.35),(8.93,.25,.2),(1.5,.3,.7)]:x+=a*np.sin(2*np.pi*base*r*tt)*np.exp(-tt/d)
        return x*.25
    def whoosh(dur=.5):n=int(dur*SR);x=rs.randn(n);q=np.linspace(0,1,n);b,a=sg.butter(2,[400/(SR/2),5000/(SR/2)],'band');return sg.lfilter(b,a,x)*q**3
    def tom(f=70):n=int(.5*SR);tt=np.arange(n)/SR;return np.sin(2*np.pi*np.cumsum(f*(1+1.2*np.exp(-tt*40)))/SR)*env(n,.002,.12)+lp(rs.randn(n),600)*env(n,.001,.02)*.4
    def blip(f,dur=.11):n=int(dur*SR);tt=np.arange(n)/SR;return np.sign(np.sin(2*np.pi*f*tt))*env(n,.002,dur/2.5)*.5
    root=36.71*k;third=1.26 if major else 1.189
    dr=lp(saw(root,N,.004)+.6*saw(root*2,N,.006)+.3*saw(root*1.498,N,.005),160)
    add(dr*np.interp(t,[0,1.5,4.5,7.5,18.2,18.35,18.6,23,25],[0,.5,.6,.8,1.0,.15,1.0,.8,0]),0,0,.34)
    pad=sum(lp(saw(root*4*m,N,.007),900) for m in (1,third,1.498,2))/4
    add(pad*np.interp(t,[0,4.5,7.5,16,18.25,18.4,18.6,19.2,23.5,25],[0,0,.25,.6,.9,0,0,1,.7,0])*(1+.15*np.sin(2*np.pi*.3*t)),0,0,.22)
    br=sum(lp(saw(root*m,int(6*SR),.01),1400) for m in (1,2,3,4,6))/5*env(int(6*SR),.04,2.6);add(br,L0,0,.75)
    opening=np.interp(t,[0,.8,4.2,7.5,8],[0,1,1,.3,0])
    if amb=='storm':
        add(hp(lp(rs.randn(N),6000),1200)*opening,0,0,.035)
        for at,pan,g in[(.95,-.6,.5),(2.35,.1,.85),(3.55,.6,.6),(3.72,-.3,.5)]:add(thunder(3.2),at,pan,g)
    else:
        if amb=='wind':add(lp(rs.randn(N),700)*opening*(1+.6*np.sin(2*np.pi*.23*t)),0,0,.05)
        if amb=='waves':add(lp(rs.randn(N),1400)*np.interp(t,[0,1,24,25],[0,1,1,0])*(.55+.45*np.sin(2*np.pi*.16*t))**2,0,0,.06)
        if amb=='fire':
            cr=hp(rs.randn(N),2500)*(rs.rand(N)>.9992).astype(float);cr=sg.lfilter([1],[1,-.995],cr);add(cr*np.interp(t,[0,1,24,25],[0,1,1,0]),0,0,.05);add(lp(rs.randn(N),300)*opening,0,0,.08)
        if amb=='hum':add((np.sin(2*np.pi*60*k*t)+.4*np.sin(2*np.pi*120*k*t))*opening,0,0,.035)
        if amb=='night':
            ch=np.sin(2*np.pi*4200*t)*(np.sin(2*np.pi*38*t)>0)*(np.sin(2*np.pi*1.7*t)>.3);add(ch*opening,0,.4,.012);add(lp(rs.randn(N),500)*opening,0,0,.03)
        if amb=='chip':
            for j in range(18):add(blip(root*8*[1,1.189,1.498,2,1.498,1.189][j%6]),.9+j*.19,(-1)**j*.5,.10)
        for at,pan,g in[(.95,-.5,.45),(2.35,.1,.7),(3.55,.5,.5)]:add(impact(70),at,pan,g);add(clang(root*4*[1,1.498,2][[.95,2.35,3.55].index(at)]),at,pan,.25)
    beat=PD/4
    for i in range(6):
        at=P0+i*PD;add(whoosh(.45),at-.45,(-1)**i*.4,.22);add(impact(90),at,0,.8);add(clang(root*16/3*[1,1.122,third,1.335,1.498,1.782][i]),at,(-1)**i*-.35,.5)
        for q in range(1,8):
            add(tom(62*k**.5 if q%2==0 else 78*k**.5),at+q*beat/2,(.25 if q%2 else -.25),(.42 if q%2==0 else .2)*(.7+.06*i))
            if amb=='chip':add(blip(root*8*[1,third,1.498,2][q%4],.08),at+q*beat/2,(-1)**q*.5,.07)
    n=int(1.9*SR);q=np.linspace(0,1,n);add(hp(rs.randn(n),800)*q**2*.5+np.sin(2*np.pi*np.cumsum(200+1400*q**2)/SR)*q**2*.25,18.3-1.9,0,.3)
    add(thunder(4.5,1.6) if amb=='storm' else thunder(4.0,.5),L0,0,1.0 if amb=='storm' else .6);add(impact(110),L0,0,1.0)
    for j,(dt,m) in enumerate([(1.9,16),(2.3,16*third),(2.7,24),(3.1,32),(3.6,24),(4.2,32)]):
        n=int(2.5*SR);tt=np.arange(n)/SR;f=root*m;add((np.sin(2*np.pi*f*tt)+.4*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt/.8),L0+dt,(-1)**j*.5,.06)
    ir=rs.randn(int(2.2*SR))*np.exp(-np.arange(int(2.2*SR))/SR/.55);ir=lp(ir,5000)
    def rv(x):w=sg.fftconvolve(x,ir)[:N];return x+w/np.max(np.abs(w))*np.max(np.abs(x))*.28
    L=rv(L);R=rv(R);m=max(np.max(np.abs(L)),np.max(np.abs(R)));L=np.tanh(L/m*1.6)*.89;R=np.tanh(R/m*1.6)*.89
    f=np.interp(t,[0,.3,24.3,25],[0,1,1,0]);L*=f;R*=f
    w=wave.open(path,'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.stack([L,R],1)*32767).astype('<i2').tobytes());w.close()
