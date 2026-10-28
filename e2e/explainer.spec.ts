import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The "OwO wats dis?!" explainer (FR-P11, FR-P6, NFR-6, DESIGN §6).

const COPY = {
  en: { button: 'OwO wats dis?!', first: /hewwo! this is Kobo's site/, details: "I'm actually interested in the technical details →" },
  es: { button: 'OwO ¿qué es esto?!', first: /¡hola! este es el sitio de Kobo/, details: 'En serio, quiero los detalles técnicos →' },
} as const;
/** The details link carries the page's language (#79). */
const DETAILS_URL = { en: '/how-it-works.html?lang=en', es: '/how-it-works.html?lang=es' } as const;

const summary = (page: Page, lang: keyof typeof COPY) => page.locator('#owo > summary', { hasText: COPY[lang].button });
const panel = (page: Page) => page.locator('#owo .owo-panel');

for (const lang of ['en', 'es'] as const) {
  test(`FR-P11 ${lang}: opens and closes by mouse, Enter, Space and Escape`, async ({ page }) => {
    await page.goto(`/?lang=${lang}`);
    const button = summary(page, lang);
    await expect(button).toBeVisible();
    await expect(panel(page)).toBeHidden();

    await button.click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toContainText(COPY[lang].first);
    await expect(panel(page).getByRole('link', { name: COPY[lang].details })).toHaveAttribute('href', DETAILS_URL[lang]);
    await button.click();
    await expect(panel(page)).toBeHidden();

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('Space');
    await expect(panel(page)).toBeHidden();

    // Escape from inside the panel closes it and puts focus back on the button.
    // (Safari's Tab skips links by default, so focus the link directly.)
    await page.keyboard.press('Enter');
    await panel(page).getByRole('link').focus();
    await expect(panel(page).getByRole('link')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(button).toBeFocused();
  });
}

test.describe('FR-P11 on a touch screen', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 740 } });

  test('a tap opens it, it fits at 360 px in both languages', async ({ page }) => {
    for (const lang of ['en', 'es'] as const) {
      await page.goto(`/?lang=${lang}`);
      await summary(page, lang).tap();
      await expect(panel(page)).toBeVisible();
      const box = (await panel(page).boundingBox())!;
      expect(box.x + box.width, lang).toBeLessThanOrEqual(360);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), lang).toBeLessThanOrEqual(360);
    }
  });
});

test.describe('FR-P6 FR-P11 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the explainer still opens and reads', async ({ page }) => {
    await page.goto('/');
    await summary(page, 'en').click();
    await expect(panel(page)).toContainText(COPY.en.first);
    await expect(panel(page).getByRole('link', { name: COPY.en.details })).toBeVisible();
  });
});

test('NFR-6 FR-P11 no serious accessibility problems with the panel open', async ({ page }) => {
  for (const lang of ['en', 'es'] as const) {
    await page.goto(`/?lang=${lang}`);
    await summary(page, lang).click();
    const results = await new AxeBuilder({ page }).include('#owo').analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), lang).toEqual([]);
  }
});
