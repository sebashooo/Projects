# Voz de la guía con Kokoro (voz masculina «em_alex»), un archivo por bloque.
#   python3 tools/vo.py <carpeta_modelo_kokoro> <NN> [<NN> …]
#   → assets/audio/vo/<NN>_<BB>.wav y tools/vo_<NN>.json (duraciones)
import json, re, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

VOICE, SPEED = "em_alex", 1.0
# pronunciación: el motor lee en español «a la letra»
SAY = [
    (r"\bClaude Code\b", "Clod Cod"), (r"\bClaude\b", "Clod"), (r"\bAnthropic\b", "Ánzropic"),
    (r"\bHyperFrames\b", "Jáiper Freims"), (r"\bGSAP\b", "yi sap"), (r"\bFFmpeg\b", "efe efe em peg"),
    (r"\bRemotion\b", "Rimóshon"), (r"\bKokoro\b", "Kokóro"), (r"\bTikTok\b", "Tiktok"), (r"\bYouTube\b", "Yutub"),
    (r"\bReels\b", "Rils"), (r"\bInstagram\b", "Ínstagram"), (r"\bWhatsApp\b", "Guatsap"), (r"\bWhisper\b", "Uísper"),
    (r"\bPython\b", "Páiton"), (r"\bNode\b", "Noud"), (r"\bNumPy\b", "Nam Pai"), (r"\bChromium\b", "Crómium"),
    (r"\bGitHub\b", "Guit Jab"), (r"\bHugging Face\b", "Jáguin Feis"), (r"\bnpm\b", "ene pe eme"), (r"\bPyPI\b", "pai pi ai"),
    (r"\bHTML\b", "hache te eme ele"), (r"\bCSS\b", "ce ese ese"), (r"\bSVG\b", "ese uve ge"), (r"\bJSON\b", "yéison"),
    (r"\bSRT\b", "ese erre te"), (r"\bMP4\b", "eme pe cuatro"), (r"\bMOV\b", "mov"), (r"\bWebM\b", "uéb eme"),
    (r"\bGIF\b", "guif"), (r"\bPNG\b", "pe ene ge"), (r"\bLUFS\b", "lufs"), (r"\bCPU\b", "ce pe u"), (r"\bGPU\b", "ye pe u"),
    (r"\bH\.?264\b", "hache doscientos sesenta y cuatro"), (r"\bAAC\b", "a a ce"), (r"\bCTA\b", "ce te a"),
    (r"\bKen Burns\b", "Ken Berns"), (r"\blower thirds?\b", "lóuer zerds"), (r"\bmotion graphics\b", "móushon gráfics"),
    (r"\bstoryboards?\b", "estóribord"), (r"\bbriefs?\b", "brif"), (r"\bManager App\b", "Mánayer Ap"),
    (r"\bTrendy Sneakers\b", "Trendi Sníkers"), (r"\bTrendy\b", "Trendi"), (r"\bDART\b", "Dart"), (r"\bNASA\b", "Nasa"),
    (r"\bGeist\b", "Gáist"), (r"\bwhip\b", "uip"), (r"\bzoom\b", "zum"), (r"\bkaraoke\b", "karaóke"), (r"\bsneakers\b", "sníkers"),
    (r"\bDESIGN\.md\b", "el archivo de diseño"), (r"\bfps\b", "cuadros por segundo"), (r"\bonline\b", "onlain"),
    (r"\bRadio\b", "Radio"), (r"\bRAM\b", "ram"), (r"\bIA\b", "i a"), (r"\b1080p\b", "mil ochenta pe"),
    (r"\bfeedback\b", "fidbak"), (r"\brender(s)?\b", r"rénder\1"), (r"\bscroll\b", "escrol"), (r"\bhook\b", "juk"),
]
def spoken(t):
    for a, b in SAY: t = re.sub(a, b, t, flags=re.I)
    return t.replace("9:16", "nueve dieciséis").replace("16:9", "dieciséis nueve").replace("1:1", "uno a uno")

k = Kokoro(f"{sys.argv[1]}/kokoro-v1.0.onnx", f"{sys.argv[1]}/voices-v1.0.bin")
for nn in sys.argv[2:]:
    beats = json.load(open(f"cap/{nn}/spec.json"))["beats"]
    durs = []
    for i, b in enumerate(beats):
        a, sr = k.create(spoken(b["narration"]), voice=VOICE, speed=SPEED, lang="es")
        idx = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.08 * sr)]
        sf.write(f"assets/audio/vo/{nn}_{i:02d}.wav", a, sr)
        durs.append(round(len(a) / sr, 3))
    json.dump(durs, open(f"tools/vo_{nn}.json", "w"))
    print(nn, "bloques", len(durs), "voz", round(sum(durs), 1), "s", flush=True)
