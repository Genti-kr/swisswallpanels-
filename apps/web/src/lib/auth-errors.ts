import type { AppLocale } from '@/i18n/routing';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'account_locked'
  | 'email_not_verified'
  | 'no_admin_access'
  | 'test_account_disabled'
  | 'session_expired'
  | 'server_error';

const AUTH_ERROR_CODES: AuthErrorCode[] = [
  'invalid_credentials',
  'rate_limited',
  'account_locked',
  'email_not_verified',
  'no_admin_access',
  'test_account_disabled',
  'session_expired',
  'server_error',
];

function isAuthErrorCode(value: string): value is AuthErrorCode {
  return AUTH_ERROR_CODES.includes(value as AuthErrorCode);
}

/** @deprecated Use getAuthErrorCode + next-intl Auth.error* keys in UI */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Email ose fjalëkalim i pasaktë',
  rate_limited: 'Shumë përpjekje. Provo përsëri pas 15 minutash.',
  account_locked:
    'Llogaria juaj është e bllokuar. Ju lutemi kontrolloni email-in tuaj për udhëzime zhbllokimi.',
  email_not_verified: 'Ju lutemi verifikoni email-in tuaj para se të hyni.',
  no_admin_access: 'Nuk keni akses admin.',
  test_account_disabled:
    'Llogaria test nuk lejohet në faqen live. Përdorni llogarinë tuaj reale ose mjedisin lokal.',
  session_expired: 'Sesioni juaj skadoi. Ju lutemi hyni përsëri.',
  server_error: 'Shërbimi i login-it nuk është i disponueshëm. Provo përsëri pas pak.',
};

export function getAuthErrorCode(
  error?: string | null,
  code?: string | null
): AuthErrorCode {
  if (code && isAuthErrorCode(code)) {
    return code;
  }
  if (error && isAuthErrorCode(error)) {
    return error;
  }
  if (error === 'Configuration') {
    return 'server_error';
  }
  return 'invalid_credentials';
}

/** Fallback when next-intl is unavailable (e.g. admin routes). */
export function resolveAuthErrorMessage(
  error?: string | null,
  code?: string | null,
  locale: AppLocale = 'sq'
): string {
  const errorCode = getAuthErrorCode(error, code);
  const byLocale: Record<AppLocale, Record<AuthErrorCode, string>> = {
    de: {
      invalid_credentials: 'E-Mail oder Passwort ist falsch',
      rate_limited: 'Zu viele Versuche. Bitte versuchen Sie es in 15 Minuten erneut.',
      account_locked:
        'Ihr Konto ist gesperrt. Bitte prüfen Sie Ihre E-Mail für Anweisungen zur Entsperrung.',
      email_not_verified: 'Bitte verifizieren Sie Ihre E-Mail, bevor Sie sich anmelden.',
      no_admin_access: 'Kein Admin-Zugriff.',
      test_account_disabled:
        'Testkonten können auf der Live-Website nicht angemeldet werden.',
      session_expired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
      server_error: 'Login-Dienst vorübergehend nicht verfügbar. Bitte später erneut versuchen.',
    },
    en: {
      invalid_credentials: 'Incorrect email or password',
      rate_limited: 'Too many attempts. Please try again in 15 minutes.',
      account_locked:
        'Your account is locked. Please check your email for unlock instructions.',
      email_not_verified: 'Please verify your email before signing in.',
      no_admin_access: 'You do not have admin access.',
      test_account_disabled:
        'Test accounts cannot sign in on the live site. Use your real account or local development.',
      session_expired: 'Your session has expired. Please sign in again.',
      server_error: 'Login service is temporarily unavailable. Please try again shortly.',
    },
    fr: {
      invalid_credentials: 'E-mail ou mot de passe incorrect',
      rate_limited: 'Trop de tentatives. Réessayez dans 15 minutes.',
      account_locked:
        'Votre compte est verrouillé. Consultez votre e-mail pour les instructions de déverrouillage.',
      email_not_verified: 'Veuillez vérifier votre e-mail avant de vous connecter.',
      no_admin_access: "Vous n'avez pas accès à l'administration.",
      test_account_disabled:
        'Les comptes test ne sont pas autorisés sur le site en production.',
      session_expired: 'Votre session a expiré. Veuillez vous reconnecter.',
      server_error: 'Service de connexion temporairement indisponible. Réessayez dans un instant.',
    },
    sq: AUTH_ERROR_MESSAGES,
  };

  return byLocale[locale][errorCode];
}

export function authErrorTranslationKey(code: AuthErrorCode): string {
  const keys: Record<AuthErrorCode, string> = {
    invalid_credentials: 'errorInvalidCredentials',
    rate_limited: 'errorRateLimited',
    account_locked: 'errorAccountLocked',
    email_not_verified: 'errorEmailNotVerified',
    no_admin_access: 'errorNoAdminAccess',
    test_account_disabled: 'errorTestAccountDisabled',
    session_expired: 'errorSessionExpired',
    server_error: 'errorServerError',
  };
  return keys[code];
}
