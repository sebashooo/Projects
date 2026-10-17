import json, sys, soundfile as sf, os
from kokoro_onnx import Kokoro
S=sys.argv[1]; speed=float(sys.argv[2])
k = Kokoro(f"{S}/tts/kokoro-v1.0.onnx", f"{S}/tts/voices-v1.0.bin")
sc = json.load(open(f"{S}/script.json")); os.makedirs(f"{S}/clips", exist_ok=True)
out=[]
for i,s in enumerate(sc):
    tot=0; d=[]
    for j,(sub,spk) in enumerate(s["lines"]):
        a,sr = k.create(spk, voice="ef_dora", speed=speed, lang="es")
        sf.write(f"{S}/clips/{i}_{j}.wav", a, sr); d.append(len(a)/sr); tot+=len(a)/sr
    print(i, s["end"]-s["start"], round(tot,1), [round(x,1) for x in d])
    out.append(d)
json.dump(out, open(f"{S}/durs.json","w"))
