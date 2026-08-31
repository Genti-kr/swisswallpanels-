import { test, expect } from '@playwright/test';
import { prepareStorefront } from './helpers';

const STORE_USER = {
  email: 'user@swisswallpanels.ch',
  password: 'TestUser123!',
};

async function loginAsStoreUser(page: import('@playwright/test').Page) {
  await page.goto('/de/login');
  await page.locator('input[type="email"]').fill(STORE_USER.email);
  await page.locator('input[type="password"]').fill(STORE_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 20_000 });
}

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('guest can open checkout with email field', async ({ page }) => {
    await page.goto('/de/produkte');
    await page.waitForSelector('button[title]', { timeout: 15_000 });
    await page.locator('button[title]').first().click();

    await page.goto('/de/checkout');
    await expect(page.getByPlaceholder(/ihre@email/i)).toBeVisible({ timeout: 15_000 });
  });

  test('cart to checkout address step', async ({ page }) => {
    await loginAsStoreUser(page);

    await page.goto('/de/produkte');
    await page.waitForSelector('button[title]', { timeout: 15_000 });
    await page.locator('button[title]').first().click();

    await page.goto('/de/warenkorb');
    await expect(page.locator('body')).toContainText(/CHF/i, { timeout: 15_000 });

    await page.goto('/de/checkout');
    await expect(page.getByPlaceholder(/vorname|first|emri/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
