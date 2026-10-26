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
