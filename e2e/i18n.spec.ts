import { expect, test } from '@playwright/test';

const description = (page: import('@playwright/test').Page) =>
  page.locator('meta[name="description"]').getAttribute('content');

test.describe('FR-I3 FR-I4 language resolution on load', () => {
  test('English by default, with English metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await description(page)).toContain('freelance work');
  });

  test('?lang=es switches lang and description', async ({ page }) => {
    await page.goto('/?lang=es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    expect(await description(page)).toContain('trabajo freelance');
  });

  test('a remembered choice wins over the browser language', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('kobo-lang', 'es'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

test.describe('FR-I3 browser language', () => {
  test.use({ locale: 'es-MX' });

  test('a Spanish browser gets Spanish', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('?lang=en still overrides it', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('T-SEC-5 an injected ?lang= is ignored and never reflected', async ({ page }) => {
  const payload = '<img src=x onerror=alert(1)>';
  let dialog = false;
  page.on('dialog', async (d) => {
    dialog = true;
    await d.dismiss();
  });

  await page.goto(`/?lang=${encodeURIComponent(payload)}`);

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.content()).not.toContain('onerror');
  // The editor's faces have images of their own; nothing else on the page may.
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  expect(await page.locator('img').evaluateAll((imgs) => imgs.filter((img) => !img.closest('[data-cara]')).length)).toBe(0);
  expect(dialog).toBe(false);
});
