import { describe, expect, it } from 'vitest';
import type { FaceState } from './document';
import { LIC_F, LIC_R } from './fixtures';
import { bindMarks, readMarks } from './marks';
import { HIDDEN_FIELD, HIDDEN_PIECE, NO_ART, paintFace, paintLook, type Look } from './paint';
import { FakeElement, fakeFaceFrom } from './parse5-element';

const created: FakeElement[] = [];
const makeLetter = (letter: string, className?: string) => {
  const span = new FakeElement('SPAN');
  span.textContent = letter;
  if (className) span.attributes.set('class', className);
  created.push(span);
  return span;
};

function setup(html: string, id: string) {
  const face = fakeFaceFrom(html, id);
  return { face, marks: readMarks(face), bound: bindMarks(face) };
}

const state = (over: Partial<Required<FaceState>> = {}): Required<FaceState> => ({
  textos: {},
  ocultosEd: [],
  ocultasPiezas: [],
  arte: 'feliz',
  fondo: 'gingham',
  rotSt: 0,
  brillitos: 5,
  tamanos: {},
  qr: '',
  ...over,
});

describe('FR-E3 paint applies texts', () => {
  it('writes edited text and keeps authored text elsewhere', () => {
    const { marks, bound } = setup(LIC_R, 'lic-r');
    paintFace(marks, bound, state({ textos: { '1': 'new term' } }), makeLetter);
    expect(bound.fields[0]!.textContent).toBe('terms & conditions');
    expect(bound.fields[1]!.textContent).toBe('new term');
  });

  it('rebuilds bounce text as one span per letter, spaces as no-break spaces', () => {
    const { marks, bound } = setup(LIC_F, 'lic-f');
    paintFace(marks, bound, state({ textos: { '1': 'o w' } }), makeLetter);
    const letters = (bound.fields[1] as FakeElement).children;
    expect(letters.map((s) => s.textContent)).toEqual(['o', ' ', 'w']);
    expect(letters.every((s) => s.getAttribute('class') === 'uwu')).toBe(true);
  });
});

describe('T-SEC-1 text is never parsed as HTML', () => {
  const payload = '<img src=x onerror=alert(1)>';

  it('a plain field holds the payload as literal text, with no child elements', () => {
    const { marks, bound } = setup(LIC_R, 'lic-r');
    paintFace(marks, bound, state({ textos: { '0': payload } }), makeLetter);
    const field = bound.fields[0] as FakeElement;
    expect(field.textContent).toBe(payload);
    expect(field.children).toEqual([]);
  });

  it('a bounce field gets only letter spans, one character each', () => {
    created.length = 0;
    const { marks, bound } = setup(LIC_F, 'lic-f');
    paintFace(marks, bound, state({ textos: { '0': payload } }), makeLetter);
    const letters = (bound.fields[0] as FakeElement).children;
    expect(letters).toHaveLength(payload.length);
    expect(letters.every((s) => s.tagName === 'SPAN' && s.textContent.length === 1 && s.children.length === 0)).toBe(true);
    expect(created.every((s) => s.tagName === 'SPAN')).toBe(true);
  });
});

describe('FR-E3 FR-E4 paint applies visibility', () => {
  it('hides fields by index and every element of a hidden piece', () => {
    const { marks, bound } = setup(LIC_R, 'lic-r');
    paintFace(marks, bound, state({ ocultosEd: [2], ocultasPiezas: ['Firma', 'arte'] }), makeLetter);
    expect(bound.fields.map((f) => f.getAttribute(HIDDEN_FIELD) !== null)).toEqual([false, false, true, false, false, false]);
    expect(bound.pieces.get('Firma')!.every((el) => el.getAttribute(HIDDEN_PIECE) === '')).toBe(true);
    expect(bound.pieces.get('arte')![0]!.getAttribute(HIDDEN_PIECE)).toBe('');
    expect(bound.pieces.get('Título')![0]!.getAttribute(HIDDEN_PIECE)).toBeNull();
  });

  it('shows them again when the state clears', () => {
    const { marks, bound } = setup(LIC_F, 'lic-f');
    paintFace(marks, bound, state({ ocultosEd: [0], ocultasPiezas: ['washi-2', 'lazo'] }), makeLetter);
    paintFace(marks, bound, state(), makeLetter);
    const flagged = [...bound.fields, ...[...bound.pieces.values()].flat()].filter(
      (el) => el.getAttribute(HIDDEN_FIELD) !== null || el.getAttribute(HIDDEN_PIECE) !== null,
    );
    expect(flagged).toEqual([]);
  });
});

