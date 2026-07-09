import * as Linking from 'expo-linking';
import { supabase } from './supabase';

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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
