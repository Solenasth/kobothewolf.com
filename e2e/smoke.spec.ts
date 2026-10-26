import { expect, test } from '@playwright/test';

test('built page loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kobo The Wolf');
  expect(errors).toEqual([]);
});
