// Animación de la parte de PROBABILIDAD (vertical 1080×1920, 23 s, sin audio) para la exposición
// «Las matemáticas ayudando a proteger nuestro planeta».
//   node tools/build.mjs   →  index.html + compositions/p1.html, p2.html   (luego: hyperframes check / render)
// Tramos fijos (una persona habla en cada uno): 13 + 10 s.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const W = 1080, H = 1920;
const ESC = [
  { id: "p1", t0: 0, d: 13 },
  { id: "p2", t0: 13, d: 10 },
];
const DUR = 23;

// ── personajes (mismos de la introducción) ──
const ojos = (cx1, cx2, cy, r = 13) => `
  <ellipse cx="${cx1}" cy="${cy}" rx="${r}" ry="${r * 1.22}" fill="#fff"/><ellipse cx="${cx2}" cy="${cy}" rx="${r}" ry="${r * 1.22}" fill="#fff"/>
  <circle cx="${cx1 + 2}" cy="${cy + 3}" r="${r * 0.62}" fill="#1b1340"/><circle cx="${cx2 + 2}" cy="${cy + 3}" r="${r * 0.62}" fill="#1b1340"/>
  <circle cx="${cx1 + 5}" cy="${cy - 1}" r="${r * 0.24}" fill="#fff"/><circle cx="${cx2 + 5}" cy="${cy - 1}" r="${r * 0.24}" fill="#fff"/>`;
const tierra = (p) => `<svg viewBox="0 0 200 200" class="fill">
  <defs><clipPath id="${p}-c"><circle cx="100" cy="100" r="92"/></clipPath>
  <radialGradient id="${p}-g" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#6cc0ff"/><stop offset="1" stop-color="#1d5fd1"/></radialGradient></defs>
  <circle cx="100" cy="100" r="96" fill="#4fe0ff" opacity=".18"/>
  <circle cx="100" cy="100" r="92" fill="url(#${p}-g)"/>
  <g clip-path="url(#${p}-c)" fill="#5bd68f">
    <path d="M18 58 Q40 30 70 44 Q84 60 66 70 Q46 74 50 96 Q28 96 18 58Z"/>
    <path d="M118 30 Q154 30 172 62 Q164 82 140 74 Q118 66 118 30Z"/>
    <path d="M112 136 Q146 124 170 146 Q158 182 124 184 Q100 166 112 136Z"/>
    <path d="M14 122 Q38 120 42 144 Q30 160 12 150Z"/>
  </g>
  <ellipse cx="66" cy="50" rx="24" ry="11" fill="#fff" opacity=".28" transform="rotate(-32 66 50)"/>
  ${ojos(78, 122, 96)}
  <circle cx="60" cy="122" r="8" fill="#ff7fb5" opacity=".55"/><circle cx="140" cy="122" r="8" fill="#ff7fb5" opacity=".55"/>
  <g id="${p}-feliz"><path d="M86 124 Q100 138 114 124" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/></g>
  <g id="${p}-duda" opacity="0"><path d="M88 130 Q100 124 112 130" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/></g>
</svg>`;
const asteroide = (p, { color = "#a996d6", sombra = "#7f6db3" } = {}) => `<svg viewBox="0 0 200 200" class="fill">
  <path d="M38 74 Q52 28 104 30 Q158 26 170 78 Q184 124 148 160 Q108 184 64 166 Q22 140 38 74Z" fill="${color}"/>
  <ellipse cx="62" cy="62" rx="15" ry="11" fill="${sombra}"/><ellipse cx="150" cy="128" rx="13" ry="10" fill="${sombra}"/>
  <ellipse cx="128" cy="52" rx="8" ry="6" fill="${sombra}"/><ellipse cx="70" cy="150" rx="10" ry="7" fill="${sombra}"/>
  ${ojos(82, 120, 98, 12)}
  <path d="M90 128 Q101 138 112 128" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;
const telescopio = `<svg viewBox="0 0 200 200" class="fill">
  <path d="M100 118 L62 190 M100 118 L138 190 M100 118 L100 190" stroke="#cbbff0" stroke-width="8" stroke-linecap="round"/>
  <g transform="rotate(-38 100 104)"><rect x="40" y="86" width="132" height="38" rx="10" fill="#e9b949" stroke="#fff3c4" stroke-width="4"/>
  <rect x="160" y="80" width="26" height="50" rx="6" fill="#4fe0ff"/><rect x="22" y="94" width="22" height="22" rx="4" fill="#cbbff0"/></g>
  <circle cx="100" cy="118" r="10" fill="#cbbff0"/>
