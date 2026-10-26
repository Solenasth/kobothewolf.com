// Face rules for `validate` (FR-B3, DESIGN §7). Faces are trusted build-time
// HTML; parse5 gives Node the tree a browser would build.
import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

const LOCKED_CLASSES = ['qr', 'arroba', 'url'];
const CONTACT_TEXT = /@KoboTheWolf|t\.me\/|kobothewolf\.com/i;

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

const isLocked = (el: Element) => el.tagName === 'canvas' || classes(el).some((c) => LOCKED_CLASSES.includes(c));
const hasParte = (el: Element) => attr(el, 'data-parte') !== undefined;

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

  for (const { el, ancestors } of walk(face)) {
    const chain = [...ancestors.slice(ancestors.indexOf(face) + 1), el];
    const ed = attr(el, 'data-ed');
    if (ed !== undefined) {
      if (chain.some(isLocked)) errors.push(`${where}: data-ed="${ed}" is on or inside a locked element`);
      else if (CONTACT_TEXT.test(text(el))) errors.push(`${where}: data-ed="${ed}" makes contact data editable`);
    }
    const inParte = chain.some(hasParte);
    if (classes(el).includes('qr') && !inParte) mainQr++;
    if (!inParte && [...el.childNodes].some((n) => n.nodeName === '#text' && 'value' in n && n.value.includes('@KoboTheWolf'))) {
      mainArroba++;
    }
  }

  if (id.endsWith('-r')) {
    if (mainQr !== 1) errors.push(`${where}: a back needs exactly one main QR (.qr outside data-parte), found ${mainQr}`);
    if (mainArroba < 1) errors.push(`${where}: a back needs @KoboTheWolf outside any data-parte`);
  }
  return errors;
}

export function checkFacesHtml(file: string, html: string): string[] {
  const faces = findFaces(html);
  if (faces.length === 0) return [`${file}: no [data-cara] faces found`];
  return faces.flatMap(({ id, el }) => checkFace(file, id, el));
}
