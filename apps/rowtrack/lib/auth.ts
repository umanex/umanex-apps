import * as Linking from 'expo-linking';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, AUTH_STORAGE_KEY } from './supabase';
import { secureStorageAdapter } from './secureStorage';
import { reportError } from './monitoring';
import { purgePendingWorkout } from './pendingWorkout';
import { forgetKnownDevice } from './ble/knownDevices';

/**
 * Wist alles wat lokaal aan déze gebruiker hangt.
 *
 * Draait bij uitloggen én bij verwijderen. Zonder dit bleef een rit die niet
 * verstuurd kon worden — mét user-id en een hartslagwaarde per seconde —
 * onversleuteld op het toestel staan nadat de gebruiker was uitgelogd. Op een
 * gedeelde telefoon is dat andermans gezondheidsdata die blijft liggen.
 *
 * De onthouden bluetooth-toestellen gaan mee: uitloggen betekent "dit is mijn
 * sessie niet meer", en autoconnect leert het toestel bij de eerstvolgende
 * verbinding gewoon opnieuw. Dat kost één handmatige tik, geen data.
 */
async function clearLocalUserData(): Promise<void> {
  await purgePendingWorkout();
  await forgetKnownDevice('rower');
  await forgetKnownDevice('hr');
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await clearLocalUserData();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Deadline op het verwijderverzoek; zie de invoke hieronder. */
const DELETE_TIMEOUT_MS = 20_000;

/** Waarom een accountverwijdering niet doorging — de UI mapt dit op copy. */
export type DeleteAccountFailure =
  | 'wrong_password' // re-auth afgewezen
  | 'not_signed_in' // geen (geldige) sessie meer
  | 'unavailable' // het verzoek raakte de server niet
  | 'rate_limited' // te veel pogingen
  | 'uncertain' // verzoek verstuurd, antwoord verloren: uitkomst onbekend
  | 'failed'; // server gaf een fout terug

export type DeleteAccountOutcome =
  /** `signedOut: false` = het account is weg, maar deze telefoon draait nog op een
   *  dode sessie. De UI moet dat melden — niet stil op een redirect wachten. */
  | { ok: true; signedOut: boolean }
  | { ok: false; reason: DeleteAccountFailure };

/**
 * Vertaalt een auth-fout naar de reden die de gebruiker te zien krijgt. Zonder
 * deze splitsing kreeg een offline gebruiker met het júiste wachtwoord te horen
 * dat zijn wachtwoord niet klopt, en ging hij een reset aanvragen voor wat een
 * netwerkprobleem is.
 *
 * Bewust duck-typed op `name`/`status` i.p.v. een `instanceof` op de auth-js
 * foutklassen: die klassen komen uit `@supabase/auth-js`, dat hier een transitieve
 * dependency is. Er direct uit importeren is een phantom dependency.
 */
function classifyAuthError(error: { name?: string; status?: number; code?: string }): DeleteAccountFailure {
  // AuthRetryableFetchError krijgt status 0 — het verzoek is nooit aangekomen.
  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status === undefined) {
    return 'unavailable';
  }
  if (error.status === 429) return 'rate_limited';
  if (error.status === 400 || error.status === 401 || error.code === 'invalid_credentials') {
    return 'wrong_password';
  }
  return 'failed';
}

/**
 * Verwijdert het account van de ingelogde gebruiker, permanent (AVG art. 17 +
 * Apple Guideline 5.1.1(v)). Drie stappen, in deze volgorde:
 *
 *   1. Re-auth met het wachtwoord — bewijst identiteit, zodat een geleende
 *      ontgrendelde telefoon het account niet kan wissen. Zelfde patroon als de
 *      e-mailwijziging in `profile.tsx`.
 *   2. De `delete-account` Edge Function — die haalt de user-id uit de JWT en
 *      roept `auth.admin.deleteUser` aan. De cascade op `profiles` → `workouts`
 *      → `workout_intervals` ruimt alle data op.
 *   3. Lokale staat opruimen: de pending-workout-slot en de sessie.
 *
 * Faalt stap 1 of 2, dan is er niets verwijderd en blijft de gebruiker ingelogd.
 */
