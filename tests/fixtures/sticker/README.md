# Sticker fixtures

Reference data for `src/core/sticker.ts` (FR-E6). The inputs are synthetic line drawings, not artwork. They were drawn and processed with the private asset tooling (`efectos.py`: `silueta()` and `sticker()`, Python 3.11, numpy 2.4.6, scipy 1.17.1, Pillow 13.0.0). Only the inputs and outputs are committed; the tooling stays in the design source (REQUIREMENTS §7).

| Case | What it exercises | Python call |
|---|---|---|
| `open-stroke` | a cat head with a 6 px gap in its outline and two eyes | `cerrar=""` |
| `cut-bottom` | a body cut off by the bottom edge, with one eye | `cerrar="b"` (the editor's "cut off at the bottom") |
| `filled-blob` | a pink filled shape with a white hole inside | `cerrar=""` |

For each case:
- `<case>.input.png`: the drawing (RGB).
- `<case>.silueta.png`: the figure mask (L, 255 = figure).
- `<case>.sticker.png`: the finished sticker (RGBA).

Parameters for every case: `umbral=225`, `cierre_px=5`, `borde_px=16`, `sombra=(255, 143, 184, 150)`, `sombra_off=(7, 9)`, as in `styles/boykisser-uwu/tokens.json`.

The editor ports P8's browser version, which differs from Python on purpose:
- dilation is square, not cross-shaped;
- the border grows by alternating 4- and 8-neighborhoods instead of max-filter, blur and threshold;
- the canvas padding is 28 px, not 29.

So the tests compare footprints with a tolerance (see `tests/sticker.test.ts`) instead of expecting identical pixels.
