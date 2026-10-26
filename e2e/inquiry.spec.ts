import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type Captured = { mailto: string[]; clipboard: string[] };

// Records what the page would hand to the email app or the clipboard, instead
// of opening a real mail client during the test.
async function capture(page: Page, { clipboardFails = false } = {}) {
  await page.addInitScript((fails) => {
    const captured: Captured = { mailto: [], clipboard: [] };
    (window as unknown as { captured: Captured }).captured = captured;
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.href.startsWith('mailto:')) captured.mailto.push(this.href);
      else click.call(this);
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (fails) throw new Error('denied');
          captured.clipboard.push(text);
        },
      },
    });
  }, clipboardFails);
}

const captured = (page: Page) => page.evaluate(() => (window as unknown as { captured: Captured }).captured);

async function fill(page: Page, { name = 'Ana', email = 'ana@example.com', message = 'Hello\nthere', type = 'quote' } = {}) {
  const form = page.locator('#inquiry');
  await form.locator('#f-name').fill(name);
  await form.locator('#f-email').fill(email);
  await form.locator('#f-type').selectOption(type);
  await form.locator('#f-message').fill(message);
}

test.describe('FR-P8 inquiry form', () => {
  test('opens a composed email in English', async ({ page }) => {
    await capture(page);
    await page.goto('/?lang=en');
    await fill(page);
    await page.getByRole('button', { name: 'Open in my email app' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Opening your email app' })).toBeVisible();
    const { mailto } = await captured(page);
    expect(mailto).toHaveLength(1);
    const url = new URL(mailto[0]!);
    expect(url.pathname).toBe('contact@kobothewolf.com');
    expect(url.searchParams.get('subject')).toBe('Quote request from Ana');
    expect(url.searchParams.get('body')).toBe('Hello\r\nthere\r\n\r\n—\r\nAna · ana@example.com');
  });

  test('composes the email in Spanish', async ({ page }) => {
    await capture(page);
    await page.goto('/?lang=es');
    await fill(page, { type: 'inquiry' });
    await page.getByRole('button', { name: 'Abrir en mi app de correo' }).click();

    const url = new URL((await captured(page)).mailto[0]!);
    expect(url.searchParams.get('subject')).toBe('Consulta de Ana');
  });

  test('blocks sending until required fields are valid, with translated errors', async ({ page }) => {
    await capture(page);
    await page.goto('/?lang=en');
    await page.locator('#f-email').fill('ana@');
    await page.getByRole('button', { name: 'Open in my email app' }).click();

    await expect(page.locator('#f-name')).toBeFocused();
    await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#e-name')).toHaveText('This field is required.');
    await expect(page.locator('#e-email')).toHaveText('Enter an email address like name@example.com.');
    await expect(page.getByRole('status')).toHaveText('Please check the highlighted fields.');
    expect((await captured(page)).mailto).toEqual([]);

    await page.getByRole('link', { name: 'ES', exact: true }).click();
    await expect(page.locator('#e-name')).toHaveText('Este campo es obligatorio.');
    await expect(page.getByText('Tu nombre')).toBeVisible();
  });

  test('copies the message for visitors without an email app', async ({ page }) => {
    await capture(page);
    await page.goto('/?lang=en');
    await fill(page);
    await page.getByRole('button', { name: 'Copy message' }).click();

    await expect(page.getByRole('status')).toHaveText('Copied. Paste it into an email to contact@kobothewolf.com.');
    expect((await captured(page)).clipboard).toEqual([
      'To: contact@kobothewolf.com\nSubject: Quote request from Ana\n\nHello\nthere\n\n—\nAna · ana@example.com',
    ]);
  });

  test('says so when copying fails', async ({ page }) => {
    await capture(page, { clipboardFails: true });
    await page.goto('/?lang=en');
    await fill(page);
    await page.getByRole('button', { name: 'Copy message' }).click();
    await expect(page.getByRole('status')).toHaveText(/Couldn't copy/);
  });

  test('NFR-3 using the form makes no network requests', async ({ page }) => {
    await capture(page);
    await page.goto('/?lang=en');
    await page.evaluate(() => document.fonts.ready);
    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));

    await fill(page);
    await page.getByRole('button', { name: 'Open in my email app' }).click();
    await page.getByRole('button', { name: 'Copy message' }).click();
    await expect(page.getByRole('status')).toHaveText(/Copied/);

    expect(requests).toEqual([]);
  });

  for (const lang of ['en', 'es'] as const) {
    test(`NFR-6 ${lang}: accessible with errors showing`, async ({ page }) => {
      await page.goto(`/?lang=${lang}`);
      await page.locator('#inquiry button[type="submit"]').click();
      const results = await new AxeBuilder({ page }).include('#inquiry').analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => v.id)).toEqual([]);
    });
  }
});

test.describe('FR-P8 without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the form is hidden and the email link remains', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#inquiry')).toBeHidden();
    await expect(page.getByRole('link', { name: /contact@kobothewolf\.com/ })).toBeVisible();
  });
});
