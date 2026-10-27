import { expect, test, type Page } from '@playwright/test';

// Text size per section (FR-E22, DESIGN §5.1, §5.6), driven through the UI.

const TABS = {
  en: ['Certificate', 'License', 'Code cat', 'Programming socks'],
  es: ['Certificado', 'Licencia', 'Gatito de código', 'Programming socks'],
};
const RESET = { en: 'Reset text sizes', es: 'Restablecer tamaños' };

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

/** Each element of a section: its --tam and its own computed font size in px. */
const measure = (page: Page, id: string, section: string) =>
  page.locator(`.ed-visor [data-cara="${id}"] [data-seccion="${section}"]`).evaluateAll((els) =>
    els.map((el) => ({ tam: (el as HTMLElement).style.getPropertyValue('--tam'), px: parseFloat(getComputedStyle(el).fontSize) })),
  );

for (const lang of ['en', 'es'] as const) {
  test(`FR-E22 ${lang}: every section's size range scales its texts, and reset restores them`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, lang);
    let ranges = 0;
    for (const name of TABS[lang]) {
      await page.getByRole('tab', { name, exact: true }).click();
      for (const group of await page.locator('details.ed-grupo').all()) {
        const id = (await group.getAttribute('data-face'))!;
        const inputs = group.locator('.ed-tamanos input[type="range"]');
        const sections = await inputs.evaluateAll((els) => els.map((el) => el.id));
        expect(sections.length, `${id} has sections`).toBeGreaterThan(0);
        for (const inputId of sections) {
          const section = inputId.slice(`ed-tam-${id}-`.length);
          const range = page.locator(`#${inputId}`);
          await expect(page.locator(`label[for="${inputId}"]`), `${id} ${section} labeled`).not.toBeEmpty();
          const base = await measure(page, id, section);
          expect(base.length, `${id} ${section} elements`).toBeGreaterThan(0);
          for (const value of [Number(await range.getAttribute('min')), Number(await range.getAttribute('max'))]) {
            await range.fill(String(value));
            await expect(page.locator(`output[for="${inputId}"]`)).toHaveText(`${value} %`);
            const now = await measure(page, id, section);
            for (const [i, el] of now.entries()) {
              expect(el.tam, `${id} ${section}`).toBe(String(value / 100));
              expect(el.px, `${id} ${section} font size`).toBeCloseTo((base[i]!.px * value) / 100, 1);
            }
          }
          ranges++;
        }
        await group.getByRole('button', { name: RESET[lang] }).click();
        for (const inputId of sections) await expect(page.locator(`#${inputId}`)).toHaveValue('100');
        const after = await page.locator(`.ed-visor [data-cara="${id}"] [data-seccion]`).evaluateAll((els) =>
          els.map((el) => (el as HTMLElement).style.getPropertyValue('--tam')),
        );
        expect(new Set(after), `${id} reset`).toEqual(new Set(['1']));
      }
    }
    expect(ranges, 'one range per section on all eight faces (DESIGN §3.2)').toBe(31);
    expect(problems).toEqual([]);
  });
}

test('FR-E22 locked contact text keeps its size, and sizes survive a reload', async ({ page }) => {
  await open(page, 'en');
  const arroba = () => page.locator('.ed-visor [data-cara="cer-r"] .arroba').evaluate((el) => getComputedStyle(el).fontSize);
  const before = await arroba();
  await page.locator('#ed-tam-cer-r-sitio').fill('115');
  await page.locator('#ed-tam-cer-r-terminos').fill('85');
  expect(await arroba(), '@KoboTheWolf is never in a section').toBe(before);
  await page.waitForFunction(() => localStorage.getItem('kobo-editor-v1')?.includes('"terminos":85'));
  await expect(page.locator('#ed-png-frente')).toBeEnabled();
  await page.reload();
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await expect(page.locator('#ed-tam-cer-r-sitio')).toHaveValue('115');
  expect((await measure(page, 'cer-r', 'terminos'))[0]!.tam).toBe('0.85');
  expect(problems).toEqual([]);
});
