/**
 * Omzet per boekjaar, uit mijlpalen — en de cash-kant ernaast, nooit erdoor.
 *
 * Omzet (ex btw) is een managementregistratie: een mijlpaal is gerealiseerd zodra `realizedOn`
 * gezet is, en telt dan in het jaar van die datum. Een niet-gerealiseerde mijlpaal is resterend
 * getekend werk en telt in het jaar van zijn geplande maand. Een mijlpaal is nooit allebei, dus
 * gerealiseerd en resterend overlappen per constructie niet.
 *
 * Facturen en betalingen raken de omzet niet. Een voorschot is geen omzet, een betaling voegt er
 * niets aan toe; ze staan hier apart als gefactureerd, ontvangen en openstaand.
 */
import type { MonthKey } from '../cashflow/types.ts';
import type { BureauData, BusinessGoals, IsoDate, Project } from './types.ts';
import { OPEN_STAGES } from './types.ts';
import { EPSILON, approvedTotal, invoiceGross, round2 } from './money.ts';
import { periodTouchesYear, quarterOf, yearOf } from './periods.ts';

const geldigeMaand = (m: string) => /^\d{4}-\d{2}$/.test(m);
const geldigeDatum = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export type MilestoneBucket = {
  projectId: string;
  clientId: string;
  milestoneId: string;
  label: string;
  year: number;
  monthKey: MonthKey;
  amount: number;
  kind: 'gerealiseerd' | 'resterend';
};

/**
 * Elke mijlpaal precies één keer, in één jaar, als gerealiseerd óf resterend. Resterende waarde
 * van een geannuleerd project is geen getekend werk meer en valt weg; wat daar al gerealiseerd
 * was, blijft. Een mijlpaal zonder geldige datum komt in `undated`, niet stil in geen enkel jaar.
 */
export function bucketMilestones(bureau: BureauData): { buckets: MilestoneBucket[]; undated: Array<{ projectId: string; milestoneId: string }> } {
  const buckets: MilestoneBucket[] = [];
  const undated: Array<{ projectId: string; milestoneId: string }> = [];
  for (const p of bureau.projects) {
    for (const m of p.milestones) {
      const basis = { projectId: p.id, clientId: p.clientId, milestoneId: m.id, label: m.label };
      if (m.realizedOn !== null) {
        if (!geldigeDatum(m.realizedOn)) { undated.push({ projectId: p.id, milestoneId: m.id }); continue; }
        buckets.push({ ...basis, year: yearOf(m.realizedOn), monthKey: m.realizedOn.slice(0, 7), amount: m.realizedAmount ?? m.amount, kind: 'gerealiseerd' });
      } else if (p.status !== 'geannuleerd') {
        if (!geldigeMaand(m.plannedMonth)) { undated.push({ projectId: p.id, milestoneId: m.id }); continue; }
        buckets.push({ ...basis, year: yearOf(m.plannedMonth), monthKey: m.plannedMonth, amount: m.amount, kind: 'resterend' });
      }
    }
  }
  return { buckets, undated };
}

export type ProjectCoverage = { projectId: string; approved: number; planned: number; delta: number };

/** Hoeveel van de goedgekeurde prijs in mijlpalen is uitgesplitst. Het verschil wordt getoond, niet opgevuld. */
export function coverage(p: Project): ProjectCoverage {
  const approved = approvedTotal(p);
  const planned = round2(p.milestones.reduce((s, m) => s + m.amount, 0));
  return { projectId: p.id, approved, planned, delta: round2(approved - planned) };
}

export type QuarterRevenue = { q: 1 | 2 | 3 | 4; target: number | null; realized: number; remainingSigned: number };

export type YearRevenue = {
  year: number;
  /** `null` = geen doelen voor dit jaar; dan bestaat er ook geen "nog te verkopen". */
  target: number | null;
  realized: number;
  remainingSigned: number;
  signedInYear: number;
  /** max(0, doel − gerealiseerd − resterend getekend). */
  stillToSell: number | null;
  /** Het bedrag boven het doel, in plaats van een negatieve verkoopopdracht. */
  aboveTarget: number | null;
  byQuarter: QuarterRevenue[];
  /** Facturen gedateerd in dit jaar. */
  invoiced: { exVat: number; inclVat: number; count: number };
  /** Betalingen ontvangen in dit jaar, incl. btw. */
  received: { amount: number; count: number };
  /** Onbetaalde facturen op `asOf`, van elk jaar — een openstaand saldo is een stand, geen jaarcijfer. */
  outstanding: { inclVat: number; count: number; overdue: { inclVat: number; count: number } };
  /** Open kansen met uitvoering of beslissing in dit jaar. Nooit gewogen. */
  unsigned: { total: number; count: number; withoutValue: number };
  coverageGaps: ProjectCoverage[];
  projectsWithoutMilestones: string[];
  undatedMilestones: number;
  /** Staat er in dit jaar minstens één mijlpaal? Zonder is 0 geen meting maar afwezigheid. */
  hasMilestones: boolean;
};

