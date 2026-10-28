// `kobo check-exports dir/` (FR-B2, DESIGN §9, EV §5.3): checks the PNGs and
// PDFs the export renderer wrote, with the manifests it wrote next to them.
// Each check returns the problems it found; an empty list means it passed.
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import jsQR from 'jsqr';
import { QR_CONTENTS } from '../src/core/marks.ts';
import { readChunks } from '../src/core/png.ts';
import { fontCoverage, postScriptName } from './font-cmap.ts';
import type { KoboDocument } from '../src/core/document.ts';
import type { Box, ExportIndex, FaceManifest } from './manifest.ts';
import { readPng, type Decoded } from './png.ts';

const FACE = [960, 560] as const;
export const PNG_SIZE = [1134, 661] as const;
/** 300 dpi in a pHYs chunk: pixels per metre, unit 1. */
const PIXELS_PER_METRE = 11811;
/** 96 × 56 mm in points, as pdfinfo prints them. */
const PAGE_PT = [272.13, 158.74] as const;
/** Chromium sets PDF page sizes in steps of 1.2 pt (DESIGN §9), so a vector page may be off by one. */
const CHROMIUM_STEP_PT = 1.2;

/** What the checks hold exports to: the site's fonts and each style's font limit. */
export interface Rules {
  /** Font family → coverage test of its file. */
  fonts: Map<string, (codePoint: number) => boolean>;
  /** The site fonts' PostScript names, as PDFs name embedded fonts. */
  postScriptNames: Set<string>;
  maxFonts: (style: string) => number;
}

/** The rules from the repo: `src/theme/fonts.css` and `styles/<style>/tokens.json`. */
export function repoRules(root: string): Rules {
  const cssFile = join(root, 'src/theme/fonts.css');
  const fonts = new Map<string, (cp: number) => boolean>();
  const postScriptNames = new Set<string>();
  for (const m of readFileSync(cssFile, 'utf8').matchAll(/@font-face\s*\{[^}]*?font-family:\s*['"]?([^;'"]+)['"]?;[^}]*?src:\s*url\(['"]?([^'")]+)['"]?\)/g)) {
    const bytes = readFileSync(join(dirname(cssFile), m[2]!));
    fonts.set(m[1]!.trim(), fontCoverage(bytes));
    postScriptNames.add(postScriptName(bytes));
  }
  return {
    fonts,
    postScriptNames,
    maxFonts: (style) => JSON.parse(readFileSync(join(root, 'styles', style, 'tokens.json'), 'utf8')).tipografia.max_fuentes_por_cara,
  };
}

export function checkPngFile(bytes: Uint8Array): string[] {
  const chunks = readChunks(bytes);
  if (!Array.isArray(chunks)) return [`not a valid PNG (${chunks.code})`];
  const problems: string[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const [width, height] = [view.getUint32(16), view.getUint32(20)];
  if (width !== PNG_SIZE[0] || height !== PNG_SIZE[1]) problems.push(`size ${width} × ${height}, expected ${PNG_SIZE.join(' × ')}`);
  const phys = chunks.find((c) => c.type === 'pHYs');
  if (!phys) problems.push('no pHYs chunk, so no dpi');
  else {
    const [x, y, unit] = [view.getUint32(phys.start + 8), view.getUint32(phys.start + 12), view.getUint8(phys.start + 16)];
    if (x !== PIXELS_PER_METRE || y !== PIXELS_PER_METRE || unit !== 1) problems.push(`pHYs ${x} × ${y} per ${unit ? 'metre' : 'unit'}, expected ${PIXELS_PER_METRE} per metre (300 dpi)`);
  }
  return problems;
}

/** The part of an image under a face box, in the image's own pixels. */
export function crop(image: Decoded, [x, y, w, h]: Box): Decoded {
  const sx = image.width / FACE[0];
  const sy = image.height / FACE[1];
  const x0 = Math.max(0, Math.floor(x * sx));
  const y0 = Math.max(0, Math.floor(y * sy));
  const x1 = Math.min(image.width, Math.ceil((x + w) * sx));
  const y1 = Math.min(image.height, Math.ceil((y + h) * sy));
  const width = Math.max(0, x1 - x0);
  const height = Math.max(0, y1 - y0);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) data.set(image.data.subarray(((y0 + row) * image.width + x0) * 4, ((y0 + row) * image.width + x1) * 4), row * width * 4);
  return { width, height, data };
}

