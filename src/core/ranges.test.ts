import { describe, expect, it } from 'vitest';
import tokens from '../../styles/boykisser-uwu/tokens.json';
import { deriveRanges } from './ranges';

describe('FR-E9 ranges come from tokens.json', () => {
  it('derives the boykisser-uwu ranges', () => {
    expect(deriveRanges(tokens.antirreglas, [85, 115])).toEqual({
      rotSt: [-8, 7],
      rotTit: [-4, 3],
      washi: [12, 18],
      brillitos: [5, 9],
      escala: [85, 115],
      tamano: [85, 115],
    });
  });

  it('throws on a missing or malformed anti-rule', () => {
    expect(() => deriveRanges({}, [85, 115])).toThrow('rotacion_stickers_grados');
    expect(() => deriveRanges({ ...tokens.antirreglas, rotacion_stickers_grados: [7, -8] }, [85, 115])).toThrow();
    expect(() => deriveRanges({ ...tokens.antirreglas, washi: { grados: 'x' } }, [85, 115])).toThrow('washi.grados');
  });
});
