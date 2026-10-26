// Supported languages. Adding one means adding its catalog files and an entry
// here (FR-I5); validate fails until every catalog has every key.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANG: Lang = 'en';

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}
