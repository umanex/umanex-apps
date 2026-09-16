import { formatAmount } from '../../lib/cashflow/recurring';
import { lowestFree, lowestMonthEnd, type WeeklyCashPlan } from '../../lib/bureau/weekly-cash';
import { monthLabel, weekLabel } from '../../lib/bureau/format';

/**
 * Waar de weken vertrekken: banksaldo, wat in potten zit, wat vrij is — en het laagste
 * maandeinde. Dat kopgetal komt uit de rekenkern zelf; de laagste stand van de weektabel staat
 * eronder, als de strengste lezing van de timing binnen een maand.
 */
export function CashPositionLine({ plan }: { plan: WeeklyCashPlan }) {
  const maand = lowestMonthEnd(plan);
  const week = lowestFree(plan);
  return (
    <dl className="grid gap-4 rounded-xl border border-accent bg-card p-5 text-sm sm:grid-cols-2 lg:grid-cols-4" data-cash-position>
      <div>
        <dt className="text-muted-foreground">Banksaldo bij de start</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{formatAmount(plan.position.bank)}</dd>
        <dd className="text-xs text-muted-foreground">uit de prognose van deze maand</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">In potten</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{formatAmount(plan.position.reserved)}</dd>
        <dd className="text-xs text-muted-foreground">provisies en buffer, één keer afgetrokken</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Vrij</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{formatAmount(plan.position.free)}</dd>
        <dd className="text-xs text-muted-foreground">bank − potten</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Laagste maandeinde</dt>
        {maand ? (
          <>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${maand.closingFree < 0 ? 'text-finance-negative' : ''}`} data-lowest-month-end={maand.closingFree} data-lowest-month={maand.monthKey}>
              {formatAmount(maand.closingFree)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              eind {monthLabel(maand.monthKey)}
              {maand.closingFree < 0 ? ' · tekort' : ''}
            </dd>
            <dd className="text-xs text-muted-foreground" data-month-ends>
              {plan.monthEnds.map((m, i) => (
                <span key={m.monthKey} data-month-end={m.monthKey} data-value={m.closingFree}>
                  {i > 0 && ' · '}
                  {monthLabel(m.monthKey)} <span className="tabular-nums">{formatAmount(m.closingFree)}</span>
                </span>
              ))}
            </dd>
          </>
        ) : (
          <dd className="mt-1 text-muted-foreground">Geen maand die binnen de 13 weken eindigt</dd>
        )}
        {week && (
          <dd className="mt-1 text-xs text-muted-foreground" data-lowest-week={week.closingFree}>
            weektabel, kosten vroeg en inkomsten laat: {formatAmount(week.closingFree)} einde {weekLabel(week.weekKey)}
          </dd>
        )}
      </div>
    </dl>
  );
}
