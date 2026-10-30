"""Synthesized 120 BPM pop/house bed: Am-F-C-G plucks, sub bass, four-on-the-floor,
a one-bar breakdown + riser that drops exactly on the R$ 40.000 moment."""
import sys, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

OUT = sys.argv[1]
SR, DUR = 48000, float(sys.argv[3])
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
DROP = float(sys.argv[2])
GRID0 = DROP % BAR - BAR            # bar grid aligned so a bar starts at the drop
BREAK0 = DROP - BAR                 # one-bar breakdown before the drop
N = int((DUR + 1) * SR)
rng = np.random.default_rng(3)

def buf(): return np.zeros((N, 2))
def add(dst, x, t, pan=0.0, g=1.0):
    i = int(round(t * SR))
    if i >= N or i + len(x) <= 0: return
    if i < 0: x, i = x[-i:], 0
    x = x[: N - i]
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    dst[i:i + len(x), 0] += g * l * x; dst[i:i + len(x), 1] += g * r * x
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output="sos"), x)
def note_hz(n): return 440 * 2 ** ((n - 69) / 12)

def kick(strong=False):
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (7 if strong else 9))
    x[:200] += rng.standard_normal(200) * np.linspace(0.5, 0, 200)
    return np.tanh(1.6 * x) * (1.0 if strong else 0.85)
def clap():
    n = int(0.35 * SR); t = np.arange(n) / SR
    env = np.zeros(n)
    for d in (0, 0.011, 0.022): env += (t >= d) * np.exp(-np.maximum(t - d, 0) * 60)
    env += (t >= 0.03) * np.exp(-np.maximum(t - 0.03, 0) * 14) * 0.5
    return filt(rng.standard_normal(n), "bandpass", [900, 2600]) * env * 1.6
def hat(open_=False):
    n = int((0.26 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "highpass", 7500) * np.exp(-t * (12 if open_ else 80)) * 0.5
def pluck(midi, dur=0.32, bright=3200):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for det in (-0.08, 0.08):
        f = note_hz(midi + det)
        for k in range(1, int(9000 / f)):
            x += np.sin(2 * np.pi * f * k * t) / k
    x = filt(x, "lowpass", bright) * np.exp(-t * 9) * np.minimum(1, t * 400)
    return x * 0.12
def pad(midis, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * note_hz(m) * t) + 0.3 * np.sin(2 * np.pi * note_hz(m) * 2.003 * t) for m in midis)
    env = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.4)
    return filt(x, "lowpass", 1800) * env * 0.035
def bass(midi, dur):
    n = int(dur * SR); t = np.arange(n) / SR; f = note_hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(1.5 * x) * np.exp(-t * 3) * np.minimum(1, t * 300) * 0.32

CHORDS = [(57, [57, 60, 64]), (53, [57, 60, 65]), (48, [55, 60, 64]), (55, [55, 59, 62])]   # Am F C G
PLUCK_RHYTHM = [0, 0.75, 1.5, 2.5, 3.0, 3.5]        # in beats, syncopated
drums, music, kicks_t = buf(), buf(), []

bar = 0
t = GRID0
while t < DUR + 0.5:
    root, notes = CHORDS[bar % 4]
    in_break = BREAK0 - 1e-6 <= t < DROP - 1e-6
    drop = t >= DROP - 1e-6
    # harmony
    music_g = 1.0 if drop else 0.8
    add(music, pad(notes + [notes[0] + 12], BAR + 0.2), t, 0, 1.3 if in_break else 1.0)
    if not in_break:
        for i, b in enumerate(PLUCK_RHYTHM):
            for j, m in enumerate(notes + ([notes[-1] + 12] if drop else [])):
                add(music, pluck(m + 12, bright=4200 if drop else 2600), t + b * BEAT, pan=(-0.5 + j * 0.33), g=music_g)
        for b in range(8):
            if b % 2 == 1: add(music, bass(root - 24, BEAT * 0.48), t + b * BEAT / 2, 0, 1.0)
    # drums
    if not in_break:
        for b in range(4):
            kt = t + b * BEAT
            add(drums, kick(drop), kt); kicks_t.append(kt)
            add(drums, hat(open_=drop), kt + BEAT / 2, 0.3, 0.8)
            if drop: add(drums, hat(), kt + BEAT / 4, -0.3, 0.45); add(drums, hat(), kt + 3 * BEAT / 4, -0.3, 0.45)
            if b in (1, 3): add(drums, clap(), kt, 0, 0.9)
    else:
        # snare roll accelerating into the drop
        for k, frac in enumerate([0, .25, .5, .625, .75, .8125, .875, .9063, .9375, .9688]):
            add(drums, clap(), t + frac * BAR * 0.97, 0, 0.35 + 0.6 * frac)
    t += BAR; bar += 1

# riser (noise sweep + rising tone) through the breakdown, then a sub boom on the drop
n = int(BAR * SR); tt = np.arange(n) / SR
noise = rng.standard_normal(n); sweep = np.zeros(n)
for k in range(0, n, 2400):
    seg = noise[k:k + 2400]; fc = 300 + 9000 * (k / n) ** 2
    sweep[k:k + len(seg)] = filt(seg, "bandpass", [fc * 0.7, min(fc * 1.3, 20000)], 1)
riser = sweep * (tt / BAR) ** 2 * 0.5 + 0.08 * np.sin(2 * np.pi * np.cumsum(220 + 660 * (tt / BAR) ** 2) / SR) * (tt / BAR)
add(music, riser, BREAK0)
nb = int(1.6 * SR); tb = np.arange(nb) / SR
boom = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tb * 1.2) + 30) / SR) * np.exp(-tb * 2.2)
add(drums, np.tanh(2 * boom) * 0.9, DROP)

# reverb send on music, house "pump" (sidechain to the kick)
ir_n = int(1.2 * SR); ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR * 4.5)[:, None]
wet = np.stack([fftconvolve(music[:, c], ir[:, c])[:N] for c in range(2)], 1) * 0.012
music = music + wet
pump = np.ones(N)
for kt in kicks_t:
    i = int(kt * SR); m = int(0.28 * SR)
    if 0 <= i < N:
        seg = 0.45 + 0.55 * np.minimum(1, np.arange(m) / m) ** 0.7
        pump[i:i + m] = np.minimum(pump[i:i + m], seg[: N - i])
music *= pump[:, None]

mix = drums * 0.9 + music
mix = filt(mix.T, "highpass", 35).T
fade = np.ones(N); fe = int(DUR * SR); fs = int((DUR - 0.8) * SR)
fade[fs:fe] = np.linspace(1, 0, fe - fs); fade[fe:] = 0
mix *= fade[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.4) * 0.85
(mix * 32767).astype(np.int16).tofile(OUT)
print("music ok", mix.shape)
