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
        exp = '>99' if want > .995 else '<1' if want < .005 else str(round(want * 100))   # the page's own rounding rule
        ok(f'{eng}: franchise page shows the same win chance as Matchups for this week', num == exp, f'page {cell!r} vs matchups {want}')
    # ---- rooting guide and scenario compare ----
    L_ = json.load(open(ROOT + '/site/data/league.json')); gms = L_['schedule'].get(str(L_['current_week'])) or []
    if gms:
        me = c['franchises'][0]; await pg.goto(U + 'playoffs.html?f=' + me['slug'], wait_until='load'); await pg.wait_for_selector('#R .rg-g', timeout=60000)
        others = [x for x in gms if me['roster_id'] not in x]
        ok(f'{eng}: rooting guide lists every other game this week', await pg.locator('#R .rg-g').count() == len(others))
        rows = await pg.evaluate("[...document.querySelectorAll('#R .rg-g')].map(g=>{const p=[...g.querySelectorAll('.rg-p')].map(x=>parseFloat(x.textContent.replace(/[<>%]/g,''))),y=[...g.querySelectorAll('.rg-o')].map(x=>x.classList.contains('yes'));return {p,y,none:g.classList.contains('none')}})")
        ok(f'{eng}: each rooting verdict matches its own bars (higher chance is the side marked; small gaps show no preference)', all((r['none'] and not any(r['y'])) or (not r['none'] and r['y'][0] == (r['p'][0] >= r['p'][1]) and sum(r['y']) == 1) for r in rows), json.dumps(rows)[:300])
        ok(f'{eng}: rooting guide is labelled simulated and states its basis', 'SIMULATED' in (await pg.inner_text('#R')).upper() and 'same 4,000' in await pg.inner_text('#R'))
        await pg.locator('#R .rg-o').first.click(); await pg.wait_for_timeout(500)
        ok(f'{eng}: tapping a rooting result fixes it in the scenario and the page says hypothetical', 'HYPOTHETICAL' in (await pg.inner_text('#state')).upper() and await pg.locator('#R .rg-g').count() == len(others) - 1)
        await pg.locator('#R [data-sv=A]').click(); await pg.wait_for_timeout(300); await pg.locator('#rs2').click(); await pg.wait_for_timeout(400)
        ok(f'{eng}: a saved scenario stays in the comparison after the live scenario is reset', await pg.locator('#compare .cmp').count() >= 1 and await pg.locator('#compare [data-ld=A]').count() == 1 and await pg.locator('#state .sb').count() == 0)
        ok(f'{eng}: rooting guide and comparison fit a 390px screen', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        await pg.locator('#compare [data-cl=A]').click()
    # ---- one franchise choice across every page ----
    pick = c['franchises'][3]; await pg.goto(U + 'draft.html', wait_until='load'); await pg.wait_for_selector('#pk .pk button', timeout=20000)
    await pg.locator(f'#pk .pk button[data-fid="{pick["roster_id"]}"]').click(); await pg.wait_for_timeout(300); bad = []
    for page, box in (('index.html', '#fbm'), ('week.html', '#fbw'), ('playoffs.html', '#pk'), ('draft.html', '#pk'), ('franchise.html', '#fb'), ('rivalry.html', '#fb'), ('universe.html', '#fc'), ('timeline.html', '#mef')):
        await pg.goto(U + page, wait_until='load')
        try: await pg.wait_for_selector(box + ' .pk [aria-pressed=true]', timeout=20000)
        except Exception: bad.append(page + ' (no picker)'); continue
        got = (await pg.locator(box + ' .pk [aria-pressed=true]').first.inner_text()).strip()
        if got != pick['manager']: bad.append(f'{page} shows {got}')
        if await pg.locator(box + ' .pk button svg').count() != 12: bad.append(page + ' (crests missing)')
    ok(f'{eng}: a franchise picked on one page is selected on every other page, in the same picker with crests', not bad, '; '.join(bad))
    await pg.goto(U + 'rivalry.html?a=' + c['franchises'][0]['slug'] + '&b=' + c['franchises'][1]['slug'], wait_until='load'); await pg.wait_for_selector('#card', timeout=20000); await pg.wait_for_timeout(1500)
    ok(f'{eng}: the rivalry card paints at full width with content to the bottom edge', await pg.evaluate("(()=>{const cv=document.getElementById('card'),x=cv.getContext('2d');if(cv.width!==1080||cv.height<1200)return false;const d=x.getImageData(540,cv.height-6,1,1).data,t=x.getImageData(540,66,1,1).data;return d[3]===255&&(d[0]+d[1]+d[2])>60&&t[3]===255})()"))
    # ---- Teams tab: its own page, shown as selected; with a remembered franchise it opens that franchise ----
    await pg.evaluate("localStorage.removeItem('nyc.team')"); await pg.goto(U + 'index.html', wait_until='load'); await pg.wait_for_selector('.tabbar a', timeout=20000)
    await pg.locator('.tabbar a', has_text='Teams').click(); await pg.wait_for_selector('#grid a.card', timeout=20000)
    ok(f'{eng}: with no franchise chosen, Teams opens its own page with all twelve and the tab shows as selected', 'teams.html' in pg.url and await pg.locator('#grid a.card').count() == 12 and (await pg.locator('.tabbar a[aria-current=page]').inner_text()).strip() == 'Teams')
    await pg.locator('#pk .pk button[data-fid="%d"]' % c['franchises'][2]['roster_id']).click(); await pg.wait_for_selector('#hero .id h1', timeout=20000)
    await pg.goto(U + 'index.html', wait_until='load'); await pg.wait_for_selector('.tabbar a'); await pg.locator('.tabbar a', has_text='Teams').click(); await pg.wait_for_selector('#hero .id h1', timeout=20000)
    ok(f'{eng}: with a franchise chosen, Teams opens that franchise and the tab shows as selected', ('f=' + c['franchises'][2]['slug']) in pg.url and (await pg.locator('.tabbar a[aria-current=page]').inner_text()).strip() == 'Teams')
    await pg.goto(U + 'index.html', wait_until='load'); await pg.wait_for_selector('#thisweek .sb2', timeout=20000); await pg.wait_for_timeout(600)
    ok(f'{eng}: Pulse draws its masthead, a scoreboard row for every franchise with crest and score, and the twelve', await pg.locator('.top.mast').count() == 1 and await pg.locator('#thisweek .sbr svg').count() == 12 and await pg.locator('#grid a svg').count() == 12 and 'could not be loaded' not in await pg.inner_text('body'))
    # ---- team tags and patches (approved original set) ----
    BD = json.load(open(ROOT + '/src/nfl-badges/badges.json')); appjs = open(ROOT + '/site/assets/app.js').read()
    ok(f'{eng}: all 32 teams have a badge and the site copy matches the approved set', len(BD) == 32 and all(json.dumps(v['emblem'])[1:-1] in appjs for v in BD.values()))
    await pg.goto(U + 'franchise.html?f=' + c['franchises'][0]['slug'], wait_until='load'); await pg.wait_for_selector('.pl .nb', timeout=20000); await pg.wait_for_timeout(800)
    tg = await pg.evaluate("(()=>{const e=document.querySelector('.pl .nb');return [e.textContent.trim(),getComputedStyle(e).fontFamily.split(',')[0].replace(/[\"']/g,''),e.querySelector('svg,img')?1:0]})()")
    ok(f'{eng}: beside a player name the tag is the abbreviation alone, in that team\'s typeface', tg[0] in BD and tg[1] == BD[tg[0]]['font'] and tg[2] == 0, str(tg))
    await pg.locator('.pl[data-pid]').first.click(); await pg.wait_for_selector('#pi .np svg', timeout=10000)
    ok(f'{eng}: the player panel shows the large patch with its emblem and a text name for screen readers', await pg.locator('#pi .np svg').count() == 1 and bool(await pg.get_attribute('#pi .np', 'aria-label'))); await pg.keyboard.press('Escape')
    # ---- pick history ----
    PC = c.get('pick_chains') or {}; cur = {f"{pk['season']}-{pk['round']}-{pk['original_roster']}": f['roster_id'] for f in c['franchises'] for pk in f['future_picks']}
    ok(f'{eng}: every future pick has a chain that ends at its current holder', set(PC) == set(cur) and all(PC[k]['holder'] == cur[k] and (PC[k]['steps'][-1]['to'] if PC[k]['steps'] else PC[k]['original']) == cur[k] for k in PC if PC[k]['complete']))
    ok(f'{eng}: a chain marked complete is unbroken from the original owner', all(not ch['complete'] or all(st['from'] == (ch['steps'][i - 1]['to'] if i else ch['original']) for i, st in enumerate(ch['steps'])) for ch in PC.values()))
    long = max(PC, key=lambda k: len(PC[k]['steps'])) if PC else None
    if long and PC[long]['steps']:
        await pg.goto(U + 'draft.html', wait_until='load'); await pg.wait_for_selector('[data-yr]', timeout=20000); await pg.locator(f'[data-yr="{PC[long]["season"]}"]').click(); await pg.wait_for_selector(f'[data-chain="{long}"]')
        await pg.locator(f'[data-chain="{long}"]').first.click(); await pg.wait_for_selector('#pc #pch', timeout=10000); await pg.wait_for_timeout(300)
        byR = {f['roster_id']: f['manager'] for f in c['franchises']}; txt = await pg.inner_text('#pc')
        ok(f'{eng}: pick history shows every trade step, the holder and its source', await pg.locator('#pc .pc-chain li:not(.end)').count() == len(PC[long]['steps']) and byR[PC[long]['holder']] in txt and 'Sleeper trade records' in txt and 'draft.html' in pg.url, txt[:200])
        ok(f'{eng}: pick history fits a 390px screen', await pg.evaluate("document.querySelector('#pc .pi-in').scrollWidth<=document.querySelector('#pc .pi-in').clientWidth+1"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200); ok(f'{eng}: Escape closes pick history and returns focus to the pick', await pg.locator('#pc').count() == 0 and await pg.evaluate(f"document.activeElement.dataset.chain==='{long}'"))
    never = next((k for k in PC if not PC[k]['steps']), None)
    if never:
        await pg.goto(U + 'franchise.html?f=' + next(f['slug'] for f in c['franchises'] if f['roster_id'] == PC[never]['holder']), wait_until='load'); await pg.wait_for_selector(f'[data-chain="{never}"]', timeout=20000); await pg.locator(f'[data-chain="{never}"]').first.click(); await pg.wait_for_selector('#pc #pch')
        ok(f'{eng}: an untraded pick says so instead of showing an empty chain', 'never traded' in (await pg.inner_text('#pc')).lower()); await pg.keyboard.press('Escape')
    # ---- since your last visit (simulated earlier visit; nothing depends on the clock of a real visit) ----
    me0 = c['franchises'][0]; await pg.evaluate("localStorage.removeItem('nyc.seen')"); await pg.goto(U + 'index.html?f=' + me0['slug'], wait_until='load'); await pg.wait_for_selector('#mine .mine', timeout=20000); await pg.wait_for_timeout(400)
    ok(f'{eng}: a first visit shows no since-your-last-visit list', await pg.inner_html('#since') == '')
    seen = json.loads(await pg.evaluate("localStorage.getItem('nyc.seen')")); old = dict(seen['cur']); old['at'] -= 5 * 86400000; old['week'] -= 1
    await pg.evaluate("s=>localStorage.setItem('nyc.seen',s)", json.dumps({'prev': None, 'cur': old})); await pg.reload(wait_until='load'); await pg.wait_for_selector('#since .since', timeout=20000)
    res = next(r for r in me0['results'] if r['week'] == c['through_week']); txt = await pg.inner_text('#since')
    ok(f'{eng}: a return visit lists the week that finished, with that franchise\'s real result', f"Week {c['through_week']} is final" in txt and f"{res['pf']:.2f}" in txt and f"{res['pa']:.2f}" in txt and 'this device only' in txt, txt[:200])
    ok(f'{eng}: unchanged standings and odds are not reported as changes', 'moved from' not in txt and 'playoff chance went' not in txt, txt[:300])
    await pg.click('#sdis'); await pg.reload(wait_until='load'); await pg.wait_for_selector('#mine .mine'); await pg.wait_for_timeout(400)
    ok(f'{eng}: dismissing the list keeps it dismissed', await pg.inner_html('#since') == '')
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
    broke = []
    for page in ('', 'week.html', 'franchise.html?f=' + fv['slug'], 'playoffs.html', 'draft.html', 'rivalry.html', 'universe.html', 'timeline.html', 'archives.html'):
        await pg.goto(U + page + '#player=' + str(feat['player_id']), wait_until='load'); 
        try: await pg.wait_for_selector('#pi #pin', timeout=10000)
        except Exception: broke.append(page + ' (no panel)'); continue
        await pg.wait_for_timeout(600)
        if 'could not be loaded' in await pg.inner_text('body'): broke.append(page + ' (page failed behind the panel)')
        await pg.keyboard.press('Escape')
    ok(f'{eng}: a player link works on every page and the page behind it still loads', not broke, '; '.join(broke))
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
        # these checks compare the page with the built data, so the page's clock is held at build time (game states otherwise advance by the clock)
        import datetime; FREEZE = 'Date.now=()=>%d' % int(datetime.datetime.fromisoformat(c['generated_at'].replace('Z', '+00:00')).timestamp() * 1000)
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
            cx2 = await b.new_context(viewport={'width': 390, 'height': 844}); st = {'n': 0}; await cx2.add_init_script(FREEZE)
            async def h(route, request, bump=bump, st=st): st['n'] += 1; await route.fulfill(status=200, content_type='application/json', body=body(bump))
            await cx2.route('**/api.sleeper.app/**', h); p2 = await cx2.new_page(); await p2.goto(U + 'week.html', wait_until='load'); await p2.wait_for_selector('#livebar', timeout=20000)
            r = await p2.evaluate(JS)
            if not bump: ok(f'{eng}: with unchanged scores the browser reproduces the build exactly (scores, expectation, win chance)', r[0] == r[1], f'{r[0][:120]} vs {r[1][:120]}')
            else:
                ok(f'{eng}: new Sleeper scores replace built scores on the page', abs(r[2] - (g['live'][0] + bump)) < 0.02 and f"{g['live'][0] + bump:.2f}" in await p2.inner_text('body'), str(r[2]))
                ok(f'{eng}: the score bar names the source and time', 'Sleeper' in await p2.inner_text('#livebar'))
            await cx2.close()
        # ---- game-day view ----
        cx3 = await b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True); st3 = {'bump': 0}
        async def h3(route, request, st3=st3): await route.fulfill(status=200, content_type='application/json', body=body(st3['bump']))
        await cx3.add_init_script(FREEZE); await cx3.route('**/api.sleeper.app/**', h3); p3 = await cx3.new_page(); e3 = []; p3.on('pageerror', lambda e: e3.append(str(e)))
        await p3.goto(U + 'week.html#m0', wait_until='load'); await p3.wait_for_selector('#gd0 .gd-top', timeout=20000); await p3.wait_for_timeout(300)
        lf = g.get('live_forecast') or {}; exp = lf.get('expected') or g['projected']; num = lambda sel: p3.evaluate(f"parseFloat(document.querySelector('{sel}').firstChild.textContent)")
        ok(f'{eng}: game-day strip shows the same scored and expected totals as the data', abs(await num('#gd0 [data-v=sa]') - g['live'][0]) < .006 and abs(await num('#gd0 [data-v=sb]') - g['live'][1]) < .006 and abs(await num('#gd0 [data-v=ea]') - exp[0]) < .006 and abs(await num('#gd0 [data-v=eb]') - exp[1]) < .006)
        cntA = {s_: sum(1 for x in g['lineup_a'] if not x.get('empty') and x.get('game_state') == s_) for s_ in ('upcoming', 'live', 'final')}; remtxt = await p3.inner_text('#gd0 .gd-r.rem .a')
        ok(f'{eng}: players-remaining counts match the lineup states and show projected points, not just a count', remtxt.startswith(str(cntA['upcoming']) + ' to play') and f"{cntA['final']} done" in remtxt and 'projected' in remtxt, remtxt)
        ok(f'{eng}: expected final and win chance are labelled as estimates', 'estimate' in (await p3.inner_text('#gd0 .gd-top')).lower() and 'estimates' in (await p3.inner_text('#gd0 .gd-lead')).lower())
        await p3.locator('#gdt0-timeline').focus(); await p3.keyboard.press('ArrowRight'); await p3.wait_for_timeout(150)
        ok(f'{eng}: game-day tabs work from the keyboard', await p3.get_attribute('#gdt0-lineups', 'aria-selected') == 'true' and await p3.evaluate("document.activeElement.id") == 'gdt0-lineups')
        await p3.click('#gd0 [data-gdfs=final]'); await p3.wait_for_timeout(150); allfin = sum(1 for l in ('lineup_a', 'lineup_b') for x in g[l] if not x.get('empty') and x.get('game_state') == 'final')
        ok(f'{eng}: the lineup filter shows exactly the players in that state', await p3.locator('#gd0 .gd-l').count() == allfin)
        await p3.evaluate("window.__same=1;scrollTo(0,document.getElementById('gd0').getBoundingClientRect().top+scrollY+120)"); y0 = await p3.evaluate('scrollY'); await p3.locator('#gd0 [data-gdfs=final]').focus()
        st3['bump'] = 7.5; await p3.evaluate('window._liveCheck()'); await p3.wait_for_timeout(500); new = g['live'][0] + 7.5
        ok(f'{eng}: a score update arrives without reloading, scrolling or moving focus', await p3.evaluate('window.__same') == 1 and abs(await p3.evaluate('scrollY') - y0) <= 1 and await p3.evaluate("document.activeElement.dataset.gdfs") == 'final')
        ok(f'{eng}: after an update the strip, the summary chip and the expected total agree', abs(await num('#gd0 [data-v=sa]') - new) < .006 and f'{new:.2f}' in await p3.inner_text('#lv0') and abs(await num('#gd0 [data-v=ea]') - float((await p3.inner_text('#mid0 .pp i')))) < .006)
        ok(f'{eng}: a table being read is not re-sorted under the reader; an Update control is offered', await p3.locator('#gd0 .gd-pend [data-gdapply]').count() == 1)
        await p3.click('#gd0 [data-gdapply]'); st3['bump'] = 6.0; await p3.evaluate('window._liveCheck()'); await p3.wait_for_timeout(500); await p3.click('#gdt0-timeline'); await p3.wait_for_timeout(200); lg = await p3.inner_text('#gd0 .gd-log')
        ok(f'{eng}: the update log records changes in totals, and a drop is called a stat correction, not a play', '+7.50' in lg and '−1.50' in lg and 'stat correction' in lg and 'not plays' in await p3.inner_text('#gd0 .gd-body'), lg[:200])
        ok(f'{eng}: game-day opens on Timeline, with Lineups second and no Overview tab', [t.strip().lower() for t in await p3.locator('#gd0 [role=tab]').all_inner_texts()] == ['timeline', 'lineups'])
        try:
            async with p3.expect_download(timeout=30000) as d1: await p3.click('#m0 [data-dlposter]')
            f1 = await (await d1.value).path()
            async with p3.expect_download(timeout=30000) as d2: await p3.click('#m0 [data-dlrival]')
            f2 = await (await d2.value).path(); import struct
            dims = [struct.unpack('>II', open(f, 'rb').read(24)[16:24]) for f in (f1, f2)]
            ok(f'{eng}: the matchup image and the rivalry card both download from inside a matchup as real PNGs', dims[0][0] >= 1080 and dims[1][0] == 1080 and dims[1][1] >= 1200, str(dims))
        except Exception as e: ok(f'{eng}: the matchup image and the rivalry card both download from inside a matchup as real PNGs', False, str(e)[:160])
        wi = next((k for k, x in enumerate(g['timeline']['windows']) if x['state'] != 'upcoming' and (x['a']['players'] or x['b']['players'])), None)
        if wi is not None:
            await p3.locator(f'#gd0 [data-tw="{wi}"]').click(); await p3.wait_for_timeout(200); rows = await p3.locator('#gd0 .tlp .pr2 .pv').all_inner_texts()
            ok(f'{eng}: in a window that has started, every player shows points scored and the projection', bool(rows) and all('proj' in r and r.strip()[0].isdigit() for r in rows), str(rows[:3]))
        await p3.click('#gd0 [data-gdfollow]'); await p3.wait_for_timeout(200)
        ok(f'{eng}: Follow keeps the matchup at the top with the same score', await p3.locator('#fol a.fol').count() == 1 and f'{g["live"][0] + 6:.2f}' in await p3.inner_text('#fol'))
        ok(f'{eng}: game-day view fits a 390px screen with no page errors', await p3.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and not e3, '; '.join(e3)[:200]); await cx3.close()
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
