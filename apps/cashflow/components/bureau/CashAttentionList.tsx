import Link from 'next/link';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { formatAmount, getMonthLabel } from '../../lib/cashflow/recurring';
import type { BureauData } from '../../lib/bureau/types';
import type { LedgerMismatch, MonthReconciliation, UnplacedInvoice, UnplacedReason } from '../../lib/bureau/weekly-cash';
import { dateLabel } from '../../lib/bureau/format';

const REDEN: Record<UnplacedReason, { titel: string; uitleg: string }> = {
  'achterstallig-zonder-datum': {
    titel: 'Vervallen, zonder verwachte betaaldatum',
    uitleg: 'Wanneer dit geld komt, is onbekend — dus staat het in geen enkele week. Vul op het project een verwachte betaaldatum in.',
  },
  'verwachte-datum-verstreken': {
    titel: 'Verwachte betaaldatum voorbij',
    uitleg: 'De datum die je verwachtte is gepasseerd zonder betaling. Zet een nieuwe datum, of vink betaald aan.',
  },
  'niet-in-prognose': {
    titel: 'Open, maar niet in de prognose',
    uitleg: 'Deze facturen hebben geen inkomstenpost en tellen dus nergens mee. Zet ze op het project in de prognose.',
  },
  'post-in-verleden': {
    titel: 'Post in een voorbije maand',
    uitleg: 'De inkomstenpost staat in een maand die niet meer doorgerekend wordt. Verplaats de verwachte betaaldatum.',
  },
};

type CashAttentionListProps = {
  unplaced: UnplacedInvoice[];
  mismatches: LedgerMismatch[];
  broken: MonthReconciliation[];
  bureau: BureauData;
};

/** Wat niet in de weken staat, en waarom — apart, nooit stil in "deze week". */
export function CashAttentionList({ unplaced, mismatches, broken, bureau }: CashAttentionListProps) {
  if (unplaced.length === 0 && mismatches.length === 0 && broken.length === 0) return null;
  const project = (id: string) => bureau.projects.find((p) => p.id === id);
  const link = (projectId: string, tekst: string) => (
    <Link href={`/bureau/projecten/${projectId}`} className={cn('rounded-sm font-medium underline underline-offset-2', focusRing)}>
      {tekst}
    </Link>
  );
  const redenen = (Object.keys(REDEN) as UnplacedReason[]).filter((r) => unplaced.some((u) => u.reason === r));

  return (
    <section aria-labelledby="cash-aandacht-titel" className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <h3 id="cash-aandacht-titel" className="text-base font-semibold">
        Niet in de weken
      </h3>
      {broken.length > 0 && (
        <p role="alert" className="text-sm font-medium text-destructive">
          De weken sluiten niet aan op de maandprognose: {broken.map((b) => `${getMonthLabel(b.monthKey)} verschilt ${formatAmount(b.delta)}`).join(', ')}. Vertrouw de weekstanden niet tot dit opgelost is.
        </p>
      )}
      {redenen.map((r) => (
        <div key={r} className="space-y-1.5" data-unplaced-reason={r}>
          <h4 className="text-sm font-medium">{REDEN[r].titel}</h4>
          <p className="max-w-prose text-xs text-muted-foreground">{REDEN[r].uitleg}</p>
          <ul className="divide-y divide-border">
            {unplaced
              .filter((u) => u.reason === r)
              .map((u) => (
                <li key={u.invoiceId} data-unplaced={u.invoiceId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5 text-dense">
                  <span className="min-w-0">
                    {link(u.projectId, `${project(u.projectId)?.name ?? 'Project'} — ${u.label}`)}
                    <span className="text-muted-foreground">
                      {' '}· vervaldatum {dateLabel(u.dueDate)}
                      {u.expectedPaymentDate && ` · verwacht ${dateLabel(u.expectedPaymentDate)}`}
                      {u.inForecast && u.monthKey && ` · post in ${getMonthLabel(u.monthKey).toLowerCase()}`}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatAmount(u.amount)}</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {mismatches.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium">Factuurdatum en post in een andere maand</h4>
          <p className="max-w-prose text-xs text-muted-foreground">Ingepland volgens de post, in de laatste week van haar maand. Pas de verwachte betaaldatum aan, dan verhuist de post mee.</p>
          <ul className="divide-y divide-border">
            {mismatches.map((m) => (
              <li key={m.invoiceId} className="py-1.5 text-dense">
                {link(m.projectId, `${project(m.projectId)?.name ?? 'Project'} — ${m.label}`)}
                <span className="text-muted-foreground">
                  {' '}· factuur {getMonthLabel(m.invoiceMonth).toLowerCase()}, post {getMonthLabel(m.itemMonth).toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
