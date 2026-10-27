import { describe, expect, it, vi } from 'vitest';
import tokens from '../../styles/boykisser-uwu/tokens.json';
import editor from '../../styles/boykisser-uwu/editor.json';
import { LIC_F, LIC_R } from './fixtures';
import { readMarks } from './marks';
import { faceFrom } from './parse5-element';
import { deriveRanges, type Range } from './ranges';
import { createStore, MAX_OWN_ART, STORAGE_KEY, type Notice, type StorageLike, type StoreOptions } from './store';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function make(over: Partial<StoreOptions> = {}) {
  const pending: (() => void)[] = [];
  const notices: Notice[] = [];
  const options: StoreOptions = {
    estilo: 'boykisser-uwu',
    faces: {
      'lic-f': { marks: readMarks(faceFrom(LIC_F, 'lic-f')), defaults: { fondo: 'gingham', arte: 'licencia' } },
      'lic-r': { marks: readMarks(faceFrom(LIC_R, 'lic-r')), defaults: { fondo: 'cuaderno' } },
    },
    lists: editor,
    ranges: deriveRanges(tokens.antirreglas, editor.escala as unknown as Range),
    initial: { frente: 'lic-f', reverso: 'lic-r' },
    storage: memoryStorage(),
    reencode: async (uri) => uri,
    schedule: (fn) => pending.push(fn),
    ...over,
  };
  const store = createStore(options);
  store.onNotice((n) => notices.push(n));
  const flushSaves = () => pending.splice(0).forEach((fn) => fn());
  return { store, options, notices, flushSaves };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('DESIGN §5.2 one state object per face for the whole session', () => {
  it('keeps the same face object across reads, edits, restore, import and select', async () => {
    const { store } = make();
    const front = store.face('lic-f');
    const back = store.face('lic-r');

    store.setText('lic-f', 2, 'Kobo');
    store.setFieldHidden('lic-f', 0, true);
    store.setPieceHidden('lic-r', 'Firma', true);
    store.setFaceValue('lic-f', 'rotSt', 3);
    store.restore();
    const other = make();
    other.store.setText('lic-r', 0, 'imported');
    expect(await store.importText(other.store.exportText())).toEqual({ ok: true });
    store.select('lic-f', 'lic-r');

    expect(store.face('lic-f')).toBe(front);
    expect(store.face('lic-r')).toBe(back);
    expect(store.document.caras['lic-f']).toBe(front);
    expect(back.textos).toEqual({ '0': 'imported' });
  });

  it('keeps the face objects when migrating saved state on load', () => {
    const storage = memoryStorage();
    const first = make({ storage });
    first.store.setText('lic-f', 2, 'saved');
    first.flushSaves();

    const second = make({ storage });
    const front = second.store.face('lic-f');
    expect(front.textos).toEqual({ '2': 'saved' });
    second.store.setText('lic-f', 2, 'again');
    expect(second.store.face('lic-f')).toBe(front);
  });
});

describe('FR-E3 FR-E4 FR-E13 actions', () => {
  it('caps text at 90 characters and forgets text equal to the authored one', () => {
    const { store } = make();
    store.setText('lic-f', 2, 'x'.repeat(200));
    expect(store.face('lic-f').textos['2']).toHaveLength(90);
    store.setText('lic-f', 2, 'Kobo The Wolf');
    expect(store.face('lic-f').textos).toEqual({});
  });

  it('ignores unknown fields and pieces', () => {
    const { store } = make();
    store.setText('lic-f', 99, 'x');
    store.setFieldHidden('lic-f', 99, true);
    store.setPieceHidden('lic-f', 'Nope', true);
    expect(store.face('lic-f')).toMatchObject({ textos: {}, ocultosEd: [], ocultasPiezas: [] });
  });

  it('restore resets texts and pieces on the two faces shown only', () => {
    const { store } = make();
    store.setText('lic-f', 2, 'a');
    store.setFieldHidden('lic-r', 1, true);
    store.setPieceHidden('lic-r', 'Firma', true);
    store.setFaceValue('lic-f', 'fondo', 'crema');
    store.restore();
    expect(store.face('lic-f')).toMatchObject({ textos: {}, fondo: 'crema' });
    expect(store.face('lic-r')).toMatchObject({ ocultosEd: [], ocultasPiezas: [] });
  });

  it('keeps values inside the style: lists, ranges and the sparkle count', () => {
    const { store } = make();
    store.setFaceValue('lic-f', 'fondo', 'neon');
    store.setFaceValue('lic-f', 'rotSt', 40);
    store.setFaceValue('lic-f', 'brillitos', 9);
    store.setGlobal('acento', '#000000');
    store.setGlobal('rotTit', -30);
    expect(store.face('lic-f')).toMatchObject({ fondo: 'gingham', rotSt: 7, brillitos: 3 });
    expect(store.document).toMatchObject({ acento: '#FF8FB8', rotTit: -4 });
  });

  it('NFR-1 starts from the style\'s starting values, as P8 did', () => {
    const { store } = make();
    expect(store.document).toMatchObject({ rotTit: -2, anguloWashi: 14, escala: 100 });
    // lic-f has 3 sparkles in the fixture: the starting 7 is capped at the face's count.
    expect(store.face('lic-f').brillitos).toBe(3);
    const out = make({ lists: { ...editor, inicial: { rotTit: 9, anguloWashi: 0, brillitos: 7, escala: 500 } } });
    expect(out.store.document).toMatchObject({ rotTit: 3, anguloWashi: 12, escala: 115 });
  });

  it('refuses to show a front as the back', () => {
    const { store } = make();
    expect(() => store.select('lic-r', 'lic-f')).toThrow();
  });
});

describe('FR-E16 persistence', () => {
  it('saves after a debounce and restores texts, pieces and the own sticker', async () => {
    const storage = memoryStorage();
    const first = make({ storage });
    first.store.setText('lic-r', 0, 'hi');
    first.store.setPieceHidden('lic-f', 'washi-1', true);
    await first.store.setOwnArt(PNG);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    first.flushSaves();

    const second = make({ storage }).store;
    expect(second.face('lic-r').textos).toEqual({ '0': 'hi' });
    expect(second.face('lic-f').ocultasPiezas).toEqual(['washi-1']);
    expect(second.document.artePropio).toBe(PNG);
  });

  it('saves texts without a sticker over 2 MB, and says so', async () => {
    const storage = memoryStorage();
    const { store, notices, flushSaves } = make({ storage });
    await store.setOwnArt(`data:image/png;base64,${'A'.repeat(MAX_OWN_ART)}`);
    store.setText('lic-r', 0, 'kept');
    flushSaves();
    const saved = JSON.parse(storage.data.get(STORAGE_KEY)!);
    expect(saved.artePropio).toBeUndefined();
    expect(saved.caras['lic-r'].textos).toEqual({ '0': 'kept' });
    expect(notices).toContain('sticker-not-saved');
  });

  it('keeps working without storage, and says so', async () => {
    const { store, notices, flushSaves } = make({ storage: null });
    await settle();
    store.setText('lic-r', 0, 'still works');
    flushSaves();
    expect(store.face('lic-r').textos).toEqual({ '0': 'still works' });
    expect(notices).toEqual(['storage-unavailable']);
  });

  it('keeps working when storage throws on read or is full on write', async () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const { store, notices, flushSaves } = make({ storage: throwing });
    await settle();
    store.setText('lic-r', 0, 'x');
    flushSaves();
    expect(store.face('lic-r').textos).toEqual({ '0': 'x' });
    expect(notices).toEqual(['storage-unavailable', 'storage-full']);
  });

  it('ignores tampered saved state and starts fresh, saying so', async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{"app":"kobo-exe-editor","__proto__":{"x":1}}' });
    const { store, notices } = make({ storage });
    await settle();
    expect(store.face('lic-f').textos).toEqual({});
    expect(notices).toEqual(['saved-state-invalid']);
  });
});

