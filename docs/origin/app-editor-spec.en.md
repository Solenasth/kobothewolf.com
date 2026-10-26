> **Historical document (external, redacted version, translated from Spanish).** This is one of the project's original inputs, written before the approved requirements and design that supersede it: [REQUIREMENTS.md](../REQUIREMENTS.md) and [DESIGN.md](../DESIGN.md). Local paths, private prototype URLs, machine and network details, and references to unpublished or removed material were taken out. The technical content is unchanged. [Original in Spanish](app-editor-spec.es.md).

# Spec · "KOBO.EXE variant editor" app

**Status:** draft v0.3 · 25 Oct 2026
- v0.3: safe export on Safari/WebKit, site QR for kobothewolf.com, optional contact blocks.
- v0.2: granular controls, mixing faces, white fill for stickers, the v5 state bug and its test.

**For:** a separate project in Kobo's repo. Until then, work continues with the current artifacts (see §2).
**Design source of truth:** the private KOBO.EXE design repository (styles, tokens, demos, kits, assets). This document covers the technology; visual rules live in `styles/<style>/STYLE.md` and `context/`.

---

## 1. Purpose and scope

A web app to **create, edit and export business cards (and related pieces) in the KOBO.EXE styles**, without Canva. It respects each style's tokens and effects 100 % and locks what must not be touched (contact, QR).

**In scope (v1)**
- Several styles (boykisser-uwu, edgy-2000s and those to come), each with its variants.
- Form-based editing: marked texts, art, background, color (tokens only), anti-rules.
- Own art: upload a drawing and turn it into a sticker in the browser.
- Print export: a 300 dpi PNG per face and a 2-page PDF with 3 mm bleed. Optionally, a vector PDF with embedded fonts.
- Works without a server (static) and offline once loaded.

**Out of scope (v1)**
- Free canvas editing (moving any piece with the mouse). Composition is explored in the Design canvas (§2.2), and the decision is carried into code.
- Accounts, real-time collaboration, cloud.
- AI image generation (forbidden by the project, decision 2).
- Canva integration (decision 6: it breaks effects and tokens).

---

## 2. Current state (what exists today)

### 2.1 Variant editor (artifact)
- **Name:** "Boykisser Variant Editor" (private claude.ai artifact).
- **Source:** `variants/boykisser-editor/` → `editor.template.html` + `build_editor.py` → `salida/editor.html`. That is ≈4 MB, a single file with everything inlined.
- **Version:** artifact v8 (v7: safe shadows when exporting on Safari · v8: site QR on all 4 backs).
- **Variants:** Certificate, License, Code cat, Programming socks (boykisser-uwu style). Front and back are chosen separately, so faces can be mixed across variants.
- **Per-face controls:**
  - each text with show/hide;
  - hideable pieces (`data-parte`, the cat, the bow, each tape);
  - art, background, cat rotation, sparkles.
- **Common controls:** accent, shadow, headline rotation, cat size, tape angle, guides.
- **Runtime capability:** `downloads`. The artifact viewer doesn't allow downloading or printing without it, and each file asks for confirmation.
- **Libraries (CDN, pinned):** html-to-image **1.11.11** (jsDelivr) and jsPDF **2.5.1** (cdnjs).
- **Tested:**
  - PNG 1134 × 661 px with pHYs at 300 dpi;
  - PDF 96 × 56 mm with the PNG at 300 ppi;
  - both QRs decode (`https://t.me/KoboTheWolf` and `https://kobothewolf.com`);
  - no console errors;
  - real downloads on claude.ai.
- **Backs:** under the Telegram contact sits the site block: a QR to kobothewolf.com, "don't like my card? >w<", and an invitation to see the demo and make a better card. It is a hideable piece with two editable texts; the QR and URL stay locked.
- **Controls test:** `variants/boykisser-editor/pruebas/test_controles.py` clicks all 125 checkboxes across the 8 faces and checks in the layout that each element hides and comes back. It also covers selects, ranges and persistence after reload (v5: 136 failures · v6–v8: 0).

### 2.2 Design canvas (artifact, exploration only)
- A private claude.ai artifact, with a copy in the design repository.
- Useful for moving pieces by hand. Measured limitations:
  - PNG at most 726 × 424 px (~192 dpi);
  - PDF as JPEG at 288 ppi;
  - no locking of untouchables.

