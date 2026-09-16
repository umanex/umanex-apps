'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { useCashflowStore } from '../../store/cashflow';
import { useMonths } from '../../hooks/useCashflow';
import { useBureau, useBureauYear, useToday } from '../../hooks/useBureau';
import { formatCurrency } from '../../lib/cashflow/recurring';
import { goalsConsistency, goalsFor, hoursPerDayFor, revenuePerDayTarget } from '../../lib/bureau/goals';
import { bucketMilestones, neededPerRemainingDay, yearRevenue } from '../../lib/bureau/revenue';
import { weekCapacity, yearCapacity } from '../../lib/bureau/capacity';
import { projectProfitability, yieldSummary } from '../../lib/bureau/profitability';
import { clientConcentration } from '../../lib/bureau/concentration';
import { openPipeline, overdueActions, withoutNextAction } from '../../lib/bureau/pipeline';
import { buildWeeklyCashPlan, HORIZON_WEEKS, lowestFree } from '../../lib/bureau/weekly-cash';
import { computeSignals, type Signal } from '../../lib/bureau/signals';
import { approvedTotal } from '../../lib/bureau/money';
import { monthOf, monthsCovering, weeksFrom } from '../../lib/bureau/periods';
import { formatDays, formatPercent, weekLabel } from '../../lib/bureau/format';
import { EmptyState } from '../../components/feedback/EmptyState';
import { SignalList } from '../../components/bureau/SignalList';
import { KpiTile } from '../../components/bureau/KpiTile';

const heeft = (signals: Signal[], ...prefixes: string[]) => signals.some((s) => prefixes.some((p) => s.id === p || s.id.startsWith(`${p}:`)));

