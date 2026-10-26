// Applies a face's state to its elements, as P8's pintar() did (DESIGN §5.2).
// Text only ever goes in through textContent or per-letter spans built by the
// caller, never as HTML (NFR-4, T-SEC-1). Art, background, rotations and
// sparkles are painted with their controls (#16).
import type { FaceState } from './document';
import type { BoundMarks, FaceMarks, MarkElement } from './marks';

export interface PaintElement extends MarkElement {
  textContent: string | null;
  toggleAttribute(name: string, force: boolean): boolean;
  replaceChildren(...nodes: unknown[]): void;
}

/** Builds one letter <span> for bounce text: `document.createElement` + textContent. */
export type MakeLetter = (letter: string, className?: string) => unknown;

/** CSS for the hide attributes: `[data-oculto],[data-oculto-pieza]{display:none!important}`. */
export const HIDDEN_FIELD = 'data-oculto';
export const HIDDEN_PIECE = 'data-oculto-pieza';

export function paintFace<E extends PaintElement>(
  marks: FaceMarks,
  bound: BoundMarks<E>,
  state: Readonly<Required<FaceState>>,
  makeLetter: MakeLetter,
) {
  marks.fields.forEach((field, i) => {
    const el = bound.fields[i]!;
    const text = state.textos[String(i)] ?? field.text;
    if (field.bote) {
      el.replaceChildren(...[...text].map((ch) => makeLetter(ch === ' ' ? '\u00a0' : ch, field.letterClass)));
    } else {
      el.textContent = text;
    }
    el.toggleAttribute(HIDDEN_FIELD, state.ocultosEd.includes(i));
  });

  for (const [key, elements] of bound.pieces) {
    const hidden = state.ocultasPiezas.includes(key);
    for (const el of elements) el.toggleAttribute(HIDDEN_PIECE, hidden);
  }
}
