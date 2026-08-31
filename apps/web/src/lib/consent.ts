export const CONSENT_STORAGE_KEY = 'swp_cookie_consent';
export const CONSENT_VERSION = '1';

export type ConsentCategories = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type StoredConsent = ConsentCategories & {
  consentId: string;
  version: string;
  timestamp: string;
};

export function generateConsentId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `consent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeConsent(categories: ConsentCategories, existingId?: string): StoredConsent {
  const stored: StoredConsent = {
    consentId: existingId || generateConsentId(),
    necessary: true,
    analytics: categories.analytics,
    marketing: categories.marketing,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export async function logConsentToServer(
  consent: StoredConsent,
  locale: string
): Promise<void> {
  try {
    const { apiFetch } = await import('./api');
    await apiFetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consentId: consent.consentId,
        necessary: consent.necessary,
        analytics: consent.analytics,
        marketing: consent.marketing,
        locale,
      }),
    });
  } catch {
    // Consent still valid locally; server log is best-effort
  }
}