### 2.3 Local pipeline (Python, in `kobo-exe/`)
| Piece | What it does |
|---|---|
| `lib/efectos.py` | Image treatment: crunch, nibbled edges, halo, flare, QR (edgy); `silueta()`, `sticker()` (boykisser) |
| `lib/fonts.json` + `lib/fonts/` | Font registry (alias, `.woff2` file, Canva name, role, weight) with OFL licenses |
| `styles/<style>/tokens.json` | Style tokens (color, gradients, typography, anti-rules, effects, untouchables, contact) |
| `variants/<style>-demo-web/` | HTML demo (template + build): each variant's faces, single source |
| `variants/<style>-kit-canva/` | Design guide as a PDF (12 pp.) generated with Playwright |
| `tools/render.py` | Generic HTML → PDF/PNG |

**Dependencies:** Python 3.10+, pillow, numpy, scipy, qrcode, pdf2image (+ poppler), playwright + Chromium, fontTools + brotli (glyph check), opencv (QR reading in tests), rustc (code-cat check).

---

## 3. Domain model

```
Style ──< Variant ──< Face (front, back)
  │            │            └── Marks (editable fields, art, rotations, ornaments)
  │            └── Manifest (name, default backgrounds, output file, controls)
  └── Tokens (color, typography, anti-rules, effects, untouchables, contact)
Assets (fonts, stickers, backgrounds, QR) ── shared per style
Document (what a person saves) = style + variant + edited values
```

### 3.1 Face geometry
| Measure | Value |
|---|---|
| Cut (card) | 90 × 50 mm = **900 × 500 CSS px** (1 px = 0.1 mm) |
| Bleed | 3 mm per side = **30 px** |
| Face canvas | 96 × 56 mm = **960 × 560 CSS px**; the cut starts at (30, 30) |
| Safe zone | 3 mm inside the cut: rectangle (60, 60, 840 × 440) |
| 300 dpi export | **1134 × 661 px** per face |
| Main QR (Telegram) | ≥ 15 mm printed (today 18 mm with frame) |
| Secondary QR (site) | ~10 mm with frame (code ~8.4 mm, version 2, ECC M). Decodes at 300 dpi. Test on paper; if it fails, enlarge it rather than shrink the white margin |

Faces are designed at 900 × 500 (the cut). Whatever must bleed (backgrounds, stripes, tapes) extends past that box, and the 960 × 560 canvas catches it.

### 3.2 Tokens (`tokens.json`)
Current shape (see `styles/boykisser-uwu/tokens.json` and `styles/_plantilla/tokens.json`):
```jsonc
{
  "estilo": "boykisser-uwu", "nombre": "…", "version": "0.1",
  "formato": { "tarjeta_mm": [90, 50], "tarjeta_px_css": [900, 500], "impresion_dpi": 300, "sangrado_mm": 3 },
  "color": { "<usage_name>": "#RRGGBB", … },
  "degradados": { "<name>": ["#…", …] },
  "tipografia": { "max_fuentes_por_cara": 4, "roles": { "<role>": ["<fonts.json alias>"] } },
  "antirreglas": { … per-style numbers … },
  "efectos_imagen": { "<effect>": { "<param>": … } },
  "intocables": ["…"],
  "contacto": { "telegram": "@KoboTheWolf", "url": "https://t.me/KoboTheWolf", "sitio": "https://kobothewolf.com" }
}
```
**For the app:**
- Publish a JSON Schema (`schemas/tokens.schema.json`), and generate the CSS variables (`--<name>`) and TS types from it.
- Add an `editor` section per style with the allowed lists for the controls (accents, shadows, backgrounds), which are hand-written in the script today.

### 3.3 Marks in a face's HTML (current contract)
| Attribute | Meaning |
|---|---|
| `data-ed="Label"` | Editable text; the form shows a field with that label, in document order |
| `data-bote` (+ `data-cls`) | The text is built letter by letter with the bounce effect; `data-cls` is the class per letter |
| `data-arte="frente" \| "reverso"` | Swappable `<img>`: style stickers, the "[ tu gatito aquí ]" placeholder, own image, or none on backs |
| `data-rot="st" \| "tit"` | Rotation controlled by the sticker or headline anti-rule; the original sign is kept (mirroring) |
| `data-lazo` | Ornament (the "Bow" piece) that shows or hides |
| `data-parte="Name"` | Hideable piece; elements with the same name hide together |
| `.washi`, `.spark` | Tapes (on/off, angle with the original sign) and sparkles (the first N are shown) |
| *(no mark)* | **Not editable.** The QRs, @username, contact URLs (t.me and kobothewolf.com), the cat's code and the credits live here |

