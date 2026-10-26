# Design: kobothewolf.com (profile + KOBO.EXE card editor)

**Status:** Approved 2026-10-26 (rev. 6: §6 static profile and language switch, #4; rev. 5: §10 Playwright container, #26; rev. 4: §12 history shape, #24)
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
  │ fonts/ schemas/ tests/ docs/ .github/                         │
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
│   ├── app/                     Profile, LangSwitch, Editor{Panel,Preview,Tabs,ExportBar}
│   ├── i18n/
│   │   ├── en.json  es.json     UI and profile strings
│   │   └── i18n.ts              t(), plurals, lang detection and persistence
│   ├── theme/ui.css             boykisser-uwu UI tokens (--ui-*), shared by profile and editor
│   └── core/
│       ├── marks.ts  store.ts  document.ts  sticker.ts  faces.ts
│       └── export/{png,pdf,shadows,save}.ts
├── styles/boykisser-uwu/
│   ├── tokens.json  STYLE.md  caras.css  editor.json
│   ├── i18n/{en,es}.json        labels: fields, pieces, variants, backgrounds, colors, art
│   ├── variantes/{certificado,licencia,codigo,socks}/
│   │     variant.json  caras.html  caras.css  [montar.ts]
│   └── assets/                  stickers, QR, masks (PNG files)
├── fonts/  schemas/  cli/  tests/
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
`data-ed`, `data-bote` + `data-cls`, `data-arte`, `data-rot="st|tit"`, `data-lazo`, `data-parte`, `.washi` and `.spark` keep their P8 meanings. Unmarked elements can't be edited. This is documented in `docs/marcas.md`.

**i18n note:** the values of `data-ed` and `data-parte` (e.g. `"Emisor"`, `"Sitio (QR + texto)"`) are **stable keys**, not display text. Their labels come from the style catalogs (§4). This keeps the contract compatible with the design source, which uses Spanish labels as values: in `es.json` those keys map to themselves.

### 3.3 Style editor lists (`editor.json`)
These are the lists P8 hard-coded. They hold keys only; display names come from the style catalogs.
```jsonc
{ "acentos": ["#FF8FB8", "#8EC5FF", "#CDB4DB", "#E5484D"],
  "sombras": ["#FF8FB8", "#FFC8DD", "#BDE0FE", "#CDB4DB"],
  "fondos":  ["gingham", "cuaderno", "femboy", "crema", "algodon"],
  "arte":    ["licencia", "feliz", "clik", "yap"],
  "rangos":  { "rotSt": [-8, 7], "rotTit": [-4, 3], "escala": [85, 115], "washi": [12, 18], "brillitos": [5, null] } }
```
The ranges are generated from `tokens.json` → `antirreglas` at build time, so there is only one source of truth (FR-E9). `"sueter"` is removed, and the Programming socks front defaults to `"feliz"` (D-3).

### 3.4 Variant manifest
As in EV §3.4, with `"montar": "montar.ts"` (FR-E19). Names are catalog keys (`variant.licencia.name`).

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
  - `styles/<estilo>/i18n/{en,es}.json` hold style labels: `ed.<key>`, `parte.<key>`, `variant.<id>.name`, `face.<id>.name`, `fondo.<key>`, `color.<hex>`, `arte.<key>`.
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
- Each variant's CSS is scoped at build time with native nesting under `[data-cara="<id>"]`. Lightning CSS (bundled with Vite) flattens it.
- Faces mount in the normal DOM, and export works as it did in P8.
- `caras.html` is imported as a string (`?raw`) and parsed with a `<template>`. These are trusted, build-time files; user input never travels this path.

Recorded in `0006-css-scoping-not-shadow-dom.md` once approved.

### 5.2 State `[FR-E3–E13, FR-E16]`
- A single store holds the document. Each face has **one state object for the whole session**. Controls and rendering read and write that same object through store actions, and nothing rebuilds a face object on read (the P8 v5 bug, EV §10).
- `paint()` applies state to the DOM as P8's `pintar()` did.
- Text goes in only through `textContent` or per-letter `<span>`s, never `innerHTML` (NFR-4).
- Persistence: saved under `localStorage['kobo-editor-v1']`, debounced, with every read and write in `try/catch`. The user's sticker is capped at 2 MB; above that, text state is still saved and a notice explains it.

### 5.3 Sticker from the user's image `[FR-E6]`
- The EV §6.3 algorithm is ported from P8 into typed, pure functions over `Uint8Array` masks.
- The shadow color comes from tokens.
- **Optional:** run it in a Worker with `OffscreenCanvas` when every target browser supports it.
- **Parity:** fixtures from the private Python tooling are committed, and unit tests compare against them within a tolerance.

### 5.4 Code-cat face `[FR-E19, FR-E20]`
P8's `gato()` moves to `variantes/codigo/montar.ts`, exporting `async function montar(cara: HTMLElement): Promise<void>`.
- The program text is written to `cara.dataset.codigo`.
- The mask is a same-origin PNG, so the canvas isn't tainted.

### 5.5 Export pipeline `[FR-E14, FR-E15, NFR-2]`
```
await faces ready ─► sombrasADivs(face) ─► htmlToImage.toPng(face, {960×560 → 1134×661, filter: no .guide, fontEmbedCSS})
                 ─► undo shadows ─► insert pHYs (11811 px/m) ─► Blob ─► Saver.save()
PDF: two PNGs ─► jsPDF {unit:'mm', format:[96,56], landscape} ─► Blob ─► Saver.save()
```
- `sombrasADivs()` is kept as is. It's the WebKit `box-shadow` fix (EV §10).
- `fontEmbedCSS` is computed once and reused (NFR-2).
- **Saver interface** `{ save({filename, data: Blob}) → {status} }`. The browser implementation creates an object URL, clicks an `<a download>`, then revokes it after 10 s (GP §1). Other host runtimes can plug in through the same interface.
- Buttons stay disabled until the libraries have loaded and the faces are ready. Otherwise the message `export.unavailable` shows (GP §2).
- **Library versions change.** `npm audit` on 2026-10-25 reported the inputs' pinned **jsPDF 2.5.1: 1 critical, 1 high** (via dompurify). The plan moves to **jsPDF 4.2.1** and **html-to-image 1.11.13**, which audit clean together with Preact 11.0.2. M5 re-verifies output against the export checks (page size 272.13 × 158.74 pt, 300 ppi, QR decode). Recorded in `0007-export-library-versions.md`.

### 5.6 Editor UI `[FR-E1–E4, FR-E21, NFR-6, NFR-7]`
- Layout as in P8: the panel and a stage that becomes sticky at 900 px and wider. On narrow screens they stack. Preview scale comes from a `ResizeObserver`.
- Native controls. Tabs follow the ARIA tabs pattern. One `role="status"` region.
- P8's `window.__bk` debug hook becomes a test-only hook, enabled with `?test` and stripped from production builds.

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

## 7. Build-time validation `[FR-B3, FR-I5]`
`npm run validate` runs before the build and in CI. It fails on any of these:
- An invalid schema (`tokens`, `variant`, `editor`).
- A `data-ed` on or inside a `.qr`, `.arroba`, contact URL or code-cat canvas.
- A face missing the main QR or `@KoboTheWolf`, or with either inside a `data-parte`.
- More than 4 font families declared per face.
- A catalog key missing in any language.

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
| Visual | Playwright screenshots | default faces against baselines generated from P8 with allowed art only (NFR-1) |
| Export | `kobo check-exports` | PNG and PDF from every variant, rendered in Chromium **and WebKit** |
| Code cat | `rustc --edition 2021` (pinned) | the extracted text compiles with no warnings |
| A11y | `@axe-core/playwright` | profile and panel, ES and EN: no serious or critical violations |

- **`ci.yml`** runs on every PR: `npm ci` → typecheck → validate → unit → build → E2E matrix → export checks → rustc → `npm audit` → gitleaks. Exports are uploaded as workflow artifacts.
- **E2E environment:** the E2E jobs run in Microsoft's Playwright image (`mcr.microsoft.com/playwright:v<version>-resolute`), pinned by digest, with browsers and system packages preinstalled. This avoids a slow `apt` step and gives the visual baselines the same fonts and libraries on every run. The tag must equal `@playwright/test`, and CI checks it.
- **`deploy.yml`** runs on push to `main`: the same gates, then `upload-pages-artifact` → `deploy-pages`.
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
| ajv | dev | compiles schemas into standalone validators at build time, so there is no runtime dependency |
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
| Sticker processing in a Worker in v1? | yes if `OffscreenCanvas` 2D works on all targets; otherwise main thread |
