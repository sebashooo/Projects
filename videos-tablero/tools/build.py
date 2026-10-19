# Videos del tablero: une los 4 videos, mejora imagen y sonido, acelera las explicaciones un poco (voz natural)
# y las partes en que se escribe en el tablero bastante más, con música en lugar del audio original.
#   python3 tools/build.py   →  salida/matematicas_planeta.mp4  (+ pistas en salida/pistas/)
# Qué parte es explicación y qué parte es escritura está en tools/tramos.json.
import hashlib, json, os, subprocess, sys
import numpy as np
import soundfile as sf

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
SR, FPS, W, H = 48000, 30, 1080, 1920
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
CFG = json.load(open(ARGS[0] if ARGS else "tools/tramos.json"))
RETRASO_AFFTDN = 1199                                      # afftdn retrasa la voz 24.98 ms (medido); se compensa
P = "salida/pistas"
os.makedirs(P, exist_ok=True)
VOZ = {"explica"}                                          # tramos que conservan el audio original
MUSICA = {"escribe"}                                       # tramos donde la música pasa al frente


def run(*a):
    subprocess.run(a, check=True)


def velocidad(tipo):
    return CFG["velocidades"][tipo]


# ── 1. tramos → cuadros exactos en la salida (así imagen y sonido nunca se desfasan) ──
for v in CFG["videos"]:
    for tr in v["tramos"]:
        tr["cuadros"] = max(1, round((tr["fin"] - tr["inicio"]) / velocidad(tr["tipo"]) * FPS))
    v["cuadros"] = sum(tr["cuadros"] for tr in v["tramos"])
FUNDIDO = CFG["fundido_entre_videos"]
fc = round(FUNDIDO * FPS)
t = 0
for k, v in enumerate(CFG["videos"]):
    v["t0"] = t                                             # inicio del video k en la salida (cuadros)
    t += v["cuadros"] - (fc if k < len(CFG["videos"]) - 1 else 0)
TOTAL = t
print(f"duración: {sum(tr['fin'] - tr['inicio'] for v in CFG['videos'] for tr in v['tramos']):.1f} s originales → {TOTAL / FPS:.1f} s")


# ── 2. voz: limpieza, mismo timbre y mismo nivel en los 4 videos ──
BANDAS = 100 * 2 ** (np.arange(21) / 3)


def perfil(x):
    h = 4096; k = len(x) // h; fr = x[:k * h].reshape(k, h)
    e = (fr ** 2).mean(1); fr = fr[e > np.percentile(e, 60)]
    Pw = (np.abs(np.fft.rfft(fr * np.hanning(h), axis=1)) ** 2).mean(0); f = np.fft.rfftfreq(h, 1 / SR)
    p = np.array([10 * np.log10(Pw[(f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))].mean()) for c in BANDAS])
    return p - p[(BANDAS >= 200) & (BANDAS <= 1000)].mean()


def ecualizar(x, gdb):
    X = np.fft.rfft(x); f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1)
    return np.fft.irfft(X * 10 ** (np.interp(np.log2(f), np.log2(BANDAS), gdb) / 20), len(x))


def kpond(x):
    X = np.fft.rfft(x); f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1); r = (f / 1681) ** 2
    return np.fft.irfft(X * f ** 2 / (f ** 2 + 38 ** 2) * 10 ** (4 * r / (1 + r) / 20), len(x))


def nivel_voz(x):
    """Sonoridad (ponderada K) de los momentos con voz, en dB."""
    h = int(0.4 * SR); k = len(x) // h
    p = (kpond(x)[:k * h].reshape(k, h) ** 2).mean(1)
    return 10 * np.log10(np.mean(p[p > p.max() * 10 ** (-2)]))


audio = {}
for k, v in enumerate(CFG["videos"], 1):
    out = f"{P}/voz_{k}_limpia.wav"
    run("ffmpeg", "-v", "error", "-y", "-i", v["archivo"], "-vn", "-af", ",".join(
        ["highpass=f=90", "afftdn=nr=12:nf=-50:tn=1"] + v.get("filtros_audio", [])), "-ac", "1", "-ar", str(SR), out)
    a = sf.read(out)[0]
    audio[k] = np.concatenate([a[RETRASO_AFFTDN:], np.zeros(RETRASO_AFFTDN)])   # sincronía con los labios
