import base64,os,sys
s=open('src/cine_shell.html').read().replace('/*FONTS*/',open('src/fonts.css').read()).replace('/*CINE*/',open('src/cine.js').read())
au=''
if os.path.exists('out/pantheon_audio.m4a'): au='data:audio/mp4;base64,'+base64.b64encode(open('out/pantheon_audio.m4a','rb').read()).decode()
s=s.replace('/*AUDIO*/',au)
os.makedirs('out',exist_ok=True);open('out/pantheon-cinematic.html','w').write(s);print(len(s))
