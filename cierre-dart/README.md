# Cierre DART: «¿Qué problema resuelve?» + «Conclusión final» (vertical, 35 s, sin audio)

Animación del cierre de la exposición «Las matemáticas ayudando a proteger nuestro planeta». Usa el mismo estilo que la introducción y la parte de probabilidad. No lleva sonido, para que pongas encima las voces grabadas.

## Resultado

`salida/cierre_35s.mp4`: 1080×1920, 30 fps, 35 s, sin audio.

## Dónde va cada audio

| Tiempo | Quién habla | Qué se ve |
|---|---|---|
| 0:00–0:15 | Persona 1 | «¿Qué problema resuelve?» y «MISIÓN DART». Un asteroide va hacia la Tierra por una trayectoria rosada, con una señal de peligro y la pregunta «¿Cómo desviar un asteroide peligroso?». Sale la nave DART («experimento real · 2022»), choca con el asteroide y su trayectoria se curva lejos de la Tierra: «órbita: −32 min» y «¡El impacto cambió su movimiento!». |
| 0:15–0:24 | Persona 2 | «Conclusión» con dos tarjetas. **Derivadas** (d/dt): una curva con su recta tangente que se mueve, y los rótulos «movimiento» y «energía». **Probabilidad** (P(A\|B)): una cuadrícula de puntos, y los rótulos «riesgos» e «incertidumbre». |
| 0:24–0:35 | Persona 1 | «Las matemáticas no solo se usan en el aula…» con un tablero de clase y sus fórmulas. Luego «…también ayudan a los científicos a comprender el universo» con el Sol, órbitas y un telescopio. Cierra con la Tierra dentro de un escudo, el título «Las matemáticas ayudando a proteger nuestro planeta» y «MISIÓN DART · NASA». |

Arriba hay una barra con 3 segmentos y el número de tramo (1 / 3, 2 / 3, 3 / 3).

## Datos

- La nave DART de la NASA chocó contra el asteroide Dimorphos el 26 de septiembre de 2022.
- El choque acortó unos 32 minutos el tiempo que tarda Dimorphos en dar una vuelta alrededor de Didymos. Es la misma cifra que sale en la introducción.

## Cambiar algo y volver a generar

```bash
node tools/build.mjs
npx --yes hyperframes@0.8.176 check
npx --yes hyperframes@0.8.176 render -o salida/cierre_35s.mp4 --crf 20
```

Los textos, los colores y los tiempos de cada escena están en `tools/build.mjs`. No edites a mano `index.html` ni `compositions/`.
