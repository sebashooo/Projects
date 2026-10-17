import json, sys, numpy as np, soundfile as sf, subprocess
S=sys.argv[1]; SRC=sys.argv[2]; OUT=sys.argv[3]
sc=json.load(open(f"{S}/script.json")); durs=json.load(open(f"{S}/durs.json"))
LEAD, GAP, TAIL = 0.35, 0.3, 0.7
SR=24000
plan=[]; t0=0.0; events=[]; audio_parts=[]
for i,(s,d) in enumerate(zip(sc,durs)):
    orig=s["end"]-s["start"]
    need=LEAD+sum(d)+GAP*(len(d)-1)+TAIL
    if i==len(sc)-1: need+=1.0  # let the confetti breathe at the end
    new=max(orig,need); f=new/orig
    plan.append((s["start"],s["end"],f))
    t=t0+LEAD
    for j,dd in enumerate(d):
        a,_=sf.read(f"{S}/clips/{i}_{j}.wav")
        audio_parts.append((t,a)); events.append((t, t+dd, s["lines"][j][0])); t+=dd+GAP
    print(f"escena {i+1}: {orig}s -> {new:.2f}s (x{f:.2f})")
    t0+=new
total=t0
buf=np.zeros(int(total*SR)+SR)
for t,a in audio_parts: n=int(t*SR); buf[n:n+len(a)]+=a
peak=np.abs(buf).max(); buf=buf/peak*0.89
sf.write(f"{S}/narracion.wav", buf[:int(total*SR)], SR)
def ts(x):
    cs=int(round(x*100)); return f"{cs//360000}:{cs//6000%60:02d}:{cs//100%60:02d}.{cs%100:02d}"
ass="""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,DejaVu Sans,44,&H00FFFFFF,&H00FFFFFF,&H50301028,&H00000000,-1,0,0,0,100,100,0,0,3,12,0,2,180,180,44,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for k,(a,b,txt) in enumerate(events):
    nb = events[k+1][0] if k+1<len(events) else total
    end=min(b+0.25, nb-0.02)
    ass+=f"Dialogue: 0,{ts(a)},{ts(end)},Sub,,0,0,0,,{{\\fad(120,120)}}{txt}\n"
open(f"{S}/subs.ass","w").write(ass)
# video retiming
parts=[]; fc=""
for k,(a,b,f) in enumerate(plan):
    fc+=f"[0:v]trim={a}:{b},setpts=(PTS-STARTPTS)*{f:.5f},fps=30[v{k}];"
fc+="".join(f"[v{k}]" for k in range(len(plan)))+f"concat=n={len(plan)}:v=1:a=0[vc];[vc]ass={S}/subs.ass[vout]"
cmd=["ffmpeg","-v","error","-y","-i",SRC,"-i",f"{S}/narracion.wav","-filter_complex",fc,
     "-map","[vout]","-map","1:a","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p",
     "-c:a","aac","-b:a","192k","-ar","48000","-movflags","+faststart","-shortest",OUT]
subprocess.run(cmd,check=True); print("total", round(total,2))
