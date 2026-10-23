#!/usr/bin/env python3
"""Arma un video vertical 1080x1920 estilo TikTok "POV": título fijo, imagen con zoom lento,
voz de edge-tts y subtítulos con la palabra que se está diciendo en verde.

    python crear_video.py                                  # historia.json + imagenes/ (+ musica.mp3 si existe)
    python crear_video.py --historia otra.json --imagenes otra_carpeta

Con todas las imágenes sale video_final.mp4; si falta alguna, prueba.mp4 solo con las escenas que tienen imagen.
"""
import argparse
import asyncio
import json
import re
import subprocess
import sys
import time
import unicodedata
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import comun

# ── diseño ──
W, H, FPS = 1080, 1920, 30
TITULO_Y, TITULO_PX = 320, 58
TITULO_PAD_V, TITULO_PAD_H, TITULO_RADIO, TITULO_MARGEN = 14, 26, 18, 24
IMG_Y, IMG_W, IMG_H = 555, 1080, 810
TRABAJO = (1620, 1215)              # cada imagen se prepara a 1,5x para que el zoom no pierda nitidez
ZOOM_FIN = 1.06
FUNDIDO = 0.3
PAUSA = 0.4
SUB_Y, SUB_PX, SUB_BORDE, SUB_ANCHO_MAX = 1500, 64, 5, 980
CIERRE_SEG, CIERRE_PX, CIERRE_Y = 2.0, 70, 1500
VERDE, BLANCO, NEGRO = (0x39, 0xFF, 0x7A), (255, 255, 255), (0, 0, 0)
# ── audio ──
SR = 48000
MUSICA_BASE, MUSICA_CON_VOZ, MUSICA_FADE_OUT = 0.12, 0.08, 1.5
VOZ_DEFECTO = {"voz": "es-CO-GonzaloNeural", "rate": "+8%", "pitch": "-2Hz"}


# ═══ voz ═══
async def _sintetizar(texto, voz, mp3):
    import edge_tts
    opciones = {"rate": voz["rate"], "pitch": voz["pitch"]}
    try:
        com = edge_tts.Communicate(texto, voz["voz"], boundary="WordBoundary", **opciones)
    except TypeError:                     # edge-tts < 7 ya entrega WordBoundary por defecto
        com = edge_tts.Communicate(texto, voz["voz"], **opciones)
    palabras = []
    with open(mp3, "wb") as f:
        async for trozo in com.stream():
            if trozo["type"] == "audio":
                f.write(trozo["data"])
            elif trozo["type"] == "WordBoundary":
                palabras.append({"texto": trozo["text"], "inicio": trozo["offset"] / 1e7,
                                 "fin": (trozo["offset"] + trozo["duration"]) / 1e7})
    return palabras


def voz_de_escena(n, texto, voz, carpeta):
    """mp3 y tiempos de cada palabra (WordBoundary). Reutiliza los de otra corrida si el texto y la voz no cambiaron."""
    mp3, meta = carpeta / f"escena_{n:02d}.mp3", carpeta / f"escena_{n:02d}.json"
    firma = {"texto": texto, **voz}
    if mp3.exists() and meta.exists():
        guardado = json.loads(meta.read_text(encoding="utf-8"))
        if guardado.get("firma") == firma:
            return mp3, guardado["palabras"]
    error = None
    for intento in range(3):
        try:
            palabras = asyncio.run(_sintetizar(texto, voz, mp3))
            if mp3.stat().st_size > 0:
                break
            error = "el audio llegó vacío"
        except Exception as e:
            error = e
            if "Invalid voice" in str(e):
                mp3.unlink(missing_ok=True)
                sys.exit(f"La voz «{voz['voz']}» no existe en edge-tts. En historia.json pon solo el nombre de la voz,\n"
                         'por ejemplo "es-VE-SebastianNeural" (sin el número ni ".mp3" del archivo de muestra).')
        time.sleep(2 * (intento + 1))
    else:
        mp3.unlink(missing_ok=True)
        sys.exit(f"No pude generar la voz de la escena {n} con edge-tts: {error}\n"
                 "edge-tts usa el servidor de voz de Microsoft, así que necesita internet. Revisa la conexión y vuelve a correr.")
    meta.write_text(json.dumps({"firma": firma, "palabras": palabras}, ensure_ascii=False, indent=1), encoding="utf-8")
    return mp3, palabras


