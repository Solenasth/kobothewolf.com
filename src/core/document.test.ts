import { describe, expect, it } from 'vitest';
import { MAX_DOCUMENT_BYTES, parseDocument } from './document';

const doc = {
  app: 'kobo-exe-editor',
  version: 1,
  estilo: 'boykisser-uwu',
  frente: 'soc-f',
  reverso: 'cer-r',
  caras: { 'soc-f': { textos: { '0': 'programming' }, ocultasPiezas: ['Checklist'], arte: 'feliz', rotSt: 4, brillitos: 5 } },
  acento: '#FF8FB8',
  escala: 100,
};
const json = (value: unknown) => JSON.stringify(value);
const errorOf = (text: string) => {
  const result = parseDocument(text);
  if (result.ok) throw new Error('expected a rejection');
  return result.error;
};

describe('FR-E17 valid documents parse', () => {
  it('accepts a version 1 document', () => {
    expect(parseDocument(json(doc))).toEqual({ ok: true, document: doc });
  });

  it('accepts an own sticker as a PNG data URI', () => {
    expect(parseDocument(json({ ...doc, artePropio: 'data:image/png;base64,iVBORw0KGgo=' })).ok).toBe(true);
  });
});

describe('T-SEC-3 hostile or garbage documents are rejected', () => {
  it.each(['__proto__', 'constructor', 'prototype'])('rejects a %s key anywhere', (key) => {
    const text = `{"app":"kobo-exe-editor","caras":{"soc-f":{"${key}":{"polluted":true}}}}`;
    expect(errorOf(text)).toEqual({ code: 'forbidden-key', key });
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('rejects files over 3 MB before parsing', () => {
    const big = json({ ...doc, pad: 'x'.repeat(MAX_DOCUMENT_BYTES) });
    expect(errorOf(big)).toEqual({ code: 'too-large', bytes: expect.any(Number) });
  });

  it('rejects text that is not JSON', () => {
    expect(errorOf('{"app":')).toEqual({ code: 'not-json' });
  });

  it.each([
    ['an unknown top-level key', { ...doc, extra: 1 }],
    ['another app', { ...doc, app: 'other' }],
    ['a future version', { ...doc, version: 2 }],
    ['text over 90 characters', { ...doc, caras: { 'soc-f': { textos: { '0': 'x'.repeat(91) } } } }],
    ['a bad face id', { ...doc, caras: { '../x': {} } }],
    ['an unknown face field', { ...doc, caras: { 'soc-f': { html: '<b>' } } }],
    ['a non-hex accent', { ...doc, acento: 'red' }],
  ])('rejects %s', (_case, value) => {
    expect(errorOf(json(value)).code).toBe('invalid');
  });
});

describe('T-SEC-2 own sticker must be a PNG data URI', () => {
  it.each([
    ['an SVG data URI', 'data:image/svg+xml;base64,PHN2Zz4='],
    ['a remote URL', 'https://example.com/a.png'],
    ['a PNG URI with script-like text', 'data:image/png;base64,abc"onerror=alert(1)'],
  ])('rejects %s', (_case, artePropio) => {
    expect(errorOf(json({ ...doc, artePropio })).code).toBe('invalid');
  });

  it('rejects an own sticker over 2 MB', () => {
    const artePropio = `data:image/png;base64,${'A'.repeat(2_796_208)}`;
    expect(errorOf(json({ ...doc, artePropio })).code).toBe('invalid');
  });
});
