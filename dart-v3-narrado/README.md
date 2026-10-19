# DART v3 narrado (con tu voz y música ambiental)

Toma la animación `fuente_DART_animacion_v3.mp4` (64 s, sin sonido) y le pone tus cuatro grabaciones, cada una en su escena, con música ambiental de fondo. La voz va un poco acelerada para que el video quede corto, y las cuatro grabaciones quedan con el mismo timbre y volumen.

## Resultado

`salida/DART_animacion_v3_narrado.mp4`: 1920×1080, 30 fps, H.264 + AAC estéreo, unos 68 s, -12 LUFS (suena fuerte en el celular).

## Cómo se arma

| Escena | En el video original | Voz | Animación en el video final |
|---|---|---|---|
| 1 | 0:00–0:06.8 | Animacion_1 (completa) | ×0.93 (un poco más lenta) |
| 2 | 0:06.8–0:20.05 | Animacion_2 (completa) | ×0.70 |
| 3 | 0:20.05–0:31.0 | Animacion_3, de 0.2 a 15.45 s | ×0.86 |
| 4 | 0:31.0–0:41.7 | Animacion_3, de 15.9 s al final | ×1.33 (más rápida) |
| 5 | 0:41.7–0:53.1 | Animacion_4, de 0 a 9.4 s | ×1.45 |
| 6 | 0:53.1–0:58.7 | Animacion_4, de 9.8 a 18.85 s | ×0.73 |
| 7 | 0:58.7–1:04.0 | Animacion_4, de 19.1 s al final | ×1.31 |

- **Voz un 25 % más rápida** (`atempo`, sin cambiar el tono). Además se quitan los silencios de sobra al inicio y al final de cada tramo, y ninguna pausa interna pasa de 0.2 s.
- **Cada escena de la animación dura lo que dura su voz.** Si la voz es más larga, la animación va más lenta (cuadros repetidos). Si es más corta, va más rápida, como máximo ×1.5 para que los textos se alcancen a leer.
- **Límites de escena:** el cambio 2→3 y el cambio 3→4 están en el instante vacío entre el fundido de una escena y el dibujo de la siguiente, así ninguna frase queda sobre la escena equivocada.
- **Cortes en silencio real.** Se decide dónde hay silencio sobre una copia de análisis comprimida, para no confundir sílabas suaves con pausas. La escena 3 empieza en 0.2 s para dejar fuera un «mm» suelto.
- **Voz:**
  - Las grabaciones 2 y 4 salieron opacas (5 a 7 dB menos de agudos) y por eso sonaban bajitas. Cada grabación se ecualiza hacia el timbre de las dos más claras: hasta +14 dB en 2–5 kHz y un máximo de +3 dB por encima de 8 kHz.
  - Un nivelador sube los finales de frase que se apagan, sin subir las respiraciones: esas las baja 8 dB.
  - Lleva presencia en 3 kHz, compresión 3:1, control de eses dinámico y limitador.
- **Música:** ambiental, sintetizada por código, así que no tiene derechos de terceros.
  - Pads en registro medio, un arpegio tipo kalimba con eco, bajo con armónicos (se oye en el parlante del celular), un shaker suave, reverb y un acorde final.
  - Va unos 8 dB bajo la voz en las pausas. Cuando hablas baja 6 dB más, y 11 dB en la franja de 1–5 kHz, para que la voz quede nítida.
- El final sostiene 1 s el último cuadro, que ya viene con fundido a oscuro en el original.

## Cambiar algo y volver a generar

Requisitos: FFmpeg y Python 3 con `numpy` y `soundfile`.

```bash
python3 tools/build.py
```

- **Velocidad:** en `tools/plan.json`, `tempo_voz` (1 = tu voz normal, 1.25 = actual), `pausa_max` (silencio máximo dentro de una frase) y `acel_video_max` (lo más rápido que puede ir la animación).
- **Qué parte de qué audio va en cada escena:** `tools/plan.json`. `a` es el número de grabación; `desde` y `hasta` son segundos dentro de esa grabación; `v0` y `v1` son el inicio y el fin de la escena en el video original.
- **Volumen de la música:** en `tools/build.py`, sección 6. El `- 8` es la distancia bajo la voz en las pausas; el `-6` y el `-11` son cuánto baja cuando hablas (general y en 1–5 kHz).
- `salida/pistas/` guarda la voz sola, la música sola y la mezcla, para revisar o usar en otro editor. No se sube al repositorio.