describe('FR-E17 open and save .kobo.json', () => {
  it('round-trips a document through export and import', async () => {
    const a = make().store;
    a.setText('lic-f', 2, 'round');
    a.setPieceHidden('lic-r', 'Términos', true);
    a.setGlobal('anguloWashi', 12);
    const b = make().store;
    expect(await b.importText(a.exportText())).toEqual({ ok: true });
    expect(JSON.parse(b.exportText())).toEqual(JSON.parse(a.exportText()));
  });

  it('migrates: drops unknown faces, fields and pieces, and replaces out-of-style values', async () => {
    const { store } = make();
    const incoming = {
      app: 'kobo-exe-editor',
      version: 1,
      estilo: 'boykisser-uwu',
      frente: 'zzz-f',
      reverso: 'lic-r',
      caras: {
        'zzz-f': { textos: { '0': 'ghost' } },
        'lic-f': { textos: { '2': 'ok', '40': 'too far' }, ocultasPiezas: ['Foto', 'Nope'], fondo: 'neon', rotSt: 90, arte: 'propio' },
      },
      acento: '#123456',
    };
    expect(await store.importText(JSON.stringify(incoming))).toEqual({ ok: true });
    expect(store.document.frente).toBe('lic-f');
    expect(store.document.caras['zzz-f']).toBeUndefined();
    expect(store.face('lic-f')).toMatchObject({ textos: { '2': 'ok' }, ocultasPiezas: ['Foto'], fondo: 'gingham', rotSt: 7, arte: 'licencia' });
    expect(store.document.acento).toBe('#FF8FB8');
  });

  it('rejects a document from another style', async () => {
    const { store } = make();
    const other = JSON.parse(make().store.exportText());
    other.estilo = 'edgy-2000s';
    expect(await store.importText(JSON.stringify(other))).toEqual({ ok: false, error: { code: 'other-style', estilo: 'edgy-2000s' } });
  });

  it('re-encodes an imported sticker and rejects one that fails to decode', async () => {
    const reencode = vi.fn(async () => 'data:image/png;base64,UkVFTkNPREVE');
    const { store } = make({ reencode });
    const doc = { ...JSON.parse(make().store.exportText()), artePropio: PNG };
    expect(await store.importText(JSON.stringify(doc))).toEqual({ ok: true });
    expect(reencode).toHaveBeenCalledWith(PNG);
    expect(store.document.artePropio).toBe('data:image/png;base64,UkVFTkNPREVE');

    const broken = make({ reencode: async () => Promise.reject(new Error('decode')) }).store;
    expect(await broken.importText(JSON.stringify(doc))).toEqual({ ok: false, error: { code: 'bad-image' } });
  });

  it('T-SEC-2 rejects an SVG sticker and a 3 MB file', async () => {
    const { store } = make();
    const doc = JSON.parse(make().store.exportText());
    const svg = await store.importText(JSON.stringify({ ...doc, artePropio: 'data:image/svg+xml;base64,PHN2Zz4=' }));
    expect(svg).toMatchObject({ ok: false, error: { code: 'invalid' } });
    const huge = await store.importText(JSON.stringify({ ...doc, pad: 'x'.repeat(3 * 1024 * 1024) }));
    expect(huge).toMatchObject({ ok: false, error: { code: 'too-large' } });
  });

  it('rejects an own sticker whose re-encoding is not a PNG', async () => {
    const { store } = make({ reencode: async () => 'data:image/svg+xml;base64,PHN2Zz4=' });
    expect(await store.setOwnArt(PNG)).toEqual({ ok: false, error: 'bad-image' });
    expect(store.document.artePropio).toBeUndefined();
  });
});

