/**
 * Periodes voor het bureau: dagen, ISO-weken, maanden, kwartalen en boekjaren.
 *
 * Alles rekent in lokale tijd op kalenderdagen, zoals `calculator.ts` (`parseISO`). Niet via
 * `addMonth` uit `recurring.ts`: die parset als UTC en loopt een maand mis in een tijdzone
 * achter UTC (zie `apps/cashflow/BACKLOG.md`).
 *
 * Een ISO-week begint op maandag en hoort bij het jaar waarin zijn donderdag valt — daarom is
 * 1 januari 2027 week 53 van 2026. Weeksleutels zijn `yyyy-Www` met nul-opvulling, zodat een
 * gewone stringvergelijking ze chronologisch ordent.
 */
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  setISOWeek,
  startOfISOWeek,
} from 'date-fns';
import type { MonthKey } from '../cashflow/types.ts';
import type { IsoDate, WeekKey } from './types.ts';

const pad2 = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(d: Date): IsoDate {
  return format(d, 'yyyy-MM-dd');
}

export function monthOf(d: IsoDate): MonthKey {
  return d.slice(0, 7);
}

export function yearOf(x: IsoDate | MonthKey | WeekKey): number {
  return Number(x.slice(0, 4));
}

export function quarterOf(m: MonthKey): 1 | 2 | 3 | 4 {
  return (Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

export function addMonthKey(m: MonthKey, count: number): MonthKey {
  return format(addMonths(parseISO(`${m}-01`), count), 'yyyy-MM');
}

/** Alle maanden van `from` t/m `to`, inclusief. Leeg als `to` vóór `from` ligt. */
export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = from; m <= to; m = addMonthKey(m, 1)) out.push(m);
  return out;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function isoWeekKey(d: IsoDate): WeekKey {
  const date = parseISO(d);
  return `${getISOWeekYear(date)}-W${pad2(getISOWeek(date))}`;
}

function weekStartDate(w: WeekKey): Date {
  const year = Number(w.slice(0, 4));
  const week = Number(w.slice(6));
  // 4 januari valt per definitie in ISO-week 1 van zijn jaar.
  return startOfISOWeek(setISOWeek(new Date(year, 0, 4), week));
}

export function weekRange(w: WeekKey): { from: IsoDate; to: IsoDate } {
  const start = weekStartDate(w);
  return { from: toIsoDate(start), to: toIsoDate(addDays(start, 6)) };
}

/** `count` opeenvolgende weken, te beginnen bij de week waarin `d` valt. */
export function weeksFrom(d: IsoDate, count: number): WeekKey[] {
  const start = weekStartDate(isoWeekKey(d));
  return Array.from({ length: count }, (_, i) => isoWeekKey(toIsoDate(addDays(start, i * 7))));
}

/** De dagen van een week, gegroepeerd per maand — een week rond de maandwissel geeft twee cellen. */
export function weekMonthCells(w: WeekKey): Array<{ monthKey: MonthKey; from: IsoDate; to: IsoDate; days: number }> {
  const start = weekStartDate(w);
  const cells: Array<{ monthKey: MonthKey; from: IsoDate; to: IsoDate; days: number }> = [];
  for (let i = 0; i < 7; i++) {
    const day = toIsoDate(addDays(start, i));
    const last = cells[cells.length - 1];
    if (last && last.monthKey === monthOf(day)) {
      last.to = day;
      last.days += 1;
    } else {
      cells.push({ monthKey: monthOf(day), from: day, to: day, days: 1 });
    }
  }
  return cells;
}

export function firstWeekOfMonth(m: MonthKey): WeekKey {
  return isoWeekKey(`${m}-01`);
}

export function lastWeekOfMonth(m: MonthKey): WeekKey {
  return isoWeekKey(toIsoDate(endOfMonth(parseISO(`${m}-01`))));
}

export function maxWeek(a: WeekKey, b: WeekKey): WeekKey {
  return a >= b ? a : b;
}

/** Elke maand waarvan minstens één dag binnen `weeks` weken vanaf de week van `from` valt. */
export function monthsCovering(from: IsoDate, weeks: number): MonthKey[] {
  const keys = weeksFrom(from, weeks);
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return [];
  return monthsBetween(monthOf(weekRange(first).from), monthOf(weekRange(last).to));
}

/** Overlapt de maandperiode `[start, end]` met boekjaar `year`? */
export function periodTouchesYear(start: MonthKey, end: MonthKey, year: number): boolean {
  return yearOf(start) <= year && yearOf(end) >= year;
}