perfiles = {k: perfil(x) for k, x in audio.items()}
meta = np.mean(list(perfiles.values()), 0)
for k, x in audio.items():
    g = np.clip(meta - perfiles[k], -6, 6)
    g = np.convolve(np.pad(g, 1, mode="edge"), [0.25, 0.5, 0.25], "valid")
    y = ecualizar(x, g)
    audio[k] = y * 10 ** ((-24 - nivel_voz(y)) / 20)
    sf.write(f"{P}/voz_{k}_limpia.wav", audio[k], SR)


# ── 3. pista de voz en la línea de tiempo final (atempo en las explicaciones, silencio al escribir) ──
n = round(TOTAL / FPS * SR)
pista_voz = np.zeros(n)
escritura = np.zeros(n)                                    # 1 donde se escribe (la música pasa al frente)
sin_voz = np.zeros(n)                                      # 1 donde no hay voz (escritura y pausas): la música no se agacha
for k, v in enumerate(CFG["videos"], 1):
    x = audio[k]; partes = []
    for tr in v["tramos"]:
        largo = round(tr["cuadros"] / FPS * SR)
        if tr["tipo"] in VOZ:
            seg = x[int(tr["inicio"] * SR): int(tr["fin"] * SR)] * 10 ** (tr.get("ganancia_db", 0) / 20)
            vel = velocidad(tr["tipo"])
            if abs(vel - 1) > 1e-3:
                sf.write(f"{P}/_tmp.wav", seg, SR)
                run("ffmpeg", "-v", "error", "-y", "-i", f"{P}/_tmp.wav", "-af", f"atempo={vel}", f"{P}/_tmp2.wav")
                seg = sf.read(f"{P}/_tmp2.wav")[0]
            seg = np.pad(seg, (0, max(0, largo - len(seg))))[:largo]
            m, s0 = np.zeros(largo), np.zeros(largo)
        else:
            seg = np.zeros(largo); m = np.full(largo, float(tr["tipo"] in MUSICA)); s0 = np.ones(largo)
        partes.append((seg, m, s0))
    # fundidos en cada cambio de tramo: 30 ms de entrada y 80 ms de salida (la cola de la palabra se apaga, no se corta)
    fi, fo = int(0.03 * SR), int(0.08 * SR)
    for i, (seg, m, s0) in enumerate(partes):
        if i > 0: seg[:fi] *= np.linspace(0, 1, fi)
        if i < len(partes) - 1: seg[-fo:] *= np.linspace(1, 0, fo)
    clip = np.concatenate([p[0] for p in partes]); mclip = np.concatenate([p[1] for p in partes])
    sclip = np.concatenate([p[2] for p in partes])
    i0 = round(v["t0"] / FPS * SR)
    if k > 1:                                              # fundido cruzado igual al de la imagen
        fs = round(FUNDIDO * SR); r = np.linspace(0, 1, fs)
        pista_voz[i0:i0 + fs] *= np.cos(r * np.pi / 2)
        clip = clip.copy(); clip[:fs] *= np.sin(r * np.pi / 2)
    fin = min(n, i0 + len(clip))
    pista_voz[i0:fin] += clip[:fin - i0]
    escritura[i0:fin] = np.maximum(escritura[i0:fin], mclip[:fin - i0])
    sin_voz[i0:fin] = np.maximum(sin_voz[i0:fin], sclip[:fin - i0])
ini, fin_ = int(0.25 * SR), int(0.6 * SR)                  # el video entra y sale con fundido
pista_voz[:ini] *= np.linspace(0, 1, ini); pista_voz[-fin_:] *= np.linspace(1, 0, fin_)
for f_ in ("_tmp.wav", "_tmp2.wav"):
    if os.path.exists(f"{P}/{f_}"): os.remove(f"{P}/{f_}")


# ── 4. voz final: nivelador (iguala frases suaves y fuertes), presencia, compresión, eses y limitador ──
def nivelar(x):
    hop = int(0.01 * SR); k = len(x) // hop
    p = (kpond(x)[:k * hop].reshape(k, hop) ** 2).mean(1)
    Lm = 10 * np.log10(np.convolve(p, np.ones(40) / 40, "same") + 1e-12)
    ref = np.median(Lm[Lm > Lm.max() - 25])
    # respiraciones y ruidos sin voz: 150 ms o más con más energía en 1.2–4.5 kHz que en 80–900 Hz → se bajan 8 dB
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
    act = (Lm > ref - 12) & ~resp                              # solo frases con voz de verdad
    g = np.full(k, np.nan); g[act] = np.clip(0.6 * (ref - Lm[act]), -5, 4)
    idx = np.where(act)[0]; g = np.interp(np.arange(k), idx, g[idx])
    g[~act] = np.minimum(g[~act], 0)                           # las pausas nunca se suben
    g = np.convolve(np.pad(g, 50, mode="edge"), np.ones(101) / 101, "valid")   # lento (1 s): no aplana las sílabas
    m = np.convolve(np.pad(resp.astype(float), 2, mode="edge"), np.ones(5) / 5, "valid")
    g = g * (1 - m) - 8 * m
    return x * 10 ** (np.interp(np.arange(len(x)) / hop, np.arange(k), g) / 20)


