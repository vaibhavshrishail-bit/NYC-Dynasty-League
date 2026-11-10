import base64,subprocess,os
if not os.path.exists('out/pantheon_audio_96.m4a'):
    subprocess.check_call(['ffmpeg','-y','-loglevel','error','-i','out/pantheon_audio.wav','-c:a','aac','-b:a','96k','out/pantheon_audio_96.m4a'])
r=lambda p:open(p).read()
s=r('src/hub_shell.html').replace('/*FONTS*/',r('src/fonts.css')).replace('/*CSS*/',r('src/hub.css')).replace('/*DATA*/',r('src/league.json').replace('</','<\\/')).replace('/*CINE*/',r('src/cine.js')).replace('/*JS*/',r('src/hub.js'))
s=s.replace('/*AUDIO*/','data:audio/mp4;base64,'+base64.b64encode(open('out/pantheon_audio_96.m4a','rb').read()).decode())
os.makedirs('out/hub',exist_ok=True);open('out/hub/index.html','w').write(s);print(len(s))
