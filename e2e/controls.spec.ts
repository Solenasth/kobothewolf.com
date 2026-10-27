import { expect, test, type Locator, type Page } from '@playwright/test';

// Text and piece controls (FR-E3, FR-E4, FR-E11–E13, FR-I2, T-SEC-1, DESIGN §5.6, §10).

type Hook = { bound(id: string): { fields: Element[]; pieces: Map<string, Element[]> } };

let problems: string[];

async function open(page: Page, lang: 'en' | 'es' = 'en') {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(`/?lang=${lang}&test#editor`);
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
}

/** Whether every element behind a field or piece is hidden (display: none), per element. */
function hiddenState(page: Page, id: string, ref: { campo: number } | { pieza: string }) {
  return page.evaluate(
    ({ id, ref }) => {
      const bound = (window as unknown as { __kobo: Hook }).__kobo.bound(id);
      const els = 'campo' in ref ? [bound.fields[ref.campo]!] : bound.pieces.get(ref.pieza)!;
      return els.map((el) => getComputedStyle(el).display === 'none');
    },
    { id, ref },
  );
}

async function toggleEach(page: Page, id: string, boxes: Locator) {
  const count = await boxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i);
    const campo = await box.getAttribute('data-campo');
    const ref = campo !== null ? { campo: Number(campo) } : { pieza: (await box.getAttribute('data-pieza'))! };
    const where = `${id} ${JSON.stringify(ref)}`;
    expect(await hiddenState(page, id, ref), where).not.toContain(true);
    await box.uncheck();
    expect(await hiddenState(page, id, ref), where).not.toContain(false);
    await box.check();
    expect(await hiddenState(page, id, ref), where).not.toContain(true);
  }
}

const TABS = {
  en: ['Certificate', 'License', 'Code cat', 'Programming socks'],
  es: ['Certificado', 'Licencia', 'Gatito de código', 'Programming socks'],
};

