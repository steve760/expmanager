/**
 * Central error reporting. Logs in dev; can be wired to Sentry/LogRocket in production.
 * Use reportError() in ErrorBoundary and for caught async errors you want to track.
 */

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    ...context,
  };
  if (import.meta.env.DEV) {
    console.error('[reportError]', payload);
  }
  // Production: uncomment and configure when you add a provider:
  // if (import.meta.env.PROD && typeof window !== 'undefined') {
  //   window.Sentry?.captureException?.(err, { extra: context });
  // }
}