/** Half the resolution, each pixel the mean of a 2 × 2 block: 300 dpi to 150. */
export function halve(image: Decoded): Decoded {
  const width = image.width >> 1;
  const height = image.height >> 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        const at = (dx: number, dy: number) => image.data[((2 * y + dy) * image.width + 2 * x + dx) * 4 + c]!;
        data[(y * width + x) * 4 + c] = Math.round((at(0, 0) + at(1, 0) + at(0, 1) + at(1, 1)) / 4);
      }
    }
  }
  return { width, height, data };
}

function decode(image: Decoded): string | null {
  if (!image.width || !image.height) return null;
  return jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
}

/** Each QR decodes to exactly its contents: the main one at 300 and 150 dpi, the site one at 300. */
export function checkQrs(image: Decoded, face: FaceManifest): string[] {
  const problems: string[] = [];
  for (const qr of face.qrs) {
    const expected = QR_CONTENTS[qr.kind];
    const area = crop(image, qr.box);
    const sizes: [string, Decoded][] = [['300 dpi', area]];
    if (qr.kind === 'main') sizes.push(['150 dpi', halve(area)]);
    for (const [dpi, pixels] of sizes) {
      const found = decode(pixels);
      if (found !== expected) problems.push(`${qr.kind} QR at ${dpi}: ${found === null ? 'unreadable' : `reads "${found}"`}, expected "${expected}"`);
    }
  }
  return problems;
}

/** The smallest framed box each QR may print at, in face pixels (FR-E23, EV §3.1): 15 mm, and today's site QR. */
export const MIN_QR_PX = { main: 150, site: 96 } as const;

/** No layout prints a QR smaller than its minimum (FR-E23). Half a pixel of rounding is allowed. */
export function checkQrSizes(face: FaceManifest): string[] {
  return face.qrs.flatMap((qr) => {
    const size = Math.min(qr.box[2], qr.box[3]);
    return size + 0.5 < MIN_QR_PX[qr.kind] ? [`${qr.kind} QR is ${Math.round(size)} px (${(size / 10).toFixed(1)} mm), at least ${MIN_QR_PX[qr.kind]}`] : [];
  });
}

const overlaps = (a: Box, b: Box) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/** No sparkle, tape, sticker or text over the main QR or the site block. */
export function checkZones(face: FaceManifest): string[] {
  return face.obstacles.flatMap((o) =>
    face.zones.filter((z) => overlaps(o.box, z.box)).map((z) => `${o.kind} "${o.label}" overlaps ${z.name === 'qr' ? 'the main QR' : 'the site block'}`),
  );
}

/** At most the style's font count, every family one of the site's fonts, every character in its font. */
export function checkFonts(face: FaceManifest, rules: Rules): string[] {
  const problems: string[] = [];
  const families = [...new Set(face.texts.map((t) => t.family))];
  const max = rules.maxFonts(face.style);
  if (families.length > max) problems.push(`${families.length} fonts (${families.join(', ')}), at most ${max}`);
  for (const family of families) {
    const has = rules.fonts.get(family);
    if (!has) {
      problems.push(`font "${family}" isn't one of the site's fonts`);
      continue;
    }
    const text = face.texts.filter((t) => t.family === family).map((t) => t.text).join('');
    const missing = [...new Set(text.replace(/\s/gu, ''))].filter((c) => !has(c.codePointAt(0)!));
    if (missing.length) problems.push(`${family} has no ${missing.map((c) => `${c} (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`).join(', ')}`);
  }
  return problems;
}

export function checkFace(png: Uint8Array, face: FaceManifest, rules: Rules): string[] {
  return [...checkPngFile(png), ...checkQrSizes(face), ...checkQrs(readPng(png), face), ...checkZones(face), ...checkFonts(face, rules)];
}

function run(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`${command} not found: install poppler (poppler-utils)`);
    throw error;
  }
}