nivelada = nivelar(pista_voz)
h50 = int(0.05 * SR); kk = len(nivelada) // h50
rms = 20 * np.log10(np.sqrt((nivelada[:kk * h50].reshape(kk, h50) ** 2).mean(1)) + 1e-12)
umbral = np.median(rms[rms > rms.max() - 20]) - 12          # 12 dB bajo la voz: ahí empieza el expansor
sf.write(f"{P}/_niv.wav", nivelada, SR)
run("ffmpeg", "-v", "error", "-y", "-i", f"{P}/_niv.wav", "-af", ",".join([
    f"agate=threshold={10 ** (umbral / 20):.5f}:ratio=3:range=0.15:attack=8:release=150:knee=3",   # baja el ruido de sala
    "equalizer=f=3000:t=q:w=1.2:g=2.5",
    "acompressor=threshold=-22dB:ratio=2:attack=8:release=150:knee=6:makeup=2",
    "deesser=i=0.3",
    "alimiter=limit=0.9:attack=2:release=40:level=false"]), f"{P}/voz_completa.wav")
os.remove(f"{P}/_niv.wav")
pista_voz = np.pad(sf.read(f"{P}/voz_completa.wav")[0], (0, n))[:n]
sf.write(f"{P}/voz_completa.wav", pista_voz, SR)

# ── 5. música ── (tools/musica.py: base lo-fi suave; al escribir entra el beat y la melodía)
sys.path.insert(0, "tools")
import musica
L, R = musica.generar(n / SR, escritura, SR)
musica_st = np.stack([L, R], 1)

# ── 6. mezcla: la música va suave bajo la voz y sube cuando escriben ──
hop = int(0.01 * SR); k = n // hop
pv = np.convolve((pista_voz[:k * hop].reshape(k, hop) ** 2).mean(1), np.ones(15) / 15, "same")
activo = (10 * np.log10(pv + 1e-12) > 10 * np.log10(pv.max()) - 35).astype(float)
g = np.zeros(k); y = 0.0
for i in range(k):
    y += (activo[i] - y) * (0.12 if activo[i] > y else 0.02)
    g[i] = y
g = np.interp(np.arange(n) / hop, np.arange(k), g)


def rampa(mask, seg):
    """Suaviza los bordes de una máscara 0/1 sin adelantarlos: sube después del inicio y baja antes del final."""
    r = int(seg * SR); c = np.concatenate([[0], np.cumsum(mask)])
    i = np.arange(len(mask))
    causal = (c[i + 1] - c[np.maximum(i + 1 - r, 0)]) / r
    anti = (c[np.minimum(i + r, len(mask))] - c[i]) / r
    return np.minimum(causal, anti)


g *= 1 - rampa(sin_voz, 0.15)                              # en escritura y pausas la música no se agacha
nv = nivel_voz(pista_voz); nm = nivel_voz(musica_st.mean(1))
musica_st *= 10 ** ((nv - CFG["musica_bajo_voz_db"] - nm) / 20)          # nivel de la base en pausas
me = rampa(escritura, 0.2)                                 # al escribir la música pasa al frente
mo = rampa(sin_voz * (1 - escritura), 0.15)                # en las pausas cortas sube un poco (sin hueco)
musica_st *= 10 ** ((CFG["musica_escritura_extra_db"] * me + CFG["musica_pausa_extra_db"] * mo) / 20)[:, None]
F = np.fft.rfftfreq(n, 1 / SR); banda = ((F > 1000) & (F < 5000)).astype(float)
mb = np.fft.irfft(np.fft.rfft(musica_st, axis=0) * banda[:, None], n, axis=0)
musica_st = (musica_st - mb) * 10 ** (-6 * g / 20)[:, None] + mb * 10 ** (-11 * g / 20)[:, None]
mezcla = musica_st + pista_voz[:, None]
pico = np.abs(mezcla).max()
if pico > 0.95: mezcla *= 0.95 / pico
sf.write(f"{P}/musica_con_ducking.wav", musica_st, SR)
sf.write(f"{P}/mezcla.wav", mezcla, SR)

