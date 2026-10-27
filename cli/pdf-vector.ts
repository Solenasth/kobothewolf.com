// `kobo pdf-vector doc.kobo.json` (FR-B1, DESIGN §9, EV §5.2): a PDF with real
// text and embedded subset fonts. The document is checked here first, with the
// editor's own parser; then the private print page (cli/print/) is built,
// served, and printed by Chromium on two 96 × 56 mm pages.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { parseDocument, type KoboDocument } from '../src/core/document.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const printConfig = join(root, 'cli/print/vite.config.ts');

export type DocumentCheck = { ok: true; document: KoboDocument; text: string } | { ok: false; problems: string[] };

/** The document in a file, checked as the editor checks it, plus its style and faces. */
export function readDocument(file: string): DocumentCheck {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return { ok: false, problems: ['the file can’t be read'] };
  }
  const parsed = parseDocument(text);
  if (!parsed.ok) {
    const error = parsed.error;
    const problems =
      error.code === 'too-large' ? [`it is ${error.bytes} bytes; the limit is 3 MiB`]
      : error.code === 'not-json' ? ['it isn’t JSON']
      : error.code === 'forbidden-key' ? [`it has the forbidden key "${error.key}"`]
      : error.issues;
    return { ok: false, problems };
  }
  const doc = parsed.document;
  const styleDir = join(root, 'styles', doc.estilo);
  if (!/^[a-z0-9-]+$/.test(doc.estilo) || !existsSync(styleDir)) return { ok: false, problems: [`/estilo: no style "${doc.estilo}"`] };
  const caras = readdirSync(join(styleDir, 'variantes')).map(
    (v) => (JSON.parse(readFileSync(join(styleDir, 'variantes', v, 'variant.json'), 'utf8')) as { caras: { frente: string; reverso: string } }).caras,
  );
  const problems: string[] = [];
  if (!caras.some((c) => c.frente === doc.frente)) problems.push(`/frente: "${doc.frente}" isn't a front of ${doc.estilo}`);
  if (!caras.some((c) => c.reverso === doc.reverso)) problems.push(`/reverso: "${doc.reverso}" isn't a back of ${doc.estilo}`);
  return problems.length ? { ok: false, problems } : { ok: true, document: doc, text };
}

/** Builds the print page, prints the document with Chromium and writes the PDF. */
export async function writeVectorPdf(text: string, out: string, lang: 'en' | 'es'): Promise<void> {
  const { build, preview } = await import('vite');
  await build({ configFile: printConfig, logLevel: 'warn' });
  const server = await preview({ configFile: printConfig, logLevel: 'warn', preview: { port: 0, open: false } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text());
    });
    page.on('pageerror', (err) => problems.push(err.message));
    await page.goto(`${server.resolvedUrls!.local[0]!}?lang=${lang}`);
    const result = await page.evaluate((t) => (window as unknown as { __print(t: string): Promise<{ ok: boolean; error?: string }> }).__print(t), text);
    if (!result.ok) throw new Error(`the print page refused the document: ${result.error}`);
    if (problems.length) throw new Error(`the print page reported: ${problems.join('; ')}`);
    writeFileSync(out, await page.pdf({ preferCSSPageSize: true, printBackground: true }));
  } finally {
    await browser.close();
    await server.close();
  }
}
