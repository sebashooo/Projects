#!/usr/bin/env python3
"""Genera la misma frase con varias voces de edge-tts para que escojas la que más te guste.

    python probar_voces.py                                   # usa la narración de la escena 1
    python probar_voces.py --texto "Hola, esto es una prueba"
    python probar_voces.py --voces es-MX-JorgeNeural es-CO-GonzaloNeural

Las muestras quedan en muestras_voz/. Para usar una, cámbiala en historia.json → "voz": {"voz": "…"}.
"""
import argparse
import asyncio
import sys

import comun

RECOMENDADAS = [
    "es-CO-GonzaloNeural", "es-MX-JorgeNeural", "es-US-AlonsoNeural", "es-VE-SebastianNeural",
    "es-AR-TomasNeural", "es-CL-LorenzoNeural", "es-PE-AlexNeural", "es-ES-AlvaroNeural",
    "es-CO-SalomeNeural", "es-MX-DaliaNeural",
]


async def generar(texto, voces, rate, pitch, carpeta):
    import edge_tts
    existentes = {v["ShortName"] for v in await edge_tts.list_voices()}
    for i, voz in enumerate(voces, 1):
        if voz not in existentes:
            print(f"  {voz}: no existe en edge-tts, la salto")
            continue
        destino = carpeta / f"{i:02d}_{voz}.mp3"
        await edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch).save(str(destino))
        print(f"  {destino.name}")


def main():
    comun.preparar_consola()
    ap = argparse.ArgumentParser(description="Muestras de voces de edge-tts.")
    ap.add_argument("--texto")
    ap.add_argument("--voces", nargs="+", default=RECOMENDADAS)
    ap.add_argument("--historia", default="historia.json")
    ap.add_argument("--todas-es", action="store_true", help="prueba todas las voces en español")
    args = ap.parse_args()

    historia = comun.cargar_historia(args.historia)
    voz = historia.get("voz", {})
    texto = args.texto or historia["escenas"][0]["narracion"]
    rate, pitch = voz.get("rate", "+8%"), voz.get("pitch", "-2Hz")
    voces = args.voces
    if args.todas_es:
        import edge_tts
        voces = sorted(v["ShortName"] for v in asyncio.run(edge_tts.list_voices()) if v["Locale"].startswith("es-"))
    carpeta = comun.RAIZ / "muestras_voz"
    carpeta.mkdir(exist_ok=True)
    print(f"Generando {len(voces)} muestras (rate {rate}, pitch {pitch})…")
    try:
        asyncio.run(generar(texto, voces, rate, pitch, carpeta))
    except Exception as e:
        sys.exit(f"edge-tts no respondió: {e}\nNecesita internet (servidor de voz de Microsoft).")
    print(f"\nEscúchalas en {carpeta}")
    print('y pon la que te guste en historia.json, por ejemplo:  "voz": {"voz": "es-MX-JorgeNeural", "rate": "+8%", "pitch": "-2Hz"}')
    print(f"Luego: {comun.comando_python()} crear_video.py")


if __name__ == "__main__":
    main()
