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
import { potStandAtStart } from './subtotals.ts';
import { lowestMonthEnd, isEmptyPlan, type WeeklyCashPlan } from '../bureau/weekly-cash.ts';

export type OutlookKop = 'inkomsten' | 'vast' | 'eenmalig' | 'budgetten' | 'provisies';

/** Volgorde van de koppen; bij een gelijk verschil wint de eerste. Zelfde volgorde als de ledger. */
const KOPPEN: OutlookKop[] = ['inkomsten', 'vast', 'eenmalig', 'budgetten', 'provisies'];
const KOSTEN: OutlookKop[] = ['vast', 'eenmalig', 'budgetten', 'provisies'];

export type OutlookOorzaak =
  /** `delta` is de verandering van die kop tegenover `vorigeMaand`: positief = hoger geworden. */
  | { soort: 'verschil'; kop: OutlookKop; delta: number; vorigeMaand: MonthKey }
  /** `nogTeBetalen` = de ankermaand, waar de koppen tonen wat er nog van het banksaldo af moet. */
  | { soort: 'grootste-kost'; kop: OutlookKop; bedrag: number; nogTeBetalen: boolean }
  | null;

export type CashOutlook =
  /** Geen banksaldo en geen posten: er valt niets te antwoorden, en nul zou een stand suggereren. */
  | { kind: 'leeg' }
  /**
   * Geen enkele maand eindigt binnen de horizon. Vanuit de app onbereikbaar — het venster begint
   * altijd bij de ankermaand, en die eindigt binnen dertien weken (gemeten over 1.096 dagen: 0).
   * De tak blijft staan omdat `cashOutlook` ook met een los venster aangeroepen kan worden.
   */
  | { kind: 'geen-maand' }
  | {
      kind: 'ok';
      maandKey: MonthKey;
      /** Vrij + bufferpot op dat maandeinde. */
      buffer: number;
      vrij: number;
      bufferPot: number;
      gedekt: boolean;
      /** Staat er een bufferpot in het venster tot en met de maand van het laagste punt? */
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
    // Tot en met de maand van het laagste punt: een pot die pas dáárna begint, hoort niet in de brug
    // van dit getal — en de footers op hetzelfde scherm melden dan "Geen buffer".
    heeftBufferpot: months.slice(0, index + 1).some((m) => bufferSummary(m).present),
    oorzaak: maand ? oorzaakVan(maand, vorige) : null,
  };
}

/**
 * De koppen als **stroom** van die ene maand. Nodig omdat `MonthSubtotals` twee grootheden draagt:
 * in de ankermaand (`basis: 'bank'`) staan er standen — wat er nog van het banksaldo af moet, met de
 * opgebouwde potstand erin — en in elke latere maand (`basis: 'vrij'`) stromen. Een verschil over die
 * grens vergelijkt appels met peren: gemeten in de review van 2026-09-17 meldde de kaart een huur van
 * € 2.000 als "€ 2.000 hoger" terwijl die elke maand gelijk was, omdat de septemberhuur al afgevinkt
 * stond. Daarom vergelijkt `oorzaakVan` alleen twee maanden op vrije basis.
 *
 * `inkomsten` is de eigen inkomst van de maand, niet `subtotals.incoming`: die draagt het saldo van de
 * vorige maand, waardoor het verschil per constructie de vorige maand navertelt in plaats van iets te
 * verklaren. De bufferpot staat er niet in: die neemt op wat er overblijft, en staat bovenaan de kaart
 * al als bezit — hem hier als "post" noemen zou hetzelfde geld twee keer tonen.
 */
function stroomVan(m: MonthData): Record<OutlookKop, number> {
  const s = m.subtotals;
  const anker = s.basis === 'bank';
  return {
    inkomsten: round2(m.totalIncome),
    vast: round2(s.recurring),
    eenmalig: round2(s.oneOff),
    budgetten: round2(s.budgets),
    provisies: round2(anker ? s.provisions - potStandAtStart(m.reservationPots).provisions : s.provisions),
  };
}

function oorzaakVan(maand: MonthData, vorige: MonthData | undefined): OutlookOorzaak {
  const nu = stroomVan(maand);
  const vergelijkbaar = vorige && vorige.subtotals.basis === 'vrij' && maand.subtotals.basis === 'vrij';
  if (vergelijkbaar) {
    const toen = stroomVan(vorige);
    const verschillen = KOPPEN.map((kop) => ({ kop, delta: round2(nu[kop] - toen[kop]) }));
    const grootste = verschillen.reduce((max, v) => (Math.abs(v.delta) > Math.abs(max.delta) ? v : max));
    if (Math.abs(grootste.delta) >= EPS) return { soort: 'verschil', kop: grootste.kop, delta: grootste.delta, vorigeMaand: vorige.monthKey };
    return null;
  }
  const kosten = KOSTEN.map((kop) => ({ kop, bedrag: nu[kop] }));
  const grootste = kosten.reduce((max, k) => (k.bedrag > max.bedrag ? k : max));
  return grootste.bedrag >= EPS ? { soort: 'grootste-kost', kop: grootste.kop, bedrag: grootste.bedrag, nogTeBetalen: maand.subtotals.basis === 'bank' } : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
