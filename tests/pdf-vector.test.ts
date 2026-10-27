import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { changedTexts } from '../cli/check-exports.ts';
import { readDocument } from '../cli/pdf-vector.ts';

// FR-B1: pdf-vector checks the document before it starts a browser. The PDF
// itself is made and checked in CI (export and check-exports jobs).

const MIX = 'tests/fixtures/documents/mezcla.kobo.json';
const INVALID = 'tests/fixtures/documents/invalid.kobo.json';
const dir = mkdtempSync(join(tmpdir(), 'kobo-vector-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function file(name: string, body: string) {
  writeFileSync(join(dir, name), body);
  return join(dir, name);
}

const base = { app: 'kobo-exe-editor', version: 1, estilo: 'boykisser-uwu', frente: 'lic-f', reverso: 'soc-r', caras: {} };

describe('FR-B1 pdf-vector reads the document as the editor does', () => {
  it('accepts a valid mixed card', () => {
    const result = readDocument(MIX);
    expect(result.ok).toBe(true);
    if (result.ok) expect([result.document.frente, result.document.reverso]).toEqual(['lic-f', 'soc-r']);
  });

  it('rejects an invalid document with the validation messages', () => {
    expect(readDocument(INVALID)).toEqual({ ok: false, problems: ['/version must be equal to constant', '/caras/lic-f/textos/0 must be string'] });
  });

  it('rejects what isn\'t a document, a forbidden key, or a missing file', () => {
    expect(readDocument(file('not.kobo.json', 'hello'))).toEqual({ ok: false, problems: ['it isn’t JSON'] });
    expect(readDocument(file('proto.kobo.json', '{"__proto__": {}}'))).toEqual({ ok: false, problems: ['it has the forbidden key "__proto__"'] });
    expect(readDocument(join(dir, 'nowhere.kobo.json'))).toEqual({ ok: false, problems: ['the file can’t be read'] });
  });

  it('rejects an unknown style, and faces that aren\'t that style\'s front and back', () => {
    expect(readDocument(file('style.kobo.json', JSON.stringify({ ...base, estilo: 'edgy-2000s' })))).toEqual({ ok: false, problems: ['/estilo: no style "edgy-2000s"'] });
    expect(readDocument(file('faces.kobo.json', JSON.stringify({ ...base, frente: 'soc-r', reverso: 'zzz-r' })))).toEqual({
      ok: false,
      problems: ['/frente: "soc-r" isn\'t a front of boykisser-uwu', '/reverso: "zzz-r" isn\'t a back of boykisser-uwu'],
    });
  });

  it('the command exits 1 with the messages and writes nothing', () => {
    const out = join(dir, 'never.pdf');
    const run = spawnSync(process.execPath, ['cli/kobo.ts', 'pdf-vector', INVALID, '-o', out], { encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toBe(`invalid document ${INVALID}:\n    /version must be equal to constant\n    /caras/lic-f/textos/0 must be string\n`);
    expect(spawnSync('test', ['-e', out]).status).toBe(1);
  });

  it('the command explains its usage on bad arguments', () => {
    for (const args of [[], [MIX, '--lang', 'fr']]) {
      const run = spawnSync(process.execPath, ['cli/kobo.ts', 'pdf-vector', ...args], { encoding: 'utf8' });
      expect(run.status).toBe(2);
      expect(run.stderr).toContain('usage: kobo pdf-vector <doc.kobo.json> [-o out.pdf] [--lang en|es]');
    }
  });
});

describe('FR-B1 the texts a vector PDF must carry', () => {
  it('are the changed texts on the two faces shown, minus hidden ones', () => {
    const result = readDocument(MIX);
    if (!result.ok) throw new Error('fixture');
    expect(changedTexts(result.document)).toEqual(["Kobo's print test", '¡hola, imprenta!', 'vector text~']);
    const hidden = { ...result.document, caras: { ...result.document.caras, 'soc-r': { textos: { '0': 'shown', '1': 'hidden' }, ocultosEd: [1] } } };
    expect(changedTexts(hidden)).toEqual(["Kobo's print test", 'shown']);
  });
});
