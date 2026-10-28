import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// FR-E23: every QR layout a variant lists has a label in each app language.
const layouts = new Set(
  globSync('styles/*/variantes/*/variant.json').flatMap((f) => (JSON.parse(readFileSync(f, 'utf8')) as { qr?: string[] }).qr ?? []),
);

describe('FR-E23 QR layout labels', () => {
  it('some variant offers more than one layout', () => {
    expect(layouts.size).toBeGreaterThan(1);
  });
  for (const lang of ['en', 'es']) {
    it(`${lang} labels every listed layout`, () => {
      const catalog = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
      for (const key of layouts) expect(catalog[`editor.qr.${key}`], key).toBeTruthy();
    });
  }
});
