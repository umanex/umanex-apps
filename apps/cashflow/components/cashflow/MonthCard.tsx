'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { MonthData } from '../../lib/cashflow/types';
import { formatCurrency, getMonthLabel } from '../../lib/cashflow/recurring';
import { IncomeSection } from './IncomeSection';
import { RecurringSection } from './RecurringSection';
import { ReservationSection } from './ReservationSection';
import { ExpenseSection } from './ExpenseSection';
import { useCashflowActions, useReservationActions } from '../../hooks/useCashflow';


interface MonthCardProps {
  monthData: MonthData;
  onRegisterPayment: () => void;
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
  } = useCashflowActions();

  const { removeReservationPayment, updateReservationPayment } = useReservationActions();

  const {
    monthKey,
    startBalance,
    endBalance,
    totalIncome,
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

  const expenseSubtotaal = expenseItems.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);

  const spaarpotSubtotaal =
    reservationPots
      .filter((p) => !p.finalized)
      .reduce((s, p) => {
        const paid = p.paymentsThisMonth.reduce((s2, pay) => s2 + pay.fromReservation, 0);
        const baseProvision = p.hasSettlement ? p.effectiveAmount : p.monthlyAmount;
        return s + Math.max(0, baseProvision - Math.max(0, paid - p.deferredFromPrevious));
      }, 0) +
    deferredReservationItems.reduce((s, d) => s + d.amount, 0);

  const openstaand = recurringSubtotaal + expenseSubtotaal + spaarpotSubtotaal;
  const totaalInkomsten = isFirst ? totalIncome : startBalance + totalIncome;
  const beschikbaar = totaalInkomsten - openstaand;

  const { setNodeRef, isOver } = useDroppable({
    id: `month-${monthKey}`,
    data: { monthKey },
  });

  const balanceColor = beschikbaar >= 0 ? 'text-emerald-600' : 'text-destructive';

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border bg-card p-5 space-y-4 transition-colors ${
        isOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      {/* Header: maandnaam + eindsaldo rechts */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-base">{getMonthLabel(monthKey)}</h2>
        <span className={`text-base font-bold tabular-nums ${balanceColor}`}>
          {formatCurrency(beschikbaar)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-0.5">Inkomsten</p>
          <p className={`text-sm font-semibold tabular-nums ${totaalInkomsten >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(totaalInkomsten)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-0.5">Openstaand</p>
          <p className="text-sm font-semibold tabular-nums text-destructive">
            {formatCurrency(openstaand)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground mb-0.5">Eindsaldo</p>
          <p className={`text-sm font-semibold tabular-nums ${beschikbaar >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(beschikbaar)}
          </p>
        </div>
      </div>

      <IncomeSection
        monthKey={monthKey}
        items={incomeItems}
        startBalance={startBalance}
        isFirstMonth={isFirst}
        onAdd={addIncomeItem}
        onUpdate={(id, patch) => updateIncomeItem(id, patch)}
        onToggleReceived={(id, received) => updateIncomeItem(id, { received })}
        onRemove={removeIncomeItem}
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
        onAdd={addExpenseItem}
        onUpdate={(id, patch) => updateExpenseItem(id, patch)}
        onRemove={removeExpenseItem}
      />

      <ReservationSection
        monthKey={monthKey}
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
          {formatCurrency(beschikbaar)}
        </span>
      </div>
    </div>
  );
}
