// Motor de la guía animada (16:9, 1920×1080). Un capítulo = una composición HyperFrames.
//   node tools/build.mjs <NN>   →  cap/<NN>/index.html  (+ tools/events_<NN>.json para la música/efectos)
// Entrada: cap/<NN>/spec.json (bloques con narración + visual) y tools/vo_<NN>.json (duración de cada bloque).
// Determinista: posiciones «aleatorias» con semilla fija; textos que cambian se calculan solo desde el tiempo.

import fs from "node:fs";

const W = 1920, H = 1080;
const C = {
  bg: "#0b0d12", panel: "#141821", panel2: "#1b2130", line: "#273042", text: "#f2f4f8", muted: "#a3acbb",
  cyan: "#4cc9f0", violet: "#a78bfa", amber: "#fbbf24", coral: "#fb7185", green: "#34d399",
};
const ACC = [C.cyan, C.violet, C.amber, C.coral, C.green];
const PHOTO = { F1: "assets/img/1.jpg", F2: "assets/img/2_sin_marca.jpg", F3: "assets/img/3.jpg", F4: "assets/img/4.jpg", F5: "assets/img/5.jpg" };
const CLIP = {
  dart_original: { src: "assets/clips/dart_original.mp4", len: 64, ar: "16:9", from: 7 },
  dart_narrado: { src: "assets/clips/dart_narrado.mp4", len: 112.4, ar: "16:9", from: 12 },
  manager_30s: { src: "assets/clips/manager_30s.mp4", len: 30, ar: "9:16", from: 0 },
  manager_cuadrado: { src: "assets/clips/manager_cuadrado.mp4", len: 30, ar: "1:1", from: 0 },
  trendy_anuncio: { src: "assets/clips/trendy_anuncio.mp4", len: 28, ar: "9:16", from: 0 },
  trendy_historia: { src: "assets/clips/trendy_historia.mp4", len: 36, ar: "9:16", from: 0 },
};
const EDIT = {
  vertical: { src: "assets/clips/ba_vertical.mp4", ar: "9:16", len: 12, name: "Reencuadre a vertical" },
  rapido: { src: "assets/clips/ba_rapido.mp4", ar: "16:9", len: 12, name: "Velocidad ×2" },
  bn: { src: "assets/clips/ba_bn.mp4", ar: "16:9", len: 12, name: "Blanco y negro" },
  recorte: { src: "assets/clips/ba_recorte.mp4", ar: "16:9", len: 4, name: "Recorte de 4 s" },
  subtitulos: { src: "assets/clips/ba_subtitulos.mp4", ar: "16:9", len: 12, name: "Subtítulos quemados" },
  calido: { src: "assets/clips/ba_calido.mp4", ar: "16:9", len: 12, name: "Color cálido" },
};