An **optional** contact block may carry `data-parte` (it hides as a whole) even though its inside isn't editable. That's how `.sitio` works (the "Sitio (QR + texto)" piece): its invitation texts carry `data-ed`, but the QR and `kobothewolf.com` don't. The main QR and @username never go inside a `data-parte`.

**For the app:** keep this contract and document it as `docs/marcas.md`. It's what lets the demo, the kit and the editor share the same faces. Optionally, validate at build time that each face has an unmarked QR and contact.

### 3.4 Variant manifest (new; it lives in the script today)
```jsonc
// styles/boykisser-uwu/variantes/licencia/variant.json
{
  "id": "licencia", "nombre": "Licencia",
  "caras": { "frente": "lic-f", "reverso": "lic-r" },   // face ids in the HTML
  "fondo": { "frente": "gingham", "reverso": "cuaderno" },
  "archivo": "boykisser-license",                        // export prefix
  "controles": ["textos", "arte", "fondo", "acento", "rotSt", "rotTit", "brillitos", "washi", "lazo"],
  "verificar": ["qr", "contacto", "max_fuentes"]         // build checks
}
```

### 3.5 Saved document (what a person produces)
```jsonc
{
  "app": "kobo-exe-editor", "version": 1,
  "estilo": "boykisser-uwu",
  "frente": "soc-f", "reverso": "cer-r",            // variants can be mixed
  "caras": {
    "soc-f": { "textos": { "0": "programming" }, "ocultosEd": [], "ocultasPiezas": ["Checklist"],
               "arte": "feliz" | "hueco" | "propio", "fondo": "algodon", "rotSt": 4, "brillitos": 5 },
    "cer-r": { … }
  },
  "artePropio": "data:image/png;base64,…",       // optional, already-processed sticker
  "acento": "#FF8FB8", "sombra": "#FF8FB8",
  "rotTit": -2, "escala": 100, "anguloWashi": 14
}
```
Today this is stored in `localStorage` (key `bk-editor-v3`), per browser. The app must also **export/import** this JSON (a `.kobo.json` file), so a card can be versioned in the repo.

---

## 4. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | Choose the style and, separately, the front and back (mixing faces from different variants of the same style); variants are shortcuts. See both faces at scale, side by side (stacked on mobile). |
| FR-2 | A form generated from the `data-ed` marks of both faces, each field with a show/hide checkbox; live changes; a "restore" button. |
| FR-2b | A list of pieces per face (`data-parte`, the cat, the bow, each tape) with checkboxes to hide each one. |
| FR-3 | Art: choose among the style's stickers, the "[ tu gatito aquí ]" placeholder or an own image; on backs, also "none". |
| FR-4 | Own image → sticker in the browser (algorithm §6.3), with a "cut off at the bottom" option. |
| FR-5 | Background per face, from the style's list. |
| FR-6 | Palette: accent and shadow **only** within the style's tokens (no free picker). |
| FR-7 | Anti-rules with the ranges from `STYLE.md`. Per face: cat rotation −8…8°, sparkles 5–N. Common: headlines −4…3°, cat size 85–115 %, washi angle 12–18°. |
| FR-8 | Cut guides (pink, dashed) and safe zone (blue, dotted) visible on screen and **never** in the export. |
| FR-9 | Locked untouchables: no control for the contents of the QRs, @username or contact URLs; the build fails if a variant marks them with `data-ed`. The main QR and @username can't be hidden either. |
| FR-9b | Optional contact blocks (today, the site one) show or hide as a whole. Their invitation texts are editable; their QR follows the same rules as the main one (black on white, straight frame, nothing on top). |
| FR-10 | Export a 300 dpi PNG per face and a 2-page print PDF (§5). |
| FR-11 | Save/open a `.kobo.json` document (§3.5); remember the last state per browser. |
| FR-12 | Adding a variant = writing its faces with marks + its `variant.json`, without touching the editor's code. |
| FR-13 | Variants with their own logic (e.g. the code cat) declare a script that runs when the face mounts and signals when it's done (`ready`). |

---

## 5. Export

