#!/usr/bin/env python3
"""Genera con Gemini las escenas que todavía no tienen imagen (las que tienen "imagen" en historia.json).

    python generar_imagenes.py                  # todas las pendientes; no toca las que ya existen
    python generar_imagenes.py --escena 12      # rehace solo la 12 (la anterior queda en imagenes/anteriores/)
    python generar_imagenes.py --listar-modelos # muestra los modelos de imagen que tu clave puede usar

Necesita GEMINI_API_KEY en el archivo .env (copia .env.example como .env y pega tu clave).
"""
import argparse
import io
import os
import re
import sys
import time
from pathlib import Path

from PIL import Image

import comun

AYUDA_CLAVE = ("Crea la clave en https://aistudio.google.com/apikey y pégala en el archivo .env de esta carpeta:\n"
               "    GEMINI_API_KEY=tu_clave\n"
               "(si no existe .env, copia .env.example y renómbralo a .env)")


def instruccion_referencias(referencias):
    frases = []
    for i, r in enumerate(referencias, 1):
        if "ficha" in r.stem.lower():
            frases.append(f"Reference image {i} is the CHARACTER SHEET: the main character must look exactly like it.")
        else:
            frases.append(f"Reference image {i} shows the exact art style and character to match; do not copy its composition.")
    return " ".join(frases + ["Create a NEW image for the scene described below."]) if frases else ""


def modelos_de_imagen(cliente):
    nombres = []
    for m in cliente.models.list():
        nombre = (m.name or "").split("/")[-1]
        acciones = getattr(m, "supported_actions", None) or []
        if "image" in nombre and "imagen" not in nombre and (not acciones or "generateContent" in acciones):
            nombres.append(nombre)
    return nombres


def prioridad(nombre):
    """Primero la familia Flash (la más barata), luego la versión más nueva y las estables antes que las preview."""
    version = tuple(int(x) for x in re.findall(r"\d+", nombre.split("-image")[0])[:2]) or (0,)
    return ("pro" in nombre, tuple(-v for v in version), "preview" in nombre or "exp" in nombre)


def mime(ruta):
    return {".png": "image/png", ".webp": "image/webp"}.get(ruta.suffix.lower(), "image/jpeg")


def a_4x3(im):
    w, h = im.size
    if abs(w / h - 4 / 3) < 0.01:
        return im
    if w / h > 4 / 3:
        nw = round(h * 4 / 3)
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = round(w * 3 / 4)
    return im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))


def generar(cliente, types, modelo, prompt, referencias):
    """Devuelve (imagen PIL o None, motivo si no hubo imagen)."""
    partes = [types.Part.from_bytes(data=r.read_bytes(), mime_type=mime(r)) for r in referencias] + [prompt]
    config = dict(response_modalities=["TEXT", "IMAGE"])
    try:
        resp = cliente.models.generate_content(model=modelo, contents=partes, config=types.GenerateContentConfig(
            **config, image_config=types.ImageConfig(aspect_ratio="4:3")))
    except Exception as e:
        if "aspect" not in str(e).lower() and "image_config" not in str(e).lower():
            raise
        resp = cliente.models.generate_content(model=modelo, contents=partes,          # modelo sin opción de proporción
                                               config=types.GenerateContentConfig(**config))
    textos = []
    for cand in resp.candidates or []:
        for parte in (cand.content.parts if cand.content else None) or []:
            if getattr(parte, "inline_data", None) and parte.inline_data.data:
                return Image.open(io.BytesIO(parte.inline_data.data)), None
            if getattr(parte, "text", None):
                textos.append(parte.text.strip())
    motivo = " ".join(textos)
    if not motivo:
        bloqueo = getattr(getattr(resp, "prompt_feedback", None), "block_reason", None)
        final = resp.candidates[0].finish_reason if resp.candidates else None
        motivo = f"sin imagen (bloqueo: {bloqueo or '-'}, fin: {final or '-'})"
    return None, motivo


