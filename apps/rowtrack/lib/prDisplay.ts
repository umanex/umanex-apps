/**
 * De UI-kant van een persoonlijk record: labels en formattering.
 *
 * Bewust gescheiden van `lib/personalRecords.ts` — die module is puur en draait onder
 * `node --test`, en zou dat verliezen zodra ze `@/i18n` of de formatters importeert.
 * Hier staat alleen presentatie: welke eenheid bij welke metric hoort, en hoe een
 * verslagen waarde in één regel leest.
 */
import { t } from '@/i18n';
import { formatDistanceDynamic, formatSplit } from '@/lib/formatters';
import type { PrEntry, PrMetric } from '@/lib/personalRecords';
import { primaryEntry } from '@/lib/personalRecords';

export function prMetricLabel(metric: PrMetric): string {
  return t.pr.metric[metric];
}

/** De waarde met de eenheid die bij de metric hoort. */
export function formatPrValue(metric: PrMetric, value: number): string {
  switch (metric) {
    case 'distance': {
      const { value: v, unit } = formatDistanceDynamic(value);
      return `${v} ${unit}`;
    }
    case 'best2k':
      return formatSplit(value);
    case 'watts':
      return `${Math.round(value)} W`;
    case 'split':
      return `${formatSplit(value)} /500m`;
  }
}

/**
 * Compacte vorm voor de archiefrij, waar geen label naast past. `2:14` alleen zou
 * dubbelzinnig zijn tussen een 2000m-tijd en een split, dus de 2K draagt zijn eigen
 * voorvoegsel en de split zijn `/500m`.
 */
export function formatPrCompact(entry: PrEntry): string {
  if (entry.metric === 'best2k') return `2K ${formatSplit(entry.value)}`;
  return formatPrValue(entry.metric, entry.value);
}

/**
 * Dag + maand, zonder weekdag. `formatDate` levert 'wo 20 aug'; die weekdag kost breedte in
 * een regel die toch al de langste van het blok is, en zegt niets over een record.
 */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${t.dates.monthsShort[d.getMonth()]}`;
}

/** "vorige beste 142 W · 20 aug", of de eerlijke variant als de herkomst ontbreekt. */
export function formatPrPrevious(entry: PrEntry): string {
  if (entry.previous == null) return t.pr.previousUnknown;
  const value = formatPrValue(entry.metric, entry.previous);
  if (entry.previous_at == null) return t.pr.previous(value, '—');
  return t.pr.previous(value, shortDate(entry.previous_at));
}

/** Eén stop voor een screenreader: metric, nieuwe waarde en wat hij verving. */
export function prEntrySpoken(entry: PrEntry): string {
  return `${prMetricLabel(entry.metric)}: ${formatPrValue(entry.metric, entry.value)}. ${formatPrPrevious(entry)}`;
}

/**
 * Wat er op één badge past: de metric zelf bij één record, het aantal bij meerdere.
 * `null` betekent: geen badge tonen.
 */
export function prRowLabel(entries: readonly PrEntry[]): string | null {
  if (entries.length === 0) return null;
  if (entries.length > 1) return t.pr.count(entries.length);
  const first = primaryEntry(entries);
  return first ? formatPrCompact(first) : null;
}

/** Screenreader-tekst: alle gebroken records uitgeschreven. */
export function prAccessibilityLabel(entries: readonly PrEntry[]): string {
  if (entries.length === 0) return t.pr.a11yPlain;
  const parts = entries.map((e) => `${prMetricLabel(e.metric)} ${formatPrValue(e.metric, e.value)}`);
  return t.pr.a11yRow(parts.join(', '));
}
