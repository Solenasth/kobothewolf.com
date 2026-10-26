# Changelog

All notable changes, grouped by conventional-commit type. One section per release; each line is a merged PR (its title is the merge commit on `main`).

## Unreleased

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
