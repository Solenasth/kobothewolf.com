import { expect, test, type Page } from '@playwright/test';

// The editor shell (FR-E1, FR-E2, FR-E10, FR-E21, NFR-2, NFR-7, DESIGN §5.6).

let problems: string[];

async function open(page: Page, url = '/?lang=en#editor') {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(url);
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
}

const shown = (page: Page) => page.locator('.ed-visor').evaluateAll((els) => els.map((el) => el.getAttribute('data-face')));
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const select = (page: Page, name: string) => page.getByRole('combobox', { name, exact: true });

test('NFR-2 the editor code loads after the page and its largest paint', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { lcp: number[] };
    w.lcp = [];
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((e) => w.lcp.push(e.startTime))).observe({
        type: 'largest-contentful-paint',
        buffered: true,
      });
    } catch {
      // No LCP API in this browser: the load-event check below still applies.
    }
  });
  await open(page, '/?lang=en');
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const editor = performance.getEntriesByType('resource').filter((r) => /\/assets\/editor-[\w-]+\.js$/.test(r.name));
    return { load: nav.loadEventStart, editor: editor.map((r) => r.startTime), lcp: (window as unknown as { lcp: number[] }).lcp };
  });
  expect(timing.editor).toHaveLength(1);
  expect(timing.editor[0]!).toBeGreaterThanOrEqual(timing.load);
  // The profile's first largest paint comes before the editor is fetched. (A later
  // entry can follow a web-font swap; it isn't caused by the editor.) Firefox gives
  // both times in whole milliseconds, so the two can tie (#18).
  if (timing.lcp.length) expect(timing.editor[0]!).toBeGreaterThanOrEqual(timing.lcp[0]!);
  expect(problems).toEqual([]);
});

test('FR-E2 both default faces show at scale, side by side on a wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  expect(await shown(page)).toEqual(['cer-f', 'cer-r']);
  const [front, back] = await page.locator('.ed-visor').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  expect(back.top).toBeGreaterThan(front.top); // P8 stacks the two faces in the stage, beside the panel
  const panel = (await page.locator('.ed-panel').boundingBox())!;
  expect(front.left).toBeGreaterThan(panel.x + panel.width);
  // The face is 960 × 560 scaled to the viewer's width.
  const face = (await page.locator('.ed-visor [data-cara="cer-f"]').boundingBox())!;
  expect(face.width).toBeCloseTo(front.width, 0);
  expect(face.height).toBeCloseTo((front.width * 560) / 960, 0);
  expect(problems).toEqual([]);
});

test('FR-E1 front and back mix across variants, and the choice survives a reload', async ({ page }) => {
  await open(page);
  await select(page, 'Front').selectOption('lic-f');
  await select(page, 'Back').selectOption('cod-r');
  expect(await shown(page)).toEqual(['lic-f', 'cod-r']);
  // Mixed faces: no variant tab is selected.
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(0);
  // Saving is debounced; wait for it rather than relying on the unload flush.
  await page.waitForFunction(() => /"frente":"lic-f".*"reverso":"cod-r"/s.test(localStorage.getItem('kobo-editor-v1') ?? ''));
  // Let the export warm-up finish first: leaving mid-render makes WebKit log aborted fetches.
  await expect(page.locator('#ed-png-frente')).toBeEnabled();
  await page.reload();
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  expect(await shown(page)).toEqual(['lic-f', 'cod-r']);
  await expect(select(page, 'Front')).toHaveValue('lic-f');
  expect(problems).toEqual([]);
});

test('FR-E1 variant tabs set both faces, with the ARIA tabs keyboard pattern', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('tablist', { name: 'Variant' })).toBeVisible();
  await tab(page, 'Programming socks').click();
  expect(await shown(page)).toEqual(['soc-f', 'soc-r']);
  await expect(tab(page, 'Programming socks')).toHaveAttribute('aria-selected', 'true');
  // One tab stop: only the selected tab is focusable.
  expect(await page.locator('[role="tab"]').evaluateAll((els) => els.map((el) => (el as HTMLElement).tabIndex))).toEqual([-1, -1, -1, 0]);
  await page.keyboard.press('ArrowRight'); // wraps to the first tab
  expect(await shown(page)).toEqual(['cer-f', 'cer-r']);
  await expect(tab(page, 'Certificate')).toBeFocused();
  await page.keyboard.press('End');
  await expect(tab(page, 'Programming socks')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  expect(await shown(page)).toEqual(['cod-f', 'cod-r']);
  await expect(tab(page, 'Code cat')).toHaveAttribute('aria-selected', 'true');
  expect(problems).toEqual([]);
});

