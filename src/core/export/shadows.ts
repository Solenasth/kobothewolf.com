// P8's sombrasADivs(), the WebKit box-shadow fix (EV §10, DESIGN §5.5).
// WebKit paints box-shadow badly inside the SVG html-to-image renders (shifted
// rings, no top or left edge). For an export, each solid shadow (no blur, no
// inset) becomes real rounded divs behind its element, with the same box and
// transform; the returned function undoes it.

export interface ShadowLayer {
  color: string;
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
}

/** Splits a computed `box-shadow` into layers, keeping commas inside color functions. */
export function parseShadows(value: string): ShadowLayer[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= value.length; i++) {
    const c = value[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if ((c === ',' && depth === 0) || i === value.length) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  return parts
    .filter(Boolean)
    .map((part) => {
      const color = /(rgba?\([^)]*\)|#[0-9a-f]+)/i.exec(part)?.[0] ?? 'transparent';
      const nums = (part.replace(color, '').match(/-?[\d.]+px|-?[\d.]+(?=\s|$)/g) ?? []).map(parseFloat);
      return { color, inset: /\binset\b/.test(part), x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0 };
    });
}

function offsetsUpTo(el: HTMLElement, root: HTMLElement): [number, number] {
  let x = 0;
  let y = 0;
  for (let n: Element | null = el; n instanceof HTMLElement && n !== root && root.contains(n); n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return [x, y];
}

/** Replaces every solid box-shadow under `root` with divs; returns the undo. */
export function shadowsToDivs(root: HTMLElement): () => void {
  const undo: (() => void)[] = [];
  const doc = root.ownerDocument;
  for (const el of [...root.querySelectorAll<HTMLElement>('*')]) {
    const cs = getComputedStyle(el);
    if (!cs.boxShadow || cs.boxShadow === 'none' || cs.display === 'none' || el.tagName === 'I-SOMBRA') continue;
    const layers = parseShadows(cs.boxShadow);
    if (!layers.length || layers.some((l) => l.inset || l.blur > 0)) continue;

    const style = el.getAttribute('style');
    if (cs.position === 'static') el.style.position = 'relative';
    const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((r) =>
      r.split(' ').map(parseFloat),
    );
    const holder = doc.createElement('i-sombra');
    holder.style.cssText = `display:block;position:absolute;left:0;top:0;margin:0;padding:0;pointer-events:none;width:${el.offsetWidth}px;height:${el.offsetHeight}px;transform:${cs.transform};transform-origin:${cs.transformOrigin};opacity:${cs.opacity};z-index:${cs.zIndex}`;
    for (const l of [...layers].reverse()) {
      const d = doc.createElement('i');
      const r = radii.map((p) => p.map((v) => `${v > 0 ? Math.max(0, v + l.spread) : 0}px`).join(' '));
      d.style.cssText = `display:block;position:absolute;left:${l.x - l.spread}px;top:${l.y - l.spread}px;width:${el.offsetWidth + 2 * l.spread}px;height:${el.offsetHeight + 2 * l.spread}px;background:${l.color};border-top-left-radius:${r[0]};border-top-right-radius:${r[1]};border-bottom-right-radius:${r[2]};border-bottom-left-radius:${r[3]}`;
      holder.appendChild(d);
    }
    el.parentNode!.insertBefore(holder, el);
    const [ex, ey] = offsetsUpTo(el, root);
    const [hx, hy] = offsetsUpTo(holder, root);
    holder.style.left = `${ex - hx}px`;
    holder.style.top = `${ey - hy}px`;
    el.style.setProperty('box-shadow', 'none', 'important');
    undo.push(() => {
      holder.remove();
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    });
  }
  return () => undo.reverse().forEach((f) => f());
}
