// Genera las composiciones HyperFrames de la promo de Manager App desde una sola fuente.
//   node tools/build.mjs   →  index.html (30 s vertical), corto-15s.html, cuadrado-30s.html
//                              + tools/events_<variante>.json (efectos y música para tools/audio.py)
//
// ── CAMBIA AQUÍ ────────────────────────────────────────────────────────────────
const WHATSAPP = "[WHATSAPP]"; // ej. "+57 300 123 4567"
const URL_SITIO = "managerapp-eight.vercel.app";
// ───────────────────────────────────────────────────────────────────────────────
// (También son variables de la composición: npx hyperframes render --variables '{"whatsapp":"+57 ..."}')

import fs from "node:fs";

const VO = JSON.parse(fs.readFileSync("tools/vo_durations.json", "utf8"));
const LINES = JSON.parse(fs.readFileSync("tools/vo_lines.json", "utf8"));

// Marca (DESIGN.md / globals.css de Managerapp)
const C = {
  primary: "#256abf", primaryHover: "#1c5cab", primarySoft: "#e8f1fc", bg: "#ffffff", surface: "#f9f9f7",
  text: "#0b0b0b", muted: "#5f5e5a", border: "#e4e3dd", borderStrong: "#8a8983",
  success: "#1a7f37", successSoft: "#eaf6ec", warning: "#9a6700", warningSoft: "#fff6db",
  error: "#b8312c", errorSoft: "#fdecea",
  dBg: "#0d0d0d", dSurface: "#1a1a19", dText: "#f5f5f4", dMuted: "#b4b3ab", dBorder: "#2c2c2a",
  dPrimary: "#3987e5", dSuccess: "#4ac26b", dPrimarySoft: "#12243d",
  paper: "#ebe7de", paperLine: "#cfd5dc", paperInk: "#3a3935", marker: "#ffe27a", postit: "#f7e08a",
};

const VARIANTS = {
  v30: {
    file: "index.html", W: 1080, H: 1920, dur: 30,
    scenes: [
      ["hook", 0, 2.9], ["chaos", 2.9, 9.0], ["turn", 9.0, 11.9], ["sell", 11.9, 15.3],
      ["stock", 15.3, 19.7], ["cash", 19.7, 22.3], ["control", 22.3, 25.8], ["cta", 25.8, 30],
    ],
    vo: [["s1a", 0.1], ["s1b", 1.5], ["s2a", 2.95], ["s2b", 6.35], ["s3", 9.2], ["s4", 12.05],
      ["s5", 15.4], ["s6", 19.8], ["s7", 22.4], ["s8a", 26.0], ["s8b", 28.25]],
  },
  v15: {
    file: "variantes/corto-15s/index.html", W: 1080, H: 1920, dur: 15,
    scenes: [["hook", 0, 2.9], ["sell", 2.9, 5.6], ["stock", 5.6, 8.1], ["cash", 8.1, 10.4], ["cta", 10.4, 15]],
    vo: [["s1a", 0.1], ["s1b", 1.5], ["k4", 3.0], ["k5", 5.7], ["k6", 8.2], ["s8a", 10.6], ["s8b", 12.85]],
  },
};
VARIANTS.sq30 = { ...VARIANTS.v30, file: "variantes/cuadrado-30s/index.html", H: 1080 };

const PAPER = new Set(["hook", "chaos"]);
const fmt = (n) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Tiempos estimados por palabra dentro de cada línea de voz (peso = letras + pausa de puntuación).
function wordTimes(text, t0, dur) {
  const words = text.split(/\s+/);
  const w = words.map((x) => x.replace(/[^\p{L}\p{N}$]/gu, "").length + 1.5 + (/[,:;]$/.test(x) ? 2.5 : 0));
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return words.map((word, i) => {
    const s = t0 + (acc / total) * dur; acc += w[i];
    return { word, s, e: t0 + (acc / total) * dur };
  });
}

