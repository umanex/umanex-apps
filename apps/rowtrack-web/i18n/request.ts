import { getRequestConfig } from 'next-intl/server';
import { isLocale, routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale kan een onbekende waarde dragen — de middleware matcht op het
  // URL-segment, niet op de locale-lijst. Zonder deze check zou een verzoek op
  // /de een import van messages/de.json proberen en de render laten crashen.
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
