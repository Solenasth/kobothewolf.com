import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { checkCoverage, checkPng, checkUrls, creditedPaths, isAssetPath, stripPng } from './assets.ts';

const A = 'styles/s/assets';
const F = 'src/theme/fonts';
const png = new Uint8Array(readFileSync('tests/fixtures/sticker/filled-blob.sticker.png'));

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** The fixture with extra chunks inserted after IHDR (8 + 25 bytes). */
function withChunks(...extra: Buffer[]): Uint8Array {
  return new Uint8Array(Buffer.concat([Buffer.from(png.subarray(0, 33)), ...extra, Buffer.from(png.subarray(33))]));
}

const c2pa = chunk('caBX', new TextEncoder().encode('jumb c2pa manifest'));
const text = chunk('tEXt', new TextEncoder().encode('Author\0someone'));
const exif = chunk('eXIf', new Uint8Array([0x4d, 0x4d, 0, 42]));

describe('NFR-9 every asset is credited or licensed', () => {
  const credits = `| \`${A}/st-a.png\` | art |\nSee \`scripts/strip-png.ts\` and \`docs/x.md\`.`;

  it('accepts credited files and fonts with a matching license', () => {
    const files = [`${A}/st-a.png`, `${F}/pacifico-latin-400-normal.woff2`, `${F}/LICENSE-pacifico.txt`];
    expect(checkCoverage(files, credits)).toEqual([]);
  });

  it('rejects an asset that is neither credited nor licensed', () => {
    expect(checkCoverage([`${A}/st-a.png`, `${A}/st-b.png`], credits)).toEqual([
      `${A}/st-b.png: not listed in CREDITS.md and no LICENSE-<name>.txt next to it`,
    ]);
  });

  it('only accepts a license in the same folder whose name prefixes the file', () => {
    const files = [`${A}/st-a.png`, `${F}/gochi-hand-latin-400-normal.woff2`, `${F}/LICENSE-pacifico.txt`, `public/LICENSE-gochi-hand.txt`];
    expect(checkCoverage(files, credits)).toEqual([
      `${F}/gochi-hand-latin-400-normal.woff2: not listed in CREDITS.md and no LICENSE-<name>.txt next to it`,
    ]);
  });

  it('rejects credits for files that do not exist', () => {
    expect(checkCoverage([], credits)).toEqual([`CREDITS.md: lists ${A}/st-a.png, which does not exist`]);
  });

  it('rejects file types whose metadata the check cannot read', () => {
    expect(checkCoverage([`${A}/photo.jpg`, `${A}/notes.md`], '')).toEqual([
      `${A}/photo.jpg: file type not allowed in asset folders (.png, .svg, .woff2)`,
      `${A}/notes.md: file type not allowed in asset folders (.png, .svg, .woff2)`,
    ]);
  });

  it('reads only asset paths from CREDITS.md', () => {
    expect([...creditedPaths(credits)]).toEqual([`${A}/st-a.png`]);
    expect(isAssetPath('public/favicon.svg')).toBe(true);
    expect(isAssetPath('styles/s/assets/x.png')).toBe(true);
    expect(isAssetPath('styles/s/tokens.json')).toBe(false);
    expect(isAssetPath('src/theme/ui.css')).toBe(false);
  });
});

describe('NFR-5 published PNGs hold pixel data only', () => {
  it('accepts a PNG with only pixel-data chunks', () => {
    expect(checkPng('a.png', png)).toEqual([]);
  });

  it('rejects C2PA, text and EXIF metadata', () => {
    expect(checkPng('a.png', withChunks(c2pa))).toEqual(['a.png: metadata chunk(s) caBX; run scripts/strip-png.ts']);
    expect(checkPng('a.png', withChunks(text, exif, text))).toEqual([
      'a.png: metadata chunk(s) tEXt, eXIf; run scripts/strip-png.ts',
    ]);
  });

  it('rejects colour and resolution chunks too: published assets carry none', () => {
    expect(checkPng('a.png', withChunks(chunk('pHYs', new Uint8Array(9))))).toEqual([
      'a.png: metadata chunk(s) pHYs; run scripts/strip-png.ts',
    ]);
  });

  it('rejects files that are not well-formed PNGs', () => {
    expect(checkPng('a.png', new TextEncoder().encode('GIF89a'))).toEqual(['a.png: not a PNG']);
    expect(checkPng('a.png', png.subarray(0, png.length - 4))).toEqual(['a.png: malformed PNG']);
  });

  it('strips metadata and keeps the rest byte for byte', () => {
    const stripped = stripPng(withChunks(c2pa, text, exif));
    expect(stripped).toEqual(png);
    expect(checkPng('a.png', stripped)).toEqual([]);
    expect(stripPng(png)).toEqual(png);
  });

  it('refuses to strip a malformed file', () => {
    expect(() => stripPng(png.subarray(0, 20))).toThrow('malformed');
  });
});

describe('T-SEC-4 style files load nothing from outside the origin', () => {
  it('accepts relative, root-relative and data: references', () => {
    const css = `@font-face{src:url(./fonts/a.woff2) format("woff2")} .a{background:url("/x.png")} .b{background:url('data:image/svg+xml,%3Csvg%3E')} @import "local.css";`;
    expect(checkUrls('a.css', css)).toEqual([]);
    expect(checkUrls('a.html', '<img src="../assets/st-a.png" srcset="a.png 1x, b.png 2x">')).toEqual([]);
  });

  it('ignores URLs that are text, not loads', () => {
    expect(checkUrls('t.json', '{"contacto":{"sitio":"https://kobothewolf.com","telegram":"https://t.me/KoboTheWolf"}}')).toEqual([]);
    expect(checkUrls('a.html', '<a href="https://t.me/KoboTheWolf">t.me/KoboTheWolf</a>')).toEqual([]);
  });

  it('rejects absolute and protocol-relative loads', () => {
    expect(checkUrls('a.css', '.a{background:url(https://evil.example/x.png)}')).toEqual([
      'a.css: loads https://evil.example/x.png from outside the origin',
    ]);
    expect(checkUrls('a.css', ".a{background:url( '//cdn.example/x.png' )}")).toEqual([
      'a.css: loads //cdn.example/x.png from outside the origin',
    ]);
    expect(checkUrls('a.css', '@import url("http://fonts.example/f.css");')).toEqual([
      'a.css: loads http://fonts.example/f.css from outside the origin',
    ]);
    expect(checkUrls('a.css', "@import 'https://fonts.example/f.css';")).toEqual([
      'a.css: loads https://fonts.example/f.css from outside the origin',
    ]);
    expect(checkUrls('a.html', '<img src=https://x.example/a.png>')).toEqual([
      'a.html: loads https://x.example/a.png from outside the origin',
    ]);
    expect(checkUrls('a.html', '<img srcset="a.png 1x, https://x.example/b.png 2x">')).toEqual([
      'a.html: loads https://x.example/b.png from outside the origin',
    ]);
  });
});
