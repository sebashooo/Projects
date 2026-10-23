# Videos POV para TikTok (vertical, voz narrada)

Arma videos verticales 1080×1920 al estilo «POV». Cada video lleva:
- un título fijo en cajas blancas;
- una imagen cartoon por escena, con zoom lento y fundidos;
- la voz de edge-tts;
- subtítulos donde la palabra que se está diciendo sale en verde.

Las imágenes que faltan las puede generar Gemini.

| Archivo | Para qué sirve |
|---|---|
| `historia.json` | Título, voz, bloque de estilo y las escenas (narración y, si falta la imagen, su descripción). |
| `imagenes/` | `escena_01.jpg`, `escena_02.png`, …  Acepta `.jpg`, `.png` y `.webp`. |
| `ficha_personaje.jpg` | Hoja de referencia del personaje. Va en esta carpeta, junto a los scripts. |
| `generar_imagenes.py` | Parte A: genera con Gemini las escenas sin imagen. |
| `crear_video.py` | Parte B: arma `prueba.mp4` (si faltan imágenes) o `video_final.mp4` (si están todas). |
| `probar_voces.py` | Genera la misma frase con varias voces para que elijas una. |
| `instalar.py` | Detecta tu sistema (Windows, Mac o Linux), instala los paquetes, revisa ffmpeg, baja la fuente y crea `.env`. |
| `musica.mp3` | Opcional. Si existe, suena en bucle al 12 % y baja al 8 % mientras hay voz. |

## Instalar (una sola vez)

Necesitas Python 3.9 o más nuevo ([python.org](https://www.python.org/downloads/)). En Windows, al instalarlo marca **«Add python.exe to PATH»**.

```bash
python instalar.py          # Windows
python3 instalar.py         # Mac / Linux
```

Instala `edge-tts`, `Pillow`, `numpy`, `google-genai` e `imageio-ffmpeg`.
- Si no tienes ffmpeg, usa el que trae `imageio-ffmpeg`, así que no tienes que instalar nada a mano.
- Baja Montserrat de Google Fonts a `fuentes/`.
- Crea el archivo `.env` a partir de `.env.example`.

## Clave de Gemini (solo para generar imágenes)

1. Crea la clave en <https://aistudio.google.com/apikey>.
2. Abre el archivo `.env` de esta carpeta y pégala así: `GEMINI_API_KEY=tu_clave`.
3. No compartas ese archivo. Está en `.gitignore` y no se sube al repositorio.

Generar imágenes cuesta dinero: se cobra por imagen en tu cuenta de Google AI. Los precios están en <https://ai.google.dev/gemini-api/docs/pricing>.

## Uso

```bash
python crear_video.py                     # arma prueba.mp4 con las escenas que tengan imagen
python generar_imagenes.py                # genera solo las escenas que faltan (no rehace las existentes)
python generar_imagenes.py --escena 12    # rehace solo la 12; la anterior queda en imagenes/anteriores/
python generar_imagenes.py --listar-modelos
python crear_video.py                     # con las 20 imágenes sale video_final.mp4
```

En Mac y Linux escribe `python3` en vez de `python`.

### Elegir la voz

```bash
python probar_voces.py            # genera la escena 1 con 10 voces en español en muestras_voz/
python probar_voces.py --todas-es # todas las voces en español de edge-tts
```

Escúchalas y pon la que te guste en `historia.json`, en `"voz": {"voz": "es-MX-JorgeNeural", "rate": "+8%", "pitch": "-2Hz"}`. Si cambias la voz, `crear_video.py` vuelve a generar los audios.

`crear_video.py` también guarda `preview.png`, que es el cuadro del segundo 5, y al final dice cuánto dura el video. La voz de cada escena se guarda en `audio/escena_XX.mp3`, y los tiempos de cada palabra en `audio/escena_XX.json`. Si no cambias el texto, la siguiente corrida reutiliza esos audios.

**edge-tts necesita internet**, porque usa el servidor de voz de Microsoft.

## Partes de esta historia

| Parte | Archivo | Imágenes | Escenas | Cierre |
|---|---|---|---|---|
| 1 | `historia.json` | `imagenes/` | 1 a 8 | «Parte 2 en mi perfil» |
| 2 | `historia_parte2.json` | `imagenes_parte2/` | 9 a 20 | «Parte 3 en mi perfil» |

```bash
python crear_video.py                                                        # parte 1 → video_final.mp4
python crear_video.py --historia historia_parte2.json --imagenes imagenes_parte2   # parte 2 → video_final_parte2.mp4
```

Si a una parte le faltan imágenes, sale `prueba.mp4` o `prueba_parte2.mp4` solo con las escenas que tienen imagen. El nombre del video y el de `preview.png` toman el final del nombre del archivo de la historia, así que una parte no sobrescribe a la otra.

## Otra historia

Copia `historia.json`, cambia el título y las escenas, y pon sus imágenes en otra carpeta:

```bash
python generar_imagenes.py --historia otra_historia.json --imagenes imagenes_otra
python crear_video.py      --historia otra_historia.json --imagenes imagenes_otra --salida otra.mp4
```

Formato mínimo:

```json
{
  "titulo": "POV: …",
  "escenas": [
    {"n": 1, "narracion": "Texto que lee la voz."},
    {"n": 2, "narracion": "…", "imagen": "Descripción en inglés para generar la imagen si falta."}
  ]
}
```

Campos opcionales:
- `"voz": {"voz": "es-CO-GonzaloNeural", "rate": "+8%", "pitch": "-2Hz"}`
- `"cierre": "Parte 2 en mi perfil"`
- `"estilo"`: el bloque que se antepone a cada descripción.
- `"referencias"`: las imágenes de referencia para Gemini.

## Diseño

Los valores están al inicio de `crear_video.py`:

| Elemento | Valor |
|---|---|
| Video | 1080×1920, 30 fps, fondo negro. |
| Título | Montserrat Bold 58 px, en 2 líneas. Cada línea va en su caja blanca, con padding de 14/26 px y esquinas de 18 px. Las cajas van unidas y el borde de arriba queda en y=320. Si el título no cabe, la letra se reduce sola y el script lo avisa. |
| Imagen | 1080×810 con el borde de arriba en y=555. Zoom lineal de 100 % a 106 % y fundido de 0,3 s entre escenas. Las imágenes pequeñas se escalan con Lanczos y se les da un poco de nitidez. |
| Subtítulos | Montserrat ExtraBold 64 px, blancos con borde negro de 5 px, centrados en y=1500. Grupos de 3 a 5 palabras; la palabra que se dice va en #39FF7A. Si un grupo no cabe en una línea, pasa a dos. |
| Escena | Dura lo que dura la voz más 0,4 s. Se quita el silencio que edge-tts deja al principio y al final del audio. |
| Cierre | 2 s con la última imagen y «Parte 2 en mi perfil» (ExtraBold 70 px). |
| Salida | H.264 (CRF 18, yuv420p) y AAC a 192 kbps. |
