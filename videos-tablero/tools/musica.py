# Música lo-fi de estudio, sintetizada aquí (sin derechos de terceros).
#   base (siempre): piano eléctrico en registro medio, bajo con armónicos y un pad suave
#   escritura (donde la máscara vale 1): entra un beat suave y una melodía tipo kalimba
import numpy as np

BPM = 84
PULSO = 60 / BPM
COMPAS = 4 * PULSO
SWING = 0.58                                                    # corcheas con swing
ACORDES = [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]]   # Fmaj7 · Em7 · Dm7 · Cmaj7
PENTA = [72, 74, 76, 79, 81, 84]                                 # do mayor pentatónica


def N(m): return 440 * 2 ** ((m - 69) / 12)


def generar(dur, escritura, SR, semilla=7):
    n = int(dur * SR)
    rng = np.random.default_rng(semilla)
    base_L, base_R = np.zeros(n), np.zeros(n)
    esc_L, esc_R = np.zeros(n), np.zeros(n)

    def tt(d): return np.arange(int(d * SR)) / SR

    def put(dst, x, t0, g, pan=0.0):
        L, R = dst
        i = int(t0 * SR)
        if i >= n or i + len(x) <= 0: return
        if i < 0: x, i = x[-i:], 0
        x = x[: n - i]
        L[i:i + len(x)] += x * g * (1 - pan); R[i:i + len(x)] += x * g * (1 + pan)

    def epiano(m, d):
        t = tt(d); f = N(m)
        idx = 1.1 * np.exp(-t * 3) + 0.25
        x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
        x += 0.15 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4)
        env = np.exp(-t * 1.1); a = int(0.004 * SR); env[:a] *= np.linspace(0, 1, a)
        r = int(0.08 * SR); env[-r:] *= np.linspace(1, 0, r)
        return x * env * (1 + 0.12 * np.sin(2 * np.pi * 4.5 * t))

    def bajo(m, d):
        t = tt(d); f = N(m)
        x = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)
        env = np.minimum(1, t / 0.01) * np.exp(-t * 1.6); r = int(0.05 * SR); env[-r:] *= np.linspace(1, 0, r)
        return x * env

    def pad(m, d):
        t = tt(d); f = N(m); x = np.zeros(len(t))
        for det in (-0.003, 0.003):
            for k in range(1, 6):
                x += (1 / k ** 1.6) * np.sin(2 * np.pi * k * f * (1 + det) * t + k)
        env = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8)
        return x * env

    def kalimba(m):
        t = tt(1.2); f = N(m)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 16)
        a = int(0.003 * SR); x[:a] *= np.linspace(0, 1, a)
        return x

    def filtrar(x, lo, hi):
        X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
        return np.fft.irfft(X * ((f >= lo) & (f <= hi)), len(x))

    bombo_t = tt(0.35)
    bombo = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-bombo_t * 30)) / SR) * np.exp(-bombo_t * 9)
    caja_t = tt(0.22)
    caja = filtrar(rng.standard_normal(len(caja_t)), 1200, 7000) * np.exp(-caja_t * 18) * 0.8 \
        + 0.5 * np.sin(2 * np.pi * 185 * caja_t) * np.exp(-caja_t * 25)
    hat_t = tt(0.06)
    hat = filtrar(rng.standard_normal(len(hat_t)), 7000, 14000) * np.exp(-hat_t * 70)

    nb = int(dur / COMPAS) + 2
    for b in range(nb):
        ch = ACORDES[b % 4]; t0 = b * COMPAS
        for j, m in enumerate(ch):                              # comping: tiempo 1 y el «y» del 2
            put((base_L, base_R), epiano(m, COMPAS), t0 + j * 0.008, 0.07, pan=(j - 1.5) * 0.2)
            put((base_L, base_R), epiano(m, 1.2), t0 + (1 + SWING) * PULSO + j * 0.008, 0.035, pan=(j - 1.5) * 0.2)
        raiz = ch[0] - 24
        put((base_L, base_R), bajo(raiz, 1.4 * PULSO), t0, 0.16)
        put((base_L, base_R), bajo(raiz + 7, 0.9 * PULSO), t0 + (2 + SWING) * PULSO, 0.11)
        put((base_L, base_R), pad(ch[1] - 12, COMPAS + 0.8), t0 - 0.4, 0.02)
        # escritura: beat y melodía
        for q in range(8):                                      # hi-hats en corcheas con swing
            tq = t0 + (q // 2) * PULSO + (q % 2) * SWING * PULSO
            put((esc_L, esc_R), hat, tq, 0.05 if q % 2 else 0.08, pan=0.25)
        for tb in (0, 2 + SWING):                               # bombo: 1 y el «y» del 3
            put((esc_L, esc_R), bombo, t0 + tb * PULSO, 0.32)
        for tb in (1, 3):                                       # caja suave
            put((esc_L, esc_R), caja, t0 + tb * PULSO, 0.16, pan=-0.1)
        motivo = rng.choice(PENTA, 4)                           # melodía sencilla: 4 notas por compás
        for q, (m, tb) in enumerate(zip(motivo, (0, 1 + SWING, 2, 3))):
            put((esc_L, esc_R), kalimba(int(m)), t0 + tb * PULSO + 0.01, 0.07 * (1 if q % 2 == 0 else 0.75), pan=(-0.3 if q % 2 else 0.3))

    # al empezar cada escritura: un arpegio corto de kalimba justo en el corte (anuncia el «time-lapse»)
    inicios = np.where(np.diff(np.concatenate([[0], (escritura[:n] > 0.5).astype(int)])) == 1)[0]
    for i0 in inicios:
        t0 = i0 / SR
        ch = ACORDES[int(t0 / COMPAS) % 4]
        for q, m in enumerate([ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12]):
            put((base_L, base_R), kalimba(m), t0 + 0.06 + q * 0.07, 0.075 * (1 - 0.12 * q), pan=-0.3 + 0.2 * q)

    # reverb corta para unir todo
    ti = tt(1.6)
    def ir(sem):
        x = np.random.default_rng(sem).standard_normal(len(ti)) * np.exp(-ti * 6.9 / 1.6)
        X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
        x = np.fft.irfft(X / (1 + (f / 5000) ** 2), len(x)); x[: int(0.015 * SR)] = 0
        return x / np.sqrt(np.sum(x ** 2))
    def conv(x, h):
        m = 1 << int(np.ceil(np.log2(len(x) + len(h))))
        return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(h, m), m)[: len(x)]

    # la máscara de escritura entra y sale en 0.2 s, dentro de la escritura (no pisa la voz)
    r = int(0.2 * SR); c = np.concatenate([[0], np.cumsum(escritura[:n])]); i = np.arange(n)
    m = np.minimum((c[i + 1] - c[np.maximum(i + 1 - r, 0)]) / r, (c[np.minimum(i + r, n)] - c[i]) / r)
    L = base_L + esc_L * m; R = base_R + esc_R * m
    L = L + 0.25 * conv(L, ir(1)); R = R + 0.25 * conv(R, ir(2))
    fade = np.ones(n); fi, fo = int(1.0 * SR), int(2.0 * SR)
    fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    return L * fade, R * fade
