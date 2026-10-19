# Introducción animada: misión DART (vertical, 58 s, sin audio)

Animación de introducción para la exposición «Las matemáticas ayudando a proteger nuestro planeta». No lleva sonido, para que pongas encima las voces grabadas. Cada tramo dura exactamente lo que dura cada persona hablando.

## Resultado

`salida/intro_dart_58s.mp4`: 1080×1920 (vertical, igual que los videos del tablero), 30 fps, 58 s, sin audio.

## Dónde va cada audio

| Tiempo | Quién habla | Qué se ve |
|---|---|---|
| 0:00–0:16 | Persona 1 | Título, la Tierra con carita, «Misión DART · NASA», la nave, el asteroide y «¿Se puede cambiar el rumbo de un asteroide?» |
| 0:16–0:32 | Persona 2 | Calendario 26 SEP 2022, impacto contra Dimorphos, Dimorphos orbitando a Didymos, informe científico, período orbital 11 h 55 min → 11 h 23 min (−32 min) y «¡La técnica funciona!» |
| 0:32–0:41 | Persona 1 | «¿Cómo se estudia este fenómeno?», DERIVADAS (d/dt) y la gráfica con la tangente que marca la velocidad hasta 6,14 km/s; «movimiento» y «energía» |
| 0:41–0:51 | Persona 2 | PROBABILIDAD y la fórmula P(A\|B), 100 escenarios posibles (incertidumbre) y «riesgo de impacto 4 / 100 = 4 %» |
| 0:51–0:58 | Persona 1 | «Comenzaremos con 1 · DERIVADAS»: los datos reales (6,1449 km/s, 579,4 kg y 26/09/2022) entran en d/dt y sale la curva del movimiento |

Arriba hay una barra de progreso con un segmento por tramo y el número del tramo («1 / 5», «2 / 5», …). Te sirve de guía al poner cada audio.

Dentro de cada tramo, los momentos clave van donde caería cada frase del guion, calculados según las sílabas de cada frase. Si al grabar alguien habla más rápido o más lento, se pueden mover los tiempos (ver abajo).

## Cambiar algo y volver a generar

Requisitos: Node 22+. El render usa HyperFrames.

```bash
node tools/build.mjs                                   # genera index.html y compositions/s1…s5.html
npx --yes hyperframes@0.8.176 check                    # revisión (lint, diseño, contraste)
npx --yes hyperframes@0.8.176 render -o salida/intro_dart_58s.mp4 --crf 20
```

- Los textos, los colores y los tiempos de cada escena están en `tools/build.mjs`, en la sección de cada escena (`ESCENA 1` … `ESCENA 5`). Los tiempos son segundos dentro de la escena.
- Para cambiar la duración de un tramo, edita `ESC` al inicio de `tools/build.mjs`.
- No edites a mano `index.html` ni `compositions/`: se regeneran con `node tools/build.mjs`.

## Diseño

- **Estilo:** el mismo de tu animación DART. Cielo morado con estrellas que titilan, personajes con carita, acentos cian, rosa y amarillo.
- **Tipografía:** Montserrat para los textos y Space Mono para los datos y las fórmulas.
- **Personajes y nave:** dibujados en SVG dentro de `tools/build.mjs`. No se usó ninguna imagen ni logo descargado.
- **Datos:** son los mismos de la exposición. La nave DART impactó a Dimorphos el 26/09/2022 a unos 6,14 km/s, con una masa de unos 579 kg, y el período orbital bajó de 11 h 55 min a 11 h 23 min (−32 min).
