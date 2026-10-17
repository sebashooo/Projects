# Música de fondo (distinta por capítulo) y efectos de la guía, sintetizados sin descargar nada.
#   python3 tools/audio.py <NN> [<NN> …]  →  assets/audio/music_<NN>.wav, assets/audio/sfx_<NN>.wav
import json, sys
import numpy as np, soundfile as sf
SR = 48000
rng = np.random.default_rng(3)
def t_(d): return np.arange(int(d * SR)) / SR
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4), len(x))
def env(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e
def norm(x, p): return x / (np.abs(x).max() + 1e-9) * p
FX = {
    "swish": lambda: norm(band(rng.standard_normal(int(0.3 * SR)), 900, 7000) * np.sin(np.pi * t_(0.3) / 0.3) ** 2, 0.18),
    "chime": lambda: norm(sum(np.sin(2 * np.pi * f * t_(1.2)) * np.exp(-t_(1.2) * (3 + i)) / (i + 1) for i, f in enumerate([880, 1318.5, 1760])), 0.22),
    "impact": lambda: norm(np.sin(2 * np.pi * np.cumsum(np.geomspace(110, 40, int(0.6 * SR))) / SR) * np.exp(-t_(0.6) * 6), 0.35),
    "beep": lambda: norm(np.sin(2 * np.pi * 1950 * t_(0.12)) * env(int(0.12 * SR), 0.004, 0.03), 0.18),
}
# progresiones por capítulo (variedad a lo largo de los 30 min)
KEYS = [[60, 64, 67, 72], [57, 60, 64, 69], [62, 65, 69, 74], [55, 59, 62, 67], [64, 67, 71, 76], [53, 57, 60, 65]]
def music(dur, ch):
    bpm = 88 + (ch % 4) * 6; beat = 60 / bpm; n = int(dur * SR); out = np.zeros(n)
    N = lambda m: 440 * 2 ** ((m - 69) / 12)
    def put(x, t, g):
        i = int(t * SR)
        if 0 <= i < n: x = x[: n - i]; out[i:i + len(x)] += x * g
    def pad(fs, d):
        t = t_(d); return sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.004 * t) for f in fs) * env(len(t), 0.6, 0.6)
    def pluck(f):
        t = t_(0.9); return sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (3 + h)) / h ** 1.4 for h in (1, 2, 3)) * env(len(t), 0.003, 0.1)
    def kick():
        t = t_(0.3); return np.sin(2 * np.pi * np.cumsum(np.geomspace(120, 45, len(t))) / SR) * np.exp(-t * 10)
    def hat():
        t = t_(0.05); return band(rng.standard_normal(len(t)), 7000, 15000) * np.exp(-t * 90)
    base = KEYS[ch % len(KEYS)]
    prog = [0, 5, -3, 7]  # I – IV – vi – V (aprox.)
    bar = 4 * beat; t0 = 0.0; b = 0
    while t0 < dur:
        sh = prog[b % 4]; ch_notes = [m + sh for m in base[:3]]
        put(pad([N(m - 12) for m in ch_notes], bar + 0.5), t0, 0.05)
        for q in range(8):
            if (q + b) % 3 != 2: put(pluck(N(ch_notes[q % 3] + 12)), t0 + q * beat / 2, 0.035)
        for q in range(4):
            put(kick(), t0 + q * beat, 0.16 if q % 2 == 0 else 0.0)
            put(hat(), t0 + q * beat + beat / 2, 0.035)
        t0 += bar; b += 1
    out *= env(n, 1.0, 1.5)
    return out
if __name__ == "__main__":
    for nn in sys.argv[1:]:
        ev = json.load(open(f"tools/events_{nn}.json")); dur = ev["dur"]; n = int(dur * SR)
        vo = [sf.read(f"assets/audio/vo/{nn}_{i:02d}.wav")[0] for i in range(len(json.load(open(f"tools/vo_{nn}.json"))))]
        allv = np.concatenate(vo); vr = np.sqrt(np.mean(allv[np.abs(allv) > 0.02] ** 2)) if np.any(np.abs(allv) > 0.02) else 0.08
        m = music(dur, ev["chapter"]); m *= vr * 10 ** (-24 / 20) / np.sqrt(np.mean(m[np.abs(m) > 1e-5] ** 2))
        s = np.zeros(n)
        for e in ev["sfx"]:
            x = FX[e["type"]](); i = max(0, int(e["t"] * SR)); x = x[: n - i]; s[i:i + len(x)] += x
        sf.write(f"assets/audio/music_{nn}.wav", np.clip(m, -1, 1), SR)
        sf.write(f"assets/audio/sfx_{nn}.wav", np.clip(s * 0.8, -1, 1), SR)
        print(nn, "audio ok", round(dur, 1), "s", flush=True)
