/**
 * De navigatie van de app en van het bureau, als data — geen React, zodat de regels die bepalen
 * wat "actief" is getest kunnen worden.
 */

export type NavItem = { href: string; label: string };

export const APP_NAV: readonly NavItem[] = [
  { href: '/', label: 'Prognose' },
  { href: '/analyse', label: 'Analyse' },
  { href: '/bureau', label: 'Bureau' },
];

export const BUREAU_NAV: readonly NavItem[] = [
  { href: '/bureau', label: 'Overzicht' },
  { href: '/bureau/projecten', label: 'Projecten' },
  { href: '/bureau/verkoop', label: 'Verkoop' },
  { href: '/bureau/tijd', label: 'Tijd' },
  { href: '/bureau/klanten', label: 'Klanten' },
  { href: '/bureau/cash', label: 'Cash' },
  { href: '/bureau/doelen', label: 'Doelen' },
];

/**
 * Is `href` de actieve bestemming voor `pathname`? Een wortel (`/`, `/bureau`) is alleen actief
 * op zichzelf — anders zou "Overzicht" oplichten op elke bureau-pagina — tenzij hij in de
 * lijst de enige is die het pad dekt (`/bureau` in de hoofdnavigatie voor `/bureau/tijd`).
 */
export function activeHref(pathname: string, items: readonly NavItem[]): string | null {
  const exact = items.find((i) => i.href === pathname);
  if (exact) return exact.href;
  const prefixed = items
    .filter((i) => i.href !== '/' && pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  return prefixed[0]?.href ?? null;
}
