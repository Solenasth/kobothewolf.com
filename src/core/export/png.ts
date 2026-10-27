// A face to a print PNG (FR-E14, NFR-2, DESIGN §5.5): rendered by html-to-image
// from 960 × 560 to 1134 × 661 (96 × 56 mm at 300 dpi), with the WebKit shadow
// fix applied around the render and a pHYs chunk so readers see 300 dpi.
import { toPng } from 'html-to-image';
import { setDpi } from '../phys';
import { fontEmbedCss } from './fonts';
import { shadowsToDivs } from './shadows';

export const DPI = 300;
export const WIDTH = Math.round((96 / 25.4) * DPI); // 1134
export const HEIGHT = Math.round((56 / 25.4) * DPI); // 661

/** Each face's embedded font CSS, computed once (NFR-2). */
const fontCss = new WeakMap<HTMLElement, Promise<string>>();

/**
 * The computed properties html-to-image copies onto its clone where the browser
 * has no computed cssText (Firefox, WebKit), minus two that are always their
 * defaults here. With all background longhands present, WebKit on Linux
 * serializes the clone's style as one `background` shorthand that drops later
 * layers' size and position; without background-attachment it can't. With
 * corner-*-shape present, WebKit leaves border-radius out entirely. Both seen
 * in #17.
 */
let styleProperties: string[] | undefined;
function exportStyleProperties(): string[] {
  styleProperties ??= [...getComputedStyle(document.documentElement)].filter((name) => !/^background-attachment$|^corner-/.test(name));
  return styleProperties;
}

function bytesOf(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Renders one at a time: the shadow fix changes the face while a render runs. */
let queue: Promise<unknown> = Promise.resolve();
function queued<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

function fontsFor(face: HTMLElement): Promise<string> {
  let css = fontCss.get(face);
  if (!css) {
    css = fontEmbedCss(face);
    fontCss.set(face, css);
  }
  return css;
}

async function render(face: HTMLElement): Promise<string> {
  const options = {
    width: 960,
    height: 560,
    canvasWidth: WIDTH,
    canvasHeight: HEIGHT,
    pixelRatio: 1,
    cacheBust: false,
    fontEmbedCSS: await fontsFor(face),
    includeStyleProperties: exportStyleProperties(),
  };
  const undo = shadowsToDivs(face);
  try {
    return await toPng(face, options);
  } finally {
    undo();
  }
}

/**
 * Renders a face once and throws the result away, so its fonts and images are
 * loaded before the first real export. The first render of a session is by
 * far the slowest in WebKit (3.3 s against 0.1–0.7 s afterwards, #17).
 */
export function prepareFace(face: HTMLElement): Promise<void> {
  return queued(async () => {
    await render(face);
  });
}

/** A face's PNG bytes with the 300 dpi pHYs chunk. */
export function renderFacePng(face: HTMLElement): Promise<Uint8Array> {
  return queued(async () => {
    // WebKit draws an image inside the SVG only once it has loaded there, so a
    // render right after a change (new art, say) can miss it. The first pass
    // loads, the second is the export (#17).
    await render(face);
    const result = setDpi(bytesOf(await render(face)), DPI);
    if (!result.ok) throw new Error(`export: the rendered PNG was not valid (${result.error.code})`);
    return result.png;
  });
}

export async function renderFace(face: HTMLElement): Promise<Blob> {
  return new Blob([(await renderFacePng(face)) as Uint8Array<ArrayBuffer>], { type: 'image/png' });
}
