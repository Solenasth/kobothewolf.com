// The document store (DESIGN §5.2). One state object per face for the whole
// session: actions and migration change it in place and never replace it,
// which was the P8 v5 bug (EV §10). Every value from outside is checked
// against the style before it is kept.
import { parseDocument, type FaceState, type KoboDocument, type ParseError } from './document';
import type { FaceMarks } from './marks';
import type { EditorRanges, Range } from './ranges';

export const STORAGE_KEY = 'kobo-editor-v1';
export const MAX_TEXT = 90;
/** 2 MB of PNG, as a base64 data URI (FR-E16). */
export const MAX_OWN_ART = 'data:image/png;base64,'.length + 4 * Math.ceil((2 * 1024 * 1024) / 3);
const PNG_DATA_URI = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FaceSetup {
  marks: FaceMarks;
  defaults: { fondo: string; arte?: string };
}

export interface StyleLists {
  fondos: readonly string[];
  arte: readonly string[];
  acentos: readonly string[];
  sombras: readonly string[];
  /** Starting values of the shared ranges (editor.json → inicial). */
  inicial: Readonly<Record<'rotTit' | 'anguloWashi' | 'brillitos' | 'escala', number>>;
}

export interface StoreOptions {
  estilo: string;
  faces: Readonly<Record<string, FaceSetup>>;
  lists: StyleLists;
  ranges: EditorRanges;
  initial: { frente: string; reverso: string };
  /** null when the browser offers no storage at all. */
  storage: StorageLike | null;
  /** Re-encodes an untrusted PNG data URI through a canvas (browser) and returns the new one. */
  reencode: (dataUri: string) => Promise<string>;
  /** Debounce for saving; tests pass a manual scheduler. */
  schedule?: (save: () => void) => void;
}

export type Notice = 'storage-unavailable' | 'storage-full' | 'sticker-not-saved' | 'saved-state-invalid';
export type ImportError = ParseError | { code: 'other-style'; estilo: string } | { code: 'bad-image' };
type GlobalKey = 'acento' | 'sombra' | 'rotTit' | 'escala' | 'anguloWashi';
type FaceKey = 'arte' | 'fondo' | 'rotSt' | 'brillitos';

const clamp = (n: number, [min, max]: Range) => Math.min(max, Math.max(min, n));