// ── íconos (trazo 2, viewBox 24) ──
const ICON = {
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  wand: '<path d="m15 4 5 5L8 21l-5-5zM14 3v2M19 8h2M5 3l1 2M3 6l2 1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a3 3 0 0 1 0-6h2"/>',
  box: '<path d="m21 8-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
};
const icon = (name, size, color) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${ICON[name] || ICON.star}</svg>`;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const T = (n) => +(+n).toFixed(3);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ── tiempos por palabra (peso = letras + pausa de puntuación) ──
function wordTimes(text, t0, dur) {
  const words = text.split(/\s+/).filter(Boolean);
  const w = words.map((x) => x.replace(/[^\p{L}\p{N}]/gu, "").length + 2 + (/[,;:]$/.test(x) ? 3 : /[.!?…]$/.test(x) ? 5 : 0));
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return words.map((word, i) => { const s = t0 + (acc / total) * dur; acc += w[i]; return { word, s }; });
}

export function build(nn) {
  const spec = JSON.parse(fs.readFileSync(`cap/${nn}/spec.json`, "utf8"));
  const VO = JSON.parse(fs.readFileSync(`tools/vo_${nn}.json`, "utf8"));
  seed = 7 + spec.chapter * 101;
  const js = [], sfx = [], sections = [], media = [];
  const STATE = { count: [], type: [], text: [] };
  const seen = new Set();
  const tw = (sel, from, to, t) => {
    const first = !seen.has(sel); seen.add(sel);
    js.push(`tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify({ ...to, immediateRender: first })}, ${T(t)});`);
  };
  const ctx = { tw, sfx, media, STATE };

  // línea de tiempo de los bloques
  const XF = 0.4;
  let cursor = 0;
  const beats = spec.beats.map((b, i) => {
    const lead = i === 0 ? 0.9 : 0.35;
    const vo = VO[i];
    const voStart = cursor + lead;
    const isLast = i === spec.beats.length - 1;
    const end = voStart + vo + (isLast ? 1.6 : 0.55);
    const o = { ...b, i, start: cursor, end, voStart, vo };
    cursor = end;
    return o;
  });
  const DUR = T(cursor);

  beats.forEach((b) => {
    const id = `b${b.i}`;
    const start = b.i === 0 ? 0 : b.start - XF;
    const end = b.i === beats.length - 1 ? b.end : b.end + 0.02;
    const r = (RENDER[b.visual.type] || RENDER.statement)(id, b.visual.params || {}, { ...b, s: start, e: end, d: end - start }, ctx, spec);
    sections.push(`<section id="${id}" class="clip beat" data-start="${T(start)}" data-duration="${T(end - start)}" data-track-index="${1 + (b.i % 2)}" style="z-index:${10 + b.i}"><div class="stage" id="${id}-st">${r}</div></section>`);
    if (b.i > 0) {
      tw(`#${id}-st`, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: XF + 0.15, ease: "power3.out" }, start);
      sfx.push({ t: start, type: b.visual.type === "title" ? "chime" : "swish" });
    } else sfx.push({ t: 0.2, type: "chime" });
  });

  // subtítulos: grupos de ≤ 78 caracteres, corte preferente en puntuación; palabra actual resaltada
  const groups = [];
  beats.forEach((b) => {
    const ws = wordTimes(b.narration, b.voStart, b.vo);
    let cur = [];
    ws.forEach((w, k) => {
      cur.push(w);
      const len = cur.map((x) => x.word).join(" ").length;
      const punct = /[.!?…:;]$/.test(w.word) || (/,$/.test(w.word) && len > 45);
      if (k === ws.length - 1 || (punct && len > 22) || len > 70) { groups.push({ words: cur, end: k === ws.length - 1 ? b.voStart + b.vo + 0.3 : null }); cur = []; }
    });
  });
  groups.forEach((g, k) => { g.s = g.words[0].s - 0.05; g.e = g.end ?? groups[k + 1]?.words[0].s - 0.05 ?? DUR; if (groups[k + 1] && g.e > groups[k + 1].words[0].s - 0.05) g.e = groups[k + 1].words[0].s - 0.05; });
  const CAPS = groups.map((g) => [T(g.s), T(g.e), g.words.map((w) => [T(w.s), w.word])]);

  const audio = beats.map((b) => `<audio id="vo${b.i}" src="assets/audio/vo/${nn}_${String(b.i).padStart(2, "0")}.wav" data-start="${T(b.voStart)}" data-duration="${T(b.vo)}" data-track-index="20" data-volume="1"></audio>`).join("\n");
  fs.writeFileSync(`tools/events_${nn}.json`, JSON.stringify({ dur: DUR, sfx, chapter: spec.chapter }, null, 1));
  fs.writeFileSync(`tools/srt_${nn}.json`, JSON.stringify(beats.map((b) => [T(b.voStart), T(b.voStart + b.vo + 0.2), b.narration])));

  const font = (w, f) => `@font-face{font-family:"Geist";src:url("assets/fonts/${f}.woff2") format("woff2");font-weight:${w};font-style:normal;}`;
  return `<!doctype html>
<!-- Generado por tools/build.mjs (capítulo ${nn}). Edita cap/${nn}/spec.json o el motor y corre: node tools/build.mjs ${nn} -->
<html lang="es" data-resolution="landscape">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="assets/js/gsap.min.js"></script>
<style>
${font(400, "Geist-Regular")}${font(500, "Geist-Medium")}${font(600, "Geist-SemiBold")}${font(700, "Geist-Bold")}${font(900, "Geist-Black")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${C.bg}}
#root{position:relative;width:100%;height:100%;overflow:hidden;font-family:"Geist",sans-serif;color:${C.text};background:${C.bg}}
#bgfx{position:absolute;inset:0;background:radial-gradient(1200px 700px at 15% 0%,rgba(76,201,240,0.10),transparent 60%),radial-gradient(1000px 700px at 100% 100%,rgba(167,139,250,0.12),transparent 60%);}
#grid{position:absolute;inset:0;opacity:0.35;background-image:linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px);background-size:60px 60px}
.beat{position:absolute;inset:0}
.stage{position:absolute;left:120px;right:120px;top:110px;height:760px}
.abs{position:absolute}
.h1{font-weight:900;letter-spacing:-0.035em;line-height:1.02}
.h2{font-weight:800;font-weight:900;font-size:58px;letter-spacing:-0.03em;line-height:1.05}
.muted{color:${C.muted}}
.panel{background:${C.panel};border:2px solid ${C.line};border-radius:18px}
.mono{font-family:monospace}
#hdr{position:absolute;left:80px;top:42px;display:flex;align-items:center;gap:16px;font-weight:600;font-size:26px;color:${C.muted};z-index:200}
#hdr b{color:${C.text};font-weight:700}
#cap{position:absolute;left:210px;right:210px;top:900px;height:130px;display:flex;align-items:center;justify-content:center;z-index:300}
#capin{text-align:center;font-weight:600;font-size:42px;line-height:1.28;color:#fff;background:rgba(8,10,14,0.78);border:2px solid rgba(255,255,255,0.08);padding:12px 30px;border-radius:14px;max-width:1500px}
#capin:empty{display:none}
#capin .w{border-radius:6px;padding:0 4px;margin:0 -4px}
#capin .on{color:#0b0d12;background:${C.amber}}
#prog{position:absolute;left:0;bottom:0;height:6px;background:linear-gradient(90deg,${C.cyan},${C.violet});z-index:300;transform-origin:0 50%}
video{position:absolute;object-fit:cover;background:#000}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}" data-fps="30">
<div id="bgfx"></div><div id="grid"></div>
<div id="hdr"><b>${spec.chapter === 0 ? "Guía" : `Capítulo ${spec.chapter}`}</b><span>·</span><span>${esc(spec.title)}</span></div>
${sections.join("\n")}
${media.join("\n")}
<div id="cap"><div id="capin"></div></div>
<div id="prog"></div>
${audio}
<audio id="sfx" src="assets/audio/sfx_${nn}.wav" data-start="0" data-duration="${DUR}" data-track-index="21" data-volume="1"></audio>
<audio id="music" src="assets/audio/music_${nn}.wav" data-start="0" data-duration="${DUR}" data-track-index="22" data-volume="1"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
const CAPS = ${JSON.stringify(CAPS)};
const STATE = ${JSON.stringify(STATE)};
const capin = document.getElementById("capin");
const $ = (s) => document.querySelector(s);
const fmt = (n, p, s) => (p || "") + Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".") + (s || "");
let lastG = -1;
function apply(t) {
  // subtítulo con palabra resaltada
  let gi = -1;
  for (let k = 0; k < CAPS.length; k++) if (t >= CAPS[k][0] && t < CAPS[k][1]) { gi = k; break; }
  if (gi !== lastG) { capin.innerHTML = gi < 0 ? "" : CAPS[gi][2].map((w) => '<span class="w">' + w[1].replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>").join(" "); lastG = gi; }
  if (gi >= 0) { const ws = CAPS[gi][2]; const spans = capin.children; let on = -1; for (let k = 0; k < ws.length; k++) if (t >= ws[k][0]) on = k; for (let k = 0; k < spans.length; k++) spans[k].className = k === on ? "w on" : "w"; }
  // contadores, texto tecleado y textos que cambian
  for (const [sel, t0, d, a, b, p, s] of STATE.count) { const el = $(sel); if (!el) continue; const q = Math.max(0, Math.min(1, (t - t0) / d)); el.textContent = fmt(a + (b - a) * (1 - Math.pow(1 - q, 3)), p, s); }
  for (const [sel, t0, d, full] of STATE.type) { const el = $(sel); if (!el) continue; const q = Math.max(0, Math.min(1, (t - t0) / d)); el.textContent = full.slice(0, Math.round(full.length * q)); }
  const txt = {};
  for (const [sel, t0, v] of STATE.text) if (!(sel in txt) || t >= t0) txt[sel] = v;
  for (const sel in txt) { const el = $(sel); if (el) el.textContent = txt[sel]; }
}
${js.join("\n")}
tl.fromTo("#prog", { scaleX: 0 }, { scaleX: 1, duration: ${DUR}, ease: "none" }, 0);
tl.to({}, { duration: ${DUR} }, 0);
tl.eventCallback("onUpdate", () => apply(tl.time()));
apply(0);
window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
}

// ── utilidades de escena ──
const reveal = (n, b, k, spanFrom = 0.35, tail = 1.2) => {
  // reparte n apariciones a lo largo de la narración del bloque
  const a = b.voStart + spanFrom, z = Math.max(a + 0.5, b.voStart + b.vo - tail);
  return n <= 1 ? a : a + ((z - a) * k) / (n - 1);
};
const head = (id, text, tw, t) => {
  tw(`#${id}-hd`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, t);
  return `<div id="${id}-hd" class="abs h2" style="left:0;right:0;top:0">${esc(text)}</div>`;
};
// medios a nivel raíz (un <video> no puede ir dentro de un elemento con data-start)
let vidN = 0;
function video(ctx, src, x, y, w, h, b, opts = {}) {
  const vid = `v${vidN++}`;
  const st = b.s + 0.25, du = Math.max(0.5, Math.min(b.e - st, (opts.len ?? 999) - (opts.from ?? 0)));
  ctx.media.push(`<video id="${vid}" src="${src}" muted playsinline data-start="${T(st)}" data-duration="${T(du)}" data-media-start="${opts.from ?? 0}" data-track-index="${5 + (vidN % 3)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${opts.radius ?? 16}px;z-index:${opts.z ?? 150};${opts.style || ""}"></video>`);
  ctx.tw(`#${vid}`, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, st);
  if (b.e - st > du + 0.05) ctx.tw(`#${vid}`, { opacity: 1 }, { opacity: 1, duration: 0.01 }, st + du - 0.02);
  return vid;
}
const SX = 120, SY = 110; // origen de la escena en coordenadas de pantalla

