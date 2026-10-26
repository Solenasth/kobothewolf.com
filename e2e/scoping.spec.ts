import { expect, test, type Page } from '@playwright/test';
import { fixturePort } from '../playwright.config';

// FR-E2, FR-E18, NFR-1, decision 0006: two variants with the same selectors and
// different values, plus page elements with the same class names, on a fixture
// page built through the real kobo:scope-css plugin.
test.use({ baseURL: `http://localhost:${fixturePort}` });

const style = (page: Page, selector: string, property: string) =>
  page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

test.beforeEach(async ({ page }) => {
  await page.goto('/scoping/');
  await expect(page.locator('#caras')).toHaveAttribute('data-ready', 'true');
});

test('FR-E18 parseFaces mounts every face of both variants', async ({ page }) => {
  expect(await page.locator('#caras > [data-cara]').evaluateAll((els) => els.map((el) => el.getAttribute('data-cara')))).toEqual([
    'uno-f',
    'uno-r',
    'dos-f',
    'dos-r',
  ]);
});

test('NFR-1 faces with conflicting selectors render independently', async ({ page }) => {
  for (const id of ['uno-f', 'uno-r']) {
    expect(await style(page, `[data-cara="${id}"] .titulo`, 'color')).toBe('rgb(200, 0, 0)');
    expect(await style(page, `[data-cara="${id}"] .titulo`, 'font-size')).toBe('31px');
    expect(await style(page, `[data-cara="${id}"] .titulo`, 'letter-spacing')).toBe('normal');
  }
  for (const id of ['dos-f', 'dos-r']) {
    expect(await style(page, `[data-cara="${id}"] .titulo`, 'color')).toBe('rgb(0, 0, 200)');
    expect(await style(page, `[data-cara="${id}"] .titulo`, 'font-size')).toBe('17px');
    expect(await style(page, `[data-cara="${id}"] .titulo`, 'letter-spacing')).toBe('3px');
  }
  expect(await style(page, '[data-cara="dos-f"] .solo-dos', 'text-decoration-line')).toBe('underline');
  expect(await style(page, '[data-cara="uno-f"] .solo-dos', 'text-decoration-line')).toBe('none');
});

test('NFR-1 the style sheet reaches every face', async ({ page }) => {
  for (const id of ['uno-f', 'uno-r', 'dos-f', 'dos-r']) {
    expect(await style(page, `[data-cara="${id}"] .card`, 'border-top-color')).toBe('rgb(1, 2, 3)');
    expect(await style(page, `[data-cara="${id}"] .card`, 'border-top-width')).toBe('3px');
  }
});

test('NFR-1 face CSS does not leak into the page', async ({ page }) => {
  expect(await style(page, '#page-titulo', 'color')).toBe('rgb(0, 0, 0)');
  expect(await style(page, '#page-titulo', 'letter-spacing')).toBe('normal');
  expect(await style(page, '#page-card', 'border-top-style')).toBe('none');
  for (const variable of ['--tinta', '--acento']) {
    expect(await style(page, 'html', variable)).toBe('');
    expect(await style(page, 'body', variable)).toBe('');
  }
});

test('FR-E18 parseFaces rejects duplicate and nested faces, and runs nothing', async ({ page }) => {
  const run = (html: string) =>
    page.evaluate((h) => {
      try {
        const faces = (window as unknown as { parseFaces: (html: string) => Map<string, HTMLElement> }).parseFaces(h);
        return [...faces.keys()].join(',');
      } catch (e) {
        return (e as Error).message;
      }
    }, html);
  expect(await run('<div data-cara="a-f"></div><div data-cara="a-f"></div>')).toBe('caras.html: duplicate face "a-f"');
  expect(await run('<div data-cara="a-f"><div data-cara="a-r"></div></div>')).toBe('caras.html: face "a-r" is nested in another face');
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  expect(await run('<div data-cara="a-f"><img src="/nope.png" onerror="document.title=\'ran\'"><script>document.title=\'ran\'</script></div>')).toBe('a-f');
  await page.waitForTimeout(200);
  expect(await page.title()).toBe('Fixture: face CSS scoping');
  expect(requests).toEqual([]);
});
