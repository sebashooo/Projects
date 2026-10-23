"""Utilidades compartidas: rutas, .env, ffmpeg, fuentes e historia."""
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
CARPETA_FUENTES = RAIZ / "fuentes"
EXTENSIONES_IMAGEN = (".png", ".jpg", ".jpeg", ".webp")

# Montserrat estática desde Google Fonts (la API CSS entrega .ttf a clientes sin navegador)
FUENTES = {"Montserrat-Bold.ttf": 700, "Montserrat-ExtraBold.ttf": 800}
CSS_GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800"
# respaldo: repositorio oficial de la fuente, del que Google Fonts toma sus archivos
RESPALDO_FUENTES = "https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/"


def preparar_consola():
    """Evita errores con tildes y ñ en la consola de Windows."""
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8")
        except Exception:
            pass


def sistema():
    """'Windows', 'Mac' o 'Linux'."""
    return {"Windows": "Windows", "Darwin": "Mac"}.get(platform.system(), "Linux")


def comando_python():
    return "python" if sistema() == "Windows" else "python3"


def leer_env(ruta=RAIZ / ".env"):
    """Carga KEY=VALOR del .env sin pisar variables que ya existan en el sistema."""
    valores = {}
    if ruta.exists():
        for linea in ruta.read_text(encoding="utf-8").splitlines():
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            clave, valor = linea.split("=", 1)
            valores[clave.strip()] = valor.strip().strip('"').strip("'")
    for clave, valor in valores.items():
        os.environ.setdefault(clave, valor)
    return {**valores, **{k: os.environ[k] for k in valores if k in os.environ}}


def ffmpeg_exe():
    """ffmpeg del sistema; si no hay, el que trae el paquete imageio-ffmpeg."""
    ruta = shutil.which("ffmpeg")
    if ruta:
        return ruta
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    instrucciones = {
        "Windows": "winget install --id Gyan.FFmpeg -e   (y abre una consola nueva)",
        "Mac": "brew install ffmpeg",
        "Linux": "sudo apt install ffmpeg",
    }
    sys.exit(f"No encontré ffmpeg. Corre: {comando_python()} instalar.py\n"
             f"o instálalo a mano en {sistema()}: {instrucciones[sistema()]}")


def decodificar_audio(ruta, sr=48000, canales=1):
    """Devuelve el audio como float32 (muestras, canales) usando ffmpeg."""
    import numpy as np
    salida = subprocess.run(
        [ffmpeg_exe(), "-v", "error", "-i", str(ruta), "-f", "f32le", "-ac", str(canales), "-ar", str(sr), "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(salida, dtype=np.float32).reshape(-1, canales)


def _descargar(url, destino):
    with urllib.request.urlopen(url, timeout=30) as r:
        datos = r.read()
    if len(datos) < 10000:
        raise ValueError(f"archivo demasiado pequeño desde {url}")
    destino.write_bytes(datos)


def asegurar_fuentes():
    """Descarga Montserrat Bold y ExtraBold a fuentes/ si faltan."""
    CARPETA_FUENTES.mkdir(exist_ok=True)
    faltan = [n for n in FUENTES if not (CARPETA_FUENTES / n).exists()]
    if not faltan:
        return {n: CARPETA_FUENTES / n for n in FUENTES}
    print("Descargando Montserrat de Google Fonts…")
    urls = {}
    try:
        with urllib.request.urlopen(CSS_GOOGLE_FONTS, timeout=30) as r:
            css = r.read().decode("utf-8")
        for bloque in css.split("@font-face")[1:]:
            peso = re.search(r"font-weight:\s*(\d+)", bloque)
            url = re.search(r"url\((https://[^)]+\.ttf)\)", bloque)
            if peso and url:
                urls[int(peso.group(1))] = url.group(1)
    except Exception as e:
        print(f"  Google Fonts no respondió ({e}); uso el repositorio oficial de Montserrat.")
    for nombre in faltan:
        destino = CARPETA_FUENTES / nombre
        fuentes_url = [u for u in (urls.get(FUENTES[nombre]), RESPALDO_FUENTES + nombre) if u]
        for url in fuentes_url:
            try:
                _descargar(url, destino)
                print(f"  {nombre} listo")
                break
            except Exception as e:
                print(f"  no pude bajar {nombre} de {url}: {e}")
        else:
            sys.exit(f"Falta la fuente {nombre}. Descárgala de https://fonts.google.com/specimen/Montserrat "
                     f"y ponla en {CARPETA_FUENTES}")
    return {n: CARPETA_FUENTES / n for n in FUENTES}


def buscar_imagen(carpeta, n):
    """escena_XX con cualquier extensión aceptada; si hay varias, la más reciente."""
    candidatas = [Path(carpeta) / f"escena_{n:02d}{ext}" for ext in EXTENSIONES_IMAGEN]
    existentes = [c for c in candidatas if c.exists()]
    return max(existentes, key=lambda p: p.stat().st_mtime) if existentes else None


def resolver_ruta(texto):
    """Ruta relativa a la carpeta del proyecto; acepta otra extensión de imagen si la indicada no existe."""
    ruta = Path(texto)
    if not ruta.is_absolute():
        ruta = RAIZ / ruta
    if ruta.exists():
        return ruta
    for ext in EXTENSIONES_IMAGEN:
        alternativa = ruta.with_suffix(ext)
        if alternativa.exists():
            return alternativa
    return None


def cargar_historia(ruta):
    ruta = Path(ruta)
    if not ruta.is_absolute():
        ruta = RAIZ / ruta
    if not ruta.exists():
        sys.exit(f"No encuentro {ruta}")
    historia = json.loads(ruta.read_text(encoding="utf-8"))
    if not historia.get("titulo") or not historia.get("escenas"):
        sys.exit(f"{ruta.name} necesita 'titulo' y 'escenas'")
    for escena in historia["escenas"]:
        if "n" not in escena or not str(escena.get("narracion", "")).strip():
            sys.exit(f"Cada escena de {ruta.name} necesita 'n' y 'narracion' (revisa: {escena})")
    return historia
