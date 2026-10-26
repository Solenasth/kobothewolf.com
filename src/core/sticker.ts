// Turns a drawing into a die-cut sticker (FR-E6, EV §6.3), ported from P8's
// sticker() + fondoBlanco() as pure functions over RGBA buffers and 0/1 masks.
// No DOM and no network: decoding and scaling to ≤ 700 px happen in the caller,
// and the result goes back to a canvas there (#16). Python reference:
// efectos.py silueta() + sticker() + fondo_blanco(); see tests/fixtures/sticker.

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row by row. */
  data: Uint8ClampedArray;
}

export interface StickerOptions {
  /** Gray level below which a pixel is ink (tokens: silueta.umbral). */
  threshold: number;
  /** Ink dilation that closes gaps in the stroke, undone on the figure (silueta.cierre_px). */
  closePx: number;
  /** White border width (sticker.borde_px). */
  borderPx: number;
  /** Flat shadow color and alpha (sticker.sombra). */
  shadow: readonly [r: number, g: number, b: number, a: number];
  /** Shadow offset (sticker.sombra_off). */
  shadowOffset: readonly [x: number, y: number];
  /** The figure is cut by the bottom edge: treat that edge as closed. */
  closedBottom: boolean;
}

export type StickerError = { code: 'invalid-pixels' } | { code: 'too-large' } | { code: 'no-figure' };
export type StickerResult = { ok: true; pixels: Pixels; pad: number } | { ok: false; error: StickerError };

export const MAX_SIDE = 700;
/** Edge band painted white first: screenshots often bring a dark frame (P8). */
const MARGIN_FRACTION = 0.01;
/** Closing radius of the white fill, as a fraction of the longer side (fondo_blanco). */
const WHITE_FILL_CLOSE = 0.03;

interface StickerTokens {
  silueta: { umbral: number; cierre_px: number };
  sticker: { borde_px: number; sombra: number[]; sombra_off: number[] };
}

export function stickerOptions(efectos: StickerTokens, closedBottom: boolean): StickerOptions {
  const [r = 255, g = 143, b = 184, a = 150] = efectos.sticker.sombra;
  const [x = 7, y = 9] = efectos.sticker.sombra_off;
  return {
    threshold: efectos.silueta.umbral,
    closePx: efectos.silueta.cierre_px,
    borderPx: efectos.sticker.borde_px,
    shadow: [r, g, b, a],
    shadowOffset: [x, y],
    closedBottom,
  };
}

/** Square (box) dilation by radius r, separable: O(w·h) whatever r is. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const rows = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let count = 0;
    const row = y * w;
    for (let x = -r; x < w; x++) {
      if (x + r < w && mask[row + x + r]) count++;
      if (x - r - 1 >= 0 && mask[row + x - r - 1]) count--;
      if (x >= 0) rows[row + x] = count > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let y = -r; y < h; y++) {
      if (y + r < h && rows[(y + r) * w + x]) count++;
      if (y - r - 1 >= 0 && rows[(y - r - 1) * w + x]) count--;
      if (y >= 0) out[y * w + x] = count > 0 ? 1 : 0;
    }
  }
  return out;
}

const invert = (mask: Uint8Array) => mask.map((v) => (v ? 0 : 1));

/** 1 for every 0-pixel reachable from the given edge seeds through 0-pixels (4-connected). */
function floodFromEdges(mask: Uint8Array, w: number, h: number, edges: { top: boolean; bottom: boolean }): Uint8Array {
  const reached = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (i: number) => {
    if (!mask[i] && !reached[i]) {
      reached[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    if (edges.top) seed(x);
    if (edges.bottom) seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++]!;
    const y = (i / w) | 0;
    const x = i - y * w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (y > 0) seed(i - w);
    if (y < h - 1) seed(i + w);
  }
  return reached;
}

/** Fills enclosed holes of a 1-mask. */
export function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  return invert(floodFromEdges(mask, w, h, { top: true, bottom: true }));
}

/** Composites over white and paints the edge margin white, as P8 did on its canvas. */
function flattenOverWhite(px: Pixels): Uint8ClampedArray {
  const { width: w, height: h } = px;
  const rgba = new Uint8ClampedArray(px.data);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3]! / 255;
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = rgba[i * 4 + c]! * a + 255 * (1 - a);
    rgba[i * 4 + 3] = 255;
  }
  const margin = Math.max(2, Math.round(MARGIN_FRACTION * Math.max(w, h)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < margin || y < margin || x >= w - margin || y >= h - margin) rgba.fill(255, (y * w + x) * 4, (y * w + x) * 4 + 3);
    }
  }
  return rgba;
}

