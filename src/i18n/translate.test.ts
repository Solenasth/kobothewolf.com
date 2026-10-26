import { describe, expect, it, vi } from 'vitest';
import { createTranslator, type Catalog } from './translate';

const catalogs: Record<'en' | 'es', Catalog> = {
  en: { hello: 'Hello, {name}', onlyEn: 'English only', 'files.one': '{count} file', 'files.other': '{count} files' },
  es: { hello: 'Hola, {name}', 'files.one': '{count} archivo', 'files.other': '{count} archivos' },
};

describe('FR-I1 t() returns the active language', () => {
  it('translates and interpolates', () => {
    expect(createTranslator(catalogs, 'es')('hello', { name: 'Kobo' })).toBe('Hola, Kobo');
    expect(createTranslator(catalogs, 'en')('hello', { name: 'Kobo' })).toBe('Hello, Kobo');
  });

  it('leaves unknown placeholders as written', () => {
    expect(createTranslator(catalogs, 'en')('hello')).toBe('Hello, {name}');
    expect(createTranslator(catalogs, 'en')('hello', { other: 1 })).toBe('Hello, {name}');
  });

  it('picks the plural form with Intl.PluralRules', () => {
    const t = createTranslator(catalogs, 'es');
    expect(t('files', { count: 1 })).toBe('1 archivo');
    expect(t('files', { count: 3 })).toBe('3 archivos');
    expect(t('files', { count: 0 })).toBe('0 archivos');
  });
});

describe('FR-I5 missing keys fall back to English, then the key', () => {
  it('falls back to English when the active language lacks the key', () => {
    expect(createTranslator(catalogs, 'es')('onlyEn')).toBe('English only');
  });

  it('returns the key and reports it when no catalog has it', () => {
    const onMissing = vi.fn();
    expect(createTranslator(catalogs, 'es', onMissing)('nope')).toBe('nope');
    expect(onMissing).toHaveBeenCalledWith('nope', 'es');
  });

  it('does not treat inherited object properties as keys', () => {
    expect(createTranslator(catalogs, 'en')('hello', { toString: 'x' } as never)).toBe('Hello, {name}');
  });
});
