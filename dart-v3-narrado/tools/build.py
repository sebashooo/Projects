# DART v3 narrado: pone cada grabación de voz en su escena, alarga solo las escenas donde la voz
# necesita más tiempo, agrega música ambiental (sintetizada aquí, sin derechos de terceros) que baja
# sola cuando hay voz, y deja el volumen final en -14 LUFS.
#   python3 tools/build.py   →  salida/DART_animacion_v3_narrado.mp4  (+ pistas en salida/pistas/)
import json, os, subprocess
import numpy as np
import soundfile as sf

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
SR = 48000
PLAN = json.load(open("tools/plan.json"))
FUENTE = "fuente_DART_animacion_v3.mp4"
os.makedirs("salida/pistas", exist_ok=True)


def run(*a):
    subprocess.run(a, check=True)


# ── 1. voz: limpieza suave por archivo y mismo nivel para las cuatro grabaciones ──
VOZ_FILTRO = ",".join([
    "highpass=f=80",                      # quita retumbe y golpes graves
    "afftdn=nr=8:nf=-50",                 # reducción de ruido leve (el piso ya es bajo: ~-50 dB)
    "equalizer=f=3200:t=q:w=1.2:g=2",     # un poco más de presencia (inteligibilidad)
    "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=150:makeup=1.5",
    "alimiter=limit=0.89",
])
voz = {}
for i in range(1, 5):
    out = f"salida/pistas/voz_{i}_limpia.wav"
    run("ffmpeg", "-v", "error", "-y", "-i", f"audio/Animacion_{i}.m4a", "-af", VOZ_FILTRO, "-ac", "1", "-ar", str(SR), out)
    a, _ = sf.read(out)
    act = a[np.abs(a) > 0.02]
    rms = np.sqrt(np.mean(act ** 2)) if len(act) else 0.1
    voz[i] = a * (10 ** (-17 / 20) / rms)            # misma energía de voz en todas (≈ -17 dBFS al hablar)

# ── 2. línea de tiempo: cada escena dura lo que necesite su voz (nunca se acelera) ──
esc = PLAN["escenas"]
t = 0.0
for k, e in enumerate(esc):
    V = e["v1"] - e["v0"]
    A = e["hasta"] - e["desde"]
    T = max(V, PLAN["entrada"] + A + PLAN["salida"])
    e.update(V=V, A=A, T=T, f=T / V, t0=t)
    t += T
DUR = t + PLAN["cola_final"]
print("escena  video→salida   factor   voz")
for e in esc:
    print(f"  {e['n']}    {e['V']:5.2f}→{e['T']:5.2f} s   ×{e['f']:.2f}   audio {e['a']} [{e['desde']:.2f}–{e['hasta']:.2f}]")
print(f"duración final: {DUR:.2f} s (fuente 64 s)")

n = int(DUR * SR)
pista_voz = np.zeros(n)
for e in esc:
    a = voz[e["a"]]
    seg = a[int(e["desde"] * SR): int(e["hasta"] * SR)].copy()
    fi, fo = int(0.02 * SR), int(0.06 * SR)          # entrada corta; salida algo más larga (los cortes caen en silencio)
    seg[:fi] *= np.linspace(0, 1, fi); seg[-fo:] *= np.linspace(1, 0, fo)
    i0 = int((e["t0"] + PLAN["entrada"]) * SR)
    pista_voz[i0:i0 + len(seg)] += seg[: n - i0]

# ── 3. música ambiental espacial (pads suaves + campanitas lentas + bajo profundo) ──
rng = np.random.default_rng(11)
def tt(d): return np.arange(int(d * SR)) / SR
def env(m, a, r):
    e = np.ones(m); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e
N = lambda m: 440 * 2 ** ((m - 69) / 12)
L = np.zeros(n); R = np.zeros(n)
def put(x, t0, g, pan=0.0):
    i = int(t0 * SR)
    if i >= n: return
    x = x[: n - i]
    L[i:i + len(x)] += x * g * (1 - pan) ; R[i:i + len(x)] += x * g * (1 + pan)
