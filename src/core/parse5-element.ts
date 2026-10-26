// Test helper: adapts a parse5 tree to MarkElement, so the marks parser can be
// unit-tested in Node exactly as it runs on DOM elements in the browser.
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import type { MarkElement } from './marks';

type P5Node = DefaultTreeAdapterMap['node'];
type P5Element = DefaultTreeAdapterMap['element'];

const isElement = (n: P5Node): n is P5Element => 'tagName' in n;
const text = (n: P5Node): string =>
  n.nodeName === '#text' && 'value' in n ? n.value : ('childNodes' in n ? n.childNodes : []).map(text).join('');

function adapt(el: P5Element): MarkElement {
  return {
    tagName: el.tagName.toUpperCase(),
    getAttribute: (name) => el.attrs.find((a) => a.name === name)?.value ?? null,
    get children() {
      return el.childNodes.filter(isElement).map(adapt);
    },
    get textContent() {
      return text(el);
    },
  };
}

/** Parses HTML and returns the element with data-cara="<id>". */
export function faceFrom(html: string, id: string): MarkElement {
  const stack: P5Node[] = [parseFragment(html)];
  while (stack.length) {
    const node = stack.pop()!;
    if (isElement(node) && node.attrs.some((a) => a.name === 'data-cara' && a.value === id)) return adapt(node);
    if ('childNodes' in node) stack.push(...node.childNodes);
  }
  throw new Error(`no face ${id}`);
}