export function hasPoppler(): boolean {
  try {
    run('pdfinfo', ['-v']);
    return true;
  } catch {
    return false;
  }
}

/** Two 96 × 56 mm pages, one 300 ppi 1134 × 661 image each, no fonts, and each page's image passes its face's QR checks. */
export function checkPdf(file: string, pages: FaceManifest[]): string[] {
  const problems: string[] = [];
  const info = run('pdfinfo', ['-f', '1', '-l', '1000', file]);
  const sizes = [...info.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map((m) => [Number(m[1]), Number(m[2])]);
  if (sizes.length !== pages.length) problems.push(`${sizes.length} pages, expected ${pages.length}`);
  sizes.forEach(([w, h], i) => {
    if (Math.abs(w! - PAGE_PT[0]) > 0.01 || Math.abs(h! - PAGE_PT[1]) > 0.01) problems.push(`page ${i + 1} is ${w} × ${h} pt, expected ${PAGE_PT.join(' × ')} (96 × 56 mm)`);
  });
  const images = run('pdfimages', ['-list', file])
    .split('\n')
    .slice(2)
    .filter((line) => line.trim())
    .map((line) => line.trim().split(/\s+/))
    .filter((cols) => cols[2] === 'image');
  for (let page = 1; page <= sizes.length; page++) {
    const own = images.filter((cols) => Number(cols[0]) === page);
    if (own.length !== 1) {
      problems.push(`page ${page} has ${own.length} images, expected 1`);
      continue;
    }
    const [, , , width, height, , , , , , , , xppi, yppi] = own[0]!;
    if (`${width} × ${height}` !== PNG_SIZE.join(' × ')) problems.push(`page ${page} image is ${width} × ${height}, expected ${PNG_SIZE.join(' × ')}`);
    if (xppi !== '300' || yppi !== '300') problems.push(`page ${page} image is ${xppi} × ${yppi} ppi, expected 300`);
  }
  const fonts = run('pdffonts', [file]).split('\n').slice(2).filter((line) => line.trim());
  if (fonts.length) problems.push(`${fonts.length} fonts, expected none (the text is in the images)`);
  const dir = mkdtempSync(join(tmpdir(), 'kobo-pdf-'));
  try {
    run('pdfimages', ['-png', file, join(dir, 'p')]);
    const extracted = readdirSync(dir).sort();
    pages.forEach((face, i) => {
      const name = extracted[i];
      if (!name) return;
      for (const problem of checkQrs(readPng(join(dir, name)), face)) problems.push(`page ${i + 1} (${face.face}): ${problem}`);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return problems;
}

/** The fonts pdffonts lists, for the whole file or one page. */
function pdfFonts(file: string, page?: number): { name: string; embedded: boolean; subset: boolean }[] {
  const args = page ? ['-f', String(page), '-l', String(page), file] : [file];
  return run('pdffonts', args)
    .split('\n')
    .slice(2)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.trim().split(/\s+/);
      // name type… encoding emb sub uni object generation
      return { name: cols[0]!, embedded: cols.at(-5) === 'yes', subset: cols.at(-4) === 'yes' };
    });
}

/** The texts a document changed on its two faces and doesn't hide. */
export function changedTexts(doc: KoboDocument): string[] {
  return [doc.frente, doc.reverso].flatMap((id) => {
    const face = doc.caras[id];
    return Object.entries(face?.textos ?? {})
      .filter(([index]) => !face?.ocultosEd?.includes(Number(index)))
      .map(([, text]) => text)
      .filter((text) => text.trim());
  });
}

const squeeze = (text: string) => text.replace(/\s/gu, '').toLowerCase();

/** A pdf-vector PDF (FR-B1): two 96 × 56 mm pages within Chromium's step, embedded subsets of the site's fonts only, and the document's texts as real text. */
export function checkVectorPdf(file: string, doc: KoboDocument, rules: Rules): string[] {
  const problems: string[] = [];
  const info = run('pdfinfo', ['-f', '1', '-l', '1000', file]);
  const sizes = [...info.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map((m) => [Number(m[1]), Number(m[2])]);
  if (sizes.length !== 2) problems.push(`${sizes.length} pages, expected 2`);
  sizes.forEach(([w, h], i) => {
    if (Math.abs(w! - PAGE_PT[0]) > CHROMIUM_STEP_PT || Math.abs(h! - PAGE_PT[1]) > CHROMIUM_STEP_PT) {
      problems.push(`page ${i + 1} is ${w} × ${h} pt, expected ${PAGE_PT.join(' × ')} (96 × 56 mm) within ${CHROMIUM_STEP_PT} pt`);
    }
  });
  const fonts = pdfFonts(file);
  if (!fonts.length) problems.push('no fonts, so no real text');
  for (const font of fonts) {
    const name = font.name.replace(/^[A-Z]{6}\+/, '');
    if (!font.embedded) problems.push(`font ${name} isn't embedded`);
    else if (!font.subset) problems.push(`font ${name} is embedded whole, not as a subset`);
    if (!rules.postScriptNames.has(name)) problems.push(`font ${name} isn't one of the site's fonts`);
  }
  const max = rules.maxFonts(doc.estilo);
  sizes.forEach((_, i) => {
    const count = pdfFonts(file, i + 1).length;
    if (count > max) problems.push(`page ${i + 1} has ${count} fonts, at most ${max}`);
  });
  const text = squeeze(run('pdftotext', [file, '-']));
  for (const wanted of changedTexts(doc)) if (!text.includes(squeeze(wanted))) problems.push(`the text "${wanted}" isn't in the PDF as text`);
  return problems;
}

export interface FileResult {
  file: string;
  problems: string[];
}

/**
 * Every export under `dir`: each folder with an index.json the renderer wrote,
 * and each vector PDF, found as `<name>.pdf` beside its `<name>.kobo.json`.
 */
export function checkExports(dir: string, rules: Rules): FileResult[] {
  const indexes = globSync('**/index.json', { cwd: dir }).sort();
  const documents = globSync('**/*.kobo.json', { cwd: dir }).sort();
  if (!indexes.length && !documents.length) {
    return [{ file: dir, problems: ['nothing to check: run the export renderer (npm run exports:render) or pdf-vector first'] }];
  }
  const results: FileResult[] = [];
  for (const name of documents) {
    const pdf = name.replace(/\.kobo\.json$/, '.pdf');
    if (!existsSync(join(dir, pdf))) {
      results.push({ file: pdf, problems: [`missing: no vector PDF beside ${name}`] });
      continue;
    }
    const doc = JSON.parse(readFileSync(join(dir, name), 'utf8')) as KoboDocument;
    results.push({ file: pdf, problems: checkVectorPdf(join(dir, pdf), doc, rules) });
  }
  for (const indexFile of indexes) {
    const base = join(dir, dirname(indexFile));
    const index = JSON.parse(readFileSync(join(dir, indexFile), 'utf8')) as ExportIndex;
    const faces = new Map<string, FaceManifest>();
    for (const name of index.faces) {
      const face = JSON.parse(readFileSync(join(base, name), 'utf8')) as FaceManifest;
      faces.set(name, face);
      results.push({ file: relative(dir, join(base, face.png)), problems: checkFace(readFileSync(join(base, face.png)), face, rules) });
    }
    for (const pdf of index.pdfs) {
      const pages = pdf.pages.map((name) => faces.get(name)!);
      results.push({ file: relative(dir, join(base, pdf.file)), problems: checkPdf(join(base, pdf.file), pages) });
    }
  }
  return results;
}
