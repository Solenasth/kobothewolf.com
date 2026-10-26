import en from './en.json';
import es from './es.json';
import { type Lang } from './languages';
import { resolveLanguage, STORAGE_KEY } from './resolve';
import { createTranslator } from './translate';

export type MessageKey = keyof typeof en;
export type Translate = ReturnType<typeof createTranslator<MessageKey>>;

const catalogs: Record<Lang, Record<string, string>> = { en, es };

function warnMissing(key: string, lang: Lang) {
  if (import.meta.env.DEV) console.warn(`[i18n] missing "${key}" for "${lang}"`);
}

let current: Lang = 'en';
let translate: Translate = createTranslator<MessageKey>(catalogs, current, warnMissing);
const listeners = new Set<(lang: Lang) => void>();

export function getLanguage(): Lang {
  return current;
}

export const t: Translate = (key, params) => translate(key, params);

/** Resolves the first-visit language from the URL, storage and browser. */
export function initLanguage(): Lang {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked: fall through to the browser languages.
  }
  setLanguage(resolveLanguage({ search: location.search, stored, preferred: navigator.languages }), {
    remember: false,
  });
  return current;
}

/**
 * Switches language without a reload (FR-I2): updates `<html lang>`, the title
 * and the description (FR-I4), then notifies subscribers. Editor state lives
 * elsewhere and is untouched.
 */
export function setLanguage(lang: Lang, { remember = true }: { remember?: boolean } = {}) {
  current = lang;
  translate = createTranslator<MessageKey>(catalogs, lang, warnMissing);
  applyToDocument(document, lang, t);
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Not remembered; the choice still applies to this visit.
    }
  }
  for (const listener of listeners) listener(lang);
}

export function onLanguageChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyToDocument(doc: Document, lang: Lang, tr: Translate) {
  doc.documentElement.lang = lang;
  doc.title = tr('meta.title');
  doc.querySelector('meta[name="description"]')?.setAttribute('content', tr('meta.description'));
}