function build(key) {
  const V = VARIANTS[key];
  const { W, H } = V;
  const square = H === W;
  // Zona de contenido segura: vertical → 220 arriba / 380 abajo / 90 lados; cuadrado → 90 por lado.
  const box = square
    ? { scale: 0.66, left: (W - 900 * 0.66) / 2, top: 70 }
    : { scale: 1, left: 90, top: 250 };
  const cap = square ? { top: 790, font: 46, width: 900 } : { top: 1300, font: 60, width: 900 };

  const sfx = []; // {t, type}
  const js = []; // líneas del timeline
  const T = (n) => +n.toFixed(3);
  // El primer tween de cada elemento aplica su estado inicial al construir; los siguientes no (encadenados).
  const seen = new Set();
  const tw = (sel, from, to, t) => {
    const first = !seen.has(sel); seen.add(sel);
    js.push(`tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify({ ...to, immediateRender: first })}, ${T(t)});`);
  };
  // Estado que depende solo del tiempo (seek-safe): contadores, textos y resaltado de palabras.
  const STATE = { count: [], text: [], hi: [] };
  const count = (sel, a, b, t, d) => STATE.count.push([sel, T(t), d, a, b]);
  const set = (sel, txt, t) => STATE.text.push([sel, T(t), txt]);
  const hi = (sel, t0, t1, color) => STATE.hi.push([sel, T(t0), T(t1), color]);

  const scenesHtml = [];
  const sceneIdx = (name) => V.scenes.findIndex((s) => s[0] === name);

  V.scenes.forEach(([name, t0, t1], i) => {
    const id = `sc-${name}`;
    const prev = V.scenes[i - 1];
    const next = V.scenes[i + 1];
    // Transición: push (whip) por defecto; flash blanco cuando pasamos de papel a marca.
    const enterFlash = !!prev && PAPER.has(prev[0]) && !PAPER.has(name);
    const PUSH = 0.28;
    const start = prev && !enterFlash ? t0 - PUSH : t0;
    const end = next ? t1 + 0.02 : t1;
    const body = SCENES[name]({ id, t0, t1, tw, set, count, hi, sfx, key, square });
    scenesHtml.push(
      `<section id="${id}" class="clip scene ${body.cls || ""}" data-start="${T(start)}" data-duration="${T(end - start)}" data-track-index="${1 + (i % 2)}" style="z-index:${10 + i}">
  <div class="inner" id="${id}-inner"><div class="bgfill"></div>${body.bg || ""}
    <div class="box" style="left:${box.left}px;top:${box.top}px;transform:scale(${box.scale})">${body.html}</div>
  </div>
</section>`
    );
    if (prev && !enterFlash) {
      tw(`#${id}-inner`, { x: W, skewX: -6 }, { x: 0, skewX: 0, duration: PUSH + 0.1, ease: "power3.out" }, start);
      sfx.push({ t: start - 0.05, type: "whoosh" });
    }
    if (enterFlash) {
      tw("#flash", { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "power1.in" }, t0 - 0.08);
      tw("#flash", { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "power2.out" }, t0);
      tw(`#${id}-inner`, { scale: 1.08 }, { scale: 1, duration: 0.6, ease: "power3.out" }, t0);
      sfx.push({ t: t0 - 0.35, type: "riser" }, { t: t0, type: "impact" });
    }
    if (next) {
      const nextFlash = PAPER.has(name) && !PAPER.has(next[0]);
      if (!nextFlash) tw(`#${id}-inner`, { x: 0, skewX: 0 }, { x: -W * 0.35, skewX: 4, duration: PUSH + 0.02, ease: "power3.in" }, t1 - PUSH);
    }
  });

  // Voz + subtítulos
  const audioHtml = [];
  const capHtml = [];
  const capEnds = [];
  const SRT = [];
  let g = 0;
  V.vo.forEach(([k, t]) => {
    const d = VO[k];
    audioHtml.push(`<audio id="vo-${k}" src="assets/audio/vo_${k}.wav" data-start="${t}" data-duration="${d}" data-track-index="20" data-volume="1"></audio>`);
    const words = wordTimes(LINES[k][0], t, d);
    SRT.push([t, t + d, LINES[k][0]]);
    if (k === "s1a" || k === "s1b") {
      // En el gancho el texto gigante ES el subtítulo: se resalta palabra por palabra.
      words.forEach((w, j) => hi(`#hook-${k}-w${j}`, w.s, w.e + 0.02, C.marker));
      return;
    }
    // Agrupa en bloques de ≤ 34 caracteres (máx. 2 líneas).
    const groups = [];
    let cur = [];
    for (const w of words) {
      const len = [...cur, w].map((x) => x.word).join(" ").length;
      if (cur.length && len > (square ? 30 : 26)) { groups.push(cur); cur = []; }
      cur.push(w);
    }
    if (cur.length) groups.push(cur);
    groups.forEach((grp, gi) => {
      const gs = grp[0].s - (gi === 0 ? 0.05 : 0);
      const nextStart = gi + 1 < groups.length ? groups[gi + 1][0].s : grp[grp.length - 1].e + 0.25;
      const ge = Math.min(nextStart, grp[grp.length - 1].e + 0.25);
      const gid = `cap${g++}`;
      // un subtítulo termina antes de que empiece el siguiente (nunca dos a la vez)
      if (capEnds.length) { const last = capEnds[capEnds.length - 1]; if (last.ge > gs - 0.02) last.ge = gs - 0.02; }
      capEnds.push({ gid, gs, ge });
      capHtml.push(
        `<div id="${gid}" class="clip cap" data-start="${T(gs)}" data-duration="@@${gid}@@" data-track-index="30"><div class="cap-in" id="${gid}-in">${grp
          .map((w, j) => `<span id="${gid}-w${j}" class="w">${esc(w.word)}</span>`)
          .join(" ")}</div></div>`
      );
      tw(`#${gid}-in`, { y: 14, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.16, ease: "power3.out" }, gs);
      grp.forEach((w, j) => hi(`#${gid}-w${j}`, w.s, j < grp.length - 1 ? grp[j + 1].s : ge + 1, C.primary));
    });
  });

  const ts = (x) => { const ms = Math.round(x * 1000); const p = (n, w = 2) => String(n).padStart(w, "0");
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  fs.mkdirSync("salida", { recursive: true });
  if (key !== "sq30") fs.writeFileSync(key === "v30" ? "salida/subtitulos.srt" : "salida/subtitulos-15s.srt",
    SRT.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b + 0.15)}\n${txt}\n`).join("\n"));
  fs.writeFileSync(`tools/events_${key}.json`, JSON.stringify({ dur: V.dur, sfx, scenes: V.scenes }, null, 1));

  const font = (w, f) => `@font-face{font-family:"Geist";src:url("assets/fonts/${f}.woff2") format("woff2");font-weight:${w};font-style:normal;}`;
  return `<!doctype html>
<html lang="es" data-resolution="${square ? "square" : "portrait"}" data-composition-variables='[
  {"id":"whatsapp","type":"string","label":"WhatsApp","default":"${WHATSAPP}"},
  {"id":"url","type":"string","label":"URL","default":"${URL_SITIO}"}
]'>
<!-- Generado por tools/build.mjs — edita allí (WhatsApp y URL al inicio de ese archivo) y vuelve a correr: node tools/build.mjs -->
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="assets/js/gsap.min.js"></script>
<style>
${font(400, "Geist-Regular")}${font(500, "Geist-Medium")}${font(600, "Geist-SemiBold")}${font(700, "Geist-Bold")}${font(900, "Geist-Black")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${C.paper}}
#root{position:relative;width:100%;height:100%;overflow:hidden;font-family:"Geist",sans-serif;color:${C.text};font-variant-numeric:tabular-nums;background:${C.paper}}
.scene{position:absolute;inset:0;overflow:hidden}
.inner{position:absolute;inset:0}
.bgfill{position:absolute;inset:0}
.paper .bgfill{background-color:${C.paper};background-image:repeating-linear-gradient(180deg,transparent 0 62px,${C.paperLine} 62px 64px)}
.paper .margin{position:absolute;top:0;bottom:0;left:64px;width:3px;background:#e2a5a0}
.brand .bgfill{background:${C.primary}}
.light .bgfill{background:${C.surface}}
.dark .bgfill{background:${C.dBg}}
.box{position:absolute;width:900px;height:1000px;transform-origin:0 0}
.abs{position:absolute}
.h1{font-weight:700;font-size:68px;line-height:1.08;letter-spacing:-0.02em}
.demo{position:absolute;z-index:50;right:0;bottom:-8px;font-size:24px;font-weight:500;color:${C.muted};padding:4px 10px;border-radius:9999px;background:rgba(255,255,255,0.75)}
.dark .demo{color:${C.dMuted};background:rgba(26,26,25,0.85)}
.brand .demo{color:#ffffff;background:rgba(0,0,0,0.18)}
.card{background:${C.bg};border:2px solid ${C.border};border-radius:8px}
.pill{display:inline-flex;align-items:center;gap:10px;border-radius:9999px;font-weight:600;padding:10px 22px;font-size:28px}
#flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:90;pointer-events:none}
.cap{position:absolute;left:${(W - cap.width) / 2}px;width:${cap.width}px;top:${cap.top}px;display:flex;justify-content:center;z-index:100}
.cap-in{max-width:${cap.width}px;text-align:center;background:rgba(11,11,11,0.86);color:#fff;font-weight:700;font-size:${cap.font}px;line-height:1.32;padding:14px 26px;border-radius:8px;border:2px solid rgba(255,255,255,0.18)}
.cap .w{border-radius:6px;padding:0 6px;margin:0 -6px}
/* teléfono */
.phone{position:absolute;background:#fff;border:14px solid #0b0b0b;border-radius:64px;overflow:hidden}
.notch{position:absolute;top:10px;left:50%;width:120px;height:30px;margin-left:-60px;background:#0b0b0b;border-radius:9999px}
.scr{position:absolute;inset:0;padding:64px 26px 0}
.row{display:flex;align-items:center;justify-content:space-between}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${V.dur}" data-width="${W}" data-height="${H}" data-fps="30">
${scenesHtml.join("\n")}
<div id="flash"></div>
${capHtml.join("\n").replace(/@@(cap\d+)@@/g, (_, id) => { const c = capEnds.find((x) => x.gid === id); return T(c.ge - c.gs); })}
${audioHtml.join("\n")}
<audio id="sfx" src="assets/audio/sfx_${key}.wav" data-start="0" data-duration="${V.dur}" data-track-index="21" data-volume="1"></audio>
<audio id="music" src="assets/audio/music_${key}.wav" data-start="0" data-duration="${V.dur}" data-track-index="22" data-volume="1"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
const vars = (window.__hyperframes && window.__hyperframes.getVariables) ? window.__hyperframes.getVariables() : {};
if (vars.whatsapp) document.querySelectorAll("[data-wa]").forEach((el) => (el.textContent = vars.whatsapp));
if (vars.url) document.querySelectorAll("[data-url]").forEach((el) => (el.textContent = vars.url));
const fmt = (n) => "$" + Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
const STATE = ${JSON.stringify(STATE)};
const $ = (s) => document.querySelector(s);
function applyState(t) {
  const cnt = {};
  for (const [sel, t0, d, a, b] of STATE.count) {
    if (!(sel in cnt)) cnt[sel] = a;
    if (t >= t0) { const p = Math.min(1, (t - t0) / d); cnt[sel] = a + (b - a) * (1 - Math.pow(1 - p, 2)); }
  }
  for (const sel in cnt) $(sel).textContent = fmt(cnt[sel]);
  const txt = {};
  for (const [sel, t0, v] of STATE.text) { if (!(sel in txt) || t >= t0) txt[sel] = v; }
  for (const sel in txt) $(sel).textContent = txt[sel];
  for (const [sel, t0, t1, color] of STATE.hi) $(sel).style.backgroundColor = t >= t0 && t < t1 ? color : "transparent";
}
${js.join("\n")}
tl.to({}, { duration: ${V.dur} }, 0);
tl.eventCallback("onUpdate", () => applyState(tl.time()));
applyState(0);
window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
}

// ── Escenas ───────────────────────────────────────────────────────────────────
// Cada escena devuelve { cls, bg, html } y agenda sus animaciones con tw/set/count (tiempo global).
const demo = (id) => `<div class="demo" id="${id}">Datos de ejemplo</div>`;
const check = (size, color, bg) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="flex:none"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const logo = (id, size, onBlue = true) => `<div id="${id}" style="display:flex;align-items:center;gap:${size * 0.28}px">
  <div style="width:${size}px;height:${size}px;border-radius:${size * 0.22}px;background:${onBlue ? "#fff" : C.primary};display:flex;align-items:center;justify-content:center;color:${onBlue ? C.primary : "#fff"};font-weight:900;font-size:${size * 0.62}px;letter-spacing:-0.04em">M</div>
  <div style="font-weight:700;font-size:${size * 0.66}px;letter-spacing:-0.03em;color:${onBlue ? "#fff" : C.text}">Manager App</div></div>`;

const SCENES = {
  hook({ id, t0, tw, sfx }) {
    const words = (k, text) =>
      text.split(" ").map((w, j) => `<span id="hook-${k}-w${j}" style="border-radius:10px;padding:0 10px;margin:0 -4px">${esc(w)}</span>`).join(" ");
    tw(`#${id}-q1`, { scale: 1.6, opacity: 0.85, rotation: -6 }, { scale: 1, opacity: 1, rotation: -3, duration: 0.42, ease: "back.out(1.6)" }, t0);
    tw(`#${id}-q1`, { y: 0, opacity: 1, scale: 1 }, { y: -40, opacity: 0.18, scale: 0.86, duration: 0.3, ease: "power3.in" }, t0 + 1.32);
    tw(`#${id}-q2`, { scale: 2.4, opacity: 0, rotation: 5 }, { scale: 1, opacity: 1, rotation: 2, duration: 0.42, ease: "back.out(1.6)" }, t0 + 1.42);
    tw(`#${id}-shake`, { x: 0 }, { x: 0, keyframes: { x: [0, -14, 12, -8, 6, 0] }, duration: 0.3, ease: "none" }, t0 + 1.5);
    sfx.push({ t: t0 + 0.04, type: "punch" }, { t: t0 + 1.44, type: "punch" });
    return {
      cls: "paper",
      bg: `<div class="margin"></div>`,
      html: `<div id="${id}-shake" class="abs" style="inset:0">
        <div id="${id}-q1" class="abs" style="left:0;right:0;top:40px;font-weight:900;font-size:132px;line-height:1.05;letter-spacing:-0.04em;color:${C.paperInk};text-align:center">${words("s1a", "¿Cuánto vendiste hoy?")}</div>
        <div id="${id}-q2" class="abs" style="left:0;right:0;top:500px;font-weight:900;font-size:132px;line-height:1.05;letter-spacing:-0.04em;color:${C.text};text-align:center">${words("s1b", "¿Y cuánto te deben?")}</div>
      </div>`,
    };
  },

  chaos({ id, t0, t1, tw, sfx }) {
    const a = t0, b = t0 + 1.75, c = t0 + 3.45;
    // Beat A: cuaderno de fiados con cuentas que no cuadran
    tw(`#${id}-nb`, { y: 900, rotation: 8 }, { y: 0, rotation: -4, duration: 0.5, ease: "power3.out" }, a + 0.05);
    tw(`#${id}-calc`, { x: 500, rotation: 30 }, { x: 0, rotation: 9, duration: 0.5, ease: "back.out(1.2)" }, a + 0.45);
    tw(`#${id}-strike`, { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: "power2.out" }, a + 0.95);
    tw(`#${id}-wrong`, { scale: 0, rotation: -20 }, { scale: 1, rotation: -8, duration: 0.3, ease: "back.out(2)" }, a + 1.15);
    tw(`#${id}-calcd`, { opacity: 1 }, { opacity: 0.25, duration: 0.08, repeat: 5, yoyo: true, ease: "none" }, a + 1.1);
    // Beat B: post-its
    tw(`#${id}-pa`, { scale: 2.2, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -5, duration: 0.36, ease: "back.out(1.4)" }, b);
    tw(`#${id}-pb`, { scale: 2.2, opacity: 0, rotation: 16 }, { scale: 1, opacity: 1, rotation: 7, duration: 0.36, ease: "back.out(1.4)" }, b + 0.6);
    tw(`#${id}-nbwrap`, { x: 0, rotation: 0, opacity: 1 }, { x: -1100, rotation: -25, opacity: 0, duration: 0.35, ease: "power3.in" }, b - 0.12);
    // Beat C: recibos volando + "Faltan $20.000 en la caja"
    [0, 1, 2, 3].forEach((k) => {
      const x0 = [-500, 1000, -500, 1000][k], y0 = [-200, 100, 700, 900][k];
      tw(`#${id}-r${k}`, { x: x0, y: y0, rotation: k * 40 - 60, opacity: 0 }, { x: 0, y: 0, opacity: 1, rotation: [-14, 11, -6, 18][k], duration: 0.55, ease: "power3.out" }, c + k * 0.12);
    });
    tw(`#${id}-falta`, { scale: 2.6, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: -4, duration: 0.4, ease: "back.out(1.5)" }, c + 0.7);
    tw(`#${id}-shake`, { x: 0, y: 0 }, { x: 0, y: 0, keyframes: { x: [0, -16, 14, -10, 8, -4, 0], y: [0, 8, -6, 4, -2, 0, 0] }, duration: 0.4, ease: "none" }, c + 0.78);
    tw(`#${id}-pwrap`, { x: 0, rotation: 0, opacity: 1 }, { x: 1100, rotation: 25, opacity: 0, duration: 0.35, ease: "power3.in" }, c - 0.12);
    sfx.push(
      { t: a + 0.05, type: "paper" }, { t: a + 0.45, type: "whoosh" }, { t: a + 0.95, type: "scribble" },
      { t: b, type: "slap" }, { t: b + 0.6, type: "slap" },
      { t: c, type: "paper" }, { t: c + 0.24, type: "paper" }, { t: c + 0.7, type: "punch" }
    );
    const receipt = (k, x, y) => `<div id="${id}-r${k}" class="abs" style="left:${x}px;top:${y}px;width:230px;height:300px;background:#fffdf7;border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.12);padding:22px">
      ${[0, 1, 2, 3, 4, 5].map((j) => `<div style="height:10px;margin:12px 0;background:#d9d4c7;border-radius:3px;width:${[90, 70, 80, 55, 85, 60][(j + k) % 6]}%"></div>`).join("")}</div>`;
    return {
      cls: "paper",
      bg: `<div class="margin"></div>`,
      html: `<div id="${id}-shake" class="abs" style="inset:0">
      <div id="${id}-nbwrap" class="abs" style="inset:0">
        <div id="${id}-nb" class="abs" style="left:30px;top:60px;width:640px;height:560px;background:#fffef9;border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,0.12);padding:40px 44px;color:${C.paperInk}">
          <div style="font-size:52px;font-weight:700;border-bottom:3px solid ${C.paperInk};padding-bottom:10px;margin-bottom:24px">Fiados</div>
          <div class="row" style="font-size:40px;font-weight:500;margin:18px 0"><span>Doña Rosa</span><span>$45.000</span></div>
          <div class="row" style="font-size:40px;font-weight:500;margin:18px 0"><span>Don Carlos</span><span>$38.500</span></div>
          <div class="row" style="font-size:40px;font-weight:500;margin:18px 0;position:relative"><span>Total</span><span>$93.500</span>
            <div id="${id}-strike" class="abs" style="left:-10px;right:-10px;top:24px;height:7px;background:${C.error};border-radius:4px;transform-origin:0 50%"></div></div>
          <div id="${id}-wrong" class="abs" style="right:40px;bottom:40px;font-size:64px;font-weight:900;color:${C.error}">¿$83.500?</div>
        </div>
        <div id="${id}-calc" class="abs" style="left:560px;top:420px;width:300px;height:420px;background:#3b3a36;border-radius:24px;padding:24px">
          <div id="${id}-calcd" style="height:96px;background:#c8d2b8;border-radius:8px;font-size:58px;font-weight:600;color:#2b2b28;text-align:right;padding:14px 18px">83.500</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px">${Array.from({ length: 12 }, () => `<div style="height:58px;background:#5a5953;border-radius:10px"></div>`).join("")}</div>
        </div>
      </div>
      <div id="${id}-pwrap" class="abs" style="inset:0">
        <div id="${id}-pa" class="abs" style="left:80px;top:620px;width:520px;height:330px;background:${C.postit};box-shadow:0 10px 24px rgba(0,0,0,0.15);padding:34px;font-size:50px;font-weight:700;line-height:1.15;color:${C.paperInk}">Medias blancas: ¿Quedan 2… o 0?</div>
        <div id="${id}-pb" class="abs" style="left:520px;top:120px;width:340px;height:260px;background:#f7c3d0;box-shadow:0 10px 24px rgba(0,0,0,0.15);padding:30px;font-size:44px;font-weight:700;line-height:1.15;color:${C.paperInk}">¿Pedir tenis talla 38?</div>
      </div>
      ${receipt(0, 40, 80)}${receipt(1, 620, 140)}${receipt(2, 90, 560)}${receipt(3, 600, 600)}
      <div id="${id}-falta" class="abs" style="left:20px;right:20px;top:330px;background:${C.error};color:#fff;font-weight:900;font-size:84px;line-height:1.05;letter-spacing:-0.02em;padding:34px 36px;border-radius:8px;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,0.25)">Faltan $20.000 en la caja</div>
      </div>
      ${demo(`${id}-demo`)}`,
    };
  },

  turn({ id, t0, tw, sfx }) {
    tw(`#${id}-logo`, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }, t0 + 0.15);
    tw(`#${id}-tag`, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, t0 + 0.75);
    tw(`#${id}-ph`, { y: 700 }, { y: 0, duration: 0.8, ease: "power3.out" }, t0 + 1.2);
    tw(`#${id}-ph`, { y: 0 }, { y: -20, duration: 0.9, ease: "sine.inOut" }, t0 + 2.0);
    sfx.push({ t: t0 + 0.2, type: "pop" }, { t: t0 + 1.2, type: "whoosh" });
    return {
      cls: "brand",
      html: `<div class="abs" style="left:0;right:0;top:120px;display:flex;justify-content:center">${logo(`${id}-logo`, 120)}</div>
      <div id="${id}-tag" class="abs" style="left:0;right:0;top:330px;text-align:center;color:#fff;font-weight:700;font-size:80px;line-height:1.08;letter-spacing:-0.03em">Tu negocio en tu celular</div>
      <div id="${id}-ph" class="abs" style="left:300px;top:540px;width:300px;height:440px;border:12px solid #fff;border-radius:48px;background:rgba(255,255,255,0.12)">
        <div style="position:absolute;top:14px;left:50%;width:100px;height:24px;margin-left:-50px;background:#fff;border-radius:9999px"></div>
        <div style="position:absolute;left:40px;right:40px;top:90px;height:70px;border:5px solid #fff;border-radius:8px"></div>
        <div style="position:absolute;left:40px;right:40px;top:190px;height:22px;background:rgba(255,255,255,0.5);border-radius:6px"></div>
        <div style="position:absolute;left:40px;right:120px;top:232px;height:22px;background:rgba(255,255,255,0.5);border-radius:6px"></div>
      </div>`,
    };
  },

  sell({ id, t0, t1, tw, set, count, sfx, key }) {
    const D = t1 - t0;
    const two = D > 3;
    const s1 = t0 + 0.4, s2 = t0 + 1.25, tap = t1 - 1.0, sold = tap + 0.22;
    const total = two ? 183900 : 159900;
    // etiqueta con código de barras + láser
    tw(`#${id}-tag`, { x: 420, rotation: 20 }, { x: 0, rotation: 6, duration: 0.35, ease: "power3.out" }, t0 + 0.02);
    tw(`#${id}-laser`, { y: 0, opacity: 1 }, { y: 120, opacity: 1, duration: 0.3, ease: "power1.inOut" }, s1 - 0.3);
    tw(`#${id}-tag`, { scale: 1, opacity: 1, x: 0, y: 0 }, { scale: 0.3, opacity: 0, x: -360, y: 180, duration: 0.3, ease: "power3.in" }, s1 + 0.05);
    tw(`#${id}-field`, { boxShadow: "0 0 0 0px rgba(26,127,55,0)" }, { boxShadow: "0 0 0 10px rgba(26,127,55,0.35)", duration: 0.12, yoyo: true, repeat: 1 }, s1);
    tw(`#${id}-r1`, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, s1 + 0.08);
    count(`#${id}-total`, 0, 159900, s1 + 0.08, 0.45);
    sfx.push({ t: s1, type: "beep" });
    if (two) {
      tw(`#${id}-r2`, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, s2);
      count(`#${id}-total`, 159900, total, s2, 0.35);
      tw(`#${id}-field`, { boxShadow: "0 0 0 0px rgba(26,127,55,0)" }, { boxShadow: "0 0 0 10px rgba(26,127,55,0.35)", duration: 0.12, yoyo: true, repeat: 1 }, s2);
      sfx.push({ t: s2, type: "beep" });
    }
    // headline palabra por palabra
    tw(`#${id}-h0`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }, s1);
    tw(`#${id}-h1`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }, tap);
    tw(`#${id}-h2`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }, sold);
    // tap en Cobrar
    tw(`#${id}-tap`, { scale: 0.2, opacity: 0 }, { scale: 0.2, opacity: 0, duration: 0.01 }, t0);
    tw(`#${id}-tap`, { scale: 0.2, opacity: 0.9 }, { scale: 2.2, opacity: 0, duration: 0.45, ease: "power2.out" }, tap);
    tw(`#${id}-btn`, { scale: 1 }, { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.inOut" }, tap);
    tw(`#${id}-pay`, { opacity: 1 }, { opacity: 0, duration: 0.15 }, sold);
    tw(`#${id}-sold`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" }, sold);
    tw(`#${id}-sold-ck`, { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, sold + 0.05);
    sfx.push({ t: tap, type: "tap" }, { t: sold, type: "kaching" });
    const cartRow = (rid, name, sub, price) => `<div id="${rid}" class="row" style="height:112px;border-bottom:2px solid ${C.border}">
      <div><div style="font-size:36px;font-weight:600">${name}</div><div style="font-size:28px;color:${C.muted};margin-top:4px">${sub}</div></div>
      <div style="font-size:36px;font-weight:600">${price}</div></div>`;
    return {
      cls: "light",
      html: `<div class="abs h1" style="left:0;right:0;top:0;text-align:center"><span id="${id}-h0" style="display:inline-block">Escanea.</span> <span id="${id}-h1" style="display:inline-block;color:${C.primary}">Cobra.</span> <span id="${id}-h2" style="display:inline-block;color:${C.success}">Listo.</span></div>
      <div class="phone" style="left:40px;top:120px;width:660px;height:870px"><div class="notch"></div>
        <div class="scr">
          <div class="row" style="margin-bottom:22px"><div style="font-size:42px;font-weight:600">Vender</div><div class="pill" style="background:${C.primarySoft};color:${C.primary};font-size:26px;padding:6px 18px">Centro</div></div>
          <div id="${id}-field" class="row" style="height:92px;border:3px solid ${C.primary};border-radius:8px;padding:0 22px;font-size:30px;color:${C.muted}"><span>Escanea o busca</span>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${C.primary}" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8"/></svg></div>
          <div style="margin-top:14px">${cartRow(`${id}-r1`, "Tenis blancos", "Talla 38", "$159.900")}${two ? cartRow(`${id}-r2`, "Medias tobilleras", "Blancas · x2", "$24.000") : ""}</div>
          <div class="row" style="gap:12px;margin-top:22px"><div style="flex:1;height:72px;border:3px solid ${C.primary};background:${C.primarySoft};color:${C.primary};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:29px;font-weight:600">Efectivo</div><div style="flex:1;height:72px;border:2px solid ${C.borderStrong};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:29px;font-weight:500">Transferencia</div></div>
        </div>
        <div id="${id}-pay" class="abs row" style="left:0;right:0;bottom:0;height:170px;border-top:2px solid ${C.border};background:#fff;padding:0 26px">
          <div><div style="font-size:28px;color:${C.muted}">Total</div><div id="${id}-total" style="font-size:68px;font-weight:600;letter-spacing:-0.02em">$0</div></div>
          <div id="${id}-btn" style="position:relative;width:230px;height:100px;background:${C.primary};color:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:600">Cobrar
            <div id="${id}-tap" class="abs" style="left:85px;top:20px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.85);opacity:0"></div></div>
        </div>
        <div id="${id}-sold" class="abs" style="left:0;right:0;bottom:0;height:170px;background:${C.successSoft};color:${C.success};display:flex;align-items:center;justify-content:center;gap:16px;font-size:42px;font-weight:600;opacity:0">
          <span id="${id}-sold-ck" style="display:inline-flex">${check(48, "#fff", C.success)}</span>Vendido ${fmt(total)}</div>
      </div>
      <div id="${id}-tag" class="abs" style="left:620px;top:150px;width:280px;height:200px;background:#fff;border:2px solid ${C.border};border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,0.14);padding:22px">
        <div style="display:flex;gap:4px;height:100px;align-items:stretch">${[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 2].map((w) => `<div style="width:${w * 3}px;background:#0b0b0b"></div>`).join("")}</div>
        <div style="font-size:22px;font-weight:500;margin-top:10px;letter-spacing:0.08em">7702 0045 1938</div>
        <div id="${id}-laser" class="abs" style="left:10px;right:10px;top:22px;height:4px;background:#e5322d;box-shadow:0 0 12px #e5322d;opacity:0"></div>
      </div>
      ${demo(`${id}-demo`)}`,
    };
  },

  stock({ id, t0, t1, tw, set, sfx }) {
    const D = t1 - t0;
    const amberT = t0 + Math.min(1.3, D * 0.35), redT = amberT + Math.min(1.0, D * 0.3);
    tw(`#${id}-h`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, t0 + 0.1);
    [0, 1, 2, 3].forEach((k) =>
      tw(`#${id}-row${k}`, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, t0 + 0.15 + k * 0.08)
    );
    // Medias: 3 → Quedan 2 (ámbar)
    set(`#${id}-n2`, "3 und.", t0);
    set(`#${id}-n2`, "Quedan 2", amberT);
    tw(`#${id}-p2`, { backgroundColor: "#efede7", color: C.text, scale: 1 }, { backgroundColor: C.warningSoft, color: C.warning, scale: 1.12, duration: 0.25, ease: "back.out(2)" }, amberT);
    tw(`#${id}-row2`, { backgroundColor: "rgba(255,246,219,0)" }, { backgroundColor: C.warningSoft, duration: 0.3 }, amberT);
    tw(`#${id}-i2`, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, amberT);
    // Gorra: 1 → Agotado (rojo)
    set(`#${id}-n3`, "1 und.", t0);
    set(`#${id}-n3`, "Agotado", redT);
    tw(`#${id}-p3`, { backgroundColor: "#efede7", color: C.text, scale: 1 }, { backgroundColor: C.errorSoft, color: C.error, scale: 1.12, duration: 0.25, ease: "back.out(2)" }, redT);
    tw(`#${id}-row3`, { backgroundColor: "rgba(253,236,234,0)" }, { backgroundColor: C.errorSoft, duration: 0.3 }, redT);
    tw(`#${id}-i3`, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, redT);
    sfx.push({ t: amberT, type: "pop" }, { t: redT, type: "pop" });
    const warnIcon = (iid, color) =>
      `<svg id="${iid}" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>`;
    const row = (k, name, sub, n) => `<div id="${id}-row${k}" class="row" style="height:150px;padding:0 30px;border-bottom:2px solid ${C.border}">
      <div><div style="font-size:38px;font-weight:600">${name}</div><div style="font-size:27px;color:${C.muted};margin-top:6px">${sub}</div></div>
      <div id="${id}-p${k}" class="pill" style="background:#efede7;color:${C.text};font-size:30px">${k >= 2 ? `<span id="${id}-i${k}" style="display:inline-flex">${warnIcon(`${id}-svg${k}`, k === 2 ? C.warning : C.error)}</span>` : ""}<span id="${id}-n${k}">${n}</span></div></div>`;
    return {
      cls: "light",
      html: `<div id="${id}-h" class="abs h1" style="left:0;right:0;top:0;text-align:center">Te avisa antes de que se acabe.</div>
      <div class="abs card" style="left:0;right:0;top:230px;overflow:hidden">
        <div class="row" style="height:96px;padding:0 30px;border-bottom:2px solid ${C.border};background:${C.surface}"><div style="font-size:32px;font-weight:600">Inventario</div><div style="font-size:26px;color:${C.muted}">Sucursal Centro</div></div>
        ${row(0, "Tenis blancos", "Talla 38", "12 und.")}${row(1, "Cuaderno argollado", "100 hojas", "8 und.")}${row(2, "Medias tobilleras", "Blancas", "3 und.")}${row(3, "Gorra negra", "Talla única", "1 und.")}
      </div>
      ${demo(`${id}-demo`)}`,
    };
  },

  cash({ id, t0, t1, tw, count, sfx }) {
    const D = t1 - t0;
    const closeT = t0 + D * 0.38, okT = t0 + D * 0.68;
    tw(`#${id}-h`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, okT);
    tw(`#${id}-open`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, t0 + 0.1);
    count(`#${id}-openv`, 0, 200000, t0 + 0.15, 0.5);
    tw(`#${id}-close`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, closeT);
    count(`#${id}-cnt`, 0, 845000, closeT + 0.1, 0.45);
    tw(`#${id}-diff`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.2)" }, okT);
    sfx.push({ t: t0 + 0.15, type: "tick" }, { t: closeT + 0.1, type: "tick" }, { t: okT, type: "pop" }, { t: okT + 0.02, type: "chime" });
    const line = (label, val, vid) => `<div class="row" style="height:84px;font-size:34px"><span style="color:${C.muted}">${label}</span><span ${vid ? `id="${vid}"` : ""} style="font-weight:600">${val}</span></div>`;
    return {
      cls: "light",
      html: `<div class="abs row" style="left:0;right:0;top:0;height:80px"><div style="font-size:40px;font-weight:600">Caja · Turno de hoy</div><div class="pill" style="background:${C.primarySoft};color:${C.primary};font-size:24px;padding:8px 18px">Centro</div></div>
      <div id="${id}-open" class="abs card" style="left:0;right:0;top:120px;padding:26px 34px">
        <div style="font-size:26px;font-weight:600;color:${C.primary};margin-bottom:6px">Apertura</div>
        <div class="row" style="height:90px"><span style="font-size:38px">Abrió con</span><span id="${id}-openv" style="font-size:52px;font-weight:600">$0</span></div></div>
      <div id="${id}-close" class="abs card" style="left:0;right:0;top:380px;padding:26px 34px">
        <div style="font-size:26px;font-weight:600;color:${C.primary};margin-bottom:6px">Cierre</div>
        ${line("Debía haber", "$845.000")}${line("Contaste", "$0", `${id}-cnt`)}</div>
      <div id="${id}-diff" class="abs" style="left:0;right:0;top:710px;display:flex;justify-content:center">
        <div class="pill" style="background:${C.successSoft};color:${C.success};font-size:50px;padding:20px 40px;gap:18px;border:3px solid ${C.success}">${check(60, "#fff", C.success)}Diferencia $0</div></div>
      <div id="${id}-h" class="abs h1" style="left:0;right:0;top:850px;text-align:center;font-size:64px">La caja cuadra.</div>
      ${demo(`${id}-demo`)}`,
    };
  },

  control({ id, t0, t1, tw, set, count, sfx }) {
    const D = t1 - t0;
    const swT = t0 + D * 0.62;
    ["a", "b", "c"].forEach((k, j) =>
      tw(`#${id}-h${k}`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, t0 + 0.1 + j * D * 0.27)
    );
    tw(`#${id}-debt`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, t0 + 0.15);
    count(`#${id}-debtv`, 0, 350000, t0 + 0.2, 0.55);
    tw(`#${id}-sales`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, t0 + 0.3);
    const A = [22, 35, 30, 48, 60, 54, 72, 88], B = [18, 26, 40, 34, 46, 58, 50, 64];
    A.forEach((h, k) => tw(`#${id}-bar${k}`, { scaleY: 0 }, { scaleY: h / 100, duration: 0.45, ease: "power3.out" }, t0 + 0.4 + k * 0.05));
    count(`#${id}-salesv`, 0, 1245000, t0 + 0.4, 0.8);
    // cambio de sucursal Centro → Norte
    tw(`#${id}-chipN`, { backgroundColor: C.dSurface, color: C.dText }, { backgroundColor: C.dPrimary, color: "#0b0b0b", duration: 0.2 }, swT);
    tw(`#${id}-chipC`, { backgroundColor: C.dPrimary, color: "#0b0b0b" }, { backgroundColor: C.dSurface, color: C.dText, duration: 0.2 }, swT);
    B.forEach((h, k) => tw(`#${id}-bar${k}`, { scaleY: A[k] / 100 }, { scaleY: h / 100, duration: 0.4, ease: "power3.out" }, swT + k * 0.03));
    count(`#${id}-salesv`, 1245000, 980000, swT, 0.45);
    set(`#${id}-suc`, "Ventas de hoy · Centro", t0);
    set(`#${id}-suc`, "Ventas de hoy · Norte", swT);
    sfx.push({ t: t0 + 0.2, type: "tick" }, { t: swT, type: "tap" });
    return {
      cls: "dark",
      html: `<div class="abs h1" style="left:0;right:0;top:0;text-align:center;color:${C.dText};font-size:60px"><span id="${id}-ha" style="display:inline-block">Quién te debe.</span> <span id="${id}-hb" style="display:inline-block">Cuánto ganas.</span> <span id="${id}-hc" style="display:inline-block;color:${C.dPrimary}">En cada sucursal.</span></div>
      <div class="abs" style="left:0;right:0;top:170px;display:flex;gap:16px;justify-content:center">
        <div id="${id}-chipC" class="pill" style="background:${C.dPrimary};color:#0b0b0b;border:2px solid ${C.dPrimary}">Centro</div>
        <div id="${id}-chipN" class="pill" style="background:${C.dSurface};color:${C.dText};border:2px solid ${C.dPrimary}">Norte</div></div>
      <div id="${id}-debt" class="abs" style="left:0;right:0;top:270px;background:${C.dSurface};border:2px solid ${C.dBorder};border-radius:8px;padding:28px 34px;color:${C.dText}">
        <div style="font-size:30px;color:${C.dMuted}">Te deben (fiado)</div>
        <div class="row" style="margin-top:8px"><span id="${id}-debtv" style="font-size:66px;font-weight:600;letter-spacing:-0.02em">$0</span><span class="pill" style="background:${C.dPrimarySoft};color:#86b6ef;font-size:28px">4 clientes</span></div></div>
      <div id="${id}-sales" class="abs" style="left:0;right:0;top:520px;height:440px;background:${C.dSurface};border:2px solid ${C.dBorder};border-radius:8px;padding:28px 34px;color:${C.dText}">
        <div id="${id}-suc" style="font-size:30px;color:${C.dMuted}">Ventas de hoy · Centro</div>
        <div id="${id}-salesv" style="font-size:62px;font-weight:600;letter-spacing:-0.02em;margin-top:6px">$0</div>
        <div class="abs" style="left:34px;right:34px;bottom:28px;height:200px;display:flex;gap:18px;align-items:flex-end;border-bottom:2px solid ${C.dBorder}">
          ${Array.from({ length: 8 }, (_, k) => `<div id="${id}-bar${k}" style="flex:1;height:200px;background:${C.dPrimary};border-radius:6px 6px 0 0;transform-origin:50% 100%"></div>`).join("")}</div></div>
      ${demo(`${id}-demo`)}`,
    };
  },

  cta({ id, t0, t1, tw, sfx }) {
    tw(`#${id}-logo`, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.7)" }, t0 + 0.05);
    tw(`#${id}-tag`, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, t0 + 0.5);
    tw(`#${id}-btn`, { y: 60, opacity: 0, scale: 1 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, t0 + 1.2);
    tw(`#${id}-btn`, { scale: 1 }, { scale: 1.05, duration: 0.45, yoyo: true, repeat: Math.max(1, Math.floor((t1 - t0 - 2.0) / 0.45)), ease: "sine.inOut" }, t0 + 1.75);
    tw(`#${id}-contact`, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, t0 + 1.6);
    sfx.push({ t: t0 + 0.08, type: "pop" }, { t: t0 + 1.2, type: "whoosh" }, { t: t0 + 1.3, type: "chime" });
    return {
      cls: "brand",
      html: `<div class="abs" style="left:0;right:0;top:110px;display:flex;justify-content:center">${logo(`${id}-logo`, 130)}</div>
      <div id="${id}-tag" class="abs" style="left:0;right:0;top:320px;text-align:center;color:#fff;font-weight:700;font-size:78px;line-height:1.08;letter-spacing:-0.03em">Tu negocio, en control</div>
      <div class="abs" style="left:0;right:0;top:560px;display:flex;justify-content:center">
        <div id="${id}-btn" style="height:130px;padding:0 64px;background:#fff;color:${C.primary};border-radius:8px;display:flex;align-items:center;font-size:66px;font-weight:700;letter-spacing:-0.02em;box-shadow:0 14px 40px rgba(0,0,0,0.22)">Pide tu demo</div></div>
      <div id="${id}-contact" class="abs" style="left:0;right:0;top:760px;text-align:center;color:#fff">
        <div style="font-size:44px;font-weight:600">WhatsApp <span data-wa>${esc(WHATSAPP)}</span></div>
        <div data-url style="font-size:38px;font-weight:500;margin-top:16px;opacity:0.95">${esc(URL_SITIO)}</div></div>`,
    };
  },
};

for (const key of Object.keys(VARIANTS)) {
  const f = VARIANTS[key].file;
  if (f.includes("/")) {
    const dir = f.slice(0, f.lastIndexOf("/"));
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(`${dir}/assets`)) fs.symlinkSync("../../assets", `${dir}/assets`);
  }
  fs.writeFileSync(f, build(key));
  console.log("ok", VARIANTS[key].file);
}
