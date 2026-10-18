# Genera salida/subtitulos.srt con los mismos grupos de una línea que se ven en el video.
#   python3 tools/srt.py   (después de renderizar todos los capítulos)
import json, re, subprocess, os
caps = sorted(d for d in os.listdir("cap") if d != "99" and os.path.exists(f"renders/cap{d}.mp4"))
off, out = 0.0, []
ts = lambda x: f"{int(x//3600):02d}:{int(x//60)%60:02d}:{int(x)%60:02d},{int(round((x%1)*1000))%1000:03d}"
for c in caps:
    groups = json.loads(re.search(r"const CAPS = (\[.*?\]);\n", open(f"cap/{c}/index.html").read()).group(1))
    for s, e, ws in groups:
        out.append(f"{len(out)+1}\n{ts(off+s)} --> {ts(off+e)}\n{' '.join(w[1] for w in ws)}\n")
    off += float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"renders/cap{c}.mp4"]))
open("salida/subtitulos.srt", "w").write("\n".join(out))
print(len(out), "subtítulos ·", round(off / 60, 2), "min")
