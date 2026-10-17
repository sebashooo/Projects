# Detecta las pausas reales de cada archivo de voz (para sincronizar subtítulos y demos con la voz).
#   python3 tools/pauses.py <NN> [<NN> …]  →  tools/pauses_<NN>.json  (por bloque: [[inicio, fin], …] en segundos)
import json, sys, glob
import numpy as np, soundfile as sf
for nn in sys.argv[1:]:
    out = []
    for f in sorted(glob.glob(f"assets/audio/vo/{nn}_*.wav")):
        a, sr = sf.read(f)
        if a.ndim > 1: a = a.mean(1)
        hop = int(0.01 * sr)
        rms = np.sqrt(np.convolve(a ** 2, np.ones(hop * 3) / (hop * 3), "same"))[::hop]
        thr = max(0.006, 0.08 * np.percentile(rms, 90))
        quiet = rms < thr
        ps, k = [], 0
        while k < len(quiet):
            if quiet[k]:
                j = k
                while j < len(quiet) and quiet[j]: j += 1
                s, e = k * 0.01, j * 0.01
                if e - s >= 0.11 and s > 0.15 and e < len(a) / sr - 0.15: ps.append([round(s, 3), round(e, 3)])
                k = j
            else: k += 1
        out.append(ps)
    json.dump(out, open(f"tools/pauses_{nn}.json", "w"))
    print(nn, "pausas por bloque:", [len(p) for p in out])
