// Introducción animada (vertical 1080×1920, 58 s, sin audio) para la exposición
// «Las matemáticas ayudando a proteger nuestro planeta» — misión DART.
//   node tools/build.mjs   →  index.html   (luego: npx hyperframes check / render)
// Tramos fijos (una persona habla en cada uno): 16 + 16 + 9 + 10 + 7 s.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const W = 1080, H = 1920;
const ESC = [
  { id: "s1", t0: 0, d: 16 },
  { id: "s2", t0: 16, d: 16 },
  { id: "s3", t0: 32, d: 9 },
  { id: "s4", t0: 41, d: 10 },
  { id: "s5", t0: 51, d: 7 },
];
const DUR = 58;

// ── personajes (SVG en línea; cada instancia con su prefijo para que los id no choquen) ──
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
  <path d="M86 124 Q100 138 114 124" stroke="#1b1340" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;

const asteroide = (p, { color = "#a996d6", sombra = "#7f6db3", grande = false } = {}) => `<svg viewBox="0 0 200 200" class="fill">
  <path d="${grande ? "M28 84 Q40 30 98 24 Q158 20 178 72 Q194 128 152 166 Q104 192 56 170 Q12 142 28 84Z" : "M38 74 Q52 28 104 30 Q158 26 170 78 Q184 124 148 160 Q108 184 64 166 Q22 140 38 74Z"}" fill="${color}"/>
  <ellipse cx="62" cy="62" rx="15" ry="11" fill="${sombra}"/><ellipse cx="150" cy="128" rx="13" ry="10" fill="${sombra}"/>
  <ellipse cx="128" cy="52" rx="8" ry="6" fill="${sombra}"/><ellipse cx="70" cy="150" rx="10" ry="7" fill="${sombra}"/>
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

// estrellas con PRNG con semilla (determinista)
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20220926);
let estrellas = "";
for (let i = 0; i < 130; i++) {
  const x = Math.round(rnd() * W), y = Math.round(rnd() * (H + 120)), s = (1.5 + rnd() * 3.2).toFixed(1), o = (0.35 + rnd() * 0.6).toFixed(2);
  estrellas += `<i class="st tw${i % 3}" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;opacity:${o}"></i>`;
}

