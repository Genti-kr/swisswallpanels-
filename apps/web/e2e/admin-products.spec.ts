import { test, expect } from '@playwright/test';
import { prepareStorefront } from './helpers';

const ADMIN_USER = {
  email: 'admin@swisswallpanels.ch',
  password: 'Admin123!',
};

test.describe('Admin product management', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(ADMIN_USER.email);
    await page.locator('input[type="password"]').fill(ADMIN_USER.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 20_000 });
  });

  test('products admin page loads with product list', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page.locator('body')).toContainText(/product|produkt|SKU/i, { timeout: 15_000 });
  });
});