export async function deleteAccount(password: string): Promise<DeleteAccountOutcome> {
  // De fout van getSession meelezen: staat de token tegen zijn vervaldatum aan, dan
  // probeert auth-js eerst te verversen. Lukt dat niet (offline, 5xx), dan komt er
  // `session: null` mét een error terug terwijl de gebruiker níet uitgelogd is.
  // Zonder deze tak zou dat "je sessie is verlopen, log opnieuw in" opleveren —
  // een advies dat offline niet uit te voeren is, voor een probleem dat er niet is.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    reportError(sessionError, { where: 'auth.deleteAccount.session' });
    return { ok: false, reason: classifyAuthError(sessionError) };
  }

  const email = session?.user?.email;
  if (!email) return { ok: false, reason: 'not_signed_in' };

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password });
  if (reauthError) {
    reportError(reauthError, { where: 'auth.deleteAccount.reauth' });
    return { ok: false, reason: classifyAuthError(reauthError) };
  }

  // Harde deadline. React Native's HTTP-client heeft op Android géén standaard
  // timeout, dus een half-open socket laat deze promise anders nooit settelen — en
  // de sheet staat dan tot een force-quit op een spinner die niet weg kan.
  const { error: fnError } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    timeout: DELETE_TIMEOUT_MS,
  });

  if (fnError) {
    reportError(fnError, { where: 'auth.deleteAccount.invoke' });
    // Geen HTTP-status = het verzoek is wel vertrokken maar er kwam geen antwoord
    // (FunctionsFetchError / FunctionsRelayError / afgebroken op de deadline). Of de
    // server de verwijdering tóch uitvoerde weten we dan niet — daar hoort eerlijke
    // copy bij, geen "probeer opnieuw" alsof er zeker niets gebeurd is.
    const status =
      fnError instanceof FunctionsHttpError
        ? (fnError.context as Response | undefined)?.status
        : undefined;
    if (status === undefined) return { ok: false, reason: 'uncertain' };
    if (status === 401 || status === 403) return { ok: false, reason: 'not_signed_in' };
    if (status === 429) return { ok: false, reason: 'rate_limited' };
    return { ok: false, reason: 'failed' };
  }

  // Vanaf hier is de data weg. Alles wat nu nog faalt mag de flow niet tegenhouden —
  // ingelogd blijven op een verwijderd account is de slechtere uitkomst.
  await clearLocalUserData();
  const signedOut = await signOutAfterDeletion();
  return { ok: true, signedOut };
}

/**
 * Uitloggen nadat de user server-side al verwijderd is. Geeft terug of dat écht
 * gelukt is.
 *
 * Het normale pad werkt: de logout-POST krijgt 401/403/404 omdat de user niet meer
 * bestaat, en auth-js slikt precies díe statussen en ruimt de sessie op. Valt het
 * netwerk weg (of geeft de gateway 429/5xx), dan stopt auth-js vóór dat opruimen —
 * en `scope: 'local'` helpt daar niet tegen, want ook die variant POST eerst naar
 * /logout. Het enige netwerkvrije pad is de sessie zelf uit de opslag halen; die
 * sleutel kennen we omdat `lib/supabase.ts` hem expliciet zet.
 *
 * Auth-js houdt zélf niets vast — `__loadSession` leest bij elke aanroep uit de
 * opslag — dus na dat wissen is de SDK effectief uitgelogd. Alleen de React-state
 * loopt achter, want er kwam geen `SIGNED_OUT`-event. Vandaar de boolean: de UI moet
 * die state dan zelf leegmaken (`clearSession` uit de auth-context).
 */
async function signOutAfterDeletion(): Promise<boolean> {
  await supabase.auth.signOut().catch(() => {});
  if (!(await hasStoredSession())) return true;

  await secureStorageAdapter.removeItem(AUTH_STORAGE_KEY).catch(() => {});
  return false;
}

async function hasStoredSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  } catch {
    return true; // niet kunnen vaststellen = niet aannemen dat het goed zit
  }
}

/**
 * Stuurt een wachtwoord-reset-mail. De link keert terug in de app via de
 * `rowtrack://reset-password` deep link (scheme staat in app.json).
 * De redirect-URL moet in Supabase → Auth → URL Configuration whitelisted zijn.
 */
export async function sendPasswordReset(email: string) {
  const redirectTo = Linking.createURL('reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
}

/**
 * Rondt de reset af: activeert de recovery-sessie uit de deep-link-tokens,
 * zet het nieuwe wachtwoord en logt daarna weer uit (gebruiker meldt zich
 * opnieuw aan met het nieuwe wachtwoord). Best-effort signOut — het wachtwoord
 * is op dat punt al gewijzigd.
 */
export async function completePasswordReset(
  tokens: { access_token: string; refresh_token: string },
  newPassword: string,
) {
  const { error: sessionError } = await supabase.auth.setSession(tokens);
  if (sessionError) throw sessionError;

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;
  } finally {
    // Recovery-sessie altijd (global scope) opruimen — ook als updateUser faalt.
    // Anders blijft een auto-refreshende sessie in AsyncStorage achter en landt
    // de volgende koude start meteen in de app (security review P1).
    await supabase.auth.signOut().catch(() => {});
  }
}
