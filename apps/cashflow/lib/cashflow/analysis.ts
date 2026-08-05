import type { MonthData, MonthKey, MonthSnapshot, ReservationPotBalance } from './types';
import { bufferSummary } from './buffer';

/** Onder dit aantal afgesloten maanden is een trend ruis, geen signaal. */
export const TREND_THRESHOLD = 3;

/** Rollend venster voor het gemiddelde: één maand is onbetrouwbaar bij wisselende facturen. */
const BURN_WINDOW = 6;

/** Stand van de bufferpot aan het einde van een maand. */
export interface BufferPoint {
  monthKey: MonthKey;
  buffer: number;
  /** Historie is afgesloten; prognose staat nog te gebeuren. */
  isForecast: boolean;
}

export interface RunwayResult {
  /**
   * Maanden die de bufferpot het gemiddelde netto tekort dekt. `null` wanneer er geen
   * tekort is — dan bouw je op en zegt een runway niets.
   */
  months: number | null;
  buffer: number;
  /** Gemiddeld netto tekort per maand over de afgesloten maanden. */
  netBurn: number;
  closedMonths: number;
  hasEnoughData: boolean;
}

function bufferBalance(data: MonthData): number {
  return bufferSummary(data).total;
}

/**
 * Netto tekort van één maand: wat eruit ging min wat erin kwam.
 *
 * Bewust niet afgeleid uit `subtotals`. Die koppen antwoorden in de ankermaand op een
 * andere vraag — "wat moet er nog van je huidige banksaldo af" — en dragen daar de
 * volledige opgebouwde stand van elke provisiepot in plaats van de storting van die ene
 * maand. Elke afgesloten maand is per constructie zo'n ankermaand (`useAutoCloseMonth`
 * rekent één maand vanaf zijn eigen ankerstaat door), dus zou de runway systematisch een
 * tekort melden ter grootte van je opgebouwde provisies.
 *
 * Hier meten we daarom stromen: wat er deze maand aan kosten vertrekt, tegenover wat er
 * binnenkwam. De buffer blijft erbuiten — hij neemt per constructie op wat er overblijft
 * en vult aan wat er tekort is, dus zou elke maand op nul uitkomen als hij meetelde.
 * Precies die beweging is wat de runway moet verklaren.
 */
export function netBurn(data: MonthData): number {
  // Een budget telt volledig mee, ook onbesteed: het prudente model gaat ervan uit dat
  // het opgaat. Een provisie telt met de storting van deze maand, verminderd met wat een
  // finalisatie weer vrijgeeft.
  const potFlow = (p: ReservationPotBalance): number =>
    p.potType === 'maandelijks_budget'
      ? p.provisionThisMonth
      : p.provisionThisMonth - p.releasedThisMonth;

  const costs =
    data.totalRecurring +
    data.totalExpenses +
    data.totalReservationCashPayments +
    data.reservationPots.filter((p) => !p.isDeficitBuffer).reduce((s, p) => s + potFlow(p), 0) +
    data.deferredReservationAmount;

  return costs - data.totalIncome;
}

/**
 * Runway op basis van de bufferpot en het gemiddelde netto tekort van de afgesloten
 * maanden. Bewust niet "hoelang overleef ik": je vrije saldo en je provisies blijven
 * erbuiten, dus dit antwoordt op "hoelang dekt mijn buffer het gat".
 */
export function computeRunway(
  snapshots: MonthSnapshot[],
  currentMonth: MonthData | undefined,
): RunwayResult {
  const closed = [...snapshots].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const window = closed.slice(-BURN_WINDOW);
  const buffer = currentMonth ? bufferBalance(currentMonth) : 0;

  if (window.length === 0) {
    return { months: null, buffer, netBurn: 0, closedMonths: 0, hasEnoughData: false };
  }

  const average = window.reduce((s, snap) => s + netBurn(snap.data), 0) / window.length;
  const hasEnoughData = closed.length >= TREND_THRESHOLD;

  return {
    months: average > 0 ? buffer / average : null,
    buffer,
    netBurn: average,
    closedMonths: closed.length,
    hasEnoughData,
  };
}

/**
 * Bufferstand per maand: eerst de afgesloten maanden als historie, daarna het venster
 * als prognose. De grens tussen beide is waar de grafiek van doorlopend naar gestippeld
 * gaat.
 */
export function bufferSeries(
  snapshots: MonthSnapshot[],
  forecast: MonthData[],
): BufferPoint[] {
  const history = [...snapshots]
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map<BufferPoint>((snap) => ({
      monthKey: snap.monthKey,
      buffer: snap.buffer,
      isForecast: false,
    }));

  const closedKeys = new Set(history.map((h) => h.monthKey));
  const projected = forecast
    .filter((m) => !closedKeys.has(m.monthKey))
    .map<BufferPoint>((m) => ({
      monthKey: m.monthKey,
      buffer: bufferBalance(m),
      isForecast: true,
    }));

  return [...history, ...projected];
}
