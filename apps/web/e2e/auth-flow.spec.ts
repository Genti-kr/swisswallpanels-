import { test, expect } from '@playwright/test';
import { prepareStorefront } from './helpers';

const ADMIN_USER = {
  email: 'admin@swisswallpanels.ch',
  password: 'Admin123!',
};

const STORE_USER = {
  email: 'user@swisswallpanels.ch',
  password: 'TestUser123!',
};

test.describe('Auth flows', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('register page shows required fields', async ({ page }) => {
    await page.goto('/de/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('user can log in and reach dashboard', async ({ page }) => {
    await page.goto('/de/login');
    await page.locator('input[type="email"]').fill(STORE_USER.email);
    await page.locator('input[type="password"]').fill(STORE_USER.password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 20_000 });
  });

  test('admin can log in and reach admin orders', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(ADMIN_USER.email);
    await page.locator('input[type="password"]').fill(ADMIN_USER.password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 20_000 });
  });
});
