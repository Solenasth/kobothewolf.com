import { existsSync, statSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The "How it works" page (FR-P12, FR-P6, NFR-6, T-SEC-4, DESIGN §6).

const SECTIONS = ['overview', 'architecture', 'data', 'exports', 'security', 'quality', 'releases'];
const TITLES = {
  en: { h1: 'How it works', overview: 'Overview', releases: 'Releases', back: '← Back to kobothewolf.com' },
  es: { h1: 'Cómo funciona', overview: 'Resumen', releases: 'Versiones', back: '← Volver a kobothewolf.com' },
} as const;
const REPO = 'https://github.com/Solenasth/kobothewolf.com/';

async function open(page: Page, url = '/how-it-works.html') {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== 'http://localhost:4173') offOrigin.push(req.url());
  });
  await page.goto(url);
  return { problems, offOrigin };
}

for (const lang of ['en', 'es'] as const) {
  test(`FR-P12 ${lang}: every section, its contents link, and nothing off-origin`, async ({ page }) => {
    const { problems, offOrigin } = await open(page, `/how-it-works.html?lang=${lang}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLES[lang].h1);
    await expect(page.locator('main section')).toHaveCount(SECTIONS.length);
    for (const id of SECTIONS) {
      const title = page.locator(`#${id}-title`);
      await expect(title, id).not.toBeEmpty();
      await expect(page.locator(`.toc a[href="#${id}"]`)).toHaveText((await title.textContent())!);
      await expect(page.locator(`#${id} > p[data-i18n]`).first()).not.toBeEmpty();
    }
    await expect(page.locator('#overview-title')).toHaveText(TITLES[lang].overview);
    await expect(page.locator('#releases-title')).toHaveText(TITLES[lang].releases);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'self'/);
    expect(offOrigin).toEqual([]);
    expect(problems).toEqual([]);
  });
}

test('FR-P12 every link points at this site or at a file that exists in the repo', async ({ page }) => {
  await open(page);
  const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  const repoLinks = hrefs.filter((h) => h.startsWith(REPO));
  expect(repoLinks.length).toBeGreaterThan(15);
  for (const href of repoLinks) {
    const [, kind, path] = /^https:\/\/github\.com\/Solenasth\/kobothewolf\.com\/(blob|tree)\/main\/(.+)$/.exec(href) ?? [];
    expect(path, href).toBeTruthy();
    expect(existsSync(path!), href).toBe(true);
    expect(kind, href).toBe(statSync(path!).isDirectory() ? 'tree' : 'blob');
  }
  for (const href of hrefs.filter((h) => !h.startsWith(REPO))) expect(href, 'only same-site links besides the repo').toMatch(/^(\/|#|\?lang=)/);
  await page.getByRole('link', { name: TITLES.en.back }).click();
  await expect(page).toHaveURL(/\/\?lang=en$/);
});

test('FR-I2 the language switch works in place on this page too', async ({ page }) => {
  await open(page);
  await page.locator('a[data-lang="es"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLES.es.h1);
  await expect(page).toHaveTitle('Cómo funciona · Kobo The Wolf');
  await expect(page.locator('a[data-lang="es"]')).toHaveAttribute('aria-current', 'true');
});

test('FR-P11 FR-P12 the OwO details link opens this page', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('#owo > summary').click();
  await page.getByRole('link', { name: "I'm actually interested in the technical details →" }).click();
  await expect(page).toHaveURL(/\/how-it-works\.html\?lang=en$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it works');
});

test.describe('FR-P6 FR-P12 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page reads, in English', async ({ page }) => {
    await page.goto('/how-it-works.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it works');
    await expect(page.locator('#security > p').first()).toContainText('Content Security Policy');
  });
});

test.describe('FR-P12 at 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('no horizontal scroll in either language', async ({ page }) => {
    for (const lang of ['en', 'es'] as const) {
      await page.goto(`/how-it-works.html?lang=${lang}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLES[lang].h1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), lang).toBeLessThanOrEqual(360);
    }
  });
});

test('NFR-6 FR-P12 no serious accessibility problems in either language', async ({ page }) => {
  for (const lang of ['en', 'es'] as const) {
    await page.goto(`/how-it-works.html?lang=${lang}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLES[lang].h1);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), lang).toEqual([]);
  }
});

test.describe('#79 the language carries between pages, whatever the browser prefers', () => {
  // A Spanish browser: without the fix, an English visitor fell back to Spanish on the next page.
  test.use({ locale: 'es-ES' });

  test('English from ?lang=en: the details link and the back link stay in English', async ({ page }) => {
    await page.goto('/?lang=en');
    await page.locator('#owo > summary').click();
    await page.getByRole('link', { name: "I'm actually interested in the technical details →" }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it works');
    await page.getByRole('link', { name: TITLES.en.back }).click();
    await expect(page.locator('#owo > summary')).toHaveText('OwO wats dis?!');
  });

  test('a switch in place carries over too, both ways', async ({ page }) => {
    await page.goto('/?lang=en');
    await page.locator('a[data-lang="es"]').click();
    await page.locator('#owo > summary').click();
    await page.getByRole('link', { name: 'En serio, quiero los detalles técnicos →' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLES.es.h1);
    await page.locator('a[data-lang="en"]').click();
    await page.getByRole('link', { name: TITLES.en.back }).click();
    await expect(page.locator('#owo > summary')).toHaveText('OwO wats dis?!');
  });
});

test.describe('#79 without JavaScript the links stay plain', () => {
  test.use({ javaScriptEnabled: false });

  test('no ?lang= is added', async ({ page }) => {
    await page.goto('/how-it-works.html');
    await expect(page.getByRole('link', { name: TITLES.en.back })).toHaveAttribute('href', '/');
  });
});
