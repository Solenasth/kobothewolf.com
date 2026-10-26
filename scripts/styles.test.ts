import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createAjv } from './schemas.ts';
import { checkStyle, type StyleData } from './styles.ts';

const ajv = createAjv();
const tokens = JSON.parse(readFileSync('styles/boykisser-uwu/tokens.json', 'utf8'));
const editor = JSON.parse(readFileSync('styles/boykisser-uwu/editor.json', 'utf8'));
const clone = <T>(v: T): T => structuredClone(v);

const html =
  '<div data-cara="lic-f"><p data-ed="T">hi</p></div>' +
  '<div data-cara="lic-r"><div class="qr"></div><div class="arroba">@KoboTheWolf</div></div>';
const manifest = {
  id: 'licencia',
  caras: { frente: 'lic-f', reverso: 'lic-r' },
  fondo: { frente: 'gingham', reverso: 'cuaderno' },
  archivo: 'boykisser-license',
  controles: ['textos', 'arte'],
};

const style = (over: Partial<StyleData> = {}): StyleData => ({
  dir: 'styles/boykisser-uwu',
  tokens: clone(tokens),
  editor: clone(editor),
  variants: [{ dir: 'styles/boykisser-uwu/variantes/licencia', manifest: clone(manifest), html }],
  assets: ['st-licencia.png', 'st-feliz.png', 'st-clik.png', 'st-yap.png'],
  ...over,
});

describe('FR-B3 style data passes validate', () => {
  it('accepts the real boykisser-uwu tokens and editor lists with a valid variant', () => {
    expect(checkStyle(ajv, style())).toEqual([]);
  });
});

describe('FR-B3 schemas reject bad data', () => {
  it('rejects tokens with an unknown key or a bad color', () => {
    const t = clone(tokens);
    t.extra = 1;
    t.color.tinta = 'pink';
    const errors = checkStyle(ajv, style({ tokens: t }));
    expect(errors).toContainEqual(expect.stringContaining('must NOT have additional properties'));
    expect(errors).toContainEqual(expect.stringContaining('/color/tinta'));
  });

  it('rejects tokens whose contact is not the locked Telegram handle', () => {
    const t = clone(tokens);
    t.contacto.telegram = '@someone';
    expect(checkStyle(ajv, style({ tokens: t }))).toContainEqual(expect.stringContaining('/contacto/telegram'));
  });

  it('rejects editor lists with a missing field', () => {
    const e = clone(editor);
    delete e.escala;
    expect(checkStyle(ajv, style({ editor: e }))).toContainEqual(expect.stringContaining("must have required property 'escala'"));
  });

  it('rejects a variant manifest with a bad face id', () => {
    const m = { ...clone(manifest), caras: { frente: 'lic-f', reverso: 'lic-x' } };
    expect(checkStyle(ajv, style({ variants: [{ dir: 'v/licencia', manifest: m, html }] }))).toContainEqual(
      expect.stringContaining('/caras/reverso'),
    );
  });

  it('accepts a tab position and rejects one that is not a whole number', () => {
    const v = (orden: unknown) => [{ dir: 'v/licencia', manifest: { ...clone(manifest), orden }, html }];
    expect(checkStyle(ajv, style({ variants: v(2) }))).toEqual([]);
    expect(checkStyle(ajv, style({ variants: v(1.5) }))).toContainEqual(expect.stringContaining('/orden must be integer'));
    expect(checkStyle(ajv, style({ variants: v(-1) }))).toContainEqual(expect.stringContaining('/orden must be >= 0'));
  });
});

describe('FR-E8 FR-E9 cross-file rules', () => {
  it('rejects an accent that is not a style color token', () => {
    const e = { ...clone(editor), acentos: ['#123456'] };
    expect(checkStyle(ajv, style({ editor: e }))).toEqual([expect.stringContaining('acentos #123456 is not a color token')]);
  });

  it('rejects tokens missing an anti-rule a range is derived from', () => {
    const t = clone(tokens);
    delete t.antirreglas.rotacion_titulares_grados;
    expect(checkStyle(ajv, style({ tokens: t }))).toEqual([expect.stringContaining('rotacion_titulares_grados')]);
  });

  it('rejects a style folder that does not match tokens.estilo', () => {
    expect(checkStyle(ajv, style({ dir: 'styles/other' }))).toEqual([expect.stringContaining('must match the folder')]);
  });

  it('rejects a variant whose id does not match its folder', () => {
    expect(checkStyle(ajv, style({ variants: [{ dir: 'v/codigo', manifest: clone(manifest), html }] }))).toEqual([
      expect.stringContaining('id "licencia" must match the folder "codigo"'),
    ]);
  });

  it('rejects a variant whose faces are missing from caras.html', () => {
    const only = '<div data-cara="lic-f"></div>';
    expect(checkStyle(ajv, style({ variants: [{ dir: 'v/licencia', manifest: clone(manifest), html: only }] }))).toEqual([
      expect.stringContaining('face "lic-r" from variant.json is missing'),
    ]);
  });

  it('rejects a default background that is not in editor.json fondos', () => {
    const m = { ...clone(manifest), fondo: { frente: 'gingham', reverso: 'lunares' } };
    expect(checkStyle(ajv, style({ variants: [{ dir: 'v/licencia', manifest: m, html }] }))).toEqual([
      'v/licencia/variant.json: fondo.reverso "lunares" is not in editor.json fondos',
    ]);
  });

  it('rejects an art key without its sticker file', () => {
    expect(checkStyle(ajv, style({ assets: ['st-licencia.png', 'st-feliz.png', 'st-clik.png'] }))).toEqual([
      'styles/boykisser-uwu/editor.json: art "yap" has no assets/st-yap.png',
    ]);
  });

  it('checks face image paths against the style assets', () => {
    const withImg = html.replace('<p data-ed="T">hi</p>', '<img src="assets/st-none.png">');
    expect(checkStyle(ajv, style({ variants: [{ dir: 'v/licencia', manifest: clone(manifest), html: withImg }] }))).toEqual([
      expect.stringContaining('src="assets/st-none.png" does not exist'),
    ]);
  });

  it('rejects a variant without caras.html', () => {
    expect(checkStyle(ajv, style({ variants: [{ dir: 'v/licencia', manifest: clone(manifest) }] }))).toEqual([
      'v/licencia/caras.html: missing',
    ]);
  });
});
