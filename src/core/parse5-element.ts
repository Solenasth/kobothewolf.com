// Adapts a parse5 tree to MarkElement, so the marks parser runs in Node (unit
// tests and `validate`) exactly as it runs on DOM elements in the browser.
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

/** A writable element for paint tests: records what painting does to it. */
export class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly style = {
    transform: '',
    display: '',
    props: new Map<string, string>(),
    setProperty(name: string, value: string) {
      this.props.set(name, value);
    },
  };
  children: FakeElement[] = [];
  private text: string | null = null;
  readonly tagName: string;

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  /** Backed by the class attribute, like DOMTokenList. */
  get classList() {
    const list = () => (this.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    const write = (classes: string[]) => this.attributes.set('class', classes.join(' '));
    return {
      [Symbol.iterator]: () => list()[Symbol.iterator](),
      add: (token: string) => write([...new Set([...list(), token])]),
      remove: (token: string) => write(list().filter((c) => c !== token)),
    };
  }
  toggleAttribute(name: string, force: boolean) {
    if (force) this.attributes.set(name, '');
    else this.attributes.delete(name);
    return force;
  }
  get textContent(): string {
    return this.text ?? this.children.map((c) => c.textContent).join('');
  }
  set textContent(value: string | null) {
    this.children = [];
    this.text = value ?? '';
  }
  replaceChildren(...nodes: unknown[]) {
    this.text = null;
    this.children = nodes.map((n) => {
      if (!(n instanceof FakeElement)) throw new Error('only elements built by makeLetter may be inserted');
      return n;
    });
  }
}

/** Parses HTML into FakeElements and returns the face with data-cara="<id>". */
export function fakeFaceFrom(html: string, id: string): FakeElement {
  const convert = (el: P5Element): FakeElement => {
    const fake = new FakeElement(el.tagName.toUpperCase());
    for (const a of el.attrs) fake.attributes.set(a.name, a.value);
    const kids = el.childNodes.filter(isElement);
    if (kids.length) fake.children = kids.map(convert);
    else fake.textContent = text(el);
    return fake;
  };
  const stack: P5Node[] = [parseFragment(html)];
  while (stack.length) {
    const node = stack.pop()!;
    if (isElement(node) && node.attrs.some((a) => a.name === 'data-cara' && a.value === id)) return convert(node);
    if ('childNodes' in node) stack.push(...node.childNodes);
  }
  throw new Error(`no face ${id}`);
}