// ── renderizadores de visuales ──
const RENDER = {
  title(id, p, b, { tw }, spec) {
    tw(`#${id}-k`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, b.s + 0.1);
    tw(`#${id}-t`, { yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: "power4.out" }, b.s + 0.25);
    tw(`#${id}-s`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, b.s + 0.7);
    tw(`#${id}-bar`, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut" }, b.s + 0.4);
    tw(`#${id}-num`, { opacity: 0, scale: 0.8 }, { opacity: 0.07, scale: 1, duration: 1.2, ease: "power2.out" }, b.s);
    return `<div id="${id}-num" class="abs h1" style="right:-20px;top:-60px;font-size:640px;color:#fff">${spec.chapter === 0 ? "▶" : spec.chapter}</div>
      <div class="abs" style="left:40px;top:210px;right:300px">
        <div id="${id}-k" style="font-weight:700;font-size:34px;color:${C.cyan};letter-spacing:0.12em;text-transform:uppercase">${esc(p.kicker)}</div>
        <div style="overflow:hidden;margin-top:18px;padding-bottom:10px"><div id="${id}-t" class="h1" style="font-size:118px">${esc(p.title)}</div></div>
        <div id="${id}-bar" style="width:280px;height:8px;border-radius:4px;margin:26px 0;background:linear-gradient(90deg,${C.cyan},${C.violet});transform-origin:0 50%"></div>
        <div id="${id}-s" class="muted" style="font-size:40px;font-weight:500;line-height:1.3;max-width:1300px">${esc(p.subtitle)}</div></div>`;
  },

  statement(id, p, b, { tw }) {
    const words = String(p.text || b.narration).split(/\s+/);
    const acc = String(p.accent || "").toLowerCase().split(/\s+/).filter(Boolean);
    words.forEach((_, k) => tw(`#${id}-w${k}`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, b.voStart + 0.1 + k * 0.07));
    const size = words.join(" ").length > 60 ? 76 : 96;
    return `<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center;text-align:center"><div class="h1" style="font-size:${size}px;max-width:1500px">${words
      .map((w, k) => `<span id="${id}-w${k}" style="display:inline-block;margin:0 0.13em;color:${acc.some((a) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").startsWith(a.replace(/[^\p{L}\p{N}]/gu, ""))) ? C.amber : C.text}">${esc(w)}</span>`).join("")}</div></div>`;
  },

  bullets(id, p, b, { tw }) {
    const items = (p.items || []).slice(0, 5);
    items.forEach((_, k) => tw(`#${id}-i${k}`, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, reveal(items.length, b, k)));
    return `${head(id, p.heading, tw, b.s + 0.2)}<div class="abs" style="left:0;right:0;top:140px">${items
      .map((it, k) => `<div id="${id}-i${k}" style="display:flex;align-items:center;gap:28px;margin-bottom:26px"><div style="width:64px;height:64px;border-radius:16px;background:${ACC[k % 5]}22;border:2px solid ${ACC[k % 5]};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:30px;color:${ACC[k % 5]}">${k + 1}</div><div style="font-size:48px;font-weight:700;letter-spacing:-0.01em">${esc(it)}</div></div>`).join("")}</div>`;
  },

  cards(id, p, b, { tw }) {
    const items = (p.items || []).slice(0, 6);
    const cols = items.length <= 3 ? items.length : items.length === 4 ? 2 : 3;
    const rows = Math.ceil(items.length / cols);
    const gw = 1680, cw = (gw - (cols - 1) * 30) / cols, ch = rows === 1 ? 420 : 280;
    items.forEach((_, k) => tw(`#${id}-c${k}`, { opacity: 0, y: 50, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)" }, reveal(items.length, b, k)));
    return `${head(id, p.heading, tw, b.s + 0.2)}${items
      .map((it, k) => `<div id="${id}-c${k}" class="abs panel" style="left:${(k % cols) * (cw + 30)}px;top:${130 + Math.floor(k / cols) * (ch + 30)}px;width:${cw}px;height:${ch}px;padding:34px;display:flex;flex-direction:column;gap:14px">
        <div style="width:76px;height:76px;border-radius:18px;background:${ACC[k % 5]}1f;display:flex;align-items:center;justify-content:center">${icon(it.icon, 44, ACC[k % 5])}</div>
        <div style="font-size:${cols === 3 ? 36 : 42}px;font-weight:800;letter-spacing:-0.02em">${esc(it.title)}</div>
        <div class="muted" style="font-size:${cols === 3 ? 27 : 30}px;line-height:1.3">${esc(it.text)}</div></div>`).join("")}`;
  },

  compare(id, p, b, { tw }) {
    const L = (p.left?.items || []).slice(0, 4), R = (p.right?.items || []).slice(0, 4);
    const all = [];
    for (let k = 0; k < Math.max(L.length, R.length); k++) { if (L[k]) all.push(["l", k]); if (R[k]) all.push(["r", k]); }
    all.forEach(([s, k], j) => tw(`#${id}-${s}${k}`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, reveal(all.length, b, j)));
    const col = (side, title, items, color, ic) => `<div class="abs panel" style="left:${side === "l" ? 0 : 860}px;top:0;width:820px;height:740px;padding:40px">
      <div style="display:flex;align-items:center;gap:18px;font-size:50px;font-weight:900;color:${color}">${icon(ic, 52, color)}${esc(title)}</div>
      ${items.map((it, k) => `<div id="${id}-${side}${k}" style="display:flex;gap:18px;align-items:flex-start;font-size:36px;font-weight:600;line-height:1.25;margin-top:34px">${icon(ic, 38, color)}<span>${esc(it)}</span></div>`).join("")}</div>`;
    return col("l", p.left?.title || "Puedo", L, C.green, "check") + col("r", p.right?.title || "No puedo", R, C.coral, "x");
  },

  checklist(id, p, b, { tw }) {
    const items = (p.items || []).slice(0, 6);
    items.forEach((_, k) => {
      const t = reveal(items.length, b, k);
      tw(`#${id}-r${k}`, { opacity: 0.25 }, { opacity: 1, duration: 0.3 }, t);
      tw(`#${id}-k${k}`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, t + 0.05);
      tw(`#${id}-b${k}`, { backgroundColor: "rgba(52,211,153,0)" }, { backgroundColor: "rgba(52,211,153,0.18)", duration: 0.3 }, t);
    });
    return `${head(id, p.heading, tw, b.s + 0.2)}<div class="abs" style="left:0;right:0;top:130px;columns:${items.length > 4 ? 2 : 1};column-gap:60px">${items
      .map((it, k) => `<div id="${id}-r${k}" style="display:flex;align-items:center;gap:26px;margin-bottom:30px;break-inside:avoid"><div id="${id}-b${k}" style="width:62px;height:62px;border-radius:14px;border:3px solid ${C.green};display:flex;align-items:center;justify-content:center;flex:none"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${C.green}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path id="${id}-k${k}" pathLength="1" stroke-dasharray="1" d="M20 6 9 17l-5-5"/></svg></div><div style="font-size:42px;font-weight:700">${esc(it)}</div></div>`).join("")}</div>`;
  },

  terminal(id, p, b, { tw, STATE }) {
    const lines = (p.lines || []).slice(0, 4);
    tw(`#${id}-win`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, b.s + 0.15);
    lines.forEach((l, k) => {
      const t = reveal(lines.length, b, k, 0.3, 2.2);
      STATE.type.push([`#${id}-c${k}`, T(t), Math.min(1.6, 0.03 * l.cmd.length + 0.3), l.cmd]);
      tw(`#${id}-o${k}`, { opacity: 0 }, { opacity: 1, duration: 0.25 }, t + Math.min(1.6, 0.03 * l.cmd.length + 0.3) + 0.2);
      tw(`#${id}-p${k}`, { opacity: 0 }, { opacity: 1, duration: 0.1 }, t);
    });
    return `<div id="${id}-win" class="abs panel" style="left:60px;right:60px;top:20px;bottom:20px;background:#0a0c10;overflow:hidden">
      <div style="height:64px;background:${C.panel2};display:flex;align-items:center;gap:12px;padding:0 26px"><i style="width:18px;height:18px;border-radius:50%;background:#ff5f57;display:block"></i><i style="width:18px;height:18px;border-radius:50%;background:#febc2e;display:block"></i><i style="width:18px;height:18px;border-radius:50%;background:#28c840;display:block"></i><span class="muted" style="margin-left:18px;font-size:26px;font-weight:600">${esc(p.title || "Terminal")}</span></div>
      <div class="mono" style="padding:30px 40px;font-size:31px;line-height:1.5">${lines
        .map((l, k) => `<div id="${id}-p${k}" style="margin-bottom:18px"><span style="color:${C.green}">$ </span><span id="${id}-c${k}" style="color:${C.text}"></span><div id="${id}-o${k}" style="color:${C.muted};white-space:pre-wrap">${esc(l.out || "")}</div></div>`).join("")}</div></div>`;
  },

  pipeline(id, p, b, { tw }) {
    const st = (p.steps || []).slice(0, 6), n = st.length, gap = 1680 / n;
    tw(`#${id}-ln`, { scaleX: 0 }, { scaleX: 1, duration: Math.max(1, b.vo - 0.5), ease: "none" }, b.voStart + 0.2);
    st.forEach((_, k) => tw(`#${id}-n${k}`, { opacity: 0.25, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, reveal(n, b, k, 0.25, 0.8)));
    return `<div id="${id}-ln" class="abs" style="left:${gap / 2}px;width:${1680 - gap}px;top:376px;height:6px;border-radius:3px;background:linear-gradient(90deg,${C.cyan},${C.violet});transform-origin:0 50%"></div>
      ${st.map((s, k) => `<div id="${id}-n${k}" class="abs" style="left:${k * gap}px;width:${gap}px;top:300px;display:flex;flex-direction:column;align-items:center;gap:24px">
        <div style="width:150px;height:150px;border-radius:50%;background:${C.panel};border:5px solid ${ACC[k % 5]};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:58px;color:${ACC[k % 5]}">${k + 1}</div>
        <div style="font-size:${n > 5 ? 32 : 38}px;font-weight:800;text-align:center">${esc(s)}</div></div>`).join("")}`;
  },

  video(id, p, b, ctx) {
    const c = CLIP[p.clip] || CLIP.dart_original;
    const mode = c.ar === "16:9" ? (p.mode === "side" ? "side" : "full") : p.mode === "full" ? "phone" : p.mode || "phone";
    const opts = { from: c.from, len: c.len };
    let txt = "";
    if (mode === "full") {
      video(ctx, c.src, 330, 140, 1260, 709, b, opts);
      txt = `<div class="abs" style="left:0;right:0;top:-6px;text-align:center;font-size:34px;font-weight:700;color:${C.muted}">${esc(p.label)}</div>`;
    } else if (c.ar === "16:9") {
      video(ctx, c.src, 120, 190, 1040, 585, b, opts);
      txt = `<div class="abs h2" style="left:1100px;right:0;top:250px;font-size:56px">${esc(p.label)}</div>`;
    } else {
      const sq = c.ar === "1:1";
      const vw = sq ? 640 : 405, vh = sq ? 640 : 720;
      video(ctx, c.src, 330, 150, vw, vh, b, { ...opts, radius: sq ? 22 : 54, style: sq ? "border:6px solid #fff;" : "border:14px solid #050608;box-shadow:0 30px 80px rgba(0,0,0,0.6);" });
      txt = `<div class="abs h2" style="left:${sq ? 900 : 700}px;right:0;top:230px;font-size:60px">${esc(p.label)}</div>`;
      ctx.tw(`#${id}-lb`, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, b.s + 0.4);
      return `<div id="${id}-lb">${txt}</div>`;
    }
    ctx.tw(`#${id}-lb`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, b.s + 0.4);
    return `<div id="${id}-lb">${txt}</div>`;
  },

  before_after(id, p, b, ctx) {
    const e = EDIT[p.edit] || EDIT.bn;
    const opts = { from: 0, len: 12 };
    video(ctx, "assets/clips/ba_base.mp4", 150, 250, 800, 450, b, opts);
    if (e.ar === "9:16") video(ctx, e.src, 1290, 150, 360, 640, b, { from: 0, len: e.len, radius: 30, style: "border:8px solid #050608;" });
    else video(ctx, e.src, 1010, 250, 800, 450, b, { from: 0, len: e.len });
    ctx.tw(`#${id}-l`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, b.s + 0.3);
    ctx.tw(`#${id}-r`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, b.s + 0.6);
    const lx = 30, rx = e.ar === "9:16" ? 1170 : 890;
    return `<div id="${id}-l" class="abs" style="left:${lx}px;top:60px;font-size:40px;font-weight:800">Antes <span class="muted" style="font-weight:500">· original</span></div>
      <div id="${id}-r" class="abs" style="left:${rx}px;top:${e.ar === "9:16" ? -10 : 60}px;font-size:40px;font-weight:800;color:${C.amber}">Después <span style="font-weight:500;color:${C.text}">· ${esc(p.label || e.name)}</span></div>`;
  },

  demo(id, p, b, ctx, spec) {
    const f = DEMO[p.name] || DEMO.kinetic;
    return f(id, p, b, ctx, spec);
  },
};

// ── demos ──
const frame16 = (inner, extra = "") => `<div class="abs panel" style="left:240px;top:20px;width:1200px;height:675px;overflow:hidden;${extra}">${inner}</div>`;
const DEMO = {
  kinetic(id, p, b, { tw }) {
    const ws = (p.words && p.words.length ? p.words : ["Movimiento", "Ritmo", "Impacto", "Estilo"]).slice(0, 6);
    const slot = (b.e - b.s - 0.6) / ws.length;
    const styles = [
      [{ scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.6)" }],
      [{ x: -500, opacity: 0, skewX: 20 }, { x: 0, opacity: 1, skewX: 0, duration: 0.5, ease: "power4.out" }],
      [{ y: 200, opacity: 0, rotation: 8 }, { y: 0, opacity: 1, rotation: 0, duration: 0.55, ease: "power3.out" }],
      [{ rotationX: -90, opacity: 0, transformPerspective: 900 }, { rotationX: 0, opacity: 1, duration: 0.6, ease: "power3.out" }],
      [{ letterSpacing: "0px", opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }],
    ];
    ws.forEach((_, k) => {
      const t = b.s + 0.3 + k * slot;
      const [fr, to] = styles[k % styles.length];
      const { letterSpacing, ...fr2 } = fr;
      tw(`#${id}-w${k}`, fr2, to, t);
      if (k < ws.length - 1) tw(`#${id}-w${k}`, { opacity: 1 }, { opacity: 0, duration: 0.2 }, t + slot - 0.2);
    });
    return ws.map((w, k) => `<div id="${id}-w${k}" class="abs h1" style="left:0;right:0;top:250px;text-align:center;font-size:170px;color:${ACC[k % 5]}">${esc(w)}</div>`).join("");
  },

  easing(id, p, b, { tw }) {
    const lanes = [["Lineal", "none"], ["Suave (power3.out)", "power3.out"], ["Rebote (back.out)", "back.out(2)"], ["Elástico", "elastic.out(1,0.45)"]];
    const reps = Math.max(1, Math.floor((b.e - b.s - 1) / 2.4));
    lanes.forEach(([, e], k) => tw(`#${id}-d${k}`, { x: 0 }, { x: 1060, duration: 1.1, ease: e, repeat: reps * 2 - 1, yoyo: true, repeatDelay: 0.1 }, b.s + 0.5));
    return lanes.map(([n], k) => `<div class="abs" style="left:0;right:0;top:${40 + k * 175}px;height:140px">
      <div style="font-size:34px;font-weight:700;color:${ACC[k]};margin-bottom:14px">${esc(n)}</div>
      <div style="position:relative;height:70px;border-radius:35px;background:${C.panel};border:2px solid ${C.line};width:1220px">
      <div id="${id}-d${k}" style="position:absolute;left:10px;top:9px;width:52px;height:52px;border-radius:50%;background:${ACC[k]};box-shadow:0 0 24px ${ACC[k]}"></div></div></div>`).join("") +
      `<div class="abs muted" style="left:1300px;top:240px;width:380px;font-size:30px;line-height:1.35">Mismo recorrido, misma duración. Solo cambia la curva.</div>`;
  },

  transitions(id, p, b, { tw, STATE }) {
    const names = ["Whip", "Zoom", "Flash", "Barrido", "Máscara"];
    const slot = Math.max(1.3, (b.e - b.s - 0.8) / names.length);
    let html = "";
    names.forEach((n, k) => {
      const t = b.s + 0.4 + k * slot;
      const pid = `${id}-p${k}`;
      html += `<div id="${pid}" class="abs" style="inset:0;background:linear-gradient(135deg,${ACC[k]},${ACC[(k + 2) % 5]});display:flex;align-items:center;justify-content:center"><div class="h1" style="font-size:150px;color:#0b0d12">${n}</div></div>`;
      if (k === 0) tw(`#${pid}`, { x: 1200, skewX: -10 }, { x: 0, skewX: 0, duration: 0.45, ease: "power3.out" }, t);
      if (k === 1) tw(`#${pid}`, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" }, t);
      if (k === 2) { tw(`#${pid}`, { opacity: 0 }, { opacity: 1, duration: 0.05 }, t + 0.1); tw(`#${id}-fl`, { opacity: 0 }, { opacity: 1, duration: 0.08 }, t); tw(`#${id}-fl`, { opacity: 1 }, { opacity: 0, duration: 0.5 }, t + 0.1); }
      if (k === 3) tw(`#${pid}`, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power3.inOut" }, t);
      if (k === 4) tw(`#${pid}`, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 0.7, ease: "power3.inOut" }, t);
      STATE.text.push([`#${id}-nm`, T(t), `${k + 1}/5 · ${n}`]);
    });
    tw(`#${id}-fr`, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4 }, b.s + 0.1);
    return `<div id="${id}-fr">${frame16(`<div class="abs" style="inset:0;background:${C.panel2}"></div>${html}<div id="${id}-fl" class="abs" style="inset:0;background:#fff;opacity:0"></div>`)}</div><div id="${id}-nm" class="abs" style="left:1470px;top:300px;width:230px;font-size:40px;font-weight:800;color:${C.amber};line-height:1.2"></div>`;
  },

  mask_reveal(id, p, b, { tw }) {
    const text = p.text || "Revelar con máscara";
    tw(`#${id}-a`, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.0, ease: "power3.inOut" }, b.voStart + 0.2);
    tw(`#${id}-bar`, { x: 0 }, { x: 1500, duration: 1.0, ease: "power3.inOut" }, b.voStart + 0.2);
    tw(`#${id}-b`, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: "power4.out" }, b.voStart + 1.3);
    tw(`#${id}-c`, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(70% at 50% 50%)", duration: 1.1, ease: "power2.inOut" }, b.voStart + 2.4);
    return `<div id="${id}-a" class="abs h1" style="left:60px;top:80px;font-size:130px">${esc(text)}</div>
      <div id="${id}-bar" class="abs" style="left:60px;top:80px;width:16px;height:150px;background:${C.cyan};box-shadow:0 0 30px ${C.cyan}"></div>
      <div class="abs" style="left:60px;top:290px;overflow:hidden"><div id="${id}-b" class="h1" style="font-size:80px;color:${C.violet}">línea por línea</div></div>
      <div id="${id}-c" class="abs" style="left:60px;top:430px;width:900px;height:300px;border-radius:24px;background-image:url('${PHOTO.F3}');background-size:cover;background-position:center 40%"></div>
      <div class="abs muted" style="left:1020px;top:500px;width:600px;font-size:32px;line-height:1.35">Una máscara oculta y muestra partes del cuadro: texto, fotos o video.</div>`;
  },

  svg_draw(id, p, b, { tw }) {
    const d = "M120 520 C 220 300, 420 260, 560 380 S 860 640, 1000 420 S 1260 160, 1480 300";
    tw(`#${id}-p`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: Math.min(3.5, b.vo), ease: "power2.inOut" }, b.voStart + 0.2);
    tw(`#${id}-s`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.out" }, b.voStart + 0.6);
    tw(`#${id}-dot`, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(3)" }, b.voStart + 0.2 + Math.min(3.5, b.vo));
    return `<svg class="abs" style="left:0;top:0" width="1680" height="760" viewBox="0 0 1680 760" fill="none">
      <path id="${id}-p" d="${d}" pathLength="1" stroke-dasharray="1" stroke="url(#${id}-g)" stroke-width="16" stroke-linecap="round"/>
      <rect id="${id}-s" x="1250" y="430" width="300" height="220" rx="30" pathLength="1" stroke-dasharray="1" stroke="${C.amber}" stroke-width="10"/>
      <defs><linearGradient id="${id}-g" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient></defs></svg>
      <div id="${id}-dot" class="abs" style="left:1458px;top:278px;width:44px;height:44px;border-radius:50%;background:${C.violet};box-shadow:0 0 30px ${C.violet}"></div>
      <div class="abs" style="left:1262px;top:500px;width:276px;text-align:center;font-size:34px;font-weight:800;color:${C.amber}">${esc(p.label || "Trazo SVG")}</div>`;
  },

  three_d(id, p, b, { tw }) {
    const reps = Math.max(1, Math.floor((b.e - b.s - 1) / 3));
    const names = ["Frente", "Giro", "Profundidad"];
    names.forEach((_, k) => tw(`#${id}-c${k}`, { rotationY: -38, rotationX: 6, transformPerspective: 1400 }, { rotationY: 38, rotationX: -6, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: reps * 2 - 1 }, b.s + 0.3 + k * 0.25));
    tw(`#${id}-cube`, { rotationX: -20, rotationY: 0, transformPerspective: 1200 }, { rotationX: -20, rotationY: 360 * reps, duration: 3 * reps, ease: "none" }, b.s + 0.3);
    return names.map((n, k) => `<div id="${id}-c${k}" class="abs" style="left:${60 + k * 330}px;top:180px;width:290px;height:400px;border-radius:24px;background:linear-gradient(160deg,${ACC[k]},${ACC[k + 1]});display:flex;align-items:flex-end;padding:28px;font-size:40px;font-weight:900;color:#0b0d12;box-shadow:0 30px 60px rgba(0,0,0,0.5)">${n}</div>`).join("") +
      `<div class="abs" style="left:1180px;top:200px;width:360px;height:360px;transform-style:preserve-3d"><div id="${id}-cube" style="position:relative;width:360px;height:360px;transform-style:preserve-3d">${[
        ["translateZ(180px)", C.cyan], ["rotateY(180deg) translateZ(180px)", C.violet], ["rotateY(90deg) translateZ(180px)", C.amber],
        ["rotateY(-90deg) translateZ(180px)", C.coral], ["rotateX(90deg) translateZ(180px)", C.green], ["rotateX(-90deg) translateZ(180px)", C.cyan],
      ].map(([tr, c]) => `<div style="position:absolute;inset:0;transform:${tr};background:${c}cc;border:3px solid #fff3;border-radius:12px"></div>`).join("")}</div></div>`;
  },

  particles(id, p, b, { tw }) {
    const N = 70, bursts = Math.max(1, Math.min(3, Math.floor((b.e - b.s) / 4)));
    let html = "";
    for (let k = 0; k < N; k++) {
      const ang = rnd() * Math.PI * 2, dist = 250 + rnd() * 450, size = 10 + rnd() * 18;
      const col = ACC[k % 5], shape = k % 3 === 0 ? "50%" : "3px";
      html += `<div id="${id}-q${k}" class="abs" style="left:830px;top:360px;width:${size}px;height:${size * (k % 3 === 1 ? 2 : 1)}px;background:${col};border-radius:${shape};opacity:0"></div>`;
      for (let r = 0; r < bursts; r++) {
        const t = b.s + 0.5 + r * ((b.e - b.s - 1) / bursts);
        tw(`#${id}-q${k}`, { x: 0, y: 0, opacity: 1, rotation: 0, scale: 1 },
          { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 0.75 + 160, opacity: 0, rotation: (rnd() - 0.5) * 720, scale: 0.6, duration: 1.6 + rnd() * 0.6, ease: "power3.out" }, t);
      }
    }
    tw(`#${id}-t`, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, b.s + 0.5);
    return html + `<div id="${id}-t" class="abs h1" style="left:0;right:0;top:300px;text-align:center;font-size:120px">¡Listo!</div>`;
  },

  counter(id, p, b, { tw, STATE }) {
    const t = b.voStart + 0.3, d = Math.min(2.6, Math.max(1.2, b.vo * 0.5));
    STATE.count.push([`#${id}-n`, T(t), d, +p.from || 0, +p.to || 1000, p.prefix || "", p.suffix || ""]);
    tw(`#${id}-bar`, { scaleX: 0 }, { scaleX: 1, duration: d, ease: "power3.out" }, t);
    return `<div class="abs" style="left:0;right:0;top:140px;text-align:center"><div id="${id}-n" class="h1" style="font-size:190px;font-variant-numeric:tabular-nums">0</div>
      <div class="muted" style="font-size:44px;font-weight:600;margin-top:10px">${esc(p.label || "")}</div>
      <div style="margin:50px auto 0;width:1000px;height:22px;border-radius:11px;background:${C.panel2};overflow:hidden"><div id="${id}-bar" style="height:100%;background:linear-gradient(90deg,${C.cyan},${C.violet});transform-origin:0 50%"></div></div></div>`;
  },

  bar_chart(id, p, b, { tw, STATE }) {
    const vals = (p.values || [3, 5, 4, 7, 9]).slice(0, 8), labels = p.labels || vals.map((_, k) => `${k + 1}`);
    const mx = Math.max(...vals), n = vals.length, bw = Math.min(160, 1300 / n - 40);
    vals.forEach((v, k) => {
      const t = b.voStart + 0.3 + k * 0.18;
      tw(`#${id}-b${k}`, { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: "power3.out" }, t);
      STATE.count.push([`#${id}-v${k}`, T(t), 0.8, 0, v, "", ""]);
    });
    return `${head(`${id}x`, p.title || "", tw, b.s + 0.2)}<div class="abs" style="left:100px;right:100px;top:150px;height:520px;display:flex;align-items:flex-end;justify-content:space-around;border-bottom:3px solid ${C.line}">${vals
      .map((v, k) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><div id="${id}-v${k}" style="font-size:34px;font-weight:800">0</div><div id="${id}-b${k}" style="width:${bw}px;height:${(v / mx) * 420}px;border-radius:12px 12px 0 0;background:linear-gradient(180deg,${ACC[k % 5]},${ACC[k % 5]}88);transform-origin:50% 100%"></div></div>`).join("")}</div>
      <div class="abs" style="left:100px;right:100px;top:690px;display:flex;justify-content:space-around">${labels.slice(0, n).map((l) => `<div class="muted" style="width:${bw + 30}px;text-align:center;font-size:28px;font-weight:600">${esc(l)}</div>`).join("")}</div>`;
  },

  line_chart(id, p, b, { tw }) {
    const vals = (p.values || [2, 4, 3, 6, 5, 8, 9]).slice(0, 12), mx = Math.max(...vals), mn = Math.min(...vals, 0);
    const pts = vals.map((v, k) => [100 + (k * 1400) / (vals.length - 1), 640 - ((v - mn) / (mx - mn || 1)) * 460]);
    const d = pts.map((q, k) => `${k ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
    tw(`#${id}-l`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: Math.min(3, b.vo), ease: "power2.inOut" }, b.voStart + 0.2);
    pts.forEach((_, k) => tw(`#${id}-p${k}`, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" }, b.voStart + 0.2 + (Math.min(3, b.vo) * k) / (pts.length - 1)));
    return `${head(`${id}x`, p.title || "", tw, b.s + 0.2)}<svg class="abs" style="left:0;top:0" width="1680" height="760" viewBox="0 0 1680 760" fill="none">
      ${[0, 1, 2, 3].map((k) => `<line x1="100" x2="1500" y1="${180 + k * 153}" y2="${180 + k * 153}" stroke="${C.line}" stroke-width="2"/>`).join("")}
      <path id="${id}-l" d="${d}" pathLength="1" stroke-dasharray="1" stroke="${C.cyan}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${pts.map((q, k) => `<div id="${id}-p${k}" class="abs" style="left:${q[0] - 14}px;top:${q[1] - 14}px;width:28px;height:28px;border-radius:50%;background:${C.violet};border:4px solid #fff"></div>`).join("")}`;
  },

  lower_third(id, p, b, { tw }) {
    tw(`#${id}-bar`, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, b.voStart + 0.4);
    tw(`#${id}-n`, { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: "power4.out" }, b.voStart + 0.7);
    tw(`#${id}-r`, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, b.voStart + 0.95);
    tw(`#${id}-img`, { scale: 1.0 }, { scale: 1.12, duration: b.e - b.s, ease: "none" }, b.s);
    return frame16(`<div id="${id}-img" class="abs" style="inset:0;background-image:url('${PHOTO.F1}');background-size:cover;background-position:center 60%"></div><div class="abs" style="inset:0;background:linear-gradient(0deg,rgba(0,0,0,0.6),transparent 50%)"></div>
      <div class="abs" style="left:60px;bottom:70px"><div id="${id}-bar" style="width:12px;height:110px;background:${C.amber};position:absolute;left:0;top:0;transform-origin:50% 100%"></div>
      <div style="padding-left:34px;overflow:hidden"><div id="${id}-n" style="font-size:58px;font-weight:900">${esc(p.person || p.title || p.label || "Nombre Apellido")}</div></div>
      <div id="${id}-r" style="padding-left:34px;font-size:32px;font-weight:600;color:${C.amber}">${esc(p.role || "Cargo o descripción")}</div></div>`) +
      `<div class="abs muted" style="left:1470px;top:260px;width:230px;font-size:30px;line-height:1.35">Rótulo inferior: quién habla o qué se ve.</div>`;
  },

  logo_sting(id, p, b, { tw, sfx }) {
    const name = String(p.brand || p.text || p.label || p.title || "Tu marca").slice(0, 16);
    const t = b.voStart + 0.2;
    tw(`#${id}-ring`, { strokeDashoffset: 1, rotation: -90 }, { strokeDashoffset: 0, rotation: 0, duration: 1.0, ease: "power3.inOut" }, t);
    name.split("").forEach((_, k) => tw(`#${id}-c${k}`, { y: 120, opacity: 0, rotation: 15 }, { y: 0, opacity: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" }, t + 0.6 + k * 0.045));
    tw(`#${id}-sh`, { xPercent: -150 }, { xPercent: 350, duration: 0.9, ease: "power2.inOut" }, t + 1.6);
    sfx.push({ t: t + 0.6, type: "impact" });
    return `<svg class="abs" style="left:640px;top:60px" width="400" height="400" viewBox="0 0 400 400" fill="none"><circle id="${id}-ring" cx="200" cy="200" r="170" pathLength="1" stroke-dasharray="1" stroke="${C.violet}" stroke-width="14" style="transform-origin:200px 200px"/></svg>
      <div class="abs" style="left:0;right:0;top:470px;text-align:center;overflow:hidden"><div class="h1" style="font-size:150px;display:inline-block;position:relative;overflow:hidden;padding:0 10px">${name.split("").map((c, k) => `<span id="${id}-c${k}" style="display:inline-block">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}<div id="${id}-sh" class="abs" style="top:0;left:0;width:30%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent);mix-blend-mode:overlay"></div></div></div>`;
  },

  captions_word(id, p, b, { STATE, tw }) {
    const words = String(p.text || "Así se ven los subtítulos palabra por palabra").split(/\s+/);
    const t0 = b.voStart + 0.4, step = Math.min(0.42, Math.max(0.25, (b.e - t0 - 1) / words.length));
    words.forEach((w, k) => STATE.text.push([`#${id}-w`, T(t0 + k * step), w]));
    STATE.text.push([`#${id}-w`, T(b.s), ""]);
    tw(`#${id}-ph`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, b.s + 0.1);
    tw(`#${id}-img`, { scale: 1.15 }, { scale: 1.35, duration: b.e - b.s, ease: "none" }, b.s);
    return `<div id="${id}-ph" class="abs" style="left:560px;top:10px;width:420px;height:746px;border-radius:52px;border:14px solid #050608;overflow:hidden;background:#000;box-shadow:0 30px 80px rgba(0,0,0,0.6)">
      <div id="${id}-img" class="abs" style="inset:0;background-image:url('${PHOTO.F2}');background-size:cover;background-position:60% 50%"></div>
      <div class="abs" style="left:0;right:0;top:470px;text-align:center"><span id="${id}-w" style="font-weight:900;font-size:58px;color:#fff;-webkit-text-stroke:9px #000;paint-order:stroke fill"></span></div></div>
      <div class="abs" style="left:1060px;top:240px;width:560px;font-size:44px;font-weight:800;line-height:1.2">Una palabra a la vez, <span style="color:${C.amber}">al ritmo de la voz</span>.</div>`;
  },

  captions_karaoke(id, p, b, { STATE, tw }) {
    const words = String(p.text || "La palabra que suena se resalta en color").split(/\s+/).slice(0, 14);
    const t0 = b.voStart + 0.4, step = Math.min(0.5, Math.max(0.25, (b.e - t0 - 1) / words.length));
    words.forEach((_, k) => {
      tw(`#${id}-w${k}`, { backgroundColor: "rgba(251,191,36,0)", color: "#ffffff" }, { backgroundColor: "rgba(251,191,36,1)", color: "#0b0d12", duration: 0.08 }, t0 + k * step);
      if (k < words.length - 1) tw(`#${id}-w${k}`, { backgroundColor: "rgba(251,191,36,1)", color: "#0b0d12" }, { backgroundColor: "rgba(251,191,36,0)", color: "#ffffff", duration: 0.08 }, t0 + (k + 1) * step);
    });
    return frame16(`<div class="abs" style="inset:0;background-image:url('${PHOTO.F5}');background-size:cover;background-position:center"></div><div class="abs" style="inset:0;background:rgba(0,0,0,0.35)"></div>
      <div class="abs" style="left:80px;right:80px;bottom:60px;text-align:center"><span style="display:inline-block;background:rgba(8,10,14,0.8);padding:14px 26px;border-radius:12px;font-size:46px;font-weight:700;line-height:1.35">${words.map((w, k) => `<span id="${id}-w${k}" style="border-radius:6px;padding:0 5px">${esc(w)}</span>`).join(" ")}</span></div>`);
  },

  ken_burns(id, p, b, { tw }) {
    const src = PHOTO[p.photo] || PHOTO.F3;
    tw(`#${id}-img`, { scale: 1.0, x: 60, y: 20 }, { scale: 1.35, x: -60, y: -30, duration: b.e - b.s, ease: "sine.inOut" }, b.s);
    tw(`#${id}-orig`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, b.s + 0.3);
    return `<div id="${id}-orig" class="abs panel" style="left:0;top:180px;width:420px;height:330px;overflow:hidden;padding:0"><img src="${src}" style="width:100%;height:100%;object-fit:cover" alt="" /><div class="abs" style="left:0;right:0;bottom:0;padding:10px;background:rgba(0,0,0,0.6);font-size:24px;font-weight:700;text-align:center">Foto original, quieta</div></div>
      <div class="abs" style="left:470px;top:20px;width:1210px;height:680px;border-radius:18px;overflow:hidden;border:2px solid ${C.line}"><div id="${id}-img" class="abs" style="inset:0;background-image:url('${src}');background-size:cover;background-position:center"></div>
      <div class="abs" style="left:24px;top:20px;padding:8px 18px;border-radius:9999px;background:rgba(0,0,0,0.6);font-size:26px;font-weight:700;color:${C.amber}">Cámara virtual: acercamiento + paneo</div></div>`;
  },

  formats(id, p, b, { tw }) {
    const F = [["16:9", 560, 315, "YouTube · web"], ["9:16", 236, 420, "TikTok · Reels"], ["1:1", 340, 340, "Feed"]];
    let x = 40;
    return F.map(([n, w, h, use], k) => {
      tw(`#${id}-f${k}`, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }, reveal(3, b, k));
      tw(`#${id}-s${k}`, { opacity: 0 }, { opacity: 1, duration: 0.4 }, reveal(3, b, k) + 0.5);
      const html = `<div id="${id}-f${k}" class="abs" style="left:${x}px;top:${120 + (420 - h) / 2}px;width:${w}px;height:${h}px;border-radius:14px;overflow:hidden;border:3px solid ${ACC[k]}">
        <div class="abs" style="inset:0;background-image:url('${PHOTO.F4}');background-size:cover;background-position:center 70%"></div>
        ${k === 1 ? `<div id="${id}-s${k}" class="abs" style="inset:0"><div class="abs" style="left:0;right:0;top:0;height:12%;background:repeating-linear-gradient(45deg,rgba(251,113,133,0.55) 0 8px,transparent 8px 16px)"></div><div class="abs" style="left:0;right:0;bottom:0;height:22%;background:repeating-linear-gradient(45deg,rgba(251,113,133,0.55) 0 8px,transparent 8px 16px)"></div></div>` : `<div id="${id}-s${k}" class="abs" style="inset:6%;border:3px dashed rgba(255,255,255,0.8);border-radius:6px"></div>`}</div>
        <div class="abs" style="left:${x}px;width:${w}px;top:600px;text-align:center"><div style="font-size:52px;font-weight:900;color:${ACC[k]}">${n}</div><div class="muted" style="font-size:28px;font-weight:600">${use}</div></div>`;
      x += w + 150;
      return html;
    }).join("") + `<div class="abs muted" style="left:40px;top:40px;font-size:28px">Rayado: zonas que tapa la interfaz de la app. Punteado: margen seguro.</div>`;
  },

  color_grade(id, p, b, { tw }) {
    const src = PHOTO[p.photo] || PHOTO.F5;
    const V = [["Original", "none"], ["Cálido", "sepia(0.35) saturate(1.3) hue-rotate(-10deg)"], ["Frío", "saturate(1.1) hue-rotate(18deg) brightness(1.05)"], ["B/N", "grayscale(1) contrast(1.25)"], ["Contraste", "contrast(1.45) saturate(1.25)"]];
    return V.map(([n, f], k) => {
      tw(`#${id}-g${k}`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, reveal(5, b, k));
      return `<div id="${id}-g${k}" class="abs" style="left:${k * 336}px;top:140px;width:310px;height:430px;border-radius:16px;overflow:hidden;border:2px solid ${C.line}"><div class="abs" style="inset:0;background-image:url('${src}');background-size:cover;background-position:center;filter:${f}"></div>
        <div class="abs" style="left:0;right:0;bottom:0;padding:14px;background:rgba(0,0,0,0.65);text-align:center;font-size:32px;font-weight:800">${n}</div></div>`;
    }).join("") + `<div class="abs muted" style="left:0;top:620px;font-size:30px">Mismo producto, distinto ánimo. El color se ajusta sin cambiar el producto.</div>`;
  },

  waveform(id, p, b, { tw, STATE }) {
    const N = 56;
    let bars = "";
    for (let k = 0; k < N; k++) {
      const base = 0.25 + 0.75 * Math.abs(Math.sin(k * 0.55) * Math.cos(k * 0.21));
      bars += `<div id="${id}-w${k}" style="width:16px;height:300px;border-radius:8px;background:linear-gradient(180deg,${C.cyan},${C.violet});transform-origin:50% 50%;transform:scaleY(${base.toFixed(2)})"></div>`;
      const reps = Math.max(2, Math.floor((b.e - b.s) / (0.3 + (k % 5) * 0.05)));
      tw(`#${id}-w${k}`, { scaleY: base }, { scaleY: Math.max(0.12, base * (0.3 + rnd() * 0.5)), duration: 0.3 + (k % 5) * 0.05, ease: "sine.inOut", yoyo: true, repeat: reps - 1 }, b.s + 0.2);
    }
    STATE.count.push([`#${id}-l`, T(b.voStart + 0.4), 2.2, -28, -14, "", " LUFS"]);
    tw(`#${id}-needle`, { rotation: -70 }, { rotation: 0, duration: 2.2, ease: "power3.out" }, b.voStart + 0.4);
    return `<div class="abs panel" style="left:0;top:100px;width:1120px;height:440px;display:flex;align-items:center;justify-content:center;gap:4px">${bars}</div>
      <div class="abs panel" style="left:1180px;top:100px;width:500px;height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="position:relative;width:300px;height:160px;overflow:hidden"><div style="position:absolute;left:0;top:0;width:300px;height:300px;border-radius:50%;border:14px solid ${C.line};border-top-color:${C.green};border-right-color:${C.amber}"></div><div id="${id}-needle" style="position:absolute;left:146px;top:20px;width:8px;height:140px;background:${C.text};border-radius:4px;transform-origin:50% 100%"></div></div>
        <div id="${id}-l" style="font-size:72px;font-weight:900;font-variant-numeric:tabular-nums;margin-top:20px">-28 LUFS</div><div class="muted" style="font-size:28px;font-weight:600">volumen estándar para redes</div></div>
      <div class="abs muted" style="left:0;top:580px;font-size:30px">No escucho: mido. Volumen, picos, silencios y forma de onda.</div>`;
  },

  timeline_editor(id, p, b, { tw }) {
    const tracks = [["V2", [[300, 260, C.violet, "Texto"], [820, 300, C.violet, "Logo"]]], ["V1", [[0, 520, C.cyan, "Clip 1"], [540, 420, C.cyan, "Clip 2"], [980, 520, C.cyan, "Clip 3"]]], ["A1", [[0, 1500, C.green, "Voz"]]], ["A2", [[0, 1500, C.amber, "Música"]]]];
    let html = "", k = 0;
    tracks.forEach(([n, clips], r) => {
      html += `<div class="abs" style="left:0;top:${150 + r * 120}px;width:90px;height:96px;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:${C.muted}">${n}</div><div class="abs" style="left:110px;top:${150 + r * 120}px;width:1520px;height:96px;border-radius:10px;background:${C.panel}"></div>`;
      clips.forEach(([x, w, c, lab]) => {
        html += `<div id="${id}-k${k}" class="abs" style="left:${120 + x}px;top:${158 + r * 120}px;width:${w - 16}px;height:80px;border-radius:10px;background:${c}cc;border:2px solid ${c};display:flex;align-items:center;padding-left:18px;font-size:26px;font-weight:800;color:#0b0d12">${lab}</div>`;
        tw(`#${id}-k${k}`, { x: (k % 2 ? 1 : -1) * 200, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, b.s + 0.3 + k * 0.15);
        k++;
      });
    });
    tw(`#${id}-ph`, { x: 0 }, { x: 1500, duration: b.e - b.s - 0.5, ease: "none" }, b.s + 0.4);
    return `<div class="abs" style="left:110px;top:90px;width:1520px;height:40px;display:flex;justify-content:space-between" class="muted">${[0, 5, 10, 15, 20, 25, 30].map((s) => `<span class="muted" style="font-size:24px;font-weight:600">0:${String(s).padStart(2, "0")}</span>`).join("")}</div>${html}
      <div id="${id}-ph" class="abs" style="left:120px;top:130px;width:4px;height:520px;background:${C.coral};box-shadow:0 0 12px ${C.coral}"><div style="position:absolute;left:-12px;top:-14px;width:28px;height:20px;background:${C.coral};border-radius:4px"></div></div>`;
  },

  phone_ui(id, p, b, { tw, STATE, sfx }) {
    const t = b.voStart + 0.5;
    tw(`#${id}-ph`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, b.s + 0.1);
    tw(`#${id}-r1`, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, t + 0.6);
    tw(`#${id}-r2`, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, t + 1.6);
    STATE.count.push([`#${id}-tot`, T(t + 0.6), 0.5, 0, 159900, "$", ""]);
    STATE.count.push([`#${id}-tot`, T(t + 1.6), 0.4, 159900, 183900, "$", ""]);
    tw(`#${id}-ok`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" }, t + 2.8);
    sfx.push({ t: t + 0.6, type: "beep" }, { t: t + 1.6, type: "beep" });
    const row = (rid, n, s, pr) => `<div id="${rid}" style="display:flex;justify-content:space-between;align-items:center;height:76px;border-bottom:2px solid #e4e3dd"><div><div style="font-size:24px;font-weight:700">${n}</div><div style="font-size:18px;color:#5f5e5a">${s}</div></div><div style="font-size:24px;font-weight:700">${pr}</div></div>`;
    return `<div id="${id}-ph" class="abs" style="left:560px;top:10px;width:400px;height:746px;border-radius:50px;border:14px solid #050608;background:#fff;color:#0b0b0b;overflow:hidden">
      <div style="padding:46px 22px 0"><div style="font-size:30px;font-weight:700;margin-bottom:14px">Vender</div>
      <div style="height:60px;border:3px solid #256abf;border-radius:8px;display:flex;align-items:center;padding:0 16px;color:#5f5e5a;font-size:20px">Escanea o busca</div>
      <div style="margin-top:10px">${row(`${id}-r1`, "Tenis blancos", "Talla 38", "$159.900")}${row(`${id}-r2`, "Medias tobilleras", "x2", "$24.000")}</div></div>
      <div class="abs" style="left:0;right:0;bottom:0;height:120px;border-top:2px solid #e4e3dd;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:#fff"><div><div style="font-size:18px;color:#5f5e5a">Total</div><div id="${id}-tot" style="font-size:40px;font-weight:700">$0</div></div><div style="background:#256abf;color:#fff;border-radius:8px;padding:16px 26px;font-size:26px;font-weight:700">Cobrar</div></div>
      <div id="${id}-ok" class="abs" style="left:0;right:0;bottom:0;height:120px;background:#eaf6ec;color:#1a7f37;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700">✓ Vendido $183.900</div></div>
      <div class="abs" style="left:1040px;top:220px;width:600px;font-size:42px;font-weight:800;line-height:1.2">Interfaz redibujada en HTML: <span style="color:${C.cyan}">nítida y animable</span>, sin capturas.</div>
      <div class="abs muted" style="left:1040px;top:420px;width:560px;font-size:26px">Datos de ejemplo</div>`;
  },

  code(id, p, b, { tw, STATE }) {
    const unent = (x) => x.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    const snippet = unent(String(p.snippet || `<h1 id="t">Hola</h1>\ntl.from("#t", { y: 80, opacity: 0, ease: "power3.out" });`)).split("\n").slice(0, 8).join("\n");
    const t = b.voStart + 0.3, d = Math.min(b.vo - 0.5, Math.max(1.5, snippet.length * 0.035));
    STATE.type.push([`#${id}-c`, T(t), d, snippet]);
    tw(`#${id}-win`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, b.s + 0.15);
    return `<div id="${id}-win" class="abs panel" style="left:60px;right:60px;top:20px;bottom:30px;background:#0a0c10;overflow:hidden">
      <div style="height:60px;background:${C.panel2};display:flex;align-items:center;gap:12px;padding:0 26px"><i style="width:18px;height:18px;border-radius:50%;background:#ff5f57;display:block"></i><i style="width:18px;height:18px;border-radius:50%;background:#febc2e;display:block"></i><i style="width:18px;height:18px;border-radius:50%;background:#28c840;display:block"></i><span class="muted" style="margin-left:18px;font-size:24px;font-weight:600">${esc(p.lang || "html")}</span></div>
      <pre id="${id}-c" class="mono" style="padding:34px 44px;font-size:32px;line-height:1.5;color:${C.cyan};white-space:pre-wrap"></pre></div>`;
  },

  storyboard(id, p, b, { tw }) {
    const P = ["F2", "F5", "F1", "F4", "F3", "F2"], L = ["0–3 s Gancho", "3–8 s Producto", "8–14 s Variedad", "14–20 s Detalle", "20–25 s Marca", "25–30 s Cierre"];
    return P.map((f, k) => {
      tw(`#${id}-s${k}`, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)" }, reveal(6, b, k, 0.2, 0.6));
      return `<div id="${id}-s${k}" class="abs panel" style="left:${(k % 3) * 560}px;top:${Math.floor(k / 3) * 370}px;width:520px;height:340px;overflow:hidden;padding:0">
        <div class="abs" style="left:0;right:0;top:0;height:270px;background-image:url('${PHOTO[f]}');background-size:cover;background-position:center"></div>
        <div class="abs" style="left:0;right:0;bottom:0;height:70px;display:flex;align-items:center;padding:0 22px;font-size:28px;font-weight:800">${L[k]}</div></div>`;
    }).join("");
  },

  split_screen(id, p, b, ctx) {
    video(ctx, CLIP.dart_original.src, 150, 250, 800, 450, b, { from: 20, len: 64 });
    video(ctx, CLIP.dart_narrado.src, 1010, 250, 800, 450, b, { from: 14, len: 112 });
    ctx.tw(`#${id}-t`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, b.s + 0.3);
    return `<div id="${id}-t"><div class="abs" style="left:30px;top:60px;font-size:40px;font-weight:800">Original</div><div class="abs" style="left:890px;top:60px;font-size:40px;font-weight:800;color:${C.amber}">Con narración y subtítulos</div></div>`;
  },
};

// ejecución directa: node tools/build.mjs NN
if (process.argv[2]) {
  const nn = process.argv[2];
  vidN = 0;
  fs.writeFileSync(`cap/${nn}/index.html`, build(nn));
  if (!fs.existsSync(`cap/${nn}/assets`)) fs.symlinkSync("../../assets", `cap/${nn}/assets`);
  console.log("ok cap", nn);
}
