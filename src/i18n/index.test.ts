import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeDocument() {
  const meta = { content: '', setAttribute(_: string, value: string) { this.content = value; } };
  return { documentElement: { lang: '' }, title: '', meta, querySelector: () => meta };
}

describe('FR-I2 FR-I4 setLanguage', () => {
  let doc: ReturnType<typeof fakeDocument>;
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    doc = fakeDocument();
    storage = new Map();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
    });
  });

  it('updates lang, title and description, remembers the choice and notifies', async () => {
    const i18n = await import('./index');
    const seen: string[] = [];
    i18n.onLanguageChange((lang) => seen.push(lang));

    i18n.setLanguage('es');

    expect(doc.documentElement.lang).toBe('es');
    expect(doc.meta.content).toContain('trabajo freelance');
    expect(i18n.t('lang.label')).toBe('Idioma');
    expect(storage.get('kobo-lang')).toBe('es');
    expect(seen).toEqual(['es']);
  });

  it('keeps working when storage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    const i18n = await import('./index');

    expect(() => i18n.setLanguage('es')).not.toThrow();
    expect(i18n.getLanguage()).toBe('es');
  });

  it('initLanguage resolves from the URL without remembering it', async () => {
    vi.stubGlobal('location', { search: '?lang=es' });
    vi.stubGlobal('navigator', { languages: ['en-US'] });
    const i18n = await import('./index');

    expect(i18n.initLanguage()).toBe('es');
    expect(storage.has('kobo-lang')).toBe(false);
  });
});
