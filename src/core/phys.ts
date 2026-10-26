// Writes the print resolution into a PNG (FR-E14, DESIGN §5.5). html-to-image
// produces PNGs with no pHYs chunk, so print shops would assume 72 or 96 dpi.
// Works on the bytes alone: no DOM, no canvas.

import { crc32, readChunks, SIGNATURE, type PngError } from './png';

const INCHES_PER_METRE = 1 / 0.0254;

export type PhysError = PngError;
export type PhysResult = { ok: true; png: Uint8Array } | { ok: false; error: PhysError };

/** 300 dpi → 11811 px/m: the nearest integer, which readers report as 300 dpi. */
export function dpiToPixelsPerMetre(dpi: number): number {
  return Math.round(dpi * INCHES_PER_METRE);
}

function physChunk(pixelsPerMetre: number): Uint8Array {
  const chunk = new Uint8Array(12 + 9);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, pixelsPerMetre);
  view.setUint32(12, pixelsPerMetre);
  chunk[16] = 1; // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  return chunk;
}

/** Returns a copy of `png` with exactly one pHYs chunk, right after IHDR, declaring `dpi`. */
export function setDpi(png: Uint8Array, dpi: number): PhysResult {
  const pixelsPerMetre = dpiToPixelsPerMetre(dpi);
  // PNG stores px/m as a 31-bit unsigned value; 0 would mean "unknown".
  if (!(pixelsPerMetre >= 1 && pixelsPerMetre <= 0x7fffffff)) throw new RangeError(`dpi out of range: ${dpi}`);
  const chunks = readChunks(png);
  if (!Array.isArray(chunks)) return { ok: false, error: chunks };
  const phys = physChunk(pixelsPerMetre);
  const kept = chunks.filter((c) => c.type !== 'pHYs');
  const size = SIGNATURE.length + phys.length + kept.reduce((sum, c) => sum + c.size, 0);
  const out = new Uint8Array(size);
  out.set(SIGNATURE);
  let offset = SIGNATURE.length;
  for (const chunk of kept) {
    out.set(png.subarray(chunk.start, chunk.start + chunk.size), offset);
    offset += chunk.size;
    if (chunk.type === 'IHDR') {
      out.set(phys, offset);
      offset += phys.length;
    }
  }
  return { ok: true, png: out };
}
