# DART v3 narrado: pone cada grabación de voz en su escena (con la voz un poco acelerada y sin silencios
# de sobra), ajusta cada escena de la animación a lo que dura su voz, iguala el timbre y el volumen de las
# cuatro grabaciones, agrega música ambiental (sintetizada aquí, sin derechos de terceros) que baja sola
# cuando hay voz, y deja el volumen final en -12 LUFS (fuerte y claro en el celular).
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


# ── 1. voz: limpieza suave, mismo timbre y mismo nivel para las cuatro grabaciones ──
# Las grabaciones 2 y 4 salieron más opacas (5–7 dB menos de agudos entre 2 y 8 kHz) y por eso sonaban más
# bajitas aunque midieran igual. Cada grabación se ecualiza hacia el timbre de las dos más claras.
BANDAS = 100 * 2 ** (np.arange(21) / 3)                          # tercios de octava, 100 Hz – 10 kHz


def kpond(x):
    """Ponderación K aproximada (ITU-R BS.1770): pesa los agudos como los percibe el oído."""
    X = np.fft.rfft(x); f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1)
    r = (f / 1681) ** 2
    return np.fft.irfft(X * f ** 2 / (f ** 2 + 38 ** 2) * 10 ** (4 * r / (1 + r) / 20), len(x))


def perfil(x):
    h = 4096; k = len(x) // h; fr = x[:k * h].reshape(k, h)
    e = (fr ** 2).mean(1); fr = fr[e > np.percentile(e, 50)]        # solo cuadros con voz
    P = (np.abs(np.fft.rfft(fr * np.hanning(h), axis=1)) ** 2).mean(0); f = np.fft.rfftfreq(h, 1 / SR)
    p = np.array([10 * np.log10(P[(f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))].mean()) for c in BANDAS])
    return p - p[(BANDAS >= 200) & (BANDAS <= 1000)].mean()         # forma, relativa a los medios-graves


def ecualizar(x, gdb):
    X = np.fft.rfft(x); f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1)
    g = np.interp(np.log2(f), np.log2(BANDAS), gdb)
    return np.fft.irfft(X * 10 ** (g / 20), len(x))


# Copia de análisis (comprimida) solo para decidir dónde hay silencio: así las sílabas suaves no se confunden
# con pausas y los cortes de la sección 2 caen donde se verificaron.
ANALISIS = "highpass=f=80,afftdn=nr=8:nf=-50,equalizer=f=3200:t=q:w=1.2:g=2," \
           "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=150:makeup=1.5,alimiter=limit=0.89"
bruta, analisis = {}, {}
for i in range(1, 5):
    out = f"salida/pistas/voz_{i}_limpia.wav"
    run("ffmpeg", "-v", "error", "-y", "-i", f"audio/Animacion_{i}.m4a", "-af", "highpass=f=80,afftdn=nr=8:nf=-50",
        "-ac", "1", "-ar", str(SR), out)
    bruta[i] = sf.read(out)[0]
    run("ffmpeg", "-v", "error", "-y", "-i", f"audio/Animacion_{i}.m4a", "-af", ANALISIS, "-ac", "1", "-ar", str(SR), out)
    a = sf.read(out)[0]
    analisis[i] = a * (10 ** (-17 / 20) / np.sqrt(np.mean(a[np.abs(a) > 0.02] ** 2)))
perfiles = {i: perfil(x) for i, x in bruta.items()}
claridad = {i: p[(BANDAS >= 2000) & (BANDAS <= 6000)].mean() for i, p in perfiles.items()}
claras = sorted(claridad, key=claridad.get)[-2:]
meta = np.mean([perfiles[i] for i in claras], 0)
voz = {}
for i, x in bruta.items():
    g = np.clip(meta - perfiles[i], -6, np.where((BANDAS >= 2000) & (BANDAS <= 5000), 14, 8))   # claridad: hasta +14 dB
    g = np.convolve(np.pad(g, 1, mode="edge"), [0.25, 0.5, 0.25], "valid")
    g[BANDAS > 8000] = np.minimum(g[BANDAS > 8000], 3)
    y = ecualizar(x, g)
    act = y[np.abs(y) > 0.02]
    voz[i] = y * (10 ** (-17 / 20) / np.sqrt(np.mean(act ** 2)))    # misma energía de voz en todas
    sf.write(f"salida/pistas/voz_{i}_limpia.wav", voz[i], SR)
    print(f"voz {i}: ecualización 2–6 kHz {g[(BANDAS >= 2000) & (BANDAS <= 6000)].mean():+.1f} dB"
          + ("  (referencia de timbre)" if i in claras else ""))

