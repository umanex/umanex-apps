'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { MonthData, ReservationPotType } from '../../lib/cashflow/types';
import { formatCurrency, getMonthLabel } from '../../lib/cashflow/recurring';
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
}

export function MonthCard({ monthData, onRegisterPayment, onOpenRecurringSidepanel, isFirst }: MonthCardProps) {
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
    totalOutstandingCosts,
    incomeItems,
    recurringItems,
    reservationPots,
    deferredReservationItems,
    deferredItems,
    recurringSettlements,
    expenseItems,
  } = monthData;

  const overflowItems = reservationPots
    .filter((p) => !p.finalized)
    .flatMap((p) =>
      p.paymentsThisMonth
        .filter((pay) => pay.fromCash > 0)
        .map((pay) => ({ label: pay.label, amount: pay.fromCash })),
    );

  const unpaidExpensesTotal = expenseItems.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);

  const vastSubtotaal =
    (totalOutstandingCosts - unpaidExpensesTotal) +
    deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);

  const expenseSubtotaal =
    unpaidExpensesTotal +
    overflowItems.reduce((s, i) => s + i.amount, 0);

  const budgetSubtotaal = reservationPots
    .filter((p) => p.potType === 'maandelijks_budget')
    .reduce((s, p) => s + p.paymentsThisMonth.reduce((ps, pay) => ps + pay.fromReservation, 0), 0);

  const provisieSubtotaal =
    reservationPots
      .filter((p) => p.potType === 'spaardoel')
      .reduce((s, p) => s + (isFirst ? p.deferredFromPrevious + p.provisionThisMonth : p.provisionThisMonth), 0) +
    deferredReservationItems.reduce((s, d) => s + d.amount, 0);

  const totaalInkomsten = startBalance + totalIncome;
  const totaalKosten = vastSubtotaal + expenseSubtotaal + budgetSubtotaal + provisieSubtotaal;
  const eindsaldo = totaalInkomsten - totaalKosten;

  const { setNodeRef, isOver } = useDroppable({
    id: `month-${monthKey}`,
    data: { monthKey },
  });

  const balanceColor = eindsaldo >= 0 ? 'text-emerald-600' : 'text-destructive';

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border bg-card overflow-hidden transition-colors ${
        isOver ? 'border-primary ring-2 ring-primary/30' : 'border-[var(--umanexPrimary50)]'
      }`}
    >
      {/* Gekleurde header strip: maandnaam + eindsaldo */}
      <div className="flex items-center justify-between px-6 py-3 bg-[var(--umanexNeutral100)]">
        <h2 className="font-semibold text-base text-[var(--umanexTextTitle)]">
          {getMonthLabel(monthKey)}
        </h2>
        <span className={`text-base font-bold tabular-nums ${balanceColor}`}>
          {formatCurrency(eindsaldo)}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-5">
        {/* 2 KPI tiles: Inkomsten + Uitgaves */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--umanexNeutral50)] border border-[var(--umanexNeutral200)] px-3 py-3 flex items-center justify-between">
            <p className="text-sm text-[var(--umanexTextTitle)]">Inkomsten</p>
            <p className={`text-lg font-bold tabular-nums whitespace-nowrap ${totaalInkomsten >= 0 ? 'text-emerald-600' : 'text-[var(--umanexPrimary500)]'}`}>
              {formatCurrency(totaalInkomsten)}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--umanexNeutral50)] border border-[var(--umanexNeutral200)] px-3 py-3 flex items-center justify-between">
            <p className="text-sm text-[var(--umanexTextTitle)]">Uitgaves</p>
            <p className={`text-lg font-bold tabular-nums whitespace-nowrap ${totaalKosten > 0 ? 'text-[var(--umanexPrimary500)]' : 'text-muted-foreground'}`}>
              {formatCurrency(totaalKosten)}
            </p>
          </div>
        </div>

        <IncomeSection
          monthKey={monthKey}
          items={incomeItems}
          startBalance={startBalance}
          computedStartBalance={computedStartBalance}
          isFirstMonth={isFirst}
          onAdd={addIncomeItem}
          onUpdate={(id, patch) => updateIncomeItem(id, patch)}
          onToggleReceived={(id, received) => updateIncomeItem(id, { received })}
          onRemove={removeIncomeItem}
          onSetStartBalance={isFirst ? (balance) => {
            if (Math.abs(balance - computedStartBalance) < 0.01) {
              removeBalanceOverride(monthKey);
            } else {
              upsertBalanceOverride(monthKey, balance);
            }
          } : undefined}
        />

        <RecurringSection
          items={recurringItems}
          monthKey={monthKey}
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
          overflowItems={overflowItems}
          onAdd={addExpenseItem}
          onUpdate={(id, patch) => updateExpenseItem(id, patch)}
          onRemove={removeExpenseItem}
        />

        <ReservationSection
          monthKey={monthKey}
          isCurrentMonth={isFirst}
          pots={reservationPots}
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
          onUnfinalize={(reservationId) =>
            removeReservationSettlement(reservationId, monthKey)
          }
        />
      </div>

      {/* Footer eindsaldo (Q3: behouden) */}
      <div className="border-t border-[var(--umanexPrimary50)] px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--umanexTextTitle)]">Eindsaldo</span>
        <span className={`text-lg font-bold tabular-nums ${balanceColor}`}>
          {formatCurrency(eindsaldo)}
        </span>
      </div>
    </div>
  );
}