</svg>`;

// estrellas con PRNG con semilla (determinista), sin estrellas detrás de los textos de arriba
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20250218);
let estrellas = "";
for (let i = 0; i < 130; i++) {
  const x = Math.round(rnd() * W), y = Math.round(rnd() * (H + 60)), s = (1.5 + rnd() * 3.2).toFixed(1), o = (0.35 + rnd() * 0.6).toFixed(2);
  if (x > 64 && x < 1016 && y > 52 && y < 470) continue;
  if (x > 50 && x < 1030 && y > 1370 && y < 1850) continue;
  estrellas += `<i class="st tw${i % 3}" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;opacity:${o}"></i>`;
}
const ANCHO_BARRA = 920, HUECO = 10;
const util = ANCHO_BARRA - HUECO * (ESC.length - 1);
let barras = "", xb = 0;
ESC.forEach((e, i) => {
  const w = Math.round((util * e.d) / DUR);
  barras += `<div class="seg" style="left:${xb}px;width:${w}px"><div class="segfill" id="bar${i + 1}"></div></div>`;
  xb += w + HUECO;
});

// abanico de trayectorias posibles (escena 1): del asteroide hacia la zona de la Tierra
const AST1 = [840, 650], TIE1 = [300, 1180], R_TIE1 = 150;
const dir = [TIE1[0] - AST1[0], TIE1[1] - AST1[1]], nd = Math.hypot(...dir), u = [dir[0] / nd, dir[1] / nd], perp = [-u[1], u[0]];
const OFF = [-330, -247, -165, -82, 0, 82, 165, 247, 330];
let abanico = "";
OFF.forEach((o, i) => {
  const ex = TIE1[0] + perp[0] * o - u[0] * 120, ey = TIE1[1] + perp[1] * o - u[1] * 120;     // un poco más allá de la Tierra
  const choca = Math.abs(o) < R_TIE1;
  abanico += `<line id="fan${i}" x1="${AST1[0]}" y1="${AST1[1]}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${choca ? "#ff5fa8" : "#4fe0ff"}" stroke-width="${choca ? 6 : 4}" stroke-linecap="round" opacity="0"/>`;
});
// trayectoria estimada: una franja (no una línea exacta) que casi siempre pasa de largo pero aún roza la Tierra → P(impacto) sigue abierta
const REAL = 190, ANCHO = 90;
const realFin = [TIE1[0] + perp[0] * REAL - u[0] * 40, TIE1[1] + perp[1] * REAL - u[1] * 40];
const banda = `M ${AST1[0]} ${AST1[1]} L ${(realFin[0] + perp[0] * ANCHO).toFixed(1)} ${(realFin[1] + perp[1] * ANCHO).toFixed(1)} L ${(realFin[0] - perp[0] * ANCHO).toFixed(1)} ${(realFin[1] - perp[1] * ANCHO).toFixed(1)} Z`;
// observaciones: posiciones ya recorridas (detrás del asteroide), con un pequeño error de medida
const obs = [];
for (let k = 0; k < 4; k++) {
  const t = -0.31 + k * 0.05, err = [7, -9, 6, -5][k];
  obs.push([AST1[0] + (realFin[0] - AST1[0]) * t + perp[0] * err, AST1[1] + (realFin[1] - AST1[1]) * t + perp[1] * err]);
}