describe('FR-E22 text size per section', () => {
  it('sets a section\'s size, clamped to the style\'s range, and forgets 100 %', () => {
    const { store } = make();
    store.setSectionSize('lic-r', 'firma', 112);
    store.setSectionSize('lic-r', 'titulo', 200);
    store.setSectionSize('lic-r', 'firma', 90.4);
    expect(store.face('lic-r').tamanos).toEqual({ firma: 90, titulo: 115 });
    store.setSectionSize('lic-r', 'titulo', 100);
    expect(store.face('lic-r').tamanos).toEqual({ firma: 90 });
  });

  it('ignores sections the face doesn\'t have, and resets one face only', () => {
    const { store } = make();
    store.setSectionSize('lic-r', 'campos', 110); // a front section
    store.setSectionSize('lic-f', 'campos', 110);
    store.setSectionSize('lic-r', 'firma', 110);
    expect(store.face('lic-r').tamanos).toEqual({ firma: 110 });
    store.resetSizes('lic-r');
    expect(store.face('lic-r').tamanos).toEqual({});
    expect(store.face('lic-f').tamanos).toEqual({ campos: 110 });
  });

  it('round-trips through the document, dropping unknown sections and clamping the rest', async () => {
    const { store } = make();
    const sizes = store.face('lic-r').tamanos;
    store.setSectionSize('lic-r', 'firma', 87);
    const text = store.exportText();
    const other = make().store;
    expect(await other.importText(text)).toEqual({ ok: true });
    expect(other.face('lic-r').tamanos).toEqual({ firma: 87 });

    const doc = JSON.parse(text);
    doc.caras['lic-r'].tamanos = { firma: 300, nada: 110, titulo: 100 };
    expect(await store.importText(JSON.stringify(doc))).toEqual({ ok: true });
    expect(store.face('lic-r').tamanos).toEqual({ firma: 115 });
    expect(store.face('lic-r').tamanos, 'same object (DESIGN §5.2)').toBe(sizes);
  });

  it('the schema refuses sizes that aren\'t numbers or are far out of bounds', async () => {
    const { store } = make();
    const doc = JSON.parse(store.exportText());
    doc.caras['lic-r'].tamanos = { firma: 'big' };
    expect((await store.importText(JSON.stringify(doc))).ok).toBe(false);
    doc.caras['lic-r'].tamanos = { firma: 9999 };
    expect((await store.importText(JSON.stringify(doc))).ok).toBe(false);
  });
});
