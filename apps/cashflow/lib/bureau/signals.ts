/**
 * Signalen: wat aandacht vraagt, afgeleid uit de andere modules en de drempels in de doelen.
 *
 * Een signaal dat uitgeschakeld is, verschijnt niet — maar telt mee in `disabled`, zodat een lege
 * lijst leesbaar blijft als "niets aan de hand" of "niets bewaakt". Ontbrekende gegevens zijn
 * nooit "in orde": ze worden `onzeker`, met wat er ontbreekt en waar je het invult.
 */
import type { BusinessGoals, IsoDate, Opportunity, Project, SignalThresholds } from './types.ts';
import type { YearRevenue } from './revenue.ts';
import type { YearCapacity, WeekCapacity } from './capacity.ts';
import type { WeeklyCashPlan } from './weekly-cash.ts';
import type { Concentration } from './concentration.ts';
import type { ProjectProfitability } from './profitability.ts';
import { neededPerRemainingDay } from './revenue.ts';
import { lowestFree, verifyReconciliation } from './weekly-cash.ts';
import { defaultGoals, revenuePerDayTarget } from './goals.ts';
import { EPSILON, round2 } from './money.ts';

export const SIGNAL_LEVELS = ['kritiek', 'let-op', 'onzeker', 'info'] as const;
export type SignalLevel = (typeof SIGNAL_LEVELS)[number];

export type Signal = {
  /** Stabiel per soort (en per project of klant waar er meer kunnen zijn). */
  id: string;
  level: SignalLevel;
  title: string;
  detail: string;
  href: string;
};

export type SignalInputs = {
  year: number;
  asOf: IsoDate;
  goals: BusinessGoals | null;
  revenue: YearRevenue;
  capacity: YearCapacity | null;
  /** De komende weken tegenover het weekplafond; `null` zonder doelen voor het huidige jaar. */
  weeks: WeekCapacity[] | null;
  cash: WeeklyCashPlan | null;
  /** Vooruitblik-basis: gerealiseerd plus resterend getekend. */
  concentration: Concentration;
  projects: Project[];
  profitability: ProjectProfitability[];
  overdueActions: Array<{ opportunity: Opportunity; daysOverdue: number }>;
  withoutNextAction: Opportunity[];
  /** Afwijkingen in de doelen zelf (dagen, kwartalen); `null` zonder doelen. */
  goalDeviations: { days: number; quarters: number | null } | null;
  /** Bedragen als tekst, in de notatie van de app. */
  money: (n: number) => string;
  days: (n: number) => string;
  percent: (share: number) => string;
  weekLabel: (weekKey: string) => string;
};

export type SignalResult = { signals: Signal[]; disabled: Array<keyof SignalThresholds> };

const ORDER: Record<SignalLevel, number> = { kritiek: 0, 'let-op': 1, onzeker: 2, info: 3 };

