import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, DEFAULT_TOKENS, readThemes, themesCss, type ThemeFile } from '../scripts/themes.ts';

// FR-P10, NFR-6: page themes keep WCAG AA text and 3:1 focus rings.

const file = JSON.parse(readFileSync('styles/boykisser-uwu/temas.json', 'utf8')) as ThemeFile;
const colors = (JSON.parse(readFileSync('styles/boykisser-uwu/tokens.json', 'utf8')) as { color: Record<string, string> }).color;
const result = readThemes(file, colors);
if (!result.ok) throw new Error(result.problems.join('\n'));
const { themes, byDefault } = result;

describe('FR-P10 the boykisser-uwu themes', () => {
  it('are the four cards, with today\'s look as the untouched default', () => {
    expect(themes.map((t) => t.id)).toEqual(['certificado', 'licencia', 'codigo', 'socks']);
    expect(byDefault).toBe('certificado');
    expect(themes[0]!.tokens).toEqual(DEFAULT_TOKENS);
    expect(themesCss(themes, byDefault)).not.toContain('"certificado"');
  });

  it('today\'s tokens match ui.css, so the default theme is the real current look', () => {
    const css = readFileSync('src/theme/ui.css', 'utf8');
    for (const [name, hex] of Object.entries(DEFAULT_TOKENS)) expect(css, name).toMatch(new RegExp(`--${name}: ${hex};`, 'i'));
  });

  for (const theme of themes) {
    it(`${theme.id}: text 4.5:1 and focus rings 3:1 on its panels, background and pattern`, () => {
      const t = theme.tokens;
      const surfaces = [t['ui-panel'], t['ui-bg'], ...theme.pattern];
      for (const surface of surfaces) {
        for (const [name, fg] of [['text', t['ui-text']], ['muted', t['ui-muted']], ['accent', t['ui-accent-text']]] as const) {
          expect(contrast(fg, surface), `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(t['ui-focus'], surface), `focus on ${surface}`).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(t['ui-text'], t.chicle), 'button text on --chicle').toBeGreaterThanOrEqual(4.5);
    });
  }

  it('patterned themes put the editor on a solid panel', () => {
    const css = themesCss(themes, byDefault);
    for (const t of themes.filter((x) => x.fondo === 'cuaderno' || x.fondo === 'femboy')) expect(css).toContain(`:root[data-theme="${t.id}"] .editor { background: var(--ui-bg);`);
  });

  for (const lang of ['en', 'es']) {
    it(`${lang} labels the switcher and every theme`, () => {
      const catalog = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
      expect(catalog['theme.label']).toBeTruthy();
      for (const t of themes) expect(catalog[`theme.${t.id}`], t.id).toBeTruthy();
    });
  }
});

describe('FR-P10 checking a temas.json', () => {
  const base: ThemeFile = { porDefecto: 'a', temas: [{ id: 'a', fondo: 'liso', colores: {} }] };

  it('accepts token names and hex colors', () => {
    const ok = readThemes({ ...base, temas: [{ id: 'a', fondo: 'liso', colores: { 'ui-bg': 'crema_leche', 'ui-focus': '#123456' } }] }, colors);
    expect(ok.ok && ok.themes[0]!.tokens['ui-bg']).toBe('#FFF8EE');
  });

  it('rejects unknown colors, tokens, backgrounds, duplicates and a missing default', () => {
    const bad = readThemes(
      {
        porDefecto: 'nope',
        temas: [
          { id: 'a', fondo: 'neon', colores: { 'ui-bg': 'chartreuse', 'ui-text': '#000000' } },
          { id: 'a', fondo: 'liso', colores: {} },
        ],
      },
      colors,
    );
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.problems).toEqual([
      'theme "a": background "neon" isn\'t one of liso, cuaderno, crema, femboy',
      'theme "a": ui-bg = "chartreuse" is neither a hex color nor a color in tokens.json',
      'theme "a": "ui-text" isn\'t a token a theme may set (ui-bg, ui-line, ui-muted, ui-focus, ui-accent-text, chicle, rosa, algodon)',
      'theme "a" is listed twice',
      'the default theme "nope" isn\'t listed',
    ]);
  });
});
