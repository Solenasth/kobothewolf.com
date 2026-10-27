// Every style in styles/, found by Vite globs at build time (FR-E18, DESIGN
// §3.4). Adding a variant folder needs no change here. The shared face CSS is
// imported before the variants', so a variant rule wins over a shared one of
// the same specificity.
import { parseFaces, resolveAssets } from './core/faces';
import { collectVariants, type Variant } from './core/variants';

import.meta.glob('../styles/*/caras.css', { eager: true });
import.meta.glob('../styles/*/variantes/*/caras.css', { eager: true });

const manifests = import.meta.glob('../styles/*/variantes/*/variant.json', { eager: true, import: 'default' });
const faces = import.meta.glob<string>('../styles/*/variantes/*/caras.html', { eager: true, query: '?raw', import: 'default' });
const assets = import.meta.glob<string>('../styles/*/assets/*', { eager: true, query: '?url', import: 'default' });
// Lazy: a variant's code loads only when one of its faces is mounted.
const scripts = import.meta.glob('../styles/*/variantes/*/montar.ts');
const editors = import.meta.glob('../styles/*/editor.json', { eager: true, import: 'default' });
const tokens = import.meta.glob('../styles/*/tokens.json', { eager: true, import: 'default' });
const catalogs = import.meta.glob<Record<string, string>>('../styles/*/i18n/*.json', { eager: true, import: 'default' });

/** Variants by style, in tab order. */
export const variants: ReadonlyMap<string, readonly Variant[]> = collectVariants({ manifests, faces, scripts });

/** Built URLs of one style's assets, by file name. */
export function assetUrls(estilo: string): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const [path, url] of Object.entries(assets)) {
    const match = /\/styles\/([^/]+)\/assets\/([^/]+)$/.exec(path);
    if (match?.[1] === estilo) urls[match[2]!] = url;
  }
  return urls;
}

/** A variant's two faces, ready to insert: parsed and with asset paths resolved. */
export function facesOf(variant: Variant, doc: Document = document): Map<string, HTMLElement> {
  const parsed = parseFaces(variant.html, doc);
  const urls = assetUrls(variant.estilo);
  for (const face of parsed.values()) resolveAssets(face, urls);
  return parsed;
}

/**
 * Runs the variant's `montar` on one of its inserted faces (FR-E19, DESIGN §5.4).
 * Resolves when the face is drawn; at once for a variant without one.
 */
export async function montar(variant: Variant, face: HTMLElement): Promise<void> {
  if (!variant.montar) return;
  const mod = (await variant.montar()) as { montar?: unknown };
  if (typeof mod.montar !== 'function') throw new Error(`${variant.estilo}/${variant.manifest.id}: ${variant.manifest.montar} does not export montar()`);
  await (mod.montar as (cara: HTMLElement) => Promise<void>)(face);
}

/** A style's editor lists and anti-rules, checked by `validate` at build time. */
export function styleData(estilo: string): { editor: EditorData; antirreglas: Record<string, unknown> } {
  const editor = editors[`../styles/${estilo}/editor.json`] as EditorData | undefined;
  const style = tokens[`../styles/${estilo}/tokens.json`] as { antirreglas: Record<string, unknown> } | undefined;
  if (!editor || !style) throw new Error(`style ${estilo}: editor.json or tokens.json is missing`);
  return { editor, antirreglas: style.antirreglas };
}

export interface EditorData {
  acentos: string[];
  sombras: string[];
  fondos: string[];
  arte: string[];
  escala: [number, number];
  inicial: { rotTit: number; anguloWashi: number; brillitos: number; escala: number };
}

/** A style label (DESIGN §4) in `lang`, falling back to English, then to the key. */
export function styleLabel(estilo: string, lang: string, key: string): string {
  return catalogs[`../styles/${estilo}/i18n/${lang}.json`]?.[key] ?? catalogs[`../styles/${estilo}/i18n/en.json`]?.[key] ?? key;
}
