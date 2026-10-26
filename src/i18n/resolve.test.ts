import { describe, expect, it } from 'vitest';
import { resolveLanguage } from './resolve';

const none = { search: '', stored: null, preferred: [] as string[] };

describe('FR-I3 first-visit language resolution', () => {
  it('uses ?lang= first', () => {
    expect(resolveLanguage({ search: '?lang=es', stored: 'en', preferred: ['en-US'] })).toBe('es');
  });

  it('then the remembered choice', () => {
    expect(resolveLanguage({ search: '', stored: 'es', preferred: ['en-US'] })).toBe('es');
  });

  it('then the browser languages, matching es-* to Spanish', () => {
    expect(resolveLanguage({ ...none, preferred: ['es-MX', 'en'] })).toBe('es');
    expect(resolveLanguage({ ...none, preferred: ['fr-FR', 'ES'] })).toBe('es');
  });

  it('then English', () => {
    expect(resolveLanguage(none)).toBe('en');
    expect(resolveLanguage({ ...none, preferred: ['fr', 'de-DE'] })).toBe('en');
  });
});

describe('T-SEC-5 ?lang= is allow-listed', () => {
  it.each(['<script>alert(1)</script>', 'ES', 'es-MX', '__proto__', 'constructor', '', 'en es'])(
    'ignores ?lang=%j',
    (value) => {
      const search = `?lang=${encodeURIComponent(value)}`;
      expect(resolveLanguage({ ...none, search })).toBe('en');
      expect(resolveLanguage({ ...none, search, preferred: ['es'] })).toBe('es');
    },
  );

  it('ignores a tampered stored value', () => {
    expect(resolveLanguage({ ...none, stored: '"><img src=x>' })).toBe('en');
  });
});
