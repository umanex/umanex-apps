/**
 * Lichtgewicht error-reporting shim.
 *
 * De echte Sentry-koppeling volgt in een latere fase (zie HANDOFF 2026-07-15,
 * security-audit P2-3). Deze functie is het aanhechtpunt: voorheen stil
 * ingeslikte read-/save-fouten landen nu hier i.p.v. spoorloos te verdwijnen.
 * In de Sentry-fase verandert enkel de body (→ `Sentry.captureException`),
 * niet de call-sites.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  // TODO(sentry): doorschrijven naar Sentry.captureException(error, { extra: context }).
  if (__DEV__) {
    console.warn('[reportError]', error, context ?? '');
  }
}
