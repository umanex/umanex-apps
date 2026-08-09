import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

/**
 * Bouwt de per-pagina metadata: canonical plus de volledige hreflang-set.
 *
 * Waarom een helper en niet per pagina met de hand: canonical en hreflang moeten
 * consistent zijn over álle pagina's, en dat is precies het soort ding dat bij de
 * derde pagina stilletjes uiteenloopt. Eén functie betekent dat een nieuwe taal of
 * een gewijzigd padschema op één plek landt.
 *
 * De paden zijn RELATIEF; `metadataBase` in de root-layout maakt ze absoluut.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  /** Pad zonder locale-prefix; '' is de onepager. */
  path: string;
  title: string;
  description: string;
}): Metadata {
  const canonical = `/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
        // x-default is wat een zoekmachine toont aan een bezoeker wiens taal niet in
        // de lijst staat. Zonder deze regel kiest hij zelf, en dat is bij één locale
        // toevallig goed en bij twee een gok.
        'x-default': `/${routing.defaultLocale}${path}`,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'nl_BE',
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