// barra de progreso: un segmento por tramo (ancho proporcional a su duración)
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
for (let i = 0; i < 100; i++) grilla += `<i class="dot" id="g${i}"></i>`;

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
.mono{font-family:"Space Mono",monospace}
.fill{width:100%;height:100%;display:block;overflow:visible}
#cielo{position:absolute;inset:0;background:radial-gradient(900px 1100px at 50% 42%,#3a2373 0%,#241452 45%,#140b2b 100%)}
#brillo1,#brillo2{position:absolute;border-radius:50%;width:900px;height:900px}
#brillo1{left:-380px;top:180px;background:radial-gradient(circle,rgba(255,95,168,.22),rgba(255,95,168,0) 65%)}
#brillo2{left:560px;top:1080px;background:radial-gradient(circle,rgba(79,224,255,.2),rgba(79,224,255,0) 65%)}
#estrellas{position:absolute;left:0;top:0;width:${W}px;height:${H + 120}px}
.st{position:absolute;display:block;border-radius:50%;background:#fff6d9}
#hdr{position:absolute;left:80px;top:70px;width:${ANCHO_BARRA}px;height:80px;z-index:50}
#hdr .lbl{position:absolute;left:0;top:0;font-size:26px;letter-spacing:.22em;color:#cbbff0}
#hdr .num{position:absolute;right:0;top:0;width:120px;height:34px}
#hdr .num span{position:absolute;right:0;top:0;font-size:26px;letter-spacing:.12em;color:#cbbff0;opacity:0}
#barras{position:absolute;left:0;top:50px;width:${ANCHO_BARRA}px;height:10px}
.seg{position:absolute;top:0;height:10px;border-radius:5px;background:rgba(244,240,255,.16);overflow:hidden}
.segfill{width:100%;height:100%;background:#4fe0ff;border-radius:5px;transform-origin:0 50%}
/* clases */
.scene{position:absolute;inset:0}
.inner{position:absolute;inset:0}
.abs{position:absolute}
.blk{display:block}
.cyan{color:#4fe0ff}.pink{color:#ff5fa8}.yel{color:#ffd257}
.pill{position:absolute;display:flex;align-items:center;gap:14px;padding:14px 30px;border-radius:999px;font-weight:800;font-size:38px;white-space:nowrap}
.pill.amarilla{background:#ffd257;color:#1b1340}
.pill.borde{border:4px solid currentColor;background:rgba(20,11,43,.55)}
.chip{position:absolute;display:block;padding:12px 26px;border-radius:18px;font-size:34px;white-space:nowrap}
.pt{position:absolute;display:block;width:16px;height:16px;border-radius:50%;opacity:0}
.titulo{font-weight:900;letter-spacing:-0.04em;line-height:1.02}
/* escena 1 */
#s1-title{left:80px;top:210px;width:920px;transform-origin:0 0}
#s1-title .a{font-size:98px}
#s1-title .b{font-size:72px;font-weight:700;letter-spacing:-0.02em;margin:10px 0 6px;color:#e3dbff}
#s1-earth{left:260px;top:820px;width:560px;height:560px}
#s1-ring{left:150px;top:960px;width:780px;height:280px}
#s1-pill{left:80px;top:400px;transform-origin:0 50%}
#s1-pillsub{left:84px;top:492px;font-size:28px;color:#cbbff0;letter-spacing:.06em}
#s1-nave{left:0;top:0;width:300px;height:140px}
#s1-ast{left:705px;top:645px;width:230px;height:230px}
#s1-tray{left:0;top:0;width:${W}px;height:${H}px}
#s1-q{left:80px;top:1500px;width:920px}
#s1-q .tag{display:inline-block;padding:10px 24px;border-radius:999px;border:4px solid #ff5fa8;color:#ff5fa8;font-size:30px;font-weight:800;letter-spacing:.08em;margin-bottom:20px}
#s1-q .q{font-size:64px;font-weight:800;letter-spacing:-0.03em;line-height:1.08}
#s1-chip2{left:520px;top:1385px;color:#4fe0ff;border:3px solid #4fe0ff;background:rgba(20,11,43,.6)}
/* escena 2 */
#s2-cal{left:340px;top:260px;width:400px;height:380px;border-radius:34px;background:#f4f0ff;overflow:hidden;transform-origin:50% 50%}
#s2-cal .top{height:96px;background:#ff5fa8;color:#1b1340;font-size:44px;font-weight:700;letter-spacing:.08em;display:flex;align-items:center;justify-content:center}
#s2-cal .dia{height:284px;display:flex;align-items:center;justify-content:center;line-height:1;font-size:176px;font-weight:700;color:#1b1340;letter-spacing:-0.04em}
#s2-calsub{left:0;top:670px;width:${W}px;text-align:center;font-size:40px;font-weight:700;color:#e3dbff}
#s2-dimo{left:390px;top:900px;width:300px;height:300px}
#s2-didy{left:330px;top:870px;width:420px;height:420px}
#s2-nave{left:0;top:0;width:300px;height:140px}
#s2-flash{left:280px;top:930px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#ffd257 35%,rgba(255,95,168,0) 70%)}
#s2-boom{left:120px;top:780px;color:#ff5fa8;font-size:64px;font-weight:900;letter-spacing:-0.02em}
#s2-orb{left:0;top:0;width:${W}px;height:${H}px}
#s2-l1{left:310px;top:1335px;color:#e3dbff}
#s2-l2{left:260px;top:735px;color:#ffd257}
#s2-rep{left:560px;top:240px;width:440px;height:178px;border-radius:26px;background:rgba(244,240,255,.1);border:3px solid rgba(244,240,255,.35);padding:26px 28px}
#s2-rep .t{font-size:36px;font-weight:800;margin-left:96px}
#s2-rep .s{font-size:28px;color:#cbbff0;margin-left:96px;margin-top:8px}
#s2-rep svg{position:absolute;left:28px;top:34px;width:72px;height:96px}
#s2-per{left:80px;top:1440px;width:920px;height:280px;border-radius:30px;background:rgba(20,11,43,.62);border:3px solid rgba(79,224,255,.55);padding:30px 40px}
#s2-per .l{font-size:28px;letter-spacing:.14em;color:#cbbff0}
#s2-per .v{font-size:96px;font-weight:700;letter-spacing:-0.03em;margin-top:6px}
#s2-menos{left:780px;top:1560px;font-size:34px;padding:12px 24px;background:#ff5fa8;color:#1b1340;transform-origin:0 50%}
#s2-ok{left:80px;top:560px;width:920px;height:200px;display:flex;align-items:center;gap:30px}
#s2-ok .c{width:150px;height:150px;flex:none}
#s2-ok .t{font-size:72px;font-weight:900;letter-spacing:-0.03em;line-height:1}
/* escena 3 */
#s3-q{left:80px;top:220px;width:920px}
#s3-q .l{font-size:74px}
#s3-lupa{left:868px;top:212px;width:132px;height:132px}
#s3-big{left:80px;top:440px;font-size:132px;color:#4fe0ff;transform-origin:0 50%}
#s3-ddt{left:80px;top:625px;background:#ffd257;color:#1b1340;font-size:46px;font-weight:700;transform-origin:0 50%}
#s3-ddt2{left:330px;top:640px;font-size:32px;color:#e3dbff}
#s3-panel{left:70px;top:760px;width:940px;height:760px;border-radius:34px;background:rgba(20,11,43,.6);border:3px solid rgba(244,240,255,.22)}
#s3-svg{left:70px;top:760px;width:940px;height:760px}
#s3-read{left:120px;top:800px;padding:18px 26px;border-radius:20px;background:#1b1340;border:3px solid #ffd257;min-width:470px}
#s3-read .a{font-size:30px;color:#ffd257}
#s3-read .b{font-size:52px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:4px}
#s3-c1{left:80px;top:1580px;color:#4fe0ff;border:4px solid #4fe0ff}
#s3-c2{left:420px;top:1580px;color:#ffd257;border:4px solid #ffd257}
/* escena 4 */
#s4-t{left:80px;top:210px;width:920px}
#s4-t .a{font-size:100px;color:#ff5fa8}
#s4-t .b{font-size:56px;font-weight:700;letter-spacing:-0.02em;margin-top:8px;color:#e3dbff}
#s4-f{left:80px;top:500px;width:920px;padding:26px 0;border-radius:26px;border:4px solid #ffd257;background:rgba(20,11,43,.6);text-align:center;font-size:54px;font-weight:700;transform-origin:50% 50%}
#s4-inc{left:80px;top:700px;color:#4fe0ff}
#s4-grid{left:268px;top:800px;width:544px;height:544px}
.dot{position:absolute;display:block;width:40px;height:40px;border-radius:50%;background:#7d6bc0}
#s4-esc{left:0;top:1370px;width:${W}px;text-align:center;font-size:32px;color:#cbbff0}
#s4-riesgo{left:80px;top:1460px;width:920px;padding:24px 0;border-radius:26px;background:#ff5fa8;color:#1b1340;text-align:center;transform-origin:50% 50%}
#s4-riesgo .a{font-size:34px;font-weight:800;letter-spacing:.06em}
#s4-riesgo .b{font-size:72px;font-weight:700;margin-top:4px}
/* escena 5 */
#s5-pre{left:80px;top:250px;font-size:60px;font-weight:700;color:#e3dbff}
#s5-card{left:80px;top:340px;width:920px;height:200px;border-radius:34px;background:#4fe0ff;color:#140b2b;display:flex;align-items:center;justify-content:center;font-size:92px;font-weight:900;letter-spacing:-0.04em;transform-origin:50% 50%}
#s5-a{left:80px;top:640px;color:#4fe0ff;border:4px solid #4fe0ff;font-size:44px}
#s5-b{left:560px;top:760px;color:#ffd257;border:4px solid #ffd257;font-size:44px}
#s5-c{left:180px;top:880px;color:#ff5fa8;border:4px solid #ff5fa8;font-size:44px}
#s5-caja{left:400px;top:1040px;width:280px;height:200px;border-radius:30px;border:5px solid #4fe0ff;background:#1b1340;display:flex;align-items:center;justify-content:center;font-size:92px;font-weight:700;transform-origin:50% 50%}
#s5-svg{left:0;top:0;width:${W}px;height:${H}px}
#s5-fin{left:0;top:1690px;width:${W}px;text-align:center;font-size:34px;color:#e3dbff}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}">
  <div id="cielo"></div>
  <div id="brillo1"></div><div id="brillo2"></div>
  <div id="estrellas">${estrellas}</div>

  <div id="hdr"><div class="lbl mono">INTRODUCCIÓN</div>
    <div class="num mono">${ESC.map((e, i) => `<span id="n${i + 1}">${i + 1} / ${ESC.length}</span>`).join("")}</div>
    <div id="barras">${barras}</div></div>

  <!-- ESCENA 1 · 0–16 s -->
  <section id="s1" class="clip scene" data-start="0" data-duration="16" data-track-index="1"><div class="inner" id="s1-in">
    <svg id="s1-ring" class="abs" viewBox="0 0 780 280"><ellipse id="s1-ringe" cx="390" cy="140" rx="380" ry="128" fill="none" stroke="#4fe0ff" stroke-width="4" stroke-dasharray="14 18" opacity=".55"/></svg>
    <div id="s1-earth" class="abs"><div id="s1-earthb" class="fill">${tierra("e1")}</div></div>
    <div id="s1-title" class="abs titulo">
      <div class="a blk w">Las matemáticas</div>
      <div class="b blk w">ayudando a proteger</div>
      <div class="a blk w">nuestro <span class="cyan">planeta</span></div>
    </div>
    <div id="s1-pill" class="pill amarilla">MISIÓN DART · NASA</div>
    <div id="s1-pillsub" class="abs mono">Double Asteroid Redirection Test</div>
    <svg id="s1-tray" class="abs" viewBox="0 0 ${W} ${H}"><path id="s1-path" d="M 470 985 Q 600 860 740 800" fill="none" stroke="#4fe0ff" stroke-width="6" stroke-linecap="round"/><circle id="s1-meta" cx="740" cy="800" r="12" fill="#4fe0ff"/></svg>
    <div id="s1-ast" class="abs">${asteroide("a1")}</div>
    <div id="s1-nave" class="abs" data-layout-allow-overflow>${nave("n1")}</div>
    <div id="s1-q" class="abs">
      <div class="tag w2">UN EXPERIMENTO REAL</div>
      <div class="q blk w2">¿Se puede cambiar el</div>
      <div class="q blk w2"><span class="cyan">rumbo</span> de un asteroide?</div>
    </div>
    <div id="s1-chip2" class="chip mono">→ impacto de una nave</div>
  </div></section>

  <!-- ESCENA 2 · 16–32 s -->
  <section id="s2" class="clip scene" data-start="16" data-duration="16" data-track-index="1"><div class="inner" id="s2-in">
    <svg id="s2-orb" class="abs" viewBox="0 0 ${W} ${H}"><ellipse id="s2-orbe" cx="540" cy="1080" rx="380" ry="150" fill="none" stroke="#4fe0ff" stroke-width="4" stroke-dasharray="14 18" opacity="0" transform="rotate(-10 540 1080)"/></svg>
    <div id="s2-didy" class="abs">${asteroide("d2", { color: "#8f82ad", sombra: "#6c5f8c", grande: true })}</div>
    <div id="s2-dimo" class="abs">${asteroide("a2")}</div>
    <div id="s2-flash" class="abs"></div>
    ${puntos("s2p", 18)}
    <div id="s2-nave" class="abs" data-layout-allow-overflow>${nave("n2")}</div>
    <div id="s2-boom" class="abs titulo">¡Impacto!</div>
    <div id="s2-cal" class="abs mono"><div class="top">SEP 2022</div><div class="dia">26</div></div>
    <div id="s2-calsub" class="abs">Día del impacto</div>
    <div id="s2-l1" class="pill borde">Didymos · 780 m</div>
    <div id="s2-l2" class="pill borde">Dimorphos · 160 m</div>
    <div id="s2-rep" class="abs"><svg viewBox="0 0 72 96"><path d="M6 4H48L68 24V92H6Z" fill="#f4f0ff"/><path d="M48 4V24H68" fill="#cbbff0"/><path d="M16 40H58M16 52H58M16 64H46M16 76H54" stroke="#7d6bc0" stroke-width="5" stroke-linecap="round"/></svg>
      <div class="t">Informe científico</div><div class="s mono">NASA · 2022</div></div>
    <div id="s2-per" class="abs"><div class="l mono">PERÍODO ORBITAL DE DIMORPHOS</div><div class="v mono" id="s2-cont">11 h 55 min</div></div>
    <div id="s2-menos" class="pill mono">−32 min</div>
    <div id="s2-ok" class="abs"><svg class="c" viewBox="0 0 150 150"><circle cx="75" cy="75" r="70" fill="#6ef0a8"/><path id="s2-tick" d="M42 78 L66 102 L110 52" stroke="#140b2b" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="t">¡La técnica <span class="cyan">funciona!</span></div></div>
    ${puntos("s2c", 16)}
  </div></section>

  <!-- ESCENA 3 · 32–41 s -->
  <section id="s3" class="clip scene" data-start="32" data-duration="9" data-track-index="1"><div class="inner" id="s3-in">
    <div id="s3-q" class="abs titulo"><div class="l blk w3">¿Cómo se estudia</div><div class="l blk w3">este fenómeno?</div></div>
    <svg id="s3-lupa" class="abs" viewBox="0 0 170 170"><circle cx="70" cy="70" r="50" fill="rgba(79,224,255,.15)" stroke="#4fe0ff" stroke-width="12"/><path d="M106 106L156 156" stroke="#4fe0ff" stroke-width="18" stroke-linecap="round"/></svg>
    <div id="s3-big" class="abs titulo">DERIVADAS</div>
    <div id="s3-ddt" class="chip mono">d/dt</div>
    <div id="s3-ddt2" class="abs">miden cómo cambia algo en el tiempo</div>
    <div id="s3-panel" class="abs"></div>
    <svg id="s3-svg" class="abs" viewBox="0 0 940 760">
      <path id="s3-ejes" d="M110 120 L110 640 L880 640" fill="none" stroke="#cbbff0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="880" y="690" text-anchor="end" font-family="Space Mono" font-size="28" fill="#cbbff0">tiempo t</text>
      <text x="130" y="250" font-family="Space Mono" font-size="28" fill="#cbbff0">posición s(t)</text>
      <path id="s3-curva" d="" fill="none" stroke="#4fe0ff" stroke-width="9" stroke-linecap="round"/>
      <line id="s3-tan" x1="0" y1="0" x2="0" y2="0" stroke="#ffd257" stroke-width="6" stroke-linecap="round" opacity="0"/>
      <circle id="s3-mark" cx="0" cy="0" r="14" fill="#ff5fa8" stroke="#fff" stroke-width="4" opacity="0"/>
    </svg>
    <div id="s3-read" class="abs mono"><div class="a">pendiente = v = ds/dt</div><div class="b" id="s3-val">0,00 km/s</div></div>
    <div id="s3-c1" class="chip">movimiento</div>
    <div id="s3-c2" class="chip">energía · <span class="mono">E = ½·m·v²</span></div>
  </div></section>

  <!-- ESCENA 4 · 41–51 s -->
  <section id="s4" class="clip scene" data-start="41" data-duration="10" data-track-index="1"><div class="inner" id="s4-in">
    <div id="s4-t" class="abs titulo"><div class="a blk w4">PROBABILIDAD</div><div class="b blk w4">y probabilidad condicional</div></div>
    <div id="s4-f" class="abs mono">P(A|B) = P(A∩B) / P(B)</div>
    <div id="s4-inc" class="pill borde">incertidumbre</div>
    <div id="s4-grid" class="abs">${grilla}</div>
    <div id="s4-esc" class="abs mono">100 escenarios posibles</div>
    <div id="s4-riesgo" class="abs"><div class="a">RIESGO DE IMPACTO</div><div class="b mono">4 / 100 = 4 %</div></div>
  </div></section>

  <!-- ESCENA 5 · 51–58 s -->
  <section id="s5" class="clip scene" data-start="51" data-duration="7" data-track-index="1"><div class="inner" id="s5-in">
    <div id="s5-pre" class="abs">Comenzaremos con</div>
    <div id="s5-card" class="abs">1 · DERIVADAS</div>
    <div id="s5-a" class="chip mono">v = 6,1449 km/s</div>
    <div id="s5-b" class="chip mono">m = 579,4 kg</div>
    <div id="s5-c" class="chip mono">26 / 09 / 2022</div>
    <div id="s5-caja" class="abs mono">d/dt</div>
    <svg id="s5-svg" class="abs" viewBox="0 0 ${W} ${H}">
      <path id="s5-flecha" d="M540 1265 L540 1345 M520 1325 L540 1350 L560 1325" fill="none" stroke="#cbbff0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="s5-ejes" d="M300 1390 L300 1640 L800 1640" fill="none" stroke="#cbbff0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="s5-curva" d="M300 1640 Q 560 1630 800 1400" fill="none" stroke="#4fe0ff" stroke-width="9" stroke-linecap="round"/>
    </svg>
    <div id="s5-fin" class="abs mono">datos reales → matemáticas → movimiento</div>
  </div></section>
</div>

<script>
const tl = gsap.timeline({ paused: true });
const T = { s1: 0, s2: 16, s3: 32, s4: 41, s5: 51 };
const DUR = ${DUR};

// ── fondo: estrellas que titilan y derivan, brillos que respiran ──
tl.fromTo("#estrellas", { y: 0 }, { y: -110, duration: DUR, ease: "none" }, 0);
[0, 1, 2].forEach((g, i) => {
  const ciclo = 2.2 + i * 0.7;
  tl.fromTo(".tw" + g, { opacity: 0.25 + 0.1 * i }, { opacity: 1, duration: ciclo / 2, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / (ciclo / 2)) - 1) }, 0.3 * i);
});
tl.fromTo("#brillo1", { scale: 0.9 }, { scale: 1.12, duration: 4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / 4) - 1) }, 0);
tl.fromTo("#brillo2", { scale: 1.1 }, { scale: 0.9, duration: 5, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(DUR / 5) - 1) }, 0);

