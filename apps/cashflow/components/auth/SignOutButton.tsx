'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { flushSync } from '../../lib/cashflow/sync';

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    // Eerst een eventueel uitgestelde schrijfactie afmaken. Zonder dit verdwijnt de
    // laatste wijziging bij uitloggen — er is geen lokale kopie die hem nog kent.
    await flushSync();
    await supabase.auth.signOut();
    setBusy(false);
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
    >
      {busy ? 'Bezig…' : 'Uitloggen'}
    </button>
  );
}
