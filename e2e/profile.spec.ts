import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const LANGS = ['en', 'es'] as const;

test.describe('FR-P1 profile', () => {
  test('shows the name, experience and both contacts', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kobo The Wolf');
    await expect(page.getByText('13+ years of experience.')).toBeVisible();
    await expect(page.getByRole('link', { name: /@KoboTheWolf/ })).toHaveAttribute('href', 'https://t.me/KoboTheWolf');
    await expect(page.getByRole('link', { name: /contact@kobothewolf\.com/ })).toHaveAttribute(
      'href',
      'mailto:contact@kobothewolf.com',
    );
  });

  test('NFR-5 publishes no other email address', async ({ page }) => {
    await page.goto('/');
    const emails = (await page.content()).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
    expect(new Set(emails)).toEqual(new Set(['contact@kobothewolf.com']));
  });
});

test.describe('FR-P6 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the profile and contacts are readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kobo The Wolf');
    await expect(page.getByText('13+ years of experience.')).toBeVisible();
    await expect(page.getByRole('link', { name: /contact@kobothewolf\.com/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Make your card ↓' })).toBeVisible();
  });
});

test('FR-I2 the switch changes language in place and is remembered', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));

  await page.getByRole('link', { name: 'ES', exact: true }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText('Más de 13 años de experiencia.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ES', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('navigation', { name: 'Idioma' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  expect(new URL(page.url()).searchParams.has('lang')).toBe(false);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText('El editor de tarjetas KOBO.EXE viene en camino', { exact: false })).toBeVisible();
});

test('FR-P2 "Make your card" jumps to the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Make your card ↓' }).click();
  await expect(page).toHaveURL(/#editor$/);
  await expect(page.locator('#editor')).toBeInViewport();
});

test('FR-P4 the 404 page links home in both languages', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.getByRole('link', { name: 'Back to kobothewolf.com' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Volver a kobothewolf.com' })).toHaveAttribute('href', '/?lang=es');
});

test('FR-P5 metadata and favicon', async ({ page, request }) => {
  await page.goto('/?lang=en');
  await expect(page).toHaveTitle('Kobo The Wolf');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /freelance work/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Kobo The Wolf');
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /freelance work/);
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect((await request.get(icon!)).status()).toBe(200);
});

async function trackViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== 'http://localhost:4173') offOrigin.push(req.url());
  });
  return offOrigin;
}

for (const lang of LANGS) {
  test(`T-SEC-4 ${lang}: CSP is set, nothing violates it, nothing leaves the origin`, async ({ page }) => {
    const offOrigin = await trackViolations(page);
    await page.goto(`/?lang=${lang}`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('link', { name: lang === 'en' ? 'ES' : 'EN', exact: true }).click();

    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /default-src 'self'.*script-src 'self'.*form-action 'none'/,
    );
    expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
    expect(offOrigin).toEqual([]);
  });

  test(`NFR-7 ${lang}: no horizontal scroll at 360 px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`/?lang=${lang}`);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  for (const width of [1280, 360]) {
    test(`NFR-6 ${lang} at ${width} px: no serious or critical accessibility violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/?lang=${lang}`);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}
