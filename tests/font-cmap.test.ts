import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fontCoverage } from '../cli/font-cmap.ts';

// FR-B2: the glyph check reads each site font's cmap. The counts are what
// fontTools reports for the same files (characters up to U+30000, #19).
const FONTS = {
  'cherry-bomb-one-latin-400-normal': 226,
  'gochi-hand-latin-400-normal': 210,
  'jetbrains-mono-latin-500-normal': 229,
  'pacifico-latin-400-normal': 224,
  'silkscreen-latin-400-normal': 215,
};

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
