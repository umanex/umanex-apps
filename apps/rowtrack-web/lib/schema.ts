import { absoluteUrl, site } from './site';

/**
 * De structured data, opgebouwd uit `site` zodat naam, maker en prijzen niet op
 * twee plekken kunnen wegdrijven.
 *
 * Elke bewering hier is getoetst aan de waarheidstabel in
 * briefings/2026-08-09-feature-rowtrack-web-marketingsite.tcebc.md. Structured data
 * is precies waar een te ruime claim blijft plakken: hij wordt letterlijk
 * overgenomen door zoekmachines en taalmodellen, zonder de nuance eromheen.
 */

type Json = Record<string, unknown>;

export function organisationSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    // Vaste @id zodat andere schema's ernaar kunnen verwijzen in plaats van de
    // organisatie te herhalen — twee kopieën van dezelfde entiteit is precies wat
    // entiteit-consistentie ondermijnt.
    '@id': absoluteUrl('/#organisation'),
    name: site.organisation.name,
    url: site.url,
    email: site.organisation.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.organisation.street,
      postalCode: site.organisation.postalCode,
      addressLocality: site.organisation.city,
      addressCountry: site.organisation.country,
    },
  };
}

export function applicationSchema(): Json {
  const { pricing } = site;

  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: site.name,
    operatingSystem: 'iOS',
    applicationCategory: 'HealthApplication',
    // Bewust geformuleerd: split, watt en slagfrequentie komen uit de roeier;
    // hartslag vraagt een LOSSE bluetooth-band. "Toont ook je hartslag" zonder die
    // toevoeging zou suggereren dat de Apollo XL hem meet, en dat doet hij niet.
    description:
      'Roei-app die via Bluetooth FTMS verbindt met de Fluid Rower Apollo XL en je split ' +
      'per 500 meter, vermogen in watt en slagfrequentie live toont. Elke training wordt ' +
      'bewaard met een splits-analyse. Met een losse bluetooth-hartslagband toont RowTrack ' +
      'ook je hartslag.',
    inLanguage: 'nl',
    author: {
      '@type': 'Organization',
      name: site.organisation.name,
    },
    // TODO(release): zie site.pricing — er zit vandaag geen in-app-aankoopcode in de
    // app. Deze offers horen pas te publiceren wanneer ze in App Store Connect
    // bestaan; de site gaat sowieso pas na de release live.
    offers: [
      {
        '@type': 'Offer',
        price: pricing.free,
        priceCurrency: pricing.currency,
        name: 'Gratis',
      },
      {
        '@type': 'Offer',
        price: pricing.proMonthly,
        priceCurrency: pricing.currency,
        name: 'RowTrack Pro (maand)',
      },
      {
        '@type': 'Offer',
        price: pricing.proYearly,
        priceCurrency: pricing.currency,
        name: 'RowTrack Pro (jaar)',
      },
    ],
    // Alleen meesturen als hij bestaat. Een lege of verzonnen installUrl is erger
    // dan geen: hij wordt overgenomen en wijst dan naar niets.
    ...(site.appStore.url ? { installUrl: site.appStore.url } : {}),
    publisher: { '@id': absoluteUrl('/#organisation') },
  };
}
