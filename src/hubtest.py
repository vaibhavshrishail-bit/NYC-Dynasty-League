import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        errs=[]
        for name,vp in [('m',{'width':390,'height':844}),('d',{'width':1440,'height':900})]:
            cx=await b.new_context(viewport=vp,device_scale_factor=2 if name=='m' else 1,has_touch=name=='m')
            pg=await cx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
            await pg.goto('file:///home/claude/build/out/hub/index.html');await pg.wait_for_timeout(1800)
            await pg.screenshot(path=f'shots/hub_{name}_1.jpg',quality=80,type='jpeg')
            await (pg.click if name=='m' else pg.hover)('.tile[data-m="Taylor"]');await pg.wait_for_timeout(1500);await pg.screenshot(path=f'shots/hub_{name}_2.jpg',quality=80,type='jpeg')
            await (pg.click if name=='m' else pg.hover)('.tile[data-m="Vaibhav"]');await pg.wait_for_timeout(300);await pg.click('[data-enter]');await pg.wait_for_timeout(2600)
            await pg.screenshot(path=f'shots/hub_{name}_3.jpg',quality=80,type='jpeg')
            for i,sec in enumerate(['stars','rivals','history','roster']):
                await pg.click(f'[data-sec="{sec}"]');await pg.wait_for_timeout(1500);await pg.screenshot(path=f'shots/hub_{name}_{4+i}.jpg',quality=80,type='jpeg')
            await pg.click('[data-pos="WR"]');await pg.click('[data-st="starter"]');n=await pg.locator('.pl').count();print(name,'WR starters',n)
            await pg.fill('#q','hunter');await pg.click('[data-pos="ALL"]');await pg.click('[data-st="ALL"]');print(name,'search hunter',await pg.locator('.pl').count())
            await pg.evaluate('scrollTo(0,0)');await pg.click('.rival[data-go="Shiamak"]');await pg.wait_for_timeout(2400);print(name,'title',await pg.inner_text('.hero h1'),await pg.evaluate('location.hash'))
            await pg.screenshot(path=f'shots/hub_{name}_8.jpg',quality=80,type='jpeg')
            await pg.keyboard.press('ArrowRight');await pg.wait_for_timeout(1800);print(name,'next',await pg.inner_text('.hero h1'))
            await pg.click('[data-hub]');await pg.wait_for_timeout(1600);print(name,'hub tiles',await pg.locator('.tile').count())
            await pg.goto('file:///home/claude/build/out/hub/index.html#pantheon');await pg.wait_for_timeout(1500);await pg.click('[data-cine]');await pg.wait_for_timeout(3000)
            await pg.screenshot(path=f'shots/hub_{name}_9.jpg',quality=80,type='jpeg');await pg.click('#cine .x');print(name,'cine closed',await pg.evaluate("document.querySelector('#cine').classList.contains('open')"))
            w=await pg.evaluate('document.documentElement.scrollWidth');print(name,'scrollWidth',w,vp['width'])
            await cx.close()
        print('ERRORS',errs);await b.close()
asyncio.run(main())