export function computeSignals(i: SignalInputs): SignalResult {
  const thresholds: SignalThresholds = i.goals?.signals ?? defaultGoals(i.year).signals;
  const disabled = (Object.keys(thresholds) as Array<keyof SignalThresholds>).filter((k) => !thresholds[k].enabled);
  const out: Signal[] = [];
  const add = (s: Signal) => out.push(s);

  if (!i.goals) {
    add({
      id: 'geen-doelen',
      level: 'onzeker',
      title: `Geen doelen voor ${i.year}`,
      detail: 'Zonder omzetdoel, dagbudget en klantlimiet vallen omzetgat, capaciteit en concentratie niet te toetsen. De andere signalen gebruiken standaarddrempels.',
      href: '/bureau/doelen',
    });
  }

  // ── Cash ──
  if (thresholds.negativeCash.enabled && i.cash) {
    const laagste = lowestFree(i.cash);
    if (laagste && laagste.closingFree < thresholds.negativeCash.floor - EPSILON) {
      add({
        id: 'cash-negatief',
        level: 'kritiek',
        title: thresholds.negativeCash.floor === 0 ? 'Vrije cash wordt negatief' : `Vrije cash onder ${i.money(thresholds.negativeCash.floor)}`,
        detail: `Laagste stand ${i.money(laagste.closingFree)}, einde ${i.weekLabel(laagste.weekKey)}.`,
        href: '/bureau/cash',
      });
    }
  }
  if (i.cash) {
    const kapot = verifyReconciliation(i.cash);
    if (kapot.length) {
      add({ id: 'cash-reconciliatie', level: 'kritiek', title: 'De weken sluiten niet aan op de maandprognose', detail: `${kapot.length} ${kapot.length === 1 ? 'maand' : 'maanden'} met een verschil — de weekstanden zijn niet te vertrouwen.`, href: '/bureau/cash' });
    }
    const zonderDatum = i.cash.unplaced.filter((u) => u.inForecast);
    if (zonderDatum.length) {
      const som = round2(zonderDatum.reduce((s, u) => s + u.amount, 0));
      add({ id: 'factuur-zonder-datum', level: 'onzeker', title: `${zonderDatum.length} ${zonderDatum.length === 1 ? 'factuur' : 'facturen'} niet in de weken`, detail: `${i.money(som)} in de prognose zonder geldige betaaldatum — wanneer het binnenkomt is onbekend.`, href: '/bureau/cash' });
    }
    const buiten = i.cash.unplaced.filter((u) => !u.inForecast);
    if (buiten.length) {
      add({ id: 'factuur-niet-in-prognose', level: 'info', title: `${buiten.length} open ${buiten.length === 1 ? 'factuur telt' : 'facturen tellen'} nergens mee`, detail: 'Geen post in de prognose, of een post in een voorbije maand.', href: '/bureau/cash' });
    }
    if (i.cash.mismatches.length) {
      add({ id: 'ledger-mismatch', level: 'info', title: `${i.cash.mismatches.length} ${i.cash.mismatches.length === 1 ? 'factuur' : 'facturen'} met een post in een andere maand`, detail: 'Ingepland volgens de post; de factuurdatum zegt iets anders.', href: '/bureau/cash' });
    }
  }

  // ── Capaciteit ──
  if (thresholds.overbooking.enabled && i.capacity) {
    const tol = thresholds.overbooking.toleranceDays;
    if (i.capacity.overbookedDays > tol + EPSILON) {
      add({ id: 'capaciteit-overbelast', level: 'let-op', title: `${i.year} is overbelast`, detail: `${i.days(i.capacity.overbookedDays)} boven de dagbudgetten én de buffer.`, href: '/bureau/tijd' });
    }
  }
  if (thresholds.overbooking.enabled && i.weeks) {
    const tol = thresholds.overbooking.toleranceDays;
    const over = i.weeks.filter((w) => w.overbookedDays > tol + EPSILON);
    if (over.length) {
      add({ id: 'week-overboekt', level: 'let-op', title: `${over.length} ${over.length === 1 ? 'week' : 'weken'} overboekt`, detail: `Eerste: ${i.weekLabel(over[0]!.weekKey)}, ${i.days(over[0]!.overbookedDays)} boven het weekplafond.`, href: '/bureau/tijd' });
    }
  }

  // ── Projecten ──
  if (thresholds.projectOverrun.enabled) {
    const actief = new Set(i.projects.filter((p) => p.status === 'lopend' || p.status === 'gepland' || p.status === 'gepauzeerd').map((p) => p.id));
    for (const r of i.profitability) {
      if (!actief.has(r.projectId) || r.hours.ratio === null || r.hours.budgeted === null || r.hours.expectedTotal === null) continue;
      if (r.hours.ratio > thresholds.projectOverrun.ratio + EPSILON) {
        const p = i.projects.find((x) => x.id === r.projectId)!;
        add({ id: `project-overschrijding:${p.id}`, level: 'let-op', title: `${p.name} loopt uit`, detail: `Verwacht ${round2(r.hours.expectedTotal)} u tegen ${round2(r.hours.budgeted)} u begroot (${i.percent(r.hours.ratio)}).`, href: `/bureau/projecten/${p.id}` });
      }
    }
    const zonderRaming = i.profitability.filter((r) => actief.has(r.projectId) && r.remainingHours === null);
    if (zonderRaming.length) {
      add({ id: 'project-zonder-raming', level: 'onzeker', title: `${zonderRaming.length} ${zonderRaming.length === 1 ? 'project' : 'projecten'} zonder urenraming`, detail: 'Uitloop en rendement zijn daar niet te toetsen.', href: '/bureau/projecten' });
    }
  }

  // ── Klanten ──
  if (thresholds.clientConcentration.enabled && i.goals) {
    for (const r of i.concentration.rows.filter((x) => x.aboveLimit)) {
      add({
        id: `klantconcentratie:${r.key}`,
        level: 'let-op',
        title: `${r.label} boven de klantlimiet`,
        detail: `${i.percent(r.share ?? 0)} van de vooruitblik ${i.year} (noemer ${i.money(i.concentration.denominator)}), limiet ${i.percent(i.goals.maxClientShare)}.`,
        href: '/bureau/klanten',
      });
    }
  }

  // ── Verkoop ──
  if (thresholds.overdueSalesAction.enabled) {
    if (i.overdueActions.length) {
      const oudste = i.overdueActions[0]!;
      add({ id: 'verkoopactie-achterstallig', level: 'let-op', title: `${i.overdueActions.length} ${i.overdueActions.length === 1 ? 'verkoopactie' : 'verkoopacties'} over tijd`, detail: `Oudste: ${oudste.opportunity.company}, ${oudste.daysOverdue} ${oudste.daysOverdue === 1 ? 'dag' : 'dagen'}.`, href: '/bureau/verkoop' });
    }
    if (i.withoutNextAction.length) {
      add({ id: 'kans-zonder-actie', level: 'info', title: `${i.withoutNextAction.length} open ${i.withoutNextAction.length === 1 ? 'kans' : 'kansen'} zonder volgende actie`, detail: 'Zonder volgende stap valt een kans stil weg.', href: '/bureau/verkoop' });
    }
  }

  // ── Omzet ──
  if (thresholds.revenueGap.enabled && i.goals) {
    if (!i.revenue.hasMilestones) {
      add({ id: 'omzet-onbekend', level: 'onzeker', title: `Nog geen mijlpalen in ${i.year}`, detail: 'Gerealiseerd en getekend zijn onbekend, niet nul — dus ook het omzetgat.', href: '/bureau/projecten' });
    } else if (i.capacity) {
      const nodig = neededPerRemainingDay(i.revenue.stillToSell, i.capacity.unallocatedClientDays);
      if (nodig.kind === 'geen-capaciteit') {
        add({ id: 'omzetgat', level: 'kritiek', title: 'Omzetgat zonder vrije klantdagen', detail: `Nog ${i.money(nodig.gap)} te verkopen, en er zijn geen niet-toegewezen klantdagen meer in ${i.year}.`, href: '/bureau/verkoop' });
      } else if (nodig.kind === 'ok') {
        const doel = revenuePerDayTarget(i.goals);
        if (doel !== null && nodig.perDay > doel + EPSILON) {
          add({ id: 'omzetgat', level: 'let-op', title: 'Omzetgat vraagt meer per dag dan je doel', detail: `${i.money(nodig.gap)} over ${i.days(nodig.days)} vrije klantdagen = ${i.money(nodig.perDay)}/dag, doel ${i.money(doel)}/dag.`, href: '/bureau/verkoop' });
        }
      }
    }
  }

  // ── Doelen ──
  if (i.goalDeviations) {
    const { days, quarters } = i.goalDeviations;
    if (Math.abs(days) > EPSILON || (quarters !== null && Math.abs(quarters) > EPSILON)) {
      const delen = [Math.abs(days) > EPSILON ? `dagen ${days > 0 ? '+' : '−'}${i.days(Math.abs(days))}` : null, quarters !== null && Math.abs(quarters) > EPSILON ? `kwartalen ${quarters > 0 ? '+' : '−'}${i.money(Math.abs(quarters))}` : null].filter(Boolean);
      add({ id: 'doelen-inconsistent', level: 'info', title: 'De doelen tellen niet op', detail: `Verschil: ${delen.join(' · ')}. Niets is aangepast.`, href: '/bureau/doelen' });
    }
  }

  return { signals: out.sort((a, b) => ORDER[a.level] - ORDER[b.level]), disabled };
}
