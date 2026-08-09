/**
 * Eén bron voor alles wat op meerdere plekken moet kloppen: metadata, JSON-LD,
 * sitemap, llms.txt en de zichtbare pagina's. Entiteit-consistentie is een van de
 * weinige GEO-maatregelen die aantoonbaar werkt, en die haal je niet met dezelfde
 * gegevens op vijf plekken overgetypt.
 */

export const site = {
  /** Zonder trailing slash — metadataBase en de sitemap plakken er paden achter. */
  url: 'https://rowtrack.app',
  name: 'RowTrack',
  locale: 'nl_BE',

  /** De maker. Identiek aan wat in het privacybeleid van de app staat. */
  organisation: {
    name: 'umanex CommV',
    email: 'jeroen@umanex.be',
    street: 'Eernegemweg 97',
    postalCode: '8490',
    city: 'Jabbeke',
    country: 'BE',
  },

  /**
   * TODO(release): vullen zodra RowTrack in de App Store staat.
   *
   * De app is vandaag niet gepubliceerd — geen submit-configuratie in eas.json, geen
   * ascAppId, build number nog 1. Deze constante is de ENIGE plek waar de App
   * Store-URL en het app-id staan; de badge, de QR-code, de Smart App Banner, de
   * apple-app-site-association en de JSON-LD hangen er allemaal aan.
   *
   * Zolang dit null is hoort de site niet gepubliceerd te worden. Dat is ook de
   * afspraak: bouwen nu, publiceren ná de release.
   */
  appStore: {
    id: null as string | null,
    url: null as string | null,
  },

  /** Bundle identifier uit apps/rowtrack/app.json — nodig voor Universal Links. */
  bundleId: 'com.rowtrack.app',

  /**
   * TODO(release): toetsen aan App Store Connect vóór de site live gaat.
   *
   * Er zit vandaag géén in-app-aankoopcode in de app (geen StoreKit, geen
   * RevenueCat, geen feature-gating). Deze bedragen zijn een aankondiging, geen
   * bestaand product. Een prijs op de site die niet klopt met App Store Connect is
   * een reviewrisico.
   */
  pricing: {
    currency: 'EUR',
    free: '0',
    proMonthly: '3.99',
    proYearly: '29.99',
  },
} as const;

/** Absolute URL voor een pad dat met / begint. */
export const absoluteUrl = (path: string) => `${site.url}${path}`;