export function createStore(options: StoreOptions) {
  const { faces, lists, ranges } = options;
  const listeners = new Set<() => void>();
  const notices = new Set<(notice: Notice) => void>();
  let saveScheduled = false;

  const authoredRot = (id: string) => faces[id]!.marks.rotations.find((r) => r.kind === 'st')?.degrees ?? 0;
  const maxSparks = (id: string) => faces[id]!.marks.sparks;
  const artOptions = (id: string) => [...lists.arte, 'hueco', 'propio', ...(id.endsWith('-r') ? ['ninguno'] : [])];

  function defaultFace(id: string): Required<FaceState> {
    const { defaults } = faces[id]!;
    return {
      textos: {},
      ocultosEd: [],
      ocultasPiezas: [],
      arte: defaults.arte ?? lists.arte[0] ?? 'hueco',
      fondo: defaults.fondo,
      rotSt: authoredRot(id),
      brillitos: Math.min(clamp(lists.inicial.brillitos, ranges.brillitos), maxSparks(id)),
      tamanos: {},
    };
  }

  const doc: KoboDocument & { caras: Record<string, Required<FaceState>> } = {
    app: 'kobo-exe-editor',
    version: 1,
    estilo: options.estilo,
    frente: options.initial.frente,
    reverso: options.initial.reverso,
    caras: Object.fromEntries(Object.keys(faces).map((id) => [id, defaultFace(id)])),
    acento: lists.acentos[0]!,
    sombra: lists.sombras[0]!,
    rotTit: clamp(lists.inicial.rotTit, ranges.rotTit),
    escala: clamp(lists.inicial.escala, ranges.escala),
    anguloWashi: clamp(lists.inicial.anguloWashi, ranges.washi),
  };

  // ── validation of single values (used by actions and migration) ──
  function validFaceValue(id: string, key: FaceKey, value: unknown): FaceState[FaceKey] | undefined {
    switch (key) {
      case 'arte':
        return typeof value === 'string' && artOptions(id).includes(value) && (value !== 'propio' || doc.artePropio)
          ? value
          : undefined;
      case 'fondo':
        return typeof value === 'string' && lists.fondos.includes(value) ? value : undefined;
      case 'rotSt':
        return typeof value === 'number' && Number.isFinite(value) ? clamp(value, ranges.rotSt) : undefined;
      case 'brillitos':
        return typeof value === 'number' && Number.isInteger(value)
          ? Math.min(clamp(value, ranges.brillitos), maxSparks(id))
          : undefined;
    }
  }

  /** A section's text size, rounded and clamped to the style's range; undefined for an unknown section (FR-E22). */
  function validSize(id: string, section: string, value: unknown): number | undefined {
    if (!faces[id]!.marks.sections.includes(section) || typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return clamp(Math.round(value), ranges.tamano);
  }

  function validGlobal(key: GlobalKey, value: unknown): string | number | undefined {
    if (key === 'acento' || key === 'sombra') {
      const list = key === 'acento' ? lists.acentos : lists.sombras;
      const match = typeof value === 'string' ? list.find((c) => c.toUpperCase() === value.toUpperCase()) : undefined;
      return match;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const range = key === 'rotTit' ? ranges.rotTit : key === 'escala' ? ranges.escala : ranges.washi;
    return clamp(value, range);
  }

  // ── in-place updates (identity is never broken) ──
  function fillFace(id: string, source: FaceState) {
    const target = doc.caras[id]!;
    const { fields, pieces } = faces[id]!.marks;
    const fieldCount = fields.length;
    const pieceKeys = new Set(pieces.map((p) => p.key));

    for (const k of Object.keys(target.textos)) delete target.textos[k];
    for (const [k, v] of Object.entries(source.textos ?? {})) {
      if (Number(k) < fieldCount) target.textos[k] = v.slice(0, MAX_TEXT);
    }
    target.ocultosEd.splice(0, Infinity, ...(source.ocultosEd ?? []).filter((i) => i < fieldCount));
    target.ocultasPiezas.splice(0, Infinity, ...(source.ocultasPiezas ?? []).filter((k) => pieceKeys.has(k)));
    for (const k of Object.keys(target.tamanos)) delete target.tamanos[k];
    for (const [section, value] of Object.entries(source.tamanos ?? {})) {
      const size = validSize(id, section, value);
      if (size !== undefined && size !== 100) target.tamanos[section] = size;
    }
    const fresh = defaultFace(id);
    for (const key of ['arte', 'fondo', 'rotSt', 'brillitos'] as const) {
      (target as Record<FaceKey, unknown>)[key] = validFaceValue(id, key, source[key]) ?? fresh[key];
    }
  }

  function apply(source: KoboDocument) {
    if (source.artePropio !== undefined) doc.artePropio = source.artePropio;
    else delete doc.artePropio;
    if (faces[source.frente] && source.frente.endsWith('-f')) doc.frente = source.frente;
    if (faces[source.reverso] && source.reverso.endsWith('-r')) doc.reverso = source.reverso;
    for (const id of Object.keys(faces)) fillFace(id, source.caras[id] ?? {});
    for (const key of ['acento', 'sombra', 'rotTit', 'escala', 'anguloWashi'] as const) {
      const value = validGlobal(key, source[key]);
      if (value !== undefined) (doc as Record<GlobalKey, unknown>)[key] = value;
    }
  }

  // ── persistence ──
  const say = (notice: Notice) => notices.forEach((n) => n(notice));

  function save() {
    saveScheduled = false;
    if (!options.storage) return;
    let toSave: KoboDocument = doc;
    if (doc.artePropio && doc.artePropio.length > MAX_OWN_ART) {
      const { artePropio: _dropped, ...rest } = doc;
      toSave = rest;
      say('sticker-not-saved');
    }
    try {
      options.storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      say('storage-full');
    }
  }

  function changed() {
    listeners.forEach((l) => l());
    if (saveScheduled) return;
    saveScheduled = true;
    (options.schedule ?? ((fn) => setTimeout(fn, 300)))(save);
  }

  function load() {
    if (!options.storage) {
      queueMicrotask(() => say('storage-unavailable'));
      return;
    }
    let text: string | null = null;
    try {
      text = options.storage.getItem(STORAGE_KEY);
    } catch {
      queueMicrotask(() => say('storage-unavailable'));
      return;
    }
    if (text === null) return;
    const parsed = parseDocument(text);
    if (parsed.ok && parsed.document.estilo === options.estilo) apply(parsed.document);
    else queueMicrotask(() => say('saved-state-invalid'));
  }

  load();

  return {
    /** The live document. Read it; change it only through the actions below. */
    get document(): Readonly<KoboDocument> {
      return doc;
    },
    /** The single state object of a face. */
    face(id: string): Readonly<Required<FaceState>> {
      const face = doc.caras[id];
      if (!face) throw new Error(`unknown face ${id}`);
      return face;
    },

    select(frente: string, reverso: string) {
      if (!faces[frente] || !frente.endsWith('-f') || !faces[reverso] || !reverso.endsWith('-r')) {
        throw new Error(`cannot show ${frente} with ${reverso}`);
      }
      doc.frente = frente;
      doc.reverso = reverso;
      changed();
    },

    setText(id: string, index: number, text: string) {
      const face = doc.caras[id]!;
      const field = faces[id]!.marks.fields[index];
      if (!field) return;
      const value = text.slice(0, MAX_TEXT);
      if (value === field.text) delete face.textos[String(index)];
      else face.textos[String(index)] = value;
      changed();
    },

    setFieldHidden(id: string, index: number, hidden: boolean) {
      const list = doc.caras[id]!.ocultosEd;
      if (!faces[id]!.marks.fields[index]) return;
      const at = list.indexOf(index);
      if (hidden && at < 0) list.push(index);
      if (!hidden && at >= 0) list.splice(at, 1);
      changed();
    },

    setPieceHidden(id: string, key: string, hidden: boolean) {
      const list = doc.caras[id]!.ocultasPiezas;
      if (!faces[id]!.marks.pieces.some((p) => p.key === key)) return;
      const at = list.indexOf(key);
      if (hidden && at < 0) list.push(key);
      if (!hidden && at >= 0) list.splice(at, 1);
      changed();
    },

    setFaceValue(id: string, key: FaceKey, value: string | number) {
      const valid = validFaceValue(id, key, value);
      if (valid === undefined) return;
      (doc.caras[id]! as Record<FaceKey, unknown>)[key] = valid;
      changed();
    },

    /** One section's text size in percent; 100 % is the default and isn't stored (FR-E22). */
    setSectionSize(id: string, section: string, value: number) {
      const size = validSize(id, section, value);
      if (size === undefined) return;
      const sizes = doc.caras[id]!.tamanos;
      if (size === 100) delete sizes[section];
      else sizes[section] = size;
      changed();
    },

    /** Every section of a face back to 100 % (FR-E22). */
    resetSizes(id: string) {
      const sizes = doc.caras[id]!.tamanos;
      for (const k of Object.keys(sizes)) delete sizes[k];
      changed();
    },

    setGlobal(key: GlobalKey, value: string | number) {
      const valid = validGlobal(key, value);
      if (valid === undefined) return;
      (doc as Record<GlobalKey, unknown>)[key] = valid;
      changed();
    },

    /** Stores the user's already-processed sticker (FR-E6). */
    async setOwnArt(dataUri: string): Promise<{ ok: true } | { ok: false; error: 'bad-image' }> {
      let clean: string;
      try {
        clean = await options.reencode(dataUri);
      } catch {
        return { ok: false, error: 'bad-image' };
      }
      if (!PNG_DATA_URI.test(clean)) return { ok: false, error: 'bad-image' };
      doc.artePropio = clean;
      changed();
      return { ok: true };
    },

    /** Restore: texts and pieces back to authored on the two faces shown (FR-E13). */
    restore() {
      for (const id of [doc.frente, doc.reverso]) {
        const face = doc.caras[id]!;
        for (const k of Object.keys(face.textos)) delete face.textos[k];
        face.ocultosEd.length = 0;
        face.ocultasPiezas.length = 0;
      }
      changed();
    },

    /** Opens a .kobo.json (FR-E17). Untrusted: validated, migrated, image re-encoded. */
    async importText(text: string): Promise<{ ok: true } | { ok: false; error: ImportError }> {
      const parsed = parseDocument(text);
      if (!parsed.ok) return { ok: false, error: parsed.error };
      const incoming = parsed.document;
      if (incoming.estilo !== options.estilo) return { ok: false, error: { code: 'other-style', estilo: incoming.estilo } };
      if (incoming.artePropio !== undefined) {
        try {
          incoming.artePropio = await options.reencode(incoming.artePropio);
        } catch {
          return { ok: false, error: { code: 'bad-image' } };
        }
        if (!PNG_DATA_URI.test(incoming.artePropio)) return { ok: false, error: { code: 'bad-image' } };
      }
      apply(incoming);
      changed();
      return { ok: true };
    },

    /** The document as a .kobo.json file body. */
    exportText(): string {
      return `${JSON.stringify(doc, null, 2)}\n`;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    onNotice(listener: (notice: Notice) => void): () => void {
      notices.add(listener);
      return () => notices.delete(listener);
    },

    /** Writes pending changes now (e.g. on pagehide). */
    flush() {
      if (saveScheduled) save();
    },
  };
}

export type Store = ReturnType<typeof createStore>;
