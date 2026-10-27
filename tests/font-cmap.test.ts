import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fontCoverage, postScriptName } from '../cli/font-cmap.ts';

// FR-B2: the glyph check reads each site font's cmap. The counts are what
// fontTools reports for the same files (characters up to U+30000, #19).
const FONTS = {
  'cherry-bomb-one-latin-400-normal': 226,
  'gochi-hand-latin-400-normal': 210,
  'jetbrains-mono-latin-500-normal': 229,
  'pacifico-latin-400-normal': 224,
  'silkscreen-latin-400-normal': 215,
};

// The names Chromium's PDFs give the embedded fonts, as pdffonts lists them (#20).
const POSTSCRIPT = {
  'cherry-bomb-one-latin-400-normal': 'CherryBombOne-Regular',
  'gochi-hand-latin-400-normal': 'GochiHand-Regular',
  'jetbrains-mono-latin-500-normal': 'JetBrainsMono-Medium',
  'pacifico-latin-400-normal': 'Pacifico-Regular',
  'silkscreen-latin-400-normal': 'Silkscreen-Regular',
};

describe('FR-B1 FR-B2 PostScript names from WOFF2 name tables', () => {
  for (const [name, expected] of Object.entries(POSTSCRIPT)) {
    it(`${name} is ${expected}`, () => expect(postScriptName(readFileSync(`src/theme/fonts/${name}.woff2`))).toBe(expected));
  }
});

describe('FR-B2 font coverage from WOFF2 cmaps', () => {
  for (const [name, count] of Object.entries(FONTS)) {
    it(`${name}: ${count} characters, latin letters and digits, none of ♡ ✔ ☑ ☐`, () => {
      const has = fontCoverage(readFileSync(`src/theme/fonts/${name}.woff2`));
      expect(Array.from({ length: 0x30000 }, (_, cp) => cp).filter(has)).toHaveLength(count);
      for (const c of 'AZaz09é·') expect(has(c.codePointAt(0)!), c).toBe(true);
      for (const c of '♡✔☑☐') expect(has(c.codePointAt(0)!), c).toBe(false);
    });
  }

  it('rejects a file that is not WOFF2', () => {
    expect(() => fontCoverage(readFileSync('styles/boykisser-uwu/assets/qr-sitio-kobothewolf.png'))).toThrow('not a WOFF2 font');
  });
});
