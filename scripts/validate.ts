// `npm run validate` (DESIGN §7): build-time checks that run before every
// build and in CI. Rules are added as the data they check lands (#5).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES } from '../src/i18n/languages.ts';
import { checkCatalogs } from './catalogs.ts';

const languages = LANGUAGES.map((l) => l.code);

function catalogDirs(): string[] {
  const dirs = ['src/i18n'];
  if (existsSync('styles')) {
    for (const style of readdirSync('styles')) {
      if (existsSync(join('styles', style, 'i18n'))) dirs.push(join('styles', style, 'i18n'));
    }
  }
  return dirs;
}

function readCatalogs(dir: string): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    files[file.slice(0, -'.json'.length)] = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  }
  return files;
}

const errors = catalogDirs().flatMap((dir) => checkCatalogs(dir, readCatalogs(dir), languages));
for (const error of errors) console.error(error);
if (errors.length > 0) {
  console.error(`validate: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`validate: catalogs complete in ${languages.join(', ')}`);
