import { ATTRIBUTES } from './static-html';

type Lookup = (key: string) => string;

/** Runtime: re-applies every mark under `root` in the active language. */
export function applyStatic(root: ParentNode, t: Lookup) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset['i18n']!);
  }
  for (const attr of ATTRIBUTES) {
    for (const el of root.querySelectorAll(`[data-i18n-${attr}]`)) {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)!));
    }
  }
}
