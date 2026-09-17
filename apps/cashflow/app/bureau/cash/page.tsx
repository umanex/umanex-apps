'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { useCashflowStore } from '../../../store/cashflow';
import { useMonths } from '../../../hooks/useCashflow';
import { useBureau, useToday } from '../../../hooks/useBureau';
import { monthOf, monthsCovering } from '../../../lib/bureau/periods';
import { buildWeeklyCashPlan, HORIZON_WEEKS, isEmptyPlan, verifyReconciliation } from '../../../lib/bureau/weekly-cash';
import { formatAmount } from '../../../lib/cashflow/recurring';
import { CashPositionLine } from '../../../components/bureau/CashPositionLine';
import { WeekCashTable } from '../../../components/bureau/WeekCashTable';
import { CashAttentionList } from '../../../components/bureau/CashAttentionList';
import { EmptyState } from '../../../components/feedback/EmptyState';

export default function CashPage() {
  const today = useToday();
  const bureau = useBureau();
  const incomeItems = useCashflowStore((s) => s.incomeItems);
  const anchor = monthOf(today);
  const aantal = monthsCovering(today, HORIZON_WEEKS).filter((m) => m >= anchor).length;
  const months = useMonths(aantal, anchor);
  const plan = useMemo(() => buildWeeklyCashPlan({ asOf: today, months, incomeItems, bureau }), [today, months, incomeItems, bureau]);
  const kapot = verifyReconciliation(plan);
  const later = plan.beyondHorizon.reduce((s, l) => s + l.amount, 0);
  const leeg = isEmptyPlan(plan);

  return (
    <section aria-labelledby="cash-titel" className="space-y-5">
      <div>
        <h2 id="cash-titel" className="text-xl font-semibold">
          Cash, 13 weken
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          De maandprognose verdeeld over weken — dezelfde rekenkern, geen tweede. Vrij is bank min wat in potten zit. Een factuur telt via haar post in de prognose, nooit dubbel; wat geen datum heeft, staat hieronder apart.
        </p>
      </div>
      {leeg ? (
        <EmptyState
          title="Nog geen cijfers om te verdelen"
          action={
            <Link href="/" className={cn('rounded-sm text-sm font-medium underline underline-offset-2', focusRing)}>
              Naar de prognose
            </Link>
          }
        >
          De weken verdelen de maandprognose: je banksaldo, inkomsten, kosten en potten. Zolang die leeg is, valt er niets te plannen — en een rij nullen zou een stand suggereren die er niet is.
        </EmptyState>
      ) : (
        <>
          <CashPositionLine plan={plan} />
          <WeekCashTable weeks={plan.weeks} />
        </>
      )}
      {plan.beyondHorizon.length > 0 && (
        <p className="text-xs text-muted-foreground" data-beyond-horizon>
          Na de horizon, in dezelfde maand: {plan.beyondHorizon.length} {plan.beyondHorizon.length === 1 ? 'regel' : 'regels'}, netto {formatAmount(later)}.
        </p>
      )}
      <CashAttentionList unplaced={plan.unplaced} mismatches={plan.mismatches} broken={kapot} bureau={bureau} />
    </section>
  );
}
