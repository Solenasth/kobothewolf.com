import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// NFR-1, DESIGN §10: each default face in the editor, at scale 1, against the
// baseline made from P8 with the same state (scripts/p8-baselines.ts).
// Baselines come from the CI Playwright image; font rendering on other
// systems differs, so they skip this file.
test.skip(process.platform !== 'linux', 'baselines are made in the CI Playwright image (Linux)');

interface Manifest {
  id: string;
  caras: { frente: string; reverso: string };
}
const VARIANTS = ['certificado', 'licencia', 'codigo', 'socks'].map(
  (v) => JSON.parse(readFileSync(`styles/boykisser-uwu/variantes/${v}/variant.json`, 'utf8')) as Manifest,
);

/** Shows a variant's faces at 960 × 560, without guides, once everything is drawn. */
async function showAtScale1(page: Page, variant: Manifest) {
  await page.evaluate(({ f, r }) => (window as unknown as { __kobo: { store: { select(f: string, r: string): void } } }).__kobo.store.select(f, r), {
    f: variant.caras.frente,
    r: variant.caras.reverso,
  });
  await page.locator('.ed-visor').evaluateAll((els) => els.forEach((el) => ((el as HTMLElement).style.width = '960px')));
  await expect(page.locator('.ed-escala').first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.locator('.ed-escala').last()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.evaluate(() => (window as unknown as { __kobo: { ready(): Promise<void> } }).__kobo.ready());
}

/** WebKit keeps the reduced decode it made while a face was shown small; reloading the images decodes them at full size. */
const redecode = (face: Element) =>
  Promise.all(
    [...face.querySelectorAll('img')].map((img) => {
      const src = img.src;
      img.src = '';
      img.src = src;
      return img.decode();
    }),
  );

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1400 });
  await page.goto('/?lang=en&test#editor');
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await page.getByLabel('Show the cut guides (never exported)').uncheck();
});

// Chromium and Firefox must match outside anti-aliased pixels. WebKit paints the
// same face slightly differently from page to page (dash phase, image edges),
// so it gets up to 0.5 % of the face; the worst face measured was 0.43 %.
const tolerance = (browser: string) => (browser === 'webkit' ? { maxDiffPixelRatio: 0.005 } : {});

for (const variant of VARIANTS) {
  test(`NFR-1 ${variant.id}: default faces match P8`, async ({ page, browserName }) => {
    await showAtScale1(page, variant);
    for (const id of [variant.caras.frente, variant.caras.reverso]) {
      const face = page.locator(`[data-cara="${id}"]`);
      // Scroll to the top and pin the viewer at (0, 0) with square corners, so the face lands on whole pixels, uncropped, as in the baseline.
      await face.evaluate((el) => {
        const visor = el.closest<HTMLElement>('.ed-visor')!;
        // A fractional scroll offset would shift Firefox's element box by part of a pixel. Instant: the page scrolls smoothly.
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        Object.assign(visor.style, { position: 'fixed', left: '0', top: '0', width: '960px', zIndex: '9999', borderRadius: '0' });
      });
      await face.evaluate(redecode);
      await expect(face).toHaveScreenshot(`${id}.png`, { animations: 'disabled', scale: 'css', ...tolerance(browserName) });
      await face.evaluate((el) => Object.assign(el.closest<HTMLElement>('.ed-visor')!.style, { position: '', zIndex: '', borderRadius: '' }));
    }
  });
}
