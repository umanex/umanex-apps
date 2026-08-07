'use client';

import { useEffect, useState } from 'react';
import { cleanupStaleData } from '../../hooks/useCashflow';
import { errorMessage } from '../../lib/cashflow/error-message';
import { hydrateFromRemote, resetSync, startSync } from '../../lib/cashflow/sync';
import { isAuthError, withAuthRetry } from '../../lib/supabase/auth-recovery';
import { supabase } from '../../lib/supabase/client';

type Phase = 'loading' | 'ready' | 'error';

/**
 * Laadt de stand uit Supabase en houdt de app tegen tot dat gelukt is.
 *
 * Zonder lokale kopie is er niets om terug te vallen op een mislukte fetch — dus een
 * fout is hier een eigen scherm met een herkansing, niet een banner boven een lege
 * prognose die er wél uitziet alsof ze klopt.
 */
export function DataGate({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  /** Ook een verse sessie kwam er niet door — inloggen is dan de enige weg vooruit. */
  const [sessionExhausted, setSessionExhausted] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | null = null;

    setPhase('loading');
    setMessage(null);
    setSessionExhausted(false);

    // Zonder de herkansing is "Opnieuw proberen" een doodlopende knop bij een auth-fout:
    // dezelfde sessie levert gegarandeerd dezelfde fout, dus zat je vast tot supabase-js uit
    // zichzelf ververste. Dat duurde in de praktijk een half uur (PGRST303 op 07-08).
    withAuthRetry(() => hydrateFromRemote(userId))
      .then(() => {
        if (cancelled) return;
        // Pas luisteren nadat de stand staat: anders zou het laden zelf als wijziging
        // gelden en meteen teruggeschreven worden.
        stopSync = startSync();
        cleanupStaleData();
        setPhase('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('[cashflow] laden mislukt', error);
        setMessage(errorMessage(error));
        setSessionExhausted(isAuthError(error));
        setPhase('error');
      });

    return () => {
      cancelled = true;
      stopSync?.();
      resetSync();
    };
  }, [userId, attempt]);

  if (phase === 'error') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-3 text-center">
          <h1 className="text-lg font-semibold">Gegevens niet geladen</h1>
          <p className="text-sm text-muted-foreground">
            De verbinding met de server lukte niet. Er wordt niets getoond zolang niet
            zeker is dat het volledig is.
          </p>
          {message && <p className="text-xs text-destructive break-words">{message}</p>}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
            >
              Opnieuw proberen
            </button>
            {sessionExhausted && (
              <>
                <p className="text-xs text-muted-foreground">
                  Ook met een verse sessie lukte het niet. Opnieuw inloggen is de weg vooruit.
                </p>
                <button
                  onClick={() => void supabase.auth.signOut()}
                  className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Opnieuw inloggen
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-background px-4 py-8 space-y-8" aria-busy="true">
        <div className="h-8 w-56 rounded bg-muted animate-pulse" />
        <div className="h-[calc(100vh-11rem)] min-h-[24rem] rounded-xl border border-accent bg-card animate-pulse" />
      </main>
    );
  }

  return <>{children}</>;
}
