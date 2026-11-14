#!/usr/bin/env python3
"""Season documentary, second edition: a week-by-week cut on a bar grid, built only from the site's data files.
It re-cuts itself from whatever the data says today, so the same command produces next week's film next week.

  python3 scripts/build_documentary2.py plan            # print the shot list
  python3 scripts/build_documentary2.py stills [t ...]  # test frames into build/stills
  python3 scripts/build_documentary2.py render          # site/documentary/season-<year>-v2.mp4 (+ .jpg, .json)
  python3 scripts/build_documentary2.py audio | part i k | finish k   # the same, in pieces, for sessions with a command time limit

Output sits beside the first edition (season-<year>.mp4), which this script never touches.
"""
import sys, os, json, base64, asyncio, subprocess, importlib.util
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); E = ROOT + '/src/engine'; B = ROOT + '/build/doc2'; OUT = ROOT + '/site/documentary'
BPM = 140; BEAT = 60.0 / BPM; BAR = BEAT * 4
J = lambda p: json.load(open(p)); up = lambda s: str(s).strip().upper()
KIND = {'swing': ('RACE SWING', '#57e39a'), 'thriller': ('THRILLER', '#ffd24a'), 'upset': ('UPSET', '#c79bff'), 'record': ('SEASON HIGH', '#ff9a3c'), 'rout': ('ROUT', '#ff6b6b'), 'high': ('TOP SCORE', '#6fb6ff')}


