#!/usr/bin/env bash
# Produce la guía completa: voz → composiciones → audio → render por capítulo → unión → -14 LUFS → SRT y capítulos.
#   KOKORO=<carpeta_modelo> bash tools/make.sh [NN …]     (sin NN: todos los capítulos de cap/*/spec.json, salvo 99)
# Es reanudable: un capítulo ya renderizado (renders/capNN.mp4 más nuevo que su spec) no se vuelve a renderizar.
set -euo pipefail
cd "$(dirname "$0")/.."
CAPS=("$@"); [ ${#CAPS[@]} -eq 0 ] && CAPS=($(ls cap | grep -v '^99$' | sort))
mkdir -p renders salida
for nn in "${CAPS[@]}"; do
  if [ -f "renders/cap$nn.mp4" ] && [ "renders/cap$nn.mp4" -nt "cap/$nn/spec.json" ] && [ "renders/cap$nn.mp4" -nt tools/build.mjs ]; then echo "cap $nn ya renderizado"; continue; fi
  [ -f "tools/vo_$nn.json" ] && [ "tools/vo_$nn.json" -nt "cap/$nn/spec.json" ] || python3 tools/vo.py "$KOKORO" "$nn"
  node tools/build.mjs "$nn"
  python3 tools/audio.py "$nn"
  echo "render cap $nn…"; t0=$(date +%s)
  npx hyperframes render "cap/$nn" -o "renders/cap$nn.mp4" --crf 22 --quiet > "renders/cap$nn.log" 2>&1
  echo "cap $nn listo en $(( $(date +%s) - t0 )) s"
done
# unir (todos los capítulos comparten códec, tamaño y FPS)
ALL=($(ls cap | grep -v '^99$' | sort))
: > renders/lista.txt
for nn in "${ALL[@]}"; do [ -f "renders/cap$nn.mp4" ] && echo "file 'cap$nn.mp4'" >> renders/lista.txt; done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i renders/lista.txt -c copy renders/guia-unida.mp4
m=$(ffmpeg -hide_banner -i renders/guia-unida.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$m" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -loglevel error -y -i renders/guia-unida.mp4 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  -c:a aac -b:a 160k -ar 48000 -movflags +faststart salida/guia-claude-video-y-animacion.mp4
# subtítulos e índice de capítulos con los tiempos reales de cada render
python3 - <<'PY'
import json, subprocess, glob, os
caps = sorted(d for d in os.listdir("cap") if d != "99" and os.path.exists(f"renders/cap{d}.mp4"))
off = 0.0; srt = []; idx = []; n = 1
ts = lambda x: f"{int(x//3600):02d}:{int(x//60)%60:02d}:{int(x)%60:02d},{int(round((x%1)*1000))%1000:03d}"
for c in caps:
    spec = json.load(open(f"cap/{c}/spec.json")); dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"renders/cap{c}.mp4"]))
    idx.append(f"{int(off//60):02d}:{int(off)%60:02d} {'Bienvenida' if spec['chapter']==0 else 'Capítulo %d · ' % spec['chapter']}{spec['title'] if spec['chapter'] else ''}".replace("Bienvenida","Bienvenida",1))
    for a, b, t in json.load(open(f"tools/srt_{c}.json")):
        srt.append(f"{n}\n{ts(off+a)} --> {ts(off+b)}\n{t}\n"); n += 1
    off += dur
open("salida/subtitulos.srt", "w").write("\n".join(srt))
open("salida/capitulos.txt", "w").write("\n".join(idx) + "\n")
print("duración total", round(off/60, 2), "min ·", len(caps), "capítulos")
PY
echo FIN