// ── barra de progreso y número de tramo ──
const TR = [[0, 16], [16, 16], [32, 9], [41, 10], [51, 7]];
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
    const ti = t + i * 0.16;
    tl.fromTo(el, { opacity: 0, y: dy[i % dy.length] }, { opacity: 1, y: 0, duration: 0.3, ease: "power4.out" }, ti);
  });
}
function pop(sel, t, d = 0.6, extra = {}) { tl.fromTo(sel, { scale: 0, opacity: 0, ...extra.from }, { scale: 1, opacity: 1, duration: d, ease: "power3.out", ...extra.to }, t); }

// ═══ ESCENA 1 ═══
cascada("#s1-title .w", T.s1 + 0.25);
pop("#s1-earth", T.s1 + 0.6, 1.0, { from: { y: 120 }, to: { y: 0 } });
tl.fromTo("#s1-ring", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.0, ease: "power3.out" }, T.s1 + 1.0);
tl.fromTo("#s1-ringe", { strokeDashoffset: 0 }, { strokeDashoffset: -320, duration: 16, ease: "none" }, T.s1);
tl.fromTo("#s1-earthb", { y: -12 }, { y: 12, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 8 }, T.s1 + 1.6);
// 4.7 s: «misión DART»
tl.fromTo("#s1-title", { scale: 1, y: 0 }, { scale: 0.62, y: -40, duration: 0.7, ease: "power3.inOut" }, T.s1 + 4.6);
pop("#s1-pill", T.s1 + 4.9, 0.55);
tl.fromTo("#s1-pillsub", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, T.s1 + 5.3);
tl.fromTo("#s1-nave", { x: 1300, y: 120, rotation: -20, opacity: 1, filter: "blur(10px)" },
  { x: 610, y: 690, rotation: -12, filter: "blur(0px)", duration: 1.0, ease: "power3.out" }, T.s1 + 5.0);