### 5.1 In the browser (as today)
- **PNG per face:**
  - html-to-image `toPng(node, { width: 960, height: 560, canvasWidth: 1134, canvasHeight: 661, pixelRatio: 1, filter: no .guide })`.
  - Before drawing, `sombrasADivs()` swaps every solid `box-shadow` for real divs and undoes it afterwards (see §10: WebKit).
  - Then a **pHYs** chunk (11811 px/m = 300 dpi) is inserted after IHDR, with its CRC32.
- **Print PDF:** jsPDF `new jsPDF({ unit: 'mm', format: [96, 56], orientation: 'landscape', compress: true, putOnlyUsedFonts: true })`. One page per face, with the PNG at 96 × 56 mm (300 ppi). No fonts in the PDF (the text is inside the image).
- **File names:** `<archivo>-frente-300dpi.png`, `<archivo>-reverso-300dpi.png`, `<archivo>-imprenta-96x56mm.pdf`.

### 5.2 Vector (new, recommended for the repo)
For printers that ask for vector text: a command (Node + Playwright) opens the face with the `.kobo.json` document, uses `@page { size: 96mm 56mm; margin: 0 }` and `page.pdf({ preferCSSPageSize: true, printBackground: true })`. The PDF then carries **embedded fonts** (subset) and selectable text. Verified in the kit: only the style's fonts appear in `pdffonts`.
- Measured caveat: Chrome rounds the height (the kit came out at 50.1 mm). Acceptable with bleed, but document it.
- Optional: crop marks (3 mm lines outside the bleed) on a separate 102 × 62 mm page.

### 5.3 Automatic checks on each export
| Check | How | Criterion |
|---|---|---|
| Size | read the PNG / `pdfinfo` | 1134 × 661 px; 272.13 × 158.74 pt (96 × 56 mm) |
| DPI | PNG pHYs; `pdfimages -list` | 300 |
| QR | zxing (JS) or OpenCV | the main one decodes exactly `https://t.me/KoboTheWolf` at 300 and 150 dpi; the site one, `https://kobothewolf.com` at 300 dpi (cropped) |
| Nothing over the QRs | layout boxes | no sparkle, tape, sticker or text touches the box of a `.qr` or of the `.sitio` block |
| Engines | Playwright Chromium + WebKit | the export is compared with the screenshot in both (the shadow bug only showed in WebKit) |
| Fonts | `pdffonts` | image PDF: none; vector PDF: only the style's |
| Glyphs | fontTools against each face's text | no character outside its font's `cmap` (use SVG icons for ♡ ✔ ☑ ☐) |
| Fonts per face | count effective `font-family` | ≤ 4 |

---

## 6. Proposed architecture for the repo

### 6.1 Stack
- **TypeScript + Vite**, static app. UI with **Preact** (or React). The faces stay plain HTML/CSS; the framework only builds the panel.
- **Faces as real HTML**, not rewritten in JSX. They load from the variant's HTML (same marks contract), so the demo, kit and editor keep sharing a source.
- **CSS isolation per variant:** each face mounts in a **Shadow DOM** with its stylesheet, which avoids the clashes solved today with `#cer-f` prefixes. html-to-image needs the shadow root's styles to be reachable: either clone the node into the normal DOM for export, or use the vector pipeline (§5.2) for the print version.
- **Browser export:** html-to-image 1.11.11 and jsPDF 2.5.1 from npm (no CDN).
- **Node CLI** (`kobo` or `npm run`) for: asset build, vector PDF, PDF kit, checks (§5.3).
- **Assets with Python (stays):** `lib/efectos.py` remains the tool for processing source images. The browser sticker (§6.3) stays in TS and is tested against the Python output.

### 6.2 Suggested structure
```
kobo-exe-editor/
├── apps/editor/                 Vite + TS (panel, preview, browser export)
├── packages/core/               types, schemas, marks parser, state/document, exporters, sticker()
├── packages/cli/                Node + Playwright: vector pdf, kit, checks
├── styles/
│   ├── boykisser-uwu/
│   │   ├── tokens.json  STYLE.md
│   │   ├── caras.css            the style's shared CSS
│   │   ├── variantes/<id>/      variant.json + caras.html (+ script.js if it has logic)
│   │   └── assets/              stickers, backgrounds, masks (outputs of efectos.py / bgs.py)
│   └── edgy-2000s/ …
├── fonts/                       .woff2 + LICENSE-*.txt + fonts.json
├── schemas/                     tokens.schema.json, variant.schema.json, documento.schema.json
├── python/                      efectos.py, bgs.py, render.py (asset pipeline)
├── tests/                       unit (vitest), e2e + visual (Playwright), export checks
└── docs/                        marcas.md, agregar-variante.md, this spec
```
`kobo-exe/` can become this repo, or stay as the "design source" that the repo imports `styles/`, `fonts/` and `assets/` from.

