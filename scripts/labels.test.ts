import { describe, expect, it } from 'vitest';
import { checkLabels, requiredLabels, type LabelSource } from './labels.ts';

const editor = { fondos: ['gingham'], arte: ['feliz'], acentos: ['#FF8FB8'], sombras: ['#FF8FB8', '#BDE0FE'] };
const html =
  '<div data-cara="x-f"><div class="card"><h2 data-ed="Titular" data-parte="Cabeza">hi</h2><p data-ed="Frase">yo</p></div></div>' +
  '<div data-cara="x-r"><div class="card"><div class="qr"></div><div class="arroba">@KoboTheWolf</div>' +
  '<div class="sitio" data-parte="Sitio"><b data-ed="Sitio · pregunta">?</b><span class="url">kobothewolf.com</span></div></div></div>';
const source: LabelSource = { editor, variants: [{ id: 'x', html }] };

const all = {
  'fondo.gingham': 'g',
  'arte.feliz': 'f',
  'color.ff8fb8': 'p',
  'color.bde0fe': 'b',
  'variant.x.name': 'X',
  'face.x-f.name': 'X front',
  'face.x-r.name': 'X back',
  'ed.Titular': 'Headline',
  'ed.Frase': 'Phrase',
  'ed.Sitio · pregunta': 'Site question',
  'parte.Cabeza': 'Head',
  'parte.Sitio': 'Site',
};

describe('FR-I1 FR-I5 every key a style uses has a label', () => {
  it('collects editor, variant, face, text and piece keys', () => {
    expect([...requiredLabels(source).keys()].sort()).toEqual(Object.keys(all).sort());
  });

  it('writes colors in lowercase without #, once each', () => {
    const keys = [...requiredLabels(source).keys()].filter((k) => k.startsWith('color.'));
    expect(keys).toEqual(['color.ff8fb8', 'color.bde0fe']);
  });

  it('accepts catalogs that label exactly those keys', () => {
    expect(checkLabels('s/i18n', { en: all, es: all }, requiredLabels(source))).toEqual([]);
  });

  it('names the language, the key and where it is used when a label is missing', () => {
    const { ['ed.Frase']: _, ...es } = all;
    expect(checkLabels('s/i18n', { en: all, es }, requiredLabels(source))).toEqual([
      's/i18n/es.json: missing label "ed.Frase" (used by x-f)',
    ]);
  });

  it('rejects a label nothing uses', () => {
    expect(checkLabels('s/i18n', { en: { ...all, 'ed.Viejo': 'old' } }, requiredLabels(source))).toEqual([
      's/i18n/en.json: label "ed.Viejo" is not used by the style',
    ]);
  });

  it('needs no label for contact text, which is never editable', () => {
    const keys = [...requiredLabels(source).keys()];
    expect(keys.some((k) => /arroba|qr|url/.test(k))).toBe(false);
  });
});
