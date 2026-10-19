// Animación del CIERRE (vertical 1080×1920, 35 s, sin audio): «¿Qué problema resuelve?» + «Conclusión final»
// para la exposición «Las matemáticas ayudando a proteger nuestro planeta».
//   node tools/build.mjs   →  index.html + compositions/c1.html, c2.html, c3.html   (luego: hyperframes check / render)
// Tramos fijos (una persona habla en cada uno): 15 + 9 + 11 s.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const W = 1080, H = 1920;
const ESC = [
  { id: "c1", t0: 0, d: 15, lbl: "¿QUÉ PROBLEMA RESUELVE?" },
  { id: "c2", t0: 15, d: 9, lbl: "CONCLUSIÓN" },
  { id: "c3", t0: 24, d: 11, lbl: "CONCLUSIÓN" },
];
const DUR = 35;

// ── personajes (mismos de la introducción y de probabilidad) ──
const ojos = (cx1, cx2, cy, r = 13) => `
  <ellipse cx="${cx1}" cy="${cy}" rx="${r}" ry="${r * 1.22}" fill="#fff"/><ellipse cx="${cx2}" cy="${cy}" rx="${r}" ry="${r * 1.22}" fill="#fff"/>
  <circle cx="${cx1 + 2}" cy="${cy + 3}" r="${r * 0.62}" fill="#1b1340"/><circle cx="${cx2 + 2}" cy="${cy + 3}" r="${r * 0.62}" fill="#1b1340"/>
  <circle cx="${cx1 + 5}" cy="${cy - 1}" r="${r * 0.24}" fill="#fff"/><circle cx="${cx2 + 5}" cy="${cy - 1}" r="${r * 0.24}" fill="#fff"/>`;
const tierra = (p, duda = false) => `<svg viewBox="0 0 200 200" class="fill">
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
  <g id="${p}-feliz" opacity="${duda ? 0 : 1}"><path d="M86 124 Q100 138 114 124" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/></g>
  <g id="${p}-duda" opacity="${duda ? 1 : 0}"><path d="M88 130 Q100 124 112 130" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/></g>
</svg>`;
const asteroide = (p) => `<svg viewBox="0 0 200 200" class="fill">
  <path d="M38 74 Q52 28 104 30 Q158 26 170 78 Q184 124 148 160 Q108 184 64 166 Q22 140 38 74Z" fill="#a996d6"/>
  <ellipse cx="62" cy="62" rx="15" ry="11" fill="#7f6db3"/><ellipse cx="150" cy="128" rx="13" ry="10" fill="#7f6db3"/>
  <ellipse cx="128" cy="52" rx="8" ry="6" fill="#7f6db3"/><ellipse cx="70" cy="150" rx="10" ry="7" fill="#7f6db3"/>
  ${ojos(82, 120, 98, 12)}
  <g id="${p}-feliz"><path d="M90 128 Q101 138 112 128" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/></g>
  <g id="${p}-sorpresa" opacity="0"><ellipse cx="101" cy="132" rx="8" ry="10" fill="#1b1340"/></g>
</svg>`;
const nave = (p) => `<svg viewBox="0 0 300 140" class="fill">
  <ellipse id="${p}-fuego" cx="96" cy="70" rx="40" ry="12" fill="#4fe0ff" opacity=".55"/>
  <rect x="8" y="52" width="104" height="36" rx="4" fill="#2b5fd9" stroke="#9cc0ff" stroke-width="3"/>
  <path d="M34 52V88M60 52V88M86 52V88M8 70H112" stroke="#9cc0ff" stroke-width="2.5"/>
  <rect x="188" y="52" width="104" height="36" rx="4" fill="#2b5fd9" stroke="#9cc0ff" stroke-width="3"/>
  <path d="M214 52V88M240 52V88M266 52V88M188 70H292" stroke="#9cc0ff" stroke-width="2.5"/>
  <rect x="112" y="66" width="76" height="8" fill="#c9cfe0"/>
  <rect x="122" y="40" width="56" height="60" rx="6" fill="#e9b949" stroke="#fff3c4" stroke-width="3"/>
  <path d="M130 52H170M130 64H170M130 76H170M130 88H170" stroke="#c48f25" stroke-width="2.5"/>
  <circle cx="150" cy="30" r="13" fill="#e8ecf7" stroke="#9aa3bd" stroke-width="3"/><path d="M150 30L150 40" stroke="#9aa3bd" stroke-width="3"/>
</svg>`;
const telescopio = `<svg viewBox="0 0 200 200" class="fill">
  <path d="M100 118 L62 190 M100 118 L138 190 M100 118 L100 190" stroke="#cbbff0" stroke-width="8" stroke-linecap="round"/>
  <g transform="rotate(-38 100 104)"><rect x="40" y="86" width="132" height="38" rx="10" fill="#e9b949" stroke="#fff3c4" stroke-width="4"/>
  <rect x="160" y="80" width="26" height="50" rx="6" fill="#4fe0ff"/><rect x="22" y="94" width="22" height="22" rx="4" fill="#cbbff0"/></g>
  <circle cx="100" cy="118" r="10" fill="#cbbff0"/>
</svg>`;
const escudo = (id) => `<svg viewBox="0 0 520 520" class="fill"><path id="${id}" d="M260 20 L460 92 L460 250 Q460 410 260 500 Q60 410 60 250 L60 92 Z" fill="rgba(79,224,255,.08)" stroke="#4fe0ff" stroke-width="10" stroke-linejoin="round"/></svg>`;
const alerta = `<svg viewBox="0 0 130 120" class="fill"><path d="M65 8 L124 112 L6 112 Z" fill="#ffd257" stroke="#1b1340" stroke-width="6" stroke-linejoin="round"/>
  <rect x="58" y="40" width="14" height="42" rx="7" fill="#1b1340"/><circle cx="65" cy="96" r="8" fill="#1b1340"/></svg>`;
