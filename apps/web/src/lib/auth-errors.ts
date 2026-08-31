export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ose fjalëkalim i pasaktë',
  rate_limited: 'Shumë përpjekje. Provo përsëri pas 15 minutash.',
  account_locked:
    'Llogaria juaj është e bllokuar. Ju lutemi kontrolloni email-in tuaj për udhëzime zhbllokimi.',
  email_not_verified: 'Ju lutemi verifikoni email-in tuaj para se të hyni.',
};

export function resolveAuthErrorMessage(error?: string | null, code?: string | null): string {
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  if (error === 'CredentialsSignin') {
    return AUTH_ERROR_MESSAGES.invalid_credentials;
  }
  if (error === 'Configuration') {
    return AUTH_ERROR_MESSAGES.rate_limited;
  }
  return AUTH_ERROR_MESSAGES.invalid_credentials;
}
