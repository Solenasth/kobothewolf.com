import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The version label and release notes (FR-P9, FR-P6, NFR-6, DESIGN §6).

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const REPO = 'https://github.com/Solenasth/kobothewolf.com';
const LABEL = { en: 'Version', es: 'Versión' };
const HEADING = { en: "What's new in this version", es: 'Novedades de esta versión' };

for (const lang of ['en', 'es'] as const) {
  test(`FR-P9 ${lang}: the label shows the version and commit; the notes open and close`, async ({ page }) => {
    await page.goto(`/?lang=${lang}`);
    const summary = page.locator('#version > summary');
    const panel = page.locator('#version .version-panel');
    await expect(summary).toHaveText(new RegExp(`^${LABEL[lang]} v${version.replace(/\./g, '\\.')} · [0-9a-f]{7}$`));
    await expect(panel).toBeHidden();

    await summary.click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('.label')).toHaveText(HEADING[lang]);
    // The notes are the changelog's English, marked as such.
    await expect(panel.locator('[lang="en"] .version-title')).toHaveText(new RegExp(`^v${version.replace(/\./g, '\\.')} · \\d{4}-\\d{2}-\\d{2}`));
    expect(await panel.locator('[lang="en"] li').count()).toBeGreaterThan(0);
    await expect(panel.locator('a[href$="/releases/tag/v' + version + '"]')).toHaveAttribute('href', `${REPO}/releases/tag/v${version}`);
    await expect(panel.locator(`a[href^="${REPO}/commit/"]`)).toHaveCount(1);
    for (const href of await panel.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) expect(href, 'only links to the repo').toMatch(new RegExp(`^${REPO}/`));
    await summary.click();
    await expect(panel).toBeHidden();

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Space');
    await expect(panel).toBeHidden();
    await page.keyboard.press('Enter');
    await panel.locator('a').first().focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(summary).toBeFocused();
  });
}

test.describe('FR-P6 FR-P9 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the label and notes are in the page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#version > summary').click();
    await expect(page.locator('#version .version-panel li').first()).toBeVisible();
  });
});

test.describe('FR-P9 on a touch screen at 360 px', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 740 } });

  test('a tap opens it and nothing scrolls sideways, in both languages', async ({ page }) => {
    for (const lang of ['en', 'es'] as const) {
      await page.goto(`/?lang=${lang}`);
      await page.locator('#version > summary').tap();
      await expect(page.locator('#version .version-panel')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), lang).toBeLessThanOrEqual(360);
    }
  });
});

test('NFR-6 FR-P9 no serious accessibility problems with the notes open', async ({ page }) => {
  for (const lang of ['en', 'es'] as const) {
    await page.goto(`/?lang=${lang}`);
    await page.locator('#version > summary').click();
    const results = await new AxeBuilder({ page }).include('#version').analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), lang).toEqual([]);
  }
});
