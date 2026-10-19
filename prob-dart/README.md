# Probabilidad en la defensa planetaria (vertical, 23 s, sin audio)

Animación para la parte de probabilidad de la exposición «Las matemáticas ayudando a proteger nuestro planeta». Usa el mismo estilo que la introducción y no lleva sonido, para que pongas encima las voces grabadas.

## Resultado

`salida/probabilidad_23s.mp4`: 1080×1920, 30 fps, 23 s, sin audio.

## Dónde va cada audio

| Tiempo | Quién habla | Qué se ve |
|---|---|---|
| 0:00–0:13 | Persona 1 | «La probabilidad en la defensa planetaria»: la Tierra con un escudo. Llega un asteroide con un abanico de trayectorias posibles (las rosadas chocan con la Tierra y las cian no) y aparece «Riesgo de impacto: P(impacto) = ?». Un telescopio toma observaciones (puntos amarillos, por donde ya pasó el asteroide) y con ellas se estima la trayectoria: una franja amarilla que casi siempre pasa de largo pero todavía roza la Tierra, por eso el riesgo sigue siendo una pregunta. |
| 0:13–0:23 | Persona 2 | «Las estimaciones pueden cambiar»: el caso real del **asteroide 2024 YR4**. Su probabilidad de chocar con la Tierra en 2032 subió hasta **3,1 % (18 feb 2025)** y, con nuevas observaciones, bajó a **0,004 % (24 feb 2025)**. Luego el cono de incertidumbre se cierra («+ nueva información», «menos incertidumbre»), aparece datos → probabilidad → riesgo y cierra con «más datos = menos incertidumbre». |

Arriba hay una barra con 2 segmentos y el número de tramo (1 / 2, 2 / 2).

## Datos

La curva de 2024 YR4 usa los valores que publicó la NASA mientras llegaban nuevas observaciones:

| Fecha (2025) | Riesgo de impacto |
|---|---|
| 29 ene | ~1,3 % |
| 7 feb | 2,3 % |
| 18 feb | 3,1 % (máximo) |
| 19 feb | 1,5 % |
| 20 feb | 0,28 % |
| 24 feb | 0,004 % |

En pantalla solo se rotulan el máximo y el valor final, que son los mismos que usan en su tablero.

## Cambiar algo y volver a generar

```bash
node tools/build.mjs
npx --yes hyperframes@0.8.176 check
npx --yes hyperframes@0.8.176 render -o salida/probabilidad_23s.mp4 --crf 20
```

Los textos, los colores y los tiempos de cada escena están en `tools/build.mjs`. No edites a mano `index.html` ni `compositions/`.