tl.fromTo("#n1-fuego", { opacity: 0.2 }, { opacity: 0.8, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: 27 }, T.s1 + 5.0);
// 7.3 s: «un experimento real»: la Tierra baja, aparece el asteroide, se dibuja la trayectoria
tl.fromTo("#s1-earth", { x: 0, y: 0, scale: 1 }, { x: -310, y: 190, scale: 0.57, duration: 1.0, ease: "power3.inOut", immediateRender: false }, T.s1 + 7.2);
tl.fromTo("#s1-ring", { x: 0, y: 0, scale: 1 }, { x: -310, y: 190, scale: 0.57, duration: 1.0, ease: "power3.inOut", immediateRender: false }, T.s1 + 7.2);
tl.fromTo("#s1-nave", { x: 610, y: 690, rotation: -12 }, { x: 250, y: 930, rotation: -24, duration: 1.0, ease: "power3.inOut", immediateRender: false }, T.s1 + 7.3);
pop("#s1-ast", T.s1 + 8.0, 0.7, { from: { rotation: -20 }, to: { rotation: 0 } });
tl.fromTo("#s1-ast", { rotation: 0 }, { rotation: 8, duration: 2, ease: "sine.inOut", yoyo: true, repeat: 2, immediateRender: false }, T.s1 + 8.8);
const p1 = document.getElementById("s1-path"), L1 = p1.getTotalLength();
p1.style.strokeDasharray = L1; p1.style.strokeDashoffset = L1;
tl.fromTo(p1, { strokeDashoffset: L1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.out" }, T.s1 + 9.0);
tl.fromTo("#s1-meta", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, T.s1 + 10.0);
tl.fromTo("#s1-q .tag", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, T.s1 + 9.4);
document.querySelectorAll("#s1-q .q").forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4, ease: "power4.out" }, T.s1 + 9.8 + i * 0.22));
// 13.2 s: «mediante el impacto de una nave»: la nave avanza hacia el asteroide
tl.fromTo("#s1-chip2", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, T.s1 + 13.3);
tl.fromTo("#s1-nave", { x: 250, y: 930 }, { x: 420, y: 752, duration: 2.2, ease: "power2.in", immediateRender: false }, T.s1 + 13.4);
salida("#s1-in", T.s1 + 15.62);