const look: Look = { acento: '#8EC5FF', sombra: '#CDB4DB', rotTit: -2, escala: 110, anguloWashi: 14 };
const urls: Record<string, string> = { feliz: '/assets/st-feliz-x.png', clik: '/assets/st-clik-y.png' };

describe('FR-E5 FR-E7 FR-E8 FR-E9 paintLook applies the rest of the face state', () => {
  it('sets the background class, replacing the previous one, and the colors on the root', () => {
    const { face, marks, bound } = setup(LIC_F, 'lic-f');
    face.classList.add('fondo-crema');
    paintLook(face, marks, bound, state({ fondo: 'gingham' }), look, (k) => urls[k]);
    expect([...face.classList].filter((c) => c.startsWith('fondo-'))).toEqual(['fondo-gingham']);
    expect(face.style.props).toEqual(new Map([['--acento', '#8EC5FF'], ['--sombra', '#CDB4DB']]));
  });

  it('points the art at the chosen sticker and scales it; a rotating sticker keeps its own angle', () => {
    const front = setup(LIC_F, 'lic-f');
    paintLook(front.face, front.marks, front.bound, state(), look, (k) => urls[k]);
    const frontArt = front.bound.pieces.get('arte')![0]!;
    expect(frontArt.getAttribute('src')).toBe('/assets/st-feliz-x.png');
    expect(frontArt.style.transform).toBe('scale(1.1)');

    const back = setup(LIC_R, 'lic-r');
    paintLook(back.face, back.marks, back.bound, state({ arte: 'clik', rotSt: -7 }), look, (k) => urls[k]);
    expect(back.bound.pieces.get('arte')![0]!.style.transform).toBe('rotate(-7deg) scale(1.1)');
  });

  it('shows the placeholder or the user\'s sticker through the same URL lookup', () => {
    const { face, marks, bound } = setup(LIC_F, 'lic-f');
    const lookup = (k: string) => ({ ...urls, hueco: 'data:image/png;base64,HUECO', propio: 'data:image/png;base64,MINE' })[k];
    paintLook(face, marks, bound, state({ arte: 'hueco' }), look, lookup);
    expect(bound.pieces.get('arte')![0]!.getAttribute('src')).toBe('data:image/png;base64,HUECO');
    paintLook(face, marks, bound, state({ arte: 'propio' }), look, lookup);
    expect(bound.pieces.get('arte')![0]!.getAttribute('src')).toBe('data:image/png;base64,MINE');
  });

  it('hides the art on a back set to "ninguno", and shows it again for any other art', () => {
    const { face, marks, bound } = setup(LIC_R, 'lic-r');
    const art = bound.pieces.get('arte')![0]!;
    paintLook(face, marks, bound, state({ arte: 'ninguno' }), look, (k) => urls[k]);
    expect(art.getAttribute(NO_ART)).toBe('');
    paintLook(face, marks, bound, state({ arte: 'clik' }), look, (k) => urls[k]);
    expect(art.getAttribute(NO_ART)).toBeNull();
  });

  it('rotates headlines to the shared angle and each washi by the shared angle with its authored sign', () => {
    const { face, marks, bound } = setup(LIC_F, 'lic-f');
    paintLook(face, marks, bound, state(), look, (k) => urls[k]);
    expect(bound.rotations.map((el) => el.style.transform)).toEqual(['rotate(-2deg)']);
    expect([bound.pieces.get('washi-1')![0]!.style.transform, bound.pieces.get('washi-2')![0]!.style.transform]).toEqual([
      'rotate(-14deg)',
      'rotate(14deg)',
    ]);
  });

  it('shows only as many sparkles as the face state asks for', () => {
    const { face, marks, bound } = setup(LIC_F, 'lic-f');
    paintLook(face, marks, bound, state({ brillitos: 2 }), look, (k) => urls[k]);
    expect(bound.sparks.map((el) => el.style.display)).toEqual(['', '', 'none']);
    paintLook(face, marks, bound, state({ brillitos: 3 }), look, (k) => urls[k]);
    expect(bound.sparks.map((el) => el.style.display)).toEqual(['', '', '']);
  });
});
