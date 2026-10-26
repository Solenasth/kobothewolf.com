// Asset rules for `npm run validate` (NFR-5, NFR-9, DESIGN §7): every asset is
// credited or licensed, published PNGs hold pixel data only, and style files
// load nothing from outside the origin.
import { posix } from 'node:path';
import { readChunks } from '../src/core/png.ts';

/** Directories whose files are published assets. */
export const ASSET_DIRS = ['styles/*/assets', 'src/theme/fonts', 'public'] as const;

/** File types allowed in asset directories; anything else could hide metadata the check can't read. */
export const ASSET_EXTENSIONS = ['.png', '.svg', '.woff2'] as const;

/** Chunks a published PNG may keep: what the pixels need, nothing else. */
export const PNG_CHUNKS = ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'] as const;

const LICENSE = /^LICENSE-(.+)\.txt$/;

/** True for a path inside one of ASSET_DIRS. */
export function isAssetPath(path: string): boolean {
  return /^(?:styles\/[^/]+\/assets|src\/theme\/fonts|public)\/./.test(path);
}

/** Asset paths written in backticks in CREDITS.md, e.g. `styles/x/assets/a.png`. Other paths are prose. */
export function creditedPaths(credits: string): Set<string> {
  return new Set([...credits.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]!).filter(isAssetPath));
}

/**
 * Each asset must be listed in CREDITS.md or sit next to a `LICENSE-<name>.txt`
 * whose name prefixes its file name (fonts). Credits must not list missing files.
 */
export function checkCoverage(files: readonly string[], credits: string): string[] {
  const errors: string[] = [];
  const listed = creditedPaths(credits);
  const all = new Set(files);
  for (const file of files) {
    const dir = posix.dirname(file);
    const name = posix.basename(file);
    if (LICENSE.test(name)) continue;
    const ext = posix.extname(name).toLowerCase();
    if (!(ASSET_EXTENSIONS as readonly string[]).includes(ext)) {
      errors.push(`${file}: file type not allowed in asset folders (${ASSET_EXTENSIONS.join(', ')})`);
      continue;
    }
    const licensed = files.some((other) => {
      const match = posix.dirname(other) === dir && LICENSE.exec(posix.basename(other));
      return match && (name.startsWith(`${match[1]}-`) || name.startsWith(`${match[1]}.`));
    });
    if (!licensed && !listed.has(file)) errors.push(`${file}: not listed in CREDITS.md and no LICENSE-<name>.txt next to it`);
  }
  for (const path of listed) {
    if (!all.has(path)) errors.push(`CREDITS.md: lists ${path}, which does not exist`);
  }
  return errors;
}

/** A PNG is publishable when it is well formed and has only pixel-data chunks. */
export function checkPng(file: string, bytes: Uint8Array): string[] {
  const chunks = readChunks(bytes);
  if (!Array.isArray(chunks)) return [`${file}: ${chunks.code === 'not-png' ? 'not a PNG' : 'malformed PNG'}`];
  const extra = [...new Set(chunks.map((c) => c.type))].filter((t) => !(PNG_CHUNKS as readonly string[]).includes(t));
  return extra.length > 0 ? [`${file}: metadata chunk(s) ${extra.join(', ')}; run scripts/strip-png.ts`] : [];
}

/** Returns the PNG with only the chunks in PNG_CHUNKS; pixel data is copied byte for byte. */
export function stripPng(bytes: Uint8Array): Uint8Array {
  const chunks = readChunks(bytes);
  if (!Array.isArray(chunks)) throw new Error(chunks.code);
  const kept = chunks.filter((c) => (PNG_CHUNKS as readonly string[]).includes(c.type));
  const out = new Uint8Array(8 + kept.reduce((sum, c) => sum + c.size, 0));
  out.set(bytes.subarray(0, 8));
  let offset = 8;
  for (const c of kept) {
    out.set(bytes.subarray(c.start, c.start + c.size), offset);
    offset += c.size;
  }
  return out;
}

const URL_REFERENCES = [
  /url\(\s*['"]?\s*([^'")\s]+)/gi,
  /@import\s+(?:url\(\s*)?['"]?\s*([^'")\s;]+)/gi,
  /\ssrc\s*=\s*['"]?\s*([^'">\s]+)/gi,
  /\ssrcset\s*=\s*['"]([^'"]+)['"]/gi,
];

/** Style files may only reference same-origin or inline (`data:`) resources. */
export function checkUrls(file: string, text: string): string[] {
  const errors: string[] = [];
  for (const pattern of URL_REFERENCES) {
    for (const match of text.matchAll(pattern)) {
      for (const candidate of match[1]!.split(',').map((s) => s.trim().split(/\s+/)[0]!)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(candidate) && !/^data:/i.test(candidate)) {
          errors.push(`${file}: loads ${candidate} from outside the origin`);
        }
      }
    }
  }
  return [...new Set(errors)]; // `@import url(…)` matches two patterns
}
