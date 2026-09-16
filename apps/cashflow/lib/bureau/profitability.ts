/**
 * Rendement per project, in twee maten die niet met elkaar vergeleken worden.
 *
 *   A = goedgekeurde prijs ÷ (bestede + verwachte resterende eigen dagen)
 *   B = (goedgekeurde prijs − directe externe kosten) ÷ dezelfde dagen
 *
 * B is géén nettowinst: algemene bedrijfskosten zitten er niet in. A hoort naast het doel voor
 * omzet per dag, B alleen naast een apart ingesteld doel.
 *
 * Een afgerond project rekent met werkelijke uren (niets meer resterend) en werkelijke externe
 * kosten. Ontbreekt een getal dat de deling nodig heeft, dan is de uitkomst "onvoldoende
 * gegevens" met de reden — nooit een deling door nul en nooit een bedrag dat er gezond uitziet.
 */
import type { Project, TimeEntry } from './types.ts';
import { EPSILON, approvedTotal, round2 } from './money.ts';

export type Metric = { kind: 'ok'; value: number } | { kind: 'onvoldoende-gegevens'; reason: string };

/** Dagen van één registratie, met de uren-per-dag die bij registratie gold. */
export function entryDays(e: TimeEntry): number {
  return e.hoursPerDayAtEntry > 0 ? e.hours / e.hoursPerDayAtEntry : 0;
}

export type ProjectProfitability = {
  projectId: string;
  approvedTotal: number;
  spentHours: number;
  spentDays: number;
  /** `null` = onbekend (geen raming); 0 bij een afgerond project. */
  remainingHours: number | null;
  remainingDays: number | null;
  totalDays: number | null;
  external: { basis: 'verwacht' | 'werkelijk'; amount: number | null; missingActual: string[] };
  A: Metric;
  B: Metric;
  hours: {
    /** Begroot plus de extra uren van goedgekeurde uitbreidingen. */
    budgeted: number | null;
    expectedTotal: number | null;
    /** (besteed + resterend) ÷ begroot. */
    ratio: number | null;
    overrun: number | null;
  };
};

export function projectProfitability(p: Project, entries: TimeEntry[], hoursPerDayNow: number): ProjectProfitability {
  const eigen = entries.filter((e) => e.projectId === p.id && e.category === 'klantwerk');
  const spentHours = round2(eigen.reduce((s, e) => s + e.hours, 0));
  const spentDays = eigen.reduce((s, e) => s + entryDays(e), 0);
  const afgerond = p.status === 'afgerond';

  const remainingHours = afgerond ? 0 : p.expectedRemainingOwnHours;
  const remainingDays = remainingHours === null ? null : hoursPerDayNow > 0 ? remainingHours / hoursPerDayNow : null;
  const totalDays = remainingDays === null ? null : spentDays + remainingDays;
  const approved = approvedTotal(p);

  const basis = afgerond ? 'werkelijk' : 'verwacht';
  const missingActual = afgerond ? p.externalCosts.filter((c) => c.actual === null).map((c) => c.label || '(zonder omschrijving)') : [];
  const externalAmount = missingActual.length > 0
    ? null
    : round2(p.externalCosts.reduce((s, c) => s + (afgerond ? (c.actual ?? 0) : c.expected), 0));

  const dagenReden = (): string | null => {
    if (totalDays === null) return 'verwachte resterende uren ontbreken';
    if (totalDays <= EPSILON) return spentHours > 0 ? 'geen eigen dagen' : 'nog geen uren en niets meer verwacht';
    return null;
  };
  const reden = dagenReden();
  const A: Metric = reden ? { kind: 'onvoldoende-gegevens', reason: reden } : { kind: 'ok', value: round2(approved / totalDays!) };
  const B: Metric = reden
    ? { kind: 'onvoldoende-gegevens', reason: reden }
    : externalAmount === null
      ? { kind: 'onvoldoende-gegevens', reason: `werkelijke externe kost ontbreekt: ${missingActual.join(', ')}` }
      : { kind: 'ok', value: round2((approved - externalAmount) / totalDays!) };

  const extraUren = p.extensions.reduce((s, e) => s + (e.extraBudgetedHours ?? 0), 0);
  const budgeted = p.budgetedOwnHours === null ? null : round2(p.budgetedOwnHours + extraUren);
  const expectedTotal = remainingHours === null ? null : round2(spentHours + remainingHours);

  return {
    projectId: p.id,
    approvedTotal: approved,
    spentHours,
    spentDays: round2(spentDays),
    remainingHours,
    remainingDays: remainingDays === null ? null : round2(remainingDays),
    totalDays: totalDays === null ? null : round2(totalDays),
    external: { basis, amount: externalAmount, missingActual },
    A,
    B,
    hours: {
      budgeted,
      expectedTotal,
      ratio: budgeted !== null && budgeted > EPSILON && expectedTotal !== null ? round2(expectedTotal / budgeted) : null,
      overrun: budgeted !== null && expectedTotal !== null ? round2(Math.max(0, expectedTotal - budgeted)) : null,
    },
  };
}

export type YieldSummary = {
  /** Projecten waarvoor A berekenbaar is, samen: Σ prijs ÷ Σ dagen. */
  A: Metric;
  B: Metric;
  included: number;
  insufficient: Array<{ projectId: string; reason: string }>;
};

/**
 * Het rendement over een groep projecten — gewogen naar dagen, niet een gemiddelde van
 * gemiddelden. Een project zonder voldoende gegevens telt niet mee en staat bij naam in
 * `insufficient`, zodat een mooi gemiddelde niet verbergt dat de helft ontbreekt.
 */
export function yieldSummary(rows: ProjectProfitability[]): YieldSummary {
  const metA = rows.filter((r) => r.A.kind === 'ok' && r.totalDays !== null);
  const metB = rows.filter((r) => r.B.kind === 'ok' && r.totalDays !== null && r.external.amount !== null);
  const dagen = (xs: ProjectProfitability[]) => xs.reduce((s, r) => s + (r.totalDays ?? 0), 0);
  const insufficient = rows.filter((r) => r.A.kind !== 'ok').map((r) => ({ projectId: r.projectId, reason: (r.A as { reason: string }).reason }));
  return {
    A: metA.length && dagen(metA) > EPSILON
      ? { kind: 'ok', value: round2(metA.reduce((s, r) => s + r.approvedTotal, 0) / dagen(metA)) }
      : { kind: 'onvoldoende-gegevens', reason: rows.length ? 'geen project met uren en een raming' : 'geen projecten' },
    B: metB.length && dagen(metB) > EPSILON
      ? { kind: 'ok', value: round2(metB.reduce((s, r) => s + r.approvedTotal - (r.external.amount ?? 0), 0) / dagen(metB)) }
      : { kind: 'onvoldoende-gegevens', reason: rows.length ? 'geen project met uren, een raming en externe kosten' : 'geen projecten' },
    included: metA.length,
    insufficient,
  };
}
