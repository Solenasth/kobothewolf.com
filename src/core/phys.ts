// Writes the print resolution into a PNG (FR-E14, DESIGN §5.5). html-to-image
// produces PNGs with no pHYs chunk, so print shops would assume 72 or 96 dpi.
// Works on the bytes alone: no DOM, no canvas.

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const INCHES_PER_METRE = 1 / 0.0254;

export type PhysError = { code: 'not-png' } | { code: 'malformed' };
export type PhysResult = { ok: true; png: Uint8Array } | { ok: false; error: PhysError };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 as PNG uses it (ISO 3309), over the chunk type and data. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 300 dpi → 11811 px/m: the nearest integer, which readers report as 300 dpi. */
export function dpiToPixelsPerMetre(dpi: number): number {
  return Math.round(dpi * INCHES_PER_METRE);
}

interface Chunk {
  type: string;
  /** Offset of the whole chunk (length field) and its total size. */
  start: number;
  size: number;
}

function readChunks(png: Uint8Array): Chunk[] | PhysError {
  if (png.length < SIGNATURE.length || SIGNATURE.some((b, i) => png[i] !== b)) return { code: 'not-png' };
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Chunk[] = [];
  let offset = SIGNATURE.length;
  while (offset < png.length) {
    if (offset + 12 > png.length) return { code: 'malformed' };
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > png.length) return { code: 'malformed' };
    const typeAndData = png.subarray(offset + 4, offset + 8 + length);
    if (crc32(typeAndData) !== view.getUint32(offset + 8 + length)) return { code: 'malformed' };
    const type = String.fromCharCode(...typeAndData.subarray(0, 4));
    chunks.push({ type, start: offset, size: end - offset });
    offset = end;
    if (type === 'IEND') break;
  }
  if (chunks[0]?.type !== 'IHDR' || chunks.at(-1)?.type !== 'IEND' || offset !== png.length) return { code: 'malformed' };
  return chunks;
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