const visto = (id) => `<svg viewBox="0 0 150 150" class="fill"><circle cx="75" cy="75" r="70" fill="#6ef0a8"/><path id="${id}" d="M42 78 L66 102 L110 52" stroke="#140b2b" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// estrellas (PRNG con semilla), sin estrellas detrás de los textos de arriba
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20221011);
let estrellas = "";
for (let i = 0; i < 130; i++) {
  const x = Math.round(rnd() * W), y = Math.round(rnd() * (H + 80)), s = (1.5 + rnd() * 3.2).toFixed(1), o = (0.35 + rnd() * 0.6).toFixed(2);
  if (x > 64 && x < 1016 && y > 52 && y < 560) continue;
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
const puntos = (pref, n) => Array.from({ length: n }, (_, i) => `<i class="pt" id="${pref}${i}"></i>`).join("");
let grilla = "";
for (let i = 0; i < 25; i++) grilla += `<i class="gd" id="gd${i}" style="left:${(i % 5) * 50}px;top:${Math.floor(i / 5) * 50}px"></i>`;

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
#estrellas{position:absolute;left:0;top:0;width:${W}px;height:${H + 80}px}
.st{position:absolute;display:block;border-radius:50%;background:#fff6d9}
#hdr{position:absolute;left:80px;top:70px;width:${ANCHO_BARRA}px;height:80px;z-index:50}
#hdr .lbl{position:absolute;left:0;top:0;width:760px;height:34px}
#hdr .lbl span{position:absolute;left:0;top:0;font-size:26px;letter-spacing:.2em;color:#cbbff0;white-space:nowrap;opacity:0}
#hdr .num{position:absolute;right:0;top:0;width:120px;height:34px}
#hdr .num span{position:absolute;right:0;top:0;font-size:26px;letter-spacing:.12em;color:#cbbff0;opacity:0}
#barras{position:absolute;left:0;top:50px;width:${ANCHO_BARRA}px;height:10px}
.seg{position:absolute;top:0;height:10px;border-radius:5px;background:rgba(244,240,255,.16);overflow:hidden}
.segfill{width:100%;height:100%;background:#ffd257;border-radius:5px;transform-origin:0 50%}
/* clases */
.mono{font-family:"Space Mono",monospace}
.fill{width:100%;height:100%;display:block;overflow:visible}
.inner{position:absolute;inset:0}
.abs{position:absolute}
.blk{display:block}
.cyan{color:#4fe0ff}.pink{color:#ff5fa8}.yel{color:#ffd257}
.pill{position:absolute;display:flex;align-items:center;gap:14px;padding:14px 30px;border-radius:999px;font-weight:800;font-size:38px;white-space:nowrap}
.pill.amarilla{background:#ffd257;color:#1b1340}
.pill.borde{border:4px solid currentColor;background:rgba(20,11,43,.92)}
.chip{position:absolute;display:block;padding:12px 26px;border-radius:18px;font-size:34px;white-space:nowrap;background:rgba(20,11,43,.92)}
.pt{position:absolute;display:block;width:16px;height:16px;border-radius:50%;opacity:0}
.titulo{font-weight:900;letter-spacing:-0.04em;line-height:1.02}
.gd{position:absolute;display:block;width:36px;height:36px;border-radius:50%;background:#7d6bc0}
/* escena 1 */
#c1-t{left:80px;top:200px;width:920px}
#c1-t .a{font-size:100px}
#c1-pill{left:80px;top:440px;transform-origin:0 50%}
#c1-tierra{left:150px;top:1050px;width:320px;height:320px}
#c1-ast{left:720px;top:590px;width:200px;height:200px}
#c1-svg{left:0;top:0;width:${W}px;height:${H}px}
#c1-alerta{left:610px;top:900px;width:130px;height:120px}
#c1-lpel{left:560px;top:1050px;color:#ff5fa8;border:3px solid #ff5fa8}
#c1-nave{left:0;top:0;width:300px;height:140px}
#c1-flash{left:660px;top:630px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#ffd257 35%,rgba(255,95,168,0) 70%)}
#c1-exp{left:80px;top:560px;color:#4fe0ff;border:3px solid #4fe0ff}
#c1-orb{left:600px;top:516px;color:#ffd257;font-size:32px;padding:10px 24px}
#c1-q{left:80px;top:1500px;width:920px}
#c1-q .q{font-size:62px;font-weight:800;letter-spacing:-0.03em;line-height:1.08}
#c1-ok{left:80px;top:1500px;width:920px;height:170px;display:flex;align-items:center;gap:28px}
#c1-ok .c{width:140px;height:140px;flex:none}
#c1-ok .t{font-size:60px;font-weight:900;letter-spacing:-0.03em;line-height:1.05}
/* escena 2 */
#c2-t{left:80px;top:200px;font-size:110px}
#c2-raya{left:84px;top:330px;width:440px;height:10px;border-radius:5px;background:#ffd257;transform-origin:0 50%}
#c2-d{left:70px;top:400px;width:940px;height:560px;border-radius:30px;background:rgba(20,11,43,.92);border:4px solid #4fe0ff;transform-origin:50% 50%}
#c2-dt{left:110px;top:440px;font-size:72px;color:#4fe0ff}
#c2-ddt{left:110px;top:545px;background:#ffd257;color:#1b1340;font-size:44px;font-weight:700}
#c2-dsvg{left:600px;top:560px;width:380px;height:300px}
#c2-c1{left:110px;top:850px;color:#4fe0ff;border:4px solid #4fe0ff}
#c2-c2{left:390px;top:850px;color:#ffd257;border:4px solid #ffd257}
#c2-p{left:70px;top:1010px;width:940px;height:560px;border-radius:30px;background:rgba(20,11,43,.92);border:4px solid #ff5fa8;transform-origin:50% 50%}
#c2-pt{left:110px;top:1050px;font-size:72px;color:#ff5fa8}
#c2-ppab{left:110px;top:1160px;background:#ffd257;color:#1b1340;font-size:44px;font-weight:700}
#c2-grid{left:720px;top:1160px;width:236px;height:236px}
#c2-c3{left:110px;top:1460px;color:#ff5fa8;border:4px solid #ff5fa8}
#c2-c4{left:340px;top:1460px;color:#4fe0ff;border:4px solid #4fe0ff}
/* escena 3 */
#c3-t1{left:80px;top:200px;width:920px}
#c3-t1 .a{font-size:96px}
#c3-t1 .b{font-size:60px;font-weight:700;letter-spacing:-0.02em;margin-top:8px;color:#e3dbff}
#c3-piz{left:140px;top:640px;width:800px;height:440px;border-radius:24px;background:#f4f0ff;border:12px solid #8a7fa8;padding:44px 50px;transform-origin:50% 50%}
#c3-piz .l{display:block;font-size:56px;font-weight:700;color:#1b1340;margin-bottom:26px;white-space:nowrap}
#c3-piz sup{font-size:.62em;line-height:0;vertical-align:.55em}
#c3-ban{left:200px;top:1070px;width:680px;height:22px;border-radius:6px;background:#8a7fa8}
#c3-t2{left:80px;top:200px;width:920px}
#c3-t2 .a{font-size:64px;font-weight:800;letter-spacing:-0.03em;line-height:1.08}
#c3-uni{left:0;top:0;width:${W}px;height:${H}px}
#c3-sol{left:450px;top:960px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,#fff6c9 0%,#ffd257 45%,rgba(255,210,87,0) 72%)}
#c3-ti{left:0;top:0;width:120px;height:120px}
#c3-as{left:0;top:0;width:80px;height:80px}
#c3-tel{left:90px;top:1380px;width:170px;height:170px}
#c3-uchip{left:300px;top:1440px;color:#4fe0ff;border:4px solid #4fe0ff}
#c3-fin-t{left:80px;top:200px;width:920px}
#c3-fin-t .a{font-size:98px}
#c3-fin-t .b{font-size:72px;font-weight:700;letter-spacing:-0.02em;margin:10px 0 6px;color:#e3dbff}
#c3-escudo{left:270px;top:760px;width:540px;height:540px}
#c3-tierra{left:370px;top:829px;width:340px;height:340px}
#c3-pill{left:0;top:1400px;width:${W}px;display:flex;justify-content:center}
#c3-pill .pill{position:relative}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}">
  <div id="cielo"></div>
  <div id="brillo1"></div><div id="brillo2"></div>
  <div id="estrellas">${estrellas}</div>

  <div id="hdr"><div class="lbl mono"><span id="l1">${ESC[0].lbl}</span><span id="l2">CONCLUSIÓN</span></div>
    <div class="num mono">${ESC.map((e, i) => `<span id="n${i + 1}">${i + 1} / ${ESC.length}</span>`).join("")}</div>
    <div id="barras">${barras}</div></div>

  <!-- ESCENA 1 · 0–15 s -->
  <section id="c1" data-start="0" data-duration="15"><div class="inner" id="c1-in">
    <div id="c1-t" class="abs titulo"><div class="a blk w">¿Qué problema</div><div class="a blk w"><span class="yel">resuelve?</span></div></div>
    <div id="c1-pill" class="pill amarilla">MISIÓN DART</div>
    <div id="c1-exp" class="chip">experimento real · 2022</div>
    <svg id="c1-svg" class="abs" viewBox="0 0 ${W} ${H}">
      <path id="c1-peligro" d="M 800 720 Q 560 860 360 1120" fill="none" stroke="#ff5fa8" stroke-width="8" stroke-linecap="round"/>
      <path id="c1-nuevo" d="M 800 720 Q 500 780 100 720" fill="none" stroke="#4fe0ff" stroke-width="8" stroke-linecap="round"/>
    </svg>
    <div id="c1-tierra" class="abs">${tierra("t1")}</div>
    <div id="c1-ast" class="abs">${asteroide("a1")}</div>
    <div id="c1-alerta" class="abs">${alerta}</div>
    <div id="c1-lpel" class="chip">peligro para la Tierra</div>
    <div id="c1-flash" class="abs"></div>
    ${puntos("c1p", 16)}
    <div id="c1-nave" class="abs" data-layout-allow-overflow>${nave("n1")}</div>
    <div id="c1-orb" class="pill borde mono">órbita: −32 min</div>
    <div id="c1-q" class="abs"><div class="q blk w1">¿Cómo desviar un</div><div class="q blk w1">asteroide <span class="pink">peligroso?</span></div></div>
    <div id="c1-ok" class="abs"><div class="c">${visto("c1-tick")}</div><div class="t">¡El impacto cambió <span class="cyan">su movimiento!</span></div></div>
  </div></section>

  <!-- ESCENA 2 · 15–24 s -->
  <section id="c2" data-start="15" data-duration="9"><div class="inner" id="c2-in">
    <div id="c2-t" class="abs titulo">Conclusión</div>
    <div id="c2-raya" class="abs"></div>
    <div id="c2-d" class="abs"></div>
    <div id="c2-dt" class="abs titulo">DERIVADAS</div>
    <div id="c2-ddt" class="chip mono">d/dt</div>
    <svg id="c2-dsvg" class="abs" viewBox="0 0 380 300">
      <path id="c2-ejes" d="M30 20 L30 270 L360 270" fill="none" stroke="#cbbff0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="c2-curva" d="M30 270 Q 210 262 350 40" fill="none" stroke="#4fe0ff" stroke-width="8" stroke-linecap="round"/>
      <defs><clipPath id="c2-clip"><rect x="32" y="10" width="340" height="258"/></clipPath></defs>
      <line id="c2-tan" data-layout-allow-overflow x1="0" y1="0" x2="0" y2="0" stroke="#ffd257" stroke-width="6" stroke-linecap="round" opacity="0" clip-path="url(#c2-clip)"/>
      <circle id="c2-mark" cx="0" cy="0" r="12" fill="#ff5fa8" stroke="#fff" stroke-width="4" opacity="0"/>
    </svg>
    <div id="c2-c1" class="chip">movimiento</div>
    <div id="c2-c2" class="chip">energía</div>
    <div id="c2-p" class="abs"></div>
    <div id="c2-pt" class="abs titulo">PROBABILIDAD</div>
    <div id="c2-ppab" class="chip mono">P(A|B)</div>
    <div id="c2-grid" class="abs">${grilla}</div>
    <div id="c2-c3" class="chip">riesgos</div>
    <div id="c2-c4" class="chip">incertidumbre</div>
  </div></section>

  <!-- ESCENA 3 · 24–35 s -->
  <section id="c3" data-start="24" data-duration="11"><div class="inner" id="c3-in">
    <div id="c3-t1" class="abs titulo"><div class="a blk w3">Las matemáticas</div><div class="b blk w3">no solo se usan en el aula…</div></div>
    <div id="c3-piz" class="abs mono"><span class="l" id="c3-l1">v = ds/dt</span><span class="l" id="c3-l2">E = m·v<sup>2</sup>/2</span><span class="l" id="c3-l3">P(A|B) = 4/100</span></div>
    <div id="c3-ban" class="abs"></div>
    <div id="c3-t2" class="abs titulo"><div class="a blk w4">…también ayudan</div><div class="a blk w4">a los científicos a</div><div class="a blk w4"><span class="cyan">comprender el universo</span></div></div>
    <svg id="c3-uni" class="abs" viewBox="0 0 ${W} ${H}">
      <ellipse id="c3-o1" cx="540" cy="1050" rx="400" ry="170" fill="none" stroke="#4fe0ff" stroke-width="4" stroke-dasharray="14 18" opacity="0"/>
      <ellipse id="c3-o2" cx="540" cy="1050" rx="250" ry="105" fill="none" stroke="#ff5fa8" stroke-width="4" stroke-dasharray="10 16" opacity="0"/>
    </svg>
    <div id="c3-sol" class="abs"></div>
    <div id="c3-ti" class="abs">${tierra("t3a")}</div>
    <div id="c3-as" class="abs">${asteroide("a3")}</div>
    <div id="c3-tel" class="abs">${telescopio}</div>
    <div id="c3-uchip" class="chip">ciencia + matemáticas</div>
    <div id="c3-fin-t" class="abs titulo"><div class="a blk w5">Las matemáticas</div><div class="b blk w5">ayudando a proteger</div><div class="a blk w5">nuestro <span class="cyan">planeta</span></div></div>
    <div id="c3-escudo" class="abs">${escudo("c3-esc")}</div>
    <div id="c3-tierra" class="abs">${tierra("t3b")}</div>
    <div id="c3-pill" class="abs"><div class="pill amarilla">MISIÓN DART · NASA</div></div>
  </div></section>
</div>

<script>
const tl = gsap.timeline({ paused: true });
const T = { c1: 0, c2: 15, c3: 24 };
const DUR = ${DUR};

// ── fondo y encabezado ──
tl.fromTo("#estrellas", { y: 0 }, { y: -70, duration: DUR, ease: "none" }, 0);
[0, 1, 2].forEach((g, i) => {
  const ciclo = 2.2 + i * 0.7;
  tl.fromTo(".tw" + g, { opacity: 0.25 + 0.1 * i }, { opacity: 1, duration: ciclo / 2, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / (ciclo / 2)) - 1) }, 0.3 * i);
});
tl.fromTo("#brillo1", { scale: 0.9 }, { scale: 1.12, duration: 4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / 4) - 1) }, 0);
tl.fromTo("#brillo2", { scale: 1.1 }, { scale: 0.9, duration: 5, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / 5) - 1) }, 0);
const TR = [[0, 15], [15, 9], [24, 11]];
TR.forEach(([t0, d], i) => {
  tl.fromTo("#bar" + (i + 1), { scaleX: 0 }, { scaleX: 1, duration: d, ease: "none" }, t0);
  tl.fromTo("#n" + (i + 1), { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0);
  if (i < TR.length - 1) tl.to("#n" + (i + 1), { opacity: 0, duration: 0.2 }, t0 + d - 0.2);
});
tl.fromTo("#l1", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
tl.to("#l1", { opacity: 0, duration: 0.2 }, 14.8);
tl.fromTo("#l2", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 15);
tl.to("#hdr", { opacity: 0, duration: 0.5 }, DUR - 0.6);

// utilidades
function salida(id, t) { tl.fromTo(id, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power2.in", immediateRender: false }, t); }
function cascada(sel, t, dy = [80, 50, 80]) {
  document.querySelectorAll(sel).forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, y: dy[i % dy.length] }, { opacity: 1, y: 0, duration: 0.3, ease: "power4.out" }, t + i * 0.16);
  });
}
function pop(sel, t, d = 0.6, extra = {}) { tl.fromTo(sel, { scale: 0, opacity: 0, ...extra.from }, { scale: 1, opacity: 1, duration: d, ease: "power3.out", ...extra.to }, t); }
function trazo(el, t, d) { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
  tl.fromTo(el, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease: "power2.out" }, t); }
function entra(sel, t, from = { y: 30 }) { tl.fromTo(sel, { opacity: 0, ...from }, { opacity: 1, x: 0, y: 0, duration: 0.4, ease: "expo.out" }, t); }

// ═══ ESCENA 1 ═══
// 0–2.9 s: «la misión DART busca resolver un problema importante»
cascada("#c1-t .w", T.c1 + 0.2, [80, 80]);
pop("#c1-pill", T.c1 + 0.9, 0.5);
// 2.9–7.5 s: «cómo desviar un asteroide que podría representar un peligro para la Tierra»
pop("#c1-tierra", T.c1 + 1.5, 0.7, { from: { y: 80 }, to: { y: 0 } });
pop("#c1-ast", T.c1 + 2.2, 0.6, { from: { rotation: -20 }, to: { rotation: 0 } });
tl.fromTo("#c1-ast", { y: 0 }, { y: -10, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: 3, immediateRender: false }, T.c1 + 2.9);
trazo(document.getElementById("c1-peligro"), T.c1 + 3.4, 1.0);
pop("#c1-alerta", T.c1 + 4.5, 0.45);
tl.fromTo("#c1-alerta", { scale: 1 }, { scale: 1.12, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 5, immediateRender: false }, T.c1 + 5.0);
entra("#c1-lpel", T.c1 + 5.6);
tl.set("#t1-feliz", { opacity: 0 }, T.c1 + 6.0); tl.set("#t1-duda", { opacity: 1 }, T.c1 + 6.0);
document.querySelectorAll("#c1-q .q").forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4, ease: "power4.out" }, T.c1 + 3.2 + i * 0.22));
// 7.5–11.5 s: «gracias a este experimento, se demostró que el impacto de una nave…»
entra("#c1-exp", T.c1 + 7.5, { x: -40 });
tl.to(["#c1-alerta", "#c1-lpel"], { opacity: 0, duration: 0.3 }, T.c1 + 7.4);
tl.set("#c1-nave", { x: 230, y: 1040, rotation: -44 }, T.c1 + 7.7);
tl.fromTo("#c1-nave", { scale: 0.3, opacity: 0 }, { scale: 0.7, opacity: 1, duration: 0.3, ease: "power2.out" }, T.c1 + 7.7);
tl.fromTo("#c1-nave", { x: 230, y: 1040 }, { x: 585, y: 695, duration: 1.4, ease: "power2.in", immediateRender: false }, T.c1 + 8.0);
tl.fromTo("#n1-fuego", { opacity: 0.2 }, { opacity: 0.8, duration: 0.25, ease: "sine.inOut", yoyo: true, repeat: 5, immediateRender: false }, T.c1 + 7.8);
tl.to("#c1-nave", { opacity: 0, scale: 0.2, duration: 0.12, ease: "power2.in" }, T.c1 + 9.4);
tl.fromTo("#c1-flash", { scale: 0, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 0.7, ease: "power2.out" }, T.c1 + 9.4);
tl.set("#a1-feliz", { opacity: 0 }, T.c1 + 9.42); tl.set("#a1-sorpresa", { opacity: 1 }, T.c1 + 9.42);
for (let i = 0; i < 16; i++) {                        // polvo: sale hacia atrás, hacia donde venía la nave
  const a = (3 * Math.PI) / 4 + (i / 15 - 0.5) * 1.9, r = 120 + (i * 47) % 150;
  const el = document.getElementById("c1p" + i);
  el.style.left = "762px"; el.style.top = "732px"; el.style.background = i % 3 ? "#cbbff0" : "#ffd257";
  tl.fromTo(el, { x: 0, y: 0, opacity: 1, scale: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: 0.4, duration: 1.1, ease: "power2.out", immediateRender: false }, T.c1 + 9.4 + (i % 4) * 0.02);
}
// 11.5–15 s: «…puede modificar el movimiento de un asteroide»: la trayectoria se curva lejos de la Tierra
tl.to("#c1-peligro", { opacity: 0.12, duration: 0.5 }, T.c1 + 11.3);
trazo(document.getElementById("c1-nuevo"), T.c1 + 11.5, 1.1);
tl.fromTo("#c1-ast", { x: 0, y: 0 }, { x: -209, y: 55, duration: 2.6, ease: "power1.inOut", immediateRender: false }, T.c1 + 11.6);
tl.set("#t1-duda", { opacity: 0 }, T.c1 + 12.3); tl.set("#t1-feliz", { opacity: 1 }, T.c1 + 12.3);
tl.set("#a1-sorpresa", { opacity: 0 }, T.c1 + 12.3); tl.set("#a1-feliz", { opacity: 1 }, T.c1 + 12.3);
pop("#c1-orb", T.c1 + 12.4, 0.45);
tl.to("#c1-q", { opacity: 0, duration: 0.3 }, T.c1 + 12.2);
pop("#c1-ok", T.c1 + 12.6, 0.5);
trazo(document.getElementById("c1-tick"), T.c1 + 12.9, 0.4);
salida("#c1-in", T.c1 + 14.62);

// ═══ ESCENA 2 ═══
// 0–4.8 s: «las derivadas nos permiten analizar los cambios en el movimiento y la energía»
tl.fromTo("#c2-t", { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power4.out" }, T.c2 + 0.1);
tl.fromTo("#c2-raya", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, T.c2 + 0.4);
tl.fromTo(["#c2-d", "#c2-dt"], { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T.c2 + 0.9);
pop("#c2-ddt", T.c2 + 1.3, 0.4);
const ej = document.getElementById("c2-ejes"), cu = document.getElementById("c2-curva");
trazo(ej, T.c2 + 1.3, 0.5); trazo(cu, T.c2 + 1.6, 0.8);
const tan = document.getElementById("c2-tan"), mark = document.getElementById("c2-mark");
const Q = (t) => [(1 - t) ** 2 * 30 + 2 * (1 - t) * t * 210 + t * t * 350, (1 - t) ** 2 * 270 + 2 * (1 - t) * t * 262 + t * t * 40];
const S = { p: 0.1 };
function tangente() {
  const [x, y] = Q(S.p), [x2, y2] = Q(Math.min(1, S.p + 0.01)), dx = x2 - x, dy = y2 - y, n = Math.hypot(dx, dy), L = 90;
  tan.setAttribute("x1", (x - dx / n * L).toFixed(1)); tan.setAttribute("y1", (y - dy / n * L).toFixed(1));
  tan.setAttribute("x2", (x + dx / n * L).toFixed(1)); tan.setAttribute("y2", (y + dy / n * L).toFixed(1));
  mark.setAttribute("cx", x.toFixed(1)); mark.setAttribute("cy", y.toFixed(1));
}
tangente();
tl.fromTo([tan, mark], { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.c2 + 2.3);
tl.fromTo(S, { p: 0.1 }, { p: 0.9, duration: 2.2, ease: "power1.inOut", onUpdate: tangente, immediateRender: false }, T.c2 + 2.4);
entra("#c2-c1", T.c2 + 3.3);
entra("#c2-c2", T.c2 + 4.0);
// 4.8–9 s: «la probabilidad nos ayuda a estudiar los riesgos y la incertidumbre»
tl.fromTo(["#c2-p", "#c2-pt"], { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T.c2 + 5.0);
pop("#c2-ppab", T.c2 + 5.4, 0.4);
for (let i = 0; i < 25; i++) {
  const f = Math.floor(i / 5), c = i % 5;
  tl.fromTo("#gd" + i, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" }, T.c2 + 5.6 + f * 0.05 + c * 0.015);
  tl.fromTo("#gd" + i, { opacity: 1 }, { opacity: 0.45, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 2, immediateRender: false }, T.c2 + 6.6 + ((f + c) % 5) * 0.08);
}
tl.fromTo("#gd12", { backgroundColor: "#7d6bc0", scale: 1 }, { backgroundColor: "#ff5fa8", scale: 1.25, duration: 0.3, ease: "power3.out", immediateRender: false }, T.c2 + 6.6);
entra("#c2-c3", T.c2 + 6.9);
entra("#c2-c4", T.c2 + 7.4);
salida("#c2-in", T.c2 + 8.62);

// ═══ ESCENA 3 ═══
// 0–3.8 s: «las matemáticas no solo se utilizan en el aula»
cascada("#c3-t1 .w3", T.c3 + 0.15, [80, 50]);
tl.fromTo(["#c3-piz", "#c3-ban"], { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T.c3 + 0.5);
["#c3-l1", "#c3-l2", "#c3-l3"].forEach((s, i) => tl.fromTo(s, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "none" }, T.c3 + 0.9 + i * 0.75));
// 3.8–7.7 s: «también ayudan a los científicos a comprender el universo»: atravesamos el tablero hacia el espacio
tl.to("#c3-t1", { opacity: 0, duration: 0.3 }, T.c3 + 3.7);
tl.fromTo("#c3-piz", { scale: 1 }, { scale: 2.6, opacity: 0, duration: 0.7, ease: "power2.in", immediateRender: false }, T.c3 + 3.8);
tl.to("#c3-ban", { opacity: 0, duration: 0.3 }, T.c3 + 3.8);
cascada("#c3-t2 .w4", T.c3 + 4.0, [60, 60, 60]);
pop("#c3-sol", T.c3 + 4.3, 0.8);
tl.fromTo(["#c3-o1", "#c3-o2"], { opacity: 0 }, { opacity: 0.8, duration: 0.5 }, T.c3 + 4.4);
const O = { a: 0 }, ti = document.getElementById("c3-ti"), as = document.getElementById("c3-as");
function orbitas() {
  const a1 = O.a, a2 = -O.a * 1.6 + 2.2;
  gsap.set(ti, { x: 540 + 400 * Math.cos(a1) - 60, y: 1050 + 170 * Math.sin(a1) - 60 });
  gsap.set(as, { x: 540 + 250 * Math.cos(a2) - 40, y: 1050 + 105 * Math.sin(a2) - 40 });
}
orbitas();
tl.fromTo([ti, as], { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.c3 + 4.5);
tl.fromTo(O, { a: 0 }, { a: Math.PI * 1.1, duration: 3.6, ease: "none", onUpdate: orbitas, immediateRender: false }, T.c3 + 4.4);
pop("#c3-tel", T.c3 + 5.4, 0.5, { from: { rotation: -15 }, to: { rotation: 0 } });
entra("#c3-uchip", T.c3 + 5.8, { x: -30 });
// 7.7–11 s: «y desarrollar posibles soluciones para proteger nuestro planeta»
tl.to(["#c3-t2", "#c3-sol", "#c3-o1", "#c3-o2", ti, as, "#c3-tel", "#c3-uchip"], { opacity: 0, duration: 0.4 }, T.c3 + 7.5);
cascada("#c3-fin-t .w5", T.c3 + 7.9);
pop("#c3-tierra", T.c3 + 8.0, 0.8, { from: { y: 80 }, to: { y: 0 } });
trazo(document.getElementById("c3-esc"), T.c3 + 8.4, 1.0);
tl.fromTo("#c3-escudo", { opacity: 0 }, { opacity: 1, duration: 0.2 }, T.c3 + 8.4);
tl.fromTo("#c3-pill", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, T.c3 + 9.2);
tl.fromTo("#c3-tierra", { y: 0 }, { y: -10, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: 1, immediateRender: false }, T.c3 + 9.0);
salida("#c3-in", T.c3 + 10.55);

window.__timelines["main"] = tl;
</script>
</body>
</html>
`;

// ── partir en raíz + una subcomposición por escena ──
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
