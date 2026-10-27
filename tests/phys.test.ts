import { readFileSync } from 'node:fs';
import { crc32 as zlibCrc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { dpiToPixelsPerMetre, setDpi } from '../src/core/phys';
import { crc32 } from '../src/core/png';
import { readPng } from '../cli/png.ts';

const FIXTURE = 'tests/fixtures/sticker/filled-blob.sticker.png';

interface ParsedChunk {
  type: string;
  data: Buffer;
  crcOk: boolean;
}

// Independent of phys.ts: Node's zlib CRC-32 checks every chunk.
function chunks(png: Uint8Array): ParsedChunk[] {
  const buf = Buffer.from(png);
  const out: ParsedChunk[] = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const crcOk = zlibCrc32(buf.subarray(offset + 4, offset + 8 + length)) === buf.readUInt32BE(offset + 8 + length);
    out.push({ type, data, crcOk });
    offset += length + 12;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(zlibCrc32(body), body.length + 4);
  return out;
}

function physData(pixelsPerMetre: number, unit: number): Buffer {
  const data = Buffer.alloc(9);
  data.writeUInt32BE(pixelsPerMetre, 0);
  data.writeUInt32BE(pixelsPerMetre, 4);
  data[8] = unit;
  return data;
}

/** Splices extra chunks into a PNG after the chunk at `afterIndex`. */
function withChunks(png: Uint8Array, afterIndex: number, extra: Buffer[]): Uint8Array {
  const parsed = chunks(png);
  const parts: Buffer[] = [Buffer.from(png.subarray(0, 8))];
  parsed.forEach((c, i) => {
    parts.push(chunk(c.type, c.data));
    if (i === afterIndex) parts.push(...extra);
  });
  return new Uint8Array(Buffer.concat(parts));
}

function dpiOf(png: Uint8Array): number {
  const phys = chunks(png).find((c) => c.type === 'pHYs')!;
  expect(phys.data[8]).toBe(1);
  return Math.round(phys.data.readUInt32BE(0) * 0.0254);
}

const original = new Uint8Array(readFileSync(FIXTURE));

describe('FR-E14 crc32 matches the PNG CRC', () => {
  it('agrees with known values and with zlib', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
    const bytes = new Uint8Array(4096).map((_, i) => (i * 7919 + 13) & 0xff);
    expect(crc32(bytes)).toBe(zlibCrc32(bytes));
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('FR-E14 300 dpi in px/m', () => {
  it('stores 300 dpi as 11811 px/m, which reads back as 300 dpi', () => {
    expect(dpiToPixelsPerMetre(300)).toBe(11811);
    expect(Math.round(11811 * 0.0254)).toBe(300);
  });
});

describe('FR-E14 setDpi writes one pHYs chunk', () => {
  it('starts from a PNG with no pHYs', () => {
    expect(chunks(original).some((c) => c.type === 'pHYs')).toBe(false);
  });

  it('inserts pHYs right after IHDR with a valid CRC', () => {
    const result = setDpi(original, 300);
    if (!result.ok) throw new Error(result.error.code);
    const parsed = chunks(result.png);
    expect(parsed.map((c) => c.type).slice(0, 2)).toEqual(['IHDR', 'pHYs']);
    expect(parsed.every((c) => c.crcOk)).toBe(true);
    expect(parsed.filter((c) => c.type === 'pHYs')).toHaveLength(1);
    const phys = parsed[1]!;
    expect(phys.data).toEqual(physData(11811, 1));
    expect(dpiOf(result.png)).toBe(300);
    expect(result.png.length).toBe(original.length + 21);
  });

  it('keeps every other chunk and the pixels unchanged', () => {
    const result = setDpi(original, 300);
    if (!result.ok) throw new Error(result.error.code);
    const before = chunks(original);
    const after = chunks(result.png).filter((c) => c.type !== 'pHYs');
    expect(after.map((c) => [c.type, c.data])).toEqual(before.map((c) => [c.type, c.data]));
    expect(readPng(result.png)).toEqual(readPng(original));
  });

  it('replaces existing pHYs chunks instead of adding another', () => {
    const at72 = chunk('pHYs', physData(2835, 1));
    const unitless = chunk('pHYs', physData(1, 0));
    const input = withChunks(original, 0, [at72, unitless]);
    expect(chunks(input).filter((c) => c.type === 'pHYs')).toHaveLength(2);
    const result = setDpi(input, 300);
    if (!result.ok) throw new Error(result.error.code);
    const types = chunks(result.png).map((c) => c.type);
    expect(types.filter((t) => t === 'pHYs')).toHaveLength(1);
    expect(types.indexOf('pHYs')).toBe(1);
    expect(dpiOf(result.png)).toBe(300);
    expect(result).toEqual(setDpi(original, 300));
  });

  it('is idempotent', () => {
    const once = setDpi(original, 300);
    if (!once.ok) throw new Error(once.error.code);
    const twice = setDpi(once.png, 300);
    if (!twice.ok) throw new Error(twice.error.code);
    expect(twice.png).toEqual(once.png);
  });

  it('does not modify its input', () => {
    const copy = original.slice();
    setDpi(copy, 300);
    expect(copy).toEqual(original);
  });

  it('works on a view into a larger buffer', () => {
    const padded = new Uint8Array(original.length + 10);
    padded.set(original, 5);
    const result = setDpi(padded.subarray(5, 5 + original.length), 300);
    expect(result.ok).toBe(true);
  });
});

describe('FR-E14 setDpi rejects bytes that are not a well-formed PNG', () => {
  const rejects = (bytes: Uint8Array, code: string) => expect(setDpi(bytes, 300)).toEqual({ ok: false, error: { code } });

  it('rejects a missing or wrong signature', () => {
    rejects(new Uint8Array(), 'not-png');
    rejects(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'not-png');
    const jpeg = original.slice();
    jpeg.set([0xff, 0xd8, 0xff, 0xe0]);
    rejects(jpeg, 'not-png');
  });

  it('rejects a truncated file', () => {
    rejects(original.subarray(0, 8), 'malformed');
    rejects(original.subarray(0, original.length - 1), 'malformed');
    rejects(original.subarray(0, 40), 'malformed');
  });

  it('rejects a chunk with a bad CRC', () => {
    const bad = original.slice();
    bad[16] = bad[16]! ^ 0xff; // a byte inside IHDR's data
    rejects(bad, 'malformed');
  });

  it('rejects a PNG whose first chunk is not IHDR', () => {
    const parsed = chunks(original);
    const swapped = Buffer.concat([
      Buffer.from(original.subarray(0, 8)),
      chunk('tEXt', new TextEncoder().encode('k\0v')),
      ...parsed.map((c) => chunk(c.type, c.data)),
    ]);
    rejects(new Uint8Array(swapped), 'malformed');
  });

  it('rejects data after IEND and a missing IEND', () => {
    rejects(new Uint8Array(Buffer.concat([Buffer.from(original), Buffer.from([0, 0, 0, 0])])), 'malformed');
    const parsed = chunks(original).filter((c) => c.type !== 'IEND');
    const noEnd = Buffer.concat([Buffer.from(original.subarray(0, 8)), ...parsed.map((c) => chunk(c.type, c.data))]);
    rejects(new Uint8Array(noEnd), 'malformed');
  });

  it('rejects a chunk length that runs past the end', () => {
    const bad = original.slice();
    new DataView(bad.buffer).setUint32(8, 0xfffffff0);
    rejects(bad, 'malformed');
  });

  it('throws on a dpi that cannot be stored', () => {
    for (const dpi of [0, -300, Number.NaN, Number.POSITIVE_INFINITY, 1e9]) {
      expect(() => setDpi(original, dpi)).toThrow(RangeError);
    }
  });
});
