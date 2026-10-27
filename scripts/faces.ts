// Face rules for `validate` (FR-B3, DESIGN §7). Faces are trusted build-time
// HTML; parse5 gives Node the tree a browser would build.
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { BUILTIN_PIECES, CONTACT_TEXT, LOCKED_CLASSES } from '../src/core/marks.ts';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

const isElement = (node: Node): node is Element => 'tagName' in node;
const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;
const classes = (el: Element) => (attr(el, 'class') ?? '').split(/\s+/).filter(Boolean);

function* walk(node: Node, ancestors: Element[] = []): Generator<{ el: Element; ancestors: Element[] }> {
  const children = 'childNodes' in node ? node.childNodes : [];
  for (const child of children) {
    if (!isElement(child)) continue;
    yield { el: child, ancestors };
    yield* walk(child.tagName === 'template' ? (child as unknown as { content: Node }).content : child, [...ancestors, child]);
  }
}

function text(node: Node): string {
  if ('value' in node && node.nodeName === '#text') return node.value;
  return ('childNodes' in node ? node.childNodes : []).map(text).join('');
}

const isLocked = (el: Element) =>
  el.tagName === 'canvas' || classes(el).some((c) => (LOCKED_CLASSES as readonly string[]).includes(c));
const isBuiltinPiece = (name: string) => (BUILTIN_PIECES as readonly string[]).includes(name) || /^washi-\d+$/.test(name);
const hasParte = (el: Element) => attr(el, 'data-parte') !== undefined;
const hasSeccion = (el: Element) => attr(el, 'data-seccion') !== undefined;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Returns the faces in a caras.html: elements with data-cara="<id>". */
export function findFaces(html: string): { id: string; el: Element }[] {
  const faces: { id: string; el: Element }[] = [];
  for (const { el } of walk(parse(html))) {
    const id = attr(el, 'data-cara');
    if (id) faces.push({ id, el });
  }
  return faces;
}

export function checkFace(file: string, id: string, face: Element): string[] {
  const errors: string[] = [];
  const where = `${file} [data-cara="${id}"]`;
  let mainQr = 0;
  let mainArroba = 0;
  /** Each section key and whether any of its elements holds an editable text. */
  const sections = new Map<string, boolean>();

  for (const { el, ancestors } of walk(face)) {
    const chain = [...ancestors.slice(ancestors.indexOf(face) + 1), el];
    const ed = attr(el, 'data-ed');
    if (ed !== undefined) {
      if (chain.some(isLocked)) errors.push(`${where}: data-ed="${ed}" is on or inside a locked element`);
      else if (CONTACT_TEXT.test(text(el))) errors.push(`${where}: data-ed="${ed}" makes contact data editable`);
    }
    const seccion = attr(el, 'data-seccion');
    if (seccion !== undefined) {
      errors.push(...checkSection(where, seccion, el, chain));
      const editable = [el, ...[...walk(el)].map((w) => w.el)].some((e) => attr(e, 'data-ed') !== undefined);
      sections.set(seccion, (sections.get(seccion) ?? false) || editable);
    }
    const parte = attr(el, 'data-parte');
    if (parte !== undefined && isBuiltinPiece(parte)) errors.push(`${where}: data-parte="${parte}" reuses a built-in piece key`);
    const inParte = chain.some(hasParte);
    if (classes(el).includes('qr') && !inParte) mainQr++;
    if (!inParte && [...el.childNodes].some((n) => n.nodeName === '#text' && 'value' in n && n.value.includes('@KoboTheWolf'))) {
      mainArroba++;
    }
  }

  for (const [key, editable] of sections) {
    if (!editable) errors.push(`${where}: data-seccion="${key}" has no editable text in any of its elements`);
  }

  if (id.endsWith('-r')) {
    if (mainQr !== 1) errors.push(`${where}: a back needs exactly one main QR (.qr outside data-parte), found ${mainQr}`);
    if (mainArroba < 1) errors.push(`${where}: a back needs @KoboTheWolf outside any data-parte`);
  }
  return errors;
}

/**
 * One element of a text-size section (FR-E22, DESIGN §3.2): a slug key, never
 * on, around or inside a locked element or contact text, never inside another
 * section. checkFace adds that each section holds at least one editable text.
 */
function checkSection(where: string, key: string, el: Element, chain: Element[]): string[] {
  const errors: string[] = [];
  const at = `${where}: data-seccion="${key}"`;
  const inside = [el, ...[...walk(el)].map((w) => w.el)];
  if (!SLUG.test(key)) errors.push(`${at} must be a lowercase slug`);
  if (chain.slice(0, -1).some(hasSeccion)) errors.push(`${at} is inside another section`);
  if (chain.some(isLocked) || inside.some(isLocked)) errors.push(`${at} is on, inside or around a locked element`);
  else if (CONTACT_TEXT.test(text(el))) errors.push(`${at} holds contact data`);
  return errors;
}

const ASSET = /^assets\/([^/]+)$/;

/**
 * Face images and masks must be `assets/<file>` of an existing style asset, and a
 * `data-arte` image must show `assets/st-<key>.png` for one of the style's art keys.
 */
export function checkAssetRefs(file: string, html: string, assets: ReadonlySet<string>, artKeys: readonly string[]): string[] {
  const errors: string[] = [];
  for (const { id, el: face } of findFaces(html)) {
    const where = `${file} [data-cara="${id}"]`;
    for (const { el } of walk(face)) {
      for (const name of ['src', 'data-mask']) {
        const value = attr(el, name);
        if (value === undefined) continue;
        const match = ASSET.exec(value);
        if (!match) errors.push(`${where}: ${name}="${value}" must be assets/<file>`);
        else if (!assets.has(match[1]!)) errors.push(`${where}: ${name}="${value}" does not exist in the style's assets`);
      }
      if (attr(el, 'data-arte') !== undefined) {
        const key = /^assets\/st-(.+)\.png$/.exec(attr(el, 'src') ?? '')?.[1];
        if (key === undefined || !artKeys.includes(key)) {
          errors.push(`${where}: data-arte image must be assets/st-<key>.png for an art key in editor.json (${artKeys.join(', ')})`);
        }
      }
    }
  }
  return errors;
}

export function checkFacesHtml(file: string, html: string): string[] {
  const faces = findFaces(html);
  if (faces.length === 0) return [`${file}: no [data-cara] faces found`];
  return faces.flatMap(({ id, el }) => checkFace(file, id, el));
}
