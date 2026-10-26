# 0001: v1 scope is the full rebuild

**Date:** 2026-10-25 · **Status:** Accepted

## Context
Two input specs disagree on scope:
- GP ports the single 4 MB prototype HTML file as is, adding a download shim and vendored libraries.
- EV rebuilds it as a TypeScript app with data-driven variants, tests and a CLI.

The site is a public freelance showcase, so the repository is part of what's being shown.

## Options considered
1. **Minimal port** (GP): fastest, but a 4 MB file with inlined data URIs makes a poor showcase.
2. **Clean port**: split the file into source files, add tests, no framework.
3. **Full rebuild** (EV): typed core, data-driven variants, Preact UI, CLI, three-engine CI.

## Decision
Option 3. The architecture follows EV, with the deviations recorded in DESIGN.md.

## Consequences
- Weeks of work instead of days. M1 puts a placeholder page live early, so printed QR codes resolve in the meantime.
- Adding variants, styles and languages becomes data-only work.
- More dependencies to justify and audit.