// riesgo de impacto de 2024 YR4 con la Tierra (2032): valores publicados por la NASA a medida que llegaban observaciones
const YR4 = [
  { f: "29 ene", dia: 0, v: 1.3 }, { f: "7 feb", dia: 9, v: 2.3 }, { f: "18 feb", dia: 20, v: 3.1 },
  { f: "19 feb", dia: 21, v: 1.5 }, { f: "20 feb", dia: 22, v: 0.28 }, { f: "24 feb", dia: 26, v: 0.004 },
];
const GX = (d) => 110 + (d / 26) * 720, GY = (v) => 470 - (v / 3.5) * 380;
const ptsYR4 = YR4.map((p) => [GX(p.dia), GY(p.v)]);
const largos = ptsYR4.map((p, i) => (i ? Math.hypot(p[0] - ptsYR4[i - 1][0], p[1] - ptsYR4[i - 1][1]) : 0));
const totalYR4 = largos.reduce((a, b) => a + b, 0);
const fraccionesYR4 = largos.map((_, i) => +(largos.slice(0, i + 1).reduce((a, b) => a + b, 0) / totalYR4).toFixed(3));
const lineaYR4 = YR4.map((p, i) => `${i ? "L" : "M"} ${GX(p.dia).toFixed(1)} ${GY(p.v).toFixed(1)}`).join(" ");

