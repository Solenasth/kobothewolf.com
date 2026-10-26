import { describe, expect, it } from 'vitest';
import { readMarks } from './marks';
import { LIC_F, LIC_R } from './fixtures';
import { faceFrom } from './parse5-element';

describe('FR-E3 text fields come from data-ed in document order', () => {
  it('lists fields with stable keys, authored text and their group', () => {
    const { fields } = readMarks(faceFrom(LIC_F, 'lic-f'));
    expect(fields).toEqual([
      { index: 0, key: 'Titular · línea 1', bote: true, text: 'Boy', parte: 'Titular' },
      { index: 1, key: 'Titular · remate', bote: true, letterClass: 'uwu', text: 'UwU', parte: 'Titular' },
      { index: 2, key: 'NAME', bote: false, text: 'Kobo The Wolf', parte: 'Campos' },
    ]);
  });

  it('keeps the invitation texts of an optional contact block editable', () => {
    const keys = readMarks(faceFrom(LIC_R, 'lic-r')).fields.map((f) => f.key);
    expect(keys).toEqual(['Título', 'Término 1', 'Término 2', 'Sitio · pregunta', 'Sitio · invitación', 'Firma']);
  });
});

describe('FR-E11 locked elements yield no controls', () => {
  const locked = `<div data-cara="x-r">
    <div class="qr"><span data-ed="In QR">x</span></div>
    <div class="arroba" data-ed="Handle">@KoboTheWolf</div>
    <span class="url"><i data-ed="URL">kobothewolf.com</i></span>
    <canvas data-ed="Code"></canvas>
    <p data-ed="Contact">telegram · t.me/KoboTheWolf</p>
    <p data-ed="Ok">fine</p>
  </div>`;

  it('skips data-ed on or inside locked elements and on contact text', () => {
    expect(readMarks(faceFrom(locked, 'x-r')).fields).toEqual([{ index: 0, key: 'Ok', bote: false, text: 'fine' }]);
  });

  it('never lists the main QR or @KoboTheWolf as pieces', () => {
    const keys = readMarks(faceFrom(LIC_R, 'lic-r')).pieces.map((p) => p.key);
    expect(keys).not.toContain('qr');
    expect(keys.every((k) => !k.includes('@'))).toBe(true);
  });
});

describe('FR-E4 FR-E12 pieces', () => {
  it('lists data-parte groups, then the sticker, the bow and each washi, as P8 did', () => {
    expect(readMarks(faceFrom(LIC_F, 'lic-f')).pieces).toEqual([
      { kind: 'parte', key: 'Foto', count: 1, contact: false },
      { kind: 'parte', key: 'Titular', count: 1, contact: false },
      { kind: 'parte', key: 'Campos', count: 1, contact: false },
      { kind: 'arte', key: 'arte' },
      { kind: 'lazo', key: 'lazo', count: 1 },
      { kind: 'washi', key: 'washi-1', sign: -1 },
      { kind: 'washi', key: 'washi-2', sign: 1 },
    ]);
  });

  it('groups elements that share a data-parte name and flags the optional contact block', () => {
    const pieces = readMarks(faceFrom(LIC_R, 'lic-r')).pieces;
    expect(pieces).toContainEqual({ kind: 'parte', key: 'Firma', count: 3, contact: false });
    expect(pieces).toContainEqual({ kind: 'parte', key: 'Sitio (QR + texto)', count: 1, contact: true });
    expect(pieces.filter((p) => p.kind === 'parte').map((p) => p.key)).toEqual([
      'Título',
      'Términos',
      'Sitio (QR + texto)',
      'Firma',
    ]);
  });
});

describe('FR-E5 FR-E9 art slot, rotations and sparkles', () => {
  it('reads the art slot, the authored rotation angles and the sparkle count', () => {
    const back = readMarks(faceFrom(LIC_R, 'lic-r'));
    expect(back.art).toBe('reverso');
    expect(back.rotations).toEqual([
      { kind: 'tit', degrees: 0 },
      { kind: 'st', degrees: -7 },
    ]);
    expect(back.sparks).toBe(1);
    expect(readMarks(faceFrom(LIC_F, 'lic-f')).sparks).toBe(3);
  });

  it('has no art slot or pieces on a bare face', () => {
    expect(readMarks(faceFrom('<div data-cara="b-f"><p>hi</p></div>', 'b-f'))).toEqual({
      fields: [],
      pieces: [],
      rotations: [],
      sparks: 0,
    });
  });
});
