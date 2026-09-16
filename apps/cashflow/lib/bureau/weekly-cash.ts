/**
 * Dertien weken vrije cash, als verdeling van de maandrekenkern — geen tweede rekenkern.
 *
 * De maandtotalen komen uit `calculateMonths` (ankermaand = de maand van vandaag). Deze module
 * beslist alleen in wélke week een maandbedrag valt:
 *
 * - een inkomstenpost die aan een factuur hangt, valt in de week van de verwachte betaaldatum
 *   (of de vervaldatum). Is die datum voorbij, dan wordt ze niet ingepland maar apart gemeld —
 *   nooit stil "deze week";
 * - een losse inkomstenpost valt in de laatste week van haar maand;
 * - vaste kosten, eenmalige uitgaven, budgetten en provisies vallen in de eerste week van hun
 *   maand, en in de ankermaand nooit vóór deze week;
 * - de bufferpot veegt op maandeinde, dus in de laatste week.
 *
 * Vrij = bank − gereserveerd. In de ankermaand zit de potstand bij de start al in het banksaldo
 * én in de provisiekop van de rekenkern; hij gaat er één keer af, in de openingsstand
 * (`reservedAtStart`), en de provisieregel draagt enkel de rest. Zo tellen de weken per maand
 * exact terug op tot de maandbeweging van de rekenkern — `verifyReconciliation` toetst dat.
 *
 * Een factuur telt nooit naast haar post: de post is het bedrag, de factuur geeft de datum.
 * Een open factuur zonder post staat niet in de prognose en dus ook niet in de weken; ze wordt
 * gemeld. De cashbehoefte uit de doelen is een aanname en komt hier nergens in.
 */
import type { IncomeItem, MonthData, MonthKey } from '../cashflow/types.ts';
import type { BureauData, IsoDate, WeekKey } from './types.ts';
import { EPSILON, invoiceGross, round2 } from './money.ts';
import { firstWeekOfMonth, isoWeekKey, lastWeekOfMonth, maxWeek, monthOf, weekRange, weeksFrom } from './periods.ts';

export const HORIZON_WEEKS = 13;

export type CashLineSource = 'factuur' | 'post' | 'vaste-kosten' | 'eenmalig' | 'budgetten' | 'provisies' | 'buffer';

export type CashLine = {
  monthKey: MonthKey;
  source: CashLineSource;
  label: string;
  /** Positief = ontvangst, of een opname die uit een pot terug vrij komt. Negatief = uitgave, of een storting in een pot. */
  amount: number;
  /** Op een datum geplaatst (factuur), of volgens de maandregel. */
  dated: boolean;
  /** De datum waarop een gedateerde regel valt. */
  on: IsoDate | null;
  invoice: { projectId: string; invoiceId: string } | null;
};

export type WeekRow = {
  weekKey: WeekKey;
  from: IsoDate;
  to: IsoDate;
  openingFree: number;
  receipts: number;
  outflows: number;
  /** Netto naar potten: provisies en buffer. Negatief = een opname die terug vrij komt. */
  toReserved: number;
  closingFree: number;
  lines: CashLine[];
};

export type UnplacedReason =
  /** Vervaldatum voorbij, geen verwachte betaaldatum: wanneer het geld komt, is onbekend. */
  | 'achterstallig-zonder-datum'
  /** De verwachte betaaldatum zelf is voorbij. */
  | 'verwachte-datum-verstreken'
  /** Open factuur zonder post in de prognose. */
  | 'niet-in-prognose'
  /** De post staat in een voorbije maand die niet meer doorgerekend wordt. */
  | 'post-in-verleden';

export type UnplacedInvoice = {
  reason: UnplacedReason;
  projectId: string;
  invoiceId: string;
  label: string;
  /** Incl. btw. */
  amount: number;
  dueDate: IsoDate;
  expectedPaymentDate: IsoDate | null;
  /** Zit het bedrag in de maandtotalen van de rekenkern? Alleen dan telt het mee in de reconciliatie. */
  inForecast: boolean;
  /** De maand van de post, als die er is. */
  monthKey: MonthKey | null;
};

export type LedgerMismatch = { projectId: string; invoiceId: string; label: string; invoiceMonth: MonthKey; itemMonth: MonthKey };

export type MonthReconciliation = {
  monthKey: MonthKey;
  /** Wat de rekenkern deze maand aan vrij saldo laat bewegen. */
  engineMovement: number;
  placed: number;
  unplaced: number;
  beyondHorizon: number;
  delta: number;
};

