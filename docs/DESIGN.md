# Design: kobothewolf.com (profile + KOBO.EXE card editor)

**Status:** Approved 2026-10-28 (rev. 32: §3.4, §3.5, §5.6, §9 QR layouts, #74; rev. 31: §6 language carried between pages, #79; rev. 30: §3.2, §3.3, §3.5, §5.1, §5.6, §7, §10 text size per section, #73; rev. 29: §6 "How it works" page, #66; rev. 28: §5.4, §10 larger code-cat text, #75; rev. 27: §6 "OwO wats dis?!" explainer, #65; rev. 26: §6, §7 Open Graph image, build line, README images, #22; rev. 25: §12 release PR text and branch name, #68; rev. 24: §12 releases with release-please, #48; rev. 23: §9, §10 vector PDF, #20; rev. 22: §9, §10, §11 check-exports and the export CI jobs, #19; rev. 21: §5.5 print PDF, #18; rev. 20: §5.5 PNG export, #17; rev. 19: §5.2, §5.3, §5.6 art, color and range controls, #16; rev. 18: §5.6 text and piece controls, #15; rev. 17: §2, §3.3, §5.2, §5.6, §7, §10 editor shell and preview, #14; rev. 16: §2, §3.4, §5.4, §7, §10 code-cat mount step, #13; rev. 15: §2, §3.4, §4, §7, §10 variants as data, #12; rev. 14: §5.1 CSS scoping, §10, §11, #11; rev. 13: §2, §7 assets and credits, #10; rev. 12: §5.5 pHYs, #9; rev. 11: §5.3 sticker tolerance and Worker, #8; rev. 10: §5.2, #7; rev. 9: §3.2, §7, #6; rev. 8: §3.3, §7, §11, #5; rev. 7: §6.1, #30; rev. 6: §6, #4; rev. 5: §10, #26; rev. 4: §12, #24)
**Implements:** [REQUIREMENTS.md](REQUIREMENTS.md). Section headers list the requirement IDs they cover.
**Base:** EV (the editor app spec, see `docs/origin/`) is adopted unless a section says otherwise, and every deviation gives a reason.

---

## 1. Architecture overview
```
                     GitHub repo  kobothewolf.com (public)
  ┌───────────────────────────────────────────────────────────────┐
  │ index.html ── static profile (EN) + #editor mount + CSP       │
  │ src/app     Preact: LangSwitch, Profile, Editor (lazy)        │
  │ src/i18n    catalogs en/es + t() + language store             │
  │ src/core    framework-free logic ◄──────── cli/ (Node)        │
  │ styles/<estilo>/  tokens, faces, CSS, labels, assets          │
  │ schemas/ tests/ docs/ .github/                                │
  └───────────────┬───────────────────────────────────────────────┘
                  │ PR → CI → merge commit → deploy.yml
                  ▼
        GitHub Pages ── https://kobothewolf.com/   (+ 404.html)
```
- **One npm package and one Vite page**, plus `404.html`. The editor and CLI share `src/core` through plain imports. Workspaces would add tooling without adding isolation at this size. `[NFR-10]`
- **Preact** for the profile and editor panel. Card faces stay plain HTML and CSS (EV §6.1). Preact is about 4 KB and has no dependencies.
- **Load order** `[NFR-2, FR-P6]`:
  1. `index.html` ships the profile and contact as static HTML in English, so they work without JavaScript.
  2. A small entry script hydrates the profile and the language switch.
  3. The editor bundle (html-to-image, jsPDF, faces) loads with a dynamic `import()` once the profile has rendered.

## 2. Repository layout
```
/
├── index.html  404.html  public/ (favicon, og-image, robots.txt)
├── src/
│   ├── main.tsx                 hydrate profile, lazy-load editor
│   ├── editor/                  the lazy editor chunk: Editor, Tabs, Panel, Stage (ExportBar with #17)
│   ├── i18n/
│   │   ├── en.json  es.json     UI and profile strings
│   │   └── i18n.ts              t(), plurals, lang detection and persistence
│   ├── styles.ts                finds every style's variants, CSS and assets (Vite globs)
│   ├── theme/ui.css  fonts.css  boykisser-uwu UI tokens (--ui-*); @font-face for UI and faces
│   └── core/
│       ├── marks.ts  store.ts  document.ts  sticker.ts  faces.ts  variants.ts
│       └── export/{png,pdf,shadows,save}.ts
├── styles/boykisser-uwu/
│   ├── tokens.json  STYLE.md  caras.css  editor.json
│   ├── i18n/{en,es}.json        labels: fields, pieces, variants, backgrounds, colors, art
│   ├── variantes/{certificado,licencia,codigo,socks}/
│   │     variant.json  caras.html  caras.css  [montar.ts]  (codigo also has gato.ts)
│   └── assets/                  stickers, QR, masks (PNG files, metadata stripped)
├── schemas/  cli/  tests/       (fonts: src/theme/fonts/, each with its OFL license)
├── docs/   REQUIREMENTS.md  DESIGN.md  decisions/  origin/  marcas.md  agregar-variante.md
├── .github/ workflows/{ci,deploy}.yml  ISSUE_TEMPLATE/  pull_request_template.md
├── README.md  CONTRIBUTING.md  CHANGELOG.md  CREDITS.md  LICENSE (MIT)
├── CLAUDE.md  policies/         published workflow (FR-R9)
└── .gitignore                   .specs/  CLAUDE.local.md
```

## 3. Domain model `[FR-E1–E12, FR-E17–E19]`
EV §3 is adopted as written: style ──< variant ──< face, with tokens, shared assets and a document per user.

### 3.1 Face geometry (EV §3.1)
| | Value |
|---|---|
| Cut | 90 × 50 mm = 900 × 500 CSS px (1 px = 0.1 mm) |
| Bleed | 3 mm = 30 px per side |
| Face canvas | 96 × 56 mm = 960 × 560 px; cut starts at (30, 30) |
| Safe zone | (60, 60, 840 × 440) |
| 300 dpi export | 1134 × 661 px |
| Main QR | ≥ 15 mm printed (today 18 mm framed) |
| Site QR | ~10 mm framed, version 2, ECC M |

### 3.2 Marks contract (EV §3.3, kept verbatim)
`data-ed`, `data-bote` + `data-cls`, `data-arte`, `data-rot="st|tit"`, `data-lazo`, `data-parte`, `.washi` and `.spark` keep their P8 meanings. Unmarked elements can't be edited. This is documented in [`docs/marcas.md`](marcas.md).

`readMarks(face)` (`src/core/marks.ts`) is the one implementation. It takes a minimal element interface (`tagName`, `getAttribute`, `children`, `textContent`) that DOM elements satisfy, so the browser passes real faces and unit tests pass parse5 trees. Built-in pieces have stable keys (`arte`, `lazo`, `washi-<n>`) and UI-catalog labels; `data-parte` keys get style-catalog labels.

**Sections (FR-E22, #73):** `data-seccion="<key>"` groups a face's texts for resizing. Several elements can share a key, as pieces do (the certificate's header is two lines; a back's site block contributes its question and invitation, not its QR or URL). Keys are lowercase slugs, labeled in the style catalogs as `seccion.<key>`. A section never contains a locked element (`.qr`, `.arroba`, `.url`, `<canvas>`) or contact text, and sections don't nest. `readMarks` lists each face's section keys in document order; `bindMarks` returns their elements.

| Face | Sections |
|---|---|
| `cer-f` | `encabezado`, `nombre`, `titular`, `frase`, `campos`, `firma` |
| `cer-r` | `titulo`, `terminos`, `globo`, `sitio` |
| `lic-f` | `titular`, `campos`, `vigencia` |
| `lic-r` | `titulo`, `terminos`, `firma`, `sitio` |
| `cod-f` | `terminal`, `nombre`, `rol`, `ok` |
| `cod-r` | `ventana`, `sitio` |
| `soc-f` | `titular`, `checklist`, `globo` |
| `soc-r` | `frase`, `commit`, `rol`, `saludo`, `sitio` |

**i18n note:** the values of `data-ed` and `data-parte` (e.g. `"Emisor"`, `"Sitio (QR + texto)"`) are **stable keys**, not display text. Their labels come from the style catalogs (§4). This keeps the contract compatible with the design source, which uses Spanish labels as values: in `es.json` those keys map to themselves.

### 3.3 Style editor lists (`editor.json`)
These are the lists P8 hard-coded. They hold keys only; display names come from the style catalogs.
```jsonc
{ "acentos": ["#FF8FB8", "#8EC5FF", "#CDB4DB", "#E5484D"],
  "sombras": ["#FF8FB8", "#FFC8DD", "#BDE0FE", "#CDB4DB"],
  "fondos":  ["gingham", "cuaderno", "femboy", "crema", "algodon"],
  "arte":    ["licencia", "feliz", "clik", "yap"],
  "escala":  [85, 115],
  "inicial": { "rotTit": -2, "anguloWashi": 14, "brillitos": 7, "escala": 100 } }
```
The other ranges are derived from `tokens.json` → `antirreglas`, so there is only one source of truth (FR-E9): `rotSt` ← `rotacion_stickers_grados`, `rotTit` ← `rotacion_titulares_grados`, `washi` ← `washi.grados`, `brillitos` ← `brillitos.por_cara` (the editor also caps it at the face's sparkle count), `tamano` ← `tamano_texto_pct` (text size per section, in percent, 85–115 for boykisser-uwu). The sticker scale has no anti-rule, so it lives in `editor.json`. `inicial` holds the starting values of the shared ranges, P8's defaults, so the default faces match P8 (NFR-1); `validate` checks each is inside its range. A face's sticker rotation starts at its authored angle, and sparkles are also capped at the face's count. Every accent and shadow must be one of the style's `color` tokens. `"sueter"` is removed, and the Programming socks front defaults to `"feliz"` (D-3).

### 3.4 Variant manifest and faces
As in EV §3.4, with `"montar": "montar.ts"` (FR-E19). That is the only value it takes, so the build finds every mount script with one glob. Names are catalog keys (`variant.licencia.name`). Two more fields:
- `orden` (integer, optional): position in the variant tabs. Variants sort by `orden`, then by `id`, so adding one never means editing a list elsewhere (FR-E18).
- There is no `nombre`: the label is `variant.<id>.name` in the style catalogs.

**Faces (`caras.html`):**
- Each face root carries `data-cara` and is the 960 × 560 canvas with bleed. Inside it, `.card` is the 900 × 500 cut at (30, 30) (§3.1).
- The editor puts the background class `fondo-<key>` on the root, from `variant.json` → `fondo` and later the user's choice. It may set `--acento` and `--sombra` inline on the root; the style's `caras.css` gives their defaults.
- Images point at style assets as `assets/<file>` (`src`, and `data-mask` for the code cat). `src/styles.ts` resolves them to built URLs through a Vite `?url` glob before a face is inserted; an unknown path is an error.
- Art key `k` is the file `assets/st-<k>.png`. A face's default art is the key its `data-arte` image shows; `"feliz"` replaces P8's `"sueter"` (decision 0003).
- Variant CSS needs no id prefixes (`#lic-f .foto` in P8 is `.foto` here): the build scopes it to the variant's two faces (§5.1).

**Loading:** `src/core/variants.ts` `collectVariants(files)` turns the globbed files (manifests, faces HTML, mount scripts) into the list of styles and their variants, sorted as above, and rejects a variant with a missing file, including a `montar` script its manifest names. Mount scripts are lazy imports, so a variant's code loads only when one of its faces is shown. It is pure, so a unit test feeds it a fixture variant and shows the editor needs no change to pick one up (FR-E18).

**QR layouts (FR-E23, #74).** A variant lists the layouts its back supports in `variant.json` → `qr`, in order, the first being the default: `actual` (today's: an 18 mm Telegram QR, with the site block below it and a 9.6 mm site QR) and `iguales` (both QRs 15 mm, stacked, each with its text). All four boykisser-uwu backs offer both.
- **Side by side (`lado`) isn't offered yet:** two 15 mm QRs side by side need about 316 card pixels, but each back's contact column has about 270 between its left content (which reaches x ≈ 572–599) and the safe zone (x ≈ 870). Making room means redesigning the backs' left content, a follow-up. The painter puts `qr-<layout>` on the face root for any layout but the default, and the style's CSS places the contact column for it.
- **Where positions live:** the contact column's positions (main QR, `@KoboTheWolf`, the line under it, the site block) are in CSS, not inline styles, so a layout's rules override them without `!important`. Moving them out of `caras.html` leaves the default backs pixel-identical, which the visual baselines check.
- **Sizes:** QR sizes are the framed box (white padding and frame included). 15 mm is 150 face pixels, the EV minimum for the Telegram QR (EV §3.1); no layout goes below it, and check-exports enforces it (§9). Labels for layouts are app catalog keys (`editor.qr.<layout>`), since every style shares them.

### 3.5 Document (`.kobo.json`), version 1
EV §3.5 with these changes:
- `app` and `version` are required.
- `artePropio` is persisted (FR-E16).
- Backs may use `"arte": "ninguno"` (FR-E5).
- Unknown face IDs are dropped.
- Migration fills only the missing keys and never replaces a face object (EV §6.5).

- A back may carry `qr`: its layout key (FR-E23). The store keeps it only if the back's variant lists it; otherwise the back shows its default layout.
- Each face may carry `tamanos`: section key → size in percent (FR-E22). The store keeps only the face's own sections and clamps each value into the style's range, like the other ranges; a missing section is 100 %.

Documents store keys, never labels, so they're language-independent.

## 4. Internationalization `[FR-I1–I6, NFR-12]`
- **Catalogs:**
  - `src/i18n/{en,es}.json` hold UI and profile strings.
  - `styles/<estilo>/i18n/{en,es}.json` hold style labels: `ed.<key>`, `parte.<key>`, `variant.<id>.name`, `face.<id>.name`, `fondo.<key>`, `color.<hex>`, `arte.<key>`. `<hex>` is the color in lowercase without `#` (`color.ff8fb8`).
  - Keys are flat and dot-separated. Interpolation uses `{name}`; plurals use `Intl.PluralRules`.
- **`t(key, params)`** returns the active language's string. If the key is missing it falls back to English, then to the key itself. A missing key logs a warning in development; in CI it is a build error.
- **Language store:**
  - Resolution order is `?lang=` → `localStorage['kobo-lang']` → `navigator.languages` (`es*` → `es`) → `en`.
  - Switching updates `<html lang>`, `document.title` and the meta description, then re-renders. Editor state is untouched (FR-I2).
- **Static HTML** ships English. When the resolved language is Spanish, the profile is swapped at hydration. Below the fold there is no visible flash, because the editor isn't rendered yet.
- **Formatting:** dimensions and numbers go through `Intl.NumberFormat` (`96 × 56 mm` / `96 × 56 mm`).
- **Export file names** come from catalog keys: `export.front` → `front` / `frente`, `export.print` → `print` / `imprenta`.
- **Card face text** stays as authored (FR-I6). Labels around it are translated.
- **Check:** `npm run validate` (§7) fails if any catalog is missing a key another has, or if a `data-ed`, `data-parte` or `editor.json` entry has no label in every language (FR-I5).
- **Adding a language** means adding `xx.json` files and one entry in `src/i18n/languages.ts` (a data list, not logic).

## 5. Editor runtime

### 5.1 Mounting faces and CSS isolation `[FR-E2, FR-E18, NFR-1]`
This deviates from EV §6.1, which proposed **Shadow DOM**. html-to-image doesn't carry shadow-root styles, so every export would need a clone-out step, with extra code and fidelity risk.

**Instead:**
- Face CSS is scoped at build time by the `kobo:scope-css` Vite plugin (`scripts/scope-css.ts`). It wraps each file in native nesting and Lightning CSS (bundled with Vite) flattens it:
  - `styles/<estilo>/caras.css`, the style's shared face CSS, goes under `[data-cara]`: every face, never the page.
  - `styles/<estilo>/variantes/<v>/caras.css` goes under `:is([data-cara="<frente>"], [data-cara="<reverso>"])`, with the ids read from that variant's `variant.json`.
- Face CSS writes `&` for the face root. Build errors: any at-rule except `@media`, `@supports`, `@container` and `@starting-style` (so no `@font-face`, `@keyframes`, `@import`, `@layer`, `@property`, `@page` or `@scope`), and `:root`, `:host`, `:scope`, `html` or `body` in a selector. Fonts are declared outside face CSS.
- After flattening, the plugin re-parses its output and fails the build if any style rule doesn't start with its scope.
- Faces mount in the normal DOM, and export works as it did in P8.
- `caras.html` is imported as a string (`?raw`) and parsed with a `<template>` by `src/core/faces.ts` `parseFaces()`. These are trusted, build-time files; user input never travels this path. Template content is inert: no scripts run and nothing loads until a face is inserted.

Recorded in [`0006-css-scoping-not-shadow-dom.md`](decisions/0006-css-scoping-not-shadow-dom.md).

- **Text sizes (FR-E22):** every font size in face CSS and in `caras.html` inline styles becomes `calc(<size> * var(--tam, 1))`. `escalarFuentes()` (`src/core/fuentes.ts`, no DOM) does the rewrite. The face-CSS plugin runs it on stylesheets at build time, and `parseFaces` runs it on inline styles. The painter sets `--tam` on each section's elements, and their texts inherit it. Locked elements are never in a section, so they keep `--tam: 1`. At 100 % the computed sizes are unchanged, so default faces render exactly as before.

### 5.2 State `[FR-E3–E13, FR-E16]`
- A single store holds the document. Each face has **one state object for the whole session**. Controls and rendering read and write that same object through store actions, and nothing rebuilds a face object on read (the P8 v5 bug, EV §10).
- `paint()` applies state to the DOM as P8's `pintar()` did.
- Text goes in only through `textContent` or per-letter `<span>`s, never `innerHTML` (NFR-4).
- Persistence: saved under `localStorage['kobo-editor-v1']`, debounced, with every read and write in `try/catch`. The user's sticker is capped at 2 MB; above that, text state is still saved and a notice explains it.
- **Implementation** (`src/core/store.ts`, `src/core/paint.ts`):
  - `createStore()` takes the faces' marks, the style lists and ranges, the storage (or `null`), and a `reencode(dataUri)` function. The browser's canvas re-encoder is plugged in with the upload control (#16).
  - **Every value from outside is checked against the style**, whether it comes from an action, saved state or an imported file. Unknown faces, fields and pieces are dropped. Colors must be in the style lists, numbers are clamped to the ranges, sparkles to the face's count, and `arte: "propio"` needs a sticker. Anything invalid falls back to the default. Migration fills each face object in place.
  - Saved state is parsed like an imported file. If it's invalid, the editor starts fresh.
  - Notices: `storage-unavailable`, `storage-full`, `sticker-not-saved`, `saved-state-invalid`.
  - `paintFace()` hides with the `data-oculto` / `data-oculto-pieza` attributes, styled `display:none !important` as in P8, which also works on SVG bows. Bounce text gets letter `<span>`s built by the caller.
  - `paintLook()` applies the rest of a face's state, as P8's `pintar()` did: the `fondo-<key>` class, `--acento` and `--sombra` on the root, the art image, the sticker's rotation and scale, the headline rotation, each washi's angle (keeping its authored sign) and how many sparkles show. It comes with the preview (#14), so default faces render as in P8 before their controls exist (#16). The art key maps to an image: a style sticker's built URL, the placeholder, or the user's sticker; `"ninguno"` (backs only) hides the art with a `data-sin-arte` attribute, styled `display:none !important` in the shared face CSS.

### 5.3 Sticker from the user's image `[FR-E6]`
- The EV §6.3 algorithm is ported from P8 into typed, pure functions over RGBA buffers and `Uint8Array` masks (`src/core/sticker.ts`): `figureMask`, `dilate`, `fillHoles`, `whiteFill`, `makeSticker`. There's no DOM and no network.
- **Parameters** come from `tokens.json` → `efectos_imagen`: threshold and closing from `silueta`; border, shadow color, alpha and offset from `sticker`. The shadow alpha is the token's 150/255, where P8 hard-coded 0.6.
- **Typed errors:** `invalid-pixels`, `too-large` (over 700 px a side; the caller scales first) and `no-figure`. Decoding a file, and rejecting one that isn't an image, happen in the browser adapter (#16).
- **Parity:** synthetic fixtures processed by the private Python tooling are committed in `tests/fixtures/sticker/`. The port keeps P8's square dilation and round border where Python uses a cross and a blurred square. The tolerance is therefore stated as edge distance:
  - figure masks agree within 2 px both ways (IoU ≥ 0.97);
  - the sticker never extends past Python's by more than 1 px;
  - Python's squarer corners are within 4 px.
- **Worker:** OffscreenCanvas 2D is available in every NFR-8 target, including Safari from 16.4, so the browser adapter (#16) runs decode, scale and `makeSticker` in a Worker. The core functions are already Worker-safe.
- **Browser adapter (`src/editor/sticker.worker.ts`, `src/editor/stickers.ts`):** the Worker decodes the file with `createImageBitmap` (a file that doesn't decode is `not-image`), scales it to ≤ 700 px a side, runs `makeSticker` with the style's `efectos_imagen`, and returns a PNG data URI. The same Worker re-encodes any untrusted PNG data URI for the store (`reencode`, NFR-4): decoded and drawn again, so only pixels survive. Nothing is sent anywhere; the file never leaves the browser.
- After an upload the sticker is stored as `artePropio`, and each shown face that has art switches to `"propio"`, as in P8. Toggling "cut off at the bottom" reprocesses the last file. Progress and errors (`not-image`, `no-figure`) go to the status region.

### 5.4 Code-cat face `[FR-E19, FR-E20]`
P8's `gato()` moves to `variantes/codigo/montar.ts`, exporting `async function montar(cara: HTMLElement): Promise<void>`.
- **Contract (FR-E19):** the editor calls a variant's `montar` once for each of its faces after inserting it, and again whenever the face is rebuilt. The promise resolves when the face is fully drawn, and export waits for it. A face with nothing to draw (here `cod-r`, which has no `<canvas data-mask>`) resolves at once. Calling it again redraws from scratch.
- **Layout (FR-E20):** the pure part lives next to it in `gato.ts`, with no DOM, so vitest covers it:
  - `unidades()` cuts the program into tokens that never break across lines. Strings are one token; comments break only at spaces.
  - `tramos()` finds each row's runs of whole character cells inside the mask.
  - `acomodar()` places the program greedily, then filler: a closed `/* Do you liek mwy cwode?UwU?!?1 */` and one `/* … */` of OwO faces and phrases, whose last word becomes its `*/`. It throws if the program doesn't fit.
  - `texto()` gives the plain text, one line per run, and `dibujar()` draws it one character at a time, so JetBrains Mono ligatures (`->`) never form.
- **Font size (#75):** `ajustar()` uses the largest size in the style's range (`tokens.json` → `efectos_imagen.codigo_con_forma.px`, 8–10 px) at which the whole program and its closing filler still fit. It tries quarter-pixel steps from the top down and runs the real layout at each. P8 instead sized the program to fill about a third of the silhouette, which gave 8.2 face pixels (0.82 mm, about 2.3 pt printed); print tests found that hard to read. If no size in the range fits, `montar` fails rather than drawing outside the style's range.
- The canvas is drawn at 4× for export.
- The program text is written to `cara.dataset.codigo`.
- The mask is a same-origin PNG, so the canvas isn't tainted.
- **Compiles (FR-E20):** the faces E2E test saves `cara.dataset.codigo` from each browser, since font metrics can change the layout. The CI `rustc` job compiles each with Rust 1.99.1 (pinned), `--edition 2021 -D warnings`, and runs it.

### 5.5 Export pipeline `[FR-E14, FR-E15, NFR-2]`
```
await faces ready ─► sombrasADivs(face) ─► htmlToImage.toPng(face, {960×560 → 1134×661, fontEmbedCSS})
                 ─► undo shadows ─► insert pHYs (11811 px/m) ─► Blob ─► Saver.save()
PDF: front PNG, back PNG ─► jsPDF {unit:'mm', format:[96,56], landscape, compress} ─► one page each,
     image at 0,0, 96 × 56 mm ─► Blob ─► Saver.save()
```
- **Where the code lives:** `src/core/export/shadows.ts` (`sombrasADivs`), `png.ts` (render + pHYs) and `save.ts` (the Saver) form a separate chunk with html-to-image. `pdf.ts` and jsPDF are a second chunk that shares the PNG code. The editor imports both with `import()` as soon as it mounts, so the page and the editor never wait for them.
- **Export bar:** above the variant tabs, with "PNG front · 300 dpi", "PNG back · 300 dpi" and "Print PDF (2 pages)". A face is rendered from its own element; the guides are outside it (§5.6), so nothing needs filtering out. The status region says which file is being made, then that it was saved, or what went wrong.
- **File names** come from the face's variant (`variant.json` → `archivo`) through localized templates, e.g. `boykisser-license-front-300dpi.png` / `boykisser-license-frente-300dpi.png`. The PDF is `<file>-print-96x56mm.pdf` / `<archivo>-imprenta-96x56mm.pdf`, where the name is the variant's when both faces share one and `<front>+<back>` otherwise, as in P8.
- **pHYs:** `src/core/phys.ts` `setDpi(png, 300)` works on the PNG bytes alone (no DOM), so it's unit-tested in Node. It removes every existing `pHYs` chunk and writes one right after `IHDR` (before any `IDAT`, as the PNG spec requires) with its CRC-32. 300 dpi is stored as 11811 px/m, the nearest integer, which readers report as 300 dpi. Bytes that aren't a well-formed PNG (bad signature, `IHDR` not first, truncated chunk, bad CRC) are rejected with a typed error, not passed through.
- **Print PDF (EV §5.1):** as in P8, `new jsPDF({unit: 'mm', format: [96, 56], orientation: 'landscape', compress: true, putOnlyUsedFonts: true})`, then each face's 300 dpi PNG with `addImage(png, 'PNG', 0, 0, 96, 56, alias, 'FAST')`, the front on page 1 and the back on page 2. Each page is 272.13 × 158.74 pt, and 1134 px over 96 mm is 300 ppi. The text is inside the images, so the PDF has no fonts; the vector PDF is the CLI's job (§9). Its title is the two faces' localized names plus "KOBO.EXE boykisser-uwu", and its creator is "kobothewolf.com". `buildPdf(pngs, meta)` takes PNG bytes and no DOM, so it's unit-tested in Node.
- **jsPDF's optional modules:** jsPDF loads html2canvas, DOMPurify and canvg with `import()` only for its `html()` and SVG features, which aren't used. The Vite config points those three imports at a stub that throws, so none of them ships in `dist/`. npm still installs them as jsPDF's optional dependencies, and `npm audit` covers them.
- `sombrasADivs()` is kept as is. It's the WebKit `box-shadow` fix (EV §10).
- `fontEmbedCSS` is computed once per face and reused (NFR-2). `src/core/export/fonts.ts` builds it from the page's own `@font-face` rules for the families the face uses, with each file inlined, resolving URLs against their stylesheet with `new URL()`. html-to-image's `getFontEmbedCSS()` isn't used: it sets a `<base>` element, which the CSP's `base-uri 'none'` blocks and reports.
- **WebKit fixes found in #17:**
  - Each export renders twice. WebKit draws an image inside the SVG only once it has loaded there, so a first render can miss the sticker, the code cat and background layers.
  - html-to-image copies computed styles one property at a time in Firefox and WebKit. The list leaves out two properties that are always their defaults here. With `corner-*-shape`, WebKit drops `border-radius` from the clone, and every rounded corner exports square. With every background longhand present, WebKit on Linux serializes them as one `background` shorthand that loses later layers' size and position (the gingham became stripes); leaving out `background-attachment` prevents that.
  - The first render of a session is by far the slowest in WebKit (3.3 s against 0.1–0.7 s later, measured in the CI image), which is why each shown face gets a warm-up render before the buttons enable.
  - The E2E test checks the exported pixels for all three (the code cat's area, the gingham's three shades, a rounded corner).
- **Saver interface** `{ save({filename, data: Blob}) → {status} }`. The browser implementation creates an object URL, clicks an `<a download>`, then revokes it after 10 s (GP §1). Other host runtimes can plug in through the same interface.
- Buttons stay disabled until the export chunk has loaded (the PDF button also waits for the PDF chunk), both shown faces are ready (`ready()`, including `montar`), and each has had one warm-up render (`prepareFace`), so its fonts and images are loaded before the first click. Renders run one at a time, because the shadow fix changes the face while a render runs. If the chunk fails to load (for example, blocked), they stay disabled and the status region shows `export.unavailable` (GP §2).
- **Time:** the E2E test measures one face's export and reports it; NFR-2 asks for under 3 s on a mid-range laptop. The PDF renders both faces, so its budget is 6 s, and its time is reported too.
- **Library versions change.** `npm audit` on 2026-10-25 reported the inputs' pinned **jsPDF 2.5.1: 1 critical, 1 high** (via dompurify). The plan moves to **jsPDF 4.2.1** and **html-to-image 1.11.13**, which audit clean together with Preact 11.0.2. M5 re-verifies output against the export checks (page size 272.13 × 158.74 pt, 300 ppi, QR decode). Recorded in [`0007-export-library-versions.md`](decisions/0007-export-library-versions.md).

### 5.6 Editor UI `[FR-E1–E4, FR-E10, FR-E21, NFR-2, NFR-6, NFR-7]`
- **Loading (NFR-2):** `src/main.tsx` imports `src/editor/` with `import()` after the page's `load` event, when the browser is idle. The editor chunk carries the face CSS, so the profile's first render never waits on it. Until it loads, `#editor` shows a short loading line, and a `<noscript>` line says the editor needs JavaScript.
- **Layout as in P8:** a row of variant tabs, then the panel and the stage. At 900 px and wider the stage is sticky; on narrow screens the two stack. Each face sits in a viewer whose scale (`--k` = viewer width ÷ 960) comes from a `ResizeObserver`.
- **Faces (FR-E1, FR-E2):** every face of the style is parsed once per session and kept, with its bound marks. The two viewers show the selected front and back, and switching moves the face elements, so a face keeps its state and its drawn canvas. A face's `montar` runs the first time it's shown; `ready()` resolves when both shown faces have their images, fonts and `montar` done (export waits on it, #17).
- **Choosing faces:** front and back `<select>`s list every face of the style, labeled from the style catalog. The variant tabs follow the ARIA tabs pattern: one tab stop with arrow keys, Home and End, and a tab shows as selected only when both faces are its variant. A style `<select>` appears only when more than one style exists.
- **Guides (FR-E10):** the cut (pink, dashed) and safe-zone (blue, dotted) guides are an overlay in the viewer, outside the face element, so an export of the face can't include them. A checkbox toggles them; they start on and aren't saved.
- **Status (FR-E21):** the editor has one polite `role="status"` region. Store notices and later progress messages go there.
- **Texts and pieces (FR-E3, FR-E4, FR-E11–E13):** the panel has a collapsible group for the front and one for the back, each built from the face's marks.
  - Texts: one row per field in document order, labeled `ed.<key>`, with a show checkbox and a text box capped at 90 characters. Changes apply as you type, through `textContent` only.
  - Pieces: one show checkbox per piece. `data-parte` groups are labeled `parte.<key>` from the style catalog; the sticker, the bow and each washi tape use app labels. An optional contact block is one piece, so it shows or hides as a whole, while its own texts stay in the text list. Locked elements have no control, since the marks never list them.
  - "Restore" resets texts and pieces on the two faces shown and says so in the status region.
- **Art, background and ranges (FR-E5–E9):** a face shows only the controls its variant lists in `variant.json` → `controles` and that apply to it.
  - Per face, in its group: the art `<select>` (style stickers labeled `arte.<key>`, the localized placeholder, "your image" once one exists, and "none" on backs), sticker rotation, background (`fondo.<key>`) and sparkles (from the range minimum, or the face's count if lower, to the face's count).
  - Shared, in their own group: accent and flat shadow as `<select>`s of the style's colors (`color.<hex>`), shown when either face's variant lists them, and headline rotation, sticker scale and washi angle ranges. Every range comes from `tokens.json` (`editor.json` for scale), and each shows its value.
  - **QR layout (FR-E23):** on a back whose variant lists more than one layout, a select labeled from `editor.qr.<layout>`.
  - **Text size (FR-E22):** in each face's group, one range per section the face has, labeled `seccion.<key>`, in percent, with a "Reset sizes" button.
  - Upload: a file input for PNG, JPEG or WebP with a drop zone, and the "cut off at the bottom" checkbox (§5.3).
  - The placeholder is drawn on a canvas in the face font (Plumon) with the localized "[ your kitty here ]", so it exports like any image and follows the language.
- Native controls. Labels are app catalog keys (`editor.*`) and style catalog keys (§4), so a language switch relabels the editor without touching its state.
- **Test hook:** P8's `window.__bk` becomes `window.__kobo`: the store, `ready()`, the face elements and their bound marks. It exists only in builds made with `VITE_TEST_HOOK=1` and only when the URL has `?test`. The E2E web server builds with the flag; the deploy build doesn't, and CI checks that `dist/` has no trace of it.

## 6. Page and profile `[FR-P1–P7]`
- **Order:**
  1. Header: name, the ES/EN switch and the "Make your card ↓" link.
  2. Profile: pitch, a general experience summary and Telegram contact.
  3. "How this was built" with a repo link.
  4. `#editor`.
- **Style:** the editor's UI tokens (`--ui-*`, `--tinta`, `--chicle`, …) and fonts (Burbuja, Plumon, Lazo, Silk) via `src/theme/ui.css`, shared by the profile and the editor (FR-P7).
- **Copy** is provisional, in both catalogs, and marked for later polish.
- **Static profile, one source of text:** profile elements in `index.html` carry `data-i18n="<key>"`. At build time a small Vite plugin fills them, the title and the description from `en.json` (escaped), so the no-JavaScript page and the English catalog can't drift (FR-P6). At runtime the same keys are re-applied with `textContent` when the language changes. The profile is plain HTML; Preact renders only what JavaScript owns (today the editor placeholder, later the editor).
- **Language switch:** two links, `?lang=en` and `?lang=es`, so it still works without JavaScript. With JavaScript they switch in place (FR-I2), mark the active one with `aria-current`, and drop `?lang=` from the address so a reload keeps the remembered choice.
- **CSP and build-only tags:** the CSP `<meta>` (§8) is injected at build time only, because the dev server needs inline scripts and a WebSocket.
- **404:** `404.html` is a second Vite entry with both languages side by side and a link home, so it needs no JavaScript.
- **"How this was built" line (FR-P3):** a short paragraph in the profile, under the contacts. It says how the site is made (specs first, every change through an issue and a reviewed PR, tested in three browsers) and links to the repo, the requirements, the design and the decision records on GitHub. Its text comes from the catalogs and is filled at build time like the rest of the profile, so it reads the same without JavaScript.
- **"OwO wats dis?!" explainer (FR-P11):** a native `<details>` right after the "How this was built" line. Its `<summary>` is the button ("OwO wats dis?!" / "OwO ¿qué es esto?!"); its panel is a short, playful list in the card style's voice: your card never leaves your browser, how the site is built, and the tech. It ends in "I'm actually interested in the technical details →", which goes to the "How it works" page.
  - **Why `<details>`:** it's a real disclosure with no script. It opens by mouse, keyboard (Enter and Space on the summary) and touch, screen readers announce it as expanded or collapsed, and it works the same without JavaScript (FR-P6).
  - **Script:** `src/page/explainer.ts` adds what `<details>` lacks: Escape closes the open panel and returns focus to the summary.
  - **Copy** comes from the catalogs and is filled at build time, like the rest of the profile. It's provisional and states only facts the repo shows, with no counts that go stale.
- **"How it works" page (FR-P12):** `how-it-works.html`, a third Vite entry next to `index.html` and `404.html`, so it gets the same build-time text fill and CSP.
  - **Sections:** overview, architecture, your data, exports, security, quality, releases. Each one ends with links to its sources on GitHub.
  - **Authoring:** the text lives in the app catalogs (`how.*` keys) and is filled at build time, like the profile, so it reads without JavaScript and the catalog check keeps both languages in step. Paragraphs are plain text; links sit in each section's own list, never inside a translated sentence.
  - **Script:** it loads the main page's `src/main.tsx`, which sets up the language switch and only the parts a page has (the form, the explainer and the editor are skipped when their elements are missing). One entry script keeps the build's chunks as they were; a separate shared chunk made WebKit warn about an unused preload.
  - **No drift:** the page explains and links; it has no counts or version numbers.
  - **Language between pages (#79):** a `?lang=` choice isn't remembered (§4), so links from one page to the other (`data-keep-lang`: the OwO details link and the back link) carry the current language. `main.tsx` adds `?lang=<current>` to them at start and on every switch. Without JavaScript they stay plain links. The remembered choice is unchanged.
  - The OwO explainer's details link points here. The page links back to the main page.
- **Open Graph image (FR-P5):** `public/og-image.png`, 1200 × 630, published as `https://kobothewolf.com/og-image.png`. The page declares it with `og:image` (absolute, as Open Graph requires), `og:image:width`, `og:image:height`, a localized `og:image:alt`, and `twitter:card` `summary_large_image`.
  - **How it's made:** `scripts/site-images.ts` exports the default front card through the editor's own PNG button and centers it on the page background. It runs in the CI Playwright image, so fonts match CI, and writes pixel data only (§7).
  - **Committed, not rendered by CI at deploy time:** the image is reviewed in its PR, works in every build including local previews, and the deploy needs no artifact handoff.
  - **Keeping it current:** run the script again whenever the default card changes. The E2E test checks its size and that the page declares it.
- **README images (FR-R1):** the same script writes `docs/images/profile.png` and `docs/images/editor.png` (desktop, English) for the README. A unit test checks that the README covers each FR-R1 item and that its relative links and images exist.

### 6.1 Inquiry form `[FR-P8, NFR-3, NFR-4, NFR-5]`
- **Markup:** a `<form>` in `index.html` with no `action`, hidden until JavaScript removes `hidden` (progressive enhancement). Labels, options and messages are `data-i18n` keys.
- **Composition** (`src/contact/mailto.ts`, pure): the recipient is a constant. Single-line fields (name, email) have CR/LF removed and are capped (name 100, email 254 characters). The message is capped at 1,500 characters so the URL stays within what email apps accept. Subject and body are built from catalog templates, line breaks become CRLF, and both go through `encodeURIComponent`. Nothing typed can add headers (`&`, `?`, `%0A` are all encoded).
- **Send:** validation (required fields, a basic email shape) sets `aria-invalid` and per-field messages and focuses the first invalid field. A valid form opens the `mailto:` URL through a temporary link. "Copy message" writes the recipient, subject and body to the clipboard. Status messages use the form's polite live region (the editor has its own, §5.6).
- **Security:** the CSP is unchanged. The form never submits (`form-action 'none'` stays), and opening `mailto:` is a navigation, not a request. No data leaves the browser except through the visitor's own email app.

## 7. Build-time validation `[FR-B3, FR-I5, NFR-5, NFR-9]`
`npm run validate` runs before the build and in CI. It fails on any of these:
- Data that doesn't match its schema in `schemas/` (`tokens`, `editor`, `variant`), or editor colors that aren't style color tokens, or anti-rules missing for a derived range, or an `inicial` value outside its range.
- A `data-ed` on or inside a `.qr`, `.arroba`, `.url` or `<canvas>`, or on an element whose text is contact data (`@KoboTheWolf`, `t.me/`, `kobothewolf.com`).
- A **back** face (`-r`) without exactly one main QR (a `.qr` outside any `data-parte`) and an `@KoboTheWolf` outside any `data-parte`. The site QR lives inside its optional `data-parte` block.
- A `data-parte` key equal to a built-in piece key (`arte`, `lazo`, `washi-<n>`).
- A catalog key missing in any language.
- A style label missing for a key the style uses: every `data-ed` and `data-parte` value, variant and face id, and `editor.json` background, color and art. A label for a key nothing uses is also an error, so catalogs don't go stale.
- A `data-seccion` key that isn't a lowercase slug, a section on or containing a locked element or contact text, a section inside another section, or a section with no `data-ed` text (FR-E22). Its label is required like other style keys.
- A variant whose default backgrounds aren't in `editor.json` → `fondos`.
- A variant whose `montar` names a file that isn't in its folder.
- A face image or mask path that isn't `assets/<file>` of an existing file in the style, a `data-arte` image that isn't `assets/st-<key>.png` for an `editor.json` art key, or an art key without its file.
- An asset file (under `styles/*/assets/`, `src/theme/fonts/` or `public/`) that is neither listed by path in `CREDITS.md` nor has a `LICENSE-<name>.txt` next to it.
- A committed PNG (assets, `e2e/baselines/`, `docs/images/`) with any chunk besides `IHDR`, `PLTE`, `tRNS`, `IDAT` and `IEND`. Text, EXIF and C2PA (`caBX`) metadata can carry personal details or tool credentials. Only pixel data is published.
- A style file (`.css`, `.html`, `.json` under `styles/`) or app stylesheet that references an absolute or protocol-relative URL in `url()`, `@import`, `src` or `srcset`. Assets load from the origin only, which the CSP also enforces at runtime (T-SEC-4).

Face rules read `styles/*/variantes/*/caras.html` with parse5 and are unit-tested on fixtures. The **≤ 4 fonts per face** limit (`tokens.json` → `tipografia.max_fuentes_por_cara`) is not checked here: shared CSS rules make a static count unreliable. It is checked on the fonts actually rendered, by the faces fixture page (§10) and later by `check-exports` (FR-B2). P8's Programming socks back used 5; its "hewwo~" greeting moved from Lazo to Burbuja to meet the rule (#12).

## 8. Security model `[NFR-4, NFR-5]`
The site is static with no server state. What needs protecting is visitors' browsers, users' images, and the domain and repo.

| Threat | Control | Test |
|---|---|---|
| XSS through a crafted `.kobo.json` | text only through `textContent`; schema caps string lengths | T-SEC-1: a document with `<img onerror>` creates no element and runs no script |
| Malicious embedded image | `artePropio` must match `^data:image/png;base64,` and be ≤ 2 MB; it is decoded and re-encoded on a canvas | T-SEC-2: SVG data URI rejected; 3 MB rejected |
| Prototype pollution or garbage | validators compiled at build time from `schemas/` (`additionalProperties:false`); `__proto__` and `constructor` rejected; files over 3 MB rejected before parsing | T-SEC-3 |
| Injected `?lang=` value | allow-listed against `languages.ts`; never reflected into HTML | T-SEC-5 |
| Injection, third-party loads | CSP meta: `default-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'` | T-SEC-4: zero CSP violations and zero off-origin requests in both languages |
| Supply chain | exact pins, lockfile, `npm ci`, `npm audit`, Actions pinned by SHA, gitleaks | CI gates |
| Domain takeover | account-level domain verification; no stray DNS records | manual checklist |
| Clickjacking | not mitigable on Pages (no `frame-ancestors` in meta). There are no authenticated actions, so the risk is accepted | — |

## 9. CLI `[FR-B1, FR-B2]`
`cli/kobo.ts`, run by Node 24 directly (`npm run kobo -- <command>`), as the repo's other scripts are. tsx isn't needed.
- `pdf-vector doc.kobo.json [-o out.pdf] [--lang en|es]`: EV §5.2, below. The output defaults to the document's name with `.pdf`, next to it.
- `check-exports dir/`: EV §5.3, below.
- `validate`: §7 (`npm run validate`).

**`pdf-vector` (FR-B1).** A PDF with real text and embedded subset fonts, for print shops that ask for vector output. It runs locally and in CI, never on the site.
- **Input:** the document is read and checked in Node first, with the same `parseDocument` the editor uses (size, forbidden keys, schema). Its style must exist, and its front and back must be faces of that style. On any failure the command prints `invalid document <file>:` with each problem, exits 1, and never starts a browser.
- **Print page:** `cli/print/` is a private page built by its own Vite config into `dist-print/`, never deployed, with the site's face-CSS plugin and CSP. It creates the editor's session (`createSession`) and opens the document through the store's validated `importText`, so the PDF shows what the editor would. It then puts the two shown faces on two pages, paints them, runs `montar` and waits for `ready()`. The PDF title is the two faces' names plus "KOBO.EXE <style>", in the chosen language, which also sets the placeholder's text.
- **Pages:** `@page { size: 96mm 56mm; margin: 0 }`, one face per page, scaled with `zoom` (960 face pixels on 96 mm). A `transform` doesn't work: layout still sees the face 960 px wide, and Chromium shrinks the whole print to fit it. Chromium prints with `page.pdf({ preferCSSPageSize: true, printBackground: true })`.
- **Measured caveat (EV §5.2):** Chromium sets page sizes in steps of 1.2 pt (0.42 mm). The closest it can make to 96 × 56 mm is **271.92 × 159.12 pt (95.93 × 56.13 mm)**, whatever unit the size is given in. That's 0.07 mm narrower and 0.13 mm taller, inside the 3 mm bleed, so the trimmed card isn't affected.
- **What stays raster:** stickers, the user's own art, the QR images and the code cat, which `montar` draws on a canvas. Every other text is real text in its own font.

**`check-exports dir/` (FR-B2).** Some checks need what a file can't tell, such as where the QRs are and which font drew each text. So the files come with a manifest.
- **Renderer:** `e2e/exports/render.ts`, run by `playwright.exports.config.ts` in Chromium and WebKit (`npm run exports:render`).
  - It exports every variant through the editor's own buttons, in its default state.
  - For each browser it writes `exports/<browser>/`:
    - each face's PNG and each variant's PDF;
    - a manifest per face (`cli/manifest.ts`): the boxes of the main QR, the site block and its QR, the boxes of every sparkle, washi tape, sticker and line of text outside them, and every text run with its first font family after `text-transform`;
    - an `index.json` that lists the faces and each PDF's pages.
- **Checks:** `check-exports` reads that folder, plus the repo's fonts (`src/theme/fonts.css`) and the style's `tokens.json`. It finds every `index.json` under the folder and checks:

  | Check | How | Criterion |
  |---|---|---|
  | PNG size and dpi | IHDR and pHYs | 1134 × 661 px, 11811 px/m (300 dpi) |
  | QR size | manifest boxes | the main QR's framed box is at least 150 face pixels (15 mm) wide, and the site QR's at least 96 (today's) |
  | QR | crop each QR's box from the PNG, `jsqr` | main: exactly `https://t.me/KoboTheWolf` at 300 dpi and at 150 dpi (the crop halved); site: exactly `https://kobothewolf.com` at 300 dpi |
  | Nothing over the QRs | manifest boxes | no sparkle, tape, sticker or text box overlaps the main QR's box or the site block's |
  | Fonts per face | manifest texts | at most `tipografia.max_fuentes_por_cara` families |
  | Glyphs | each family's font file, `cli/font-cmap.ts` | every non-space character of a run is in its family's cmap, so nothing falls back to another font |
  | PDF size and images | `pdfinfo`, `pdfimages -list` | 2 pages of 272.13 × 158.74 pt, one 1134 × 661 image per page at 300 × 300 ppi |
  | PDF fonts | `pdffonts` | none: the text is in the images |
  | PDF content | `pdfimages -png`, then the QR check | each page's image passes its face's QR checks, so page 2 is the back |
  | Vector PDF size | `pdfinfo` | 2 pages, each within one Chromium step (1.2 pt) of 272.13 × 158.74 pt |
  | Vector PDF fonts | `pdffonts` | at least one; every font embedded and subset; each one of the site's fonts (by PostScript name); at most `max_fuentes_por_cara` per page |
  | Vector PDF text | `pdftotext` | every text the document changed on its two faces, and doesn't hide, is in the PDF (ignoring spaces and case, since letters can be drawn one by one or uppercased) |

- **Vector PDFs** are found by name: a `<name>.pdf` with a `<name>.kobo.json` beside it, which is where `pdf-vector` writes by default. The document says which texts to look for.

- **Engines:** EV §5.3 also compares each export with a screenshot of the face. That isn't adopted. The WebKit bugs found so far (§5.5) have pixel checks in the E2E export test, and a whole-face comparison would need a tolerance wide enough to hide them: Firefox and WebKit draw export text 0.1 px smaller.
- **Output:** one line per file with what failed, a summary, and exit code 1 on any failure. Poppler (`pdfinfo`, `pdfimages`, `pdffonts`, from `poppler-utils`) is required; without it the command fails rather than skipping the PDF checks.
- **Expected QR contents** live next to the contact pattern the face rules use (`src/core/marks.ts`, §7), so the contact is defined in one file.
- **Tests:** `tests/check-exports.test.ts` builds a good synthetic export set from the style's QR images and checks that it passes. Then each fault on its own must fail: wrong dpi, wrong size, an unreadable QR, a wrong QR, a sticker over a QR, 5 fonts on a face, a missing glyph (♡), a PDF with the wrong page size, and a PDF with a font. The PDF cases need poppler: they skip without it locally, and the `check-exports` CI job sets `KOBO_REQUIRE_POPPLER=1`, so there they fail instead.

## 10. Testing and CI `[NFR-11]`
| Level | Tool | Covers |
|---|---|---|
| Unit | vitest | marks, store identity and migration, document validation (T-SEC-1–3), pHYs/CRC, sticker() against fixtures, code-cat layout, `t()` fallbacks, language resolution (T-SEC-5) |
| E2E | Playwright: Chromium, Firefox, WebKit | every variant: edit, switch, mix, export, reload persistence including the user's sticker, `.kobo.json` round-trip, **language switch keeps state**, 360 px with no horizontal scroll, zero console errors, CSP and requests (T-SEC-4), library blocked → buttons disabled, profile readable with JavaScript disabled (FR-P6) |
| Controls | Playwright with real clicks | **every** text and piece checkbox on every face hides and restores its element; every select and range driven through the UI (EV §8). Runs in both languages, because labels change and keys must not |
| Visual | Playwright screenshots | default faces in the editor against baselines generated from P8 with allowed art only (NFR-1) |
| Export | `kobo check-exports` | PNG and PDF from every variant, rendered in Chromium **and WebKit** (§9) |
| Code cat | `rustc --edition 2021 -D warnings`, Rust 1.99.1 | the text extracted in each browser compiles with no warnings and runs (§5.4) |
| A11y | `@axe-core/playwright` | profile and panel, ES and EN: no serious or critical violations |

- **`ci.yml`** runs on every PR: `npm ci` → typecheck → validate → unit → build → E2E matrix → export checks → rustc → `npm audit` → gitleaks. Exports are uploaded as workflow artifacts.
  - **Export jobs:** `export (chromium)` and `export (webkit)` run the renderer in the Playwright image. It exports every variant at the default sizes, and again with every section at the smallest and at the largest size (FR-E22), and every back in each of its QR layouts (FR-E23), so check-exports covers them all. The jobs upload `exports/<browser>/` as an artifact (kept 14 days). The Chromium job also runs `pdf-vector` on `tests/fixtures/documents/mezcla.kobo.json`, a mixed card with changed texts, into `exports/chromium/vector/`.
  - **`check-exports` job:** runs on the plain runner, because the image's user can't install packages. It installs `poppler-utils` with apt, downloads both artifacts, runs `kobo check-exports exports/`, adds the report to the job summary, and runs the check's unit tests with poppler required.
- **E2E environment:** the E2E jobs run in Microsoft's Playwright image (`mcr.microsoft.com/playwright:v<version>-resolute`), pinned by digest, with browsers and system packages preinstalled. This avoids a slow `apt` step and gives the visual baselines the same fonts and libraries on every run. The tag must equal `@playwright/test`, and CI checks it.
- **`deploy.yml`** runs on push to `main`: the same gates, then `upload-pages-artifact` → `deploy-pages`.
- **Fixture pages:** behavior that needs a real browser but must not ship, such as CSS scoping with deliberately conflicting variants, is tested on fixture pages under `e2e/fixtures/`. They're built by their own Vite config with the same plugins and served by a second Playwright web server, so the production build stays unchanged.
  - `scoping/`: two conflicting demo variants (§5.1).
  - `caras/`: every real face from every style, mounted through `src/styles.ts` with its default background. Each face is 960 × 560, every image loads from the origin, no console errors, and each face renders at most `max_fuentes_por_cara` fonts. The page awaits each variant's `montar`, so the code cat is drawn and its text saved for the `rustc` job.
- **P8 baselines (NFR-1):** `scripts/p8-baselines.ts` opens a local copy of P8 (private, never committed) in the CI Playwright image, sets each face to the editor's default state through `window.__bk` (with `"feliz"` art on the socks front), hides the guides and saves each face at 960 × 560 to `e2e/baselines/<browser>/<face>.png`. The visual test screenshots each default face in the editor at scale 1 and compares with Playwright's comparator, which skips anti-aliased pixels. Chromium and Firefox must match exactly otherwise. WebKit paints the same face slightly differently from page to page (the phase of dashed lines, image edges), so it may differ in up to 0.5 % of the face. The baselines show only allowed art, apply the approved changes since P8 (the "feliz" art, the socks back greeting in Burbuja, #12) and carry pixel data only. The code-cat front's baselines can't come from P8 since #75 changed its text size, so they're screenshots of that face in the editor, made in the same CI image (`npx playwright test e2e/visual.spec.ts -g cod-f --update-snapshots`). `scripts/p8-baselines.ts` leaves them alone.
- Tests name their requirement IDs.

## 11. Dependencies `[NFR-10]`
| Package | Kind | Why |
|---|---|---|
| preact 11.0.2 | runtime | profile and panel UI |
| html-to-image 1.11.13 | runtime | DOM → PNG, proven in P8 |
| jspdf 4.2.1 | runtime | PDF in the browser. 2.5.1 fails audit (§5.5) |
| vite, typescript | dev | build |
| vitest | dev | unit tests |
| @playwright/test, @axe-core/playwright | dev | E2E, visual, accessibility, CLI rendering |
| ajv | dev | compiles schemas into standalone validators at build time, so there is no runtime dependency. Its one runtime helper (`ucs2length`, code-point string length) is replaced by a local function, and generation fails if any other import appears |
| parse5 | dev | parses face HTML in `validate` (Node has no DOM) |
| lightningcss | dev | scopes and flattens face CSS (§5.1). Vite 8 already installs it; it's declared, pinned to Vite's version, because the build imports it directly |
| jsqr 1.4.0 | dev | decodes the QRs in `check-exports`. No dependencies |

Fonts are checked without fontkit: `cli/font-cmap.ts` reads only the cmap, uncompressing WOFF2 with Node's built-in brotli, which saves nine packages. It was compared with fontTools on every code point up to U+30000 of each of the site's five fonts, with identical results. There's no i18n library: catalogs plus `Intl` cover two languages, and a library would be a dependency without a need. All versions are exact and the lockfile is committed. Each one is justified in the PR that adds it.

## 12. Repository workflow `[FR-R1–R8]`
- **Bootstrap** (the one direct commit to `main`, per pr-only): README skeleton, LICENSE (MIT), CONTRIBUTING, CLAUDE.md, policies, `.gitignore`, approved docs, decision records, `docs/origin/` (redacted) and issue/PR templates. Then `gh repo create kobothewolf.com --public` (approved in decision 0003), a visibility check, repo settings and the ruleset (FR-R5). The CI skeleton is issue #1, the first PR.
- **Flow:** issue (problem, scope, acceptance criteria, FR IDs) → branch `<n>-<slug>` → signed conventional commits with `Refs #n` → PR (template: summary, `Closes #n`, FRs covered, Verified) → green CI → Kobo merges with a **merge commit** → branch auto-deleted.
- **History shape** (`preserve-history`): commits are tidied locally **before their first push** (`git commit --fixup` plus a local `git rebase --autosquash`). Once pushed, a commit is final: mistakes are undone with `git revert` (body: `This reverts commit <sha>.` and why) or a fix commit, and nothing is force-pushed on any branch. A branch is never rebased onto `main` after pushing; if it needs `main`'s changes, `main` is merged into it.
- **Repo settings:** merge commits on, squash and rebase off. The default merge-commit message is "Pull request title and description", so the merge commit on `main` reads e.g. `feat(editor): export PNG at 300 dpi (#14)`. Branches are auto-deleted after merge.
- **Ruleset on `main`:** require a PR, require the CI checks, require signed commits, block force-push and deletion. Linear history is **not** required, since it would forbid merge commits. Merges done in the GitHub UI are signed by GitHub, so they show as Verified too.
- **Signing:** SSH commit signing with Kobo's existing key (`gpg.format ssh`, `commit.gpgsign true`), registered on GitHub as a signing key.
- **Releases:** one release per milestone (`v0.1.0` = M1, …): a tag, a GitHub release, and a `CHANGELOG.md` entry grouped by commit type. From v0.7.0 they're made by release-please ([decision 0008](decisions/0008-release-please.md)); v0.1.0–v0.6.0 were made by hand with signed tags.
  - **Workflow:** `.github/workflows/release.yml` runs on every push to `main`. It gets a token from the release GitHub App (`actions/create-github-app-token`, scoped to contents, pull requests and issues), then runs `googleapis/release-please-action`. Both are pinned by commit.
  - **Configuration:** `release-please-config.json` and `.release-please-manifest.json` (starting at `0.6.0`): release type `node`, `bump-minor-pre-major`, the release PR titled `chore(release): v${version}`, and changelog sections named as before (Features, Fixes, Refactors, Docs, CI and tests, Chores).
  - **Release PR:** release-please keeps one open, rebuilt from `main` as PRs merge, with the version bump and the new changelog entry. Its required checks run, because the app opened it. Kobo merges it at the milestone's end; release-please then creates the tag and the GitHub release. Kobo checks the deploy, and the release notes or PR record it.
  - **Release PR text:** a header and footer in the card style's voice, set in the config, credit Release Please with a link. In the changelog, release-please writes a commit's `Refs #n` as "closes #n".
  - **Exceptions:** the app's tags aren't signed by Kobo's key, the release PRs credit Release Please (and so do their merge commits), and release-please force-updates its own branch, `release-please--branches--main--components--kobothewolf.com`, which `preserve-history` otherwise forbids. Both are accepted in decision 0008.
- **Redaction checklist for `docs/origin/`** (FR-R2):
  - Remove local filesystem paths, machine and network details, private prototype URLs, references to `sources/` and removed art, and internal notes.
  - Keep the technical content.
  - Add a header: "Historical input, superseded by REQUIREMENTS.md / DESIGN.md".
  - EV is published in English (translated) and in its original Spanish.
- **No AI attribution** in commits, PRs, tags or release notes (global policy).

## 13. Hosting, domain and DNS `[FR-D1–D3]`
- **Pages source:** GitHub Actions. With Actions deploys the `CNAME` file is ignored, so the custom domain is set in **Settings → Pages**.
- **DNS** (Kobo applies these at the registrar):
  - Apex `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
  - Apex `AAAA` records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
  - `www` `CNAME` → `solenasth.github.io`.
  - Remove other `A`, `AAAA` or `CNAME` records on those hosts.
- **Account-level verification** with a TXT record. Turn on "Enforce HTTPS" after the certificate is issued.
- **`kobothewolf.dev`:** unused in v1. It can later redirect at the registrar, or become the QR target.

## 14. Delivery plan (milestones = GitHub milestones; each ends in a release)
| M | Deliverable | FRs |
|---|---|---|
| M0 | Bootstrap (§12): repo, docs, redacted origin specs, templates, ruleset, CI skeleton, deploy workflow | FR-R1–R8, FR-D1 |
| M1 | Placeholder page live on kobothewolf.com (static profile, ES/EN switch, i18n core) | FR-P1, P4–P7, FR-I1–I5, FR-D2–D3 |
| M2 | Core: schemas, marks, store, document, pHYs, sticker() with fixtures, validate | FR-E16, E17, B3 |
| M3 | boykisser-uwu: 4 variants as data, scoped CSS, style catalogs, code-cat `montar()`, assets | FR-E18–E20, NFR-1 |
| M4 | Editor UI on the page: panel, preview, tabs, controls, both languages; controls test; visual parity | FR-E1–E13, E21, FR-P2 |
| M5 | Browser export plus 3-engine export checks; jsPDF 4 verification | FR-E14, E15, B2 |
| M6 | CLI vector PDF | FR-B1 |
| M7 | Accessibility pass, Open Graph image, README screenshots, `v1.0.0` | FR-P3, NFR-6 |
| v2 | edgy-2000s, polished profile or portfolio, localized card defaults, URL-hash sharing, crop marks, PWA | — |

## 15. Risks and open design questions
| Risk / question | Mitigation or default |
|---|---|
| jsPDF 2 → 4 changes output | M5 re-runs the export checks; on a regression, pin the closest clean version and record why |
| html-to-image on WebKit | keep `sombrasADivs()`; WebKit is in the export matrix |
| iOS opens a preview instead of downloading | accepted (NFR-8); noted in help text |
| Visual parity after CSS scoping | baselines from P8; mechanical port first, refactors after the tests are green |
| Long Spanish labels break the panel layout | E2E at 360 px in both languages |
| Sticker processing in a Worker in v1? | yes: OffscreenCanvas 2D is in all targets (§5.3); wired in #16 |
