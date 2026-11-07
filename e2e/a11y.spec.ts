import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The accessibility pass (NFR-6, NFR-8, DESIGN §5.6, §10): axe on the profile
// and every editor tab, the keyboard-only path, a focus ring at every stop,
// reduced motion, and the previews as labeled images.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The Tab key; WebKit on macOS skips links unless Option is held. */
const tabKey = (browserName: string, back = false) =>
  `${browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+' : ''}${back ? 'Shift+' : ''}Tab`;

/** Presses `key` (Tab or Shift+Tab) until the focused element matches `selector`, as a keyboard user would. */
async function tabTo(page: Page, key: string, selector: string) {
  for (let i = 0; i < 300; i++) {
    await page.keyboard.press(key);
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
  }
  throw new Error(`Tab never reached ${selector}`);
}

async function open(page: Page, lang: 'en' | 'es') {
  await page.goto(`/?lang=${lang}`);
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await expect(page.locator('#ed-png-frente')).toBeEnabled();
}

for (const lang of ['en', 'es'] as const) {
  for (const width of [1280, 360]) {
    test(`NFR-6 ${lang} at ${width} px: no serious or critical violations on any editor tab`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await open(page, lang);
      for (const tab of await page.getByRole('tab').all()) {
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        // The faces are artwork inside labeled images, checked below.
        const results = await new AxeBuilder({ page }).withTags(WCAG).exclude('[data-cara]').analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), (await tab.textContent()) ?? '').toEqual([]);
      }
    });
  }
}

test('NFR-6 keyboard only: change a text, switch language, export', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  const key = tabKey(browserName);
  await open(page, 'en');
  await page.locator('body').focus();

  await tabTo(page, key, '#ed-cer-f-2');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Keyboard Wolf');
  await expect(page.locator('.ed-visor [data-cara="cer-f"]')).toContainText('Keyboard Wolf');

  // Back up to the language switch: Firefox doesn't wrap Tab around the page.
  await tabTo(page, tabKey(browserName, true), 'a[data-lang="es"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('#ed-png-frente')).toBeEnabled();
  await expect(page.locator('#ed-cer-f-2')).toHaveValue('Keyboard Wolf');

  await page.locator('body').focus();
  await tabTo(page, key, '#ed-png-frente');
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await expect(page.locator('#editor p.status')).toContainText(download.suggestedFilename());
});

test('NFR-6 every Tab stop shows a focus ring', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  const key = tabKey(browserName);
  await open(page, 'en');
  await page.locator('body').focus();
  const stops: string[] = [];
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press(key);
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      // A visually hidden input shows its ring on the element around it (the drop zone).
      const ringed = (e: Element | null) => {
        for (; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if ((cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== 'none') return true;
          if (e.getBoundingClientRect().width > 1) return false;
        }
        return false;
      };
      const name = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}"`;
      return { name, ok: ringed(el) || (el.parentElement?.matches(':focus-within') === true && ringed(el.parentElement)) };
    });
    if (!stop || stops[0] === stop.name) break;
    stops.push(stop.name);
    expect(stop.ok, stop.name).toBe(true);
  }
  expect(stops.length).toBeGreaterThan(100);
});

test.describe('NFR-6 reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing animates and scrolling jumps', async ({ page }) => {
    await open(page, 'en');
    await page.getByRole('tab').nth(1).click();
    await page.locator('#editor').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  });
});

for (const [lang, front, back, ios] of [
  ['en', 'Front preview: Certificate', 'Back preview: Certificate · terms', /On iPhone and iPad, Safari may open the file as a preview/],
  ['es', 'Frente, vista previa: Certificado', 'Reverso, vista previa: Certificado · términos', /En iPhone y iPad, Safari puede abrir el archivo como vista previa/],
] as const) {
  test(`NFR-6 NFR-8 ${lang}: each preview is one labeled image; the iOS note is shown`, async ({ page }) => {
    await open(page, lang);
    await expect(page.getByRole('img', { name: front, exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: back, exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: lang === 'en' ? 'Export' : 'Exportar' })).toContainText(ios);
  });
}
