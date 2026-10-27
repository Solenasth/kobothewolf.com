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
 * has no computed cssText (Firefox, WebKit), minus corner-*-shape, which is
 * always the default here. With it present, WebKit leaves border-radius out of
 * the clone's serialized style, so every rounded corner exported square (#17).
 */
let styleProperties: string[] | undefined;
function exportStyleProperties(): string[] {
  styleProperties ??= [...getComputedStyle(document.documentElement)].filter((name) => !name.startsWith('corner-'));
  return styleProperties;
}

function bytesOf(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function renderFace(face: HTMLElement): Promise<Blob> {
  let css = fontCss.get(face);
  if (!css) {
    css = fontEmbedCss(face);
    fontCss.set(face, css);
  }
  const fontEmbedCSS = await css;
  const undo = shadowsToDivs(face);
  let dataUrl: string;
  try {
    const options = {
      width: 960,
      height: 560,
      canvasWidth: WIDTH,
      canvasHeight: HEIGHT,
      pixelRatio: 1,
      cacheBust: false,
      fontEmbedCSS,
      includeStyleProperties: exportStyleProperties(),
    };
    // WebKit draws an image inside the SVG only once it has loaded there, so a
    // first render can miss the sticker, the code cat and background layers
    // (seen in #17). The first pass loads them; the second is the export.
    await toPng(face, options);
    dataUrl = await toPng(face, options);
  } finally {
    undo();
  }
  const result = setDpi(bytesOf(dataUrl), DPI);
  if (!result.ok) throw new Error(`export: the rendered PNG was not valid (${result.error.code})`);
  return new Blob([result.png as Uint8Array<ArrayBuffer>], { type: 'image/png' });
}
