// Reads the simple, uncompressed-xref PDFs jsPDF writes (DESIGN §5.5), for the
// print PDF's unit and E2E tests: pages in order with their size in points, the
// images each page draws, decoded to raw pixels, the Info strings and the fonts.
// Not a general PDF parser: no object streams, no encryption.
import { inflateSync } from 'node:zlib';

export interface PdfImage {
  width: number;
  height: number;
  colorSpace: string;
  /** Unfiltered samples, `colors` bytes per pixel, row by row. */
  pixels: Uint8Array;
  colors: number;
  smask: boolean;
}

export interface PdfPage {
  width: number;
  height: number;
  /** The decoded content stream. */
  content: string;
  images: PdfImage[];
}

interface PdfObject {
  dict: string;
  stream?: Uint8Array;
}

function objects(bytes: Uint8Array): Map<number, PdfObject> {
  const text = Buffer.from(bytes).toString('latin1');
  const found = new Map<number, PdfObject>();
  for (const m of text.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)) {
    const body = m[2]!;
    const at = body.search(/stream\r?\n/);
    if (at < 0) {
      found.set(Number(m[1]), { dict: body });
      continue;
    }
    const dict = body.slice(0, at);
    const start = m.index + m[0].indexOf(body) + at + body.slice(at).indexOf('\n') + 1;
    const length = Number(/\/Length (\d+)/.exec(dict)![1]);
    found.set(Number(m[1]), { dict, stream: bytes.subarray(start, start + length) });
  }
  return found;
}

const ref = (dict: string, key: string) => Number(new RegExp(`/${key} (\\d+) 0 R`).exec(dict)?.[1]);

function decoded(obj: PdfObject): Uint8Array {
  return /\/Filter \/FlateDecode/.test(obj.dict) ? inflateSync(obj.stream!) : obj.stream!;
}

/** Undoes PNG predictors (DecodeParms /Predictor 10–15): one filter byte per row. */
function unpredict(data: Uint8Array, columns: number, colors: number): Uint8Array {
  const row = columns * colors;
  const rows = data.length / (row + 1);
  const out = new Uint8Array(rows * row);
  for (let y = 0; y < rows; y++) {
    const filter = data[y * (row + 1)]!;
    for (let x = 0; x < row; x++) {
      const raw = data[y * (row + 1) + 1 + x]!;
      const a = x >= colors ? out[y * row + x - colors]! : 0;
      const b = y > 0 ? out[(y - 1) * row + x]! : 0;
      const c = x >= colors && y > 0 ? out[(y - 1) * row + x - colors]! : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const predicted = [0, a, b, (a + b) >> 1, paeth][filter];
      if (predicted === undefined) throw new Error(`pdf-read: unknown PNG filter ${filter}`);
      out[y * row + x] = (raw + predicted) & 255;
    }
  }
  return out;
}

function image(obj: PdfObject): PdfImage {
  const num = (key: string) => Number(new RegExp(`/${key} (\\d+)`).exec(obj.dict)![1]);
  const colorSpace = /\/ColorSpace \/(\w+)/.exec(obj.dict)![1]!;
  const colors = colorSpace === 'DeviceRGB' ? 3 : 1;
  const width = num('Width');
  let pixels = decoded(obj);
  if (/\/Predictor 1[0-5]/.test(obj.dict)) pixels = unpredict(pixels, width, colors);
  return { width, height: num('Height'), colorSpace, pixels, colors, smask: /\/SMask \d+ 0 R/.test(obj.dict) };
}

export function readPdf(bytes: Uint8Array) {
  const text = Buffer.from(bytes).toString('latin1');
  if (!text.startsWith('%PDF-')) throw new Error('pdf-read: not a PDF');
  const objs = objects(bytes);
  const root = objs.get(Number(/\/Root (\d+) 0 R/.exec(text)![1]))!;
  const tree = objs.get(ref(root.dict, 'Pages'))!;
  const kids = [.../\/Kids \[([^\]]*)\]/.exec(tree.dict)![1]!.matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1]));
  const pages: PdfPage[] = kids.map((id) => {
    const page = objs.get(id)!;
    const [, , width, height] = /\/MediaBox \[([^\]]*)\]/.exec(page.dict)![1]!.trim().split(/\s+/).map(Number);
    const content = Buffer.from(decoded(objs.get(ref(page.dict, 'Contents'))!)).toString('latin1');
    const resources = objs.get(ref(page.dict, 'Resources'))!.dict;
    const xobjects = /\/XObject <<([\s\S]*?)>>/.exec(resources)?.[1] ?? '';
    const images = [...content.matchAll(/\/(\w+) Do/g)].map((m) => image(objs.get(ref(xobjects, m[1]!))!));
    return { width: width!, height: height!, content, images };
  });
  const infoObj = objs.get(Number(/\/Info (\d+) 0 R/.exec(text)?.[1]));
  const info = Object.fromEntries([...(infoObj?.dict ?? '').matchAll(/\/(\w+) \(((?:\\.|[^\\)])*)\)/g)].map((m) => [m[1]!, m[2]!]));
  const fonts = [...objs.values()].filter((o) => /\/Type \/Font\b/.test(o.dict)).length;
  return { pages, info, fonts };
}
