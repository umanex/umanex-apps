'use client';

import { useDroppable } from '@dnd-kit/core';
import type { MonthData, ReservationPotType } from '../../lib/cashflow/types';
import { addMonth, getMonthLabel } from '../../lib/cashflow/recurring';
import { BalanceFooter } from './BalanceFooter';
import { MonthVariance } from './MonthVariance';
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
  onRepeatMonth: () => void;
  isFirst?: boolean;
  /** Gelijk voor alle maanden, zodat de drie footers even hoog blijven. */
  showReserved: boolean;
  showBuffer: boolean;
  /**
   * Deze maand ligt in het verleden en is nooit afgesloten, dus wat je ziet is opnieuw
   * doorgerekend uit je huidige gegevens — geen vastgelegde historie.
   */
  isReconstruction: boolean;
  /** Deze maand is afgesloten: de kolom toont het snapshot en is niet bewerkbaar. */
  locked: boolean;
  /** Beschikbaar voor een voorbije maand die nog niet afgesloten is. */
  onCloseMonth?: () => void;
  onReopenMonth?: () => void;
}

export function MonthCard({
  monthData,
  onRegisterPayment,
  onOpenRecurringSidepanel,
  onRepeatMonth,
  isFirst,
  showReserved,
  showBuffer,
  isReconstruction,
  locked,
  onCloseMonth,
  onReopenMonth,
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
  // De buffer telt apart: dat is geen schuld aan iemand anders maar eigen geld dat
  // achter de hand blijft, en het is precies de pot die een tekort opvangt.
  const reserved = reservationPots
    .filter((p) => p.potType === 'spaardoel' && !p.isDeficitBuffer)
    .reduce((s, p) => s + p.potBalance, 0);

  const buffer = reservationPots
    .filter((p) => p.isDeficitBuffer)
    .reduce((s, p) => s + p.potBalance, 0);

  const { setNodeRef, isOver } = useDroppable({
    id: `month-${monthKey}`,
    data: { monthKey },
    // De uitgeschakelde fieldset blokkeert alleen formulierelementen; zonder dit kon je een
    // post nog steeds in een afgesloten maand laten vallen en zo de historie wijzigen.
    disabled: locked,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full min-h-0 rounded-xl border overflow-hidden transition-colors ${
        locked ? 'bg-[var(--umanexNeutral50)]' : 'bg-card'
      } ${isOver ? 'border-primary ring-2 ring-primary/30' : 'border-[var(--umanexPrimary50)]'}`}
    >
      {/* Vaste maandheader — blijft staan terwijl de ledger scrollt. */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-3 bg-[var(--umanexNeutral100)]">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-base text-[var(--umanexNeutral800)] truncate">
            {getMonthLabel(monthKey)}
          </h2>
          {locked && (
            <span
              title={'Afgesloten maand. Wat je ziet is vastgelegd op het moment van afsluiten en verandert niet meer mee met je gegevens.'}
              className="shrink-0 px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium bg-[var(--umanexNeutral800)] text-[var(--umanexNeutral50)]"
            >
              afgesloten
            </span>
          )}
          {!locked && isReconstruction && (
            <span
              title="Deze maand is nooit afgesloten. Wat je ziet is opnieuw doorgerekend uit je huidige gegevens, niet wat er destijds stond."
              className="shrink-0 px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium bg-[var(--umanexNeutral200)] text-[var(--umanexNeutral600)]"
            >
              reconstructie
            </span>
          )}
        </div>
        {locked ? (
          <button
            onClick={onReopenMonth}
            title="Afsluiting opheffen: de maand rekent daarna weer mee met je huidige gegevens."
            className="shrink-0 h-7 px-2 rounded-[4px] text-[13px] text-[var(--umanexNeutral500)] hover:text-[var(--umanexNeutral800)] hover:bg-[var(--umanexNeutral200)] transition-colors whitespace-nowrap"
          >
            Heropenen
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            {onCloseMonth && (
              <button
                onClick={onCloseMonth}
                title="Deze maand bevriezen zoals ze nu staat, zodat latere wijzigingen de historie niet meer veranderen."
                className="h-7 px-2 rounded-[4px] text-[13px] text-[var(--umanexNeutral500)] hover:text-[var(--umanexNeutral800)] hover:bg-[var(--umanexNeutral200)] transition-colors whitespace-nowrap"
              >
                Afsluiten
              </button>
            )}
            <button
              onClick={onRepeatMonth}
              title={`Posten van ${getMonthLabel(addMonth(monthKey, -1))} overnemen`}
              className="h-7 px-2 rounded-[4px] text-[13px] text-[var(--umanexNeutral500)] hover:text-[var(--umanexNeutral800)] hover:bg-[var(--umanexNeutral200)] transition-colors whitespace-nowrap"
            >
              ↻ Herhaal
            </button>
          </div>
        )}
      </div>

      {/* Ledger: beginsaldo, dan de vier kostenstappen in volgorde van de kernformule. */}
      <fieldset
        disabled={locked}
        className="flex-1 min-h-0 overflow-y-auto p-4 m-0 border-0 flex flex-col gap-5"
      >
        {locked && <MonthVariance data={monthData} />}

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
      </fieldset>

      <BalanceFooter
        available={subtotals.endBalance}
        reserved={reserved}
        buffer={buffer}
        showReserved={showReserved}
        showBuffer={showBuffer}
      />
    </div>
  );
}
