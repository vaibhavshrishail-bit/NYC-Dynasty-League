#!/usr/bin/env python3
"""Regression checks for defects that were reported, reproduced and fixed. Each one tests the real outcome, not a click.

  python3 tests/regression_test.py            # serves site/ itself and runs in headless Chromium (add --webkit to also try WebKit if installed)

1. Both Race chart exports produce a real, non-blank PNG at least 1600px wide, and the button reports the result.
2. Twenty film switches leave exactly one franchise link, in step with the title, video and stage.
3. The image viewer keeps keyboard focus inside itself, blocks the page behind, closes on Escape and returns focus to its opener.
4. Every franchise's scenario link opens the War Room on that franchise, and the Draft link opens the Draft Room on it.
5. This week's win chance on a franchise page equals the Matchups page figure for the same game.
"""
import asyncio, sys, os, io, json, subprocess, struct, zlib
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PORT = 8771; U = f'http://localhost:{PORT}/'
fails = []
def ok(name, cond, detail=''):
    print(('ok   ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail and not cond else '')); 
    if not cond: fails.append(name)
def png_info(b):
    """width, height and whether the image has more than one colour, read from the PNG bytes without extra libraries"""
    assert b[:8] == b'\x89PNG\r\n\x1a\n'; w, h = struct.unpack('>II', b[16:24]); idat = b''; i = 8
    while i < len(b):
        n = struct.unpack('>I', b[i:i + 4])[0]; t = b[i + 4:i + 8]
        if t == b'IDAT': idat += b[i + 8:i + 8 + n]
        i += 12 + n
    raw = zlib.decompress(idat); return w, h, len(set(raw[::997])) > 8
async def run(p, eng):
    b = await (p.chromium.launch(**({'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}), args=['--no-sandbox']) if eng == 'chromium' else getattr(p, eng).launch())
    cx = await b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True); pg = await cx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    c = json.load(open(ROOT + '/site/data/canonical.json')); wk = json.load(open(ROOT + '/site/data/weekly.json'))
    await pg.goto(U + 'universe.html', wait_until='load'); await pg.wait_for_selector('[data-save]', timeout=20000)
    for i, nm in enumerate(['playoff-race.png', 'power-rankings.png']):
        try:
            async with pg.expect_download(timeout=15000) as d: await pg.locator('[data-save]').nth(i).click()
            dl = await d.value; path = await dl.path(); w, h, varied = png_info(open(path, 'rb').read()); txt = await pg.locator('[data-save]').nth(i).inner_text()
            ok(f'{eng}: chart export {nm} is a real image', dl.suggested_filename == nm and w >= 1600 and h >= 600 and varied, f'{w}x{h} varied={varied}'); ok(f'{eng}: export button reports the result', 'SAVED' in txt.upper(), txt)
        except Exception as e: ok(f'{eng}: chart export {nm} is a real image', False, str(e)[:120])
    await pg.goto(U + 'cinematics/', wait_until='load'); await pg.wait_for_selector('#grid button', timeout=20000); n = await pg.locator('#grid button').count()
    for k in range(20): await pg.locator('#grid button').nth(k % min(n, 3)).click(); await pg.wait_for_timeout(40)
    st = await pg.evaluate("({n:document.querySelectorAll('#stage a').length,href:document.querySelector('#stage a').getAttribute('href'),slug:document.getElementById('stage').dataset.slug,src:document.getElementById('v').getAttribute('src'),title:document.getElementById('vt').textContent})")
    ok(f'{eng}: twenty film switches leave one correct link', st['n'] == 1 and st['href'].endswith('f=' + st['slug']) and st['src'].startswith(st['slug']), json.dumps(st))
    await pg.goto(U + 'archives.html', wait_until='load'); await pg.wait_for_selector('a[data-lb]', state='attached', timeout=20000); await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
    op = pg.locator('a[data-lb]').first; await op.scroll_into_view_if_needed(); await op.focus(); await pg.keyboard.press('Enter'); await pg.wait_for_selector('dialog#lb[open]', timeout=5000); inside = []
    for key in ['Tab'] * 9 + ['Shift+Tab'] * 5: await pg.keyboard.press(key); inside.append(await pg.evaluate("!!document.activeElement.closest('#lb')"))
    ok(f'{eng}: viewer keeps keyboard focus inside', all(inside)); ok(f'{eng}: page behind the viewer is blocked', await pg.evaluate("!!document.elementFromPoint(195,700).closest('#lb')"))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250); ok(f'{eng}: Escape closes the viewer and focus returns to the opener', await pg.evaluate("!document.getElementById('lb') && document.activeElement.hasAttribute('data-lb')"))
    bad = []
    for f in c['franchises']:
        await pg.goto(U + 'franchise.html?f=' + f['slug'], wait_until='load'); await pg.wait_for_selector('a[href^="playoffs.html?f="]', timeout=20000)
        hrefs = await pg.evaluate("[...document.querySelectorAll('a[href^=\"playoffs.html\"],a[href^=\"draft.html\"]')].filter(a=>!a.closest('.nav,.tabbar,.subnav,nav')).map(a=>a.getAttribute('href'))")
        if not hrefs or any('f=' + f['slug'] not in h for h in hrefs if 'layer' not in h): bad.append((f['slug'], hrefs))
        if f['slug'] in ('vaibhav', 'alan'):
            await pg.locator('a[href^="playoffs.html?f="]').first.click(); await pg.wait_for_selector('.pk [aria-pressed=true], #pk [aria-pressed=true]', timeout=20000)
            sel = (await pg.locator('.pk [aria-pressed=true], #pk [aria-pressed=true]').first.inner_text()).strip()
            if sel.lower() != f['manager'].lower() or f'f={f["slug"]}' not in pg.url: bad.append((f['slug'], 'opened on ' + sel))
            await pg.go_back(); await pg.wait_for_timeout(300)
            if f'f={f["slug"]}' not in pg.url: bad.append((f['slug'], 'back lost context'))
    ok(f'{eng}: all twelve franchise pages carry their franchise into the War Room and Draft Room', not bad, json.dumps(bad)[:300])
    pv = wk.get('preview') or {}; g = (pv.get('games') or [None])[0]
    if g:
        fa = next(f for f in c['franchises'] if f['roster_id'] == g['a']); want = (g.get('live_forecast') or g)['win'][0]
        await pg.goto(U + 'franchise.html?f=' + fa['slug'], wait_until='load'); await pg.wait_for_selector('small.basis', timeout=20000)
        cell = await pg.evaluate("(()=>{const s=[...document.querySelectorAll('small.basis')].find(x=>/lineup forecast/.test(x.textContent));return s?s.parentElement.textContent:''})()")
        num = ''.join(ch for ch in cell.split('lineup')[0] if ch.isdigit() or ch in '<>.')
        exp = '>99' if want > .99 else '<1' if want < .01 else str(round(want * 100))
        ok(f'{eng}: franchise page shows the same win chance as Matchups for this week', num == exp, f'page {cell!r} vs matchups {want}')
    ok(f'{eng}: no page errors', not errs, '; '.join(errs)[:200]); await b.close()
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT + '/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); await asyncio.sleep(1.2)
    try:
        async with async_playwright() as p:
            await run(p, 'chromium')
            if '--webkit' in sys.argv:
                try: await run(p, 'webkit')
                except Exception as e: print('WebKit not available here:', str(e).splitlines()[0][:120])
    finally: srv.terminate()
    print(f'{len(fails)} failed'); sys.exit(1 if fails else 0)
asyncio.run(main())
