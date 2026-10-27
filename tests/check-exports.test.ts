/// <reference lib="dom" />
// pdf.ts imports the browser render code next to buildPdf; only buildPdf runs here.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkExports, checkFace, checkFonts, checkPdf, checkPngFile, checkQrs, checkVectorPdf, checkZones, hasPoppler, PNG_SIZE, repoRules } from '../cli/check-exports.ts';
import type { KoboDocument } from '../src/core/document';
import type { Box, ExportIndex, FaceManifest } from '../cli/manifest.ts';
import { readPng, type Decoded } from '../cli/png.ts';
import { buildPdf } from '../src/core/export/pdf';
import { blank, paint, writePng } from './png-write.ts';

// FR-B2, DESIGN §9: a good synthetic export set passes, and each fault on its
// own fails. The faces are drawn from the style's real QR images.

const rules = repoRules(process.cwd());
const DPI_300 = 11811;
const QR_MAIN = readPng('styles/boykisser-uwu/assets/qr-telegram-KoboTheWolf.png');
const QR_SITE = readPng('styles/boykisser-uwu/assets/qr-sitio-kobothewolf.png');
const MAIN_BOX: Box = [680, 100, 180, 180];
const SITE_QR_BOX: Box = [636, 400, 96, 96];

const BACK: FaceManifest = {
  face: 'xx-r',
  style: 'boykisser-uwu',
  engine: 'test',
  png: 'xx-r.png',
  qrs: [
    { kind: 'main', box: MAIN_BOX },
    { kind: 'site', box: SITE_QR_BOX },
  ],
  zones: [
    { name: 'qr', box: MAIN_BOX },
    { name: 'sitio', box: [630, 376, 284, 120] },
  ],
  obstacles: [
    { kind: 'sparkle', label: '.spark', box: [560, 40, 16, 16] },
    { kind: 'text', label: 'hewwo~', box: [380, 380, 90, 30] },
  ],
  texts: [
    { family: 'Plumon', text: "don't like my card? >w<" },
    { family: 'Burbuja', text: 'hewwo~' },
  ],
};
const FRONT: FaceManifest = { ...BACK, face: 'xx-f', png: 'xx-f.png', qrs: [], zones: [], obstacles: [], texts: [{ family: 'Lazo', text: 'Kobo' }] };

/** A face box in export pixels. */
const toPixels = ([x, y, w, h]: Box): Box => [(x * PNG_SIZE[0]) / 960, (y * PNG_SIZE[1]) / 560, (w * PNG_SIZE[0]) / 960, (h * PNG_SIZE[1]) / 560];
/** A QR drawn inside its box's padding, as the faces' .qr frames do. */
const inner = ([x, y, w, h]: Box, pad: number): Box => [x + pad, y + pad, w - 2 * pad, h - 2 * pad];

function backImage(main = QR_MAIN): Decoded {
  const image = blank(...PNG_SIZE, [255, 248, 238]);
  for (const [box, qr, pad] of [
    [MAIN_BOX, main, 10],
    [SITE_QR_BOX, QR_SITE, 6],
  ] as const) {
    paint(image, blank(1, 1), toPixels(box));
    paint(image, qr, toPixels(inner(box, pad)));
  }
  return image;
}

const frontPng = writePng(blank(...PNG_SIZE, [255, 200, 221]), DPI_300);
const backPng = writePng(backImage(), DPI_300);

