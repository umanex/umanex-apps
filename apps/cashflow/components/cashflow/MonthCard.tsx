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
    endBalance,
    totalIncome,
    totalReservationCashPayments,
    incomeItems,
    recurringItems,
    reservationPots,
    deferredReservationItems,
    deferredItems,
    recurringSettlements,
    expenseItems,
  } = monthData;

  const recurringSubtotaal =
    recurringItems.reduce((s, item) => {
      const budgeted = item.frequency === 'yearly' ? item.amount / 12 : item.amount;
      const isPaid = recurringSettlements.some((st) => st.recurringId === item.id && st.paid);
      return isPaid ? s : s + budgeted;
    }, 0) +
    deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);

  const overflowItems = reservationPots
    .filter((p) => p.potType === 'spaardoel' && !p.finalized)
    .flatMap((p) =>
      p.paymentsThisMonth
        .filter((pay) => pay.fromCash > 0)
        .map((pay) => ({ label: pay.label, amount: pay.fromCash })),
    );

  const expenseSubtotaal =
    expenseItems.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0) +
    overflowItems.reduce((s, i) => s + i.amount, 0);

  const activePots = reservationPots.filter((p) => !p.finalized);

  const deferredReservationSubtotaal = deferredReservationItems.reduce((s, d) => s + d.amount, 0);

  // Subtotaal per pottype, consistent met calcSubtotaal in ReservationSection
  const spaarpotSubtotaal = isFirst
    ? activePots.reduce((s, p) => s + p.deferredFromPrevious + p.provisionThisMonth, 0) + deferredReservationSubtotaal
    : activePots.reduce((s, p) => s + p.provisionThisMonth, 0) + deferredReservationSubtotaal;

  const totaalInkomsten = startBalance + totalIncome;
  const totaalKosten = recurringSubtotaal + expenseSubtotaal + spaarpotSubtotaal;
  const eindsaldo = totaalInkomsten - totaalKosten;

  const { setNodeRef, isOver } = useDroppable({
    id: `month-${monthKey}`,
    data: { monthKey },
  });

  const balanceColor = eindsaldo >= 0 ? 'text-emerald-600' : 'text-destructive';

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border bg-card p-6 space-y-5 transition-colors ${
        isOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      {/* Header: maandnaam + eindsaldo rechts */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-base">{getMonthLabel(monthKey)}</h2>
        <span className={`text-base font-bold tabular-nums ${balanceColor}`}>
          {formatCurrency(eindsaldo)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <p className="text-[11px] text-muted-foreground/70 mb-1">Inkomsten</p>
          <p className={`text-lg font-bold tabular-nums ${totaalInkomsten >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(totaalInkomsten)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <p className="text-[11px] text-muted-foreground/70 mb-1">Kosten</p>
          <p className={`text-lg font-bold tabular-nums ${totaalKosten > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {formatCurrency(totaalKosten)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 ring-1 ring-border/60 px-3 py-3">
          <p className="text-[11px] text-muted-foreground/70 mb-1">Eindsaldo</p>
          <p className={`text-lg font-bold tabular-nums ${eindsaldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(eindsaldo)}
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

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-sm font-medium">Eindsaldo</span>
        <span className={`text-lg font-bold tabular-nums ${balanceColor}`}>
          {formatCurrency(eindsaldo)}
        </span>
      </div>
    </div>
  );
}