def plan():
    c = J(ROOT + '/site/data/canonical.json'); L = J(ROOT + '/site/data/league.json'); WK = J(ROOT + '/site/data/weekly.json'); H = J(ROOT + '/site/data/history.json')
    sp = J(ROOT + '/site/data/sleeper/players.json'); F = {f['roster_id']: f for f in c['franchises']}; S = [F[i] for i in c['standings']]; W = c['through_week']; ranks = c.get('player_ranks', {})
    mgr = lambda i: up(F[i]['manager']); th = lambda i: F[i]['theme']
    def jer(pid, name, tm):
        p = sp.get(str(pid)) or {}; return {'l': up(p.get('last_name') or name.split(' ')[-1]), 'num': '' if p.get('number') is None else str(p['number']), 'tm': tm or 'FA', 'name': up(name), 'rank': ranks.get(str(pid), ''), 'pos': p.get('position', '')}
    shots = []; bars = 0
    def add(nb, **k): nonlocal bars; shots.append(dict(t0=round(bars * BAR, 4), dur=round(nb * BAR, 4), bars=nb, **k)); bars += nb
    games = sum(len(L['weeks'][str(w)]['games']) for w in range(1, W + 1))
    add(4, type='open', theme='city', dim=.5, teams=[{'theme': f['theme']} for f in S], sub=f"{c['season']}   ·   THROUGH WEEK {W}", line=f"{W} WEEKS.   {games} GAMES.   {S[0]['record'].replace('–', '-')} AT THE TOP.")
    pre = H.get('preseason'); labels = (['PRE'] if pre else []) + [f'W{w}' for w in range(1, W + 1)]
    lines = [{'theme': f['theme'], 'name': up(f['manager']), 'top': f['seed'] <= c['playoff_teams'], 'v': ([pre['odds'][str(f['roster_id'])]['playoff']] if pre else []) + [H['weeks'][str(w)]['odds'][str(f['roster_id'])]['playoff'] for w in range(1, W + 1)]} for f in S]
    add(6, type='race', theme='city', dim=.72, labels=labels, lines=lines, note='PLAYOFF CHANCE, PRESEASON TO WEEK %d' % W if pre else 'PLAYOFF CHANCE BY WEEK')
    wb = 3 if W <= 9 else 2
    for e in WK['season_story']:
        w = e['week']; gs = L['weeks'][str(w)]['games']; rs = e['rosters']
        g = next((x for x in gs if len(rs) > 1 and {x['a'], x['b']} == set(rs[:2])), None) or next(x for x in gs if rs[0] in (x['a'], x['b']))
        win = g['a'] if g['pa'] > g['pb'] else g['b']; aw = next((a for a in WK['awards'][str(w)]['list'] if a['key'] == 'mvp'), None); sw = e.get('swing')
        mvp = None
        if aw:
            p = aw['players'][0]; mvp = dict(jer(p['player_id'], p['name'], p['nfl_team']), pts=p['points'])
        side = lambda i, s: {'theme': th(i), 'name': mgr(i), 'team': up(F[i]['team_name']), 's': s}
        add(wb, type='week', theme=th(win), week=w, kind=KIND[e['kind']][0], col=KIND[e['kind']][1], head=up(e['head']), a=side(g['a'], g['pa']), b=side(g['b'], g['pb']), mvp=mvp,
            swing={'name': mgr(sw['roster_id']), 'from': sw['from'], 'to': sw['to']} if sw else None)
    tops = WK['season_highlights'].get('top_starters', [])[:5]
    add(5, type='stars', theme=th(tops[0]['roster_id']) if tops else 'city', dim=.66, players=[dict(jer(p['player_id'], p['name'], p['nfl_team']), pts=p['points'], mgr=mgr(p['roster_id'])) for p in tops])
    add(5, type='table', theme=S[0]['theme'], dim=.7, cut=c['playoff_teams'], rows=[{'theme': f['theme'], 'name': up(f['manager']), 'team': up(f['team_name']), 'rec': f['record'].replace('–', '-'), 'pf': f['pf'], 'odds': H['weeks'][str(W)]['odds'][str(f['roster_id'])]['playoff']} for f in S])
    left = c['playoff_week_start'] - 1 - W
    add(4, type='close', theme='city', dim=.55, teams=[{'theme': f['theme']} for f in S], big=f"{left} WEEK{'S' if left != 1 else ''} LEFT" if left > 0 else 'THE PLAYOFFS ARE HERE', sub=f"PLAYOFFS BEGIN WEEK {c['playoff_week_start']}", foot=f"NYC DYNASTY LEAGUE   ·   {c['season']}")
    dur = round(bars * BAR * 30) / 30
    sect = []; b = 0
    for s in shots:
        kind = {'open': 'intro', 'race': 'light', 'week': 'full', 'stars': 'break', 'table': 'full', 'close': 'outro'}[s['type']]
        if sect and sect[-1][2] == kind: sect[-1] = (sect[-1][0], sect[-1][1] + s['bars'], kind)
        else: sect.append((b, s['bars'], kind))
        b += s['bars']
    return {'dur': dur, 'beat': BEAT, 'bar': BAR, 'weeks': W, 'season': c['season'], 'through_week': W, 'titles': {f['theme']: len(f['titles']) for f in c['franchises']}, 'shots': shots, 'sections': sect,
            'hits': [s['t0'] for s in shots[1:]] + [BAR * 2]}


def html(doc, audio=None):
    s = open(E + '/shell.html').read().replace('/*FONTS*/', open(E + '/fonts.css').read()).replace('/*CORE*/', open(E + '/core.js').read()).replace('/*THEMES*/', open(E + '/themes.js').read() + '\nconst DOC2=' + json.dumps(doc) + ';\n' + open(E + '/doc2.js').read())
    s = s.replace('/*TITLE*/', 'Season documentary, second edition').replace('/*CFG*/', json.dumps({'theme': 'city', 'team': '', 'manager': '', 'sub': '', 'lines': [], 'players': [{}], 'titles': doc['titles']})).replace('/*AUDIO*/', 'data:audio/mp4;base64,' + base64.b64encode(open(audio, 'rb').read()).decode() if audio else '')
    os.makedirs(B, exist_ok=True); open(B + '/doc.html', 'w').write(s)


