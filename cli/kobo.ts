// The repo's command line (DESIGN §9): `npm run kobo -- <command>`.
import { fileURLToPath } from 'node:url';
import { checkExports, hasPoppler, repoRules } from './check-exports.ts';
import { readDocument, writeVectorPdf } from './pdf-vector.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'check-exports': {
    const dir = args[0];
    if (!dir) {
      console.error('usage: kobo check-exports <dir>');
      process.exit(2);
    }
    // The PDF checks need poppler; without it the command fails rather than skipping them.
    if (!hasPoppler()) {
      console.error('check-exports needs poppler (pdfinfo, pdfimages, pdffonts): apt install poppler-utils, or brew install poppler');
      process.exit(2);
    }
    const results = checkExports(dir, repoRules(root));
    for (const { file, problems } of results) {
      console.log(`${problems.length ? '✘' : '✔'} ${file}`);
      for (const problem of problems) console.log(`    ${problem}`);
    }
    const failed = results.filter((r) => r.problems.length).length;
    console.log(`\ncheck-exports: ${results.length} files, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
  case 'pdf-vector': {
    const input = args.find((a, i) => !a.startsWith('-') && !['-o', '--lang'].includes(args[i - 1] ?? ''));
    const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
    const lang = option('--lang') ?? 'en';
    if (!input || (lang !== 'en' && lang !== 'es')) {
      console.error('usage: kobo pdf-vector <doc.kobo.json> [-o out.pdf] [--lang en|es]');
      process.exit(2);
    }
    const out = option('-o') ?? input.replace(/(\.kobo)?\.json$/, '') + '.pdf';
    const doc = readDocument(input);
    if (!doc.ok) {
      console.error(`invalid document ${input}:`);
      for (const problem of doc.problems) console.error(`    ${problem}`);
      process.exit(1);
    }
    await writeVectorPdf(doc.text, out, lang);
    console.log(`pdf-vector: wrote ${out} (${doc.document.frente} + ${doc.document.reverso})`);
    break;
  }
  default:
    console.error('usage: kobo check-exports <dir> | kobo pdf-vector <doc.kobo.json> [-o out.pdf] [--lang en|es]');
    process.exit(2);
}
