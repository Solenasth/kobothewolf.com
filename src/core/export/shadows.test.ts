import { describe, expect, it } from 'vitest';
import { parseShadows } from './shadows';

describe('FR-E14 the WebKit shadow fix reads computed box-shadow values', () => {
  it('splits layers at top-level commas, keeping commas inside rgb()', () => {
    expect(parseShadows('rgb(43, 34, 51) 0px 0px 0px 3.5px, rgb(255, 143, 184) 8px 9px 0px 3.5px')).toEqual([
      { color: 'rgb(43, 34, 51)', inset: false, x: 0, y: 0, blur: 0, spread: 3.5 },
      { color: 'rgb(255, 143, 184)', inset: false, x: 8, y: 9, blur: 0, spread: 3.5 },
    ]);
  });

  it('reads blur, negative offsets, inset and a hex color', () => {
    expect(parseShadows('#2b2233 -2px 3px 6px')).toEqual([{ color: '#2b2233', inset: false, x: -2, y: 3, blur: 6, spread: 0 }]);
    expect(parseShadows('rgba(0, 0, 0, 0.5) 0px 1px 0px 0px inset')[0]).toMatchObject({ inset: true, color: 'rgba(0, 0, 0, 0.5)' });
  });

  it('returns no layers for an empty value', () => {
    expect(parseShadows('')).toEqual([]);
  });
});
