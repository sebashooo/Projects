# Sintetiza efectos de sonido y música de fondo (sin descargar nada) para cada variante.
#   python3 tools/audio.py   →  assets/audio/sfx_<v>.wav, assets/audio/music_<v>.wav
# Lee los tiempos de tools/events_<v>.json (los escribe tools/build.mjs).
# Niveles: la música queda ~22 dB por debajo del RMS de la voz; el volumen final (-14 LUFS)
# se ajusta después del render con tools/finish.sh.
import json, glob
import numpy as np
import soundfile as sf

SR = 48000
rng = np.random.default_rng(7)  # semilla fija: el audio sale idéntico en cada build


def t_(d):
    return np.arange(int(d * SR)) / SR


def band(x, lo, hi):
    """Filtro pasabanda por FFT con bordes suaves."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def norm(x, peak):
    return x / (np.abs(x).max() + 1e-9) * peak


def noise(d):
    return rng.standard_normal(int(d * SR))


def sweep(f0, f1, d):
    f = np.geomspace(f0, f1, int(d * SR))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def bell(freqs, d, decay):
    t = t_(d)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * decay * (1 + i * 0.6)) / (i + 1) for i, f in enumerate(freqs))


# ── efectos ──
def fx_whoosh():
    d = 0.4; n = noise(d); t = t_(d)
    # barrido de banda: el centro sube y baja
    out = np.zeros_like(n)
    for k, (lo, hi) in enumerate([(300, 1200), (800, 3000), (1500, 6000), (700, 2500)]):
        seg = band(n, lo, hi) * np.exp(-((t - (0.08 + k * 0.08)) / 0.07) ** 2)
        out += seg
    return norm(out, 0.5)

def fx_riser():
    d = 0.4; t = t_(d)
    x = band(noise(d), 1500, 9000) * (t / d) ** 2 + 0.3 * sweep(300, 1600, d) * (t / d) ** 2
    return norm(x * env(len(t), 0, 0.02), 0.45)

def fx_impact():
    d = 0.7; t = t_(d)
    x = np.sin(2 * np.pi * np.cumsum(np.geomspace(110, 40, len(t))) / SR) * np.exp(-t * 6)
    x += band(noise(d), 80, 3000) * np.exp(-t * 25) * 0.5
    return norm(x, 0.8)

def fx_punch():
    d = 0.3; t = t_(d)
    x = np.sin(2 * np.pi * np.cumsum(np.geomspace(160, 45, len(t))) / SR) * np.exp(-t * 14)
    x += band(noise(d), 1000, 8000) * np.exp(-t * 60) * 0.35
    return norm(x, 0.85)

def fx_paper():
    d = 0.3; t = t_(d)
    x = band(noise(d), 2000, 10000) * (np.abs(np.sin(2 * np.pi * 18 * t)) ** 3) * env(len(t), 0.01, 0.1)
    return norm(x, 0.3)

def fx_scribble():
    d = 0.35; t = t_(d)
    x = band(noise(d), 1500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t)) * env(len(t), 0.02, 0.08)
    return norm(x, 0.22)

def fx_slap():
    d = 0.18; t = t_(d)
    x = band(noise(d), 300, 5000) * np.exp(-t * 40) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 30) * 0.6
    return norm(x, 0.6)

def fx_beep():
    d = 0.13; t = t_(d)
    x = np.sin(2 * np.pi * 1950 * t) + 0.2 * np.sin(2 * np.pi * 3900 * t)
    return norm(x * env(len(t), 0.004, 0.03), 0.4)

def fx_tap():
    d = 0.05; t = t_(d)
    return norm(band(noise(d), 1500, 6000) * np.exp(-t * 120), 0.35)

def fx_pop():
    d = 0.12; t = t_(d)
    x = np.sin(2 * np.pi * np.cumsum(np.geomspace(1100, 320, len(t))) / SR) * np.exp(-t * 30)
    return norm(x, 0.5)

def fx_tick():
    d = 0.04; t = t_(d)
    return norm(np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 150), 0.25)

def fx_kaching():
    d = 0.9; t = t_(d)
    ka = band(noise(0.06), 2000, 9000) * np.exp(-t_(0.06) * 60)
    ching = bell([2637, 3520, 5274], 0.85, 5)
    x = np.zeros(len(t)); x[: len(ka)] += ka * 0.6
    o = int(0.07 * SR); x[o:o + len(ching)] += ching[: len(x) - o]
    return norm(x, 0.42)

def fx_chime():
    d = 0.8; x = np.zeros(int(d * SR))
    a = bell([1319, 2638], 0.6, 6); b = bell([1760, 3520], 0.7, 5)
    x[: len(a)] += a; o = int(0.1 * SR); x[o:o + len(b)] += b[: len(x) - o]
    return norm(x, 0.3)

FX = {k[3:]: v for k, v in globals().items() if k.startswith("fx_")}
FX_GAIN = {"whoosh": 0.7, "riser": 0.7, "impact": 0.9, "punch": 1.0, "paper": 0.8, "scribble": 0.8,
           "slap": 0.8, "beep": 0.75, "tap": 0.8, "pop": 0.8, "tick": 0.7, "kaching": 0.9, "chime": 0.6}


# ── música: 112 BPM; parte A apagada (papel), parte B alegre desde el giro ──
def music(dur, turn):
    bpm = 112; beat = 60 / bpm; n = int(dur * SR); out = np.zeros(n)

    def put(x, t, g=1.0):
        i = int(t * SR)
        if i >= n: return
        x = x[: n - i]; out[i:i + len(x)] += x * g

    def kick():
        t = t_(0.28); return np.sin(2 * np.pi * np.cumsum(np.geomspace(120, 45, len(t))) / SR) * np.exp(-t * 16)

    def hat():
        t = t_(0.05); return band(noise(0.05), 7000, 14000) * np.exp(-t * 90)

    def clap():
        t = t_(0.15); return band(noise(0.15), 900, 5000) * np.exp(-t * 30)

    def pluck(f, d=0.3):
        t = t_(d); x = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.6 for h in (1, 2, 3, 4)); return x * np.exp(-t * 9)

    def bass(f, d):
        t = t_(d); x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
        return x * env(len(t), 0.01, 0.06)

    def pad(fs, d):
        t = t_(d); x = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in fs)
        return x * env(len(t), 0.3, 0.3)

    N = lambda m: 440 * 2 ** ((m - 69) / 12)
    # A: Am - F con pad oscuro, bombo suave, sin brillo
    t = 0.0
    chordsA = [[57, 60, 64], [53, 57, 60]]
    k = 0
    while t < turn - 0.01:
        d = min(4 * beat, turn - t)
        put(pad([N(m) for m in chordsA[k % 2]], d), t, 0.05)
        for b in range(4):
            tb = t + b * beat
            if tb < turn: put(kick(), tb, 0.35 if b % 2 == 0 else 0.0)
            if tb + beat / 2 < turn: put(hat(), tb + beat / 2, 0.1)
        t += 4 * beat; k += 1
    # B: C - G - Am - F, cuatro en el piso, palmas, bajo y arpegio
    prog = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
    t = turn; k = 0
    while t < dur - 0.6:
        root, ch = prog[k % 4]
        for b in range(4):
            tb = t + b * beat
            if tb >= dur - 0.6: break
            put(kick(), tb, 0.55)
            if b % 2 == 1: put(clap(), tb, 0.25)
            put(hat(), tb + beat / 2, 0.16)
            put(bass(N(root), beat * 0.9), tb, 0.22)
            for s in range(2):
                put(pluck(N(ch[(b * 2 + s) % 3] + 12)), tb + s * beat / 2, 0.09)
        put(pad([N(m) for m in ch], 4 * beat), t, 0.035)
        t += 4 * beat; k += 1
    # cierre: acorde final
    put(pad([N(m) for m in [60, 64, 67, 72]], 0.9), dur - 0.9, 0.06)
    out *= env(n, 0.05, 0.5)
    return out


def rms(x):
    return np.sqrt(np.mean(x ** 2))


if __name__ == "__main__":
    vo = np.concatenate([sf.read(f)[0] for f in sorted(glob.glob("assets/audio/vo_s*.wav"))])
    vo_rms = rms(vo[np.abs(vo) > 0.02])  # RMS de la voz cuando suena
    for path in sorted(glob.glob("tools/events_*.json")):
        key = path.split("events_")[1][:-5]
        ev = json.load(open(path)); dur = ev["dur"]
        n = int(dur * SR)
        sfx = np.zeros(n)
        for e in ev["sfx"]:
            x = FX[e["type"]]() * FX_GAIN[e["type"]]
            i = max(0, int(e["t"] * SR)); x = x[: n - i]; sfx[i:i + len(x)] += x
        turn = next(s[1] for s in ev["scenes"] if s[0] not in ("hook", "chaos"))
        m = music(dur, turn)
        busy = np.abs(m) > 1e-4
        m *= (vo_rms * 10 ** (-22 / 20)) / rms(m[busy])  # música 22 dB bajo la voz
        sf.write(f"assets/audio/sfx_{key}.wav", np.clip(sfx * 0.55, -1, 1), SR)
        sf.write(f"assets/audio/music_{key}.wav", np.clip(m, -1, 1), SR)
        print(key, "sfx pico", round(float(np.abs(sfx * 0.55).max()), 2), "música rms dB vs voz",
              round(20 * np.log10(rms(m[busy]) / vo_rms), 1))
