import { cn } from '@umanex/ui/lib/utils';
import type { Opportunity } from '../../lib/bureau/types';
import { STAGES } from '../../lib/bureau/types';
import { STAGE_LABEL } from '../../lib/bureau/labels';
import { conversion, presentableRate, RATE_MIN_DENOMINATOR, stageCounts, winRate, type Period } from '../../lib/bureau/pipeline';
import { formatPercent } from '../../lib/bureau/format';

type SalesFunnelProps = { opportunities: Opportunity[]; period: Period; periodLabel: string };

function Ratio({ numerator, denominator, rate }: { numerator: number; denominator: number; rate: number | null }) {
  const getoond = presentableRate({ rate, denominator });
  return (
    <>
      <span className="font-medium tabular-nums">
        {numerator} van {denominator}
      </span>
      <span className="text-muted-foreground">
        {denominator === 0 ? ' · nog niets om te tellen' : getoond === null ? ` · te weinig voor een percentage (onder ${RATE_MIN_DENOMINATOR})` : ` · ${formatPercent(getoond)}`}
      </span>
    </>
  );
}

/**
 * Aantallen en conversies in een periode, altijd met de noemer. Geen gewogen prognose: niets
 * hier vermenigvuldigt een bedrag met een kans per fase.
 */
export function SalesFunnel({ opportunities, period, periodLabel }: SalesFunnelProps) {
  const tel = stageCounts(opportunities, period);
  const gesprekVoorstel = conversion(opportunities, period, 'gesprek', 'voorstel');
  const voorstelGewonnen = conversion(opportunities, period, 'voorstel', 'gewonnen');
  const beslist = winRate(opportunities, period);

  return (
    <section aria-labelledby="trechter-titel" className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="trechter-titel" className="text-base font-semibold">
          Aantallen en conversies
        </h3>
        <p className="text-sm text-muted-foreground">
          {periodLabel} · {tel.created} {tel.created === 1 ? 'nieuwe kans' : 'nieuwe kansen'}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div data-scroll-x className="overflow-x-auto">
          <table className="w-full text-dense">
            <caption className="sr-only">Kansen per stadium: bereikt in {periodLabel} en de stand nu</caption>
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className="py-1.5 pr-3 text-left text-xs font-medium text-muted-foreground">Stadium</th>
                <th scope="col" className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Bereikt in periode</th>
                <th scope="col" className="py-1.5 pl-3 text-right text-xs font-medium text-muted-foreground">Nu</th>
              </tr>
            </thead>
            <tbody>
              {STAGES.map((s, i) => (
                <tr key={s} data-funnel-stage={s} className={cn('border-b border-border last:border-0', i === 3 && 'border-b-2')}>
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">{STAGE_LABEL[s]}</th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{tel.entered[s]}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums">{tel.openNow[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="space-y-3 text-sm">
          <div data-conversion="gesprek-voorstel">
            <dt className="text-muted-foreground">Van gesprek naar voorstel</dt>
            <dd><Ratio {...gesprekVoorstel} /></dd>
          </div>
          <div data-conversion="voorstel-gewonnen">
            <dt className="text-muted-foreground">Van voorstel naar gewonnen</dt>
            <dd><Ratio {...voorstelGewonnen} /></dd>
          </div>
          <div data-conversion="beslist">
            <dt className="text-muted-foreground">Voorstellen beslist in periode: gewonnen van beslist</dt>
            <dd>
              <Ratio numerator={beslist.won} denominator={beslist.decided} rate={beslist.rate} />
            </dd>
          </div>
          <p className="max-w-prose text-xs text-muted-foreground">
            Noemer: kansen die het eerste stadium in de periode bereikten. Teller: hoeveel daarvan het volgende ooit bereikten. Geparkeerd telt niet als beslist. Geen gewogen prognose — een kans telt pas als omzet wanneer ze een project is.
          </p>
        </dl>
      </div>
    </section>
  );
}