def recortar_silencio(audio, umbral_db=-45, margen=0.05):
    """Quita el silencio del principio y del final del clip; devuelve (audio, segundos quitados al inicio)."""
    sonido = np.flatnonzero(np.abs(audio[:, 0]) > 10 ** (umbral_db / 20))
    if not len(sonido):
        return audio, 0.0
    a = max(0, sonido[0] - int(margen * SR))
    b = min(len(audio), sonido[-1] + int(margen * SR))
    return audio[a:b], a / SR


def normalizar(texto):
    texto = unicodedata.normalize("NFKD", texto.lower())
    return "".join(c for c in texto if c.isalnum())


def tiempos_por_palabra(texto, limites, desplazamiento, duracion):
    """Une cada palabra del texto (con su puntuación) a su WordBoundary. Las que no aparezcan se interpolan."""
    tokens = []
    for t in texto.split():
        if normalizar(t) or not tokens:
            tokens.append({"texto": t})
        else:                              # signos sueltos («—», «…») van con la palabra anterior
            tokens[-1]["texto"] += " " + t
    limites = [{**l, "clave": normalizar(l["texto"])} for l in limites]
    j = 0
    for tok in tokens:
        clave = normalizar(tok["texto"])
        ventana = range(j, min(j + 4, len(limites)))
        k = next((k for k in ventana if limites[k]["clave"] == clave), None)
        if k is None:
            k = next((k for k in ventana if limites[k]["clave"] and
                      (clave.startswith(limites[k]["clave"]) or limites[k]["clave"].startswith(clave))), None)
        if k is not None:
            tok["inicio"] = max(0.0, limites[k]["inicio"] - desplazamiento)
            tok["fin"] = max(tok["inicio"], limites[k]["fin"] - desplazamiento)
            j = k + 1
    if not any("inicio" in t for t in tokens):
        print("  aviso: edge-tts no entregó tiempos de palabras; los estimo por la longitud del texto")
        letras = np.cumsum([0] + [len(t["texto"]) + 1 for t in tokens])
        for i, t in enumerate(tokens):
            t["inicio"] = duracion * letras[i] / letras[-1]
            t["fin"] = duracion * letras[i + 1] / letras[-1]
        return tokens
    i = 0
    while i < len(tokens):                 # rellena huecos repartiendo el tiempo entre vecinos con tiempo
        if "inicio" in tokens[i]:
            i += 1
            continue
        k = i
        while k < len(tokens) and "inicio" not in tokens[k]:
            k += 1
        desde = tokens[i - 1]["fin"] if i > 0 else 0.0
        hasta = tokens[k]["inicio"] if k < len(tokens) else duracion
        paso = max(hasta - desde, 0.0) / (k - i)
        for m in range(i, k):
            tokens[m]["inicio"] = desde + paso * (m - i)
            tokens[m]["fin"] = tokens[m]["inicio"] + paso
        i = k
    return tokens


def agrupar(tokens):
    """Grupos de 3 a 5 palabras; cierra antes si termina una frase."""
    grupos, actual = [], []
    for tok in tokens:
        actual.append(tok)
        termina_frase = re.search(r"[.,;:!?…»”\"]$", tok["texto"])
        if len(actual) == 5 or (len(actual) >= 3 and termina_frase):
            grupos.append(actual)
            actual = []
    if actual:
        if grupos and len(actual) < 3:
            junto = grupos.pop() + actual
            if len(junto) <= 5:
                grupos.append(junto)
            else:
                mitad = (len(junto) + 1) // 2
                grupos += [junto[:mitad], junto[mitad:]]
        else:
            grupos.append(actual)
    return grupos


# ═══ gráficos ═══
def rect_redondeado(d, caja, radios):
    """Rectángulo con un radio por esquina (arriba-izq, arriba-der, abajo-der, abajo-izq)."""
    x0, y0, x1, y1 = caja
    d.rectangle(caja, fill=255)
    tl, tr, br, bl = radios
    for r, esquina, centro in ((tl, (x0, y0), (x0 + tl, y0 + tl)), (tr, (x1 - tr, y0), (x1 - tr, y0 + tr)),
                               (br, (x1 - br, y1 - br), (x1 - br, y1 - br)), (bl, (x0, y1 - bl), (x0 + bl, y1 - bl))):
        if r <= 0:
            continue
        d.rectangle([esquina[0], esquina[1], esquina[0] + r, esquina[1] + r], fill=0)
        d.ellipse([centro[0] - r, centro[1] - r, centro[0] + r, centro[1] + r], fill=255)


