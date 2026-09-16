import { formatAmount } from '../../lib/cashflow/recurring';
import { lowestFree, type WeeklyCashPlan } from '../../lib/bureau/weekly-cash';
import { weekLabel } from '../../lib/bureau/format';

/** Waar de weken vertrekken: banksaldo, wat in potten zit, wat vrij is — en de laagste vrije stand erna. */
export function CashPositionLine({ plan }: { plan: WeeklyCashPlan }) {
  const laagste = lowestFree(plan);
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
        <dt className="text-muted-foreground">Laagste vrije stand</dt>
        {laagste ? (
          <>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${laagste.closingFree < 0 ? 'text-finance-negative' : ''}`} data-lowest-free={laagste.closingFree}>
              {formatAmount(laagste.closingFree)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              einde {weekLabel(laagste.weekKey)}
              {laagste.closingFree < 0 ? ' · tekort' : ''}
            </dd>
          </>
        ) : (
          <dd className="mt-1 text-muted-foreground">Onvoldoende gegevens</dd>
        )}
      </div>
    </dl>
  );
}