# ── 2. tramos de voz más cortos: sin silencios de sobra y un poco más rápidos (mismo tono) ──
TEMPO, PAUSA = PLAN["tempo_voz"], PLAN["pausa_max"]


def acortar(seg, ana, nombre):
    h = int(0.01 * SR); k = min(len(seg), len(ana)) // h
    mudo = 20 * np.log10(np.maximum(np.sqrt((ana[:k * h].reshape(k, h) ** 2).mean(1)), 1e-9)) < -40
    habla = np.where(~mudo)[0]
    a0, a1 = max(0, habla[0] - 4), min(k, habla[-1] + 9)          # deja 40 ms antes y 80 ms después de la voz
    piezas, desde, i = [], a0, a0
    while i < a1:                                                 # cada pausa interna larga queda en PAUSA s
        if mudo[i]:
            j = i
            while j < a1 and mudo[j]: j += 1
            if (j - i) * 0.01 > PAUSA + 0.06 and j < a1:
                medio = int(PAUSA / 0.02)
                piezas.append(seg[desde * h:(i + medio) * h]); desde = j - medio
            i = j
        else:
            i += 1
    piezas.append(seg[desde * h:a1 * h])
    x = piezas[0]
    cf = int(0.01 * SR)
    for p in piezas[1:]:                                          # empalmes con fundido cruzado de 10 ms (en silencio)
        r = np.linspace(0, 1, cf)
        x = np.concatenate([x[:-cf], x[-cf:] * (1 - r) + p[:cf] * r, p[cf:]])
    tmp = f"salida/pistas/tramo_{nombre}.wav"
    sf.write(tmp, x, SR)
    run("ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"atempo={TEMPO}", tmp + ".r.wav")
    y, _ = sf.read(tmp + ".r.wav"); os.replace(tmp + ".r.wav", tmp)
    fi, fo = int(0.015 * SR), int(0.05 * SR)
    y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
    return y


# ── 3. línea de tiempo: cada escena dura lo que dura su voz; la animación se estira o se acelera
#       para calzar (acelerar como máximo ×acel_video_max para que se siga leyendo) ──
esc = PLAN["escenas"]
t = 0.0
for e in esc:
    corte = slice(int(e["desde"] * SR), int(e["hasta"] * SR))
    e["voz"] = acortar(voz[e["a"]][corte].copy(), analisis[e["a"]][corte], e["n"])
    V = e["v1"] - e["v0"]
    A = len(e["voz"]) / SR
    T = max(V / PLAN["acel_video_max"], PLAN["entrada"] + A + PLAN["salida"])
    e.update(V=V, A=A, T=T, f=T / V, t0=t)
    t += T
DUR = t + PLAN["cola_final"]
print(f"voz ×{TEMPO} · escena  video→salida   velocidad animación   voz")
for e in esc:
    print(f"  {e['n']}    {e['V']:5.2f}→{e['T']:5.2f} s   ×{1 / e['f']:.2f}   audio {e['a']} [{e['desde']:.2f}–{e['hasta']:.2f}] → {e['A']:.2f} s")
print(f"duración final: {DUR:.2f} s (fuente 64 s)")

n = int(DUR * SR)
pista_voz = np.zeros(n)
for e in esc:
    i0 = int((e["t0"] + PLAN["entrada"]) * SR)
    pista_voz[i0:i0 + len(e["voz"])] += e["voz"][: n - i0]

# ── 4. voz final: nivelador (sube los finales de frase que se apagan), compresión firme y control de eses ──
def nivelar(x):
    hop = int(0.01 * SR); k = len(x) // hop
    p = (kpond(x)[:k * hop].reshape(k, hop) ** 2).mean(1)
    Lm = 10 * np.log10(np.convolve(p, np.ones(30) / 30, "same") + 1e-12)       # sonoridad en ventanas de 300 ms
    ref = np.median(Lm[Lm > Lm.max() - 25])
    # respiraciones y ruidos sin voz: 150 ms o más con más energía en 1.2–4.5 kHz que en 80–900 Hz.
    # No se suben (no son finales de frase); se bajan 8 dB.
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    def banda(lo, hi):
        b = np.fft.irfft(X * ((f >= lo) & (f <= hi)), len(x))
        return np.convolve((b[:k * hop].reshape(k, hop) ** 2).mean(1), np.ones(15) / 15, "same")
    sorda = banda(80, 900) < banda(1200, 4500)
    resp = np.zeros(k, bool); i = 0
    while i < k:
        j = i
        while j < k and sorda[j]: j += 1
        if j - i >= 15: resp[i:j] = True
        i = max(j, i + 1)
    act = (Lm > ref - 18) & ~resp
    g = np.full(k, np.nan); g[act] = np.clip(0.75 * (ref - Lm[act]), -4, 8)
    idx = np.where(act)[0]; g = np.interp(np.arange(k), idx, g[idx])          # en silencio mantiene la ganancia vecina
    g = np.convolve(np.pad(g, 10, mode="edge"), np.ones(21) / 21, "valid")      # suave, sin bombeo
    m = np.convolve(np.pad(resp.astype(float), 2, mode="edge"), np.ones(5) / 5, "valid")   # rampas de 50 ms
    g = g * (1 - m) - 8 * m
    return x * 10 ** (np.interp(np.arange(len(x)) / hop, np.arange(k), g) / 20)


sf.write("salida/pistas/voz_nivelada.wav", nivelar(pista_voz), SR)
run("ffmpeg", "-v", "error", "-y", "-i", "salida/pistas/voz_nivelada.wav", "-af", ",".join([
    "equalizer=f=3200:t=q:w=1.2:g=2",                                         # presencia
    "acompressor=threshold=-21dB:ratio=3:attack=5:release=120:knee=4:makeup=2",
    "deesser=i=0.3",
    "alimiter=limit=0.9:attack=2:release=40:level=false"]), "salida/pistas/voz_completa.wav")
os.remove("salida/pistas/voz_nivelada.wav")
pista_voz = sf.read("salida/pistas/voz_completa.wav")[0][:n]


def quitar_eses(x, umbral=-6.0, max_db=9.0):
    """Baja la franja de 4.5–12 kHz solo en los instantes en que una «s» sobresale más de `umbral` dB
    respecto al cuerpo de la voz (200 Hz–3 kHz). El resto de la voz no se toca."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    alto = np.fft.irfft(X * ((f >= 4500) & (f <= 12000)), len(x))
    cuerpo = np.fft.irfft(X * ((f >= 200) & (f <= 3000)), len(x))
    h = int(0.005 * SR); k = len(x) // h
    pa = (alto[:k * h].reshape(k, h) ** 2).mean(1)
    pc = np.convolve((cuerpo[:k * h].reshape(k, h) ** 2).mean(1), np.ones(40) / 40, "same")   # cuerpo en 200 ms
    exceso = 10 * np.log10(pa + 1e-12) - 10 * np.log10(pc + 1e-12) - umbral
    red = np.clip(exceso, 0, max_db)
    g = np.zeros(k); y = 0.0
    for i in range(k):                                         # actúa en 5 ms, suelta en 40 ms
        y += (red[i] - y) * (1.0 if red[i] > y else 0.12)
        g[i] = y
    g = np.interp(np.arange(len(x)) / h, np.arange(k), g)
    return x - alto + alto * 10 ** (-g / 20)


pista_voz = quitar_eses(pista_voz)

# ── 5. música ambiental: pads en registro medio, arpegio tipo kalimba con eco, bajo con armónicos, shaker muy
#       suave y reverberación. Pensada para que se oiga también en el parlante de un celular. ──
rng = np.random.default_rng(11)
N = lambda m: 440 * 2 ** ((m - 69) / 12)
BPM = 84; pulso = 60 / BPM; compas = 4 * pulso
L = np.zeros(n); R = np.zeros(n)
seco_L = np.zeros(n); seco_R = np.zeros(n)                     # lo que no pasa por la reverb (bajo)


def put(x, t0, g, pan=0.0, rev=True):
    i = int(t0 * SR)
    if i >= n or i + len(x) <= 0: return
    if i < 0: x, i = x[-i:], 0
    x = x[: n - i]
    l, r = (L, R) if rev else (seco_L, seco_R)
    l[i:i + len(x)] += x * g * (1 - pan); r[i:i + len(x)] += x * g * (1 + pan)


def tt(d): return np.arange(int(d * SR)) / SR
def adsr(m, a, r):
    e = np.ones(m); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def pad(m, d):
    t = tt(d); f = N(m); x = np.zeros(len(t))
    for det in (-0.0025, 0.0025):                               # dos voces levemente desafinadas
        for k in range(1, 9):                                   # armónicos suaves (cálido, audible en celular)
            a = (1 / k ** 1.5) / (1 + (k * f / 2500) ** 2)
            x += a * np.sin(2 * np.pi * k * f * (1 + det) * t + k * 0.7 + det * 400)
    return x * adsr(len(t), 0.7, 1.4) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.2 * t))


def kalimba(m):
    t = tt(1.6); f = N(m)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)
         + 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 14))
    a = int(0.003 * SR); x[:a] *= np.linspace(0, 1, a)
    return x


def bajo(m, d):
    t = tt(d); f = N(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)
    return x * adsr(len(t), 0.25, 0.8)


def shaker():
    t = tt(0.09); x = rng.standard_normal(len(t)) * np.exp(-t * 55)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * ((f > 5000) & (f < 11000)), len(x))


prog = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]]   # Cmaj7 · Am7 · Fmaj7 · G6
fin_voz = max(e["t0"] + PLAN["entrada"] + e["A"] for e in esc)
for b in range(int(DUR / compas) + 1):
    ch = prog[b % 4]; t0 = b * compas
    intensidad = 0.75 if b < 2 else (1.15 if t0 >= esc[-1]["t0"] - 0.5 else 1.0)  # entra suave, se alegra al final
    for j, m in enumerate(ch):
        put(pad(m, compas + 1.4), t0, 0.035, pan=(j - 1.5) * 0.3)
    put(bajo(ch[0] - 24, compas + 0.6), t0, 0.10, rev=False)
    arp = [ch[0], ch[2], ch[1], ch[3], ch[2], ch[1] + 12, ch[3], ch[2]]            # una octava arriba del pad
    for q, m in enumerate(arp):
        acento = 1.0 if q % 2 == 0 else 0.72
        put(kalimba(m + 12), t0 + q * pulso / 2, 0.055 * acento * intensidad, pan=(-0.35 if q % 2 else 0.35))
    if b >= 2:
        for q in range(8):
            put(shaker(), t0 + q * pulso / 2 + 0.01, (0.012 if q % 2 else 0.007) * intensidad, pan=0.2)
    if b % 2 == 0:
        put(kalimba(ch[1] + 36), t0 + 0.02, 0.02 * intensidad, pan=-0.5)                   # destello agudo
# acorde final que suena cuando termina tu voz
for j, m in enumerate([60, 64, 67, 71, 74]):
    put(pad(m, DUR - fin_voz + 0.2), fin_voz - 0.2, 0.03, pan=(j - 2) * 0.25)
    put(kalimba(m + 12), fin_voz + 0.05 + j * 0.06, 0.05, pan=(j - 2) * 0.3)

# eco estéreo de corchea con puntillo y reverberación espacial (respuesta sintética de 2.4 s)
eco = int(0.75 * pulso * SR)
for k, g in ((1, 0.33), (2, 0.15)):
    L[eco * k:] += (R if k % 2 else L)[: n - eco * k] * g
    R[eco * k:] += (L if k % 2 else R)[: n - eco * k] * g
ti = tt(2.4)
def ir(sem):
    x = np.random.default_rng(sem).standard_normal(len(ti)) * np.exp(-ti * 6.9 / 2.4)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    x = np.fft.irfft(X / (1 + (f / 6000) ** 2), len(x)); x[: int(0.02 * SR)] = 0
    return x / np.sqrt(np.sum(x ** 2))
def convolver(x, h):
    m = 1 << int(np.ceil(np.log2(len(x) + len(h))))
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(h, m), m)[: len(x)]
L = L + 0.45 * convolver(L, ir(1)); R = R + 0.45 * convolver(R, ir(2))
musica = np.stack([L + seco_L, R + seco_R], 1)
fade = np.ones(n); fi, fo = int(0.6 * SR), int(1.5 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] *= np.linspace(1, 0, fo) ** 1.5
musica *= fade[:, None]

# ── 6. mezcla: en las pausas la música va ~8 dB bajo tu voz; cuando hablas baja 6 dB más, y otros 5 dB en la
#       franja de 1–5 kHz (donde se entienden las palabras), así la voz queda nítida ──
def sonoridad(x):                                              # potencia ponderada K de los momentos con señal
    hop = int(0.4 * SR); k = len(x) // hop
    p = (kpond(x)[:k * hop].reshape(k, hop) ** 2).mean(1)
    return 10 * np.log10(np.mean(p[p > p.max() * 10 ** (-2.5)]))
hop = int(0.01 * SR); k = n // hop
pv = np.convolve((pista_voz[:k * hop].reshape(k, hop) ** 2).mean(1), np.ones(15) / 15, "same")
activo = (10 * np.log10(pv + 1e-12) > 10 * np.log10(pv.max()) - 35).astype(float)
g = np.zeros(k); y = 0.0
for i in range(k):                                             # baja en 80 ms, vuelve a subir en ~500 ms
    y += (activo[i] - y) * (0.12 if activo[i] > y else 0.02)
    g[i] = y
g = np.interp(np.arange(n) / hop, np.arange(k), g)
musica *= 10 ** ((sonoridad(pista_voz) - 8 - sonoridad(musica.mean(1))) / 20)
F = np.fft.rfftfreq(n, 1 / SR)
banda = ((F > 1000) & (F < 5000)).astype(float)
mus_banda = np.fft.irfft(np.fft.rfft(musica, axis=0) * banda[:, None], n, axis=0)
musica = (musica - mus_banda) * 10 ** (-6 * g / 20)[:, None] + mus_banda * 10 ** (-11 * g / 20)[:, None]
mezcla = musica + pista_voz[:, None]
pico = np.abs(mezcla).max()
if pico > 0.95: mezcla *= 0.95 / pico
sf.write("salida/pistas/voz_completa.wav", pista_voz, SR)
sf.write("salida/pistas/musica_con_ducking.wav", musica, SR)
sf.write("salida/pistas/mezcla.wav", mezcla, SR)

# ── 7. video: cada escena estirada o acelerada a su duración (cuadros repetidos o saltados, sin deformar) + cola final ──
fc = []
for k, e in enumerate(esc):
    fc.append(f"[0:v]trim={e['v0']}:{e['v1']},setpts=(PTS-STARTPTS)*{e['f']:.5f},fps=30[v{k}]")
fc.append("".join(f"[v{k}]" for k in range(len(esc))) + f"concat=n={len(esc)}:v=1:a=0,tpad=stop_mode=clone:stop_duration={PLAN['cola_final']}[vout]")
run("ffmpeg", "-v", "error", "-y", "-i", FUENTE, "-i", "salida/pistas/mezcla.wav", "-filter_complex", ";".join(fc),
    "-map", "[vout]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "pcm_s16le", "-t", f"{DUR:.3f}", "salida/pistas/sin_normalizar.mkv")

# ── 8. volumen final -12 LUFS: ganancia medida + limitador que solo toca los picos (sin bombeo) ──
m = subprocess.run(["ffmpeg", "-hide_banner", "-i", "salida/pistas/sin_normalizar.mkv", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"): m.rindex("}") + 1])
ganancia = -12.0 - float(j["input_i"]) + 0.1
run("ffmpeg", "-v", "error", "-y", "-i", "salida/pistas/sin_normalizar.mkv", "-c:v", "copy",
    "-af", f"volume={ganancia:.2f}dB,alimiter=limit=0.8:attack=2:release=60:level=false",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "salida/DART_animacion_v3_narrado.mp4")
os.remove("salida/pistas/sin_normalizar.mkv")
json.dump([{k: e[k] for k in ("n", "v0", "v1", "a", "desde", "hasta", "A", "t0", "T", "f")} for e in esc], open("salida/pistas/linea_de_tiempo.json", "w"), indent=1)
print("listo: salida/DART_animacion_v3_narrado.mp4")
