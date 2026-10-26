# 0004: One bilingual page, profile above the editor, in the editor's style

**Date:** 2026-10-25 · **Status:** Accepted

## Context
The first plan had a separate landing page at `/` and the editor at `/editor/`. Kobo wants one page for now:
- A provisional profile (contact and general experience) above the editor, to be polished later.
- The whole page in the editor's playful style.
- Spanish and English with a language selector.

## Options considered
1. Two pages (landing and editor) with a neutral landing style.
2. **One page:** profile on top, editor below, shared style, client-side ES/EN.
3. One page per language (`/es/`, `/en/`), prerendered.

## Decision
Option 2.
- English static HTML for the profile, so it works without JavaScript and crawlers can read it.
- Hydration applies the resolved language.
- The editor loads lazily below the profile.
- Translations are plain JSON catalogs with a small `t()`, with no i18n library.
- `data-ed` and `data-parte` values become label keys, keeping the design-source contract.

## Consequences
- Simpler navigation; the QR lands directly where the editor is.
- A Spanish visitor's search-engine snippet stays English until per-language URLs exist (option 3 is still possible later).
- Every user-facing string, including style labels and export file names, needs both catalogs. CI enforces key parity.