test('FR-E1 a face keeps its element and drawing when shown again', async ({ page }) => {
  await open(page);
  await tab(page, 'Code cat').click();
  await expect(page.locator('[data-cara="cod-f"]')).toHaveAttribute('data-codigo', /fn\s+main/);
  await page.locator('[data-cara="cod-f"]').evaluate((el) => el.setAttribute('data-marca', 'same'));
  await tab(page, 'License').click();
  await tab(page, 'Code cat').click();
  await expect(page.locator('[data-cara="cod-f"]')).toHaveAttribute('data-marca', 'same');
  expect(problems).toEqual([]);
});

test('FR-E10 the cut and safe-zone guides toggle and sit outside the face', async ({ page }) => {
  await open(page);
  const guides = page.locator('.ed-guias');
  await expect(guides).toHaveCount(2);
  await expect(guides.first()).toBeVisible();
  const outlines = await guides.first().evaluate((el) => [getComputedStyle(el, '::before').outlineStyle, getComputedStyle(el, '::after').outlineStyle]);
  expect(outlines).toEqual(['dashed', 'dotted']);
  expect(await page.locator('[data-cara] .ed-guias').count(), 'never inside a face, so never exported').toBe(0);
  await page.getByLabel('Show the cut guides (never exported)').uncheck();
  await expect(guides.first()).toBeHidden();
  await expect(guides.last()).toBeHidden();
  await page.getByLabel('Show the cut guides (never exported)').check();
  await expect(guides.first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('FR-E21 the editor has one polite status region', async ({ page }) => {
  await open(page);
  const status = page.locator('#editor [role="status"]');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveAttribute('aria-live', 'polite');
});

test('FR-E21 a saved card that cannot be read is announced, and the editor starts fresh', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kobo-editor-v1', '{"app":"other"}'));
  await open(page);
  await expect(page.locator('#editor [role="status"]')).toHaveText("Your saved card couldn't be read, so the editor started fresh.");
  expect(await shown(page)).toEqual(['cer-f', 'cer-r']);
});

for (const lang of ['en', 'es'] as const) {
  test(`NFR-7 no horizontal scroll at 360 px with the editor (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page, `/?lang=${lang}#editor`);
    for (const name of lang === 'en' ? ['License', 'Programming socks'] : ['Licencia', 'Programming socks']) {
      await tab(page, name).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    }
    const stage = (await page.locator('.ed-stage').boundingBox())!;
    const panel = (await page.locator('.ed-panel').boundingBox())!;
    expect(stage.y, 'stacked under the panel').toBeGreaterThanOrEqual(panel.y + panel.height);
    expect(problems).toEqual([]);
  });
}

test('FR-I2 switching language relabels the editor and keeps its state', async ({ page }) => {
  await open(page);
  await select(page, 'Front').selectOption('soc-f');
  await page.locator('a[data-lang="es"]').first().click();
  await expect(page.getByRole('tablist', { name: 'Variante' })).toBeVisible();
  await expect(select(page, 'Frente')).toHaveValue('soc-f');
  await expect(page.locator('#ed-frente option[value="cer-f"]')).toHaveText('Certificado');
  expect(await shown(page)).toEqual(['soc-f', 'cer-r']);
  expect(problems).toEqual([]);
});

test('DESIGN §5.6 the test hook exists only with ?test', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => 'kobo' in window || '__kobo' in window)).toBe(false);
  await open(page, '/?lang=en&test#editor');
  expect(await page.evaluate(() => typeof (window as unknown as { __kobo?: { ready: unknown } }).__kobo?.ready)).toBe('function');
});
