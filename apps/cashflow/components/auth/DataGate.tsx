'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { cleanupStaleData } from '../../hooks/useCashflow';
import { errorMessage } from '../../lib/cashflow/error-message';
import { hydrateFromRemote, resetSync, startSync } from '../../lib/cashflow/sync';

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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | null = null;

    setPhase('loading');
    setMessage(null);

    hydrateFromRemote(userId)
      .then(() => {
        if (cancelled) return;
        // Pas luisteren nadat de stand staat: anders zou het laden zelf als wijziging
        // gelden en meteen teruggeschreven worden.
        stopSync = startSync();
        cleanupStaleData(format(new Date(), 'yyyy-MM'));
        setPhase('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('[cashflow] laden mislukt', error);
        setMessage(errorMessage(error));
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
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Opnieuw proberen
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-background px-4 py-8 space-y-8" aria-busy="true">
        <div className="h-8 w-56 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
        <div className="h-[calc(100vh-11rem)] min-h-[24rem] rounded-xl border border-[var(--umanexPrimary50)] bg-card animate-pulse" />
      </main>
    );
  }

  return <>{children}</>;
}
