/**
 * Invoer lezen en eenheden tonen voor het bureau, in nl-BE.
 *
 * Geldbedragen tonen gaat via `formatCurrency` / `formatAmount` in `lib/cashflow/recurring.ts` —
 * één notatie voor euro's in de hele app. Hier staan de eenheden die de prognose niet kent.
 */
import { format, parseISO } from 'date-fns';
import { nlBE } from 'date-fns/locale';
import type { MonthKey } from '../cashflow/types.ts';
import type { IsoDate, WeekKey } from './types.ts';
import { weekRange } from './periods.ts';

/**
 * Leest een getal zoals iemand het in België typt: `200.000`, `200000`, `1,5`, `€ 1.250,50`,
 * `−300`. Een punt gevolgd door precies drie cijfers is een duizendtal; een komma is de decimaal.
 * Onleesbaar of leeg → `null`, nooit 0 — een leeg veld is geen nul.
 */
export function parseNumber(input: string): number | null {
  let s = input.trim().replace(/[€%\s]/g, '').replace(/−/g, '-');
  s = s.replace(/[a-z]+$/i, '');
  if (s === '' || s === '-') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const getal = (n: number, decimals: number) =>
  n.toLocaleString('nl-BE', { minimumFractionDigits: 0, maximumFractionDigits: decimals });

/** Een getal voor in een invoerveld: zonder duizendtalteken, zodat het terug te lezen is zoals het staat. */
export function toInputValue(n: number | null): string {
  return n === null ? '' : String(n).replace('.', ',');
}

export function formatHours(hours: number): string {
  return `${getal(hours, 2)} u`;
}

export function formatDays(days: number): string {
  return `${getal(days, 1)} d`;
}

/** `share` als fractie (0,42) → "42 %". */
export function formatPercent(share: number, decimals = 0): string {
  return `${getal(share * 100, decimals)} %`;
}

/** "Week 38 · 14–20 sep" — over een maandwissel "Week 40 · 28 sep–4 okt". */
export function weekLabel(w: WeekKey): string {
  const { from, to } = weekRange(w);
  const a = parseISO(from);
  const b = parseISO(to);
  const nummer = Number(w.slice(6));
  const bereik = format(a, 'MMM', { locale: nlBE }) === format(b, 'MMM', { locale: nlBE })
    ? `${format(a, 'd')}–${format(b, 'd MMM', { locale: nlBE })}`
    : `${format(a, 'd MMM', { locale: nlBE })}–${format(b, 'd MMM', { locale: nlBE })}`;
  return `Week ${nummer} · ${bereik.replace(/\./g, '')}`;
}

/** "di 16 sep" */
export function dayLabel(d: IsoDate): string {
  return format(parseISO(d), 'EEEEEE d MMM', { locale: nlBE }).replace(/\./g, '');
}

/** "16 september 2026" */
export function dateLabel(d: IsoDate): string {
  return format(parseISO(d), 'd MMMM yyyy', { locale: nlBE });
}

/** "sep 2026" */
export function monthLabel(m: MonthKey): string {
  return format(parseISO(`${m}-01`), 'MMM yyyy', { locale: nlBE }).replace(/\./g, '');
}

/** "sep 2026" · "sep – dec 2026" · "nov 2026 – feb 2027". Onleesbare invoer blijft zoals ze is. */
export function monthRangeLabel(start: MonthKey, end: MonthKey): string {
  const geldig = (m: string) => /^\d{4}-\d{2}$/.test(m);
  if (!geldig(start) || !geldig(end)) return `${start} – ${end}`;
  if (start === end) return monthLabel(start);
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `${format(parseISO(`${start}-01`), 'MMM', { locale: nlBE }).replace(/\./g, '')} – ${monthLabel(end)}`;
  }
  return `${monthLabel(start)} – ${monthLabel(end)}`;
}
