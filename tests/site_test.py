#!/usr/bin/env python3
"""Sitewide interaction regression test. Opens every public route at phone and desktop widths, performs the important
interactions, and after EVERY step checks the rendered layout (not just that the click worked).
Usage: python3 tests/site_test.py [--shots DIR] [--quick | --ci | --smoke] [--root DIR]   Exit code 1 if any critical problem is found.
Runs against the files in site/ with whatever data is committed there; every check is data-agnostic."""
import asyncio, sys, os, json, socket, subprocess, re, time
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
QUICK = '--quick' in sys.argv or '--ci' in sys.argv or '--smoke' in sys.argv
CI = '--ci' in sys.argv; SMOKE = '--smoke' in sys.argv
if '--root' in sys.argv: ROOT = sys.argv[sys.argv.index('--root') + 1]
CHROME = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None

CHECK = r"""(opts) => {
  const hiddenDetails = (el) => { for (let d = el.closest('details:not([open])'); d; d = d.parentElement && d.parentElement.closest('details:not([open])')) { const sm = d.querySelector(':scope > summary'); if (!sm || !sm.contains(el)) return true; } return false; };
  const issues = [], vw = innerWidth, vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && (!el.checkVisibility || el.checkVisibility()) && !hiddenDetails(el); };
  const chrome = (el) => !!el.closest('.nav,.tabbar,#state,.tmbar,#tmbar'), scroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const label = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26) + '"');
  if (document.documentElement.scrollWidth > vw + 1) issues.push(['overflow', 'page scrolls sideways: ' + document.documentElement.scrollWidth + ' > ' + vw]);
  const leaves = [];
  const w = document.createTreeWalker(document.getElementById('lb') || document.body, NodeFilter.SHOW_TEXT); let n; // an open viewer covers the page, so only the viewer is judged
  while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || !vis(el) || el.closest('[aria-hidden=true],title,script,style')) continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; const svg = el.closest('svg'), lines = [...rg.getClientRects()].filter((x) => x.width > 1 && x.height > 1);
    let fs = parseFloat(getComputedStyle(el).fontSize); if (svg && svg.viewBox && svg.viewBox.baseVal.width) fs *= svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    if (fs < 11.5 && !el.closest('.jt svg,.jr svg,.pl svg,[data-decor]')) issues.push(['smalltext', fs.toFixed(1) + 'px ' + label(el)]);
    if (!scroller(el) && !chrome(el) && (r.right > vw + 2 || r.left < -2)) issues.push(['offscreen', label(el)]);
    for (const lr of (lines.length ? lines : [r])) leaves.push({ el, r: lr, svg: !!svg, t }); }
  // clipped text: content wider than its box with overflow hidden
  for (const el of new Set(leaves.map((x) => x.el))) { const cs = getComputedStyle(el); if (!el.closest('svg') && (cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2) issues.push(['clipped', label(el)]); }
  // overlapping text (same layer). Ignores parent/child pairs and fixed chrome.
  const L = leaves.filter((x) => !chrome(x.el));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const sh = (r) => ({ left: r.left, right: r.right, top: r.top + r.height * 0.22, bottom: r.bottom - r.height * 0.22, width: r.width, height: r.height * 0.56 }), A = sh(a.r), Bx = sh(b.r); const ix = Math.min(A.right, Bx.right) - Math.max(A.left, Bx.left), iy = Math.min(A.bottom, Bx.bottom) - Math.max(A.top, Bx.top); if (ix <= 2 || iy <= 2) continue;
    const frac = ix * iy / Math.min(A.width * A.height, Bx.width * Bx.height); if (frac > (a.svg || b.svg ? 0.45 : 0.3)) { issues.push(['overlap', label(a.el) + ' × ' + label(b.el)]); if (issues.filter((x) => x[0] === 'overlap').length > 6) { i = L.length; break; } } }
  // controls: usable size and inside the viewport width
  for (const el of document.querySelectorAll('button,select,summary,a.btn,a.b2,[role=button]')) { if (!vis(el) || chrome(el) || el.closest('svg') || getComputedStyle(el).pointerEvents === 'none') continue; const r = el.getBoundingClientRect();
    if (vw < 800 && r.height < 36) issues.push(['smalltap', Math.round(r.height) + 'px ' + label(el)]); if (!scroller(el) && (r.right > vw + 2 || r.left < -2)) issues.push(['offscreen', label(el)]); }
  // charts must have rendered
  for (const s of document.querySelectorAll('svg.chart,svg.road,#web > svg')) { if (getComputedStyle(s).display === 'none' || (s.checkVisibility && !s.checkVisibility())) continue; const r = s.getBoundingClientRect(); if (r.width < 50 || r.height < 50 || s.querySelectorAll('*').length < 12) issues.push(['chart', 'chart not rendered']); if (r.right > vw + 2) issues.push(['overflow', 'chart wider than screen']); }
  const lb = document.getElementById('lb'); if (lb) { const im = lb.querySelector('img'), r = im.getBoundingClientRect(), x = lb.querySelector('#lbx').getBoundingClientRect(); if (r.left < -1 || r.right > vw + 1) issues.push(['overflow', 'expanded image wider than the screen']); if (im.naturalWidth && Math.abs(r.width / r.height - im.naturalWidth / im.naturalHeight) > 0.02) issues.push(['clipped', 'expanded image is distorted or cropped']); if (x.top < 0 || x.bottom > innerHeight || x.right > vw) issues.push(['offscreen', 'close button not reachable']); }
  for (const { t } of leaves) if (/^(Loading|Running)\b.*…$/.test(t)) issues.push(['loading', 'stuck: ' + t.slice(0, 30)]);
  if (document.querySelectorAll('[id]').length !== new Set([...document.querySelectorAll('[id]')].map((e) => e.id)).size) issues.push(['dupid', 'duplicate element ids']);
  return issues; }"""

