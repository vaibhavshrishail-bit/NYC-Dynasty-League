import numpy as np, scipy.signal as sg, wave
SR=48000;D=25.0;N=int(SR*D);t=np.arange(N)/SR;rs=np.random.RandomState(7)
L=np.zeros(N);R=np.zeros(N)
def add(sig,at,pan=0.0,g=1.0):
    i=int(at*SR);n=min(len(sig),N-i)
    if n<=0:return
    L[i:i+n]+=sig[:n]*g*(1-max(pan,0));R[i:i+n]+=sig[:n]*g*(1+min(pan,0))
def lp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2));return sg.lfilter(b,a,x)
def hp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2),'high');return sg.lfilter(b,a,x)
def env(n,a,d):e=np.exp(-np.arange(n)/SR/d);k=int(a*SR);e[:k]*=np.linspace(0,1,k);return e
def saw(f,n,det=0):tt=np.arange(n)/SR;return sum(2*((tt*f*(1+d))%1)-1 for d in (-det,0,det))/3
def thunder(dur=3.0,crack=1.0):
    n=int(dur*SR);x=lp(np.cumsum(rs.randn(n))*.02,180)*env(n,.02,dur/3.2);x+=lp(rs.randn(n),90)*env(n,.3,dur/2.5)*.9
    c=hp(rs.randn(int(.25*SR)),1500)*env(int(.25*SR),.001,.05)*crack;x[:len(c)]+=c;return x/np.max(np.abs(x))
def impact(f0=85):
    n=int(1.6*SR);tt=np.arange(n)/SR;f=35+(f0-35)*np.exp(-tt*9);x=np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.45)
    x+=lp(rs.randn(n),300)*env(n,.001,.12)*.6;return x
def clang(base=220):
    n=int(2.2*SR);tt=np.arange(n)/SR;x=np.zeros(n)
    for r,a,d in[(1,1,.9),(2.76,.6,.6),(5.4,.4,.35),(8.93,.25,.2),(1.5,.3,.7)]:x+=a*np.sin(2*np.pi*base*r*tt)*np.exp(-tt/d)
    return x*.25
def whoosh(dur=.5):n=int(dur*SR);x=rs.randn(n);k=np.linspace(0,1,n);b,a=sg.butter(2,[400/(SR/2),5000/(SR/2)],'band');return sg.lfilter(b,a,x)*k**3
def tom(f=70):n=int(.5*SR);tt=np.arange(n)/SR;return np.sin(2*np.pi*np.cumsum(f*(1+1.2*np.exp(-tt*40)))/SR)*env(n,.002,.12)+lp(rs.randn(n),600)*env(n,.001,.02)*.4
# drone bed
dr=lp(saw(36.71,N,.004)+.6*saw(73.42,N,.006)+.3*saw(55.0,N,.005),160)
e=np.interp(t,[0,1.5,4.5,7.5,18.2,18.35,18.6,23,25],[0,.5,.6,.8,1.0,.15,1.0,.8,0])
add(dr*e,0,0,.34)
# pad (D minor) builds through players
pad=sum(lp(saw(f,N,.007),900+0*f) for f in (146.83,174.61,220.0,293.66))/4
pe=np.interp(t,[0,4.5,7.5,16,18.25,18.4,18.6,19.2,23.5,25],[0,0,.25,.6,.9,0,0,1,.7,0])
add(pad*pe*(1+.15*np.sin(2*np.pi*.3*t)),0,0,.22)
# braam at logo
br=sum(lp(saw(f,int(6*SR),.01),1400) for f in (36.71,73.42,110.0,146.83,220.0))/5*env(int(6*SR),.04,2.6)
add(br,18.6,0,.75)
# rain
rn=hp(lp(rs.randn(N),6000),1200)*np.interp(t,[0,.8,4.2,7.5,8],[0,1,1,.3,0]);add(rn,0,.0,.035)
for at,pan,g in[(.95,-.6,.5),(2.35,.1,.85),(3.55,.6,.6),(3.72,-.3,.5)]:add(thunder(3.2),at,pan,g)
# players: impacts + pulse
P0=7.5;PD=1.8;beat=PD/4
for i in range(6):
    at=P0+i*PD;add(whoosh(.45),at-.45,(-1)**i*.4,.22);add(impact(90),at,0,.8);add(clang(196*[1,1.122,1.189,1.335,1.498,1.782][i]),at,(-1)**i*-.35,.5)
    for k in range(8):
        if k==0:continue
        add(tom(62 if k%2==0 else 78),at+k*beat/2,(.25 if k%2 else -.25),(.42 if k%2==0 else .2)*(.7+.06*i))
# riser into logo
n=int(1.9*SR);k=np.linspace(0,1,n);ris=hp(rs.randn(n),800)*k**2*.5+np.sin(2*np.pi*np.cumsum(200+1400*k**2)/SR)*k**2*.25;add(ris,18.3-1.9,0,.3)
add(thunder(4.5,1.6),18.6,0,1.0);add(impact(110),18.6,0,1.0)
# shimmer bells after reveal
for j,(dt,f) in enumerate([(1.9,587.33),(2.3,698.46),(2.7,880.0),(3.1,1174.66),(3.6,880.0),(4.2,1174.66)]):
    n=int(2.5*SR);tt=np.arange(n)/SR;add((np.sin(2*np.pi*f*tt)+.4*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt/.8),18.6+dt,(-1)**j*.5,.06)
# reverb
ir=rs.randn(int(2.2*SR))*np.exp(-np.arange(int(2.2*SR))/SR/.55);ir=lp(ir,5000)
def rv(x):w=sg.fftconvolve(x,ir)[:N];return x+w/np.max(np.abs(w))*np.max(np.abs(x))*.28
L=rv(L);R=rv(R)
m=max(np.max(np.abs(L)),np.max(np.abs(R)));L=np.tanh(L/m*1.6)*.89;R=np.tanh(R/m*1.6)*.89
f=np.interp(t,[0,.3,24.3,25],[0,1,1,0]);L*=f;R*=f
w=wave.open('out/pantheon_audio.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
w.writeframes((np.stack([L,R],1)*32767).astype('<i2').tobytes());w.close()
