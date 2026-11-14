"""Original synthesized score, second generation: a hard half-time beat (kick, clap, rolling hats, 808 sub, distorted lead) laid out on a bar grid.

score2(path, dur, bpm, sections, hits=(), seed=7, root=43.65)
  sections: [(start_bar, bars, kind)] with kind in intro | light | full | break | outro. Bars are 4 beats.
  hits:     times in seconds that get an impact and a crash (cuts, slams).
Everything is generated here from oscillators and noise; nothing is sampled. Timing and velocity are slightly humanised so it does not sound machine-stamped.
"""
import numpy as np, scipy.signal as sg, wave
SR = 48000


def score2(path, dur, bpm, sections, hits=(), seed=7, root=43.65):
    N = int(SR * dur); rs = np.random.RandomState(seed); beat = 60.0 / bpm; bar = beat * 4
    bus = {k: [np.zeros(N), np.zeros(N)] for k in ('drums', 'bass', 'lead', 'pad', 'fx')}

    def add(name, sig, at, pan=0.0, g=1.0):
        i = int(at * SR)
        if i < 0: sig = sig[-i:]; i = 0
        n = min(len(sig), N - i)
        if n <= 0: return
        bus[name][0][i:i + n] += sig[:n] * g * (1 - max(pan, 0)); bus[name][1][i:i + n] += sig[:n] * g * (1 + min(pan, 0))

    def lp(x, fc, o=2): b, a = sg.butter(o, min(.99, fc / (SR / 2))); return sg.lfilter(b, a, x)
    def hp(x, fc, o=2): b, a = sg.butter(o, fc / (SR / 2), 'high'); return sg.lfilter(b, a, x)
    def bp(x, lo, hi): b, a = sg.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return sg.lfilter(b, a, x)
    def env(n, a, d): e = np.exp(-np.arange(n) / SR / d); q = max(1, int(a * SR)); e[:q] *= np.linspace(0, 1, q); return e
    def saw(f, n, det=0.006): tt = np.arange(n) / SR; return sum(2 * ((tt * f * (1 + d) + ph) % 1) - 1 for d, ph in ((-det, .13), (0, .5), (det, .77))) / 3
    semi = lambda s: root * 2 ** (s / 12.0)

    def kick(v=1.0):
        n = int(.42 * SR); tt = np.arange(n) / SR; f = 46 + 110 * np.exp(-tt * 38)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .16) + hp(rs.randn(n), 2500) * env(n, .0005, .006) * .35
        return np.tanh(x * 2.2) * .9 * v

    def clap(v=1.0):
        n = int(.28 * SR); x = np.zeros(n)
        for off in (0, .011, .023): k = int(off * SR); m = n - k; x[k:] += bp(rs.randn(m), 900, 4200) * env(m, .0005, .045)
        tt = np.arange(n) / SR; x += np.sin(2 * np.pi * 190 * tt) * env(n, .001, .05) * .5
        return np.tanh(x * 1.4) * .55 * v

    def hat(v=1.0, op=False):
        n = int((.16 if op else .045) * SR); return hp(rs.randn(n), 7000) * env(n, .0005, .06 if op else .012) * .32 * v

    def sub(note, length, v=1.0, glide=None):
        n = int(length * SR); tt = np.arange(n) / SR; f = np.full(n, semi(note))
        if glide is not None: g = int(min(n, .09 * SR)); f[:g] = np.linspace(semi(glide), semi(note), g)
        ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + .28 * np.sin(2 * ph)
        e = env(n, .004, max(.2, length * .9)); e[-int(.02 * SR):] *= np.linspace(1, 0, int(.02 * SR))
        return np.tanh(x * 1.9) * e * .78 * v

    def lead(note, length, v=1.0, bright=1.0):
        n = int(length * SR); x = saw(semi(note + 24), n) + .6 * saw(semi(note + 36), n, .009) + .5 * np.sign(saw(semi(note + 12), n, 0))
        e = env(n, .004, max(.08, length * .55)); cut = 700 + 2600 * bright
        x = lp(np.tanh(x * 3.0), cut, 2) * e
        return x * .3 * v

    def pad(notes, length):
        n = int(length * SR); x = sum(lp(saw(semi(s + 12), n, .008), 520) for s in notes) / len(notes)
        e = np.minimum(1, np.minimum(np.arange(n) / SR / 1.0, (n - np.arange(n)) / SR / .5)); return x * e * .5

    def riser(length):
        n = int(length * SR); q = np.linspace(0, 1, n); x = hp(rs.randn(n), 300) * q ** 2.4
        sw = np.sin(2 * np.pi * np.cumsum(180 + 1500 * q ** 2) / SR) * q ** 3 * .25; return (bp(x, 500, 9000) + sw) * .5

    def impact():
        n = int(1.5 * SR); tt = np.arange(n) / SR; f = 30 + 70 * np.exp(-tt * 10)
        return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .5) + lp(rs.randn(n), 400) * env(n, .001, .1) * .7) * 1.8) * .8

    def crash():
        n = int(1.6 * SR); return hp(rs.randn(n), 4500) * env(n, .001, .5) * .28

    # ---- patterns (16 steps a bar). Half-time: clap on beat 3. ----
    KICKS = [[0, 6, 10], [0, 3, 10], [0, 6, 10, 14], [0, 7, 10]]
    RIFFS = [[(0, 0, 3), (3, 0, 1), (4, 3, 2), (6, 5, 2), (8, 7, 3), (11, 5, 1), (12, 3, 2), (14, -2, 2)],
             [(0, 0, 2), (2, 7, 2), (4, 5, 2), (6, 3, 2), (8, 0, 3), (11, 3, 1), (12, 5, 2), (14, 7, 2)],
             [(0, 12, 2), (2, 10, 2), (4, 7, 3), (7, 5, 1), (8, 3, 3), (11, 0, 1), (12, -2, 2), (14, 0, 2)]]
    BASS = [[(0, 0, 6), (6, 0, 2), (10, -2, 4), (14, 3, 2)], [(0, 0, 6), (6, 3, 4), (10, -2, 4), (14, -4, 2)], [(0, -4, 6), (6, -4, 2), (10, -2, 4), (14, 0, 2)], [(0, 0, 8), (10, 5, 3), (13, 3, 3)]]
    CHORDS = [(0, 3, 7), (-4, 0, 3), (-2, 2, 5), (-4, 0, 7)]
    st = bar / 16.0; jit = lambda: rs.uniform(-.004, .004); vel = lambda b=1.0: b * rs.uniform(.82, 1.0)

    for (b0, nb, kind) in sections:
        for k in range(nb):
            t0 = (b0 + k) * bar; gb = b0 + k; last = k == nb - 1
            if t0 >= dur: break
            ch = CHORDS[gb % 4]
            if kind in ('light', 'full', 'break', 'intro'): add('pad', pad(ch, bar + .3), t0, 0, .5 if kind != 'full' else .32)
            if kind == 'intro':
                for s in range(0, 16, 2): add('drums', hat(vel(.7 + .3 * s / 16)), t0 + s * st + jit(), .3 * (-1) ** s)
                if k >= nb // 2: add('drums', kick(vel()), t0); add('bass', sub(ch[0], bar * .9, .9), t0)
                continue
            if kind == 'outro':
                if k == 0: add('bass', sub(0, bar * 2, 1.0), t0); add('lead', lead(0, bar * 1.5, .8, .4), t0)
                continue
            if kind == 'break':
                for s in (0, 8): add('drums', kick(vel(.8)), t0 + s * st)
                for s in range(0, 16, 4): add('drums', hat(vel(.6), True), t0 + s * st + jit(), .3)
                add('bass', sub(ch[0], bar * .95, .8), t0)
                for (s, n_, ln) in RIFFS[2][::2]: add('lead', lead(n_, ln * st * 1.6, vel(.55), .35), t0 + s * st + jit(), .2)
                if last: add('fx', riser(bar), t0)
                continue
            full = kind == 'full'
            for s in KICKS[gb % 4] if full else [0, 10]: add('drums', kick(vel()), t0 + s * st + (jit() if s else 0))
            add('drums', clap(vel()), t0 + 8 * st + jit())
            if full and gb % 2: add('drums', clap(vel(.45)), t0 + 15 * st + jit())
            for s in range(16):
                if s % 2 == 0 or (full and rs.rand() < .22): add('drums', hat(vel(.95 if s % 4 == 0 else .55), op=(s == 14 and gb % 2 == 1)), t0 + s * st + jit() + (.006 if s % 4 == 2 else 0), .35 * (-1) ** s)
            if full and (gb % 4 == 3 or last):   # hat roll into the next bar
                for r in range(8): add('drums', hat(.35 + .08 * r), t0 + 14 * st + r * st / 4, .2)
            prev = None
            for (s, n_, ln) in BASS[gb % 4]: add('bass', sub(n_, ln * st * .96, vel(), glide=prev), t0 + s * st); prev = n_
            if full:
                for (s, n_, ln) in RIFFS[(gb // 2) % 3]: add('lead', lead(n_, ln * st * 1.15, vel(.9), .5 + .5 * ((gb % 8) / 8)), t0 + s * st + jit(), .25 * (-1) ** s)
            if last and full:
                for r, s in enumerate((12, 13, 14, 15)): add('drums', clap(.3 + .15 * r), t0 + s * st)
    for h in hits:
        add('fx', impact(), h, 0, 1.0); add('fx', crash(), h, .2, .8); add('fx', riser(min(bar, 1.2))[::1], h - min(bar, 1.2), 0, .5)

    # ---- mix: sidechain the music under the kick, a touch of room, soft limiter ----
    dr = bus['drums']; kenv = np.abs(lp(bus['drums'][0] + bus['drums'][1], 90)); kenv = lp(kenv, 12); kenv = kenv / (kenv.max() or 1); duck = 1 - .55 * np.clip(kenv * 1.6, 0, 1)
    ir = rs.randn(int(1.1 * SR)) * np.exp(-np.arange(int(1.1 * SR)) / SR / .32); ir = lp(ir, 6000)
    def rv(x, amt):
        w = sg.fftconvolve(x, ir)[:N]; m = np.max(np.abs(w)) or 1; return x + w / m * (np.max(np.abs(x)) or 0) * amt
    out = []
    for c in (0, 1):
        m = dr[c] * 1.0 + bus['bass'][c] * .95 * (.4 + .6 * duck) + rv(bus['lead'][c], .22) * .62 * duck + rv(bus['pad'][c], .3) * .5 * duck + rv(bus['fx'][c], .25) * .8
        out.append(m)
    mx = max(np.max(np.abs(out[0])), np.max(np.abs(out[1]))) or 1; t = np.arange(N) / SR; f = np.interp(t, [0, .15, dur - 1.6, dur], [0, 1, 1, 0])
    L = np.tanh(out[0] / mx * 2.4) * .9 * f; R = np.tanh(out[1] / mx * 2.4) * .9 * f
    w = wave.open(path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes()); w.close()


if __name__ == '__main__':
    import sys
    score2(sys.argv[1] if len(sys.argv) > 1 else '/tmp/score2.wav', 30, 140, [(0, 4, 'intro'), (4, 4, 'light'), (8, 6, 'full'), (14, 2, 'break'), (16, 2, 'outro')], hits=[6.86, 13.7])
