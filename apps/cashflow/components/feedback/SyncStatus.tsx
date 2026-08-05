'use client';

import { useSyncStatus } from '../../lib/cashflow/sync-status';

/**
 * Maakt zichtbaar wat er met je wijzigingen gebeurt.
 *
 * Zonder lokale kopie is een mislukte schrijfactie stil dataverlies: het scherm klopt,
 * de server niet. Bij een conflict is herladen de enige veilige uitweg — doorwerken zou
 * de wijziging uit de andere browser overschrijven.
 */
export function SyncStatus() {
  const state = useSyncStatus((s) => s.state);
  const message = useSyncStatus((s) => s.message);

  if (state === 'idle') return null;

  if (state === 'saving') {
    return <span className="text-xs text-muted-foreground tabular-nums">Opslaan…</span>;
  }

  if (state === 'conflict') {
    return (
      <span role="alert" className="inline-flex items-center gap-2 text-xs text-destructive">
        Elders gewijzigd — deze wijzigingen worden niet bewaard.
        <button
          onClick={() => window.location.reload()}
          className="underline underline-offset-2 hover:no-underline"
        >
          Herladen
        </button>
      </span>
    );
  }

  return (
    <span role="alert" className="text-xs text-destructive">
      Niet opgeslagen{message ? `: ${message}` : ''}
    </span>
  );
}
