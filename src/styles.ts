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

/** Variants by style, in tab order. */
export const variants: ReadonlyMap<string, readonly Variant[]> = collectVariants({ manifests, faces });

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