### 6.3 Sticker algorithm (browser, in the editor today)
1. Scale the image to ≤ 700 px per side over a white background.
2. Ink = luminance < 225. Dilate the ink by 5 px (closing gaps in the stroke). If "cut off at the bottom", the last row counts as ink.
3. Background = flood fill from the open edges over what isn't ink. Figure = the rest; erode by 5 px.
4. White border: dilate the figure by 16 px (alternating 4/8 neighborhood ≈ disk). Shadow: same shape, `#FF8FB8` at 60 %, offset (7, 9), no blur.
5. Composite shadow → white border → image clipped to the figure.
6. **White fill** (`fondoBlanco`):
   - Shape = the opaque part of the sticker, closed with a disk of 3 % of the longer side, with holes filled. Inside it, every non-opaque pixel turns white.
   - It doesn't change the silhouette.
   - Before step 2, a 1 % margin is painted white (for screenshots with a frame).
   - Output: PNG.

Python equivalent: `lib/efectos.py` (`silueta()` + `sticker()`).

### 6.4 Variants with logic: the code cat
- **Face script:**
  - Reads a mask (PNG) and computes the font size so the program fills ~1/3.
  - Lays out the Rust program **once, without splitting tokens**, and fills the rest with `/* … */` comments (OwO faces and phrases), closing the last comment.
  - Draws letter by letter (no JetBrains Mono ligatures) on a `<canvas>` at DPR 4, and leaves the text in `data-codigo`.
- **Proposed contract:** `export async function montar(cara: HTMLElement): Promise<void>`. The editor awaits the promise before exporting.
- **CI check:** extract `data-codigo` and compile it with `rustc --edition 2021` (it must compile without warnings).

### 6.5 State and storage
- In-memory state (a simple store), serialized to `.kobo.json`.
- **Stable identity:**
  - Each face has **a single state object** for the whole session. Controls and render read and write that same object, or go through store actions.
  - Never rebuild a face's object when reading it (`Object.assign(new, old)`). Controls end up bound to a stale copy and their changes are lost. That was the v5 bug (§10).
- Migrating saved state: fill only the missing keys with their defaults, without replacing the object.
- `localStorage` only as a convenience (last open document), with `try/catch`.
- Own images: store the already-processed sticker (data URI) inside the document; suggested limit 2 MB.

---

## 7. Non-functional requirements
- **Fidelity:** the editor's render must be identical to the demo's (visual test with zero tolerance in non-antialiased areas).
- **Performance:** export a face in < 3 s on an average laptop. Today html-to-image takes several seconds with large images; embed the fonts once and reuse them.
- **Size:** initial app < 3 MB. Today it's 4 MB because of images repeated as data URIs; in the repo, serve assets as files.
- **Accessibility:** controls with `label`, visible focus, AA contrast in the panel, `prefers-reduced-motion`.
- **Responsive:** usable at 400 px wide (stacked panel, scaled preview).
- **Offline:** everything local (fonts, libraries, assets); PWA optional.
- **Licenses:**
  - OFL fonts with their license next to the file.
  - Third-party art only with permission or as a credited meme template (see the credits register).
  - Nothing AI-generated.

---

## 8. Tests and CI
| Level | Tool | What |
|---|---|---|
| Unit | vitest | marks parser, state/document, pHYs/CRC, sticker() against fixtures |
| E2E | Playwright | each variant: edit, change background/art/anti-rules, export; no console errors; 400 px with no horizontal scroll |
| Controls | Playwright (real clicks) | **every** text and piece checkbox on every face: click → the element is `display: none` in the layout (checking ancestors) → click → it's back. Every select and range through the UI; persistence after reload. Tests must go through the UI, not write state directly: that's how the v5 bug slipped through. Model: `pruebas/test_controles.py` |
| Visual | Playwright screenshots | default faces of each variant vs. approved snapshots |
| Export | script (§5.3) | size, dpi, QR, fonts, glyphs, ≤ 4 fonts per face |
| Code cat | rustc | the drawing's text compiles |
| CI | GitHub Actions | all of the above on every PR; artifacts: PNG/PDF of each variant |