export type WeeklyCashPlan = {
  asOf: IsoDate;
  position: { bank: number; reserved: number; free: number };
  weeks: WeekRow[];
  beyondHorizon: CashLine[];
  unplaced: UnplacedInvoice[];
  mismatches: LedgerMismatch[];
  reconciliation: MonthReconciliation[];
};

export type WeeklyCashInput = {
  asOf: IsoDate;
  /** Doorgerekende maanden, te beginnen bij de maand van `asOf`. */
  months: MonthData[];
  /** Alle inkomstenposten van de store — ook die van voorbije maanden, om een verloren post te herkennen. */
  incomeItems: IncomeItem[];
  bureau: BureauData;
};

type PotSplit = { provisions: number; buffer: number };

/**
 * Wat er bij de start van de ankermaand al in de potten zit, na wat er deze maand al uit
 * betaald is. Dezelfde potten als de provisiekop van `computeMonthSubtotals`: spaardoelen, niet
 * gefinaliseerd.
 */
export function reservedAtStart(anchor: MonthData): PotSplit {
  const split: PotSplit = { provisions: 0, buffer: 0 };
  for (const p of anchor.reservationPots) {
    if (p.potType !== 'spaardoel' || p.finalized) continue;
    const paid = p.paymentsThisMonth.reduce((s, x) => s + x.fromReservation, 0);
    const stand = Math.max(0, p.deferredFromPrevious - paid);
    if (p.isDeficitBuffer) split.buffer += stand;
    else split.provisions += stand;
  }
  return { provisions: round2(split.provisions), buffer: round2(split.buffer) };
}

