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
    cx = await b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True); await cx.route('**/api.sleeper.app/**', lambda r: r.fulfill(status=200, content_type='application/json', body='[]')); pg = await cx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
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
    # ---- player inspector and search ----
    PL = json.load(open(ROOT + '/site/data/player_log.json')); fv = c['franchises'][0]; feat = fv['featured'][0]
    await pg.goto(U + 'franchise.html?f=' + fv['slug'], wait_until='load'); await pg.wait_for_selector('.pl[data-pid]', timeout=20000)
    card = pg.locator(f'.pl[data-pid="{feat["player_id"]}"]').first; await card.focus(); await pg.keyboard.press('Enter'); await pg.wait_for_selector('#pi #pin', timeout=10000)
    rec = PL['players'][str(feat['player_id'])]; want_rank = ' '.join(k + str(v) for k, v in (rec['rk'] or {}).items())
    ok(f'{eng}: a player card opens the inspector from the keyboard with that player', (await pg.inner_text('#pin')).strip().lower() == rec['n'].lower())
    ok(f'{eng}: inspector rank equals the rank snapshot and the card', (await pg.inner_text('.pi-rk')).strip() == want_rank and (not feat.get('rank') or feat['rank'] in want_rank), f"{await pg.inner_text('.pi-rk')!r} vs {want_rank!r} / card {feat.get('rank')}")
    ok(f'{eng}: inspector states its rank definition and data time', await pg.locator('.pi-what summary').count() == 1 and 'through week' in (await pg.inner_text('.pi-top')).lower() and 'built' in (await pg.inner_text('.pi-src')).lower())
    ok(f'{eng}: inspector is linkable (#player= in the address)', pg.url.endswith('#player=' + str(feat['player_id'])))
    ok(f'{eng}: inspector fits a 390px screen', await pg.evaluate("document.querySelector('.pi-in').scrollWidth<=document.querySelector('.pi-in').clientWidth+1"))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
    ok(f'{eng}: Escape closes the inspector, restores the address and returns focus to the card', await pg.locator('#pi').count() == 0 and '#player' not in pg.url and await pg.evaluate(f"document.activeElement.dataset.pid==='{feat['player_id']}'"))
    await card.click(); await pg.wait_for_selector('#pi #pin'); await pg.go_back(); await pg.wait_for_timeout(300)
    ok(f'{eng}: Back closes the inspector and stays on the page', await pg.locator('#pi').count() == 0 and 'franchise.html' in pg.url)
    await pg.goto(U + 'week.html#player=' + str(feat['player_id']), wait_until='load'); await pg.wait_for_selector('#pi #pin', timeout=10000)
    ok(f'{eng}: a shared player link opens the same player', (await pg.inner_text('#pin')).strip().lower() == rec['n'].lower()); await pg.keyboard.press('Escape')
    old = next(((f, n) for f in c['franchises'] for n in (f.get('former_names') or [])), None)
    await pg.locator('[data-search]:visible').first.click(); await pg.wait_for_selector('#srq')
    if old:
        await pg.fill('#srq', old[1]); await pg.wait_for_timeout(250); txt = await pg.inner_text('#srr')
        ok(f'{eng}: search finds a franchise by a former name and says so', old[0]['team_name'].lower() in txt.lower() and 'former name' in txt, txt[:160])
    await pg.fill('#srq', rec['n'].split()[-1]); await pg.wait_for_timeout(250)
    ok(f'{eng}: search lists players under their own heading', 'PLAYERS' in (await pg.inner_text('#srr')).upper() and await pg.locator(f'#srr [data-open="{feat["player_id"]}"]').count() == 1)
    await pg.locator(f'#srr [data-open="{feat["player_id"]}"]').click(); await pg.wait_for_selector('#pi #pin')
    ok(f'{eng}: choosing a search result opens the inspector', (await pg.inner_text('#pin')).strip().lower() == rec['n'].lower()); await pg.keyboard.press('Escape')
    aw = next((w for w in sorted(wk.get('awards', {}), key=int) if int(w) < PL['through_week']), None)
    if aw:
        await pg.goto(U + f'week.html?w={aw}', wait_until='load'); await pg.wait_for_timeout(1500); chip = pg.locator(f'[data-pid][data-pweek="{aw}"]')
        if await chip.count():
            await chip.first.click(); await pg.wait_for_selector('#pi #pin')
            ok(f'{eng}: opened from a past week, the inspector separates that week from current information', await pg.locator('.pi-hist').count() == 1 and f'Week {aw}' in await pg.inner_text('.pi-hist')); await pg.keyboard.press('Escape')
    # ---- game-day scores: simulated Sleeper responses, so this does not depend on real games ----
    if g and c.get('week_in_progress'):
        def body(bump):
            out = []
            for gm in pv['games']:
                for k, l in (('a', 'lineup_a'), ('b', 'lineup_b')):
                    ps = [x for x in gm[l] if not x.get('empty')]; pp = {x['player_id']: (x.get('live') or 0) for x in ps}
                    if gm is g and k == 'a' and ps: pp[ps[0]['player_id']] += bump
                    out.append({'roster_id': gm[k], 'points': round(sum(pp.values()), 2), 'starters': [x['player_id'] for x in ps], 'players_points': pp})
            return json.dumps(out)
        JS = "fetch('data/weekly.json').then(r=>r.json()).then(async w=>{const c=(await loadAll())[0];const f=(w)=>JSON.stringify(w.preview.games.map(g=>[g.live.map(x=>Math.round(x*100)/100),g.live_forecast&&[g.live_forecast.expected,g.live_forecast.win]]));const b=f(w);await overlayLive(c,w);return [b,f(w),w.preview.games[0].live[0]]})"
        for bump, label in ((0, 'same'), (7.5, 'more')):
            cx2 = await b.new_context(viewport={'width': 390, 'height': 844}); st = {'n': 0}
            async def h(route, request, bump=bump, st=st): st['n'] += 1; await route.fulfill(status=200, content_type='application/json', body=body(bump))
            await cx2.route('**/api.sleeper.app/**', h); p2 = await cx2.new_page(); await p2.goto(U + 'week.html', wait_until='load'); await p2.wait_for_selector('#livebar', timeout=20000)
            r = await p2.evaluate(JS)
            if not bump: ok(f'{eng}: with unchanged scores the browser reproduces the build exactly (scores, expectation, win chance)', r[0] == r[1], f'{r[0][:120]} vs {r[1][:120]}')
            else:
                ok(f'{eng}: new Sleeper scores replace built scores on the page', abs(r[2] - (g['live'][0] + bump)) < 0.02 and f"{g['live'][0] + bump:.2f}" in await p2.inner_text('body'), str(r[2]))
                ok(f'{eng}: the score bar names the source and time', 'Sleeper' in await p2.inner_text('#livebar'))
            await cx2.close()
        await pg.goto(U + 'week.html', wait_until='load'); await pg.wait_for_selector('#livebar', timeout=20000)
        ok(f'{eng}: when Sleeper cannot be reached the page keeps the built scores and says so', 'unavailable' in await pg.inner_text('#livebar') and f"{g['live'][0]:.2f}" in await pg.inner_text('body'))
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