export default function OverzichtPage() {
  const bureau = useBureau();
  const [year] = useBureauYear();
  const today = useToday();
  const incomeItems = useCashflowStore((s) => s.incomeItems);
  const anchor = monthOf(today);
  const months = useMonths(monthsCovering(today, HORIZON_WEEKS).filter((m) => m >= anchor).length, anchor);
  const huidigJaar = Number(today.slice(0, 4));

  const d = useMemo(() => {
    const goals = goalsFor(bureau, year);
    const goalsNu = goalsFor(bureau, huidigJaar);
    const revenue = yearRevenue(bureau, year, goals, today);
    const capacity = goals ? yearCapacity(bureau, goals, year, today) : null;
    const weeks = goalsNu ? weekCapacity(bureau, goalsNu, weeksFrom(today, HORIZON_WEEKS), today) : null;
    const cash = buildWeeklyCashPlan({ asOf: today, months, incomeItems, bureau });
    const concentration = clientConcentration(bureau, year, 'prognose', 'klant', goals?.maxClientShare ?? null);
    const uurPerDag = hoursPerDayFor(bureau, huidigJaar);
    const nietGeannuleerd = bureau.projects.filter((p) => p.status !== 'geannuleerd');
    const profitability = nietGeannuleerd.map((p) => projectProfitability(p, bureau.timeEntries, uurPerDag));
    const achterstallig = overdueActions(bureau.opportunities, today, goalsNu?.signals.overdueSalesAction.graceDays ?? 0);
    const consistentie = goals ? goalsConsistency(goals, null) : null;
    const signals = computeSignals({
      year, asOf: today, goals, revenue, capacity, weeks, cash, concentration, projects: bureau.projects, profitability,
      overdueActions: achterstallig, withoutNextAction: withoutNextAction(bureau.opportunities),
      goalDeviations: consistentie ? { days: consistentie.days.deviation, quarters: consistentie.quarters?.deviation ?? null } : null,
      money: formatCurrency, days: formatDays, percent: (s) => formatPercent(s), weekLabel,
    });
    const resterendeMijlpalen = bucketMilestones(bureau).buckets.filter((b) => b.year === year && b.kind === 'resterend').length;
    const gerealiseerdOoit = bucketMilestones(bureau).buckets.filter((b) => b.kind === 'gerealiseerd' && nietGeannuleerd.some((p) => p.id === b.projectId)).reduce((s, b) => s + b.amount, 0);
    return {
      goals, revenue, capacity, cash, signals, resterendeMijlpalen, gerealiseerdOoit,
      pipeline: openPipeline(bureau.opportunities),
      yield: yieldSummary(profitability),
      projectCount: profitability.length,
      verwacht: nietGeannuleerd.reduce((s, p) => s + approvedTotal(p), 0),
      laagste: lowestFree(cash),
    };
  }, [bureau, year, today, huidigJaar, months, incomeItems]);

  const { goals, revenue: r, capacity: c, cash, signals } = d;
  const leegBureau = !goals && bureau.projects.length === 0 && bureau.opportunities.length === 0 && bureau.timeEntries.length === 0;
  const leegCash = cash.position.bank === 0 && cash.weeks.every((w) => w.lines.length === 0) && cash.unplaced.length === 0;
  const nodig = c ? neededPerRemainingDay(r.stillToSell, c.unallocatedClientDays) : null;
  const zonderDatum = cash.unplaced.filter((u) => u.inForecast).length;
  const doelA = goals ? revenuePerDayTarget(goals) : null;

  return (
    <section aria-labelledby="overzicht-titel" className="space-y-5">
      <div>
        <h2 id="overzicht-titel" className="text-xl font-semibold">
          Overzicht {year}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Zes vragen, elk met hun noemer en bron. Omzet is een managementregistratie uit mijlpalen, ex btw; cash volgt de echte geldstromen, incl. btw.
        </p>
      </div>

      {leegBureau ? (
        <EmptyState
          title={`Begin bij je doelen voor ${year}`}
          action={
            <Link href="/bureau/doelen" className={cn('rounded-sm text-sm font-medium underline underline-offset-2', focusRing)}>
              Doelen instellen
            </Link>
          }
        >
          Omzetdoel, eigen dagen per categorie en de klantlimiet zijn de maatstaf waar dit overzicht tegen meet. Daarna projecten, tijd en kansen — tot dan staat hieronder overal waarom er nog geen getal is.
        </EmptyState>
      ) : (
        <SignalList result={signals} />
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          kpi="omzet"
          title="Gerealiseerde omzet"
          value={r.hasMilestones ? formatCurrency(r.realized) : null}
          insufficient={{ reason: `Nog geen mijlpalen in ${year} — omzet is onbekend, niet nul.`, fix: { href: '/bureau/projecten', label: 'Projecten en mijlpalen vastleggen' } }}
          secondary={r.target === null ? 'geen omzetdoel' : (r.aboveTarget ?? 0) > 0 ? `${formatCurrency(r.aboveTarget!)} boven doel` : `nog ${formatCurrency(r.stillToSell ?? 0)} te verkopen na getekend werk`}
          bar={r.target ? { fraction: r.realized / r.target, label: `${formatCurrency(r.realized)} gerealiseerd van ${formatCurrency(r.target)} doel` } : null}
          denominator={r.target === null ? `geen doel voor ${year}` : `doel ${formatCurrency(r.target)} ex btw`}
          source={`Mijlpalen gerealiseerd in ${year}`}
          link={{ href: '/bureau/projecten', label: 'Naar projecten' }}
          attention={heeft(signals.signals, 'omzetgat')}
        />
        <KpiTile
          kpi="getekend"
          title="Getekend, nog te leveren"
          value={r.hasMilestones ? formatCurrency(r.remainingSigned) : null}
          insufficient={{ reason: `Nog geen mijlpalen in ${year}.`, fix: { href: '/bureau/projecten', label: 'Mijlpalen plannen' } }}
          secondary={
            nodig?.kind === 'ok'
              ? `gat ${formatCurrency(nodig.gap)}: ${formatCurrency(nodig.perDay)}/dag over ${formatDays(nodig.days)} vrije klantdagen`
              : nodig?.kind === 'geen-capaciteit'
                ? `gat ${formatCurrency(nodig.gap)} en geen vrije klantdagen meer`
                : nodig?.kind === 'geen-gat'
                  ? 'geen omzetgat: getekend dekt het doel'
                  : `samen ${formatCurrency(r.signedInYear)} getekend in ${year}`
          }
          denominator={d.resterendeMijlpalen ? `${d.resterendeMijlpalen} ${d.resterendeMijlpalen === 1 ? 'mijlpaal' : 'mijlpalen'} gepland in ${year}` : `geen resterende mijlpalen in ${year}`}
          source={`Niet-gerealiseerde mijlpalen van getekende projecten, gepland in ${year}`}
          link={{ href: '/bureau/projecten', label: 'Naar projecten' }}
          chips={r.coverageGaps.length ? [`${r.coverageGaps.length} ${r.coverageGaps.length === 1 ? 'project' : 'projecten'} niet volledig in mijlpalen`] : []}
        />
        <KpiTile
          kpi="kansen"
          title="Kansen en voorstellen"
          value={bureau.opportunities.length ? `${d.pipeline.count} open` : null}
          insufficient={{ reason: 'Nog geen kansen geregistreerd.', fix: { href: '/bureau/verkoop', label: 'Een kans toevoegen' } }}
          secondary={`${formatCurrency(d.pipeline.value)} verwachte waarde, ongewogen · ${r.unsigned.count} met uitvoering of beslissing in ${year}`}
          denominator={d.pipeline.count ? `${d.pipeline.proposals} ${d.pipeline.proposals === 1 ? 'voorstel' : 'voorstellen'} · ${d.pipeline.qualified} van ${d.pipeline.count} gekwalificeerd${d.pipeline.withoutValue ? ` · ${d.pipeline.withoutValue} zonder waarde` : ''}` : 'geen open kansen'}
          source="Open kansen, contact tot voorstel, stand vandaag — geen gewogen prognose"
          link={{ href: '/bureau/verkoop', label: 'Naar verkoop' }}
          attention={heeft(signals.signals, 'verkoopactie-achterstallig')}
        />
        <KpiTile
          kpi="capaciteit"
          title="Eigen capaciteit"
          value={c ? `${formatDays(Math.max(0, c.totals.freeDays))} vrij` : null}
          insufficient={{ reason: `Geen dagbudget voor ${year}.`, fix: { href: '/bureau/doelen', label: 'Doelen instellen' } }}
          secondary={c ? `besteed ${formatDays(c.totals.spentDays)} · gepland ${formatDays(c.totals.plannedDays)} · buffer ${formatDays(c.buffer.remainingDays)} over${c.overbookedDays > 0 ? ` · overbelast ${formatDays(c.overbookedDays)}` : ''}` : undefined}
          bar={c ? { fraction: (c.totals.spentDays + c.totals.plannedDays) / Math.max(c.totals.budgetDays, 0.0001), label: `${formatDays(c.totals.spentDays + c.totals.plannedDays)} besteed of gepland van ${formatDays(c.totals.budgetDays)}` } : null}
          denominator={c ? `van ${formatDays(c.totals.budgetDays)} eigen dagen in ${year}` : `geen dagbudget voor ${year}`}
          source="Tijdregistratie (besteed) en planning (resterend), zonder overlap"
          link={{ href: '/bureau/tijd', label: 'Naar tijd' }}
          chips={c && !c.hasEntries && !c.hasPlans ? ['nog geen registraties of planning'] : []}
          attention={heeft(signals.signals, 'capaciteit-overbelast', 'week-overboekt')}
        />
        <KpiTile
          kpi="rendement"
          title="Projectopbrengst per eigen dag"
          value={d.yield.A.kind === 'ok' ? `${formatCurrency(d.yield.A.value)} /dag` : null}
          insufficient={{ reason: d.yield.A.kind === 'ok' ? '' : `A: ${d.yield.A.reason}.`, fix: { href: '/bureau/projecten', label: 'Urenramingen invullen' } }}
          secondary={`B ${d.yield.B.kind === 'ok' ? `${formatCurrency(d.yield.B.value)} /dag` : 'onvoldoende gegevens'} na externe kosten — geen nettowinst · verwacht ${formatCurrency(d.verwacht)}, gerealiseerd ${formatCurrency(d.gerealiseerdOoit)}`}
          denominator={d.projectCount ? `${d.yield.included} van ${d.projectCount} projecten met uren en raming${doelA !== null ? ` · doel A ${formatCurrency(doelA)} /dag` : ''}` : 'geen projecten'}
          source="Goedgekeurde prijs ÷ eigen dagen (besteed + verwacht resterend), gewogen naar dagen"
          link={{ href: '/bureau/projecten', label: 'Naar projecten' }}
          chips={d.yield.insufficient.length && d.yield.included ? [`${d.yield.insufficient.length} zonder raming niet meegeteld`] : []}
          attention={heeft(signals.signals, 'project-overschrijding')}
        />
        <KpiTile
          kpi="cash"
          title="Vrije cash, 13 weken"
          value={leegCash ? null : formatCurrency(cash.position.free)}
          insufficient={{ reason: 'De maandprognose is leeg.', fix: { href: '/', label: 'Naar de prognose' } }}
          secondary={d.laagste ? `laagste ${formatCurrency(d.laagste.closingFree)}, einde ${weekLabel(d.laagste.weekKey)}` : undefined}
          denominator={leegCash ? 'geen banksaldo of posten in de prognose' : `bank ${formatCurrency(cash.position.bank)} − potten ${formatCurrency(cash.position.reserved)}`}
          source="Maandprognose verdeeld over 13 weken, vanaf vandaag"
          link={{ href: '/bureau/cash', label: 'Naar cash' }}
          chips={zonderDatum ? [`${zonderDatum} ${zonderDatum === 1 ? 'factuur' : 'facturen'} zonder datum niet ingepland`] : []}
          attention={heeft(signals.signals, 'cash-negatief', 'cash-reconciliatie')}
        />
      </div>
    </section>
  );
}
