/**
 * Kalendergrenzen voor de periodefilters. Eén bron voor de historiek-filter én de
 * periodedoelen, zodat "week" niet op het ene scherm iets anders betekent dan op het
 * andere (historiek toonde eerder een rollend venster van 7 dagen, de doelen een
 * kalenderweek vanaf maandag — dezelfde periode gaf dan twee verschillende getallen).
 */
export type Period = 'week' | 'month' | 'year' | 'all';

/**
 * Begin van de kalenderperiode waarin `now` valt, in lokale tijd. `all` → `null`
 * (geen ondergrens).
 *
 * Bewust opgebouwd met de `new Date(jaar, maand, dag)`-constructor in plaats van
 * `setMonth()`/`setFullYear()`: die laatste rollen door op een dag die in de
 * doelmaand niet bestaat (31 maart − 1 maand → "31 februari" → 3 maart), waardoor
 * het venster op randdatums stil inkrimpt.
 */
export function periodStart(period: Period, now: Date = new Date()): Date | null {
  switch (period) {
    case 'week': {
      // Maandag als eerste dag (ISO-8601 / NL). setDate() met een negatieve uitkomst
      // rolt correct terug over de maand- en jaargrens heen.
      const monday = new Date(now);
      const isoDay = (now.getDay() + 6) % 7; // ma = 0 … zo = 6
      monday.setDate(now.getDate() - isoDay);
      monday.setHours(0, 0, 0, 0);
      return monday;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return null;
  }
}
