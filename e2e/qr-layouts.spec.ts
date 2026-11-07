import { expect, test, type Page } from '@playwright/test';

// QR layouts on the backs (FR-E23, DESIGN §3.4), driven through the UI.

const TABS = {
  en: [['Certificate', 'cer-r'], ['License', 'lic-r'], ['Code cat', 'cod-r'], ['Programming socks', 'soc-r']],
  es: [['Certificado', 'cer-r'], ['Licencia', 'lic-r'], ['Gatito de código', 'cod-r'], ['Programming socks', 'soc-r']],
} as const;
const LABELS = {
  en: ['Large Telegram QR (current)', 'Both QRs the same size, stacked', 'Both QRs side by side'],
  es: ['QR de Telegram grande (actual)', 'Ambos QR del mismo tamaño, apilados', 'Ambos QR lado a lado'],
};

let problems: string[];

async function open(page: Page, lang: 'en' | 'es') {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(`/?lang=${lang}#editor`);
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
}

/** The main and site QRs' framed boxes in face pixels. */
const qrBoxes = (page: Page, id: string) =>
  page.locator(`.ed-visor [data-cara="${id}"]`).evaluate((face) => {
    const frame = face.getBoundingClientRect();
    const k = frame.width / 960;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round((r.x - frame.x) / k), y: Math.round((r.y - frame.y) / k), width: Math.round(r.width / k) };
    };
    return { main: box([...face.querySelectorAll('.qr')].find((q) => !q.closest('.sitio'))!), site: box(face.querySelector('.sitio .qr')!) };
  });

/** Each QR's framed width in face pixels: [main, site]. */
const qrWidths = (page: Page, id: string) =>
  page.locator(`.ed-visor [data-cara="${id}"]`).evaluate((face) => {
    const k = face.getBoundingClientRect().width / 960;
    const width = (el: Element | null) => Math.round(el!.getBoundingClientRect().width / k);
    return [width([...face.querySelectorAll('.qr')].find((q) => !q.closest('.sitio'))!), width(face.querySelector('.sitio .qr'))];
  });

for (const lang of ['en', 'es'] as const) {
  test(`FR-E23 ${lang}: every back switches between its QR layouts`, async ({ page }) => {
    await open(page, lang);
    for (const [tab, id] of TABS[lang]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      const select = page.locator(`#ed-qr-${id}`);
      await expect(select.locator('option')).toHaveText(LABELS[lang]);
      await expect(page.locator(`[id^="ed-qr-"][id$="-f"]`), 'fronts have no QR layout').toHaveCount(0);
      const face = page.locator(`.ed-visor [data-cara="${id}"]`);

      await expect(face).toHaveClass(/\bqr-actual\b/);
      expect(await qrWidths(page, id), `${id} current`).toEqual([180, 96]);
      await select.selectOption('iguales');
      await expect(face).toHaveClass(/\bqr-iguales\b/);
      await expect(face).not.toHaveClass(/\bqr-actual\b/);
      expect(await qrWidths(page, id), `${id} same size: 15 mm each`).toEqual([150, 150]);
      await select.selectOption('lado');
      await expect(face).toHaveClass(/\bqr-lado\b/);
      expect(await qrWidths(page, id), `${id} side by side: 15 mm each`).toEqual([150, 150]);
      const { main, site } = await qrBoxes(page, id);
      expect(main.y, `${id} side by side: one row`).toBe(site.y);
      // Frame rings are 3 px outside each box; they must not touch, and the site QR stays in the safe zone (x 900).
      expect(site.x - (main.x + main.width), `${id} side by side: gap`).toBeGreaterThan(6);
      expect(site.x + site.width + 3, `${id} side by side: safe zone`).toBeLessThanOrEqual(900);
      await select.selectOption('actual');
      expect(await qrWidths(page, id), `${id} back to current`).toEqual([180, 96]);
    }
    expect(problems).toEqual([]);
  });
}

test('FR-E23 a back\'s layout survives a reload', async ({ page }) => {
  await open(page, 'en');
  await page.locator('#ed-qr-cer-r').selectOption('iguales');
  await page.waitForFunction(() => localStorage.getItem('kobo-editor-v1')?.includes('"qr":"iguales"'));
  await expect(page.locator('#ed-png-frente')).toBeEnabled();
  await page.reload();
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await expect(page.locator('#ed-qr-cer-r')).toHaveValue('iguales');
  expect(await qrWidths(page, 'cer-r')).toEqual([150, 150]);
  expect(problems).toEqual([]);
});