async def frames(doc, times=None, fps=30, part=None):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}), args=['--no-sandbox']); pg = await b.new_page(viewport={'width': 1300, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + B + '/doc.html'); await pg.evaluate('window.__ready')
        if times:
            os.makedirs(ROOT + '/build/stills', exist_ok=True)
            for tm in times: d = await pg.evaluate(f'window.__frame({tm},0.8)'); open(f"{ROOT}/build/stills/doc2_{tm:06.2f}.jpg", 'wb').write(base64.b64decode(d.split(',')[1]))
        else:
            n = int(doc['dur'] * fps); a, b_, tag = (0, n, '') if not part else (n * part[0] // part[1], n * (part[0] + 1) // part[1], f'.part{part[0]}')
            ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '22', '-preset', 'medium', '-pix_fmt', 'yuv420p', B + f'/doc.video{tag}.mp4'], stdin=subprocess.PIPE)
            for i in range(a, b_): d = await pg.evaluate(f'window.__frame({i / fps},0.9)'); ff.stdin.write(base64.b64decode(d.split(',')[1]))
            ff.stdin.close(); assert ff.wait() == 0
            if not part or part[0] == 0: d = await pg.evaluate(f'window.__frame({doc["bar"] * 3.4},0.9)'); open(B + '/doc.poster.jpg', 'wb').write(base64.b64decode(d.split(',')[1]))
        await b.close(); print('page errors', errs[:3]); return not errs


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'plan'; doc = plan()
    if cmd == 'plan':
        for s in doc['shots']: print(f"[{s['t0']:6.2f}s +{s['dur']:5.2f}s] {s['type']:6} {s['theme']:12} " + (f"WEEK {s['week']} {s['kind']}: {s['head']} | {s['a']['name']} {s['a']['s']} v {s['b']['name']} {s['b']['s']} | MVP {s['mvp'] and s['mvp']['name']} {s['mvp'] and s['mvp']['rank']} | {s['swing']}" if s['type'] == 'week' else s.get('big') or s.get('line') or s.get('note') or ', '.join(p['name'] + ' ' + p['rank'] for p in s.get('players', [])) or ''))
        print('total', doc['dur'], 's;', 'sections', doc['sections'])
    elif cmd == 'stills':
        html(doc); assert asyncio.run(frames(doc, times=[float(a) for a in sys.argv[2:]] or [s['t0'] + s['dur'] * .8 for s in doc['shots']]))
    elif cmd in ('render', 'audio', 'part', 'finish'):
        spec = importlib.util.spec_from_file_location('s2', E + '/score2.py'); a = importlib.util.module_from_spec(spec); spec.loader.exec_module(a); os.makedirs(B, exist_ok=True); os.makedirs(OUT, exist_ok=True)
        if cmd in ('render', 'audio'):
            a.score2(B + '/doc.wav', doc['dur'], BPM, doc['sections'], doc['hits'], seed=26)
            subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', B + '/doc.wav', '-c:a', 'aac', '-b:a', '160k', B + '/doc.m4a']); html(doc, B + '/doc.m4a')
        if cmd == 'audio': sys.exit(0)
        if cmd == 'render': assert asyncio.run(frames(doc))
        if cmd == 'part': assert asyncio.run(frames(doc, part=(int(sys.argv[2]), int(sys.argv[3])))); print('part done', sys.argv[2], flush=True); sys.exit(0)
        if cmd == 'finish':
            k = int(sys.argv[2]); open(B + '/parts.txt', 'w').write(''.join(f"file 'doc.video.part{i}.mp4'\n" for i in range(k)))
            subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', B + '/parts.txt', '-c', 'copy', B + '/doc.video.mp4'])
        name = f"season-{doc['season']}-v2"
        subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', B + '/doc.video.mp4', '-i', B + '/doc.m4a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', f"{OUT}/{name}.mp4"])
        subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', B + '/doc.poster.jpg', '-vf', 'scale=960:-2', '-q:v', '4', f"{OUT}/{name}.jpg"])
        json.dump({'season': doc['season'], 'through_week': doc['through_week'], 'duration': doc['dur'], 'edition': 2, 'chapters': [{'start': s['t0'], 'title': 'Week %d' % s['week'] if s['type'] == 'week' else {'open': 'Cold open', 'race': 'The race', 'stars': 'The stars', 'table': 'The line', 'close': 'What is left'}[s['type']]} for s in doc['shots']]}, open(f"{OUT}/{name}.json", 'w'), indent=1)
        print('rendered', name, os.path.getsize(f"{OUT}/{name}.mp4") // 1024, 'KB')
