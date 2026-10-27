import { describe, expect, it } from 'vitest';
import tokens from '../styles/boykisser-uwu/tokens.json';
import { dilate, figureMask, fillHoles, makeSticker, MAX_SIDE, stickerOptions } from '../src/core/sticker';
import { readPng } from '../cli/png.ts';

const DIR = 'tests/fixtures/sticker';
const CASES = [
  { name: 'open-stroke', closedBottom: false },
  { name: 'cut-bottom', closedBottom: true },
  { name: 'filled-blob', closedBottom: false },
] as const;

/**
 * Tolerance, as edge distance in pixels. P8's port uses a square dilation and a
 * round border where Python uses a cross and a blurred square (fixtures README):
 * - figure masks agree within 2 px in both directions, IoU ≥ 0.97;
 * - the sticker never extends past Python's (≤ 1 px), and Python's square-cornered
 *   outline is within 4 px of ours.
 */
const FIGURE_PX = 2;
const OUTSIDE_PX = 1;
const CORNER_PX = 4;
const MIN_IOU = 0.97;

/** Smallest k such that every 1 in `b` lies within k px (square) of a 1 in `a`. */
function reach(a: Uint8Array, b: Uint8Array, w: number, h: number): number {
  for (let k = 0; k <= 16; k++) {
    const grown = dilate(a, w, h, k);
    if (b.every((v, i) => !v || grown[i])) return k;
  }
  return Infinity;
}

function iou(a: Uint8Array, b: Uint8Array) {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) both++;
    if (a[i] || b[i]) either++;
  }
  return both / either;
}

describe('FR-E6 sticker matches the Python reference within tolerance', () => {
  for (const { name, closedBottom } of CASES) {
    const input = readPng(`${DIR}/${name}.input.png`);
    const opts = stickerOptions(tokens.efectos_imagen, closedBottom);

    it(`${name}: figure mask within ${FIGURE_PX} px`, () => {
      const reference = readPng(`${DIR}/${name}.silueta.png`);
      const { width: w, height: h } = input;
      const ours = figureMask(input.data, w, h, opts);
      const theirs = new Uint8Array(w * h).map((_, i) => (reference.data[i * 4]! > 127 ? 1 : 0));
      expect(reach(ours, theirs, w, h)).toBeLessThanOrEqual(FIGURE_PX);
      expect(reach(theirs, ours, w, h)).toBeLessThanOrEqual(FIGURE_PX);
      expect(iou(ours, theirs)).toBeGreaterThanOrEqual(MIN_IOU);
    });

    it(`${name}: sticker outline and shadow within ${CORNER_PX} px, never outside`, () => {
      const reference = readPng(`${DIR}/${name}.sticker.png`);
      const result = makeSticker(input, opts);
      if (!result.ok) throw new Error(result.error.code);
      const { pixels, pad } = result;
      const refPad = 16 + 9 + 4; // efectos.sticker(): borde_px + max(sombra_off) + 4
      const { width: W, height: H } = reference;
      // Our alpha at each reference pixel, aligned on the figure.
      const alpha = (i: number) => {
        const x = (i % W) - refPad + pad;
        const y = Math.floor(i / W) - refPad + pad;
        return x >= 0 && y >= 0 && x < pixels.width && y < pixels.height ? pixels.data[(y * pixels.width + x) * 4 + 3]! : 0;
      };
      for (const test of [(a: number) => a === 255, (a: number) => a > 0] as const) {
        const ours = new Uint8Array(W * H).map((_, i) => (test(alpha(i)) ? 1 : 0));
        const theirs = new Uint8Array(W * H).map((_, i) => (test(reference.data[i * 4 + 3]!) ? 1 : 0));
        expect(reach(theirs, ours, W, H)).toBeLessThanOrEqual(OUTSIDE_PX);
        expect(reach(ours, theirs, W, H)).toBeLessThanOrEqual(CORNER_PX);
      }
    });
  }

  it('keeps the drawing inside the figure and fills its interior white', () => {
    const input = readPng(`${DIR}/open-stroke.input.png`);
    const result = makeSticker(input, stickerOptions(tokens.efectos_imagen, false));
    if (!result.ok) throw new Error(result.error.code);
    const { pixels, pad } = result;
    const pixel = (x: number, y: number) => [...pixels.data.subarray(((y + pad) * pixels.width + x + pad) * 4, ((y + pad) * pixels.width + x + pad) * 4 + 4)];
    expect(pixel(98, 96)).toEqual([43, 34, 51, 255]); // an eye, from the input
    expect(pixel(120, 130)).toEqual([255, 255, 255, 255]); // inside the head
    expect(pixel(-pad, -pad)).toEqual([0, 0, 0, 0]); // the corner stays transparent
  });

  it('uses the shadow color and alpha from the tokens', () => {
    const input = readPng(`${DIR}/filled-blob.input.png`);
    const result = makeSticker(input, stickerOptions(tokens.efectos_imagen, false));
    if (!result.ok) throw new Error(result.error.code);
    const { data } = result.pixels;
    const shadow = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 0 && data[i + 3]! < 255) shadow.push([...data.subarray(i, i + 4)]);
    expect(shadow.length).toBeGreaterThan(0);
    expect(new Set(shadow.map((p) => p.join()))).toEqual(new Set(['255,143,184,150']));
  });
});

describe('FR-E6 typed errors', () => {
  const opts = stickerOptions(tokens.efectos_imagen, false);
  const blank = (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4).fill(255) });

  it('rejects pixel data that does not match its size', () => {
    expect(makeSticker({ width: 10, height: 10, data: new Uint8ClampedArray(12) }, opts)).toEqual({
      ok: false,
      error: { code: 'invalid-pixels' },
    });
    expect(makeSticker({ width: 0, height: 5, data: new Uint8ClampedArray(0) }, opts)).toMatchObject({ ok: false });
  });

  it('rejects images over the size the caller must scale to', () => {
    expect(makeSticker(blank(MAX_SIDE + 1, 10), opts)).toEqual({ ok: false, error: { code: 'too-large' } });
  });

  it('reports an image with no drawing in it', () => {
    expect(makeSticker(blank(50, 40), opts)).toEqual({ ok: false, error: { code: 'no-figure' } });
  });

  it('treats transparent pixels as white paper', () => {
    const clear = { width: 50, height: 40, data: new Uint8ClampedArray(50 * 40 * 4) };
    expect(makeSticker(clear, opts)).toEqual({ ok: false, error: { code: 'no-figure' } });
  });
});

describe('FR-E6 mask helpers', () => {
  it('dilates with a square of radius r', () => {
    const m = new Uint8Array(25);
    m[12] = 1;
    expect([...dilate(m, 5, 5, 1)]).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
  });

  it('fills enclosed holes only', () => {
    const ring = new Uint8Array([1, 1, 1, 1, 0, 1, 1, 1, 1]);
    expect([...fillHoles(ring, 3, 3)]).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const open = new Uint8Array([1, 0, 1, 1, 0, 1, 1, 1, 1]);
    expect([...fillHoles(open, 3, 3)]).toEqual([1, 0, 1, 1, 0, 1, 1, 1, 1]);
  });
});

describe('NFR-5 the sticker code never touches the network', () => {
  it('has no fetch, XHR, WebSocket, beacon or dynamic import', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('src/core/sticker.ts', 'utf8');
    expect(source).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(/);
  });
});