/** The figure: everything that isn't light background connected to an open edge. */
export function figureMask(rgba: Uint8ClampedArray, w: number, h: number, opts: StickerOptions): Uint8Array {
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const gray = 0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!;
    ink[i] = gray < opts.threshold ? 1 : 0;
  }
  const closed = dilate(ink, w, h, opts.closePx);
  if (opts.closedBottom) closed.fill(1, (h - 1) * w);
  const background = floodFromEdges(closed, w, h, { top: true, bottom: !opts.closedBottom });
  // Give back the thickness the closing added: erode the figure by closePx.
  return invert(dilate(background, w, h, opts.closePx));
}

/** Grows a mask by `steps`, alternating 4- and 8-neighborhoods (≈ a disk). */
function growRound(mask: Uint8Array, w: number, h: number, steps: number): Uint8Array {
  let current = mask;
  for (let step = 0; step < steps; step++) {
    const next = new Uint8Array(w * h);
    const diagonal = step % 2 === 1;
    for (let i = 0; i < w * h; i++) {
      if (current[i]) {
        next[i] = 1;
        continue;
      }
      const y = (i / w) | 0;
      const x = i - y * w;
      const left = x > 0;
      const right = x < w - 1;
      const up = y > 0;
      const down = y < h - 1;
      if (
        (left && current[i - 1]) ||
        (right && current[i + 1]) ||
        (up && current[i - w]) ||
        (down && current[i + w]) ||
        (diagonal &&
          ((left && up && current[i - w - 1]) ||
            (right && down && current[i + w + 1]) ||
            (left && down && current[i + w - 1]) ||
            (right && up && current[i - w + 1])))
      ) {
        next[i] = 1;
      }
    }
    current = next;
  }
  return current;
}

/** Inside the sticker's own closed shape, every pixel that isn't opaque turns white (fondo_blanco). */
export function whiteFill(px: Pixels): Pixels {
  const { width: w, height: h } = px;
  const data = new Uint8ClampedArray(px.data);
  const core = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) core[i] = data[i * 4 + 3] === 255 ? 1 : 0;
  const r = Math.max(1, Math.round(WHITE_FILL_CLOSE * Math.max(w, h)));
  const closed = invert(dilate(invert(dilate(core, w, h, r)), w, h, r));
  for (let i = 0; i < w * h; i++) closed[i] = closed[i]! | core[i]!;
  const shape = fillHoles(closed, w, h);
  for (let i = 0; i < w * h; i++) {
    if (shape[i] && data[i * 4 + 3]! < 255) data.fill(255, i * 4, i * 4 + 4);
  }
  return { width: w, height: h, data };
}

/** The whole recipe: figure → white border → flat shadow → white fill. */
export function makeSticker(px: Pixels, opts: StickerOptions): StickerResult {
  const { width: w, height: h } = px;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || px.data.length !== w * h * 4) {
    return { ok: false, error: { code: 'invalid-pixels' } };
  }
  if (Math.max(w, h) > MAX_SIDE) return { ok: false, error: { code: 'too-large' } };

  const rgba = flattenOverWhite(px);
  const figure = figureMask(rgba, w, h, opts);
  if (!figure.some((v) => v)) return { ok: false, error: { code: 'no-figure' } };

  const pad = opts.borderPx + 12;
  const W = w + 2 * pad;
  const H = h + 2 * pad;
  const placed = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) placed.set(figure.subarray(y * w, y * w + w), (y + pad) * W + pad);
  const border = growRound(placed, W, H, opts.borderPx);

  const [ox, oy] = opts.shadowOffset;
  const [sr, sg, sb, sa] = opts.shadow;
  const outW = W + ox;
  const outH = H + oy;
  const out = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const o = (y * outW + x) * 4;
      const inner = x < W && y < H ? y * W + x : -1;
      if (inner >= 0 && placed[inner]) {
        const src = ((y - pad) * w + (x - pad)) * 4;
        out.set(rgba.subarray(src, src + 3), o);
        out[o + 3] = 255;
      } else if (inner >= 0 && border[inner]) {
        out.fill(255, o, o + 4);
      } else if (x >= ox && y >= oy && border[(y - oy) * W + (x - ox)]) {
        out[o] = sr;
        out[o + 1] = sg;
        out[o + 2] = sb;
        out[o + 3] = sa;
      }
    }
  }
  return { ok: true, pixels: whiteFill({ width: outW, height: outH, data: out }), pad };
}
