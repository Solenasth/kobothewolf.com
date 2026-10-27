import { describe, expect, it } from 'vitest';
import { escalarFuentes } from '../src/core/fuentes';

describe('FR-E22 font sizes scale with their section', () => {
  it('rewrites the size in font shorthands, keeping weight, line height and family', () => {
    expect(escalarFuentes('.a { font: 17px Plumon; }')).toBe('.a { font: calc(17px * var(--tam, 1)) Plumon; }');
    expect(escalarFuentes('.b{font:15px/1.45 Plumon, cursive}')).toBe('.b{font:calc(15px * var(--tam, 1))/1.45 Plumon, cursive}');
    expect(escalarFuentes('.c { font: 500 10.5px Code; color: red }')).toBe('.c { font: 500 calc(10.5px * var(--tam, 1)) Code; color: red }');
    expect(escalarFuentes('.d { font: 12px/14px Silk }')).toBe('.d { font: calc(12px * var(--tam, 1))/14px Silk }');
  });

  it('rewrites font-size, and inline styles with no selector', () => {
    expect(escalarFuentes('.e { font-size: 21px; }')).toBe('.e { font-size: calc(21px * var(--tam, 1)); }');
    expect(escalarFuentes('position:absolute;font:28px Burbuja;color:var(--chicle)')).toBe('position:absolute;font:calc(28px * var(--tam, 1)) Burbuja;color:var(--chicle)');
  });

  it('leaves other declarations, relative sizes and already scaled sizes alone', () => {
    const css = '.f { letter-spacing: 2px; width: 40px; font-size: 1.2em; font-family: Lazo; } .g { font: calc(9px * var(--tam, 1)) Code; }';
    expect(escalarFuentes(css)).toBe(css);
    expect(escalarFuentes(escalarFuentes('.h { font: 9px Code }'))).toBe('.h { font: calc(9px * var(--tam, 1)) Code }');
  });

  it('does not touch properties that only end in "font"', () => {
    expect(escalarFuentes('.i { --my-font: 12px Code; }')).toBe('.i { --my-font: 12px Code; }');
  });
});
