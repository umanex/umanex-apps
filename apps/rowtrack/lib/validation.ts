/** Minimale wachtwoordlengte — spiegelt de Supabase-drempel. */
export const MIN_PASSWORD_LENGTH = 6;

// Pragmatische e-mailcheck: één @, tekst ervoor, een domein met punt erna.
// Geen RFC-5322-volledigheid — bewust, om valide adressen niet te blokkeren.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
