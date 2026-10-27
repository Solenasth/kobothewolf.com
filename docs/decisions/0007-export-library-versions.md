# 0007: Bundle current export libraries instead of P8's CDN versions

**Date:** 2026-10-26 · **Status:** Accepted

## Context
P8 exported with **html-to-image 1.11.11** and **jsPDF 2.5.1**, both loaded from public CDNs. The site's Content Security Policy allows scripts from its own origin only (`script-src 'self'`, DESIGN §8), and dependencies must be pinned, locked and audited (dependency-hygiene). `npm audit` on 2026-10-25 reported jsPDF 2.5.1 with 1 critical and 1 high advisory, through its `dompurify` dependency.

## Options considered
1. **Keep P8's CDN scripts:** the same output as P8, but it breaks the CSP, adds third-party requests (T-SEC-4), and ships a jsPDF version with known advisories.
2. **Bundle P8's exact versions from npm:** keeps the CSP, but jsPDF 2.5.1 still fails `npm audit`.
3. **Bundle the current versions from npm:** html-to-image 1.11.13 (the latest; MIT; no dependencies) and jsPDF 4.2.1 (dependencies `@babel/runtime`, `fflate`, `fast-png`). Both audit clean with the rest of the tree.
4. **Another renderer** (for example `modern-screenshot`, or drawing faces to canvas by hand): unproven against these faces and a larger rewrite, with no gain for the current requirements.

## Decision
Option 3, pinned exactly in `package.json` and the lockfile, and served from the site's own origin.
- They load as a separate chunk the editor imports on demand (DESIGN §5.5): html-to-image with PNG export (#17), jsPDF with the print PDF (#18).
- P8's `sombrasADivs()` WebKit fix and its render settings (960 × 560 → 1134 × 661, pixel ratio 1) are kept as they were.

## Consequences
- No third-party requests, and the CSP stays as it is.
- Output has to be verified again rather than assumed from P8: the E2E tests check size and dpi, and the export checks (#19) check the QR codes, fonts and page size.
- Future upgrades follow dependency-hygiene: one PR, audit clean, and the export checks re-run.
- If a library fails to load, export is unavailable and says so; the editor still works (FR-E15).
