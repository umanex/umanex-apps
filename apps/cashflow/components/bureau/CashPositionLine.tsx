import { formatAmount } from '../../lib/cashflow/recurring';
import { lowestFree, lowestMonthEnd, type WeeklyCashPlan } from '../../lib/bureau/weekly-cash';
import { monthLabel, weekLabel } from '../../lib/bureau/format';

/**
 * Waar de weken vertrekken: banksaldo, wat in potten zit, wat vrij is — en de laagste Buffer op een
 * maandeinde. Dat kopgetal komt uit de rekenkern zelf en is hetzelfde getal als de footer op `/`.
 * Elk getal draagt zijn opbouw als tweede regel. De laagste stand van de weektabel (in Vrij, een week
 * kent geen pot) staat eronder zodra hij dieper ligt dan het vrije maandeinde: dan zegt hij iets over
 * de timing binnen een maand.
 */
export function CashPositionLine({ plan }: { plan: WeeklyCashPlan }) {
  const maand = lowestMonthEnd(plan);
  const week = lowestFree(plan);
  // De weektabel is in Vrij: vergelijk hem met het laagste vrije maandeinde, niet met het Vrij van de
  // maand met de laagste Buffer — met een pot die later start wijzen die naar verschillende maanden.
  const laagsteVrij = plan.monthEnds.reduce<number | null>((min, m) => (min === null || m.closingFree < min ? m.closingFree : min), null);
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
        <dd className="text-xs tabular-nums text-muted-foreground" data-reserved-bridge data-provisions={plan.position.provisions} data-pot={plan.position.buffer}>
          provisies {formatAmount(plan.position.provisions)} + bufferpot {formatAmount(plan.position.buffer)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Vrij</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{formatAmount(plan.position.free)}</dd>
        <dd className="text-xs text-muted-foreground">bank − potten</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Laagste buffer</dt>
        {maand ? (
          <>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${maand.buffer < 0 ? 'text-finance-negative' : ''}`} data-lowest-month-end={maand.buffer} data-lowest-month={maand.monthKey}>
              {formatAmount(maand.buffer)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              eind {monthLabel(maand.monthKey)}
              {maand.buffer < 0 ? ' · tekort' : ''}
            </dd>
            <dd className="text-xs tabular-nums text-muted-foreground" data-lowest-bridge data-free={maand.closingFree} data-pot={maand.bufferPot}>
              vrij {formatAmount(maand.closingFree)} + bufferpot {formatAmount(maand.bufferPot)}
            </dd>
            <dd className="text-xs text-muted-foreground" data-month-ends>
              {plan.monthEnds.map((m, i) => (
                <span key={m.monthKey} data-month-end={m.monthKey} data-value={m.buffer} data-free={m.closingFree} data-pot={m.bufferPot}>
                  {i > 0 && ' · '}
                  {monthLabel(m.monthKey)} <span className="tabular-nums">{formatAmount(m.buffer)}</span>
                </span>
              ))}
            </dd>
          </>
        ) : (
          <dd className="mt-1 text-muted-foreground">Geen maand die binnen de 13 weken eindigt</dd>
        )}
        {week && laagsteVrij !== null && week.closingFree < laagsteVrij - 0.005 && (
          <dd className="mt-1 text-xs text-muted-foreground" data-lowest-week={week.closingFree}>
            weektabel, kosten vroeg en inkomsten laat: Vrij {formatAmount(week.closingFree)} einde {weekLabel(week.weekKey)}
          </dd>
        )}
      </div>
    </dl>
  );
}
