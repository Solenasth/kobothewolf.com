// One style's editing session (DESIGN §5.6): every face parsed once and kept,
// with its bound marks, the store, and painting. Switching faces moves these
// elements between the viewers, so a face never loses its state or canvas.
import { parseFaces, resolveAssets } from '../core/faces';
import { bindMarks, readMarks, type BoundMarks, type FaceMarks } from '../core/marks';
import { paintFace, paintLook, type Look } from '../core/paint';
import { deriveRanges, type EditorRanges } from '../core/ranges';
import { createStore, type FaceSetup, type Notice, type StorageLike, type Store } from '../core/store';
import type { Variant } from '../core/variants';
import { getLanguage, t } from '../i18n';
import { assetUrls, montar, styleData, type EditorData } from '../styles';
import { reencode, type Efectos } from './stickers';

export interface FaceEntry {
  id: string;
  variant: Variant;
  side: 'frente' | 'reverso';
  el: HTMLElement;
  marks: FaceMarks;
  bound: BoundMarks<HTMLElement>;
  /** The variant's montar on this face, started the first time it is shown. */
  mounted?: Promise<void>;
}

export interface Session {
  estilo: string;
  variants: readonly Variant[];
  lists: EditorData;
  ranges: EditorRanges;
  efectos: Efectos;
  faces: ReadonlyMap<string, FaceEntry>;
  store: Store;
  /** Inserts nothing: call after a face is placed in a viewer. Starts its montar once and paints it. */
  shown(id: string): void;
  /** Paints the two faces on show. */
  paint(): void;
  /** Resolves when both faces on show have their images, fonts and montar done. */
  ready(): Promise<void>;
  /** The latest store notice, kept because the first ones fire before the UI subscribes. */
  readonly notice: Notice | null;
  onNotice(listener: (notice: Notice) => void): () => void;
}

/** The art key a face shows as authored: its data-arte image is `assets/st-<key>.png`. */
function authoredArt(face: Element): string | undefined {
  const src = face.querySelector('[data-arte]')?.getAttribute('src') ?? '';
  return /^assets\/st-([a-z0-9-]+)\.png$/.exec(src)?.[1];
}

/** P8's "[ your kitty here ]" placeholder, drawn in the face font so it exports like any image (FR-E5). */
const placeholders = new Map<string, string>();
function placeholder(doc: Document): string {
  const lang = getLanguage();
  const cached = placeholders.get(lang);
  if (cached) return cached;
  const canvas = doc.createElement('canvas');
  canvas.width = 500;
  canvas.height = 540;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.beginPath();
  ctx.roundRect(6, 6, 238, 258, 20);
  ctx.fillStyle = '#FFE4EE';
  ctx.fill();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#6B5B73';
  ctx.stroke();
  ctx.font = '28px Plumon';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B5B73';
  ctx.fillText(t('editor.placeholder.line1'), 125, 126);
  ctx.fillText(t('editor.placeholder.line2'), 125, 162);
  const uri = canvas.toDataURL('image/png');
  // Cache only once the font is in, so an early draw in a fallback font is redone.
  if (doc.fonts.check('28px Plumon')) placeholders.set(lang, uri);
  return uri;
}

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createSession(estilo: string, variants: readonly Variant[], doc: Document = document): Session {
  const urls = assetUrls(estilo);
  const { editor, antirreglas, efectos } = styleData(estilo);
  const ranges = deriveRanges(antirreglas, editor.escala);
  const faces = new Map<string, FaceEntry>();
  const setups: Record<string, FaceSetup> = {};

  for (const variant of variants) {
    for (const [id, el] of parseFaces(variant.html, doc)) {
      const side = id === variant.manifest.caras.frente ? 'frente' : 'reverso';
      const arte = authoredArt(el);
      resolveAssets(el, urls);
      el.dataset['estilo'] = estilo;
      const marks = readMarks(el);
      faces.set(id, { id, variant, side, el, marks, bound: bindMarks(el) });
      setups[id] = { marks, defaults: { fondo: variant.manifest.fondo[side], ...(arte ? { arte } : {}) } };
    }
  }

  const first = variants[0]!.manifest.caras;
  const store = createStore({
    estilo,
    faces: setups,
    lists: editor,
    ranges,
    initial: { frente: first.frente, reverso: first.reverso },
    storage: browserStorage(),
    reencode,
  });

  let notice: Notice | null = null;
  const noticeListeners = new Set<(notice: Notice) => void>();
  store.onNotice((n) => {
    notice = n;
    noticeListeners.forEach((l) => l(n));
  });

  const makeLetter = (letter: string, className?: string) => {
    const span = doc.createElement('span');
    span.textContent = letter;
    if (className) span.className = className;
    return span;
  };
  const artUrl = (key: string) =>
    key === 'hueco' ? placeholder(doc) : key === 'propio' ? store.document.artePropio : urls[`st-${key}.png`];

  function paintOne(id: string) {
    const face = faces.get(id)!;
    const state = store.face(id);
    paintFace(face.marks, face.bound, state, makeLetter);
    paintLook(face.el, face.marks, face.bound, state, store.document as Look, artUrl);
  }

  const showing = () => [store.document.frente, store.document.reverso].map((id) => faces.get(id)!);

  return {
    estilo,
    variants,
    lists: editor,
    ranges,
    efectos,
    faces,
    store,
    shown(id) {
      const face = faces.get(id)!;
      paintOne(id);
      face.mounted ??= montar(face.variant, face.el);
    },
    paint() {
      for (const face of showing()) paintOne(face.id);
    },
    get notice() {
      return notice;
    },
    onNotice(listener) {
      noticeListeners.add(listener);
      return () => noticeListeners.delete(listener);
    },
    async ready() {
      const on = showing();
      const images = on.flatMap((f) => [...f.el.querySelectorAll('img')]).map((img) => img.decode().catch(() => undefined));
      await Promise.all([...images, ...on.map((f) => f.mounted), doc.fonts.ready]);
    },
  };
}
