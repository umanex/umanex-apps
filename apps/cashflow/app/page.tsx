'use client';

import { useState } from 'react';
import { useHydrated, useMonths } from '../hooks/useCashflow';
import { MonthCard } from '../components/cashflow/MonthCard';
import { CashflowDndContext } from '../components/cashflow/CashflowDndContext';
import { RecurringSidepanel } from '../components/cashflow/RecurringSidepanel';
import { ReservationSidepanel } from '../components/cashflow/ReservationSidepanel';
import { ReservationPaymentModal } from '../components/cashflow/ReservationPaymentModal';
import { RepeatMonthModal } from '../components/cashflow/RepeatMonthModal';
import { MonthCardSkeleton } from '../components/feedback/MonthCardSkeleton';
import type { MonthKey, ReservationPotType } from '../lib/cashflow/types';

export default function Page() {
  // De server kent localStorage niet en rendert dus een lege prognose. Tot de store
  // geladen is tonen we het skelet, zodat er geen nullen flitsen die er daarna anders
  // uitzien — en de eerste client-render met de server-HTML overeenkomt.
  const hydrated = useHydrated();
  const months = useMonths(3);
  // Gelijk voor alle kolommen: anders staan de drie footers niet meer op één lijn.
  const showReserved = months.some((m) =>
    m.reservationPots.some((p) => p.potType === 'spaardoel' && !p.isDeficitBuffer),
  );
  const showBuffer = months.some((m) => m.reservationPots.some((p) => p.isDeficitBuffer));
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [paymentState, setPaymentState] = useState<{ monthKey: MonthKey; filterType: ReservationPotType } | null>(null);
  const [repeatMonth, setRepeatMonth] = useState<MonthKey | null>(null);

  return (
    <main className="min-h-screen bg-background px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Cashflow prognose</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setRecurringOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Vaste uitgaven
          </button>
          <button
            onClick={() => setReservationOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Spaarpotten
          </button>
        </div>
      </header>

      {/* Vaste hoogte: elke kolom scrollt binnen zichzelf, zodat de drie saldo-footers
          op één horizontale lijn blijven staan. */}
      <section className="h-[calc(100vh-11rem)] min-h-[24rem]">
        {!hydrated ? (
          <div className="grid grid-cols-3 gap-5 h-full">
            {[0, 1, 2].map((i) => (
              <MonthCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <CashflowDndContext>
            <div className="grid grid-cols-3 gap-5 h-full">
              {months.map((month, index) => (
                <MonthCard
                  key={month.monthKey}
                  monthData={month}
                  isFirst={index === 0}
                  showReserved={showReserved}
                  showBuffer={showBuffer}
                  onRegisterPayment={(filterType) => setPaymentState({ monthKey: month.monthKey, filterType })}
                  onOpenRecurringSidepanel={() => setRecurringOpen(true)}
                  onRepeatMonth={() => setRepeatMonth(month.monthKey)}
                />
              ))}
            </div>
          </CashflowDndContext>
        )}
      </section>

      <RecurringSidepanel open={recurringOpen} onClose={() => setRecurringOpen(false)} />
      <ReservationSidepanel open={reservationOpen} onClose={() => setReservationOpen(false)} />
      {repeatMonth && (
        <RepeatMonthModal monthKey={repeatMonth} onClose={() => setRepeatMonth(null)} />
      )}
      {paymentState && (
        <ReservationPaymentModal
          monthKey={paymentState.monthKey}
          filterType={paymentState.filterType}
          onClose={() => setPaymentState(null)}
        />
      )}
    </main>
  );
}
