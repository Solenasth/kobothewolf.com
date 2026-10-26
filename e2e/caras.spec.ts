import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fixturePort } from '../playwright.config';

// FR-E18, NFR-1, T-SEC-4, DESIGN §3.1, §7, §10: every real face, mounted
// through src/styles.ts with its default background, under the site's CSP.
test.use({ baseURL: `http://localhost:${fixturePort}` });

const tokens = JSON.parse(readFileSync('styles/boykisser-uwu/tokens.json', 'utf8')) as {
  tipografia: { max_fuentes_por_cara: number };
};
const FACES = ['cer-f', 'cer-r', 'lic-f', 'lic-r', 'cod-f', 'cod-r', 'soc-f', 'soc-r'];

let problems: string[];

async function open(page: Page) {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  page.on('request', (req) => {
    if (!/^(?:data|blob):/.test(req.url()) && new URL(req.url()).origin !== `http://localhost:${fixturePort}`) {
      problems.push(`request: ${req.url()}`);
    }
  });
  await page.goto('/caras/');
  await expect(page.locator('#caras')).toHaveAttribute('data-ready', 'true');
}

test.beforeEach(async ({ page }) => open(page));

test('FR-E18 every face of the four variants mounts, in tab order', async ({ page }) => {
  expect(await page.locator('#caras > [data-cara]').evaluateAll((els) => els.map((el) => el.getAttribute('data-cara')))).toEqual(FACES);
  expect(problems).toEqual([]);
});

test('§3.1 each face is 960 × 560 with the 900 × 500 cut at (30, 30)', async ({ page }) => {
  for (const id of FACES) {
    const face = (await page.locator(`[data-cara="${id}"]`).boundingBox())!;
    const card = (await page.locator(`[data-cara="${id}"] > .card`).boundingBox())!;
    expect([face.width, face.height], id).toEqual([960, 560]);
    expect([card.x - face.x, card.y - face.y, card.width, card.height], id).toEqual([30, 30, 900, 500]);
  }
});

test('T-SEC-4 every image and mask loads from the origin under the CSP', async ({ page }) => {
  const images = await page.locator('#caras img').evaluateAll((els) =>
    (els as HTMLImageElement[]).map((img) => ({ src: img.getAttribute('src')!, ok: img.complete && img.naturalWidth > 0 })),
  );
  expect(images.length).toBeGreaterThan(0);
  for (const img of images) {
    expect(img.ok, img.src).toBe(true);
    expect(img.src, 'resolved, not the authored assets/ path').not.toMatch(/^assets\//);
  }
  expect(await page.locator('[data-cara="cod-f"] canvas').getAttribute('data-mask')).not.toMatch(/^assets\//);
  expect(problems).toEqual([]);
});

test('§7 each face renders at most the style font limit, all loaded', async ({ page }) => {
  const fonts = await page.locator('#caras > [data-cara]').evaluateAll((faces) =>
    faces.map((face) => {
      const families = new Set<string>();
      const walker = document.createTreeWalker(face, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        families.add(getComputedStyle(node.parentElement!).fontFamily.split(',')[0]!.trim());
      }
      return { id: face.getAttribute('data-cara')!, families: [...families], loaded: [...families].every((f) => document.fonts.check(`16px ${f}`)) };
    }),
  );
  for (const { id, families, loaded } of fonts) {
    expect(families.length, `${id}: ${families.join(', ')}`).toBeLessThanOrEqual(tokens.tipografia.max_fuentes_por_cara);
    expect(families.every((f) => ['Burbuja', 'Plumon', 'Lazo', 'Silk', 'Code'].includes(f)), `${id}: ${families.join(', ')}`).toBe(true);
    expect(loaded, id).toBe(true);
  }
});

test('NFR-1 class names shared across variants keep each variant’s own rules', async ({ page }) => {
  const css = (selector: string, property: string) =>
    page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  // .nombre, .titulo, .frase and .sello exist in more than one variant.
  expect(await css('[data-cara="cer-f"] .nombre', 'font-size')).toBe('44px');
  expect(await css('[data-cara="cod-f"] .nombre', 'font-size')).toBe('58px');
  expect(await css('[data-cara="soc-f"] .nombre', 'font-size')).toBe('30px');
  expect(await css('[data-cara="lic-f"] .titulo', 'font-size')).toBe('52px');
  expect(await css('[data-cara="soc-f"] .titulo', 'font-size')).toBe('64px');
  expect(await css('[data-cara="cer-f"] .frase', 'font-size')).toBe('21px');
  expect(await css('[data-cara="soc-r"] .frase', 'font-size')).toBe('40px');
  expect(await css('[data-cara="cer-f"] .sello', 'width')).toBe('140px');
  expect(await css('[data-cara="lic-f"] .sello', 'width')).toBe('112px');
});

test('FR-E7 FR-E8 default backgrounds and accent come from the data', async ({ page }) => {
  const bg = (id: string) => page.locator(`[data-cara="${id}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await page.locator('[data-cara="lic-r"]').getAttribute('class')).toBe('fondo-cuaderno');
  expect(await bg('cod-f')).toBe('rgb(255, 248, 238)'); // crema
  expect(await bg('soc-f')).toBe('rgb(255, 228, 238)'); // algodon
  expect(await page.locator('[data-cara="cer-f"] .nombre').evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 143, 184)');
});
