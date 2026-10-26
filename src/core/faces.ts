// Turns a variant's caras.html into face elements (FR-E18, DESIGN §5.1). The
// HTML is a trusted build-time file imported with `?raw`; user input never
// comes through here. Template content is inert: no scripts run and nothing
// loads until a face is inserted into the document.

/** Parses `html` and returns its face roots by `data-cara` id, in document order. */
export function parseFaces(html: string, doc: Document = document): Map<string, HTMLElement> {
  const template = doc.createElement('template');
  template.innerHTML = html;
  const faces = new Map<string, HTMLElement>();
  for (const face of template.content.querySelectorAll<HTMLElement>('[data-cara]')) {
    const id = face.dataset['cara']!;
    if (faces.has(id)) throw new Error(`caras.html: duplicate face "${id}"`);
    if (face.parentElement?.closest('[data-cara]')) throw new Error(`caras.html: face "${id}" is nested in another face`);
    faces.set(id, face);
  }
  return faces;
}

const ASSET_ATTRIBUTES = ['src', 'data-mask'] as const;

/**
 * Points a face's `assets/<file>` references (images, the code-cat mask) at
 * their built URLs (DESIGN §3.4). Call it before the face is inserted, so
 * nothing loads from the unresolved path. An unknown file is an error.
 */
export function resolveAssets(face: Element, urls: Readonly<Record<string, string>>): void {
  for (const name of ASSET_ATTRIBUTES) {
    for (const el of face.querySelectorAll(`[${name}]`)) {
      const value = el.getAttribute(name)!;
      const file = /^assets\/([^/]+)$/.exec(value)?.[1];
      const url = file === undefined ? undefined : urls[file];
      if (url === undefined) throw new Error(`face "${face.getAttribute('data-cara')}": unknown asset ${name}="${value}"`);
      el.setAttribute(name, url);
    }
  }
}
