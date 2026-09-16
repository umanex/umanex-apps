import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { supabase } from './supabase';
import { reportError } from './monitoring';
import { stripHealthDataFromQueue } from './pendingWorkout';
import { stripHealthDataFromCheckpoint } from './activeWorkoutStore';

/**
 * Toestemming voor gezondheidsgegevens (AVG art. 9.2.a) — hartslag, gewicht,
 * lengte, geboortedatum en geslacht.
 *
 * `null` betekent "nog niet gevraagd" en is nadrukkelijk iets anders dan
 * 'declined'. Zonder dat onderscheid zou een bestaand account niet van een nieuw
 * account te onderscheiden zijn en verscheen het toestemmingsscherm nooit voor
 * wie er al data heeft staan.
 *
 * De keuze staat op `profiles`, niet lokaal: toestemming moet aantoonbaar zijn
 * en een herinstallatie overleven.
 */
export type HealthConsent = 'granted' | 'declined' | null;

/**
 * Versie van het privacybeleid waarop de toestemming gegeven is. Verhoog dit bij
 * een wezenlijke wijziging aan wat er verzameld wordt — dan kan er opnieuw
 * gevraagd worden in plaats van de gebruiker voor een voldongen feit te zetten.
 */
export const POLICY_VERSION = '1.0';

type HealthConsentValue = {
  consent: HealthConsent;
  /** Nog aan het ophalen — het toestemmingsscherm mag dan niet flitsen. */
  loading: boolean;
  /** Kortweg: mag de app hartslag en lichaamsgegevens verwerken? */
  granted: boolean;
  grant: () => Promise<boolean>;
  /** Weigeren of intrekken. Wist wat er al verzameld is. */
  revoke: () => Promise<boolean>;
};

const HealthConsentContext = createContext<HealthConsentValue>({
  consent: null,
  loading: true,
  granted: false,
  grant: async () => false,
  revoke: async () => false,
});

export function HealthConsentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [consent, setConsent] = useState<HealthConsent>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setConsent(null);
      setLoading(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('health_consent')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      if (error) {
        // Niet kunnen vaststellen is géén toestemming: laat `consent` op null,
        // dan vraagt het scherm het gewoon opnieuw. Stil aannemen dat het goed
        // zit zou precies de fout zijn die dit hele mechanisme moet voorkomen.
        reportError(error, { where: 'healthConsent.load' });
      }
      setConsent((data?.health_consent as HealthConsent) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const grant = useCallback(async () => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({
        health_consent: 'granted',
        health_consent_at: new Date().toISOString(),
        health_consent_version: POLICY_VERSION,
      })
      .eq('id', user.id);
    if (error) {
      reportError(error, { where: 'healthConsent.grant' });
      return false;
    }
    setConsent('granted');
    return true;
  }, [user]);

  const revoke = useCallback(async () => {
    if (!user) return false;
    // Serverzijdig, in één aanroep: de functie wist de lichaamsvelden, knipt de
    // hartslag uit de opgeslagen tijdreeksen en zet de keuze op 'declined'. Vanaf
    // de client zou dat elke rit ophalen en terugschrijven zijn, met een half
    // afgemaakte staat als het netwerk halverwege wegvalt.
    const { error } = await supabase.rpc('revoke_health_consent');
    if (error) {
      reportError(error, { where: 'healthConsent.revoke' });
      return false;
    }
    // De RPC raakt alleen Postgres. Een rit die lokaal op synchronisatie wacht bleef daardoor
    // staan mét hartslag en werd later alsnog ingestuurd — ná het intrekken (functionele
    // review F4). Pas ná een geslaagde RPC, zodat een mislukte intrekking geen data wist die
    // server-side gewoon blijft staan.
    await stripHealthDataFromQueue();
    // Ook het herstelpunt van een lopende of onderbroken rit: dat draagt de hartslag per
    // seconde, en het staat onversleuteld op het toestel.
    await stripHealthDataFromCheckpoint();
    setConsent('declined');
    return true;
  }, [user]);

  return (
    <HealthConsentContext.Provider
      value={{ consent, loading, granted: consent === 'granted', grant, revoke }}
    >
      {children}
    </HealthConsentContext.Provider>
  );
}

export function useHealthConsent() {
  return useContext(HealthConsentContext);
}
