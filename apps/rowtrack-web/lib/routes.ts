/**
 * De routes die de site publiceert, als data.
 *
 * Eén lijst voedt de sitemap, de canonical/hreflang-alternates en straks de
 * footer-links. Zonder die lijst raakt een nieuwe pagina wél gebouwd maar niet
 * gevonden — een sitemap die met de hand bijgewerkt moet worden, is een sitemap die
 * achterloopt.
 *
 * Alleen routes die ECHT bestaan horen hier. Een pad in de sitemap dat 404 geeft is
 * schadelijker dan een ontbrekend pad: het leert een crawler dat je sitemap niet
 * klopt.
 */

export type Route = {
  /** Pad zonder locale-prefix; '' is de onepager zelf. */
  path: string;
  /** Relatief belang binnen de site (sitemap priority). */
  priority: number;
  changeFrequency: 'yearly' | 'monthly' | 'weekly';
};

export const routes: readonly Route[] = [
  { path: '', priority: 1, changeFrequency: 'monthly' },
  { path: '/support', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
  // TODO: '/voorwaarden' toevoegen zodra die tekst bestaat — vandaag staat hij
  // nergens in de repo.
] as const;
