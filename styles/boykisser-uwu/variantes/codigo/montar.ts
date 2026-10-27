// Draws the code cat (FR-E19, FR-E20, DESIGN §5.4): the Rust program and its
// OwO filler laid out inside the mask silhouette. The layout is in gato.ts.
import tokens from '../../tokens.json';
import { PROGRAMA, ajustar, dibujar, texto, unidades } from './gato';

const ESCALA = 4; // drawn at 4× for export
const TINTE = '#FFE4EE';

/** Each canvas's authored size, kept because drawing changes its width and height. */
const tamanos = new WeakMap<HTMLCanvasElement, { ancho: number; alto: number }>();

/** The mask's white area as a white silhouette, tinted. */
function silueta(mask: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = mask.width;
  out.height = mask.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  return out;
}

/** Draws the face's `<canvas data-mask>` and puts the program text in `cara.dataset.codigo`. A face without one is left as is. */
export async function montar(cara: HTMLElement): Promise<void> {
  const cv = cara.querySelector<HTMLCanvasElement>('canvas[data-mask]');
  if (!cv) return;
  const tamano = tamanos.get(cv) ?? { ancho: cv.width, alto: cv.height };
  tamanos.set(cv, tamano);
  const { ancho, alto } = tamano;

  await document.fonts.load('500 10px Code');
  const img = new Image();
  img.src = cv.dataset['mask']!;
  await img.decode();

  // The mask, fitted and centered; its red channel becomes the alpha of a white silhouette.
  const mask = document.createElement('canvas');
  mask.width = ancho;
  mask.height = alto;
  const mctx = mask.getContext('2d', { willReadFrequently: true })!;
  const k = Math.min(ancho / img.width, alto / img.height);
  mctx.drawImage(img, (ancho - img.width * k) / 2, (alto - img.height * k) / 2, img.width * k, img.height * k);
  const datos = mctx.getImageData(0, 0, ancho, alto);
  const rojo = new Uint8ClampedArray(ancho * alto);
  for (let i = 0; i < rojo.length; i++) {
    const r = datos.data[i * 4]!;
    rojo[i] = r;
    datos.data[i * 4] = datos.data[i * 4 + 1] = datos.data[i * 4 + 2] = 255;
    datos.data[i * 4 + 3] = r;
  }
  mctx.putImageData(datos, 0, 0);
  const dentro = (x: number, y: number) => {
    const [px, py] = [Math.floor(x), Math.floor(y)];
    return px >= 0 && py >= 0 && px < ancho && py < alto && rojo[py * ancho + px]! > 128;
  };

  const programa = unidades(PROGRAMA);
  // The style's range for code drawn in a shape (DESIGN §5.4).
  const rango = tokens.efectos_imagen.codigo_con_forma.px as [number, number];

  cv.style.width = `${ancho}px`;
  cv.style.height = `${alto}px`;
  cv.width = ancho * ESCALA;
  cv.height = alto * ESCALA;
  const ctx = cv.getContext('2d')!;
  ctx.scale(ESCALA, ESCALA);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(silueta(mask, TINTE), 0, 0, ancho, alto);
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle';
  const avance = (size: number) => {
    ctx.font = `500 ${size}px Code`;
    return ctx.measureText('M').width;
  };
  const { fs, cw, runs, colocados } = ajustar(dentro, ancho, alto, programa, rango, avance);
  ctx.font = `500 ${fs}px Code`;
  dibujar(ctx, colocados, runs, cw);
  cara.dataset['codigo'] = texto(colocados);
  // The size ajustar() chose, for the tests (DESIGN §5.4).
  cara.dataset['codigoPx'] = String(fs);
}
