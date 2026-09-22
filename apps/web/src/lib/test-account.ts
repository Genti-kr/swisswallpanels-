/** Block demo/seed logins on production only when explicitly enabled. */
export function isTestLoginBlocked(email: string): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  if (process.env.ALLOW_TEST_ACCOUNTS === 'true') {
    return false;
  }
  // Default: test accounts allowed on prod. Set BLOCK_TEST_ACCOUNTS=true to disable them.
  if (process.env.BLOCK_TEST_ACCOUNTS !== 'true') {
    return false;
  }

  const raw =
    process.env.BLOCKED_TEST_EMAILS?.trim() ||
    process.env.TEST_USER_EMAIL?.trim() ||
    'test@gmail.com';

  const blocked = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return blocked.includes(email.trim().toLowerCase());
}
