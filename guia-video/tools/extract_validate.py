# Extrae del journal del workflow los capítulos revisados y valida que cada visual exista en el catálogo del motor.
#   python3 tools/extract_validate.py <journal.jsonl>
import json, sys, os, re
TYPES = {"title","statement","bullets","cards","compare","checklist","terminal","pipeline","video","before_after","demo"}
DEMOS = {"kinetic","easing","transitions","mask_reveal","svg_draw","three_d","particles","counter","bar_chart","line_chart","lower_third","logo_sting","captions_word","captions_karaoke","ken_burns","formats","color_grade","waveform","timeline_editor","phone_ui","code","storyboard","split_screen"}
CLIPS = {"dart_original","dart_narrado","manager_30s","manager_cuadrado","trendy_anuncio","trendy_historia"}
EDITS = {"vertical","rapido","bn","recorte","subtitulos","calido"}
ICONS = {"film","scissors","text","music","mic","image","chart","phone","layers","wand","clock","check","x","globe","code","palette","box","star","eye","bolt"}
L = [json.loads(l) for l in open(sys.argv[1])]
out = {}
for l in L:
    r = l.get("result")
    if l["type"] == "result" and isinstance(r, dict) and "spec" in r: out[r["spec"]["chapter"]] = r["spec"]
for ch, s in sorted(out.items()):
    nn = f"{ch:02d}"; probs = []
    for i, b in enumerate(s["beats"]):
        v = b["visual"]; t = v.get("type"); p = v.get("params") or {}
        if t not in TYPES: probs.append(f"b{i} tipo {t}")
        if t == "demo" and p.get("name") not in DEMOS: probs.append(f"b{i} demo {p.get('name')}")
        if t == "video" and p.get("clip") not in CLIPS: probs.append(f"b{i} clip {p.get('clip')}")
        if t == "before_after" and p.get("edit") not in EDITS: probs.append(f"b{i} edit {p.get('edit')}")
        if t == "cards":
            for it in p.get("items", []):
                if it.get("icon") not in ICONS: it["icon"] = "star"; probs.append(f"b{i} icono→star")
        if t == "demo" and p.get("name") in ("ken_burns","color_grade") and p.get("photo") not in ("F1","F2","F3","F4","F5"): p["photo"] = "F3"
        if re.search(r"[→%/&]", b["narration"]): probs.append(f"b{i} símbolo en narración")
    if s["beats"][0]["visual"]["type"] != "title": probs.append("no empieza con title")
    os.makedirs(f"cap/{nn}", exist_ok=True)
    new = json.dumps(s, ensure_ascii=False, indent=1)
    if not os.path.exists(f"cap/{nn}/spec.json") or open(f"cap/{nn}/spec.json").read() != new:
        open(f"cap/{nn}/spec.json", "w").write(new)
    print(nn, s["title"], "·", len(s["beats"]), "bloques ·", sum(len(b["narration"].split()) for b in s["beats"]), "palabras ·", "OK" if not probs else probs)
