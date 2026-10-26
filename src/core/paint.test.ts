import { describe, expect, it } from 'vitest';
import { LIC_F, LIC_R } from './fixtures';
import { bindMarks, readMarks } from './marks';
import { HIDDEN_FIELD, HIDDEN_PIECE, paintFace } from './paint';
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

const state = (over: Partial<{ textos: Record<string, string>; ocultosEd: number[]; ocultasPiezas: string[] }> = {}) => ({
  textos: {},
  ocultosEd: [],
  ocultasPiezas: [],
  arte: 'feliz',
  fondo: 'gingham',
  rotSt: 0,
  brillitos: 5,
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
