// `npm run validate` (DESIGN §7): build-time checks that run before every
// build and in CI.
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES } from '../src/i18n/languages.ts';
import { ASSET_DIRS, checkCoverage, checkPng, checkUrls } from './assets.ts';
import { checkCatalogs } from './catalogs.ts';
import { checkLabels, requiredLabels, type LabelSource } from './labels.ts';
import { readCatalogs, readStyle, subdirs } from './read-style.ts';
import { createAjv } from './schemas.ts';
import { checkStyle, type StyleData } from './styles.ts';

const languages = LANGUAGES.map((l) => l.code);

/** Label rules need well-formed data; schema errors are reported by checkStyle. */
function styleLabels(style: StyleData, errors: readonly string[]): string[] {
  if (errors.length > 0) return [];
  const dir = join(style.dir, 'i18n');
  const source: LabelSource = {
    editor: style.editor as LabelSource['editor'],
    variants: style.variants.map((v) => ({ id: (v.manifest as { id: string }).id, html: v.html ?? '' })),
  };
  return checkLabels(dir, readCatalogs(dir), requiredLabels(source));
}

const styles = subdirs('styles').map(readStyle);
const catalogDirs = ['src/i18n', ...styles.map((s) => join(s.dir, 'i18n'))];
const ajv = createAjv();

const assets = ASSET_DIRS.flatMap((dir) => globSync(`${dir}/**/*`, { withFileTypes: true }))
  .filter((d) => d.isFile() && d.name !== '.DS_Store')
  .map((d) => join(d.parentPath, d.name))
  .sort();
const credits = existsSync('CREDITS.md') ? readFileSync('CREDITS.md', 'utf8') : '';
const styleFiles = globSync(['styles/**/*.{css,html,json}', 'src/**/*.css']).sort();

const errors = [
  ...catalogDirs.flatMap((dir) => checkCatalogs(dir, readCatalogs(dir), languages)),
  ...styles.flatMap((style) => {
    const errors = checkStyle(ajv, style);
    return [...errors, ...styleLabels(style, errors)];
  }),
  ...checkCoverage(assets, credits),
  ...assets.filter((f) => f.endsWith('.png')).flatMap((f) => checkPng(f, new Uint8Array(readFileSync(f)))),
  ...styleFiles.flatMap((f) => checkUrls(f, readFileSync(f, 'utf8'))),
];

for (const error of errors) console.error(error);
if (errors.length > 0) {
  console.error(`validate: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(
  `validate: ${styles.length} style(s), ${catalogDirs.length} catalog folder(s) in ${languages.join(', ')}, ${assets.length} asset file(s) and ${styleFiles.length} style file(s) OK`,
);