export function buildWeeklyCashPlan({ asOf, months, incomeItems, bureau }: WeeklyCashInput): WeeklyCashPlan {
  const weekKeys = weeksFrom(asOf, HORIZON_WEEKS);
  const firstWeek = weekKeys[0]!;
  const lastWeek = weekKeys[weekKeys.length - 1]!;
  const anchorMonth = monthOf(asOf);
  const horizonMonths = months.filter((m) => m.monthKey >= anchorMonth);
  const anchor = horizonMonths.find((m) => m.monthKey === anchorMonth);
  const itemById = new Map(incomeItems.map((i) => [i.id, i]));

  const placedByWeek = new Map<WeekKey, CashLine[]>(weekKeys.map((w) => [w, []]));
  const beyondHorizon: CashLine[] = [];
  const unplaced: UnplacedInvoice[] = [];
  const mismatches: LedgerMismatch[] = [];

  const place = (week: WeekKey, line: CashLine) => {
    if (line.amount === 0) return;
    const w = maxWeek(week, firstWeek);
    if (w > lastWeek) beyondHorizon.push(line);
    else placedByWeek.get(w)!.push(line);
  };

  // Facturen per gekoppelde post, en de open facturen die nergens in de prognose staan.
  const invoiceByItem = new Map<string, { projectId: string; invoice: BureauData['projects'][number]['invoices'][number] }>();
  for (const p of bureau.projects) {
    for (const inv of p.invoices) {
      if (inv.paidOn !== null) continue;
      const item = inv.incomeItemId ? itemById.get(inv.incomeItemId) : undefined;
      const basis = { projectId: p.id, invoiceId: inv.id, label: inv.label, dueDate: inv.dueDate, expectedPaymentDate: inv.expectedPaymentDate };
      if (!item) {
        unplaced.push({ ...basis, reason: 'niet-in-prognose', amount: invoiceGross(inv), inForecast: false, monthKey: null });
      } else if (item.monthKey < anchorMonth) {
        unplaced.push({ ...basis, reason: 'post-in-verleden', amount: item.amount, inForecast: false, monthKey: item.monthKey });
      } else {
        invoiceByItem.set(item.id, { projectId: p.id, invoice: inv });
      }
    }
  }

  const reserved = anchor ? reservedAtStart(anchor) : { provisions: 0, buffer: 0 };

  for (const m of horizonMonths) {
    const isAnchor = m.monthKey === anchorMonth;
    const first = firstWeekOfMonth(m.monthKey);
    const last = lastWeekOfMonth(m.monthKey);

    for (const item of m.incomeItems) {
      const linked = invoiceByItem.get(item.id);
      if (!linked) {
        place(last, { monthKey: m.monthKey, source: 'post', label: item.label, amount: item.amount, dated: false, on: null, invoice: null });
        continue;
      }
      const inv = linked.invoice;
      const ref = { projectId: linked.projectId, invoiceId: inv.id };
      const datum = inv.expectedPaymentDate ?? inv.dueDate;
      if (datum < asOf) {
        unplaced.push({
          reason: inv.expectedPaymentDate ? 'verwachte-datum-verstreken' : 'achterstallig-zonder-datum',
          ...ref, label: inv.label, amount: item.amount, dueDate: inv.dueDate, expectedPaymentDate: inv.expectedPaymentDate,
          inForecast: true, monthKey: m.monthKey,
        });
        continue;
      }
      if (monthOf(datum) !== m.monthKey) {
        mismatches.push({ ...ref, label: inv.label, invoiceMonth: monthOf(datum), itemMonth: m.monthKey });
        place(last, { monthKey: m.monthKey, source: 'factuur', label: inv.label, amount: item.amount, dated: false, on: null, invoice: ref });
        continue;
      }
      place(isoWeekKey(datum), { monthKey: m.monthKey, source: 'factuur', label: inv.label, amount: item.amount, dated: true, on: datum, invoice: ref });
    }

    const s = m.subtotals;
    const kop = (source: CashLineSource, label: string, amount: number, week: WeekKey) =>
      place(week, { monthKey: m.monthKey, source, label, amount: -round2(amount), dated: false, on: null, invoice: null });
    kop('vaste-kosten', 'Vaste kosten', s.recurring, first);
    kop('eenmalig', 'Eenmalige uitgaven', s.oneOff, first);
    kop('budgetten', 'Budgetten', s.budgets, first);
    kop('provisies', 'Naar provisies', isAnchor ? s.provisions - reserved.provisions : s.provisions, first);
    kop('buffer', 'Naar buffer', isAnchor ? s.buffer - reserved.buffer : s.buffer, last);
  }

  const bank = anchor ? round2(anchor.startBalance) : 0;
  const reservedTotal = round2(reserved.provisions + reserved.buffer);
  let running = round2(bank - reservedTotal);

  const weeks: WeekRow[] = weekKeys.map((w) => {
    const lines = placedByWeek.get(w)!;
    const sum = (pred: (l: CashLine) => boolean) => round2(lines.filter(pred).reduce((acc, l) => acc + l.amount, 0));
    const receipts = sum((l) => l.source === 'factuur' || l.source === 'post');
    const outflows = -sum((l) => l.source === 'vaste-kosten' || l.source === 'eenmalig' || l.source === 'budgetten');
    const toReserved = -sum((l) => l.source === 'provisies' || l.source === 'buffer');
    const openingFree = running;
    const closingFree = round2(openingFree + receipts - outflows - toReserved);
    running = closingFree;
    const { from, to } = weekRange(w);
    return { weekKey: w, from, to, openingFree, receipts, outflows: round2(outflows), toReserved: round2(toReserved), closingFree, lines };
  });

  const reconciliation: MonthReconciliation[] = horizonMonths.map((m) => {
    const isAnchor = m.monthKey === anchorMonth;
    const engineMovement = round2(m.endBalance - (isAnchor ? m.startBalance - reservedTotal : m.startBalance));
    const ofMonth = (l: CashLine) => l.monthKey === m.monthKey;
    const placed = round2(weeks.flatMap((w) => w.lines).filter(ofMonth).reduce((a, l) => a + l.amount, 0));
    const open = round2(unplaced.filter((u) => u.inForecast && u.monthKey === m.monthKey).reduce((a, u) => a + u.amount, 0));
    const later = round2(beyondHorizon.filter(ofMonth).reduce((a, l) => a + l.amount, 0));
    return { monthKey: m.monthKey, engineMovement, placed, unplaced: open, beyondHorizon: later, delta: round2(engineMovement - placed - open - later) };
  });

  return {
    asOf,
    position: { bank, reserved: reservedTotal, free: round2(bank - reservedTotal) },
    weeks,
    beyondHorizon,
    unplaced: unplaced.sort((a, b) => (a.expectedPaymentDate ?? a.dueDate).localeCompare(b.expectedPaymentDate ?? b.dueDate)),
    mismatches,
    reconciliation,
  };
}

/** De maanden waarvan de weken niet optellen tot de rekenkern. Leeg = de verdeling klopt. */
export function verifyReconciliation(plan: WeeklyCashPlan): MonthReconciliation[] {
  return plan.reconciliation.filter((r) => Math.abs(r.delta) > EPSILON);
}

/** De laagste verwachte vrije stand in de horizon, met zijn week. `null` zonder weken. */
export function lowestFree(plan: WeeklyCashPlan): { weekKey: WeekKey; closingFree: number } | null {
  return plan.weeks.reduce<{ weekKey: WeekKey; closingFree: number } | null>(
    (min, w) => (min === null || w.closingFree < min.closingFree ? { weekKey: w.weekKey, closingFree: w.closingFree } : min),
    null,
  );
}