// ═══ ESCENA 2 ═══
pop("#s2-cal", T.s2 + 0.2, 0.7, { from: { rotation: -8 }, to: { rotation: 0 } });
tl.fromTo("#s2-calsub", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, T.s2 + 0.7);
// 2.6 s: impacto contra Dimorphos
pop("#s2-dimo", T.s2 + 2.2, 0.6);
tl.fromTo("#s2-nave", { x: -420, y: 980, rotation: 0, opacity: 1, filter: "blur(8px)" }, { x: 120, y: 980, filter: "blur(2px)", duration: 1.5, ease: "power2.in" }, T.s2 + 2.5);
tl.to("#s2-nave", { opacity: 0, scale: 0.3, duration: 0.12, ease: "power2.in" }, T.s2 + 4.0);
tl.fromTo("#s2-flash", { scale: 0, opacity: 1 }, { scale: 2.6, opacity: 0, duration: 0.7, ease: "power2.out" }, T.s2 + 4.0);
tl.set("#a2-feliz", { opacity: 0 }, T.s2 + 4.02); tl.set("#a2-sorpresa", { opacity: 1 }, T.s2 + 4.02);
tl.fromTo("#s2-dimo", { x: 0 }, { x: 26, duration: 0.08, ease: "power1.out", yoyo: true, repeat: 3, immediateRender: false }, T.s2 + 4.0);
for (let i = 0; i < 18; i++) {                     // polvo: sale hacia atrás (hacia la nave), como la eyección real
  const a = Math.PI + (i / 17 - 0.5) * 2.0, r = 140 + (i * 53) % 170;
  const el = document.getElementById("s2p" + i);
  el.style.left = "392px"; el.style.top = "1042px"; el.style.background = i % 3 ? "#cbbff0" : "#ffd257";
  tl.fromTo(el, { x: 0, y: 0, opacity: 1, scale: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r + 40, opacity: 0, scale: 0.4, duration: 1.2, ease: "power2.out", immediateRender: false }, T.s2 + 4.0 + (i % 4) * 0.02);
}
tl.fromTo("#s2-boom", { opacity: 0, scale: 1.6, rotation: -8 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.25, ease: "power4.out" }, T.s2 + 4.05);
tl.to("#s2-boom", { opacity: 0, duration: 0.3 }, T.s2 + 5.4);
// 4.9 s: «un asteroide que orbita a Didymos»: se aleja la cámara
tl.to("#s2-cal", { x: -250, y: -40, scale: 0.5, duration: 0.8, ease: "power3.inOut" }, T.s2 + 4.9);
tl.to("#s2-calsub", { opacity: 0, duration: 0.3 }, T.s2 + 4.9);
pop("#s2-didy", T.s2 + 5.2, 0.8);
const ORB = { cx: 540, cy: 1080, rx: 380, ry: 150, rot: -10 * Math.PI / 180, th: Math.PI };
const orbe = document.getElementById("s2-orbe"), dimo = document.getElementById("s2-dimo"), didy = document.getElementById("s2-didy");
function pos(th, rx, ry) {
  const x = rx * Math.cos(th), y = ry * Math.sin(th);
  return [ORB.cx + x * Math.cos(ORB.rot) - y * Math.sin(ORB.rot), ORB.cy + x * Math.sin(ORB.rot) + y * Math.cos(ORB.rot)];
}
const [ox, oy] = pos(Math.PI, ORB.rx, ORB.ry);
tl.fromTo("#s2-dimo", { x: 0, y: 0, scale: 1 }, { x: ox - 540, y: oy - 1050, scale: 0.42, duration: 0.9, ease: "power3.inOut", immediateRender: false }, T.s2 + 4.95);
tl.fromTo(orbe, { opacity: 0 }, { opacity: 0.7, duration: 0.6, ease: "power2.out" }, T.s2 + 5.6);
tl.fromTo(orbe, { strokeDashoffset: 0 }, { strokeDashoffset: -400, duration: 10, ease: "none" }, T.s2 + 5.6);
const P = { th: Math.PI, rx: ORB.rx, ry: ORB.ry };
function coloca() {
  const [x, y] = pos(P.th, P.rx, P.ry);
  gsap.set(dimo, { x: x - 540, y: y - 1050 });
  orbe.setAttribute("rx", P.rx.toFixed(2)); orbe.setAttribute("ry", P.ry.toFixed(2));
  dimo.style.zIndex = Math.sin(P.th) < -0.15 ? 1 : 3; didy.style.zIndex = 2;
}
tl.fromTo(P, { th: Math.PI }, { th: Math.PI + Math.PI * 2 * 1.45, duration: 10.1, ease: "none", onUpdate: coloca, immediateRender: false }, T.s2 + 5.9);
tl.fromTo(P, { rx: ORB.rx, ry: ORB.ry }, { rx: 340, ry: 132, duration: 1.0, ease: "power2.inOut", onUpdate: coloca, immediateRender: false }, T.s2 + 11.6);
pop("#s2-l1", T.s2 + 6.3, 0.5);
pop("#s2-l2", T.s2 + 7.0, 0.5);
// 8.4 s: «según los informes científicos de la NASA»
tl.fromTo("#s2-rep", { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, T.s2 + 8.4);
// 10.7 s: «logró modificar su período orbital»: 11 h 55 min → 11 h 23 min
tl.fromTo("#s2-per", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T.s2 + 10.6);
const cont = document.getElementById("s2-cont"), M = { m: 55 }; let ultimo = 55;
tl.fromTo(M, { m: 55 }, { m: 23, duration: 1.7, ease: "power2.inOut", immediateRender: false, onUpdate() {
  const v = Math.round(M.m); if (v !== ultimo) { ultimo = v; cont.textContent = "11 h " + String(v).padStart(2, "0") + " min"; } } }, T.s2 + 11.2);
pop("#s2-menos", T.s2 + 12.9, 0.45);
// 13.5 s: «demostrando que esta técnica puede funcionar»
tl.to(["#s2-l1", "#s2-l2"], { opacity: 0, duration: 0.3 }, T.s2 + 13.3);
pop("#s2-ok", T.s2 + 13.6, 0.6);
const tick = document.getElementById("s2-tick"), LT = tick.getTotalLength();
tick.style.strokeDasharray = LT; tick.style.strokeDashoffset = LT;
tl.fromTo(tick, { strokeDashoffset: LT }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" }, T.s2 + 13.9);
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2, r = 180 + (i * 37) % 120;
  const el = document.getElementById("s2c" + i);
  el.style.left = "152px"; el.style.top = "652px"; el.style.background = ["#4fe0ff", "#ff5fa8", "#ffd257", "#6ef0a8"][i % 4];
  tl.fromTo(el, { x: 0, y: 0, opacity: 1, scale: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r + 60, opacity: 0, scale: 0.5, duration: 1.3, ease: "power2.out", immediateRender: false }, T.s2 + 13.9);
}
salida("#s2-in", T.s2 + 15.62);

// ═══ ESCENA 3 ═══
cascada("#s3-q .w3", T.s3 + 0.2, [70, 70]);
pop("#s3-lupa", T.s3 + 0.8, 0.6, { from: { rotation: -30 }, to: { rotation: 0 } });
tl.fromTo("#s3-lupa", { y: 0 }, { y: -12, duration: 1, ease: "sine.inOut", yoyo: true, repeat: 6, immediateRender: false }, T.s3 + 1.4);
tl.fromTo("#s3-big", { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.28, ease: "power4.out" }, T.s3 + 2.6);
pop("#s3-ddt", T.s3 + 3.1, 0.45);
tl.fromTo("#s3-ddt2", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, T.s3 + 3.4);
// 4.3 s: gráfica de posición; la tangente (derivada) recorre la curva
tl.fromTo(["#s3-panel", "#s3-svg"], { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, T.s3 + 4.2);
const ej = document.getElementById("s3-ejes"), LE = ej.getTotalLength();
ej.style.strokeDasharray = LE; ej.style.strokeDashoffset = LE;
tl.fromTo(ej, { strokeDashoffset: LE }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }, T.s3 + 4.35);
const X = (t) => 110 + 760 * t, Y = (t) => 640 - 470 * t * t;      // s(t) crece cada vez más rápido
let d = ""; for (let i = 0; i <= 60; i++) { const t = i / 60; d += (i ? " L " : "M ") + X(t).toFixed(1) + " " + Y(t).toFixed(1); }
const cu = document.getElementById("s3-curva"); cu.setAttribute("d", d);
const LC = cu.getTotalLength(); cu.style.strokeDasharray = LC; cu.style.strokeDashoffset = LC;
tl.fromTo(cu, { strokeDashoffset: LC }, { strokeDashoffset: 0, duration: 1.0, ease: "power2.inOut" }, T.s3 + 4.7);
const tan = document.getElementById("s3-tan"), mark = document.getElementById("s3-mark"), val = document.getElementById("s3-val");
const S = { p: 0.06 }; let ult = "";
function tangente() {
  const t = S.p, px = X(t), py = Y(t), dx = 760, dy = -940 * t, n = Math.hypot(dx, dy), L = 170;
  tan.setAttribute("x1", (px - dx / n * L).toFixed(1)); tan.setAttribute("y1", (py - dy / n * L).toFixed(1));
  tan.setAttribute("x2", (px + dx / n * L).toFixed(1)); tan.setAttribute("y2", (py + dy / n * L).toFixed(1));
  mark.setAttribute("cx", px.toFixed(1)); mark.setAttribute("cy", py.toFixed(1));
  const txt = (6.1449 * t).toFixed(2).replace(".", ",") + " km/s";
  if (txt !== ult) { ult = txt; val.textContent = txt; }
}
tangente();
tl.fromTo([tan, mark], { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.s3 + 5.6);
tl.fromTo("#s3-read", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, T.s3 + 5.6);
tl.fromTo(S, { p: 0.06 }, { p: 1, duration: 2.6, ease: "power1.inOut", onUpdate: tangente, immediateRender: false }, T.s3 + 5.8);
tl.fromTo("#s3-c1", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, T.s3 + 6.1);
tl.fromTo("#s3-c2", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, T.s3 + 7.0);
salida("#s3-in", T.s3 + 8.62);

// ═══ ESCENA 4 ═══
cascada("#s4-t .w4", T.s4 + 0.2, [90, 50]);
pop("#s4-f", T.s4 + 1.8, 0.55);
// 3.9 s: 100 escenarios posibles: incertidumbre
for (let i = 0; i < 100; i++) {
  const el = document.getElementById("g" + i), f = Math.floor(i / 10), c = i % 10;
  el.style.left = c * 56 + "px"; el.style.top = f * 56 + "px";
  tl.fromTo(el, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "power3.out" }, T.s4 + 3.9 + f * 0.045 + c * 0.012);
  tl.fromTo(el, { opacity: 1 }, { opacity: 0.45, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 2, immediateRender: false }, T.s4 + 4.7 + ((c + f) % 7) * 0.09);
}
tl.fromTo("#s4-inc", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, T.s4 + 4.3);
tl.fromTo("#s4-esc", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, T.s4 + 4.6);
// 7 s: riesgo de impacto: 4 de 100 escenarios
[12, 37, 58, 84].forEach((i, k) => {
  tl.fromTo("#g" + i, { backgroundColor: "#7d6bc0", scale: 1 }, { backgroundColor: "#ff5fa8", scale: 1.25, duration: 0.3, ease: "power3.out", immediateRender: false }, T.s4 + 7.0 + k * 0.12);
  tl.fromTo("#g" + i, { boxShadow: "0 0 0 0 rgba(255,95,168,0)" }, { boxShadow: "0 0 26px 8px rgba(255,95,168,.75)", duration: 0.4, immediateRender: false }, T.s4 + 7.0 + k * 0.12);
});
pop("#s4-riesgo", T.s4 + 7.6, 0.5);
salida("#s4-in", T.s4 + 9.62);

// ═══ ESCENA 5 ═══
tl.fromTo("#s5-pre", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, T.s5 + 0.1);
tl.fromTo("#s5-card", { opacity: 0, scale: 1.35 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power4.out" }, T.s5 + 0.45);
// 1.6 s: los datos reales de la misión entran en la derivada
tl.fromTo("#s5-a", { opacity: 0, x: -500 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, T.s5 + 1.6);
tl.fromTo("#s5-b", { opacity: 0, x: 500 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, T.s5 + 1.8);
tl.fromTo("#s5-c", { opacity: 0, y: 300 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, T.s5 + 2.0);
pop("#s5-caja", T.s5 + 2.7, 0.5);
[["#s5-a", 210, 450], ["#s5-b", -150, 330], ["#s5-c", 180, 210]].forEach(([s, dx, dy], i) =>
  tl.to(s, { x: dx, y: dy, scale: 0.3, opacity: 0, duration: 0.55, ease: "power3.in" }, T.s5 + 3.2 + i * 0.12));
tl.fromTo("#s5-caja", { scale: 1 }, { scale: 1.08, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, T.s5 + 3.8);
const draw = (id, t, dd) => { const p = document.getElementById(id), L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
  tl.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: dd, ease: "power2.out" }, t); };
draw("s5-flecha", T.s5 + 4.1, 0.4);
draw("s5-ejes", T.s5 + 4.4, 0.5);
draw("s5-curva", T.s5 + 4.8, 0.8);
tl.fromTo("#s5-fin", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, T.s5 + 5.3);
salida("#s5-in", T.s5 + 6.55);

window.__timelines["main"] = tl;
</script>
</body>
</html>
`;

// ── partir en raíz + una subcomposición por escena (cada escena en su archivo, con su propia línea de tiempo) ──
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const [cssPagina, resto] = css.split("/* clases */");
const partesCss = resto.split(/\/\* escena (\d) \*\//);           // [clases, "1", css1, "2", css2, …]
const cssClases = partesCss[0];
const js = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const [jsRaiz, jsResto] = js.split("// utilidades");
const partesJs = jsResto.split(/\/\/ ═══ ESCENA (\d) ═══/);          // [utilidades, "1", js1, …]
const jsUtil = partesJs[0];
let cuerpo = html.match(/<body>([\s\S]*?)<script>/)[1];
fs.mkdirSync(path.join(RAIZ, "compositions"), { recursive: true });
ESC.forEach((e, k) => {
  const n = k + 1;
  const sec = cuerpo.match(new RegExp(`<!-- ESCENA ${n}[^>]*-->\\s*<section id="s${n}"[^>]*>([\\s\\S]*?)</section>`));
  let jsEsc = partesJs[2 * n].replace(/window\.__timelines\["main"\] = tl;\s*$/, "");
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
<div id="root" data-composition-id="s${n}" data-width="${W}" data-height="${H}">
${sec[1].trim()}
</div>
<script>
(() => {
const tl = gsap.timeline({ paused: true });
const T = { s${n}: 0 };
${jsUtil}
${jsEsc.trim()}
window.__timelines["s${n}"] = tl;
})();
</script>
</template>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, "compositions", `s${n}.html`), sub);
  cuerpo = cuerpo.replace(sec[0], `<!-- ESCENA ${n} · ${e.t0}–${e.t0 + e.d} s -->
  <div id="s${n}" data-composition-id="s${n}" data-composition-src="compositions/s${n}.html" data-start="${e.t0}" data-duration="${e.d}" data-track-index="${k % 2 + 1}" data-width="${W}" data-height="${H}"></div>`);
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
