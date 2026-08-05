'use client';

import { useState } from 'react';
import { isAuthApiError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';

/**
 * Twee velden en een knop. Geen registratie en geen wachtwoord-reset: er is één gebruiker
 * en diens account wordt in het Supabase-dashboard aangemaakt.
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return; // een tweede klik tijdens een lopende poging doet niets
    setBusy(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      // Een netwerkfout is geen verkeerd wachtwoord — dat onderscheid scheelt een
      // gebruiker die anders zijn wachtwoord begint te wijzigen terwijl de wifi weg is.
      setError(
        isAuthApiError(authError)
          ? 'E-mailadres of wachtwoord klopt niet.'
          : 'Geen verbinding met de server. Controleer je netwerk en probeer opnieuw.',
      );
      setPassword('');
      setBusy(false);
      return;
    }
    // Bij succes neemt AuthProvider het over en verdwijnt dit formulier; busy blijft
    // bewust staan zodat er niet nog een poging vertrekt tijdens het wisselen.
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs text-muted-foreground">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          autoComplete="username"
          disabled={busy}
          className="w-full h-9 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs text-muted-foreground">
          Wachtwoord
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={busy}
          className="w-full h-9 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
      >
        {busy ? 'Bezig…' : 'Inloggen'}
      </button>
    </form>
  );
}
