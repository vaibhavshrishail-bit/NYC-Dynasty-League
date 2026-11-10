import sys,base64,asyncio
from playwright.async_api import async_playwright
async def main(page_path,out,times):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1300,'height':900});pg.on('console',lambda m:print('console:',m.text));pg.on('pageerror',lambda e:print('ERR',e))
        await pg.goto('file://'+page_path);await pg.evaluate('window.__ready')
        for t in times:
            d=await pg.evaluate(f'window.__frame({t},0.85)');open(f'{out}/f_{t:05.2f}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        await b.close()
asyncio.run(main(sys.argv[1],sys.argv[2],[float(x) for x in sys.argv[3:]]))
