#!/usr/bin/env bash
# Renderiza las 3 versiones, normaliza a -14 LUFS (2 pasadas) y exporta la portada.
#   bash tools/finish.sh
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/build.mjs
python3 tools/audio.py
mkdir -p renders salida
render() { npx hyperframes render "$1" -o "renders/$2.mp4" --quality delivery --quiet --skill general-video; }
render . managerapp-30s-vertical
render variantes/corto-15s managerapp-15s-vertical
render variantes/cuadrado-30s managerapp-30s-cuadrado
for n in managerapp-30s-vertical managerapp-15s-vertical managerapp-30s-cuadrado; do
  case $n in *15s*) dur=15;; *) dur=30;; esac
  m=$(ffmpeg -hide_banner -i "renders/$n.mp4" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  get() { echo "$m" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
  ffmpeg -hide_banner -loglevel error -y -i "renders/$n.mp4" -c:v copy \
    -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
    -c:a aac -b:a 192k -ar 48000 -t "$dur" -movflags +faststart "salida/$n.mp4"
done
ffmpeg -hide_banner -loglevel error -y -ss 2.6 -i salida/managerapp-30s-vertical.mp4 -frames:v 1 salida/portada.png