describe('FR-B2 check-exports: PNG faces', () => {
  it('a good back and front pass every check', () => {
    expect(checkFace(backPng, BACK, rules)).toEqual([]);
    expect(checkFace(frontPng, FRONT, rules)).toEqual([]);
  });

  it('fails a PNG at the wrong dpi, with no dpi, or at the wrong size', () => {
    expect(checkPngFile(writePng(backImage(), 2835))).toEqual(['pHYs 2835 × 2835 per metre, expected 11811 per metre (300 dpi)']);
    expect(checkPngFile(writePng(backImage()))).toEqual(['no pHYs chunk, so no dpi']);
    expect(checkPngFile(writePng(blank(1000, 600), DPI_300))).toEqual(['size 1000 × 600, expected 1134 × 661']);
    expect(checkPngFile(new Uint8Array([1, 2, 3]))).toEqual(['not a valid PNG (not-png)']);
  });

  it('fails an unreadable QR', () => {
    const image = backImage();
    paint(image, blank(1, 1), toPixels(MAIN_BOX));
    expect(checkQrs(image, BACK)).toEqual([
      'main QR at 300 dpi: unreadable, expected "https://t.me/KoboTheWolf"',
      'main QR at 150 dpi: unreadable, expected "https://t.me/KoboTheWolf"',
    ]);
  });

  it('fails a QR that reads anything but its contact', () => {
    expect(checkQrs(backImage(QR_SITE), BACK)).toEqual([
      'main QR at 300 dpi: reads "https://kobothewolf.com", expected "https://t.me/KoboTheWolf"',
      'main QR at 150 dpi: reads "https://kobothewolf.com", expected "https://t.me/KoboTheWolf"',
    ]);
  });

  it('fails anything over the main QR or the site block', () => {
    const covered: FaceManifest = {
      ...BACK,
      obstacles: [
        { kind: 'sticker', label: '[data-arte]', box: [600, 200, 120, 120] },
        { kind: 'text', label: 'hewwo~', box: [600, 470, 40, 20] },
      ],
    };
    expect(checkZones(covered)).toEqual(['sticker "[data-arte]" overlaps the main QR', 'text "hewwo~" overlaps the site block']);
    // Touching edges don't overlap.
    expect(checkZones({ ...BACK, obstacles: [{ kind: 'washi', label: '.washi', box: [600, 100, 80, 20] }] })).toEqual([]);
  });

  it('fails a face with 5 fonts', () => {
    const texts = ['Burbuja', 'Plumon', 'Lazo', 'Silk', 'Code'].map((family) => ({ family, text: 'ok' }));
    expect(checkFonts({ ...BACK, texts }, rules)).toEqual(['5 fonts (Burbuja, Plumon, Lazo, Silk, Code), at most 4']);
  });

  it('fails a character its font lacks, and a font that is not the site\'s', () => {
    expect(checkFonts({ ...BACK, texts: [{ family: 'Plumon', text: 'i ♡ u ✔' }] }, rules)).toEqual(['Plumon has no ♡ (U+2661), ✔ (U+2714)']);
    expect(checkFonts({ ...BACK, texts: [{ family: 'Comic Sans MS', text: 'hi' }] }, rules)).toEqual(['font "Comic Sans MS" isn\'t one of the site\'s fonts']);
  });
});

