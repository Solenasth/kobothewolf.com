// Reads a style folder from disk into the shapes the `validate` rules check.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StyleData } from './styles.ts';

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

export const subdirs = (dir: string) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name)) : [];

/** Every `<lang>.json` in a catalog folder, by language; empty when the folder is missing. */
export function readCatalogs(dir: string): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  if (!existsSync(dir)) return files;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    files[file.slice(0, -'.json'.length)] = readJson(join(dir, file));
  }
  return files;
}

export function readStyle(dir: string): StyleData {
  const assets = join(dir, 'assets');
  return {
    dir,
    tokens: readJson(join(dir, 'tokens.json')),
    editor: readJson(join(dir, 'editor.json')),
    variants: subdirs(join(dir, 'variantes')).map((v) => ({
      dir: v,
      manifest: readJson(join(v, 'variant.json')),
      ...(existsSync(join(v, 'caras.html')) ? { html: readFileSync(join(v, 'caras.html'), 'utf8') } : {}),
      files: readdirSync(v),
    })),
    assets: existsSync(assets) ? readdirSync(assets).filter((f) => !f.startsWith('.')) : [],
  };
}
