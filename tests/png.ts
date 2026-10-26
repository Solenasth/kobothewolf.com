// Minimal PNG reader for tests: 8-bit gray, RGB or RGBA, not interlaced.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface Decoded {
  width: number;
  height: number;
  /** Always RGBA. */
  data: Uint8ClampedArray;
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 6: 4 };

export function readPng(file: string): Decoded {
  const buf = readFileSync(file);
  let offset = 8;
  let width = 0;
  let height = 0;
  let type = 0;
  const idat: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const name = buf.toString('latin1', offset + 4, offset + 8);
    const body = buf.subarray(offset + 8, offset + 8 + length);
    if (name === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      type = body[9]!;
      if (body[8] !== 8 || body[12] !== 0 || !(type in CHANNELS)) throw new Error(`${file}: unsupported PNG`);
    }
    if (name === 'IDAT') idat.push(body);
    offset += length + 12;
  }
  const channels = CHANNELS[type]!;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= channels ? pixels[y * stride + x - channels]! : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels]! : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const predictor = [0, a, b, (a + b) >> 1, paeth][filter]!;
      pixels[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (channels === 1) data.set([pixels[i]!, pixels[i]!, pixels[i]!, 255], i * 4);
    else if (channels === 3) data.set([...pixels.subarray(i * 3, i * 3 + 3), 255], i * 4);
    else data.set(pixels.subarray(i * 4, i * 4 + 4), i * 4);
  }
  return { width, height, data };
}