export function yearRevenue(bureau: BureauData, year: number, goals: BusinessGoals | null, asOf: IsoDate): YearRevenue {
  const { buckets, undated } = bucketMilestones(bureau);
  const inJaar = buckets.filter((b) => b.year === year);
  const som = (xs: MilestoneBucket[]) => round2(xs.reduce((s, b) => s + b.amount, 0));
  const realized = som(inJaar.filter((b) => b.kind === 'gerealiseerd'));
  const remainingSigned = som(inJaar.filter((b) => b.kind === 'resterend'));
  const signedInYear = round2(realized + remainingSigned);
  const target = goals ? goals.revenueTarget : null;

  const byQuarter: QuarterRevenue[] = ([1, 2, 3, 4] as const).map((q) => {
    const inQ = inJaar.filter((b) => quarterOf(b.monthKey) === q);
    return {
      q,
      target: goals?.quarterTargets?.[q - 1] ?? null,
      realized: som(inQ.filter((b) => b.kind === 'gerealiseerd')),
      remainingSigned: som(inQ.filter((b) => b.kind === 'resterend')),
    };
  });

  const alleFacturen = bureau.projects.flatMap((p) => p.invoices);
  const inJaarGefactureerd = alleFacturen.filter((i) => geldigeDatum(i.date) && yearOf(i.date) === year);
  const ontvangen = alleFacturen.filter((i) => i.paidOn !== null && geldigeDatum(i.paidOn) && yearOf(i.paidOn) === year);
  const open = alleFacturen.filter((i) => i.paidOn === null);
  const vervallen = open.filter((i) => geldigeDatum(i.dueDate) && i.dueDate < asOf);

  const openKansen = bureau.opportunities.filter((o) => {
    if (!OPEN_STAGES.includes(o.stage)) return false;
    if (o.expectedExecution) return periodTouchesYear(o.expectedExecution.start, o.expectedExecution.end, year);
    return o.expectedDecisionDate !== null && geldigeDatum(o.expectedDecisionDate) && yearOf(o.expectedDecisionDate) === year;
  });

  const actief = bureau.projects.filter((p) => p.status !== 'geannuleerd');
  return {
    year,
    target,
    realized,
    remainingSigned,
    signedInYear,
    stillToSell: target === null ? null : round2(Math.max(0, target - signedInYear)),
    aboveTarget: target === null ? null : round2(Math.max(0, signedInYear - target)),
    byQuarter,
    invoiced: {
      exVat: round2(inJaarGefactureerd.reduce((s, i) => s + i.amountExVat, 0)),
      inclVat: round2(inJaarGefactureerd.reduce((s, i) => s + invoiceGross(i), 0)),
      count: inJaarGefactureerd.length,
    },
    received: { amount: round2(ontvangen.reduce((s, i) => s + (i.paidAmount ?? invoiceGross(i)), 0)), count: ontvangen.length },
    outstanding: {
      inclVat: round2(open.reduce((s, i) => s + invoiceGross(i), 0)),
      count: open.length,
      overdue: { inclVat: round2(vervallen.reduce((s, i) => s + invoiceGross(i), 0)), count: vervallen.length },
    },
    unsigned: {
      total: round2(openKansen.reduce((s, o) => s + (o.expectedValue ?? 0), 0)),
      count: openKansen.length,
      withoutValue: openKansen.filter((o) => o.expectedValue === null).length,
    },
    coverageGaps: actief.map(coverage).filter((c) => Math.abs(c.delta) > EPSILON && bureau.projects.find((p) => p.id === c.projectId)!.milestones.length > 0),
    projectsWithoutMilestones: actief.filter((p) => p.milestones.length === 0).map((p) => p.id),
    undatedMilestones: undated.length,
    hasMilestones: inJaar.length > 0,
  };
}

export type NeededPerDay =
  | { kind: 'geen-gat' }
  | { kind: 'geen-doel' }
  | { kind: 'geen-capaciteit'; gap: number }
  | { kind: 'ok'; gap: number; days: number; perDay: number };

/**
 * Welke omzet per vrije klantdag nodig is om het gat te sluiten. Bij nul of negatieve vrije
 * dagen is er geen deling maar een melding: het gat past niet meer in dit jaar.
 */
export function neededPerRemainingDay(stillToSell: number | null, unallocatedClientDays: number): NeededPerDay {
  if (stillToSell === null) return { kind: 'geen-doel' };
  if (stillToSell <= EPSILON) return { kind: 'geen-gat' };
  if (unallocatedClientDays <= EPSILON) return { kind: 'geen-capaciteit', gap: stillToSell };
  return { kind: 'ok', gap: stillToSell, days: unallocatedClientDays, perDay: round2(stillToSell / unallocatedClientDays) };
}
