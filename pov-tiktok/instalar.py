#!/usr/bin/env python3
"""Prepara la carpeta: detecta el sistema, instala los paquetes de Python, revisa ffmpeg, baja Montserrat y crea .env.

    python instalar.py        (en Mac/Linux: python3 instalar.py)
"""
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))
import comun  # noqa: E402  (solo usa la biblioteca estándar)

FFMPEG_MANUAL = {
    "Windows": "winget install --id Gyan.FFmpeg -e",
    "Mac": "brew install ffmpeg",
    "Linux": "sudo apt install ffmpeg   (Fedora: sudo dnf install ffmpeg)",
}


def main():
    comun.preparar_consola()
    so, py = comun.sistema(), comun.comando_python()
    print(f"Sistema detectado: {so} · Python {sys.version.split()[0]}")
    if sys.version_info < (3, 9):
        sys.exit("Necesitas Python 3.9 o más nuevo: https://www.python.org/downloads/")

    print("\n1) Paquetes de Python (requirements.txt)…")
    r = subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(RAIZ / "requirements.txt")])
    if r.returncode != 0:
        sys.exit("pip no pudo instalar los paquetes. Copia el error de arriba y revísalo.")

    print("\n2) ffmpeg…")
    sistema_ffmpeg = shutil.which("ffmpeg")
    if sistema_ffmpeg:
        print(f"  uso el ffmpeg de tu sistema: {sistema_ffmpeg}")
    else:
        try:
            import imageio_ffmpeg
            print(f"  no tienes ffmpeg instalado, pero uso el que trae imageio-ffmpeg: {imageio_ffmpeg.get_ffmpeg_exe()}")
            print(f"  (opcional, para tenerlo en todo el sistema: {FFMPEG_MANUAL[so]})")
        except Exception:
            sys.exit(f"  falta ffmpeg. Instálalo con: {FFMPEG_MANUAL[so]}  y vuelve a correr {py} instalar.py")

    print("\n3) Fuente Montserrat (Google Fonts)…")
    comun.asegurar_fuentes()
    print("  fuentes listas en fuentes/")

    print("\n4) Archivo .env para la clave de Gemini…")
    env, ejemplo = RAIZ / ".env", RAIZ / ".env.example"
    if not env.exists() and ejemplo.exists():
        shutil.copy(ejemplo, env)
        print(f"  creé {env}")
    print(f"  abre {env} y pega tu clave después de GEMINI_API_KEY=  (se crea en https://aistudio.google.com/apikey)")

    print("\nTodo listo. Pasos:")
    print(f"  {py} crear_video.py            # arma prueba.mp4 con las imágenes que haya")
    print(f"  {py} generar_imagenes.py       # genera las escenas que faltan (necesita la clave)")
    print(f"  {py} crear_video.py            # con las 20 imágenes sale video_final.mp4")


if __name__ == "__main__":
    main()
