import type { Page } from '@playwright/test';

const CONSENT_FIXTURE = {
  consentId: 'e2e-test-consent',
  necessary: true,
  analytics: false,
  marketing: false,
  version: '1',
  timestamp: '2026-01-01T00:00:00.000Z',
};

/** Prevents the cookie banner from blocking UI interactions in E2E tests. */
export async function prepareStorefront(page: Page) {
  await page.addInitScript((consent) => {
    localStorage.setItem('swp_cookie_consent', JSON.stringify(consent));
  }, CONSENT_FIXTURE);
}
