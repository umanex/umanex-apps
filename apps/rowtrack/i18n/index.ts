import { nl } from './translations/nl';

export type { Translations } from './types';

/**
 * Actieve locale-tabel. De app is NL-only bij launch; `t` is bewust een
 * module-const zodat er nu géén runtime-machinerie (en geen dependency) nodig is.
 *
 * EN toevoegen, later:
 *   1. `translations/en.ts` met `export const en: Translations = {...}` —
 *      de compiler flagt elke ontbrekende key.
 *   2. Locale één keer resolven vóór de eerste render (expo-localization,
 *      native module → vereist een dev-client rebuild) en `t` daaruit toewijzen.
 *   Een in-app taalwissel is niet voorzien; device-locale bij opstart volstaat.
 */
export const t = nl;
