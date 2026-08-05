'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** Waar tot de eerste sessiecontrole rond is. Daarvóór weet je niet of je ingelogd bent. */
  isChecking: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsChecking(false);
    });

    // Vangt ook het geval waarin de sessie tijdens gebruik vervalt of elders uitgelogd
    // wordt — dan valt de app vanzelf terug op de loginpoort.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isChecking }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth moet binnen een AuthProvider staan');
  return context;
}
