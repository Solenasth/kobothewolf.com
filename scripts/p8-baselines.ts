/// <reference lib="dom" />
// Makes the NFR-1 visual baselines from a local copy of P8 (DESIGN §10).
// P8 is private and never committed; run this in the CI Playwright image, so
// the baselines match how CI renders (on an arm64 Mac, use the image's arm64
// build: emulated x86-64 Chromium and WebKit crash):
//
//   node scripts/p8-baselines.ts <path to P8 .html>
//
// Each face is set to the editor's default state through P8's window.__bk, with
// the approved changes since P8: allowed art only ("feliz" where P8 had the
// removed sweater) and the socks back greeting in Burbuja (#12). The guides are
// hidden, and each face is saved at 960 × 560 to e2e/baselines/<browser>/<id>.png.
// Faces in FROM_EDITOR are skipped: P8 can't show them as the editor now does,
// so their baselines are screenshots of the editor (DESIGN §10).
import { mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit, type BrowserType } from '@playwright/test';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/p8-baselines.ts <p8.html>');

const style = 'styles/boykisser-uwu';
const editor = JSON.parse(readFileSync(`${style}/editor.json`, 'utf8')) as {
  acentos: string[];
  sombras: string[];
  inicial: { rotTit: number; anguloWashi: number; brillitos: number; escala: number };
};

/** Faces whose baselines come from the editor: the code-cat front, since its code grew (#75). */
const FROM_EDITOR = new Set(['cod-f']);

interface Face {
  id: string;
  fondo: string;
  arte?: string;
}

/** Each variant's two faces with the editor's defaults: background from variant.json, art as authored. */
const variants: [Face, Face][] = ['certificado', 'licencia', 'codigo', 'socks'].map((v) => {
  const manifest = JSON.parse(readFileSync(`${style}/variantes/${v}/variant.json`, 'utf8')) as {
    caras: { frente: string; reverso: string };
    fondo: { frente: string; reverso: string };
  };
  const html = readFileSync(`${style}/variantes/${v}/caras.html`, 'utf8');
  const face = (side: 'frente' | 'reverso'): Face => {
    const id = manifest.caras[side];
    const part = html.slice(html.indexOf(`data-cara="${id}"`)).split('<div data-cara=')[0]!;
    const arte = /<img[^>]*data-arte[^>]*src="assets\/st-([a-z0-9-]+)\.png"|<img[^>]*src="assets\/st-([a-z0-9-]+)\.png"[^>]*data-arte/.exec(part);
    return { id, fondo: manifest.fondo[side], ...(arte ? { arte: arte[1] ?? arte[2]! } : {}) };
  };
  return [face('frente'), face('reverso')];
});

const browsers: [string, BrowserType][] = [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
];

for (const [name, type] of browsers) {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } });
  // P8 also fetches its export libraries from CDNs; the faces don't need them.
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => document.body.dataset['listo'] === '1' && '__bk' in window);
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(`e2e/baselines/${name}`, { recursive: true });

  for (const [front, back] of variants) {
    await page.evaluate(
      ({ front, back, look }) => {
        const bk = (window as unknown as { __bk: { estado(): Record<string, unknown> & { caras: Record<string, unknown> }; caras(f: string, r: string): void } }).__bk;
        const estado = bk.estado();
        Object.assign(estado, look, { guias: false });
        for (const face of [front, back]) {
          estado.caras[face.id] = { fondo: face.fondo, brillitos: look.brillitos, ...(face.arte ? { arte: face.arte } : {}) };
        }
        bk.caras(front.id, back.id);
        // Approved changes since P8: the socks back greeting moved from Lazo to Burbuja (#12, ≤ 4 fonts per face).
        const saludo = document.querySelector<HTMLElement>('.bleed[data-cara="soc-r"] [data-ed="Saludo"]');
        if (saludo) saludo.style.fontFamily = 'Burbuja';
        for (const visor of document.querySelectorAll<HTMLElement>('.visor')) visor.style.width = '960px';
      },
      {
        front,
        back,
        look: {
          acento: editor.acentos[0],
          sombra: editor.sombras[0],
          rotTit: editor.inicial.rotTit,
          escala: editor.inicial.escala,
          waAng: editor.inicial.anguloWashi,
          brillitos: editor.inicial.brillitos,
        },
      },
    );
    for (const face of [front, back]) {
      if (FROM_EDITOR.has(face.id)) continue;
      const bleed = page.locator(`.bleed[data-cara="${face.id}"]`);
      await page.waitForFunction((id) => {
        const escala = document.querySelector(`.bleed[data-cara="${id}"]`)!.closest<HTMLElement>('.escala')!;
        return getComputedStyle(escala).transform === 'matrix(1, 0, 0, 1, 0, 0)';
      }, face.id);
      await bleed.evaluate((el) => Promise.all([...el.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined))));
      // Scroll to the top and pin the viewer at (0, 0) with square corners, so the face lands on whole pixels, uncropped; the visual test does the same.
      await bleed.evaluate((el) => {
        const visor = el.closest<HTMLElement>('.visor')!;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        Object.assign(visor.style, { position: 'fixed', left: '0', top: '0', width: '960px', zIndex: '9999', borderRadius: '0' });
      });
      // WebKit keeps the reduced decode it made while the face was shown small; reloading
      // the images decodes them at full size. The visual test does the same.
      await bleed.evaluate((el) =>
        Promise.all(
          [...el.querySelectorAll('img')].map((img) => {
            const src = img.src;
            img.src = '';
            img.src = src;
            return img.decode();
          }),
        ),
      );
      await bleed.screenshot({ path: `e2e/baselines/${name}/${face.id}.png`, animations: 'disabled', scale: 'css' });
      await bleed.evaluate((el) => Object.assign(el.closest<HTMLElement>('.visor')!.style, { position: '', zIndex: '', borderRadius: '' }));
      console.log(`${name}/${face.id}.png`);
    }
  }
  await browser.close();
}