for (const lang of ['en', 'es'] as const) {
  test(`FR-E3 FR-E4 every text and piece checkbox on every face hides and restores its element (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, lang);
    for (const name of TABS[lang]) {
      await page.getByRole('tab', { name, exact: true }).click();
      for (const group of await page.locator('details.ed-grupo').all()) {
        const id = (await group.getAttribute('data-face'))!;
        await toggleEach(page, id, group.locator('input[data-campo]'));
        await toggleEach(page, id, group.locator('input[data-pieza]'));
      }
    }
    expect(problems).toEqual([]);
  });
}

test('FR-E3 text boxes follow document order, are labeled from the style catalog and apply live', async ({ page }) => {
  await open(page, 'es');
  const front = page.locator('details[data-face="cer-f"]');
  await expect(front.locator('summary')).toHaveText('Frente');
  await expect(front.getByRole('checkbox', { name: 'Mostrar Nombre' })).toBeChecked();
  const nombre = front.getByRole('textbox', { name: 'Nombre', exact: true });
  await expect(nombre).toHaveValue('Kobo The Wolf');
  await nombre.fill('Lobo Kobo');
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Nombre"]')).toHaveText('Lobo Kobo');
  // Bounce text is rebuilt one span per letter.
  await front.getByRole('textbox', { name: 'Titular', exact: true }).fill('uwu');
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Titular"] > span')).toHaveText(['u', 'w', 'u']);
  expect(problems).toEqual([]);
});

test('FR-E3 text is capped at 90 characters', async ({ page }) => {
  await open(page);
  const box = page.locator('#ed-cer-f-2');
  await box.fill('x'.repeat(120));
  await expect(box).toHaveValue('x'.repeat(90));
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Nombre"]')).toHaveText('x'.repeat(90));
});

test('T-SEC-1 typed HTML stays text on the face', async ({ page }) => {
  let dialog = false;
  page.on('dialog', async (d) => {
    dialog = true;
    await d.dismiss();
  });
  await open(page);
  const images = await page.locator('[data-cara="cer-f"] img').count();
  const payload = '<img src=x onerror=alert(1)>';
  await page.locator('#ed-cer-f-2').fill(payload);
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Nombre"]')).toHaveText(payload);
  expect(await page.locator('[data-cara="cer-f"] [data-ed="Nombre"] *').count()).toBe(0);
  expect(await page.locator('[data-cara="cer-f"] img').count()).toBe(images);
  expect(dialog).toBe(false);
});

test('FR-E11 FR-E12 locked contact has no controls; the site block hides as a whole with its QR', async ({ page }) => {
  await open(page);
  const back = page.locator('details[data-face="cer-r"]');
  const values = await back.locator('input[type="text"]').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  expect(values.some((v) => /@KoboTheWolf|t\.me\/|kobothewolf\.com/i.test(v))).toBe(false);
  // The only control that mentions a QR is the optional site block, as a whole.
  const names = await back.locator('label.chk').allTextContents();
  expect(names.filter((n) => /QR|@KoboTheWolf|telegram/i.test(n))).toEqual(['Site (QR + text)']);
  // The site block is one piece; its invitation text stays editable.
  await back.getByRole('checkbox', { name: 'Site (QR + text)' }).uncheck();
  await expect(page.locator('[data-cara="cer-r"] .sitio')).toBeHidden();
  await expect(page.locator('[data-cara="cer-r"] .sitio .qr')).toBeHidden();
  await expect(page.locator('[data-cara="cer-r"] > .card > .qr, [data-cara="cer-r"] .contacto .qr').first()).toBeVisible();
  await expect(back.getByRole('textbox', { name: 'Site · invitation' })).toBeVisible();
});

test('FR-E13 restore resets texts and pieces on the two faces shown and says so', async ({ page }) => {
  await open(page);
  await page.locator('#ed-cer-f-2').fill('changed');
  await page.locator('details[data-face="cer-r"] input[data-campo="0"]').uncheck();
  await page.locator('details[data-face="cer-f"] input[data-pieza="arte"]').uncheck();
  await page.getByRole('button', { name: 'Restore texts and pieces on these two faces' }).click();
  await expect(page.locator('#ed-cer-f-2')).toHaveValue('Kobo The Wolf');
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Nombre"]')).toHaveText('Kobo The Wolf');
  await expect(page.locator('details[data-face="cer-r"] input[data-campo="0"]')).toBeChecked();
  await expect(page.locator('details[data-face="cer-f"] input[data-pieza="arte"]')).toBeChecked();
  expect(await hiddenState(page, 'cer-f', { pieza: 'arte' })).not.toContain(true);
  await expect(page.locator('#editor [role="status"]')).toHaveText('Restored the texts and pieces on the two faces shown.');
  expect(problems).toEqual([]);
});

test('FR-I2 switching language keeps texts and hidden pieces, and relabels the controls', async ({ page }) => {
  await open(page);
  await page.locator('#ed-cer-f-2').fill('Kobo uwu');
  await page.locator('details[data-face="cer-f"] input[data-pieza="lazo"]').uncheck();
  await page.locator('a[data-lang="es"]').first().click();
  await expect(page.locator('details[data-face="cer-f"] summary')).toHaveText('Frente');
  await expect(page.locator('#ed-cer-f-2')).toHaveValue('Kobo uwu');
  await expect(page.locator('details[data-face="cer-f"] input[data-pieza="lazo"]')).not.toBeChecked();
  await expect(page.locator('details[data-face="cer-f"] label.chk').filter({ has: page.locator('[data-pieza="lazo"]') })).toHaveText('Moño');
  expect(await hiddenState(page, 'cer-f', { pieza: 'lazo' })).not.toContain(false);
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Nombre"]')).toHaveText('Kobo uwu');
  expect(problems).toEqual([]);
});

test('FR-E3 edits are saved and come back after a reload', async ({ page }) => {
  await open(page);
  await page.locator('#ed-cer-f-2').fill('Saved Kobo');
  await page.locator('details[data-face="cer-f"] input[data-pieza="arte"]').uncheck();
  await page.waitForFunction(() => localStorage.getItem('kobo-editor-v1')?.includes('Saved Kobo'));
  await page.reload();
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await expect(page.locator('#ed-cer-f-2')).toHaveValue('Saved Kobo');
  await expect(page.locator('[data-cara="cer-f"] [data-ed="Nombre"]')).toHaveText('Saved Kobo');
  expect(await hiddenState(page, 'cer-f', { pieza: 'arte' })).not.toContain(false);
});
