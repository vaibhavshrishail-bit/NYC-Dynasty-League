"""Original synthesized score for the season documentary. doc_score(path, dur, chapter_starts, hits) writes a stereo WAV."""
import numpy as np, scipy.signal as sg, wave
SR=48000
def doc_score(path,dur,chapters,hits):
    N=int(SR*dur);t=np.arange(N)/SR;rs=np.random.RandomState(26);L=np.zeros(N);R=np.zeros(N);root=36.71*2**(-2/12)
    def add(sig,at,pan=0.0,g=1.0):
        i=int(at*SR);n=min(len(sig),N-i)
        if n<=0 or i<0:return
        L[i:i+n]+=sig[:n]*g*(1-max(pan,0));R[i:i+n]+=sig[:n]*g*(1+min(pan,0))
    def lp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2));return sg.lfilter(b,a,x)
    def hp(x,fc,o=2):b,a=sg.butter(o,fc/(SR/2),'high');return sg.lfilter(b,a,x)
    def env(n,a,d):e=np.exp(-np.arange(n)/SR/d);q=max(1,int(a*SR));e[:q]*=np.linspace(0,1,q);return e
    def saw(f,n,det=0):tt=np.arange(n)/SR;return sum(2*((tt*f*(1+d))%1)-1 for d in (-det,0,det))/3
    def impact(f0=85):
        n=int(1.6*SR);tt=np.arange(n)/SR;f=35+(f0-35)*np.exp(-tt*9);return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.45)+lp(rs.randn(n),300)*env(n,.001,.12)*.6
    def clang(base):
        n=int(2.2*SR);tt=np.arange(n)/SR;x=np.zeros(n)
        for r,a,d in[(1,1,.9),(2.76,.6,.6),(5.4,.4,.35),(1.5,.3,.7)]:x+=a*np.sin(2*np.pi*base*r*tt)*np.exp(-tt/d)
        return x*.25
    def whoosh(d=.6):n=int(d*SR);q=np.linspace(0,1,n);b,a=sg.butter(2,[400/(SR/2),5000/(SR/2)],'band');return sg.lfilter(b,a,rs.randn(n))*q**3
    def tom(f):n=int(.5*SR);tt=np.arange(n)/SR;return np.sin(2*np.pi*np.cumsum(f*(1+1.2*np.exp(-tt*40)))/SR)*env(n,.002,.12)
    add(lp(saw(root,N,.004)+.6*saw(root*2,N,.006)+.3*saw(root*1.498,N,.005),160)*np.interp(t,[0,2,dur-9,dur-3,dur],[0,.6,.9,1,0]),0,0,.34)
    # slow four-chord progression, one chord per chapter, minor until the finale
    prog=[(1,1.189,1.498),(.891,1.122,1.335),(.794,1,1.189),(.749,.944,1.122),(1,1.189,1.498),(.891,1.122,1.335),(.794,1,1.189),(1,1.26,1.498)]
    for i,c0 in enumerate(chapters):
        c1=chapters[i+1] if i+1<len(chapters) else dur;n=int((c1-c0)*SR);ch=prog[i%len(prog)]
        pad=sum(lp(saw(root*4*m,n,.007),900+500*i/len(chapters)) for m in ch+(ch[0]*2,))/4;e=np.minimum(1,np.minimum(np.arange(n)/SR/1.2,(n-np.arange(n))/SR/.6))
        add(pad*e*(1+.15*np.sin(2*np.pi*.3*np.arange(n)/SR)),c0,0,.16+.1*i/len(chapters))
        if i:add(whoosh(.6),c0-.6,0,.22);add(impact(95),c0,0,.9);add(clang(root*4*ch[0]),c0,0,.4)
        # pulse: eighth-note toms that thicken as the film goes on
        bpm=96+3*i;step=60/bpm/2;k=0;x=c0+step*2
        while x<c1-.3:
            if k%4==0 or i>=2 or (i==1 and k%2==0):add(tom(60 if k%4 else 78),x,(.25 if k%2 else -.25),(.34 if k%4==0 else .14)*(.6+.06*i))
            x+=step;k+=1
    for j,h in enumerate(hits):add(clang(root*8*[1,1.189,1.335,1.498,1.782][j%5]),h,(-1)**j*.4,.22);add(impact(60),h,0,.3)
    f0=chapters[-1];n=int(5*SR);add(sum(lp(saw(root*m,n,.01),1400) for m in (1,2,3,4,6))/5*env(n,.04,2.6),f0,0,.7)
    ir=rs.randn(int(2.2*SR))*np.exp(-np.arange(int(2.2*SR))/SR/.55);ir=lp(ir,5000)
    def rv(x):w=sg.fftconvolve(x,ir)[:N];return x+w/np.max(np.abs(w))*np.max(np.abs(x))*.28
    L=rv(L);R=rv(R);m=max(np.max(np.abs(L)),np.max(np.abs(R)));L=np.tanh(L/m*1.6)*.89;R=np.tanh(R/m*1.6)*.89
    f=np.interp(t,[0,.3,dur-1.2,dur],[0,1,1,0]);L*=f;R*=f
    w=wave.open(path,'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.stack([L,R],1)*32767).astype('<i2').tobytes());w.close()
