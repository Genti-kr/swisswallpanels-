/** Emails that must not log in on production (demo / seed accounts). */
export function isTestLoginBlocked(email: string): boolean {
  if (process.env.ALLOW_TEST_ACCOUNTS === 'true') {
    return false;
  }
  if (process.env.NODE_ENV !== 'production') {
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
