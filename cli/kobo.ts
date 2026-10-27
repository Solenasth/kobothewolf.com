// The repo's command line (DESIGN §9): `npm run kobo -- <command>`.
import { fileURLToPath } from 'node:url';
import { checkExports, hasPoppler, repoRules } from './check-exports.ts';

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
  default:
    console.error('usage: kobo check-exports <dir>');
    process.exit(2);
}
