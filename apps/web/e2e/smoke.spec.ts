import { test, expect } from '@playwright/test';
import { prepareStorefront } from './helpers';

test.describe('Storefront smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });
  test('homepage loads in German', async ({ page }) => {
    await page.goto('/de');
    await expect(page).toHaveTitle(/Swiss Wall Panels/i);
  });

  test('products page loads', async ({ page }) => {
    await page.goto('/de/produkte');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('login page shows email field', async ({ page }) => {
    await page.goto('/de/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('checkout allows guest access without login prompt', async ({ page }) => {
    await page.goto('/de/checkout');
    const guestEmail = page.getByPlaceholder(/ihre@email|you@email|vous@email|ju@email/i);
    const emptyCart = page.getByText(/warenkorb ist leer|cart is empty|panier est vide|shporta juaj/i);
    await expect(guestEmail.or(emptyCart).first()).toBeVisible({ timeout: 15_000 });
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/de/this-page-does-not-exist-xyz');
    await expect(page.getByRole('heading', { name: /nicht gefunden|not found|introuvable|nuk u gjet/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Maintenance mode', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('maintenance page is reachable', async ({ page }) => {
    await page.goto('/de/maintenance');
    await expect(page.getByText(/bald zurück|back soon|bientôt|së shpejti/i)).toBeVisible();
  });
});
