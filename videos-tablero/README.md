# Las matemáticas ayudando a proteger nuestro planeta: video unido y mejorado

Une los cuatro videos de la exposición en uno solo y los mejora.

- **Imagen:**
  - Reducción de ruido y de bloques de compresión.
  - Escalado a 1080×1920 con nitidez adaptativa.
  - Tablero más blanco (balance de blancos medido sobre el tablero de cada video) y un poco más de contraste y color.
- **Sonido:**
  - Limpieza de ruido.
  - Las cuatro voces con el mismo timbre y volumen.
  - Nivelador que sube las frases bajas sin subir las respiraciones.
  - Compresión, control de eses y volumen final a -12 LUFS.
- **Ritmo:**
  - Las explicaciones van a ×1.25, sin cambiar el tono de la voz.
  - Las partes en que se escribe en el tablero van a ×2.5 y, en lugar del audio original, suena la música.
  - Las pausas cortas sin voz van a ×2.
- **Música:** lo-fi de estudio sintetizada por código, sin derechos de terceros. Debajo de la voz suena una base de piano eléctrico, bajo y pad, que baja sola cuando hablan. Al escribir entran un beat suave y una melodía tipo kalimba.
- Fundido corto entre un video y el siguiente.

Los videos originales (`fuente/`) y el resultado (`salida/`) no se suben al repositorio porque muestran a estudiantes.

## Volver a generar

Requisitos: FFmpeg y Python 3 con `numpy` y `soundfile`. Pon los cuatro videos en `fuente/` con estos nombres: `1_primer_video.mp4`, `2_segundo_video.mp4`, `3_tercer_video.mp4` y `4_cuarto_video.mp4`. Luego:

```bash
python3 tools/build.py        # → salida/matematicas_planeta.mp4 (unos 20 min)
```

## Cambiar algo

Todo se ajusta en `tools/tramos.json`:

- `tramos`: el inicio y el fin (en segundos del video original) de cada parte y su tipo.
  - `explica`: se conserva la voz.
  - `escribe`: más rápido y con música.
  - `otro`: pausa sin voz.
  - Para que una parte de escritura conserve la voz, cambia su tipo a `explica`.
- `velocidades`: cuánto se acelera cada tipo.
- `musica_bajo_voz_db`: cuántos dB va la música por debajo de la voz en las pausas.
- `musica_escritura_extra_db`: cuánto sube la música mientras escriben.
- `lufs`: volumen final.
- `color`: ganancia de rojo, verde y azul de cada video (balance de blancos y brillo).

`tools/musica.py` genera la música y `tools/build.py` hace todo lo demás. `salida/pistas/` guarda la voz sola, la música sola, la mezcla y cada tramo de video ya procesado.
