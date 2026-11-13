import asyncio,sys
from playwright.async_api import async_playwright
OUT=sys.argv[1]
JS="""()=>{const out={small:0,texts:0,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,height:document.documentElement.scrollHeight,taps:0,dark:0,area:0,lowc:0};
const lum=(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const f=(v)=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return [.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]),m[3]===undefined?1:m[3]]};
const bgOf=(el)=>{while(el){const b=getComputedStyle(el).backgroundColor;const l=lum(b);if(l[1]>.5)return l[0];el=el.parentElement}return lum(getComputedStyle(document.body).backgroundColor)[0]};
const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(!t||!n.parentElement)continue;const el=n.parentElement,cs=getComputedStyle(el),r=el.getBoundingClientRect();if(!r.width||cs.visibility==='hidden')continue;
 let fs=parseFloat(cs.fontSize);const svg=el.closest('svg');if(svg){const b=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;if(vb&&vb.width)fs=fs*b.width/vb.width}
 out.texts++;if(fs<13)out.small++;if(!svg){const fg=lum(cs.color)[0],bg=bgOf(el),cr=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);if(cr<4.5)out.lowc++}}
for(const el of document.querySelectorAll('a,button,select,input,summary,[data-id],[data-w]')){const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.height<40)&&getComputedStyle(el).pointerEvents!=='none')out.taps++}
// share of page area that is near-black
const H=out.height,step=40;let dk=0,tot=0;for(let y=20;y<H;y+=step){const el=document.elementFromPoint(innerWidth/2,Math.min(y-scrollY,innerHeight-1));}
return out}"""
DARK="""async()=>{let dk=0,tot=0;const H=document.documentElement.scrollHeight;for(let y=10;y<H;y+=60){scrollTo(0,y-200);const el=document.elementFromPoint(innerWidth*0.5,Math.min(200,innerHeight-1))||document.body;let e=el,l=null;while(e){const m=getComputedStyle(e).backgroundColor.match(/[\\d.]+/g).map(Number);if(m[3]===undefined||m[3]>.5){l=(m[0]+m[1]+m[2])/3;break}e=e.parentElement}if(l===null)l=0;tot++;if(l<28)dk++}scrollTo(0,0);return Math.round(dk/tot*100)}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);errs=[]
        print('width overflow height text<13 lowcontrast taps<40 near-black%')
        for wd in(320,375,390,430,768,1440):
            pg=await b.new_page(viewport={'width':wd,'height':800 if wd<800 else 900});pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto('http://localhost:8765/playoffs.html');await pg.wait_for_timeout(2500)
            for s in await pg.query_selector_all('details'):await s.evaluate('d=>d.open=true')
            v=await pg.evaluate(JS);dk=await pg.evaluate(DARK)
            for s in await pg.query_selector_all('details'):await s.evaluate('d=>d.open=false')
            await pg.screenshot(path=f'{OUT}/wr_{wd}.png');await pg.screenshot(path=f'{OUT}/wr_{wd}_full.png',full_page=True)
            print(wd,v['overflow'],v['height'],f"{v['small']}/{v['texts']}",v['lowc'],v['taps'],dk);await pg.close()
        await b.close();print('errors',errs[:3])
asyncio.run(main())
