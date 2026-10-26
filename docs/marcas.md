# Marks contract (`marcas`)

How a face's HTML tells the editor what can change. Faces are plain HTML shared with the design source; anything without a mark is **not editable**. This contract is kept compatible with EV §3.3 (see [`origin/app-editor-spec.en.md`](origin/app-editor-spec.en.md)). The editor reads it with `readMarks()` in [`src/core/marks.ts`](../src/core/marks.ts), and `npm run validate` enforces the rules at the end.

Identifiers stay in Spanish, as in the design source (NFR-12). Values are **stable keys**: labels come from the catalogs, never from the HTML.

## Face root
| Mark | Meaning |
|---|---|
| `data-cara="<id>"` | The face root: the 960 × 560 canvas with bleed. Ids end in `-f` (front) or `-r` (back), e.g. `lic-f`, `lic-r`. Variant CSS is scoped under this attribute (DESIGN §5.1). |
| `.card` | The first child of the root: the 900 × 500 cut, placed at (30, 30). |

The editor adds `fondo-<key>` (the background) to the root and may set `--acento` and `--sombra` on it. Images and the code-cat mask point at the style's assets as `assets/<file>`; a `data-arte` image shows `assets/st-<key>.png` for one of the style's art keys (DESIGN §3.4).

## Marks
| Mark | Meaning | Editor control | Label |
|---|---|---|---|
| `data-ed="<key>"` | Editable text. Fields are numbered in document order; documents store texts by that number. | text field + show/hide (FR-E3) | `ed.<key>` (style catalog) |
| `data-bote` (+ `data-cls`) | The text is drawn letter by letter with the bounce effect; `data-cls` is the class for each letter's `<span>`. | same field | — |
| `data-arte="frente" \| "reverso"` | Swappable sticker `<img>`. | art select (FR-E5); piece `arte` | `piece.arte` (UI) |
| `data-rot="st" \| "tit"` | Rotation driven by the sticker or headline anti-rule. The authored angle's sign is kept (mirroring). | range (FR-E9) | — |
| `data-lazo` | The bow ornament; all bows on a face toggle together. | piece `lazo` | `piece.lazo` (UI) |
| `data-parte="<key>"` | Hideable piece. Elements with the same key hide together. | piece (FR-E4) | `parte.<key>` (style catalog) |
| `.washi` | Washi tape; each one is its own piece. Its `--r` angle sign is kept. | piece `washi-<n>`, angle range | `piece.washi` with `{n}` (UI) |
| `.spark` | Sparkle; the first N are shown. | count range, up to the face's total | — |

Pieces are listed in this order: `data-parte` groups (first appearance), the sticker, the bow, then each washi tape, matching P8.

## Locked (never editable, never hidden on their own)
- Anything with class `.qr`, `.arroba` or `.url`, or a `<canvas>` (the code cat), and everything inside them.
- Any element whose text is contact data: `@KoboTheWolf`, `t.me/…`, `kobothewolf.com`.

A `data-ed` on a locked element is ignored by the editor and rejected by `validate`.

## Optional contact blocks
A `data-parte` block may contain locked elements; it then shows or hides **as a whole** (FR-E12), and its own `data-ed` texts stay editable. Today that's the site block (`.sitio`, key `Sitio (QR + texto)`): the invitation texts are editable, the site QR and `kobothewolf.com` aren't.

## Rules checked by `npm run validate` (FR-B3)
- Every **back** (`-r`) has exactly one **main QR** (a `.qr` outside any `data-parte`) and `@KoboTheWolf` outside any `data-parte`. Fronts may omit both, since any front can pair with any back.
- No `data-ed` on or inside a locked element, and none on contact text.
- No `data-parte` key equal to a built-in piece key (`arte`, `lazo`, `washi-<n>`).
- Each face id in a variant's `variant.json` exists in its `caras.html`.
- Every `assets/` path exists, and every key above has a label in each language of the style catalogs.

The **≤ 4 fonts per face** limit is checked on rendered faces, not here (DESIGN §7).
