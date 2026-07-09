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

// --- Veld-fout-helpers (touched-gated) — gedeeld door de auth-schermen ---

export function emailFieldError(value: string, touched: boolean): string | undefined {
  if (!touched) return undefined;
  if (!value.trim()) return 'Vul je e-mailadres in';
  if (!isValidEmail(value)) return 'Ongeldig e-mailadres';
  return undefined;
}

export function passwordFieldError(
  value: string,
  touched: boolean,
  requireLength = false,
): string | undefined {
  if (!touched) return undefined;
  if (!value) return 'Vul je wachtwoord in';
  if (requireLength && !isValidPassword(value)) return `Minstens ${MIN_PASSWORD_LENGTH} tekens`;
  return undefined;
}

export function confirmFieldError(
  confirm: string,
  password: string,
  touched: boolean,
): string | undefined {
  if (!touched) return undefined;
  if (!confirm) return 'Bevestig je wachtwoord';
  if (confirm !== password) return 'Wachtwoorden komen niet overeen';
  return undefined;
}