const html = `<!doctype html>
<!-- Generado por tools/build.mjs. Edita ese archivo y corre: node tools/build.mjs -->
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="assets/js/gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#140b2b}
#root{position:relative;width:100%;height:100%;overflow:hidden;font-family:"Montserrat",sans-serif;color:#f4f0ff;background:#140b2b}
#cielo{position:absolute;inset:0;background:radial-gradient(900px 1100px at 50% 42%,#3a2373 0%,#241452 45%,#140b2b 100%)}
#brillo1,#brillo2{position:absolute;border-radius:50%;width:900px;height:900px}
#brillo1{left:-380px;top:260px;background:radial-gradient(circle,rgba(255,95,168,.22),rgba(255,95,168,0) 65%)}
#brillo2{left:560px;top:1060px;background:radial-gradient(circle,rgba(79,224,255,.2),rgba(79,224,255,0) 65%)}
#estrellas{position:absolute;left:0;top:0;width:${W}px;height:${H + 60}px}
.st{position:absolute;display:block;border-radius:50%;background:#fff6d9}
#hdr{position:absolute;left:80px;top:70px;width:${ANCHO_BARRA}px;height:80px;z-index:50}
#hdr .lbl{position:absolute;left:0;top:0;font-size:26px;letter-spacing:.22em;color:#cbbff0}
#hdr .num{position:absolute;right:0;top:0;width:120px;height:34px}
#hdr .num span{position:absolute;right:0;top:0;font-size:26px;letter-spacing:.12em;color:#cbbff0;opacity:0}
#barras{position:absolute;left:0;top:50px;width:${ANCHO_BARRA}px;height:10px}
.seg{position:absolute;top:0;height:10px;border-radius:5px;background:rgba(244,240,255,.16);overflow:hidden}
.segfill{width:100%;height:100%;background:#ff5fa8;border-radius:5px;transform-origin:0 50%}
/* clases */
.mono{font-family:"Space Mono",monospace}
.fill{width:100%;height:100%;display:block;overflow:visible}
.inner{position:absolute;inset:0}
.abs{position:absolute}
.blk{display:block}
.cyan{color:#4fe0ff}.pink{color:#ff5fa8}.yel{color:#ffd257}
.pill{position:absolute;display:flex;align-items:center;gap:14px;padding:14px 30px;border-radius:999px;font-weight:800;font-size:38px;white-space:nowrap}
.pill.borde{border:4px solid currentColor;background:rgba(20,11,43,.92)}
.chip{position:absolute;display:block;padding:12px 26px;border-radius:18px;font-size:34px;white-space:nowrap;background:rgba(20,11,43,.92)}
.titulo{font-weight:900;letter-spacing:-0.04em;line-height:1.02}
/* escena 1 */
#p1-t{left:80px;top:200px;width:920px;transform-origin:0 0}
#p1-t .a{font-size:96px}
#p1-t .b{font-size:70px;font-weight:700;letter-spacing:-0.02em;margin:6px 0;color:#e3dbff}
#p1-tierra{left:330px;top:790px;width:420px;height:420px}
#p1-escudo{left:280px;top:740px;width:520px;height:520px}
#p1-ast{left:745px;top:555px;width:190px;height:190px}
#p1-svg{left:0;top:0;width:${W}px;height:${H}px}
#p1-tel{left:800px;top:1280px;width:170px;height:170px}
#p1-lobs{left:550px;top:1372px;color:#ffd257;border:3px solid #ffd257;font-size:30px}
#p1-ltray{left:300px;top:670px;color:#ffd257;border:3px solid #ffd257;font-size:30px}
#p1-q{left:80px;top:1520px;width:920px;padding:24px 0;border-radius:26px;border:4px solid #ff5fa8;background:rgba(20,11,43,.92);text-align:center;transform-origin:50% 50%}
#p1-q .a{font-size:30px;font-weight:800;letter-spacing:.08em;color:#ff5fa8}
#p1-q .b{font-size:60px;font-weight:700;margin-top:6px}
/* escena 2 */
#p2-t{left:80px;top:200px;width:920px}
#p2-t .a{font-size:84px}
#p2-card{left:70px;top:440px;width:940px;height:640px;border-radius:30px;background:rgba(20,11,43,.92);border:3px solid rgba(244,240,255,.25)}
#p2-cap{left:110px;top:470px;width:860px;font-size:30px;color:#e3dbff}
#p2-cap b{color:#ffd257;font-weight:700}
#p2-svg{left:70px;top:520px;width:940px;height:560px}
#p2-pico{left:560px;top:560px;background:#ff5fa8;color:#1b1340;font-size:34px;font-weight:700;transform-origin:50% 100%}
#p2-fin{left:597px;top:1000px;background:#4fe0ff;color:#1b1340;font-size:34px;font-weight:700;transform-origin:50% 0%}
#p2-diag{left:0;top:0;width:${W}px;height:${H}px}
#p2-tierra{left:170px;top:1190px;width:200px;height:200px}
#p2-ast{left:800px;top:1110px;width:120px;height:120px}
#p2-nueva{left:60px;top:1400px;color:#ffd257;border:3px solid #ffd257;font-size:30px}
#p2-menos{left:640px;top:1400px;color:#4fe0ff;border:3px solid #4fe0ff;font-size:30px}
#p2-c1{left:172px;top:1500px;color:#ffd257;border:4px solid #ffd257}
#p2-c2{left:392px;top:1500px;color:#ff5fa8;border:4px solid #ff5fa8}
#p2-c3{left:742px;top:1500px;color:#4fe0ff;border:4px solid #4fe0ff}
.flecha{position:absolute;top:1510px;font-size:40px;color:#cbbff0}
#p2-f1{left:337px}#p2-f2{left:690px}
#p2-final{left:80px;top:1620px;width:920px;height:150px;border-radius:30px;background:#4fe0ff;color:#140b2b;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-size:46px;font-weight:900;letter-spacing:-0.03em;transform-origin:50% 50%}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}">
  <div id="cielo"></div>
  <div id="brillo1"></div><div id="brillo2"></div>
  <div id="estrellas">${estrellas}</div>

  <div id="hdr"><div class="lbl mono">PROBABILIDAD</div>
    <div class="num mono">${ESC.map((e, i) => `<span id="n${i + 1}">${i + 1} / ${ESC.length}</span>`).join("")}</div>
    <div id="barras">${barras}</div></div>

  <!-- ESCENA 1 · 0–13 s -->
  <section id="p1" data-start="0" data-duration="13"><div class="inner" id="p1-in">
    <div id="p1-t" class="abs titulo">
      <div class="a blk w">La probabilidad</div>
      <div class="b blk w">en la defensa</div>
      <div class="a blk w"><span class="pink">planetaria</span></div>
    </div>
    <svg id="p1-escudo" class="abs" viewBox="0 0 520 520"><path id="p1-esc" d="M260 20 L460 92 L460 250 Q460 410 260 500 Q60 410 60 250 L60 92 Z" fill="rgba(79,224,255,.08)" stroke="#4fe0ff" stroke-width="10" stroke-linejoin="round"/></svg>
    <div id="p1-tierra" class="abs">${tierra("t1")}</div>
    <svg id="p1-svg" class="abs" viewBox="0 0 ${W} ${H}">${abanico}
      <path id="p1-banda" d="${banda}" fill="rgba(255,210,87,.22)" stroke="#ffd257" stroke-width="3" stroke-linejoin="round" opacity="0"/>
      ${obs.map((p, k) => `<g id="obs${k}" opacity="0"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" fill="#ffd257"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="16" fill="none" stroke="#ffd257" stroke-width="3" opacity=".6"/></g>`).join("")}
      <line id="p1-mira" x1="845" y1="1300" x2="${obs[1][0].toFixed(1)}" y2="${obs[1][1].toFixed(1)}" stroke="#ffd257" stroke-width="3" stroke-dasharray="10 12" opacity="0"/>
    </svg>
    <div id="p1-ast" class="abs">${asteroide("a1")}</div>
    <div id="p1-tel" class="abs">${telescopio}</div>
    <div id="p1-lobs" class="chip">observaciones</div>
    <div id="p1-ltray" class="chip">trayectoria</div>
    <div id="p1-q" class="abs"><div class="a">RIESGO DE IMPACTO</div><div class="b mono">P(impacto) = ?</div></div>
  </div></section>

  <!-- ESCENA 2 · 13–23 s -->
  <section id="p2" data-start="13" data-duration="10"><div class="inner" id="p2-in">
    <div id="p2-t" class="abs titulo"><div class="a blk w2">Las estimaciones</div><div class="a blk w2"><span class="cyan">pueden cambiar</span></div></div>
    <div id="p2-card" class="abs"></div>
    <div id="p2-cap" class="abs mono"><b>Asteroide 2024 YR4</b> · probabilidad de chocar con la Tierra en 2032</div>
    <svg id="p2-svg" class="abs" viewBox="0 0 940 560">
      <path d="M110 70 L110 470 L850 470" fill="none" stroke="#cbbff0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${[1, 2, 3].map((v) => `<line x1="110" y1="${GY(v)}" x2="850" y2="${GY(v)}" stroke="rgba(244,240,255,.14)" stroke-width="2"/><text x="96" y="${GY(v) + 10}" text-anchor="end" font-family="Space Mono" font-size="28" fill="#cbbff0">${v} %</text>`).join("")}
      <text x="110" y="520" font-family="Space Mono" font-size="28" fill="#cbbff0">ene 2025</text>
      <path id="p2-linea" d="${lineaYR4}" fill="none" stroke="#ffd257" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle id="pt5r" cx="${GX(26).toFixed(1)}" cy="${GY(0.004).toFixed(1)}" r="22" fill="none" stroke="#4fe0ff" stroke-width="4" opacity="0"/>
      ${YR4.map((p, i) => `<circle id="pt${i}" cx="${GX(p.dia).toFixed(1)}" cy="${GY(p.v).toFixed(1)}" r="11" fill="#ffd257" opacity="0"/>`).join("")}
    </svg>
    <div id="p2-pico" class="chip mono">18 feb: 3,1 %</div>
    <div id="p2-fin" class="chip mono">24 feb: 0,004 %</div>
    <svg id="p2-diag" class="abs" viewBox="0 0 ${W} ${H}">${Array.from({ length: 7 }, (_, i) => `<line id="cono${i}" x1="860" y1="1170" x2="270" y2="1290" stroke="#4fe0ff" stroke-width="4" stroke-linecap="round" opacity="0"/>`).join("")}</svg>
    <div id="p2-tierra" class="abs">${tierra("t2")}</div>
    <div id="p2-ast" class="abs">${asteroide("a2")}</div>
    <div id="p2-nueva" class="chip">+ nueva información</div>
    <div id="p2-menos" class="chip">menos incertidumbre</div>
    <div id="p2-c1" class="chip">datos</div><div id="p2-f1" class="flecha mono">→</div>
    <div id="p2-c2" class="chip">probabilidad</div><div id="p2-f2" class="flecha mono">→</div>
    <div id="p2-c3" class="chip">riesgo</div>
    <div id="p2-final" class="abs">más datos = menos incertidumbre</div>
  </div></section>
