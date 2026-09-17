/**
 * Het antwoord op "kom ik rond?" — één getal, in woorden, met zijn oorzaak.
 *
 * Het getal is het laagste **Buffer**-maandeinde binnen de horizon: hetzelfde getal als de
 * Bureau-tegel en als de footer van die maand op `/` (zie de geldtaal-briefing van 2026-09-17).
 * Vrij en bufferpot staan ernaast, zodat de kaart zijn eigen optelling draagt.
 *
 * De oorzaak is de kop met het **grootste absolute verschil tegenover de maand ervóór** — die
 * verklaart de daling, waar de grootste kop alleen de omvang toont. Is het laagste punt de eerste
 * maand van het venster, dan is er geen vorige maand en valt hij terug op de grootste kostenkop.
 */
import type { MonthData, MonthKey, MonthSubtotals } from './types';
import { bufferSummary } from './buffer.ts';
import { lowestMonthEnd, isEmptyPlan, type WeeklyCashPlan } from '../bureau/weekly-cash.ts';

export type OutlookKop = 'inkomsten' | 'vast' | 'eenmalig' | 'budgetten' | 'provisies' | 'bufferpot';

/** Volgorde van de koppen; bij een gelijk verschil wint de eerste. Zelfde volgorde als de ledger. */
const KOPPEN: Array<{ kop: OutlookKop; van: (s: MonthSubtotals) => number; kost: boolean }> = [
  { kop: 'inkomsten', van: (s) => s.incoming, kost: false },
  { kop: 'vast', van: (s) => s.recurring, kost: true },
  { kop: 'eenmalig', van: (s) => s.oneOff, kost: true },
  { kop: 'budgetten', van: (s) => s.budgets, kost: true },
  { kop: 'provisies', van: (s) => s.provisions, kost: true },
  { kop: 'bufferpot', van: (s) => s.buffer, kost: true },
];

export type OutlookOorzaak =
  /** `delta` is de verandering van die kop tegenover `vorigeMaand`: positief = hoger geworden. */
  | { soort: 'verschil'; kop: OutlookKop; delta: number; vorigeMaand: MonthKey }
  | { soort: 'grootste-kost'; kop: OutlookKop; bedrag: number }
  | null;

export type CashOutlook =
  /** Geen banksaldo en geen posten: er valt niets te antwoorden, en nul zou een stand suggereren. */
  | { kind: 'leeg' }
  /** Geen enkele maand eindigt binnen de horizon — dan bestaat "het laagste maandeinde" niet. */
  | { kind: 'geen-maand' }
  | {
      kind: 'ok';
      maandKey: MonthKey;
      /** Vrij + bufferpot op dat maandeinde. */
      buffer: number;
      vrij: number;
      bufferPot: number;
      gedekt: boolean;
      /** Bestaat er een bufferpot in het venster? Zo niet, dan is Buffer gelijk aan Vrij en vervalt de brug. */
      heeftBufferpot: boolean;
      oorzaak: OutlookOorzaak;
    };

const EPS = 0.005;

export function cashOutlook(plan: WeeklyCashPlan, months: MonthData[]): CashOutlook {
  if (isEmptyPlan(plan)) return { kind: 'leeg' };
  const laagste = lowestMonthEnd(plan);
  if (!laagste) return { kind: 'geen-maand' };

  const index = months.findIndex((m) => m.monthKey === laagste.monthKey);
  const maand = months[index];
  const vorige = index > 0 ? months[index - 1] : undefined;

  return {
    kind: 'ok',
    maandKey: laagste.monthKey,
    buffer: laagste.buffer,
    vrij: laagste.closingFree,
    bufferPot: laagste.bufferPot,
    gedekt: laagste.buffer > -EPS,
    heeftBufferpot: months.some((m) => bufferSummary(m).present),
    oorzaak: maand ? oorzaakVan(maand.subtotals, vorige) : null,
  };
}

function oorzaakVan(nu: MonthSubtotals, vorige: MonthData | undefined): OutlookOorzaak {
  if (vorige) {
    const verschillen = KOPPEN.map((k) => ({ kop: k.kop, delta: round2(k.van(nu) - k.van(vorige.subtotals)) }));
    const grootste = verschillen.reduce((max, v) => (Math.abs(v.delta) > Math.abs(max.delta) ? v : max));
    if (Math.abs(grootste.delta) >= EPS) return { soort: 'verschil', kop: grootste.kop, delta: grootste.delta, vorigeMaand: vorige.monthKey };
    return null;
  }
  const kosten = KOPPEN.filter((k) => k.kost).map((k) => ({ kop: k.kop, bedrag: round2(k.van(nu)) }));
  const grootste = kosten.reduce((max, k) => (k.bedrag > max.bedrag ? k : max));
  return grootste.bedrag >= EPS ? { soort: 'grootste-kost', kop: grootste.kop, bedrag: grootste.bedrag } : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
