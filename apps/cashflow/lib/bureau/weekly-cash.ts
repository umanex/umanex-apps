/**
 * Dertien weken Vrij (geld buiten elke pot), als verdeling van de maandrekenkern — geen tweede rekenkern.
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
 * - een opname uit de bufferpot valt in diezelfde eerste week: de pot dekt het tekort op het
 *   moment dat de kosten het maken, zoals de rekenkern hem in dezelfde maand gebruikt. Opbouw
 *   van de pot veegt op maandeinde, dus in de laatste week. (Tot 2026-09-17 viel ook een opname
 *   in de laatste week; dan stond de weektabel een hele maand lager dan de rekenkern rekent.)
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
import { bufferSummary } from '../cashflow/buffer.ts';
import { potStandAtStart, type PotStand } from '../cashflow/subtotals.ts';
import type { BureauData, IsoDate, WeekKey } from './types.ts';
import { EPSILON, invoiceGross, round2 } from './money.ts';
import { endOfMonth, parseISO } from 'date-fns';
import { firstWeekOfMonth, isoWeekKey, lastWeekOfMonth, maxWeek, monthOf, toIsoDate, weekRange, weeksFrom } from './periods.ts';

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

/**
 * Een maandeinde zoals de rekenkern het uitrekent — zonder aanname over timing binnen de maand.
 *
 * Twee woorden, overal in de app dezelfde: **Vrij** is geld buiten elke pot (`closingFree`,
 * het eindsaldo), **Buffer** is vrij plus de bufferpot (`buffer`, gelijk aan de footer op `/`).
 * Zolang een tekort de pot leegt vallen ze samen; in een maand waarin het overschot in de pot
 * landt staat Vrij op € 0 en draagt de Buffer het echte kussen.
 */
export type MonthEnd = { monthKey: MonthKey; closingFree: number; bufferPot: number; buffer: number };

export type WeeklyCashPlan = {
  asOf: IsoDate;
  /** `reserved` = `provisions` + `buffer`: wat bij de start in de potten zit, uitgesplitst voor de brug. */
  position: { bank: number; reserved: number; provisions: number; buffer: number; free: number };
  /** De maandeinden die binnen de horizon vallen; een maand die na de laatste week eindigt, telt niet mee. */
  monthEnds: MonthEnd[];
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

/** Wat er bij de start van de ankermaand al in de potten zit; de afleiding staat bij de provisiekop. */
export function reservedAtStart(anchor: MonthData): PotStand {
  return potStandAtStart(anchor.reservationPots);
}

const lastDayOfMonth = (m: MonthKey): IsoDate => toIsoDate(endOfMonth(parseISO(`${m}-01`)));

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
    const bufferBeweging = isAnchor ? s.buffer - reserved.buffer : s.buffer;
    if (bufferBeweging < 0) kop('buffer', 'Uit bufferpot', bufferBeweging, first);
    else kop('buffer', 'Naar bufferpot', bufferBeweging, last);
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

  const horizonEnd = weekRange(lastWeek).to;
  const monthEnds: MonthEnd[] = horizonMonths
    .filter((m) => lastDayOfMonth(m.monthKey) <= horizonEnd)
    .map((m) => {
      const b = bufferSummary(m);
      return { monthKey: m.monthKey, closingFree: round2(m.endBalance), bufferPot: round2(b.total), buffer: round2(b.position) };
    });

  return {
    asOf,
    position: { bank, reserved: reservedTotal, provisions: reserved.provisions, buffer: reserved.buffer, free: round2(bank - reservedTotal) },
    monthEnds,
    weeks,
    beyondHorizon,
    unplaced: unplaced.sort((a, b) => (a.expectedPaymentDate ?? a.dueDate).localeCompare(b.expectedPaymentDate ?? b.dueDate)),
    mismatches,
    reconciliation,
  };
}

/**
 * Geen banksaldo, geen regel in een week en geen open factuur: er valt niets te verdelen. Eén
 * afleiding, want drie schermen (`/bureau`, `/bureau/cash` en de antwoordkaart op `/`) moeten
 * dezelfde lege staat tonen in plaats van elk een rij nullen.
 */
export function isEmptyPlan(plan: WeeklyCashPlan): boolean {
  return plan.position.bank === 0 && plan.weeks.every((w) => w.lines.length === 0) && plan.unplaced.length === 0;
}

/** De maanden waarvan de weken niet optellen tot de rekenkern. Leeg = de verdeling klopt. */
export function verifyReconciliation(plan: WeeklyCashPlan): MonthReconciliation[] {
  return plan.reconciliation.filter((r) => Math.abs(r.delta) > EPSILON);
}

/**
 * Het kopgetal: de laagste **Buffer** aan een maandeinde binnen de horizon. Rekent zonder
 * aanname over wanneer een kost of inkomst binnen de maand valt — dat is de rekenkern zelf.
 * Op de Buffer en niet op Vrij: in een maand waarin het overschot in de pot landt staat Vrij
 * op € 0, en dan zou "laagste punt" een gezonde maand aanwijzen (beslissing 2026-09-17).
 * `null` zonder volledig gedekte maand.
 */
export function lowestMonthEnd(plan: WeeklyCashPlan): MonthEnd | null {
  return plan.monthEnds.reduce<MonthEnd | null>((min, m) => (min === null || m.buffer < min.buffer ? m : min), null);
}

/**
 * De laagste stand in de weektabel, in Vrij — een week kent geen pot. Die leunt op de
 * verdeelregel — kosten, provisies en een opname uit de bufferpot vroeg, losse inkomsten laat,
 * facturen op hun datum, opbouw van de pot op maandeinde — en is dus een aanname over timing, geen
 * voorspelling. Vergelijk hem met het vrije maandeinde (`closingFree`), niet met de Buffer. Meestal
 * staat hij lager, maar niet altijd: valt de opbouw van een maand in dezelfde week als een factuur
 * van de volgende, dan sluit geen enkele week op dat maandeinde. `null` zonder weken.
 */
export function lowestFree(plan: WeeklyCashPlan): { weekKey: WeekKey; closingFree: number } | null {
  return plan.weeks.reduce<{ weekKey: WeekKey; closingFree: number } | null>(
    (min, w) => (min === null || w.closingFree < min.closingFree ? { weekKey: w.weekKey, closingFree: w.closingFree } : min),
    null,
  );
}
