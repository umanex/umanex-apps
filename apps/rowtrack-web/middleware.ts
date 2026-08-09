import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  /**
   * Alles behalve de paden die géén locale-prefix mogen krijgen.
   *
   * `/.well-known/` staat er expliciet in: de apple-app-site-association moet op
   * de kale root bereikbaar zijn. Apple haalt hem op zonder locale en accepteert
   * geen redirect — een middleware die hem naar /nl/.well-known/... stuurt breekt
   * Universal Links zonder dat er iets zichtbaar misgaat.
   *
   * Idem voor robots.txt, sitemap.xml en llms.txt: crawlers verwachten die op de
   * root, niet achter een taalprefix.
   */
  matcher: [
    '/((?!api|_next|_vercel|\\.well-known|robots\\.txt|sitemap\\.xml|llms\\.txt|.*\\..*).*)',
  ],
};
