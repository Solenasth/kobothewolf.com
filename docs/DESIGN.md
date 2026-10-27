# Design: kobothewolf.com (profile + KOBO.EXE card editor)

**Status:** Approved 2026-10-26 (rev. 19: §5.2, §5.3, §5.6 art, color and range controls, #16; rev. 18: §5.6 text and piece controls, #15; rev. 17: §2, §3.3, §5.2, §5.6, §7, §10 editor shell and preview, #14; rev. 16: §2, §3.4, §5.4, §7, §10 code-cat mount step, #13; rev. 15: §2, §3.4, §4, §7, §10 variants as data, #12; rev. 14: §5.1 CSS scoping, §10, §11, #11; rev. 13: §2, §7 assets and credits, #10; rev. 12: §5.5 pHYs, #9; rev. 11: §5.3 sticker tolerance and Worker, #8; rev. 10: §5.2, #7; rev. 9: §3.2, §7, #6; rev. 8: §3.3, §7, §11, #5; rev. 7: §6.1, #30; rev. 6: §6, #4; rev. 5: §10, #26; rev. 4: §12, #24)
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
The other ranges are derived from `tokens.json` → `antirreglas`, so there is only one source of truth (FR-E9): `rotSt` ← `rotacion_stickers_grados`, `rotTit` ← `rotacion_titulares_grados`, `washi` ← `washi.grados`, `brillitos` ← `brillitos.por_cara` (the editor also caps it at the face's sparkle count). The sticker scale has no anti-rule, so it lives in `editor.json`. `inicial` holds the starting values of the shared ranges, P8's defaults, so the default faces match P8 (NFR-1); `validate` checks each is inside its range. A face's sticker rotation starts at its authored angle, and sparkles are also capped at the face's count. Every accent and shadow must be one of the style's `color` tokens. `"sueter"` is removed, and the Programming socks front defaults to `"feliz"` (D-3).

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

### 3.5 Document (`.kobo.json`), version 1
EV §3.5 with these changes:
- `app` and `version` are required.
- `artePropio` is persisted (FR-E16).
- Backs may use `"arte": "ninguno"` (FR-E5).
- Unknown face IDs are dropped.
- Migration fills only the missing keys and never replaces a face object (EV §6.5).

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
- The font size is chosen so the program fills about a third of the silhouette, as in P8. The canvas is drawn at 4× for export.
- The program text is written to `cara.dataset.codigo`.
- The mask is a same-origin PNG, so the canvas isn't tainted.
- **Compiles (FR-E20):** the faces E2E test saves `cara.dataset.codigo` from each browser, since font metrics can change the layout. The CI `rustc` job compiles each with Rust 1.99.1 (pinned), `--edition 2021 -D warnings`, and runs it.

### 5.5 Export pipeline `[FR-E14, FR-E15, NFR-2]`
```
await faces ready ─► sombrasADivs(face) ─► htmlToImage.toPng(face, {960×560 → 1134×661, filter: no .guide, fontEmbedCSS})
                 ─► undo shadows ─► insert pHYs (11811 px/m) ─► Blob ─► Saver.save()
PDF: two PNGs ─► jsPDF {unit:'mm', format:[96,56], landscape} ─► Blob ─► Saver.save()
```
- **pHYs:** `src/core/phys.ts` `setDpi(png, 300)` works on the PNG bytes alone (no DOM), so it's unit-tested in Node. It removes every existing `pHYs` chunk and writes one right after `IHDR` (before any `IDAT`, as the PNG spec requires) with its CRC-32. 300 dpi is stored as 11811 px/m, the nearest integer, which readers report as 300 dpi. Bytes that aren't a well-formed PNG (bad signature, `IHDR` not first, truncated chunk, bad CRC) are rejected with a typed error, not passed through.
- `sombrasADivs()` is kept as is. It's the WebKit `box-shadow` fix (EV §10).
- `fontEmbedCSS` is computed once and reused (NFR-2).
- **Saver interface** `{ save({filename, data: Blob}) → {status} }`. The browser implementation creates an object URL, clicks an `<a download>`, then revokes it after 10 s (GP §1). Other host runtimes can plug in through the same interface.
- Buttons stay disabled until the libraries have loaded and the faces are ready. Otherwise the message `export.unavailable` shows (GP §2).
- **Library versions change.** `npm audit` on 2026-10-25 reported the inputs' pinned **jsPDF 2.5.1: 1 critical, 1 high** (via dompurify). The plan moves to **jsPDF 4.2.1** and **html-to-image 1.11.13**, which audit clean together with Preact 11.0.2. M5 re-verifies output against the export checks (page size 272.13 × 158.74 pt, 300 ppi, QR decode). Recorded in `0007-export-library-versions.md`.

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
- **Open Graph image:** a 1200 × 630 PNG rendered by CI from the default card.

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
- A variant whose default backgrounds aren't in `editor.json` → `fondos`.
- A variant whose `montar` names a file that isn't in its folder.
- A face image or mask path that isn't `assets/<file>` of an existing file in the style, a `data-arte` image that isn't `assets/st-<key>.png` for an `editor.json` art key, or an art key without its file.
- An asset file (under `styles/*/assets/`, `src/theme/fonts/` or `public/`) that is neither listed by path in `CREDITS.md` nor has a `LICENSE-<name>.txt` next to it.
- A committed PNG with any chunk besides `IHDR`, `PLTE`, `tRNS`, `IDAT` and `IEND`. Text, EXIF and C2PA (`caBX`) metadata can carry personal details or tool credentials. Only pixel data is published.
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
`cli/kobo.ts` (run with `tsx`, using Playwright's browsers):
- `pdf-vector doc.kobo.json`: EV §5.2, `@page{size:96mm 56mm;margin:0}` with `preferCSSPageSize`.
- `check-exports dir/`: EV §5.3. Uses poppler `pdfinfo` / `pdfimages` / `pdffonts` (apt in CI), `jsqr` and `fontkit`.
- `validate`: §7.

## 10. Testing and CI `[NFR-11]`
| Level | Tool | Covers |
|---|---|---|
| Unit | vitest | marks, store identity and migration, document validation (T-SEC-1–3), pHYs/CRC, sticker() against fixtures, code-cat layout, `t()` fallbacks, language resolution (T-SEC-5) |
| E2E | Playwright: Chromium, Firefox, WebKit | every variant: edit, switch, mix, export, reload persistence including the user's sticker, `.kobo.json` round-trip, **language switch keeps state**, 360 px with no horizontal scroll, zero console errors, CSP and requests (T-SEC-4), library blocked → buttons disabled, profile readable with JavaScript disabled (FR-P6) |
| Controls | Playwright with real clicks | **every** text and piece checkbox on every face hides and restores its element; every select and range driven through the UI (EV §8). Runs in both languages, because labels change and keys must not |
| Visual | Playwright screenshots | default faces in the editor against baselines generated from P8 with allowed art only (NFR-1) |
| Export | `kobo check-exports` | PNG and PDF from every variant, rendered in Chromium **and WebKit** |
| Code cat | `rustc --edition 2021 -D warnings`, Rust 1.99.1 | the text extracted in each browser compiles with no warnings and runs (§5.4) |
| A11y | `@axe-core/playwright` | profile and panel, ES and EN: no serious or critical violations |

- **`ci.yml`** runs on every PR: `npm ci` → typecheck → validate → unit → build → E2E matrix → export checks → rustc → `npm audit` → gitleaks. Exports are uploaded as workflow artifacts.
- **E2E environment:** the E2E jobs run in Microsoft's Playwright image (`mcr.microsoft.com/playwright:v<version>-resolute`), pinned by digest, with browsers and system packages preinstalled. This avoids a slow `apt` step and gives the visual baselines the same fonts and libraries on every run. The tag must equal `@playwright/test`, and CI checks it.
- **`deploy.yml`** runs on push to `main`: the same gates, then `upload-pages-artifact` → `deploy-pages`.
- **Fixture pages:** behavior that needs a real browser but must not ship, such as CSS scoping with deliberately conflicting variants, is tested on fixture pages under `e2e/fixtures/`. They're built by their own Vite config with the same plugins and served by a second Playwright web server, so the production build stays unchanged.
  - `scoping/`: two conflicting demo variants (§5.1).
  - `caras/`: every real face from every style, mounted through `src/styles.ts` with its default background. Each face is 960 × 560, every image loads from the origin, no console errors, and each face renders at most `max_fuentes_por_cara` fonts. The page awaits each variant's `montar`, so the code cat is drawn and its text saved for the `rustc` job.
- **P8 baselines (NFR-1):** `scripts/p8-baselines.ts` opens a local copy of P8 (private, never committed) in the CI Playwright image, sets each face to the editor's default state through `window.__bk` (with `"feliz"` art on the socks front), hides the guides and saves each face at 960 × 560 to `e2e/baselines/<browser>/<face>.png`. The visual test screenshots each default face in the editor at scale 1 and compares with Playwright's comparator, which skips anti-aliased pixels. Chromium and Firefox must match exactly otherwise. WebKit paints the same face slightly differently from page to page (the phase of dashed lines, image edges), so it may differ in up to 0.5 % of the face. The baselines show only allowed art, apply the approved changes since P8 (the "feliz" art, the socks back greeting in Burbuja, #12) and carry pixel data only.
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
| jsqr, fontkit | dev | export checks |
| tsx | dev | runs the CLI |

There's no i18n library: catalogs plus `Intl` cover two languages, and a library would be a dependency without a need. All versions are exact and the lockfile is committed. Each one is justified in the PR that adds it.

## 12. Repository workflow `[FR-R1–R8]`
- **Bootstrap** (the one direct commit to `main`, per pr-only): README skeleton, LICENSE (MIT), CONTRIBUTING, CLAUDE.md, policies, `.gitignore`, approved docs, decision records, `docs/origin/` (redacted) and issue/PR templates. Then `gh repo create kobothewolf.com --public` (approved in decision 0003), a visibility check, repo settings and the ruleset (FR-R5). The CI skeleton is issue #1, the first PR.
- **Flow:** issue (problem, scope, acceptance criteria, FR IDs) → branch `<n>-<slug>` → signed conventional commits with `Refs #n` → PR (template: summary, `Closes #n`, FRs covered, Verified) → green CI → Kobo merges with a **merge commit** → branch auto-deleted.
- **History shape** (`preserve-history`): commits are tidied locally **before their first push** (`git commit --fixup` plus a local `git rebase --autosquash`). Once pushed, a commit is final: mistakes are undone with `git revert` (body: `This reverts commit <sha>.` and why) or a fix commit, and nothing is force-pushed on any branch. A branch is never rebased onto `main` after pushing; if it needs `main`'s changes, `main` is merged into it.
- **Repo settings:** merge commits on, squash and rebase off. The default merge-commit message is "Pull request title and description", so the merge commit on `main` reads e.g. `feat(editor): export PNG at 300 dpi (#14)`. Branches are auto-deleted after merge.
- **Ruleset on `main`:** require a PR, require the CI checks, require signed commits, block force-push and deletion. Linear history is **not** required, since it would forbid merge commits. Merges done in the GitHub UI are signed by GitHub, so they show as Verified too.
- **Signing:** SSH commit signing with Kobo's existing key (`gpg.format ssh`, `commit.gpgsign true`), registered on GitHub as a signing key.
- **Releases:** one tag per milestone (`v0.1.0` = M1, …), a GitHub release, and `CHANGELOG.md` grouped by commit type.
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
