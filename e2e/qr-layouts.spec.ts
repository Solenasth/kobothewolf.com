import { expect, test, type Page } from '@playwright/test';

// QR layouts on the backs (FR-E23, DESIGN §3.4), driven through the UI.

const TABS = {
  en: [['Certificate', 'cer-r'], ['License', 'lic-r'], ['Code cat', 'cod-r'], ['Programming socks', 'soc-r']],
  es: [['Certificado', 'cer-r'], ['Licencia', 'lic-r'], ['Gatito de código', 'cod-r'], ['Programming socks', 'soc-r']],
} as const;
const LABELS = {
  en: ['Large Telegram QR (current)', 'Both QRs the same size, stacked'],
  es: ['QR de Telegram grande (actual)', 'Ambos QR del mismo tamaño, apilados'],
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
