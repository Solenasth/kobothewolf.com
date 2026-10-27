// Minimal PNG writer for test fixtures: RGBA, 8-bit, no filtering, an optional pHYs.
import { deflateSync } from 'node:zlib';
import type { Decoded } from '../cli/png.ts';
import { crc32, SIGNATURE } from '../src/core/png';

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function writePng(image: Decoded, pixelsPerMetre?: number): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(image.height * (image.width * 4 + 1));
  for (let y = 0; y < image.height; y++) raw.set(image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4), y * (image.width * 4 + 1) + 1);
  const phys = Buffer.alloc(9);
  if (pixelsPerMetre) {
    phys.writeUInt32BE(pixelsPerMetre, 0);
    phys.writeUInt32BE(pixelsPerMetre, 4);
    phys[8] = 1;
  }
  return Buffer.concat([
    Buffer.from(SIGNATURE),
    chunk('IHDR', header),
    ...(pixelsPerMetre ? [chunk('pHYs', phys)] : []),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** A blank RGBA image. */
export function blank(width: number, height: number, rgb = [255, 255, 255]): Decoded {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return { width, height, data };
}

/** Draws `source` scaled (nearest neighbour) into `target`'s rectangle, in target pixels. */
export function paint(target: Decoded, source: Decoded, [x, y, w, h]: [number, number, number, number]): void {
  for (let ty = Math.round(y); ty < Math.round(y + h); ty++) {
    for (let tx = Math.round(x); tx < Math.round(x + w); tx++) {
      const sx = Math.min(source.width - 1, Math.floor(((tx - x) / w) * source.width));
      const sy = Math.min(source.height - 1, Math.floor(((ty - y) / h) * source.height));
      target.data.set(source.data.subarray((sy * source.width + sx) * 4, (sy * source.width + sx) * 4 + 4), (ty * target.width + tx) * 4);
    }
  }
}
