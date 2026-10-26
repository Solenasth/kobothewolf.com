import { DEFAULT_LANG, isLang, type Lang } from './languages';

export const STORAGE_KEY = 'kobo-lang';

export interface LanguageSources {
  /** `location.search`, e.g. `?lang=es`. */
  search: string;
  /** The remembered choice, if storage is available. */
  stored: string | null;
  /** `navigator.languages`, most preferred first. */
  preferred: readonly string[];
}

/**
 * First visit: `?lang=` → remembered choice → browser languages → English
 * (FR-I3). Every candidate is checked against the allow-list, so an arbitrary
 * `?lang=` value can never become the language (T-SEC-5).
 */
export function resolveLanguage({ search, stored, preferred }: LanguageSources): Lang {
  const fromQuery = new URLSearchParams(search).get('lang');
  if (isLang(fromQuery)) return fromQuery;
  if (isLang(stored)) return stored;
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}
