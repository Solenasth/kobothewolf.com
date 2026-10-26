# Adding a variant (`agregar-variante`)

A variant is data only: no editor code changes (FR-E18). This is the whole checklist for a variant `<v>` of style `<estilo>`.

## 1. Files
Create `styles/<estilo>/variantes/<v>/` with:

| File | What it holds |
|---|---|
| `variant.json` | The manifest ([`schemas/variant.schema.json`](../schemas/variant.schema.json), DESIGN §3.4): `id` (the folder name), `orden` (tab position), the two face ids, their default backgrounds, the export file prefix, the controls and the checks. |
| `caras.html` | The two faces, each a `<div data-cara="<id>">` root with a `.card` inside, marked as in [`marcas.md`](marcas.md). |
| `caras.css` | The variant's CSS. Write plain class selectors (`.foto`, not `#xx-f .foto`) and `&` for the face root: the build scopes the file to these two faces. No `@font-face`, `@keyframes`, `@import`, `:root`, `html` or `body` (DESIGN §5.1). |
| `montar.ts` | Optional: an `async montar(cara)` step for faces drawn by code, named in `variant.json` → `montar` (DESIGN §5.4). |

Face ids are `<short>-f` and `<short>-r`, unique across the style.

## 2. Assets
Images go in `styles/<estilo>/assets/` and are referenced as `assets/<file>`.
- A new sticker is an art key: add `<key>` to `editor.json` → `arte` and the file `assets/st-<key>.png`.
- Strip the PNG metadata (`node scripts/strip-png.ts <file>`) and list the file in [`CREDITS.md`](../CREDITS.md).

## 3. Labels
Add to **every** `styles/<estilo>/i18n/<lang>.json`:
- `variant.<v>.name`, `face.<v-front-id>.name`, `face.<v-back-id>.name`;
- `ed.<key>` for each new `data-ed` value and `parte.<key>` for each new `data-parte` value;
- `arte.<key>` for each new art key.

Card text stays as authored in every language (FR-I6); only the labels around it are translated.

## 4. Check
```bash
npm run validate      # schema, marks, contact, assets, labels
npm run test:e2e      # the faces fixture page: size, images, fonts, console
```
`validate` names the file and the missing key or mark for every problem it finds.
