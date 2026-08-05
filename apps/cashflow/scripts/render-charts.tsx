/**
 * Rendert de analyse-grafieken met synthetische data naar één HTML-bestand, zodat de
 * randgevallen op scherm te zien zijn zonder de echte store aan te raken.
 *
 *   ./apps/cashflow/node_modules/.bin/tsx apps/cashflow/scripts/render-charts.tsx [uitvoerpad]
 *
 * Het resultaat is een los HTML-bestand dat je in de browser opent. Bewust geen route in
 * de app: deze scenario's horen niet mee te reizen naar productie, en de echte store mag
 * er niet voor aangepast worden.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { BufferChart } from '../components/cashflow/BufferChart';
import { WaterfallChart } from '../components/cashflow/WaterfallChart';
import { VarianceChart } from '../components/cashflow/VarianceChart';
import { RunwayCard } from '../components/cashflow/RunwayCard';
import { calculateMonths } from '../lib/cashflow/calculator';
import { buildSnapshot } from '../lib/cashflow/snapshot';
import type {
  BufferPoint,
} from '../lib/cashflow/analysis';
import type {
  MonthSnapshot,
  RecurringItem,
  ReservationItem,
  IncomeItem,
} from '../lib/cashflow/types';

const ROOT = new URL('..', import.meta.url).pathname;

// ── Data ──────────────────────────────────────────────────────────────────────

const HUUR: RecurringItem = {
  id: 'huur', label: 'Huur', amount: 1200, type: 'expense', frequency: 'monthly', startMonth: '2026-01',
};
const BUFFER: ReservationItem = {
  id: 'buf', label: 'Buffer', monthlyAmount: 500, startMonth: '2026-01', type: 'spaardoel', coversDeficit: true,
};
const BTW: ReservationItem = {
  id: 'btw', label: 'Btw', monthlyAmount: 900, startMonth: '2026-01', type: 'spaardoel',
};
const BOODSCHAPPEN: ReservationItem = {
  id: 'bood', label: 'Boodschappen', monthlyAmount: 400, startMonth: '2026-01', type: 'maandelijks_budget',
};

const maanden = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => {
    const m = ((from + i) % 12) + 1;
    const jaar = 2026 + Math.floor((from + i) / 12);
    return `${jaar}-${String(m).padStart(2, '0')}`;
  });

function inkomen(keys: string[], bedrag: (i: number) => number): IncomeItem[] {
  return keys.map((monthKey, i) => ({
    id: `i-${i}`, monthKey, label: 'omzet', amount: bedrag(i), received: false,
  }));
}

// Een maand met een negatief eindsaldo: veel kosten, weinig inkomen, kleine pot.
const magereMaand = calculateMonths(
  '2026-03', 800, [{ id: 'e', monthKey: '2026-03', label: 'boete', amount: 900, paid: false }],
  inkomen(['2026-03'], () => 500), [HUUR], [BTW], [], [], [], [], [], 1,
)[0]!;

// Een normale maand met een actieve bufferpot.
const goedeMaand = calculateMonths(
  '2026-06', 9000, [], inkomen(['2026-06'], () => 6000),
  [HUUR], [BUFFER, BTW, BOODSCHAPPEN], [], [], [], [], [], 1,
)[0]!;

// Bufferreeks die door nul zakt — de stand die vroeger buiten de viewBox viel.
const doorNul: BufferPoint[] = [
  { monthKey: '2026-01', buffer: 1800, isForecast: false },
  { monthKey: '2026-02', buffer: 1200, isForecast: false },
  { monthKey: '2026-03', buffer: 300, isForecast: false },
  { monthKey: '2026-04', buffer: -450, isForecast: false },
  { monthKey: '2026-05', buffer: -900, isForecast: true },
  { monthKey: '2026-06', buffer: -1400, isForecast: true },
];

// Achttien maanden historie: de x-as die vroeger dichtsmeerde.
const langeReeks: BufferPoint[] = maanden(18).map((monthKey, i) => ({
  monthKey,
  buffer: 500 + i * 320,
  isForecast: i > 13,
}));

// Snapshots voor de bullet charts. Bewust met echte afwijkingen: de huur valt duurder
// uit dan begroot, de btw-pot krijgt minder gestort dan gepland, en er zit één categorie
// bij die zó weinig afwijkt dat de balk bijna onzichtbaar wordt.
const KLEIN: RecurringItem = {
  id: 'klein', label: 'Domeinnaam', amount: 40, type: 'expense', frequency: 'monthly', startMonth: '2026-01',
};
const historie: MonthSnapshot[] = maanden(4).map((mk, i) => {
  const [data] = calculateMonths(
    mk, 5000 + i * 100, [], inkomen([mk], () => 4000 + i * 250),
    [HUUR, KLEIN], [BTW, BOODSCHAPPEN],
    [{ id: `p-${i}`, reservationId: 'bood', monthKey: mk, label: 'winkel',
       invoiceAmount: 380 - i * 15, fromReservation: 380 - i * 15, fromCash: 0 }],
    [],
    [
      { id: `rs-${i}`, recurringId: 'huur', monthKey: mk, paid: true, actualAmount: 1200 + i * 140 },
      { id: `rk-${i}`, recurringId: 'klein', monthKey: mk, paid: true, actualAmount: 41 },
    ],
    [],
    [{ id: `ps-${i}`, reservationId: 'btw', monthKey: mk, effectiveAmount: 900 - i * 120, finalized: false }],
    1,
  );
  return buildSnapshot(data!, '2026-01-01T00:00:00.000Z');
});

// ── Renderen ──────────────────────────────────────────────────────────────────

const blokken: Array<[string, string]> = [
  ['Runway — normaal', renderToStaticMarkup(h(RunwayCard, {
    runway: { months: 4.2, buffer: 6300, netBurn: 1500, closedMonths: 5, hasEnoughData: true },
  }))],
  ['Runway — geen tekort', renderToStaticMarkup(h(RunwayCard, {
    runway: { months: null, buffer: 6300, netBurn: -400, closedMonths: 5, hasEnoughData: true },
  }))],
  ['Runway — negatieve bufferstand (randgeval)', renderToStaticMarkup(h(RunwayCard, {
    runway: { months: -0.67, buffer: -400, netBurn: 600, closedMonths: 5, hasEnoughData: true },
  }))],
  ['Waterfall — normale maand met buffer', renderToStaticMarkup(h(WaterfallChart, { month: goedeMaand }))],
  ['Waterfall — negatief eindsaldo (randgeval)', renderToStaticMarkup(h(WaterfallChart, { month: magereMaand }))],
  ['Bufferopbouw — door nul heen (randgeval)', renderToStaticMarkup(h(BufferChart, {
    points: doorNul, closedMonths: 4,
  }))],
  ['Bufferopbouw — 18 maanden, labeldichtheid (randgeval)', renderToStaticMarkup(h(BufferChart, {
    points: langeReeks, closedMonths: 14,
  }))],
  ['Begroot tegenover werkelijk — bullet charts', renderToStaticMarkup(h(VarianceChart, {
    snapshots: historie,
  }))],
];

// De echte gebouwde stylesheet, niet een benadering: alleen daar staan zowel de
// Tailwind-klassen als de umanex-variabelen in. Draai `pnpm --filter cashflow build`
// als dit bestand nog niet bestaat.
const cssDir = `${ROOT}.next/static/css`;
const cssFiles = readdirSync(cssDir).filter((f) => f.endsWith('.css'));
if (cssFiles.length === 0) throw new Error(`Geen gebouwde CSS in ${cssDir} — eerst builden.`);
const css = cssFiles.map((f) => readFileSync(`${cssDir}/${f}`, 'utf8')).join('\n');

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8">
<title>Cashflow — grafieken op scherm</title>
<style>${css}</style>
<style>body{background:#f6f6f7;padding:24px;font-family:system-ui,sans-serif}
h2{font:600 13px/1.4 system-ui;color:#666;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em}
.wrap{max-width:860px;margin:0 auto}</style>
</head><body><div class="wrap">
${blokken.map(([titel, markup]) => `<h2>${titel}</h2>${markup}`).join('\n')}
</div></body></html>`;

const out = process.argv[2] ?? `${ROOT}.charts-preview.html`;
writeFileSync(out, html);
console.log('geschreven:', out);