def capa_titulo(texto, ruta_fuente):
    """Título en 2 líneas, cada una en su caja blanca ajustada al texto, unidas como en TikTok."""
    palabras = texto.split()
    px = TITULO_PX
    while True:
        fuente = ImageFont.truetype(str(ruta_fuente), px)
        if len(palabras) == 1:
            lineas = [texto]
        else:
            k = min(range(1, len(palabras)), key=lambda k: max(fuente.getlength(" ".join(palabras[:k])),
                                                                fuente.getlength(" ".join(palabras[k:]))))
            lineas = [" ".join(palabras[:k]), " ".join(palabras[k:])]
        if max(fuente.getlength(l) for l in lineas) + 2 * (TITULO_PAD_H + TITULO_MARGEN) <= W or px <= 36:
            break
        px -= 2
    if px != TITULO_PX:
        print(f"  aviso: el título no cabía a {TITULO_PX} px; lo dejé en {px} px")
    tintas = [fuente.getbbox(l, anchor="ls") for l in lineas]
    arriba, abajo = min(c[1] for c in tintas), max(c[3] for c in tintas)
    alto = (abajo - arriba) + 2 * TITULO_PAD_V
    anchos = [fuente.getlength(l) + 2 * TITULO_PAD_H for l in lineas]
    rects = [((W - a) / 2, i * alto, (W + a) / 2, (i + 1) * alto) for i, a in enumerate(anchos)]
    S = 4                                   # máscara a 4x para bordes suaves
    mascara = Image.new("L", (W * S, alto * len(lineas) * S), 0)
    d = ImageDraw.Draw(mascara)
    for i, (x0, y0, x1, y1) in enumerate(rects):
        radios = [TITULO_RADIO] * 4
        for vecino, esquinas in ((i - 1, (0, 1)), (i + 1, (2, 3))):
            if 0 <= vecino < len(rects):
                otro = rects[vecino][2] - rects[vecino][0]
                r = 0 if (x1 - x0) <= otro else min(TITULO_RADIO, ((x1 - x0) - otro) / 2)
                for e in esquinas:
                    radios[e] = r
        rect_redondeado(d, [v * S for v in (x0, y0, x1, y1)], [r * S for r in radios])
    for i in range(1, len(rects)):         # curvas cóncavas donde la caja angosta toca la ancha
        a, b = rects[i - 1], rects[i]
        r = min(TITULO_RADIO, abs((a[2] - a[0]) - (b[2] - b[0])) / 2)
        if r < 1:
            continue
        union = a[3]
        angosta, angosta_arriba = (a, True) if (a[2] - a[0]) < (b[2] - b[0]) else (b, False)
        for borde, lado in ((angosta[0], -1), (angosta[2], 1)):
            cx, cy = borde + lado * r, union - r if angosta_arriba else union + r
            qx0, qy0 = min(borde, cx), union - r if angosta_arriba else union
            d.rectangle([qx0 * S, qy0 * S, (qx0 + r) * S, (qy0 + r) * S], fill=255)
            d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=0)
    mascara = mascara.resize((W, alto * len(lineas)), Image.LANCZOS)
    capa = Image.new("RGBA", mascara.size, (0, 0, 0, 0))
    capa.paste(Image.new("RGBA", mascara.size, BLANCO + (255,)), (0, 0), mascara)
    dt = ImageDraw.Draw(capa)
    for i, l in enumerate(lineas):
        dt.text((W / 2, i * alto + TITULO_PAD_V - arriba), l, font=fuente, fill=NEGRO, anchor="ms")
    return capa