</div>

<script>
const tl = gsap.timeline({ paused: true });
const T = { p1: 0, p2: 13 };
const DUR = ${DUR};

// ── fondo y encabezado ──
tl.fromTo("#estrellas", { y: 0 }, { y: -50, duration: DUR, ease: "none" }, 0);
[0, 1, 2].forEach((g, i) => {
  const ciclo = 2.2 + i * 0.7;
  tl.fromTo(".tw" + g, { opacity: 0.25 + 0.1 * i }, { opacity: 1, duration: ciclo / 2, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / (ciclo / 2)) - 1) }, 0.3 * i);
});
tl.fromTo("#brillo1", { scale: 0.9 }, { scale: 1.12, duration: 4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / 4) - 1) }, 0);
tl.fromTo("#brillo2", { scale: 1.1 }, { scale: 0.9, duration: 5, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / 5) - 1) }, 0);
const TR = [[0, 13], [13, 10]];
TR.forEach(([t0, d], i) => {
  tl.fromTo("#bar" + (i + 1), { scaleX: 0 }, { scaleX: 1, duration: d, ease: "none" }, t0);
  tl.fromTo("#n" + (i + 1), { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0);
  if (i < TR.length - 1) tl.to("#n" + (i + 1), { opacity: 0, duration: 0.2 }, t0 + d - 0.2);
});
tl.to("#hdr", { opacity: 0, duration: 0.4 }, DUR - 0.45);

// utilidades
function salida(id, t) { tl.fromTo(id, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power2.in", immediateRender: false }, t); }
function cascada(sel, t, dy = [80, 50, 80]) {
  document.querySelectorAll(sel).forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, y: dy[i % dy.length] }, { opacity: 1, y: 0, duration: 0.3, ease: "power4.out" }, t + i * 0.16);
  });
}
function pop(sel, t, d = 0.6, extra = {}) { tl.fromTo(sel, { scale: 0, opacity: 0, ...extra.from }, { scale: 1, opacity: 1, duration: d, ease: "power3.out", ...extra.to }, t); }
function trazo(el, t, d, ease = "power2.out") { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
  tl.fromTo(el, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease }, t); }

