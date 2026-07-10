import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

/**
 * Laadt de per-profiel 'SPM halveren'-instelling (profiles.spm_halved) voor de
 * huidige gebruiker. Wordt gebruikt om rauwe SPM bij weergave te corrigeren
 * (zie correctSpm). Default false zodat correcte trainers ongewijzigd blijven.
 */
export function useSpmHalved(): boolean {
  const { user } = useAuth();
  const [halved, setHalved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('spm_halved')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setHalved(data?.spm_halved ?? false);
      });
    return () => { cancelled = true; };
  }, [user]);

  return halved;
}
