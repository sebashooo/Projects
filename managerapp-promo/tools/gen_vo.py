# Genera la voz con Kokoro (ef_dora) por línea, recorta silencios y guarda WAV 24 kHz.
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
MODEL = sys.argv[1]; SPEED = float(sys.argv[2])
k = Kokoro(f"{MODEL}/kokoro-v1.0.onnx", f"{MODEL}/voices-v1.0.bin")
lines = json.load(open("tools/vo_lines.json")); out = {}
for key, (shown, spoken) in lines.items():
    a, sr = k.create(spoken, voice="ef_dora", speed=SPEED, lang="es")
    env = np.abs(a) > 0.01; idx = np.where(env)[0]
    a = a[max(0, idx[0] - int(0.03*sr)): idx[-1] + int(0.08*sr)]
    sf.write(f"assets/audio/vo_{key}.wav", a, sr); out[key] = round(len(a)/sr, 3)
    print(key, out[key], shown)
json.dump(out, open("tools/vo_durations.json", "w"), indent=1)
