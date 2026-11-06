import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Page themes (FR-P10, NFR-6, DESIGN §6), switched through the UI.

const THEMES = ['certificado', 'licencia', 'codigo', 'socks'] as const;
const LABEL = { en: 'Theme', es: 'Tema' };

let problems: string[];
async function open(page: Page, url = '/?lang=en') {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(url);
}

/** What a theme changes: the root attribute, page tokens and the body background. */
const look = (page: Page) =>
  page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      bg: root.getPropertyValue('--ui-bg').trim(),
      accent: root.getPropertyValue('--ui-accent-text').trim(),
      body: `${body.backgroundColor} ${body.backgroundImage}`,
    };
  });

test('FR-P10 every theme switches through the UI and changes the page', async ({ page }) => {
  await open(page);
  const select = page.getByLabel(LABEL.en);
  await expect(select).toBeVisible();
  await expect(select).toHaveValue('certificado');
  const seen = new Set<string>();
  for (const theme of THEMES) {
    await select.selectOption(theme);
    const now = await look(page);
    expect(now.theme, theme).toBe(theme === 'certificado' ? null : theme);
    seen.add(JSON.stringify([now.bg, now.accent, now.body]));
  }
  expect(seen.size, 'four different looks').toBe(4);
  expect(problems).toEqual([]);
});

test('FR-P10 the theme is remembered and applied before the page script runs', async ({ page }) => {
  await open(page);
  await page.getByLabel(LABEL.en).selectOption('socks');
  // Block the page's own script: only tema.js in <head> can apply the theme now.
  await page.route(/\/assets\/main-[\w-]+\.js$/, (route) => route.abort());
  await page.reload();
  expect((await look(page)).theme).toBe('socks');
  await page.unroute(/\/assets\/main-[\w-]+\.js$/);
  await page.goto('/how-it-works.html');
  expect((await look(page)).theme, 'the other page too').toBe('socks');
  await expect(page.getByLabel(LABEL.en)).toHaveValue('socks');
});

test('FR-P10 the cards and their exports are the same in every theme', async ({ page }) => {
  await open(page, '/?lang=en#editor');
  await expect(page.locator('#ed-png-frente')).toBeEnabled();
  const face = () =>
    page.locator('.ed-visor [data-cara="cer-f"]').evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.backgroundImage} ${s.getPropertyValue('--chicle')} ${getComputedStyle(el.querySelector('.nombre')!).color}`;
    });
  const exportPng = async () => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#ed-png-frente').click()]);
    return (await d.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks as Buffer[]));
  };
  const before = await face();
  const png = await exportPng();
  for (const theme of ['licencia', 'codigo', 'socks'] as const) {
    await page.getByLabel(LABEL.en).selectOption(theme);
    expect(await face(), theme).toBe(before);
    expect((await exportPng()).equals(png), `${theme}: the exported PNG is byte-identical`).toBe(true);
  }
  expect(problems).toEqual([]);
});

test.describe('FR-P6 FR-P10 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page shows the default theme and no switcher', async ({ page }) => {
    await page.goto('/');
    expect((await look(page)).theme).toBeNull();
    await expect(page.locator('.tema')).toBeHidden();
  });
});

test.describe('FR-P10 at 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('no horizontal scroll in any theme or language; the switcher works by keyboard', async ({ page }) => {
    for (const lang of ['en', 'es'] as const) {
      await page.goto(`/?lang=${lang}`);
      const select = page.getByLabel(LABEL[lang]);
      await select.focus();
      await expect(select).toBeFocused();
      for (const theme of THEMES) {
        await select.selectOption(theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${lang} ${theme}`).toBeLessThanOrEqual(360);
      }
    }
  });
});

for (const lang of ['en', 'es'] as const) {
  test(`NFR-6 FR-P10 ${lang}: no serious accessibility problems in any theme`, async ({ page }) => {
    await page.goto(`/?lang=${lang}#editor`);
    await expect(page.locator('#ed-png-frente')).toBeEnabled();
    for (const theme of THEMES) {
      await page.getByLabel(LABEL[lang]).selectOption(theme);
      const results = await new AxeBuilder({ page }).exclude('[data-cara]').analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), `${lang} ${theme}`).toEqual([]);
    }
  });
}