async def run():
    port = socket.socket(); port.bind(('', 0)); P = port.getsockname()[1]; port.close()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(P), '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    B = f'http://localhost:{P}/'; results = {}; n_shots = 0
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        async def flow(name, vw, url, steps):
            nonlocal n_shots
            cx = await br.new_context(viewport={'width': vw, 'height': 844 if vw < 800 else 900}, has_touch=vw < 800, reduced_motion='reduce'); pg = await cx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(('jserror', str(e)[:120]))); pg.on('console', lambda m: errs.append(('jserror', m.text[:120])) if m.type == 'error' and 'favicon' not in m.text else None)
            pg.on('response', lambda r: errs.append(('http', f'{r.status} {r.url[-50:]}')) if r.status >= 400 else None)
            out = results.setdefault((name, vw), [])
            async def check(step, anchor=None, before=None):
                nonlocal n_shots
                await pg.wait_for_timeout(350); iss = await asyncio.wait_for(pg.evaluate(CHECK, {}), 20)
                if anchor and before is not None:
                    after = await pg.evaluate("(s)=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().top:null}", anchor)
                    if after is not None and abs(after - before) > 140: iss.append(['jump', f'{anchor} moved {round(after - before)}px after the click'])
                iss += [list(e) for e in errs]; errs.clear(); out.append((step, iss))
                if SHOTS and vw in (390, 1440): os.makedirs(SHOTS, exist_ok=True); await pg.screenshot(path=f'{SHOTS}/{name}_{vw}_{len(out):02d}_{re.sub("[^a-z0-9]+", "-", step.lower())[:30]}.png'); n_shots += 1
            await pg.goto(B + url, wait_until='load'); await pg.wait_for_timeout(1200); await check('load')
            for step in steps:
                label, kind, arg = step[0], step[1], step[2]; anchor = step[3] if len(step) > 3 else (arg if kind == 'click' else None)
                try:
                    before = None
                    if kind == 'click':
                        if not await pg.query_selector(arg): out.append((label, [['skip', 'not present: ' + arg]])); continue
                        await pg.evaluate("(s)=>document.querySelector(s).scrollIntoView({block:'center',behavior:'instant'})", arg)
                    if anchor: before = await pg.evaluate("(s)=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().top:null}", anchor)
                    if kind == 'click': await pg.click(arg, timeout=4000)
                    elif kind == 'select': await pg.select_option(arg[0], arg[1])
                    elif kind == 'waitfor': await pg.wait_for_selector(arg, timeout=15000)
                    elif kind == 'js': await asyncio.wait_for(pg.evaluate(arg), 8)
                    elif kind == 'goto': await pg.goto(B + arg, wait_until='load'); await pg.wait_for_timeout(1200)
                    elif kind == 'key': await pg.focus(arg[0]); await pg.keyboard.press(arg[1])
                    await check(label, anchor if kind != 'goto' else None, before)
                except Exception as e: out.append((label, [['fail', str(e).split('\n')[0][:110]]]))
            await cx.close()
        F = {
          'home': ('', [('time machine: week 5', 'select', ('#tm', '5')), ('return to current week', 'click', '#back', '#tm'), ('time machine: week 2', 'select', ('#tm', '2')), ('back via selector', 'select', ('#tm', '0')), ('open standings', 'click', 'details.fold > summary'), ('open ranking method', 'click', '#race details > summary')]),
          'matchups': ('week.html', [('open game 2', 'click', '#m1 > summary'), ('open game 3', 'click', '#m2 > summary'), ('game 2: pick a kickoff window', 'click', '#tl1 .tlw button:nth-of-type(1)'), ('game 2: another window', 'click', '#tl1 .tlw button:last-of-type'), ('game 2: head to head', 'click', '#m1 details.fold:nth-of-type(1) > summary'), ('game 2: lineups', 'click', '#m1 details.fold:nth-of-type(2) > summary'), ('game 2: open poster', 'click', '#m1 [data-poster]'), ('poster shown whole', 'waitfor', '#lb img'), ('game 2: close poster', 'click', '#lbx', '#m1 [data-poster]'),
                       ('collapse game 2', 'click', '#m1 > summary'), ('collapse game 1', 'click', '#m0 > summary'), ('open NFL slate', 'click', '#page > details.fold > summary'), ('recap tab', 'click', '#tabs a:nth-of-type(1)', '#tabs'), ('future week', 'js', "(()=>{const s=document.getElementById('w');s.value=String(Math.max(...[...s.options].map(o=>+o.value)));s.dispatchEvent(new Event('change'))})()"), ('preview tab', 'click', '#tabs a:nth-of-type(2)', '#tabs'), ('deep link game 4', 'goto', 'week.html#m3')]),
          'recap': ('week.html?w=9', [('week 3 recap', 'select', ('#w', '3')), ('week 9 recap', 'select', ('#w', '9'))]),
          'warroom': ('playoffs.html', [('select franchise', 'click', '#pk button:nth-of-type(8)'), ('win scenario', 'click', '.forkb [data-br=win]'), ('open other games', 'click', 'details[data-f=more] > summary'), ('pick another game', 'click', '.pk2:nth-of-type(3) button:nth-of-type(1)'), ('next week tab', 'click', '.wk-tabs button:nth-of-type(2)'), ('pick a week 11 game', 'click', '.pk2:nth-of-type(2) button:nth-of-type(2)'),
                      ('switch franchise in ranking', 'click', '#C .w-row:nth-of-type(7)'), ('loss scenario via table', 'click', '.cmp button[data-br=lose]'), ('reset', 'click', '#rs2'), ('historical week', 'js', "document.querySelector('svg.road .hit[data-w=\"4\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))"), ('previous week', 'click', '#pw'), ('return to current week', 'click', '#rc3', '#C h2'),
                      ('open hardest road', 'click', 'details[data-f=sos] > summary'), ('open all numbers', 'click', 'details[data-f=table] > summary'), ('leave and come back', 'goto', 'playoffs.html')]),
          'race': ('universe.html', [('select franchise', 'click', '#fc button:nth-of-type(5)'), ('previous week', 'click', '#pw'), ('previous week again', 'click', '#pw'), ('other franchise', 'click', '#fc button:nth-of-type(11)'), ('pick from side list', 'click', '.side .row:nth-of-type(3)'), ('deselect', 'click', '#fc button[aria-pressed=true]'), ('next week', 'click', '#nw')]),
          'rivalry': ('rivalry.html', [('pick franchise', 'select', ('#a', 'vaibhav')), ('pick rival', 'select', ('#b', 'alan')), ('web: first crest', 'click', '#web g[data-id="4"]'), ('web: second crest', 'click', '#web g[data-id="8"]'), ('phone list: pick rival', 'click', '#web .rl button:nth-of-type(5)'), ('layer: playoff games', 'click', '#web [data-layer=playoff]'), ('layer: trades', 'click', '#web [data-layer=trades]'), ('trades: filter a franchise', 'click', '#web .tr-f button:nth-of-type(3)'), ('trades: all again', 'click', '#web .tr-f button:nth-of-type(1)'), ('layer: draft picks', 'click', '#web [data-layer=picks]'), ('picks: ladder franchise', 'click', '#web .pk-lad button:nth-of-type(4)'), ('picks: tap a pick', 'click', '#web .pk-card.on .pc.got, #web .pk-card.on .pc'), ('picks: open all boards', 'js', "(()=>{const d=document.querySelector('#web .pk-all');if(d)d.open=true})()"), ('deep link trades', 'goto', 'rivalry.html?a=vaibhav&b=alan&layer=trades'), ('back to every game', 'click', '#web [data-layer=all]'), ('another rivalry', 'select', ('#b', 'achal')), ('deep link', 'goto', 'rivalry.html?a=nihar&b=manas')]),
          'franchise': ('franchise.html?f=vaibhav', [('play cinematic', 'js', "(()=>{const v=document.querySelector('video');if(v){v.muted=true;v.play().catch(()=>{})}})()"), ('long name franchise', 'goto', 'franchise.html?f=achal'), ('another', 'goto', 'franchise.html?f=nihar')]),
          'draft': ('draft.html', [('outline a franchise', 'click', '#pk button:nth-of-type(5)'), ('tap a pick', 'click', '.dboard .dpick:nth-of-type(2)'), ('close pick', 'click', '#dclose'), ('year 2028', 'click', '.dr-yr button:nth-of-type(2)'), ('jump to a board', 'click', '.pk-lad button:nth-of-type(3)')]),
          'archives': ('archives.html', [('season standings 2023', 'js', "(()=>{const s=document.getElementById('ys');s.selectedIndex=1;s.dispatchEvent(new Event('change'))})()"), ('open library week', 'click', '#library details:nth-of-type(3) > summary'), ('open a page in the viewer', 'click', '#library details:nth-of-type(3) .libg a'), ('close the viewer', 'click', '#lbx', '#library details:nth-of-type(3) > summary'), ('open history series', 'click', '#library details:last-of-type > summary'), ('close library week', 'click', '#library details:nth-of-type(3) > summary')]),
          'timeline': ('timeline.html', [('pick 2025', 'click', '#seasons button[data-s="2025"]', '#body h2'), ('pick 2023', 'click', '#seasons button[data-s="2023"]', '#body h2'), ('pick 2022', 'click', '#seasons button[data-s="2022"]', '#body h2'), ('pick 2024', 'click', '#seasons button[data-s="2024"]'), ('open a moment', 'click', '#body .tle'), ('filter: records', 'click', '#body [data-t=record]'), ('pick 2026', 'click', '#seasons button[data-s="2026"]'), ('filter: trades', 'click', '#body [data-t=trade]'), ('open a trade', 'click', '#body .tle'), ('close it', 'click', '#body [data-close]', '#body h2'), ('follow a franchise', 'select', ('#mef', '10')), ('everything', 'click', '#body [data-t=all]')]),
          'cinematics': ('cinematics/', []), 'documentary': ('documentary/', []),
        }
        ONLY = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
        for name, (url, steps) in F.items():
            if ONLY and name not in ONLY: continue
            for vw in ([390, 1440] if QUICK else [320, 375, 390, 430, 768, 1024, 1440]): await flow(name, vw, url, [] if SMOKE else steps if vw in (390, 1440) or name in ('warroom', 'matchups') else steps[:3])
        # the phone journey from the brief, as one continuous session
        if not SMOKE and (not ONLY or 'journey' in ONLY): await flow('journey', 390, '', [('to matchups', 'click', '.tabbar a:nth-of-type(2)'), ('open a preview', 'click', '#m1 > summary'), ('expand lineups', 'click', '#m1 details.fold:nth-of-type(2) > summary'), ('collapse lineups', 'click', '#m1 details.fold:nth-of-type(2) > summary'), ('to war room', 'click', '.tabbar a:nth-of-type(3)'), ('select franchise', 'click', '#pk button:nth-of-type(7)'), ('change scenario', 'click', '.forkb [data-br=win]'),
               ('to rivalries', 'click', '.tabbar a:nth-of-type(5)'), ('select rivalry', 'select', ('#b', 'taylor')), ('to franchises', 'click', '.tabbar a:nth-of-type(4)'), ('open a franchise', 'click', '#grid a:nth-of-type(7)'), ('play cinematic', 'js', "(()=>{const v=document.querySelector('video');if(v){v.muted=true;v.play().catch(()=>{})}})()"), ('to archives', 'click', '.tabbar a:nth-of-type(6)'), ('back home', 'click', '.tabbar a:nth-of-type(1)')])
        await br.close()
    srv.terminate()
    CRIT = {'overflow', 'offscreen', 'overlap', 'jserror', 'http', 'fail', 'chart', 'loading', 'jump', 'dupid', 'clipped'}; WARN = {'smalltext', 'smalltap', 'skip'}
    if CI: WARN |= {'overlap', 'clipped', 'jump', 'offscreen', 'smalltext'}; CRIT -= WARN  # in CI only hard breakage blocks a publish; fonts differ between machines
    tot = {}; bad = 0; lines = []
    for (name, vw), steps in results.items():
        c = sum(1 for s, iss in steps for i in iss if i[0] in CRIT); wn = sum(1 for s, iss in steps for i in iss if i[0] in WARN); bad += c; tot[(name, vw)] = (len(steps), c, wn)
        for s, iss in steps:
            seen = set()
            for k, d in iss:
                if (k, d) in seen: continue
                seen.add((k, d)); lines.append(f'  {name}@{vw} [{s}] {k}: {d}')
    names = list(dict.fromkeys(n for n, _ in results)); vws = sorted({v for _, v in results})
    print('route'.ljust(12) + ''.join(str(v).rjust(9) for v in vws) + '   (steps: critical/warnings)')
    for n in names: print(n.ljust(12) + ''.join((f"{tot[(n, v)][0]}:{tot[(n, v)][1]}/{tot[(n, v)][2]}" if (n, v) in tot else '-').rjust(9) for v in vws))
    print(f'\n{sum(t[0] for t in tot.values())} states checked, {bad} critical problems, {sum(t[2] for t in tot.values())} warnings' + (f', {n_shots} screenshots in {SHOTS}' if SHOTS else ''))
    for l in lines[:int(os.environ.get('MAXLINES', '60'))]: print(l)
    if len(lines) > 60: print(f'  … {len(lines) - 60} more')
    json.dump({f'{n}@{v}': [(s, i) for s, i in st] for (n, v), st in results.items()}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'last-run.json'), 'w'))
    sys.exit(1 if bad else 0)
asyncio.run(run())
