'use client';

import { useDroppable } from '@dnd-kit/core';
import type { MonthData, ReservationPotType } from '../../lib/cashflow/types';
import { getMonthLabel } from '../../lib/cashflow/recurring';
import { BalanceFooter } from './BalanceFooter';
import { StartBalanceRow } from './StartBalanceRow';
import { IncomeSection } from './IncomeSection';
import { RecurringSection } from './RecurringSection';
import { ReservationSection } from './ReservationSection';
import { ExpenseSection } from './ExpenseSection';
import { useCashflowActions, useReservationActions, useComputedStartBalance } from '../../hooks/useCashflow';


interface MonthCardProps {
  monthData: MonthData;
  onRegisterPayment: (filterType: ReservationPotType) => void;
  onOpenRecurringSidepanel: () => void;
  isFirst?: boolean;
  /** Gelijk voor alle maanden, zodat de drie footers even hoog blijven. */
  showReserved: boolean;
}

export function MonthCard({
  monthData,
  onRegisterPayment,
  onOpenRecurringSidepanel,
  isFirst,
  showReserved,
}: MonthCardProps) {
  const {
    addIncomeItem,
    updateIncomeItem,
    removeIncomeItem,
    removeRecurringDefer,
    upsertRecurringSettlement,
    settleRecurringDefer,
    addExpenseItem,
    updateExpenseItem,
    removeExpenseItem,
    removeReservationDefer,
    upsertReservationSettlement,
    removeReservationSettlement,
    finalizeReservation,
    upsertBalanceOverride,
    removeBalanceOverride,
  } = useCashflowActions();

  const computedStartBalance = useComputedStartBalance();

  const { removeReservationPayment, updateReservationPayment } = useReservationActions();

  const {
    monthKey,
    startBalance,
    totalIncome,
    subtotals,
    cashOverflowItems,
    incomeItems,
    recurringItems,
    reservationPots,
    deferredReservationItems,
    deferredItems,
    recurringSettlements,
    expenseItems,
  } = monthData;

  // Alleen provisies staan écht gereserveerd op de rekening. Een budget is een
  // inschatting van wat er nog vertrekt, geen opzijgezet geld — zie subtotals.ts.
  const reserved = reservationPots
    .filter((p) => p.potType === 'spaardoel')
    .reduce((s, p) => s + p.potBalance, 0);

  const { setNodeRef, isOver } = useDroppable({
    id: `month-${monthKey}`,
    data: { monthKey },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full min-h-0 rounded-xl border bg-card overflow-hidden transition-colors ${
        isOver ? 'border-primary ring-2 ring-primary/30' : 'border-[var(--umanexPrimary50)]'
      }`}
    >
      {/* Vaste maandheader — blijft staan terwijl de ledger scrollt. */}
      <div className="shrink-0 px-6 py-3 bg-[var(--umanexNeutral100)]">
        <h2 className="font-semibold text-base text-[var(--umanexNeutral800)]">
          {getMonthLabel(monthKey)}
        </h2>
      </div>

      {/* Ledger: beginsaldo, dan de vier kostenstappen in volgorde van de kernformule. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
        <StartBalanceRow
          balance={startBalance}
          onChange={isFirst ? (balance) => {
            if (Math.abs(balance - computedStartBalance) < 0.01) {
              removeBalanceOverride(monthKey);
            } else {
              upsertBalanceOverride(monthKey, balance);
            }
          } : undefined}
        />

        <IncomeSection
          monthKey={monthKey}
          items={incomeItems}
          amount={totalIncome}
          onAdd={addIncomeItem}
          onUpdate={(id, patch) => updateIncomeItem(id, patch)}
          onToggleReceived={(id, received) => updateIncomeItem(id, { received })}
          onRemove={removeIncomeItem}
        />

        <RecurringSection
          items={recurringItems}
          monthKey={monthKey}
          amount={subtotals.recurring}
          deferredItems={deferredItems}
          settlements={recurringSettlements ?? []}
          onRemoveDefer={removeRecurringDefer}
          onSettle={(recurringId, paid, actualAmount) =>
            upsertRecurringSettlement(recurringId, monthKey, paid, actualAmount)
          }
          onFinalizeDefer={(deferId, amount) => settleRecurringDefer(deferId, true, amount)}
          onUnsettleDefer={(deferId) => settleRecurringDefer(deferId, false, 0)}
          onOpenSidepanel={onOpenRecurringSidepanel}
        />

        <ExpenseSection
          monthKey={monthKey}
          items={expenseItems}
          amount={subtotals.oneOff}
          overflowItems={cashOverflowItems}
          onAdd={addExpenseItem}
          onUpdate={(id, patch) => updateExpenseItem(id, patch)}
          onRemove={removeExpenseItem}
        />

        <ReservationSection
          monthKey={monthKey}
          isCurrentMonth={isFirst}
          pots={reservationPots}
          budgetAmount={subtotals.budgets}
          provisionAmount={subtotals.provisions}
          deferredReservationItems={deferredReservationItems}
          onRegisterPayment={onRegisterPayment}
          onRemovePayment={removeReservationPayment}
          onMovePayment={(id, newMonthKey) => updateReservationPayment(id, { monthKey: newMonthKey })}
          onRemoveReservationDefer={removeReservationDefer}
          onSettleReservation={(reservationId, effectiveAmount) =>
            upsertReservationSettlement(reservationId, monthKey, effectiveAmount)
          }
          onRemoveReservationSettlement={(reservationId) =>
            removeReservationSettlement(reservationId, monthKey)
          }
          onFinalize={(reservationId, effectiveAmount) =>
            finalizeReservation(reservationId, monthKey, effectiveAmount)
          }
          onUnfinalize={(reservationId) => {
            // Behoud een aangepaste storting bij het opheffen van een finalisatie;
            // alleen een settlement op het begrote bedrag mag helemaal weg.
            const pot = reservationPots.find((p) => p.reservationId === reservationId);
            if (pot && Math.abs(pot.effectiveAmount - pot.monthlyAmount) >= 0.01) {
              upsertReservationSettlement(reservationId, monthKey, pot.effectiveAmount);
            } else {
              removeReservationSettlement(reservationId, monthKey);
            }
          }}
        />
      </div>

      <BalanceFooter
        available={subtotals.endBalance}
        reserved={reserved}
        showReserved={showReserved}
      />
    </div>
  );
}