---

## 9. Migration plan from the artifacts
1. **Repo and base:** Vite + TS; move `styles/`, `fonts/`, assets; tokens/variant/document schemas.
2. **Core:** marks parser, store, exporters (PNG + pHYs, jsPDF PDF) ported from the current editor; unit tests.
3. **Boykisser:** the 4 variants as `variant.json` + `caras.html`; the cat as a script with `montar()`. Visual parity with the artifact.
4. **Vector export + checks** (CLI with Playwright).
5. **edgy-2000s:** mark its faces (the `tarjeta-demo-web` demo and kit), its own controls (e.g. crunch intensity, fire/moon), and its Calaca variant (today only in Canva: rebuild in code).
6. **Publishing:** static site (GitHub Pages or other). Keep the artifact as a "quick view" if wanted, generated from the same build.

Meanwhile, **the artifact is the official tool**. Any new variant is made with the §3.3 marks, so it enters the repo without being redone.

---

## 10. Known pitfalls (lessons from testing)
| Problem | Cause | Fix |
|---|---|---|
| "Failed to fetch" when exporting PNG in the artifact | The viewer's CSP blocks `fetch()` of `data:` | Decode base64 with `atob` |
| ♡ ✔ ☑ ☐ − symbols in another font | They don't exist in the style's fonts; the browser falls back to DejaVu/Liberation/Inter | SVG icons; check glyphs with fontTools |
| `->` drawn as an arrow | JetBrains Mono ligatures | Draw letter by letter or `font-variant-ligatures: none` |
| PDF at 90.3 mm | `page.pdf(width='90mm')` rounds | `@page` + `preferCSSPageSize` |
| "Tainted" canvas in local tests | `file://` image in `<canvas>` | Inline the mask as a data URI |
| Letter bounce changes when grouping | `:nth-child` counts inside the new container | Accepted; if it matters, assign explicit odd/even classes |
| CSS clashes between variants | Same global classes (`.qr`, `.cred`, `.marco`) | Shadow DOM or per-face prefixes |
| Canva changes fonts, shadows and patterns | Its PDF importer | Canva isn't used (decision 6) |
| Per-face checkboxes and controls did nothing (v5) | `ec()` created a new face object on every call; controls wrote to a stale copy (texts worked because they shared the sub-object) | One object per face; tests with real clicks (§8) |
| Stickers with a transparent body or screen | Sketches with open lines: the flood fill gets into the body | `fondo_blanco()`: white layer in the sticker's shape, openings closed at 3 %, holes filled (§6.3 step 6) |
| Frames (`box-shadow`) offset and missing top/left edges in the PNG/PDF, Safari only | WebKit paints `box-shadow` wrong inside html-to-image's `foreignObject`; Chromium doesn't, so the tests missed it | On export, turn each solid shadow into real divs (`sombrasADivs()`) and undo it afterwards; test export in WebKit too once the repo has CI with all 3 engines |
| Own image comes out as a rectangle | Screenshots with a dark frame: the background can't be flooded | Paint a 1 % margin white before processing |
| Design canvas: PNG ~192 dpi, untouchables editable | Limits of the Design type | Exploration only |
| Stickers from open-line sketches come out with holes | The flood fill gets into the body | "Cut off at the bottom" option, more closing, or manual cropping |

---

## 11. Open questions
- Preact, React, or no framework for the panel? (The core doesn't depend on this.)
- Does `kobo-exe/` become the repo, or does the repo import from it?
- Free position editing (drag) in v2, saved as per-element offsets with safe-zone limits?
- Documents shareable by URL (state in the hash) besides `.kobo.json`?
- Crop marks and a color test page for the printer?

---

## Appendix A · Relevant current files
*(Omitted in the external version: file listing of the private design repository.)*

## Appendix B · Versions pinned today
| Piece | Version |
|---|---|
| html-to-image | 1.11.11 |
| jsPDF | 2.5.1 |
| Fonts (fontsource) | 5.3.0 · Cherry Bomb One 400, Gochi Hand 400, Pacifico 400, JetBrains Mono 500, Silkscreen 400 |
| Playwright (Python) | 1.64.1 |
| rustc (check) | 1.97.0 |
| Artifact runtime | contract 0.2.90, `downloads` capability |