class Subtitulos:
    """Dibuja un grupo de palabras, blanco con borde negro, con la palabra activa en verde."""

    def __init__(self, ruta_fuente):
        self.fuente = ImageFont.truetype(str(ruta_fuente), SUB_PX)
        self.espacio = self.fuente.getlength(" ")
        self.mayuscula = -self.fuente.getbbox("H", anchor="ls")[1]
        self.interlinea = round(SUB_PX * 1.18)
        self.cache = {}

    def _lineas(self, palabras):
        ancho = lambda ps: sum(self.fuente.getlength(p) for p in ps) + self.espacio * (len(ps) - 1)
        if ancho(palabras) <= SUB_ANCHO_MAX or len(palabras) < 2:
            return [palabras]
        k = min(range(1, len(palabras)), key=lambda k: max(ancho(palabras[:k]), ancho(palabras[k:])))
        return [palabras[:k], palabras[k:]]

    def capa(self, clave, palabras, activa):
        """(imagen RGBA recortada, x, y) para pegar en el cuadro; centrada en SUB_Y."""
        if (clave, activa) in self.cache:
            return self.cache[(clave, activa)]
        if len(self.cache) > 12:
            self.cache.clear()
        lineas = self._lineas(palabras)
        alto = 400
        img = Image.new("RGBA", (W, alto), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        centro = alto / 2
        primera_base = centro + self.mayuscula / 2 - self.interlinea * (len(lineas) - 1) / 2
        posiciones, i = [], 0
        for n, linea in enumerate(lineas):
            ancho = sum(self.fuente.getlength(p) for p in linea) + self.espacio * (len(linea) - 1)
            x = (W - ancho) / 2
            for p in linea:
                posiciones.append((x, primera_base + n * self.interlinea, p, i == activa))
                x += self.fuente.getlength(p) + self.espacio
                i += 1
        for x, y, p, _ in posiciones:          # 1.º todos los bordes, 2.º los rellenos (así ningún borde tapa una letra)
            d.text((x, y), p, font=self.fuente, fill=NEGRO, anchor="ls", stroke_width=SUB_BORDE, stroke_fill=NEGRO)
        for x, y, p, es_activa in posiciones:
            d.text((x, y), p, font=self.fuente, fill=VERDE if es_activa else BLANCO, anchor="ls")
        caja = img.getbbox()
        recorte = img.crop(caja)
        resultado = (np.asarray(recorte), caja[0], round(SUB_Y - centro) + caja[1])
        self.cache[(clave, activa)] = resultado
        return resultado


def capa_texto_centrado(texto, ruta_fuente, px, y_centro):
    fuente = ImageFont.truetype(str(ruta_fuente), px)
    mayuscula = -fuente.getbbox("H", anchor="ls")[1]
    img = Image.new("RGBA", (W, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((W / 2, 150 + mayuscula / 2), texto, font=fuente, fill=NEGRO, anchor="ms", stroke_width=SUB_BORDE, stroke_fill=NEGRO)
    d.text((W / 2, 150 + mayuscula / 2), texto, font=fuente, fill=BLANCO, anchor="ms")
    caja = img.getbbox()
    return np.asarray(img.crop(caja)), caja[0], y_centro - 150 + caja[1]


def pegar(cuadro, rgba, x, y, opacidad=1.0):
    """Mezcla una capa RGBA (array) sobre el cuadro RGB en (x, y)."""
    h, w = rgba.shape[:2]
    zona = cuadro[y:y + h, x:x + w].astype(np.uint16)
    alfa = rgba[:, :, 3:4].astype(np.uint16)
    if opacidad < 1:
        alfa = (alfa * opacidad).astype(np.uint16)
    cuadro[y:y + h, x:x + w] = ((rgba[:, :, :3] * alfa + zona * (255 - alfa)) // 255).astype(np.uint8)


def preparar_imagen(ruta):
    """Recorta a 4:3 y escala con Lanczos; a las pequeñas (512 px) les da un poco de nitidez."""
    im = Image.open(ruta).convert("RGB")
    w, h = im.size
    if w / h > 4 / 3:
        nw = round(h * 4 / 3)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < 4 / 3:
        nh = round(w * 3 / 4)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    aumento = TRABAJO[0] / im.width
    im = im.resize(TRABAJO, Image.LANCZOS)
    if aumento >= 2.5:
        im = im.filter(ImageFilter.UnsharpMask(radius=2.4, percent=80, threshold=2))
    elif aumento > 1.2:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=50, threshold=2))
    return im


def imagen_con_zoom(im, zoom):
    cw, ch = TRABAJO[0] / zoom, TRABAJO[1] / zoom
    x0, y0 = (TRABAJO[0] - cw) / 2, (TRABAJO[1] - ch) / 2
    return im.resize((IMG_W, IMG_H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))


# ═══ audio ═══
def suavizar(x, segundos):
    k = max(1, int(segundos * SR))
    c = np.cumsum(np.concatenate([[0.0], x]))
    y = (c[k:] - c[:-k]) / k
    return np.pad(y, (k // 2, len(x) - len(y) - k // 2), mode="edge")


def mezclar_audio(escenas, total, musica, destino):
    n = int(round(total * SR))
    voz = np.zeros(n, np.float32)
    hay_voz = np.zeros(n, np.float32)
    for e in escenas:
        a = int(round(e["inicio"] * SR))
        clip = e["audio"][:, 0][: n - a]
        voz[a:a + len(clip)] += clip
        hay_voz[a:a + len(clip)] = 1
    mezcla = np.repeat(voz[:, None], 2, axis=1)
    if musica:
        m = comun.decodificar_audio(musica, SR, 2)
        if len(m):
            m = np.tile(m, (int(np.ceil(n / len(m))), 1))[:n]
            ganancia = MUSICA_BASE - (MUSICA_BASE - MUSICA_CON_VOZ) * suavizar(hay_voz, 0.25)
            t = np.arange(n) / SR
            ganancia *= np.clip(t / 0.3, 0, 1) * np.clip((total - t) / MUSICA_FADE_OUT, 0, 1)
            mezcla += m * ganancia[:, None].astype(np.float32)
            print(f"  música: {Path(musica).name} en bucle al {MUSICA_BASE:.0%} (al {MUSICA_CON_VOZ:.0%} con voz)")
    pico = float(np.abs(mezcla).max()) if n else 0
    if pico > 0.999:
        mezcla *= 0.999 / pico
    with wave.open(str(destino), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((mezcla * 32767).astype("<i2").tobytes())


# ═══ armado ═══
def main():
    comun.preparar_consola()
    ap = argparse.ArgumentParser(description="Arma el video vertical a partir de historia.json e imagenes/.")
    ap.add_argument("--historia", default="historia.json")
    ap.add_argument("--imagenes", default="imagenes")
    ap.add_argument("--musica", default="musica.mp3", help="si el archivo no existe, el video va sin música")
    ap.add_argument("--salida", help="nombre del video (por defecto prueba.mp4 o video_final.mp4)")
    args = ap.parse_args()

    historia = comun.cargar_historia(args.historia)
    carpeta_img = Path(args.imagenes) if Path(args.imagenes).is_absolute() else comun.RAIZ / args.imagenes
    voz = {**VOZ_DEFECTO, **historia.get("voz", {})}
    # acepta también el nombre del archivo de muestra de probar_voces.py ("04_es-VE-SebastianNeural.mp3")
    voz["voz"] = re.sub(r"^\d+_", "", Path(voz["voz"].strip()).name.removesuffix(".mp3"))
    fuentes = comun.asegurar_fuentes()
    ffmpeg = comun.ffmpeg_exe()

    con_imagen, faltan = [], []
    for esc in historia["escenas"]:
        ruta = comun.buscar_imagen(carpeta_img, int(esc["n"]))
        (con_imagen if ruta else faltan).append((esc, ruta))
    if not con_imagen:
        sys.exit(f"No hay imágenes escena_XX en {carpeta_img}")
    completo = not faltan
    salida = comun.RAIZ / (args.salida or ("video_final.mp4" if completo else "prueba.mp4"))
    if faltan:
        print(f"MODO PRUEBA: faltan las escenas {', '.join(str(e['n']) for e, _ in faltan)}. "
              f"Armo {salida.name} con {len(con_imagen)} escenas.")

    carpeta_audio = comun.RAIZ / "audio"
    carpeta_audio.mkdir(exist_ok=True)
    print(f"Voz: {voz['voz']} (rate {voz['rate']}, pitch {voz['pitch']})")
    escenas, inicio = [], 0.0
    for esc, ruta in con_imagen:
        n = int(esc["n"])
        mp3, limites = voz_de_escena(n, esc["narracion"].strip(), voz, carpeta_audio)
        audio, recorte = recortar_silencio(comun.decodificar_audio(mp3, SR, 1))
        dur_voz = len(audio) / SR
        tokens = tiempos_por_palabra(esc["narracion"], limites, recorte, dur_voz)
        escenas.append({"n": n, "inicio": inicio, "dur": dur_voz + PAUSA, "audio": audio,
                        "grupos": agrupar(tokens), "imagen": preparar_imagen(ruta)})
        print(f"  escena {n:02d}: {dur_voz + PAUSA:5.2f} s · {ruta.name}")
        inicio += dur_voz + PAUSA
    fin_escenas = inicio
    total = fin_escenas + CIERRE_SEG
    for i, e in enumerate(escenas):         # tramo en que se ve cada imagen (incluye su fundido de entrada)
        e["vis_ini"] = 0.0 if i == 0 else e["inicio"] - FUNDIDO
        e["vis_fin"] = total if i == len(escenas) - 1 else e["inicio"] + e["dur"]

    titulo = capa_titulo(historia["titulo"], fuentes["Montserrat-Bold.ttf"])
    base = Image.new("RGB", (W, H), NEGRO)
    base.paste(titulo, ((W - titulo.width) // 2, TITULO_Y), titulo)
    base = np.asarray(base).copy()
    subs = Subtitulos(fuentes["Montserrat-ExtraBold.ttf"])
    cierre = capa_texto_centrado(historia.get("cierre", "Parte 2 en mi perfil"),
                                 fuentes["Montserrat-ExtraBold.ttf"], CIERRE_PX, CIERRE_Y)

    temporal = comun.RAIZ / "audio" / "_mezcla.wav"
    musica = Path(args.musica) if Path(args.musica).is_absolute() else comun.RAIZ / args.musica
    mezclar_audio(escenas, total, musica if musica.exists() else None, temporal)

    cuadros = int(round(total * FPS))
    cuadro_preview = min(int(5 * FPS), cuadros - 1)
    proceso = subprocess.Popen(
        [ffmpeg, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-i", str(temporal), "-map", "0:v", "-map", "1:a",
         "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(salida)],
        stdin=subprocess.PIPE)
    print(f"Renderizando {cuadros} cuadros…")
    reloj, ultimo_aviso = time.time(), -1
    actual = 0
    for c in range(cuadros):
        t = c / FPS
        while actual + 1 < len(escenas) and t >= escenas[actual + 1]["inicio"]:
            actual += 1
        e = escenas[actual]
        zoom = lambda esc: 1 + (ZOOM_FIN - 1) * min(1.0, max(0.0, (t - esc["vis_ini"]) / (esc["vis_fin"] - esc["vis_ini"])))
        img = imagen_con_zoom(e["imagen"], zoom(e))
        if actual + 1 < len(escenas) and t >= escenas[actual + 1]["vis_ini"]:
            sig = escenas[actual + 1]
            img = Image.blend(img, imagen_con_zoom(sig["imagen"], zoom(sig)), (t - sig["vis_ini"]) / FUNDIDO)
        cuadro = base.copy()
        cuadro[IMG_Y:IMG_Y + IMG_H] = np.asarray(img)

        if t < fin_escenas:
            local = t - e["inicio"]
            grupos = e["grupos"]
            g = max((k for k, gr in enumerate(grupos) if gr[0]["inicio"] <= local), default=None)
            if g is not None:
                activa = max(k for k, tok in enumerate(grupos[g]) if tok["inicio"] <= local)
                rgba, x, y = subs.capa((e["n"], g), [tok["texto"] for tok in grupos[g]], activa)
                pegar(cuadro, rgba, x, y)
        else:
            rgba, x, y = cierre
            pegar(cuadro, rgba, x, y, min(1.0, (t - fin_escenas) / 0.25))

        if c == cuadro_preview:
            Image.fromarray(cuadro).save(comun.RAIZ / "preview.png")
        proceso.stdin.write(cuadro.tobytes())
        avance = int(100 * (c + 1) / cuadros) // 10
        if avance != ultimo_aviso:
            ultimo_aviso = avance
            print(f"  {avance * 10:3d} %  ({time.time() - reloj:.0f} s)")
    proceso.stdin.close()
    if proceso.wait() != 0:
        sys.exit("ffmpeg falló al codificar el video")
    temporal.unlink(missing_ok=True)
    m, s = divmod(total, 60)
    print(f"\nListo: {salida.name} · {int(m)}:{s:04.1f} ({total:.1f} s) · {len(escenas)} escenas · preview.png = segundo 5")
    if faltan:
        print(f"Cuando estén las escenas que faltan, vuelve a correr: {comun.comando_python()} crear_video.py")


if __name__ == "__main__":
    main()
