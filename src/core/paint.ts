// Applies a face's state to its elements, as P8's pintar() did (DESIGN §5.2).
// Text only ever goes in through textContent or per-letter spans built by the
// caller, never as HTML (NFR-4, T-SEC-1).
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
/** Set on the art when a back shows no art ("ninguno"). */
export const NO_ART = 'data-sin-arte';

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

/** What paintLook() changes on an element. */
export interface LookElement extends MarkElement {
  setAttribute(name: string, value: string): void;
  toggleAttribute(name: string, force: boolean): boolean;
  readonly style: { transform: string; display: string; setProperty(name: string, value: string): void };
}

/** The face root also gets its background class. */
export interface LookRoot extends LookElement {
  readonly classList: Iterable<string> & { add(token: string): void; remove(token: string): void };
}

/** The document-wide values a face shows. */
export interface Look {
  acento: string;
  sombra: string;
  rotTit: number;
  escala: number;
  anguloWashi: number;
}

/**
 * Paints the rest of a face's state (FR-E5, FR-E7–E9): background class,
 * accent and shadow, art, the sticker's rotation and scale, headline rotation,
 * washi angles and the number of sparkles. `artUrl` maps an art key to its
 * image (a style sticker, the placeholder or the user's sticker); "ninguno"
 * hides the art.
 */
export function paintLook<E extends LookElement>(
  root: LookRoot,
  marks: FaceMarks,
  bound: BoundMarks<E>,
  state: Readonly<Required<FaceState>>,
  look: Look,
  artUrl: (key: string) => string | undefined,
) {
  for (const cls of [...root.classList]) if (cls.startsWith('fondo-') && cls !== `fondo-${state.fondo}`) root.classList.remove(cls);
  root.classList.add(`fondo-${state.fondo}`);
  root.style.setProperty('--acento', look.acento);
  root.style.setProperty('--sombra', look.sombra);

  const url = artUrl(state.arte);
  for (const el of bound.pieces.get('arte') ?? []) {
    if (url !== undefined) el.setAttribute('src', url);
    el.toggleAttribute(NO_ART, state.arte === 'ninguno');
    const rotation = el.getAttribute('data-rot') === 'st' ? `rotate(${state.rotSt}deg) ` : '';
    el.style.transform = `${rotation}scale(${look.escala / 100})`;
  }

  marks.rotations.forEach((rotation, i) => {
    if (rotation.kind === 'tit') bound.rotations[i]!.style.transform = `rotate(${look.rotTit}deg)`;
  });

  for (const piece of marks.pieces) {
    if (piece.kind !== 'washi') continue;
    for (const el of bound.pieces.get(piece.key) ?? []) el.style.transform = `rotate(${piece.sign * look.anguloWashi}deg)`;
  }

  bound.sparks.forEach((el, i) => {
    el.style.display = i < state.brillitos ? '' : 'none';
  });

  // Text size per section (FR-E22): the face's font sizes multiply by --tam.
  for (const [section, els] of bound.sections) {
    for (const el of els) el.style.setProperty('--tam', String((state.tamanos[section] ?? 100) / 100));
  }
}
