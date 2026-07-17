import type { nl } from './translations/nl';

/**
 * Structureel contract voor elke locale-tabel. `nl` is bewust NIET `as const`,
 * dus dit type is al gewiden (string i.p.v. literals, functie-signaturen intact):
 * een latere `en.ts` declareert `export const en: Translations = {...}` en de
 * compiler dwingt volledigheid + identieke parametrisering af.
 */
export type Translations = typeof nl;
