'use client';

import { useAuth } from '../../lib/supabase/auth-context';
import { DataGate } from './DataGate';
import { LoginForm } from './LoginForm';

/**
 * Poort vóór de hele app. Geen sessie betekent geen data — RLS geeft de anon-sleutel
 * niets terug — dus er valt zonder login letterlijk niets te tonen.
 */
export function LoginGate({ children }: { children: React.ReactNode }) {
  const { session, isChecking } = useAuth();

  if (isChecking) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="h-9 w-40 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Cashflow</h1>
        <LoginForm />
      </main>
    );
  }

  return <DataGate userId={session.user.id}>{children}</DataGate>;
}
