/** Temporary: allow login/checkout without verified email (e.g. while Postmark is down). */
export function skipEmailVerificationForLogin(): boolean {
  const v = process.env.AUTH_SKIP_EMAIL_VERIFICATION?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function emailVerificationBlocksLogin(role: string): boolean {
  if (skipEmailVerificationForLogin()) return false;
  if (role === 'ADMIN' || role === 'SUPERADMIN') return false;
  return true;
}