# ── 7. imagen: cada tramo mejorado (ruido, bloques, nitidez, color) y a su velocidad ──
os.makedirs(f"{P}/tramos", exist_ok=True)
for k, v in enumerate(CFG["videos"], 1):
    gr, gg, gb = v["color"]
    mejora = ",".join([
        f"fps={FPS}", "hqdn3d=2:1.5:4:4", "deblock=filter=strong:block=8",
        f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos", f"crop={W}:{H}",
        "cas=strength=0.6", "eq=contrast=1.06:saturation=1.12:gamma=1.03",
        f"colorchannelmixer=rr={gr:.4f}:gg={gg:.4f}:bb={gb:.4f}"])
    lista = []
    for i, tr in enumerate(v["tramos"]):
        clave = hashlib.sha1(f"{v['archivo']}|{tr['inicio']}|{tr['fin']}|{velocidad(tr['tipo'])}|{tr['cuadros']}|{mejora}".encode()).hexdigest()[:10]
        out = f"{P}/tramos/v{k}_{clave}.mp4"                 # si el tramo no cambió, se reutiliza
        lista.append(out)
        if os.path.exists(out): continue
        run("ffmpeg", "-v", "error", "-y", "-ss", f"{tr['inicio']:.3f}", "-to", f"{tr['fin']:.3f}", "-i", v["archivo"], "-an",
            "-vf", f"{mejora},setpts=(PTS-STARTPTS)/{velocidad(tr['tipo'])},fps={FPS},tpad=stop_mode=clone:stop=-1",
            "-frames:v", str(tr["cuadros"]), "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", out)
    with open(f"{P}/tramos/v{k}.txt", "w") as f:
        f.writelines(f"file '{os.path.basename(x)}'\n" for x in lista)
    run("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{P}/tramos/v{k}.txt", "-c", "copy", f"{P}/tramos/video_{k}.mp4")
    print(f"video {k}: {len(lista)} tramos, {v['cuadros'] / FPS:.1f} s")

# ── 8. unión con fundido cruzado entre videos + audio final a -12 LUFS ──
ins, fg, prev = [], [], "[0:v]"
for k in range(1, len(CFG["videos"]) + 1):
    ins += ["-i", f"{P}/tramos/video_{k}.mp4"]
for k in range(1, len(CFG["videos"])):
    off = CFG["videos"][k]["t0"] / FPS
    fg.append(f"{prev}[{k}:v]xfade=transition=fade:duration={FUNDIDO}:offset={off:.4f}[x{k}]"); prev = f"[x{k}]"
na = len(CFG["videos"])
run("ffmpeg", "-v", "error", "-y", *ins, "-i", f"{P}/mezcla.wav", "-filter_complex", ";".join(fg) + f";{prev}fade=t=in:st=0:d=0.25,fade=t=out:st={TOTAL / FPS - 0.6:.3f}:d=0.6,format=yuv420p[vout]",
    "-map", "[vout]", "-map", f"{na}:a", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-maxrate", "3500k", "-bufsize", "7000k", "-c:a", "pcm_s16le",
    "-t", f"{TOTAL / FPS:.3f}", f"{P}/sin_normalizar.mkv")
m = subprocess.run(["ffmpeg", "-hide_banner", "-i", f"{P}/sin_normalizar.mkv", "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                   capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"): m.rindex("}") + 1])
ganancia = CFG["lufs"] - float(j["input_i"]) + 0.1
run("ffmpeg", "-v", "error", "-y", "-i", f"{P}/sin_normalizar.mkv", "-c:v", "copy",
    "-af", f"volume={ganancia:.2f}dB,alimiter=limit=0.8:attack=2:release=60:level=false",
    "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-movflags", "+faststart", f"salida/{CFG['salida']}")
os.remove(f"{P}/sin_normalizar.mkv")
json.dump([{"video": k, **{x: tr[x] for x in ("inicio", "fin", "tipo", "cuadros")}} for k, v in enumerate(CFG["videos"], 1) for tr in v["tramos"]],
          open(f"{P}/linea_de_tiempo.json", "w"), indent=1)
print(f"listo: salida/{CFG['salida']}")
