# Changelog

All notable changes, grouped by conventional-commit type. One section per release; each line is a merged PR (its title is the merge commit on `main`).

## Unreleased

## v0.3.0 (2026-10-26): boykisser-uwu

Milestone M3 (boykisser-uwu): the style's cards as data, ready for the editor. The live site looks the same as v0.2.0; the editor UI that shows the cards arrives in M4 ([#14](https://github.com/Solenasth/kobothewolf.com/issues/14)).

### Features
- **styles:** port the code-cat `montar()`: the Rust program laid out inside the cat without splitting a token, closed OwO filler comments, drawn one letter at a time ([#45](https://github.com/Solenasth/kobothewolf.com/pull/45), closes [#13](https://github.com/Solenasth/kobothewolf.com/issues/13))
- **styles:** add the four boykisser-uwu variants (Certificado, Licencia, Gatito de código, Programming socks) as data, with English and Spanish labels; adding a variant needs no code change ([#44](https://github.com/Solenasth/kobothewolf.com/pull/44), closes [#12](https://github.com/Solenasth/kobothewolf.com/issues/12))
- **validate:** check style labels in every language, default backgrounds, face asset paths and mount scripts ([#44](https://github.com/Solenasth/kobothewolf.com/pull/44), [#45](https://github.com/Solenasth/kobothewolf.com/pull/45))
- **styles:** scope each variant's CSS to its own faces at build time ([#43](https://github.com/Solenasth/kobothewolf.com/pull/43), closes [#11](https://github.com/Solenasth/kobothewolf.com/issues/11))

### Chores
- **assets:** add the fonts, meme art, QR codes and `CREDITS.md`; published images keep only pixel data ([#42](https://github.com/Solenasth/kobothewolf.com/pull/42), closes [#10](https://github.com/Solenasth/kobothewolf.com/issues/10))

### Docs
- design revisions 13–16: asset and credits rules, CSS scoping, variants as data, the code-cat mount step ([#42](https://github.com/Solenasth/kobothewolf.com/pull/42)–[#45](https://github.com/Solenasth/kobothewolf.com/pull/45))
- decision [0006](docs/decisions/0006-css-scoping-not-shadow-dom.md): CSS scoping at build time instead of Shadow DOM ([#43](https://github.com/Solenasth/kobothewolf.com/pull/43))
- how to add a variant: [`docs/agregar-variante.md`](docs/agregar-variante.md) ([#44](https://github.com/Solenasth/kobothewolf.com/pull/44))

### CI and tests
- **ci:** compile and run the code-cat text from every browser with pinned Rust 1.99.1 and `-D warnings`; now a required check on `main` ([#45](https://github.com/Solenasth/kobothewolf.com/pull/45))
- **test:** fixture pages that check CSS isolation and every real face in Chromium, Firefox and WebKit ([#43](https://github.com/Solenasth/kobothewolf.com/pull/43), [#44](https://github.com/Solenasth/kobothewolf.com/pull/44))

## v0.2.0 (2026-10-26): core

Milestone M2 (core): the editor's engine, with no UI yet. The live site looks the same as v0.1.0; the editor UI arrives in M3.

### Features
- **core:** write a `pHYs` chunk so exported PNGs declare 300 dpi; malformed PNG bytes are rejected ([#39](https://github.com/Solenasth/kobothewolf.com/pull/39), closes [#9](https://github.com/Solenasth/kobothewolf.com/issues/9))
- **core:** port the die-cut sticker algorithm as pure functions, checked against the Python reference fixtures ([#38](https://github.com/Solenasth/kobothewolf.com/pull/38), closes [#8](https://github.com/Solenasth/kobothewolf.com/issues/8))
- **core:** document store with per-face state, validated values, local persistence, import/export and painting without parsing HTML ([#37](https://github.com/Solenasth/kobothewolf.com/pull/37), closes [#7](https://github.com/Solenasth/kobothewolf.com/issues/7))
- **core:** marks contract parser that reads a face's editable texts and pieces ([#36](https://github.com/Solenasth/kobothewolf.com/pull/36), closes [#6](https://github.com/Solenasth/kobothewolf.com/issues/6))
- **core:** JSON schemas, the boykisser-uwu style data, untrusted-document parsing with size, key and schema checks, and the build-time `validate` command ([#35](https://github.com/Solenasth/kobothewolf.com/pull/35), closes [#5](https://github.com/Solenasth/kobothewolf.com/issues/5))

### Docs
- design revisions 8–12: validation rules, marks contract ([`docs/marcas.md`](docs/marcas.md)), document store, sticker tolerance and Worker plan, `pHYs` writer ([#35](https://github.com/Solenasth/kobothewolf.com/pull/35)–[#39](https://github.com/Solenasth/kobothewolf.com/pull/39))
- correct FR-B3: the main QR and `@KoboTheWolf` rule applies to back faces ([#35](https://github.com/Solenasth/kobothewolf.com/pull/35))

## v0.1.0 (2026-10-26): placeholder live

Milestones M0 (bootstrap) and M1 (placeholder live): https://kobothewolf.com serves a bilingual profile with an inquiry form.

### Features
- **page:** inquiry and quote form that opens the visitor's email app; no backend, nothing stored ([#32](https://github.com/Solenasth/kobothewolf.com/pull/32), closes [#30](https://github.com/Solenasth/kobothewolf.com/issues/30))
- **page:** static bilingual profile in the boykisser-uwu style, language switch, CSP, metadata and 404 page ([#31](https://github.com/Solenasth/kobothewolf.com/pull/31), closes [#4](https://github.com/Solenasth/kobothewolf.com/issues/4))
- **i18n:** catalogs, `t()`, allow-listed language resolution and the `validate` catalog check ([#29](https://github.com/Solenasth/kobothewolf.com/pull/29), closes [#3](https://github.com/Solenasth/kobothewolf.com/issues/3))

### CI and build
- deploy to GitHub Pages on kobothewolf.com after CI passes on `main` ([#28](https://github.com/Solenasth/kobothewolf.com/pull/28), closes [#2](https://github.com/Solenasth/kobothewolf.com/issues/2))
- run E2E in the pinned Playwright container; E2E setup from up to 12 min down to under 40 s ([#27](https://github.com/Solenasth/kobothewolf.com/pull/27), closes [#26](https://github.com/Solenasth/kobothewolf.com/issues/26))
- toolchain (Vite, TypeScript, Preact), unit and three-engine E2E tests, CI with audit and gitleaks, required checks on `main` ([#23](https://github.com/Solenasth/kobothewolf.com/pull/23), closes [#1](https://github.com/Solenasth/kobothewolf.com/issues/1))

### Docs
- adopt the preserve-history policy: pushed commits are never rewritten ([#25](https://github.com/Solenasth/kobothewolf.com/pull/25), closes [#24](https://github.com/Solenasth/kobothewolf.com/issues/24))
- bootstrap: approved requirements and design, decision records 0001–0005, redacted origin specs, contribution rules, policies, issue and PR templates (`831be8f`)