// ═══ ESCENA 1 ═══
// 0–3.9 s: «la probabilidad en la defensa planetaria»
cascada("#p1-t .w", T.p1 + 0.2);
pop("#p1-tierra", T.p1 + 0.5, 0.9, { from: { y: 100 }, to: { y: 0 } });
trazo(document.getElementById("p1-esc"), T.p1 + 1.2, 1.2);
tl.fromTo("#p1-escudo", { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.p1 + 1.2);
tl.fromTo("#p1-escudo", { scale: 1 }, { scale: 1.04, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 1, immediateRender: false }, T.p1 + 2.4);   // termina en 1 antes del movimiento
// 3.9–8.6 s: «estimar el riesgo de que un asteroide impacte la Tierra»
tl.fromTo("#p1-t", { scale: 1, y: 0 }, { scale: 0.6, y: -30, duration: 0.7, ease: "power3.inOut" }, T.p1 + 3.8);
tl.fromTo(["#p1-tierra", "#p1-escudo"], { x: 0, y: 0, scale: 1 }, { x: -240, y: 180, scale: 0.72, duration: 0.9, ease: "power3.inOut", immediateRender: false }, T.p1 + 3.9);
pop("#p1-ast", T.p1 + 4.3, 0.6, { from: { rotation: -20 }, to: { rotation: 0 } });
tl.fromTo("#p1-ast", { y: 0 }, { y: -12, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 6, immediateRender: false }, T.p1 + 4.9);
for (let i = 0; i < 9; i++) {
  const ln = document.getElementById("fan" + i), L = ln.getTotalLength();
  ln.style.strokeDasharray = L; ln.style.strokeDashoffset = L;
  tl.fromTo(ln, { opacity: 1, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out", immediateRender: false }, T.p1 + 5.0 + Math.abs(i - 4) * 0.06);
  tl.set(ln, { opacity: 0 }, 0);
}
tl.set("#t1-feliz", { opacity: 0 }, T.p1 + 5.9); tl.set("#t1-duda", { opacity: 1 }, T.p1 + 5.9);
tl.fromTo("#p1-q", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }, T.p1 + 6.2);
// 9.2–13 s: «teniendo en cuenta sus observaciones y su trayectoria»
pop("#p1-tel", T.p1 + 9.6, 0.5, { from: { rotation: -15 }, to: { rotation: 0 } });
tl.fromTo("#p1-mira", { opacity: 0 }, { opacity: 0.8, duration: 0.3 }, T.p1 + 10.2);
tl.fromTo("#p1-lobs", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.4, ease: "expo.out" }, T.p1 + 10.3);
for (let k = 0; k < 4; k++) tl.fromTo("#obs" + k, { opacity: 0 }, { opacity: 1, duration: 0.15 }, T.p1 + 10.35 + k * 0.18);
for (let i = 0; i < 9; i++) tl.to("#fan" + i, { opacity: 0, duration: 0.4 }, T.p1 + 10.9);
tl.fromTo("#p1-banda", { opacity: 0, scale: 0, svgOrigin: "${AST1[0]} ${AST1[1]}" }, { opacity: 1, scale: 1, svgOrigin: "${AST1[0]} ${AST1[1]}", duration: 0.6, ease: "power3.out" }, T.p1 + 11.1);
tl.fromTo("#p1-ltray", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, T.p1 + 11.4);
salida("#p1-in", T.p1 + 12.62);

// ═══ ESCENA 2 ═══
// 0–3.6 s: «estas estimaciones pueden cambiar cuando se obtiene nueva información» — el caso real de 2024 YR4
cascada("#p2-t .w2", T.p2 + 0.1, [70, 70]);
tl.fromTo(["#p2-card", "#p2-cap", "#p2-svg"], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T.p2 + 0.4);
trazo(document.getElementById("p2-linea"), T.p2 + 0.8, 2.0, "none");
const tPunto = ${JSON.stringify(fraccionesYR4)};                          // fracción de la línea en que se llega a cada punto
tPunto.forEach((f, i) => tl.fromTo("#pt" + i, { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.2, transformOrigin: "50% 50%" }, T.p2 + 0.8 + f * 2.0));
pop("#p2-pico", T.p2 + 0.85 + tPunto[2] * 2.0, 0.4);
pop("#p2-fin", T.p2 + 2.85, 0.4);
tl.fromTo("#pt5r", { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out", transformOrigin: "50% 50%" }, T.p2 + 2.85);
// 3.6–6.6 s: «la probabilidad permite analizar la incertidumbre»: con nueva información el cono se cierra
tl.set("#t2-feliz", { opacity: 0 }, 0); tl.set("#t2-duda", { opacity: 1 }, 0);
pop("#p2-tierra", T.p2 + 2.8, 0.5);
pop("#p2-ast", T.p2 + 2.9, 0.5);
const C = { abre: 1, centro: 0 }, AST = [860, 1170], TIE = [270, 1290], RT = 95;
const cono = Array.from({ length: 7 }, (_, i) => document.getElementById("cono" + i));
function abanico2() {
  const dx = TIE[0] - AST[0], dy = TIE[1] - AST[1], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, px = -uy, py = ux;
  cono.forEach((ln, i) => {
    const off = C.centro + (i - 3) * 60 * C.abre;
    const ex = TIE[0] + px * off - ux * 40, ey = TIE[1] + py * off - uy * 40;
    ln.setAttribute("x2", ex.toFixed(1)); ln.setAttribute("y2", ey.toFixed(1));
    ln.setAttribute("stroke", Math.abs(off) < RT ? "#ff5fa8" : "#4fe0ff");
  });
}
abanico2();
cono.forEach((ln, i) => tl.fromTo(ln, { opacity: 0 }, { opacity: 0.9, duration: 0.3 }, T.p2 + 3.0 + i * 0.04));
tl.fromTo("#p2-nueva", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, T.p2 + 3.2);
tl.fromTo(C, { abre: 1, centro: 0 }, { abre: 0.15, centro: 150, duration: 1.6, ease: "power2.inOut", onUpdate: abanico2, immediateRender: false }, T.p2 + 3.8);
tl.set("#t2-duda", { opacity: 0 }, T.p2 + 5.3); tl.set("#t2-feliz", { opacity: 1 }, T.p2 + 5.3);
tl.fromTo("#p2-menos", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, T.p2 + 6.0);
// 6.6–10 s: «cómo los datos científicos ayudan a evaluar posibles riesgos»
[["#p2-c1", 6.7], ["#p2-f1", 6.85], ["#p2-c2", 7.0], ["#p2-f2", 7.15], ["#p2-c3", 7.3]].forEach(([s, t]) =>
  tl.fromTo(s, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, T.p2 + t));
tl.fromTo("#p2-final", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power4.out" }, T.p2 + 7.9);
salida("#p2-in", T.p2 + 9.55);

window.__timelines["main"] = tl;
</script>
</body>
</html>
`;

// ── partir en raíz + una subcomposición por escena (como en la introducción) ──
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const [cssPagina, resto] = css.split("/* clases */");
const partesCss = resto.split(/\/\* escena (\d) \*\//);
const cssClases = partesCss[0];
const js = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const [jsRaiz, jsResto] = js.split("// utilidades");
const partesJs = jsResto.split(/\/\/ ═══ ESCENA (\d) ═══/);
const jsUtil = partesJs[0];
let cuerpo = html.match(/<body>([\s\S]*?)<script>/)[1];
fs.mkdirSync(path.join(RAIZ, "compositions"), { recursive: true });
ESC.forEach((e, k) => {
  const n = k + 1;
  const sec = cuerpo.match(new RegExp(`<!-- ESCENA ${n}[^>]*-->\\s*<section id="${e.id}"[^>]*>([\\s\\S]*?)</section>`));
  const jsEsc = partesJs[2 * n].replace(/window\.__timelines\["main"\] = tl;\s*$/, "");
  const sub = `<!doctype html>
<!-- Generado por tools/build.mjs (escena ${n}). Edita ese archivo y corre: node tools/build.mjs -->
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body>
<template>
<style>
#root{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;font-family:"Montserrat",sans-serif;color:#f4f0ff}
${cssClases}${partesCss[2 * n]}
</style>
<div id="root" data-composition-id="${e.id}" data-width="${W}" data-height="${H}">
${sec[1].trim()}
</div>
<script>
(() => {
const tl = gsap.timeline({ paused: true });
const T = { ${e.id}: 0 };
${jsUtil}
${jsEsc.trim()}
window.__timelines["${e.id}"] = tl;
})();
</script>
</template>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, "compositions", `${e.id}.html`), sub);
  cuerpo = cuerpo.replace(sec[0], `<!-- ESCENA ${n} · ${e.t0}–${e.t0 + e.d} s -->
  <div id="${e.id}" data-composition-id="${e.id}" data-composition-src="compositions/${e.id}.html" data-start="${e.t0}" data-duration="${e.d}" data-track-index="${k % 2 + 1}" data-width="${W}" data-height="${H}"></div>`);
});
const raiz = html
  .replace(/<style>[\s\S]*?<\/style>/, `<style>${cssPagina}${cssClases}</style>`)
  .replace(/<body>[\s\S]*?<\/html>/, `<body>${cuerpo}<script>
${jsRaiz.trim()}

window.__timelines["main"] = tl;
</script>
</body>
</html>
`);
fs.writeFileSync(path.join(RAIZ, "index.html"), raiz);
console.log("listo: index.html +", ESC.length, "escenas en compositions/");
