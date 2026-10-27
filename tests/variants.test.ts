import { cpSync, globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectVariants, type VariantFiles } from '../src/core/variants';
import { checkLabels, requiredLabels, type LabelSource } from '../scripts/labels.ts';
import { readCatalogs, readStyle } from '../scripts/read-style.ts';
import { createAjv } from '../scripts/schemas.ts';
import { scopeCss, scopeFor } from '../scripts/scope-css.ts';
import { checkStyle } from '../scripts/styles.ts';

const FIXTURE = 'tests/fixtures/variante-nueva';

/** Reads a styles/ tree the way src/styles.ts globs it. */
function filesUnder(root: string): VariantFiles {
  const read = (pattern: string) =>
    globSync(pattern, { cwd: root }).map((p) => [`../${p}`, readFileSync(join(root, p), 'utf8')] as const);
  return {
    manifests: Object.fromEntries(read('styles/*/variantes/*/variant.json').map(([p, t]) => [p, JSON.parse(t)])),
    faces: Object.fromEntries(read('styles/*/variantes/*/caras.html')),
    scripts: Object.fromEntries(globSync('styles/*/variantes/*/montar.ts', { cwd: root }).map((p) => [`../${p}`, async () => p])),
  };
}

describe('FR-E18 the variants are found from their files', () => {
  it('lists the four boykisser-uwu variants in tab order', () => {
    const styles = collectVariants(filesUnder('.'));
    expect([...styles.keys()]).toEqual(['boykisser-uwu']);
    expect(styles.get('boykisser-uwu')!.map((v) => [v.manifest.id, v.manifest.caras.frente, v.manifest.caras.reverso])).toEqual([
      ['certificado', 'cer-f', 'cer-r'],
      ['licencia', 'lic-f', 'lic-r'],
      ['codigo', 'cod-f', 'cod-r'],
      ['socks', 'soc-f', 'soc-r'],
    ]);
  });

  it('sorts by orden, then id, with unordered variants last', () => {
    const m = (id: string, orden?: number) => ({ id, ...(orden === undefined ? {} : { orden }) });
    const files: VariantFiles = { manifests: {}, faces: {} };
    for (const [id, orden] of [['b', undefined], ['a', undefined], ['c', 2], ['d', 1]] as const) {
      (files.manifests as Record<string, unknown>)[`styles/s/variantes/${id}/variant.json`] = m(id, orden);
      (files.faces as Record<string, string>)[`styles/s/variantes/${id}/caras.html`] = '';
    }
    expect(collectVariants(files).get('s')!.map((v) => v.manifest.id)).toEqual(['d', 'c', 'a', 'b']);
  });

  it('rejects a variant without caras.html or with a mismatched id', () => {
    expect(() => collectVariants({ manifests: { 'styles/s/variantes/a/variant.json': { id: 'a' } }, faces: {} })).toThrow(
      'caras.html is missing',
    );
    expect(() =>
      collectVariants({ manifests: { 'styles/s/variantes/a/variant.json': { id: 'b' } }, faces: { 'styles/s/variantes/a/caras.html': '' } }),
    ).toThrow('must match the folder "a"');
  });

  it('FR-E19 attaches the mount script a manifest names, and only that one', async () => {
    const list = collectVariants(filesUnder('.')).get('boykisser-uwu')!;
    const codigo = list.find((v) => v.manifest.id === 'codigo')!;
    expect(await codigo.montar!()).toBe('styles/boykisser-uwu/variantes/codigo/montar.ts');
    expect(list.filter((v) => v !== codigo).map((v) => v.montar)).toEqual([undefined, undefined, undefined]);
  });

  it('FR-E19 rejects a manifest naming a mount script that is missing', () => {
    const files: VariantFiles = {
      manifests: { 'styles/s/variantes/a/variant.json': { id: 'a', montar: 'montar.ts' } },
      faces: { 'styles/s/variantes/a/caras.html': '' },
    };
    expect(() => collectVariants(files)).toThrow('montar file montar.ts is missing');
    expect(collectVariants({ ...files, scripts: { 'styles/s/variantes/a/montar.ts': async () => 'm' } }).get('s')![0]!.montar).toBeTypeOf('function');
  });
});

describe('FR-E18 a new variant is data only', () => {
  let root: string;
  let style: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'kobo-variant-'));
    style = join(root, 'styles/boykisser-uwu');
    cpSync('styles/boykisser-uwu', style, { recursive: true });
    cpSync(FIXTURE, join(style, 'variantes/nueva'), { recursive: true, filter: (src) => !/labels\.json|README\.md$/.test(src) });
    const labels = JSON.parse(readFileSync(join(FIXTURE, 'labels.json'), 'utf8')) as Record<string, Record<string, string>>;
    for (const [lang, extra] of Object.entries(labels)) {
      const file = join(style, `i18n/${lang}.json`);
      writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), ...extra }));
    }
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('passes the style checks and the label checks', () => {
    const data = readStyle(style);
    expect(checkStyle(createAjv(), data)).toEqual([]);
    const source: LabelSource = {
      editor: data.editor as LabelSource['editor'],
      variants: data.variants.map((v) => ({ id: (v.manifest as { id: string }).id, html: v.html! })),
    };
    expect(checkLabels(join(style, 'i18n'), readCatalogs(join(style, 'i18n')), requiredLabels(source))).toEqual([]);
  });

  it('is picked up by the loader in its tab position', () => {
    const ids = collectVariants(filesUnder(root)).get('boykisser-uwu')!.map((v) => v.manifest.id);
    expect(ids).toEqual(['nueva', 'certificado', 'licencia', 'codigo', 'socks']);
  });

  it('has its CSS scoped to its own two faces', () => {
    const css = join(style, 'variantes/nueva/caras.css');
    const scope = scopeFor(css);
    expect(scope).toEqual(['nue-f', 'nue-r']);
    const result = scopeCss(readFileSync(css, 'utf8'), scope!, relative(root, css));
    expect(result.ok && result.code).toContain(':is([data-cara="nue-f"], [data-cara="nue-r"]) .saludo');
  });
});
