// `npm run validate` (DESIGN §7): build-time checks that run before every
// build and in CI.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES } from '../src/i18n/languages.ts';
import { checkCatalogs } from './catalogs.ts';
import { createAjv } from './schemas.ts';
import { checkStyle, type StyleData } from './styles.ts';

const languages = LANGUAGES.map((l) => l.code);
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));
const subdirs = (dir: string) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name)) : [];

function readCatalogs(dir: string): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    files[file.slice(0, -'.json'.length)] = readJson(join(dir, file));
  }
  return files;
}

function readStyle(dir: string): StyleData {
  return {
    dir,
    tokens: readJson(join(dir, 'tokens.json')),
    editor: readJson(join(dir, 'editor.json')),
    variants: subdirs(join(dir, 'variantes')).map((v) => ({
      dir: v,
      manifest: readJson(join(v, 'variant.json')),
      ...(existsSync(join(v, 'caras.html')) ? { html: readFileSync(join(v, 'caras.html'), 'utf8') } : {}),
    })),
  };
}

const styles = subdirs('styles');
const catalogDirs = ['src/i18n', ...styles.map((s) => join(s, 'i18n')).filter(existsSync)];
const ajv = createAjv();

const errors = [
  ...catalogDirs.flatMap((dir) => checkCatalogs(dir, readCatalogs(dir), languages)),
  ...styles.flatMap((dir) => checkStyle(ajv, readStyle(dir))),
];

for (const error of errors) console.error(error);
if (errors.length > 0) {
  console.error(`validate: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`validate: ${styles.length} style(s) and ${catalogDirs.length} catalog folder(s) OK in ${languages.join(', ')}`);
