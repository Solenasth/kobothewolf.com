// Which characters a font has (FR-B2, DESIGN §9): the cmap of a WOFF2 font, the
// format the site ships, with its brotli stream through Node's zlib. Only cmap
// is read, so this needs no font library. Formats 4 and 12, which every Unicode
// font carries; a font with neither is rejected.
import { brotliDecompressSync } from 'node:zlib';

// WOFF2 known-table tags, in the spec's order (index = flags & 63).
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH',
  'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];

function tag(view: DataView, at: number): string {
  return String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));
}

/** The raw cmap table of a WOFF2 font. */
function woff2Cmap(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (tag(view, 4) === 'ttcf') throw new Error('font-cmap: WOFF2 collections are not supported');
  const numTables = view.getUint16(12);
  const compressedSize = view.getUint32(20);
  let at = 48;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = view.getUint8(at++);
      value = value * 128 + (byte & 127);
      if (!(byte & 128)) return value;
    }
    throw new Error('font-cmap: bad UIntBase128');
  };
  const tables: { tag: string; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = view.getUint8(at++);
    const name = (flags & 63) === 63 ? tag(view, (at += 4) - 4) : KNOWN_TAGS[flags & 63]!;
    const version = flags >> 6;
    const origLength = base128();
    // glyf and loca are transformed at version 0; every other table only at a non-zero version.
    const transformed = name === 'glyf' || name === 'loca' ? version === 0 : version !== 0;
    tables.push({ tag: name, length: transformed ? base128() : origLength });
  }
  const data = brotliDecompressSync(bytes.subarray(at, at + compressedSize));
  let offset = 0;
  for (const table of tables) {
    if (table.tag === 'cmap') return data.subarray(offset, offset + table.length);
    offset += table.length;
  }
  throw new Error('font-cmap: no cmap table');
}

/** A test for whether the font maps a code point to a real glyph (not .notdef). */
export function fontCoverage(bytes: Uint8Array): (codePoint: number) => boolean {
  if (new TextDecoder('latin1').decode(bytes.subarray(0, 4)) !== 'wOF2') throw new Error('font-cmap: not a WOFF2 font');
  const cmap = woff2Cmap(bytes);
  const view = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
  const subtables = new Map<string, number>();
  for (let i = 0, n = view.getUint16(2); i < n; i++) {
    const offset = view.getUint32(4 + i * 8 + 4);
    subtables.set(`${view.getUint16(4 + i * 8)}.${view.getUint16(4 + i * 8 + 2)}.${view.getUint16(offset)}`, offset);
  }
  const format12 = subtables.get('3.10.12') ?? subtables.get('0.4.12') ?? subtables.get('0.6.12');
  if (format12 !== undefined) {
    const groups: [number, number, number][] = [];
    for (let i = 0, n = view.getUint32(format12 + 12); i < n; i++) {
      const g = format12 + 16 + i * 12;
      groups.push([view.getUint32(g), view.getUint32(g + 4), view.getUint32(g + 8)]);
    }
    return (cp) => groups.some(([start, end, glyph]) => cp >= start && cp <= end && glyph + cp - start !== 0);
  }
  const format4 = subtables.get('3.1.4') ?? subtables.get('0.3.4') ?? subtables.get('0.4.4');
  if (format4 === undefined) throw new Error('font-cmap: no Unicode cmap subtable (format 4 or 12)');
  const segments = view.getUint16(format4 + 6) / 2;
  const ends = format4 + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const rangeOffsets = deltas + segments * 2;
  return (cp) => {
    if (cp > 0xffff) return false;
    for (let s = 0; s < segments; s++) {
      if (cp > view.getUint16(ends + s * 2)) continue;
      const start = view.getUint16(starts + s * 2);
      if (cp < start) return false;
      const delta = view.getUint16(deltas + s * 2);
      const rangeOffset = view.getUint16(rangeOffsets + s * 2);
      if (rangeOffset === 0) return ((cp + delta) & 0xffff) !== 0;
      const glyph = view.getUint16(rangeOffsets + s * 2 + rangeOffset + (cp - start) * 2);
      return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
    }
    return false;
  };
}
