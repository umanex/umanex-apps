import { cn } from '@umanex/ui/lib/utils';
import { formatCurrency } from '../../lib/cashflow/recurring';
import type { Concentration } from '../../lib/bureau/concentration';
import { formatPercent } from '../../lib/bureau/format';

type ConcentrationTableProps = { data: Concentration; title: string; description: string; id: string };

/**
 * Aandelen per klant of groep als tabel, met een balk die alleen herhaalt wat de cijfers zeggen.
 * De noemer en de limiet staan in het bijschrift; "boven limiet" staat als woord in de rij.
 */
export function ConcentrationTable({ data, title, description, id }: ConcentrationTableProps) {
  const limiet = data.limit;
  return (
    <section aria-labelledby={id} className="min-w-0 space-y-3 rounded-xl border border-accent bg-card p-5" data-concentration={data.basis}>
      <div>
        <h3 id={id} className="text-base font-semibold">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {data.denominator === 0 ? (
        <p className="text-sm text-muted-foreground" data-onvoldoende>
          Onvoldoende gegevens — geen omzet op deze basis in {data.year}, dus geen aandeel om te tonen.
        </p>
      ) : (
        <div data-scroll-x className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-dense">
            <caption className="pb-2 text-left text-xs text-muted-foreground" data-denominator={data.denominator}>
              Noemer {formatCurrency(data.denominator)} ex btw · {data.rows.length} {data.grouping === 'groep' ? 'klanten of groepen' : data.rows.length === 1 ? 'klant' : 'klanten'}
              {limiet !== null ? ` · limiet ${formatPercent(limiet)}` : ' · geen limiet ingesteld voor dit jaar'}
            </caption>
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className="py-1.5 pr-3 text-left text-xs font-medium text-muted-foreground">{data.grouping === 'groep' ? 'Klant of groep' : 'Klant'}</th>
                <th scope="col" className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Omzet</th>
                <th scope="col" className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Aandeel</th>
                <th scope="col" className="w-1/3 py-1.5 pl-3 text-left text-xs font-medium text-muted-foreground"><span className="sr-only">Balk</span></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.key} data-concentration-row={r.key} className="border-b border-border last:border-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {r.label}
                    {r.clientIds.length > 1 && <span className="block text-xs text-muted-foreground">{r.clientIds.length} klanten</span>}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(r.amount)}</td>
                  <td className={cn('px-3 py-1.5 text-right tabular-nums', r.aboveLimit && 'font-medium text-finance-negative')}>
                    {r.share === null ? '—' : formatPercent(r.share)}
                    {r.aboveLimit && <span className="block text-xs">boven limiet</span>}
                  </td>
                  <td className="py-1.5 pl-3" aria-hidden="true">
                    <div className="relative h-2 w-full rounded-full bg-muted">
                      <div className={cn('h-full rounded-full', r.aboveLimit ? 'bg-finance-negative-surface' : 'bg-foreground')} style={{ width: `${Math.min(100, (r.share ?? 0) * 100)}%` }} />
                      {limiet !== null && <div className="absolute -inset-y-0.5 w-px bg-foreground" style={{ left: `${Math.min(100, limiet * 100)}%` }} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
