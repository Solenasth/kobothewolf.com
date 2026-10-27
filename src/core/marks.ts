// The marks contract (DESIGN §3.2, docs/marcas.md): what a face's HTML says
// the editor may change. Works on any tree with this minimal element shape, so
// the browser passes DOM elements and Node tests pass parse5 trees.

export interface MarkElement {
  readonly tagName: string;
  getAttribute(name: string): string | null;
  readonly children: Iterable<MarkElement>;
  readonly textContent: string | null;
}

/** Elements that are never editable and never hidden on their own (FR-E11). */
export const LOCKED_CLASSES = ['qr', 'arroba', 'url'] as const;
/** Text that is contact data and therefore locked, wherever it appears. */
export const CONTACT_TEXT = /@KoboTheWolf|t\.me\/|kobothewolf\.com/i;
/** Built-in piece keys; data-parte names must not reuse them. */
export const BUILTIN_PIECES = ['arte', 'lazo'] as const;

export interface TextField {
  /** Position among the face's editable fields; documents store texts by it. */
  index: number;
  /** Stable key from data-ed; the label is the catalog entry `ed.<key>`. */
  key: string;
  /** Letter-by-letter bounce text (data-bote), with an optional class per letter. */
  bote: boolean;
  letterClass?: string;
  /** The text as authored (FR-I6). */
  text: string;
  /** The data-parte group the field lives in, if any. */
  parte?: string;
}

export type Piece =
  | { kind: 'parte'; key: string; count: number; contact: boolean }
  | { kind: 'arte'; key: 'arte' }
  | { kind: 'lazo'; key: 'lazo'; count: number }
  | { kind: 'washi'; key: `washi-${number}`; sign: 1 | -1 };

export interface Rotation {
  kind: 'st' | 'tit';
  /** Angle in the authored HTML; the editor keeps its sign (mirroring). */
  degrees: number;
}

export interface FaceMarks {
  fields: TextField[];
  pieces: Piece[];
  art?: 'frente' | 'reverso';
  rotations: Rotation[];
  sparks: number;
}

const classesOf = (el: MarkElement) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const isLocked = (el: MarkElement) =>
  el.tagName.toLowerCase() === 'canvas' || classesOf(el).some((c) => (LOCKED_CLASSES as readonly string[]).includes(c));
const textOf = (el: MarkElement) => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function angle(style: string | null, pattern: RegExp): number {
  const match = pattern.exec(style ?? '');
  return match ? Number(match[1]) : 0;
}

function* walk<E extends MarkElement>(root: E, chain: E[] = []): Generator<{ el: E; chain: E[] }> {
  for (const el of root.children as Iterable<E>) {
    const next = [...chain, el];
    yield { el, chain: next };
    yield* walk(el, next);
  }
}

/** The elements behind each field and piece, in the same order as readMarks(). */
export interface BoundMarks<E extends MarkElement> {
  fields: E[];
  pieces: Map<string, E[]>;
  sparks: E[];
  /** One per FaceMarks.rotations entry. */
  rotations: E[];
}

/** Reads the marks of one face root (the element with data-cara). */
export function readMarks(face: MarkElement): FaceMarks {
  return scan(face).marks;
}

/** Same scan as readMarks(), keeping the elements for painting. */
export function bindMarks<E extends MarkElement>(face: E): BoundMarks<E> {
  return scan(face).bound;
}

function scan<E extends MarkElement>(face: E): { marks: FaceMarks; bound: BoundMarks<E> } {
  const bound: BoundMarks<E> = { fields: [], pieces: new Map(), sparks: [], rotations: [] };
  const bind = (key: string, el: E) => bound.pieces.set(key, [...(bound.pieces.get(key) ?? []), el]);
  const fields: TextField[] = [];
  const partes = new Map<string, { count: number; contact: boolean }>();
  const rotations: Rotation[] = [];
  let art: FaceMarks['art'];
  let lazos = 0;
  let sparks = 0;
  const washis: (1 | -1)[] = [];

  for (const { el, chain } of walk(face)) {
    const locked = chain.some(isLocked);
    const parteEl = [...chain].reverse().find((e) => e.getAttribute('data-parte') !== null);
    const parte = parteEl?.getAttribute('data-parte') ?? undefined;

    const own = el.getAttribute('data-parte');
    if (own !== null) {
      const group = partes.get(own) ?? { count: 0, contact: false };
      group.count++;
      partes.set(own, group);
      bind(own, el);
    }
    if (parte !== undefined && locked) partes.get(parte)!.contact = true;

    const key = el.getAttribute('data-ed');
    if (key !== null && !locked && !CONTACT_TEXT.test(textOf(el))) {
      const cls = el.getAttribute('data-cls');
      bound.fields.push(el);
      fields.push({
        index: fields.length,
        key,
        bote: el.getAttribute('data-bote') !== null,
        ...(cls ? { letterClass: cls } : {}),
        text: textOf(el),
        ...(parte !== undefined ? { parte } : {}),
      });
    }

    const slot = el.getAttribute('data-arte');
    if (slot === 'frente' || slot === 'reverso') {
      art ??= slot;
      bind('arte', el);
    }

    const rot = el.getAttribute('data-rot');
    if (rot === 'st' || rot === 'tit') {
      rotations.push({ kind: rot, degrees: angle(el.getAttribute('style'), /rotate\((-?[\d.]+)deg\)/) });
      bound.rotations.push(el);
    }

    if (el.getAttribute('data-lazo') !== null) {
      lazos++;
      bind('lazo', el);
    }
    const classes = classesOf(el);
    if (classes.includes('spark')) {
      sparks++;
      bound.sparks.push(el);
    }
    if (classes.includes('washi')) {
      washis.push(angle(el.getAttribute('style'), /--r:\s*(-?[\d.]+)deg/) < 0 ? -1 : 1);
      bind(`washi-${washis.length}`, el);
    }
  }

  const pieces: Piece[] = [...partes].map(([key, g]) => ({ kind: 'parte', key, count: g.count, contact: g.contact }));
  if (art) pieces.push({ kind: 'arte', key: 'arte' });
  if (lazos) pieces.push({ kind: 'lazo', key: 'lazo', count: lazos });
  washis.forEach((sign, i) => pieces.push({ kind: 'washi', key: `washi-${i + 1}`, sign }));

  return { marks: { fields, pieces, ...(art ? { art } : {}), rotations, sparks }, bound };
}
