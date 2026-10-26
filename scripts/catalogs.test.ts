import { describe, expect, it } from 'vitest';
import { checkCatalogs } from './catalogs.ts';

const langs = ['en', 'es'];

describe('FR-I5 catalog key check', () => {
  it('accepts catalogs with the same keys in every language', () => {
    expect(checkCatalogs('d', { en: { a: 'A', b: 'B' }, es: { b: 'Be', a: 'A' } }, langs)).toEqual([]);
  });

  it('fails when a language lacks a key another has', () => {
    expect(checkCatalogs('d', { en: { a: 'A', b: 'B' }, es: { a: 'A' } }, langs)).toEqual([
      'd/es.json: missing key "b"',
    ]);
  });

  it('reports keys missing on either side', () => {
    expect(checkCatalogs('d', { en: { a: 'A' }, es: { b: 'B' } }, langs)).toEqual([
      'd/en.json: missing key "b"',
      'd/es.json: missing key "a"',
    ]);
  });

  it('fails when a language file is missing', () => {
    expect(checkCatalogs('d', { en: { a: 'A' } }, langs)).toEqual(['d/es.json: missing']);
  });

  it('fails on a file for an unsupported language', () => {
    expect(checkCatalogs('d', { en: {}, es: {}, fr: {} }, langs)).toEqual([
      'd/fr.json: "fr" is not a supported language',
    ]);
  });

  it('fails on nested, non-string or empty values', () => {
    expect(checkCatalogs('d', { en: { a: { b: 'x' }, c: 1, e: ' ' }, es: { a: 'A', c: 'C', e: 'E' } }, langs)).toEqual([
      'd/en.json: "a" must be a non-empty string',
      'd/en.json: "c" must be a non-empty string',
      'd/en.json: "e" must be a non-empty string',
    ]);
  });

  it('fails when a catalog is not an object', () => {
    expect(checkCatalogs('d', { en: ['a'], es: {} }, langs)).toEqual(['d/en.json: must be a JSON object']);
  });
});
