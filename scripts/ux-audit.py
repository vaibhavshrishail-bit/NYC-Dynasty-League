import asyncio,sys,json
from playwright.async_api import async_playwright
OUT=sys.argv[1];PAGES=[('home',''),('week','week.html'),('recap','week.html?w=9'),('race','universe.html'),('playoffs','playoffs.html'),('rivalry','rivalry.html?a=alan&b=manas'),('franchise','franchise.html?f=vaibhav'),('archives','archives.html')]
JS="""()=>{const out={small:0,tiny:0,texts:0,smallSamples:[],overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,height:document.documentElement.scrollHeight,taps:0};
const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(!t||!n.parentElement)continue;const el=n.parentElement,cs=getComputedStyle(el),r=el.getBoundingClientRect();if(!r.width||cs.visibility==='hidden')continue;
 let fs=parseFloat(cs.fontSize);const svg=el.closest('svg');if(svg){const b=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;if(vb&&vb.width)fs=fs*b.width/vb.width}
 out.texts++;if(fs<12){out.small++;if(out.smallSamples.length<6)out.smallSamples.push(Math.round(fs*10)/10+'px: '+t.slice(0,28))}if(fs<9)out.tiny++}
for(const el of document.querySelectorAll('a,button,select,input,[data-id]')){const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.height<30)&&innerWidth<800&&getComputedStyle(el).pointerEvents!=='none')out.taps++}return out}"""
async def main():
    res={}
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
        for wd in(1440,768,390,320):
            for name,url in PAGES:
                pg=await b.new_page(viewport={'width':wd,'height':900 if wd>800 else 800});pg.on('pageerror',lambda e,n=name:errs.append(f'{n}@{wd}: {e}'));pg.on('console',lambda m,n=name:errs.append(f'{n}@{wd}: {m.text}') if m.type=='error' else None)
                await pg.goto('http://localhost:8765/'+url);await pg.wait_for_timeout(1500);res[f'{name}@{wd}']=await pg.evaluate(JS)
                await pg.screenshot(path=f'{OUT}/{name}_{wd}.png',full_page=False)
                if wd in(1440,390):await pg.screenshot(path=f'{OUT}/{name}_{wd}_full.png',full_page=True)
                await pg.close()
        await b.close()
    print(f"{'page':16s} overflow  height  text<12px  <9px  small-taps")
    for k,v in res.items():print(f"{k:16s} {str(v['overflow']):8s} {v['height']:6d}  {v['small']:4d}/{v['texts']:<5d} {v['tiny']:4d}  {v['taps']:4d}  {v['smallSamples'][:3]}")
    print('errors',errs[:5])
asyncio.run(main())