def main():
    comun.preparar_consola()
    ap = argparse.ArgumentParser(description="Genera con Gemini las imágenes de escena que faltan.")
    ap.add_argument("--escena", type=int, nargs="+", help="rehace estas escenas aunque ya existan")
    ap.add_argument("--historia", default="historia.json")
    ap.add_argument("--imagenes", default="imagenes")
    ap.add_argument("--modelo", help="fuerza un modelo (por ejemplo gemini-2.5-flash-image)")
    ap.add_argument("--listar-modelos", action="store_true")
    args = ap.parse_args()
    seguir = f"Puedes seguir con el video usando las imágenes que ya tienes: {comun.comando_python()} crear_video.py"

    comun.leer_env()
    clave = os.environ.get("GEMINI_API_KEY", "").strip()
    if not clave or clave.lower().startswith("pega"):
        print("No encontré GEMINI_API_KEY.\n" + AYUDA_CLAVE + "\n" + seguir)
        return 2
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print(f"Falta el paquete google-genai. Corre: {comun.comando_python()} instalar.py\n{seguir}")
        return 2

    historia = comun.cargar_historia(args.historia)
    carpeta = Path(args.imagenes) if Path(args.imagenes).is_absolute() else comun.RAIZ / args.imagenes
    carpeta.mkdir(exist_ok=True)
    cliente = genai.Client(api_key=clave)

    try:
        disponibles = sorted(modelos_de_imagen(cliente), key=prioridad)
    except Exception as e:
        print(f"La API de Gemini no respondió: {str(e)[:160]}\n¿La clave es correcta? {AYUDA_CLAVE}\n{seguir}")
        return 1
    if args.listar_modelos:
        print("Modelos de imagen disponibles con tu clave (el primero es el que uso por defecto):")
        for m in disponibles:
            print("  " + m)
        return 0
    modelo = args.modelo or os.environ.get("GEMINI_MODELO_IMAGEN") or (disponibles[0] if disponibles else None)
    if not modelo:
        print(f"Tu clave no tiene ningún modelo de generación de imágenes de Gemini disponible.\n{seguir}")
        return 1
    print(f"Modelo: {modelo}  (cada imagen se cobra en tu cuenta de Google AI; precios: https://ai.google.dev/gemini-api/docs/pricing)")

    referencias = []
    for texto in historia.get("referencias", ["ficha_personaje.jpg", "imagenes/escena_08.jpg"]):
        ruta = comun.resolver_ruta(texto)
        if ruta:
            referencias.append(ruta)
        else:
            print(f"  aviso: no encontré la referencia {texto}; el personaje puede salir menos parecido")
    print("Referencias: " + (", ".join(r.name for r in referencias) or "ninguna"))

    forzadas = set(args.escena or [])
    pendientes = []
    for esc in historia["escenas"]:
        n = int(esc["n"])
        if forzadas and n not in forzadas:
            continue
        if not esc.get("imagen"):
            if n in forzadas:
                print(f"  la escena {n} no tiene descripción 'imagen' en {Path(args.historia).name}")
            continue
        if comun.buscar_imagen(carpeta, n) and n not in forzadas:
            continue
        pendientes.append(esc)
    if not pendientes:
        print("No hay escenas pendientes: todas las que tienen descripción ya tienen imagen.")
        return 0

    estilo = historia.get("estilo", "").strip()
    hechas, fallidas = [], []
    for esc in pendientes:
        n = int(esc["n"])
        prompt = "\n\n".join(p for p in (instruccion_referencias(referencias), estilo, "SCENE: " + esc["imagen"]) if p)
        print(f"Escena {n:02d}: generando…", flush=True)
        imagen, motivo = None, None
        for intento in range(3):
            try:
                imagen, motivo = generar(cliente, types, modelo, prompt, referencias)
                break
            except Exception as e:
                texto = str(e)
                if any(s in texto for s in ("API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED", "UNAUTHENTICATED")):
                    print(f"  la API rechazó la clave: {texto[:300]}\n{AYUDA_CLAVE}\n{seguir}")
                    return 1
                espera = 30 * (intento + 1) if ("429" in texto or "RESOURCE_EXHAUSTED" in texto) else 5 * (intento + 1)
                motivo = texto[:300]
                print(f"  intento {intento + 1} falló ({motivo}); reintento en {espera} s")
                time.sleep(espera)
        if imagen is None:
            print(f"  escena {n:02d} sin imagen: {motivo}")
            fallidas.append(n)
            continue
        anterior = comun.buscar_imagen(carpeta, n)
        if anterior:                           # nunca se borra: la versión vieja queda guardada
            respaldo = carpeta / "anteriores"
            respaldo.mkdir(exist_ok=True)
            anterior.rename(respaldo / f"{anterior.stem}_{time.strftime('%Y%m%d-%H%M%S')}{anterior.suffix}")
        destino = carpeta / f"escena_{n:02d}.png"
        a_4x3(imagen.convert("RGB")).save(destino)
        print(f"  guardada {carpeta.name}/{destino.name} ({imagen.width}x{imagen.height})")
        hechas.append(n)

    print(f"\nGeneradas: {len(hechas)}" + (f" · fallaron: {', '.join(map(str, fallidas))}" if fallidas else ""))
    if fallidas:
        print("Puedes reintentar una con: " + f"{comun.comando_python()} generar_imagenes.py --escena {fallidas[0]}")
    print(f"Siguiente paso: {comun.comando_python()} crear_video.py")
    return 1 if fallidas and not hechas else 0


if __name__ == "__main__":
    sys.exit(main())
