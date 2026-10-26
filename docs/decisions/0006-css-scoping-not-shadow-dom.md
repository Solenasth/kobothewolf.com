# 0006: Scope face CSS at build time instead of using Shadow DOM

**Date:** 2026-10-26 · **Status:** Accepted

## Context
Each variant brings its own CSS, and P8's variants reuse class names (`.qr`, `.cred`, `.marco`, `.titulo`). P8 avoided collisions with hand-written id prefixes (`#cer-f .papel`), which is easy to forget and lets a missing prefix leak styles into other faces or the page (EV §10). EV §6.1 proposed a Shadow DOM per face. The export pipeline, html-to-image, serializes computed styles from the normal DOM and does not carry shadow-root styles, so every export would need to clone the face out of its shadow root first.

## Options considered
1. **Shadow DOM per face** (EV §6.1): real isolation, but an extra clone-out step on every export, with fidelity risk (fonts, `::before`, the WebKit shadow fix), plus a vector pipeline that would have to do the same.
2. **Hand-written prefixes** as in P8: no tooling, but nothing enforces them.
3. **Build-time scoping:** a Vite plugin wraps each CSS file in native nesting under its faces' `data-cara` selector, and Lightning CSS (already bundled with Vite 8) flattens it. The plugin then re-parses its own output and fails the build if any rule escaped the scope.
4. CSS Modules: renames classes, which breaks the class names that `caras.html`, the marks contract and the export checks rely on.

## Decision
Option 3.
- A style's shared `caras.css` is scoped under `[data-cara]` (every face, never the page). A variant's `caras.css` is scoped under `:is([data-cara="<frente>"], [data-cara="<reverso>"])`, taken from its `variant.json`.
- Face CSS writes `&` for the face root. Rules that are global by nature, or that would silently match nothing once scoped, are build errors: `@font-face`, `@keyframes`, `@import`, `@layer`, `@property`, `@page`, `@scope` and any other at-rule except `@media`, `@supports`, `@container` and `@starting-style`, plus `:root`, `:host`, `:scope`, `html` and `body`. Fonts are declared once, outside face CSS.
- `lightningcss` is declared as an exact-pinned dev dependency at the version Vite already installs, so the lockfile gains no new package.

## Consequences
- Faces stay in the normal DOM: html-to-image and the vector PDF path work as in P8, with no clone-out step.
- Isolation is enforced by the build, not by convention. Class names stay readable in the DOM and in exports.
- Scoped selectors gain one attribute of specificity, the same for every face, so relative order inside a file is unchanged.
- Page CSS can still reach into faces (global selectors such as `*`). The page stylesheet (`src/theme/ui.css`) must keep its selectors off `[data-cara]` subtrees. A later check can enforce this if it becomes a problem.
- When Lightning CSS is upgraded with Vite, the dev dependency moves with it in the same commit.
