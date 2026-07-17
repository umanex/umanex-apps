import { t } from '@/i18n';

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
  if (!value.trim()) return t.validation.emailRequired;
  if (!isValidEmail(value)) return t.validation.emailInvalid;
  return undefined;
}

export function passwordFieldError(
  value: string,
  touched: boolean,
  requireLength = false,
): string | undefined {
  if (!touched) return undefined;
  if (!value) return t.validation.passwordRequired;
  if (requireLength && !isValidPassword(value)) return t.validation.passwordMinLength(MIN_PASSWORD_LENGTH);
  return undefined;
}

export function confirmFieldError(
  confirm: string,
  password: string,
  touched: boolean,
): string | undefined {
  if (!touched) return undefined;
  if (!confirm) return t.validation.confirmRequired;
  if (confirm !== password) return t.validation.confirmMismatch;
  return undefined;
}
