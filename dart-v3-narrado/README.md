# DART v3 narrado (con tu voz y música ambiental)

Toma la animación `fuente_DART_animacion_v3.mp4` (64 s, sin sonido) y le pone tus cuatro grabaciones, cada una en su escena, con una música ambiental suave de fondo. La voz va un poco acelerada para que el video quede corto.

## Resultado

`salida/DART_animacion_v3_narrado.mp4`: 1920×1080, 30 fps, H.264 + AAC estéreo, unos 68 s, -14 LUFS.

## Cómo se arma

| Escena | En el video original | Voz | Animación en el video final |
|---|---|---|---|
| 1 | 0:00–0:06.8 | Animacion_1 (completa) | ×0.92 (un poco más lenta) |
| 2 | 0:06.8–0:20.7 | Animacion_2 (completa) | ×0.74 |
| 3 | 0:20.7–0:32.0 | Animacion_3, de 0 a 15.45 s | ×0.88 |
| 4 | 0:32.0–0:41.7 | Animacion_3, de 15.9 s al final | ×1.20 (más rápida) |
| 5 | 0:41.7–0:53.1 | Animacion_4, de 0 a 9.4 s | ×1.45 |
| 6 | 0:53.1–0:58.7 | Animacion_4, de 9.8 a 18.85 s | ×0.73 |
| 7 | 0:58.7–1:04.0 | Animacion_4, de 19.1 s al final | ×1.31 |

- **Voz un 25 % más rápida** (`atempo`, sin cambiar el tono). Además se quitan los silencios de sobra al inicio y al final de cada tramo, y ninguna pausa interna pasa de 0.2 s. Así tu voz cabe en unos 66 s.
- **Cada escena de la animación dura lo que dura su voz.** Si la voz es más larga, la animación va más lenta (cuadros repetidos). Si es más corta, va más rápida, como máximo ×1.5 para que los textos se alcancen a leer.
- Todos los cortes dentro de una grabación caen en silencios reales, medidos sobre la forma de onda.
- **Voz:** filtro de graves (80 Hz), reducción de ruido leve, algo de presencia en 3 kHz y compresión suave. Las cuatro grabaciones quedan al mismo nivel.
- **Música:** ambiental espacial (pads, bajo profundo y campanitas lentas), sintetizada por código. No es una pista descargada, así que no tiene derechos de terceros. Va unos 19 dB por debajo de la voz mientras hablas y sube sola en las pausas.
- El final sostiene 1 s el último cuadro, que ya viene con fundido a oscuro en el original.

## Cambiar algo y volver a generar

Requisitos: FFmpeg y Python 3 con `numpy` y `soundfile`.

```bash
python3 tools/build.py
```

- **Velocidad:** en `tools/plan.json`, `tempo_voz` (1 = tu voz normal, 1.25 = actual), `pausa_max` (silencio máximo dentro de una frase) y `acel_video_max` (lo más rápido que puede ir la animación).
- **Qué parte de qué audio va en cada escena:** `tools/plan.json`. `a` es el número de grabación; `desde` y `hasta` son segundos dentro de esa grabación; `v0` y `v1` son el inicio y el fin de la escena en el video original.
- **Volumen de la música:** en `tools/build.py`, sección 5. El `-12` es la distancia bajo la voz en las pausas y el `-8` es cuánto baja la música cuando hablas.
- `salida/pistas/` guarda la voz sola, la música sola y la mezcla, para revisar o usar en otro editor. No se sube al repositorio.
