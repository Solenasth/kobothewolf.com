/// <reference lib="dom" />
// pdf.ts imports the browser render code next to buildPdf; only buildPdf runs here.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPdf } from '../src/core/export/pdf';
import { readPdf } from './pdf-read';
import { readPng } from './png';

const FRONT = 'tests/fixtures/sticker/filled-blob.input.png'; // RGB, 220 × 180
const BACK = 'tests/fixtures/sticker/cut-bottom.sticker.png'; // RGBA, 258 × 278

function rgbOf(file: string): Uint8Array {
  const { data } = readPng(file);
  return Uint8Array.from({ length: (data.length / 4) * 3 }, (_, i) => data[Math.floor(i / 3) * 4 + (i % 3)]!);
}

describe('FR-E14 the print PDF', () => {
  const pdf = readPdf(new Uint8Array(buildPdf(readFileSync(FRONT), readFileSync(BACK), { title: 'Certificado + Licencia · KOBO.EXE boykisser-uwu' })));

  it('has two 96 × 56 mm pages (272.13 × 158.74 pt)', () => {
    expect(pdf.pages.map((p) => [p.width.toFixed(2), p.height.toFixed(2)])).toEqual([
      ['272.13', '158.74'],
      ['272.13', '158.74'],
    ]);
  });

  it('draws one image per page over the whole page, the front first', () => {
    for (const page of pdf.pages) {
      expect(page.images).toHaveLength(1);
      // The image's matrix scales it to the full page at the origin.
      const cm = /q\s+([-\d. ]+) cm\s+\/I\d+ Do\s+Q/.exec(page.content)![1]!.trim().split(/\s+/).map(Number);
      expect(cm.map((n) => +n.toFixed(2))).toEqual([272.13, 0, 0, 158.74, 0, 0]);
    }
    const [front, back] = pdf.pages.map((p) => p.images[0]!);
    expect([front!.width, front!.height, front!.smask]).toEqual([220, 180, false]);
    expect([back!.width, back!.height, back!.smask]).toEqual([258, 278, true]); // alpha kept as a soft mask
  });

  it('keeps every pixel of the PNGs', () => {
    const [front, back] = pdf.pages.map((p) => p.images[0]!);
    expect(Buffer.from(front!.pixels).equals(Buffer.from(rgbOf(FRONT)))).toBe(true);
    expect(Buffer.from(back!.pixels).equals(Buffer.from(rgbOf(BACK)))).toBe(true);
  });

  it('carries no fonts, the title and the site as creator', () => {
    expect(pdf.fonts).toBe(0);
    expect(pdf.info).toMatchObject({ Title: 'Certificado + Licencia · KOBO.EXE boykisser-uwu', Creator: 'kobothewolf.com' });
  });
});
