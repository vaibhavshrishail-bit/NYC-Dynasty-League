import sys,base64,asyncio,subprocess,os
from playwright.async_api import async_playwright
FPS=30;N=750
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1300,'height':900});pg.on('pageerror',lambda e:print('ERR',e))
        await pg.goto('file:///home/claude/build/out/pantheon-cinematic.html');await pg.evaluate('window.__ready')
        ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','out/_video.tmp.mp4'],stdin=subprocess.PIPE)
        for i in range(N):
            d=await pg.evaluate(f'window.__frame({i/FPS},0.93)');ff.stdin.write(base64.b64decode(d.split(',')[1]))
            if i%150==0:print(i,flush=True)
        ff.stdin.close();rc=ff.wait();await b.close();assert rc==0
        os.rename('out/_video.tmp.mp4','out/_video.mp4')
asyncio.run(main())
