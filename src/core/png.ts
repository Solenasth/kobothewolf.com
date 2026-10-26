// PNG chunk reading shared by the pHYs writer (FR-E14) and the build-time asset
// check (NFR-5, DESIGN §7). Bytes only: no DOM, no Node APIs.

export const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type PngError = { code: 'not-png' } | { code: 'malformed' };

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

export interface Chunk {
  type: string;
  /** Offset of the whole chunk (length field) and its total size. */
  start: number;
  size: number;
}

/** Every chunk, checked: signature, lengths, CRCs, IHDR first, IEND last, nothing after it. */
export function readChunks(png: Uint8Array): Chunk[] | PngError {
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
