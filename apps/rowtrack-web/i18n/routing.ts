import { defineRouting } from 'next-intl/routing';

/**
 * De routing-definitie is de enige plek waar de talen staan.
 *
 * Er staat bewust alleen `nl` in. Het onderzoeksdocument vroeg om messages/en.json
 * met placeholders, maar een /en-route die Nederlandse placeholders serveert is
 * slechter dan geen /en: hij komt in de sitemap, krijgt een hreflang-alternate, en
 * belooft aan een zoekmachine een Engelse pagina die niet bestaat.
 *
 * "Klaar voor /en" betekent hier: er is één array om aan te vullen. Zet 'en' erbij,
 * voeg messages/en.json toe, en de routes, middleware, hreflang en sitemap volgen
 * vanzelf.
 *
 * localePrefix 'always' houdt /nl expliciet in de URL en laat / doorverwijzen —
 * dat is de sitemap uit de briefing (/nl, /nl/privacy, /nl/voorwaarden, /nl/support).
 */
export const routing = defineRouting({
  locales: ['nl'],
  defaultLocale: 'nl',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

/**
 * Type guard op de locale-lijst.
 *
 * next-intl exporteert vanaf een latere versie een `hasLocale`; 3.26 heeft die nog
 * niet. Zelf schrijven is hier trouwens beter dan wachten: de guard staat naast de
 * lijst die hij bewaakt, dus een taal toevoegen kan hem niet vergeten.
 *
 * De cast naar readonly string[] is nodig omdat `includes` op een literal-tuple
 * alleen zijn eigen leden als argument accepteert — precies de waarde die we hier
 * nog niet hebben.
 */
export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (routing.locales as readonly string[]).includes(value);
}
