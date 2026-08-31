type SentryModule = typeof import('@sentry/node');

let sentry: SentryModule | null = null;

export async function initApiMonitoring(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });
  sentry = Sentry;
}

export function captureApiException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  sentry.withScope((scope) => {
    if (context) {
      scope.setContext('request', context);
    }
    sentry!.captureException(error);
  });
}
