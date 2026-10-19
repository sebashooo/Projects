# DART v3 narrado (con tu voz y música ambiental)

Toma la animación `fuente_DART_animacion_v3.mp4` (64 s, sin sonido) y le pone tus cuatro grabaciones, cada una en su escena, con una música ambiental suave de fondo.

## Resultado

`salida/DART_animacion_v3_narrado.mp4`: 1920×1080, 30 fps, H.264 + AAC estéreo, unos 90 s, -14 LUFS.

## Cómo se arma

| Escena | En el video original | Voz | En el video final |
|---|---|---|---|
| 1 | 0:00–0:06.8 | Animacion_1 (completa) | ×1.41 más lenta |
| 2 | 0:06.8–0:20.7 | Animacion_2 (completa) | ×1.74 |
| 3 | 0:20.7–0:32.0 | Animacion_3, de 0 a 15.45 s | ×1.44 |
| 4 | 0:32.0–0:41.7 | Animacion_3, de 15.9 s al final | ×1.11 |
| 5 | 0:41.7–0:53.1 | Animacion_4, de 0 a 9.4 s | igual |
| 6 | 0:53.1–0:58.7 | Animacion_4, de 9.8 a 18.85 s | ×1.78 |
| 7 | 0:58.7–1:04.0 | Animacion_4, de 19.1 s al final | ×1.03 |

- **La voz nunca se acelera ni se deforma.** Cuando una grabación dura más que su escena, lo que se alarga es la animación (cuadros repetidos), solo en esa escena.
- Todos los cortes dentro de una grabación caen en silencios reales, medidos sobre la forma de onda.
- **Voz:** filtro de graves (80 Hz), reducción de ruido leve, algo de presencia en 3 kHz y compresión suave. Las cuatro grabaciones quedan al mismo nivel.
- **Música:** ambiental espacial (pads, bajo profundo y campanitas lentas), sintetizada por código. No es una pista descargada, así que no tiene derechos de terceros. Va unos 19 dB por debajo de la voz mientras hablas y sube sola en las pausas.
- La escena final sostiene 2 s el último cuadro, que ya viene con fundido a oscuro en el original.

## Cambiar algo y volver a generar

Requisitos: FFmpeg y Python 3 con `numpy` y `soundfile`.

```bash
python3 tools/build.py
```

- **Qué parte de qué audio va en cada escena:** `tools/plan.json`. `a` es el número de grabación; `desde` y `hasta` son segundos dentro de esa grabación; `v0` y `v1` son el inicio y el fin de la escena en el video original.
- **Volumen de la música:** en `tools/build.py`, sección 4. El `-12` es la distancia bajo la voz en las pausas y el `-8` es cuánto baja la música cuando hablas.
- `salida/pistas/` guarda la voz sola, la música sola y la mezcla, para revisar o usar en otro editor. No se sube al repositorio.
