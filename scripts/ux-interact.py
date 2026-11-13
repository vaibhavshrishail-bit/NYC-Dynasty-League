import asyncio
from playwright.async_api import async_playwright
B='http://localhost:8765/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
        for wd in(1440,390):
            cx=await b.new_context(viewport={'width':wd,'height':850},accept_downloads=True);pg=await cx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
            # time machine
            await pg.goto(B);await pg.wait_for_selector('.hero2');await pg.select_option('#tm','5');await pg.wait_for_timeout(300)
            t=await pg.inner_text('body');assert await pg.query_selector('.tmbar') and 'After Week 5' in t and 'Week 5 results' in t, 'tm'
            assert not await pg.is_visible('#nowonly') and 'Matchup of the week' not in t and 'Week 10' not in t.replace('Now · Week 10',''), 'tm mixes weeks'
            await pg.screenshot(path=f'build/tm_{wd}.png');await pg.click('#back');await pg.wait_for_timeout(200);assert not await pg.query_selector('.tmbar');print(wd,'time machine ok')
            # war room
            await pg.goto(B+'playoffs.html');await pg.wait_for_selector('svg.road');await pg.click('#pk button:has-text("Taylor")');await pg.wait_for_timeout(300)
            base=await pg.inner_text('#bigp');assert 'Taylor' in await pg.inner_text('#A .nm') or 'TAYLOR' in await pg.inner_text('#A .nm')
            await pg.click('.forkb [data-br=win]');await pg.wait_for_timeout(300);win=await pg.inner_text('#bigp');assert win!=base and await pg.query_selector('.sb.hyp'),'scenario'
            assert await pg.evaluate("document.querySelector('.cmp button[data-br=win]').classList.contains('col-on')") and 'HYPOTHETICAL' in (await pg.inner_text('#C')).upper() and 'UNDER YOUR SCENARIO' in (await pg.inner_text('#E')).upper()
            await pg.screenshot(path=f'build/scenario_{wd}.png');print(wd,'war room: win scenario',base,'->',win)
            await pg.click('#rs1');await pg.wait_for_timeout(300);assert (await pg.inner_text('#bigp'))==base and not await pg.query_selector('.sb');print(wd,'reset ok')
            await pg.evaluate("document.querySelector('svg.road .hit[data-w=\"5\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");await pg.wait_for_timeout(300)
            assert await pg.query_selector('.sb.his') and 'AFTER WEEK 5' in (await pg.inner_text('#C')).upper() and not await pg.query_selector('.forkb');await pg.click('#rc1');await pg.wait_for_timeout(200);assert not await pg.query_selector('.sb');print(wd,'historical week and return ok')
            await pg.focus('svg.road .hit[data-br=lose]');await pg.keyboard.press('Enter');await pg.wait_for_timeout(300);assert await pg.query_selector('.sb.hyp');await pg.click('#rs1');print(wd,'keyboard scenario ok')
            await pg.click('details[data-f=more] summary');await pg.click('.pk2 button >> nth=2');await pg.wait_for_timeout(300);assert await pg.evaluate("document.querySelector('details[data-f=more]').open");await pg.click('#rs1');print(wd,'other games ok')
            await pg.click('#C .w-row[data-id="10"]');await pg.wait_for_timeout(300);assert 'VAIBHAV' in (await pg.inner_text('#D h2')).upper() and len(await pg.query_selector_all('#D .ra a'))>=1;print(wd,'franchise switch updates road ahead')
            await pg.goto(B+'playoffs.html#draft');await pg.wait_for_selector('#draft');assert await pg.evaluate("document.querySelector('#draft').open");print(wd,'draft deep link ok')
            # race
            await pg.goto(B+'universe.html');await pg.wait_for_selector('svg.chart');await pg.click('#fc button >> nth=4');await pg.click('#pw');await pg.click('#pw');await pg.wait_for_timeout(200)
            assert 'After Week 7' in await pg.inner_text('#wkl') or 'AFTER WEEK 7' in await pg.inner_text('#wkl');
            if wd<800:
                bx=await (await pg.query_selector('svg.chart')).bounding_box();await pg.mouse.click(bx['x']+bx['width']*.35,bx['y']+bx['height']*.5);await pg.wait_for_timeout(200);print(wd,'tap chart ->',await pg.inner_text('#wkl'))
            await pg.screenshot(path=f'build/race_sel_{wd}.png',full_page=True)
            async with pg.expect_download() as d:await pg.click('[data-save="0"]')
            print(wd,'chart saved',(await d.value).suggested_filename)
            # week accordion + poster
            await pg.goto(B+'week.html');await pg.wait_for_selector('details.mx');n=await pg.evaluate("document.querySelectorAll('details.mx[open]').length");assert n==1
            await pg.click('#m2 > summary');assert await pg.evaluate("document.querySelector('#m2').open")
            async with pg.expect_download() as d:await pg.click('#m2 [data-poster]')
            dl=await d.value;await dl.save_as(f'build/poster_{wd}.png');print(wd,'poster',dl.suggested_filename)
            await pg.goto(B+'week.html?w=10#m3');await pg.wait_for_selector('details.mx');assert await pg.evaluate("document.querySelector('#m3').open");print(wd,'deep link opens game 4')
            # rivalry
            await pg.goto(B+'rivalry.html');await pg.wait_for_selector('.vs')
            if wd>800:
                await pg.click('#web g[data-id="10"]');await pg.wait_for_timeout(200);assert await pg.evaluate("document.querySelectorAll('#steps span')[1].className")=='on';await pg.click('#web g[data-id="5"]');await pg.wait_for_timeout(200);assert 'a=vaibhav&b=alan' in pg.url;print(wd,'rivalry two-step ok')
            else:
                await pg.select_option('#a','vaibhav');await pg.select_option('#b','alan');assert 'a=vaibhav&b=alan' in pg.url;print(wd,'rivalry selects ok')
            # old urls
            for u in ['hub/','cinematics/','documentary/','franchise.html?f=alan','archives.html','week.html?w=9','universe.html?w=4&f=dev']:
                r=await cx.request.get(B+u);assert r.status==200,u
            print(wd,'old urls ok');await cx.close()
        await b.close();print('page errors',errs)
asyncio.run(main())
