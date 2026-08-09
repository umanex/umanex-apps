import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { routes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/site';

/** Volledige URL voor een route in een taal: '' + 'nl' -> /nl, '/support' -> /nl/support. */
const localised = (locale: string, path: string) => absoluteUrl(`/${locale}${path}`);

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: localised(locale, route.path),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      // Next zet dit om in <xhtml:link rel="alternate" hreflang="...">. x-default
      // wijst naar de standaardtaal: dat is wat een zoekmachine serveert aan een
      // bezoeker wiens taal niet in de lijst staat. Met één locale is dat vandaag
      // dezelfde URL — de vorm klopt zodra er een tweede taal bijkomt.
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((l) => [l, localised(l, route.path)])
          ),
          'x-default': localised(routing.defaultLocale, route.path),
        },
      },
    }))
  );
}