prog = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 66]]  # Cmaj7 · Am7 · Fmaj7 · G6
bar = 6.0
for b in range(int(DUR // bar) + 1):
    ch = prog[b % 4]; t0 = b * bar; d = bar + 2.5
    tm = tt(d)
    for j, m in enumerate(ch):
        f = N(m)
        x = (np.sin(2 * np.pi * f * tm) + 0.5 * np.sin(2 * np.pi * f * 1.003 * tm + 1.1) + 0.25 * np.sin(2 * np.pi * 2 * f * tm)) * env(len(tm), 2.0, 2.5)
        x *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * tm + j)            # respiración lenta
        put(x, t0, 0.05, pan=(j - 1.5) * 0.25)
    put(np.sin(2 * np.pi * N(ch[0] - 12) * tm) * env(len(tm), 2.5, 2.5), t0, 0.06)   # bajo profundo
    for q in range(3):                                                # campanitas espaciadas
        nota = ch[(b + q * 2) % 4] + 24
        tb = tt(2.5); bell = (np.sin(2 * np.pi * N(nota) * tb) + 0.3 * np.sin(2 * np.pi * N(nota) * 2.76 * tb)) * np.exp(-tb * 2.2)
        put(bell, t0 + 0.8 + q * 1.9 + rng.uniform(0, 0.3), 0.022, pan=rng.uniform(-0.5, 0.5))
# «brillo» de estrellas: ruido muy filtrado y suave
ruido = rng.standard_normal(n)
X = np.fft.rfft(ruido); fr = np.fft.rfftfreq(n, 1 / SR)
ruido = np.fft.irfft(X / (1 + (6000 / np.maximum(fr, 1)) ** 4) / (1 + (fr / 12000) ** 4), n)
L += ruido * 0.004; R += np.roll(ruido, 900) * 0.004
musica = np.stack([L, R], 1) * env(n, 2.0, 3.0)[:, None]

# ── 4. mezcla: la música va ~12 dB bajo la voz en las pausas y baja ~8 dB más cuando hay voz (≈20 dB debajo) ──
vr = np.sqrt(np.mean(pista_voz[np.abs(pista_voz) > 0.02] ** 2))
mr = np.sqrt(np.mean(musica ** 2))
musica *= (vr * 10 ** (-12 / 20)) / mr
hop = int(0.01 * SR)
e_voz = np.sqrt(np.convolve(pista_voz ** 2, np.ones(hop * 20) / (hop * 20), "same"))
activo = (e_voz > 0.01).astype(float)
g = np.zeros(n); y = 0.0
at, rl = np.exp(-1 / (0.12 * SR)), np.exp(-1 / (0.7 * SR))       # baja rápido, sube despacio
step = 64
for k in range(0, n, step):
    tgt = activo[k]
    c = at if tgt > y else rl
    y = tgt + (y - tgt) * c ** step
    g[k:k + step] = y
duck = 10 ** (-8 * g / 20)
musica *= duck[:, None]
mezcla = musica + pista_voz[:, None]
pico = np.abs(mezcla).max()
if pico > 0.95: mezcla *= 0.95 / pico
sf.write("salida/pistas/voz_completa.wav", pista_voz, SR)
sf.write("salida/pistas/musica_con_ducking.wav", musica, SR)
sf.write("salida/pistas/mezcla.wav", mezcla, SR)

# ── 5. video: cada escena estirada a su duración (cuadros repetidos, sin deformar) + cola final ──
fc = []
for k, e in enumerate(esc):
    fc.append(f"[0:v]trim={e['v0']}:{e['v1']},setpts=(PTS-STARTPTS)*{e['f']:.5f},fps=30[v{k}]")
fc.append("".join(f"[v{k}]" for k in range(len(esc))) + f"concat=n={len(esc)}:v=1:a=0,tpad=stop_mode=clone:stop_duration={PLAN['cola_final']}[vout]")
run("ffmpeg", "-v", "error", "-y", "-i", FUENTE, "-i", "salida/pistas/mezcla.wav", "-filter_complex", ";".join(fc),
    "-map", "[vout]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "pcm_s16le", "-t", f"{DUR:.3f}", "salida/pistas/sin_normalizar.mkv")

# ── 6. volumen final -14 LUFS: ganancia medida + limitador que solo toca los picos (sin bombeo) ──
m = subprocess.run(["ffmpeg", "-hide_banner", "-i", "salida/pistas/sin_normalizar.mkv", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"): m.rindex("}") + 1])
ganancia = -14.0 - float(j["input_i"]) + 0.1
run("ffmpeg", "-v", "error", "-y", "-i", "salida/pistas/sin_normalizar.mkv", "-c:v", "copy",
    "-af", f"volume={ganancia:.2f}dB,alimiter=limit=0.75:attack=1:release=60:level=false",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "salida/DART_animacion_v3_narrado.mp4")
os.remove("salida/pistas/sin_normalizar.mkv")
json.dump([{k: e[k] for k in ("n", "v0", "v1", "a", "desde", "hasta", "t0", "T", "f")} for e in esc], open("salida/pistas/linea_de_tiempo.json", "w"), indent=1)
print("listo: salida/DART_animacion_v3_narrado.mp4")
