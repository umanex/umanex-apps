import { formatCurrency } from '../../lib/cashflow/recurring';
import type { ProjectProfitability } from '../../lib/bureau/profitability';
import { formatDays, formatHours } from '../../lib/bureau/format';
import { MetricValue } from './MetricValue';

type YieldBreakdownProps = {
  row: ProjectProfitability;
  hoursPerDay: number;
  /** Doel voor A (expliciet of afgeleid); `null` = geen doelen. */
  targetA: number | null;
  /** Apart doel voor B; `null` = niet ingesteld. */
  targetB: number | null;
  status: 'afgerond' | 'anders';
};

/** De berekening van A en B, stap voor stap — de herkomst van elk getal staat erbij. */
export function YieldBreakdown({ row: r, hoursPerDay, targetA, targetB, status }: YieldBreakdownProps) {
  const dagenRegel =
    r.remainingDays === null
      ? `${formatHours(r.spentHours)} besteed = ${formatDays(r.spentDays)} · resterend onbekend`
      : `${formatHours(r.spentHours)} besteed (${formatDays(r.spentDays)}) + ${formatHours(r.remainingHours ?? 0)} ${status === 'afgerond' ? 'resterend (afgerond)' : 'verwacht resterend'} (${formatDays(r.remainingDays)}) = ${formatDays(r.totalDays ?? 0)}`;

  const vergelijk = (value: number, target: number | null, geenDoel: string) => {
    if (target === null) return <span className="text-muted-foreground">{geenDoel}</span>;
    const verschil = value - target;
    return (
      <span className={verschil < 0 ? 'text-finance-deferred' : 'text-finance-positive'}>
        {verschil < 0 ? `${formatCurrency(-verschil)} onder` : `${formatCurrency(verschil)} boven`} het doel van {formatCurrency(target)}
      </span>
    );
  };

  return (
    <section aria-labelledby={`rendement-${r.projectId}`} className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <h3 id={`rendement-${r.projectId}`} className="text-base font-semibold">
        Rendement
      </h3>
      <dl className="grid gap-4 text-sm md:grid-cols-2">
        <div className="space-y-1">
          <dt className="font-medium">A — omzet per eigen projectdag</dt>
          <dd className="text-2xl font-bold">
            <MetricValue metric={r.A} />
          </dd>
          <dd className="text-muted-foreground">
            {formatCurrency(r.approvedTotal)} goedgekeurd ÷ {r.totalDays === null ? 'onbekende dagen' : formatDays(r.totalDays)}
          </dd>
          {r.A.kind === 'ok' && <dd>{vergelijk(r.A.value, targetA, 'Geen doelen voor dit jaar.')}</dd>}
          {r.A.kind !== 'ok' && <dd className="text-muted-foreground">Ontbreekt: {r.A.reason}.</dd>}
        </div>
        <div className="space-y-1">
          <dt className="font-medium">B — na directe externe kosten per eigen projectdag</dt>
          <dd className="text-2xl font-bold">
            <MetricValue metric={r.B} />
          </dd>
          <dd className="text-muted-foreground">
            ({formatCurrency(r.approvedTotal)} − {r.external.amount === null ? 'onbekende' : formatCurrency(r.external.amount)} {r.external.basis === 'werkelijk' ? 'werkelijke' : 'verwachte'} externe kosten) ÷ {r.totalDays === null ? 'onbekende dagen' : formatDays(r.totalDays)}
          </dd>
          {r.B.kind === 'ok' && <dd>{vergelijk(r.B.value, targetB, 'Geen apart doel voor B ingesteld.')}</dd>}
          {r.B.kind !== 'ok' && <dd className="text-muted-foreground">Ontbreekt: {r.B.reason}.</dd>}
          <dd className="text-xs text-muted-foreground">B is geen nettowinst: algemene bedrijfskosten zitten er niet in.</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Eigen dagen: {dagenRegel}. Registraties rekenen met de uren per dag van hun jaar; het resterende met {formatHours(hoursPerDay)} per dag.
      </p>
    </section>
  );
}