describe('FR-B1 check-exports: finding vector PDFs', () => {
  it('reports a document with no vector PDF beside it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kobo-vector-'));
    try {
      mkdirSync(join(dir, 'vector'));
      writeFileSync(join(dir, 'vector/card.kobo.json'), readFileSync('tests/fixtures/documents/mezcla.kobo.json'));
      expect(checkExports(dir, rules)).toEqual([{ file: 'vector/card.pdf', problems: ['missing: no vector PDF beside vector/card.kobo.json'] }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// The PDF checks run poppler. Locally they skip without it; the check-exports
// CI job sets KOBO_REQUIRE_POPPLER=1, so there a missing poppler fails them.
describe.skipIf(!hasPoppler() && process.env.KOBO_REQUIRE_POPPLER !== '1')('FR-B2 check-exports: PDFs (poppler)', () => {
  let dir: string;
  const pdfFile = (name: string, bytes: ArrayBuffer) => {
    writeFileSync(join(dir, name), new Uint8Array(bytes));
    return join(dir, name);
  };
  const custom = (build: (doc: jsPDF) => void) => {
    const doc = new jsPDF({ unit: 'mm', format: [96, 56], orientation: 'landscape', putOnlyUsedFonts: true });
    build(doc);
    return doc.output('arraybuffer');
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'kobo-check-'));
    for (const [face, png] of [
      [FRONT, frontPng],
      [BACK, backPng],
    ] as const) {
      writeFileSync(join(dir, face.png), png);
      writeFileSync(join(dir, `${face.face}.json`), JSON.stringify(face));
    }
    pdfFile('xx.pdf', buildPdf(frontPng, backPng, { title: 'test' }));
    const index: ExportIndex = { engine: 'test', faces: ['xx-f.json', 'xx-r.json'], pdfs: [{ file: 'xx.pdf', pages: ['xx-f.json', 'xx-r.json'] }] };
    writeFileSync(join(dir, 'index.json'), JSON.stringify(index));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('a good export set passes, PNGs and PDF', () => {
    const results = checkExports(dir, rules);
    expect(results.map((r) => r.file)).toEqual(['xx-f.png', 'xx-r.png', 'xx.pdf']);
    expect(results.flatMap((r) => r.problems)).toEqual([]);
  });

  it('fails a PDF with the wrong page size', () => {
    const file = pdfFile(
      'small.pdf',
      custom((doc) => {
        doc.addImage(frontPng, 'PNG', 0, 0, 96, 56);
        doc.addPage([90, 50], 'landscape');
        doc.addImage(backPng, 'PNG', 0, 0, 90, 50);
      }),
    );
    // A 90 × 50 mm page (the trim without bleed), so its image is also over 300 ppi.
    expect(checkPdf(file, [FRONT, BACK])).toEqual([
      'page 2 is 255.118 × 141.732 pt, expected 272.13 × 158.74 (96 × 56 mm)',
      'page 2 image is 320 × 336 ppi, expected 300',
    ]);
  });

  it('fails a PDF with a font', () => {
    const file = pdfFile(
      'font.pdf',
      custom((doc) => {
        doc.addImage(frontPng, 'PNG', 0, 0, 96, 56);
        doc.text('hi', 10, 10);
        doc.addPage([96, 56], 'landscape');
        doc.addImage(backPng, 'PNG', 0, 0, 96, 56);
      }),
    );
    expect(checkPdf(file, [FRONT, BACK])).toEqual(['1 fonts, expected none (the text is in the images)']);
  });

  it('fails a PDF with its pages swapped or one missing', () => {
    const swapped = pdfFile('swapped.pdf', buildPdf(backPng, frontPng, { title: 'test' }));
    expect(checkPdf(swapped, [FRONT, BACK])).toEqual([
      'page 2 (xx-r): main QR at 300 dpi: unreadable, expected "https://t.me/KoboTheWolf"',
      'page 2 (xx-r): main QR at 150 dpi: unreadable, expected "https://t.me/KoboTheWolf"',
      'page 2 (xx-r): site QR at 300 dpi: unreadable, expected "https://kobothewolf.com"',
    ]);
    const one = pdfFile('one.pdf', custom((doc) => doc.addImage(frontPng, 'PNG', 0, 0, 96, 56)));
    expect(checkPdf(one, [FRONT, BACK])[0]).toBe('1 pages, expected 2');
  });

  const MIX = JSON.parse(readFileSync('tests/fixtures/documents/mezcla.kobo.json', 'utf8')) as KoboDocument;
  const MIX_TEXTS = ["Kobo's print test", '¡hola, imprenta!', 'vector text~'];

  it('fails a "vector" PDF with no text in it', () => {
    const file = pdfFile('image-only.pdf', buildPdf(frontPng, backPng, { title: 'test' }));
    expect(checkVectorPdf(file, MIX, rules)).toEqual(['no fonts, so no real text', ...MIX_TEXTS.map((t) => `the text "${t}" isn't in the PDF as text`)]);
  });

  it('fails a vector PDF whose font isn\'t embedded or isn\'t the site\'s', () => {
    const file = pdfFile(
      'helvetica.pdf',
      custom((doc) => {
        doc.text(MIX_TEXTS, 5, 10);
        doc.addPage([96, 56], 'landscape');
      }),
    );
    expect(checkVectorPdf(file, MIX, rules)).toEqual(["font Helvetica isn't embedded", "font Helvetica isn't one of the site's fonts"]);
  });

  it('fails a vector PDF more than one Chromium step off 96 × 56 mm', () => {
    const file = pdfFile(
      'trim.pdf',
      custom((doc) => {
        doc.text(MIX_TEXTS, 5, 10);
        doc.addPage([90, 50], 'landscape');
      }),
    );
    expect(checkVectorPdf(file, MIX, rules)).toContain('page 2 is 255.118 × 141.732 pt, expected 272.13 × 158.74 (96 × 56 mm) within 1.2 pt');
  });

  it('fails a PDF image that is not 300 ppi', () => {
    const file = pdfFile(
      'ppi.pdf',
      custom((doc) => {
        doc.addImage(writePng(blank(567, 330), DPI_300), 'PNG', 0, 0, 96, 56);
        doc.addPage([96, 56], 'landscape');
        doc.addImage(backPng, 'PNG', 0, 0, 96, 56);
      }),
    );
    expect(checkPdf(file, [FRONT, BACK])).toEqual(['page 1 image is 567 × 330, expected 1134 × 661', 'page 1 image is 150 × 150 ppi, expected 300']);
  });
});
