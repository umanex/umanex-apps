'use client';

import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ReservationPotBalance, ReservationPayment, MonthKey, ReservationPotType } from '../../lib/cashflow/types';
import { formatCurrency, getMonthLabel, limitDecimals, roundTo2 } from '../../lib/cashflow/recurring';
import { SectionBar } from './SectionBar';

interface DeferredReservationDisplayItem {
  deferId: string;
  reservationId: string;
  label: string;
  amount: number;
  fromMonth: MonthKey;
}

interface ReservationSectionProps {
  monthKey: MonthKey;
  isCurrentMonth?: boolean;
  pots: ReservationPotBalance[];
  deferredReservationItems: DeferredReservationDisplayItem[];
  onRegisterPayment: (filterType: ReservationPotType) => void;
  onRemovePayment: (id: string) => void;
  onMovePayment: (id: string, newMonthKey: MonthKey) => void;
  onRemoveReservationDefer: (deferId: string) => void;
  onSettleReservation: (reservationId: string, effectiveAmount: number) => void;
  onRemoveReservationSettlement: (reservationId: string) => void;
  onFinalize: (reservationId: string, effectiveAmount: number) => void;
  onUnfinalize: (reservationId: string) => void;
}

function nextMonthKey(monthKey: MonthKey): MonthKey {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, '0')}`;
}

function DraggablePotRow({
  pot,
  index,
  monthKey,
  isCurrentMonth,
  onRemovePayment,
  onMovePayment,
  onSettle,
  onRemoveSettlement,
  onFinalize,
  onAmountChange,
}: {
  pot: ReservationPotBalance;
  index: number;
  monthKey: MonthKey;
  isCurrentMonth?: boolean;
  onRemovePayment: (id: string) => void;
  onMovePayment: (id: string, newMonthKey: MonthKey) => void;
  onSettle: (reservationId: string, effectiveAmount: number) => void;
  onRemoveSettlement: (reservationId: string) => void;
  onFinalize: (reservationId: string, effectiveAmount: number) => void;
  onAmountChange: (reservationId: string, amount: number | null) => void;
}) {
  const paidFromReservation = pot.paymentsThisMonth.reduce((s, p) => s + p.fromReservation, 0);
  const displayAmount = pot.provisionThisMonth + pot.deferredFromPrevious - paidFromReservation;
  const hasPayments = pot.paymentsThisMonth.length > 0;
  const totalInvoiced = pot.paymentsThisMonth.reduce((s, p) => s + p.invoiceAmount, 0);
  const canFinalize = pot.potType === 'maandelijks_budget' ||
    totalInvoiced >= pot.provisionThisMonth + pot.deferredFromPrevious;
  const isBudgetCurrentMonth = pot.potType === 'maandelijks_budget' && isCurrentMonth;

  const syncValue = isBudgetCurrentMonth ? displayAmount : pot.provisionThisMonth;
  const [localAmount, setLocalAmount] = useState(String(roundTo2(syncValue)));

  useEffect(() => {
    setLocalAmount(String(roundTo2(isBudgetCurrentMonth ? displayAmount : pot.provisionThisMonth)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayAmount, pot.provisionThisMonth]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `reservation-pot-${pot.reservationId}-${monthKey}`,
    data: {
      type: 'reservation-pot',
      id: pot.reservationId,
      sourceMonth: monthKey,
      label: pot.label,
      amount: pot.monthlyAmount,
    },
  });

  function handleAmountBlur() {
    const amt = parseFloat(localAmount.replace(',', '.'));
    const defaultValue = pot.provisionThisMonth;
    if (isNaN(amt) || amt < 0) {
      setLocalAmount(String(roundTo2(defaultValue)));
      onAmountChange(pot.reservationId, null);
      onRemoveSettlement(pot.reservationId);
      return;
    }
    onAmountChange(pot.reservationId, null);
    if (Math.abs(amt - defaultValue) < 0.01) {
      if (!pot.hasSettlement) onRemoveSettlement(pot.reservationId);
    } else {
      setLocalAmount(String(roundTo2(amt)));
      onSettle(pot.reservationId, amt);
    }
  }

  function handleFinalize() {
    const total = pot.paymentsThisMonth.reduce((s, p) => s + p.fromReservation, 0);
    onFinalize(pot.reservationId, total);
  }

  const zebra = index % 2 !== 0;

  return (
    <div ref={setNodeRef} className={`${isDragging ? 'opacity-30' : ''}`}>
      {/* Pot hoofdrij — altijd label + beschikbare provisie */}
      <div className={`flex gap-2 pl-1 rounded-[4px] w-full items-start py-1 ${zebra ? 'bg-[var(--umanexNeutral50)]' : ''}`}>
        <button
          {...listeners}
          {...attributes}
          className="text-[var(--umanexNeutral500)] hover:text-foreground cursor-grab active:cursor-grabbing text-sm leading-none select-none shrink-0 mt-0.5"
          aria-label="Versleep spaarpot bijdrage"
        >
          ⠿
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--umanexTextTitle)] truncate">{pot.label}</span>
            {hasPayments && canFinalize && (
              <button
                onClick={handleFinalize}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-xs text-[var(--umanexPrimary500)] underline whitespace-nowrap shrink-0"
              >
                Finaliseren →
              </button>
            )}
          </div>
          {!isBudgetCurrentMonth && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[var(--umanexNeutral500)] opacity-70">Provisie:</span>
              <span className={`text-[11px] font-semibold tabular-nums ${displayAmount < 0 ? 'text-[var(--umanexPrimary500)]' : 'text-emerald-600'}`}>
                {formatCurrency(displayAmount)}
                {displayAmount < 0 && ' ⚠'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <input
            type="text"
            inputMode="decimal"
            value={localAmount}
            disabled={isBudgetCurrentMonth}
            onChange={(e) => {
              const v = limitDecimals(e.target.value);
              setLocalAmount(v);
              const parsed = parseFloat(v.replace(',', '.'));
              onAmountChange(pot.reservationId, isNaN(parsed) || parsed < 0 ? null : parsed);
            }}
            onBlur={isBudgetCurrentMonth ? undefined : handleAmountBlur}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-[92px] h-7 px-2 text-[13px] text-right tabular-nums rounded-[4px] border border-[var(--umanexUiBorder)] focus:outline-none focus:ring-1 focus:ring-ring ${
              isBudgetCurrentMonth
                ? `bg-[var(--umanexNeutral50)] cursor-default ${displayAmount < 0 ? 'text-[var(--umanexPrimary500)] font-medium' : 'text-emerald-600'}`
                : `bg-white ${pot.hasSettlement ? 'text-amber-600 font-medium' : 'text-amber-600'}`
            }`}
            aria-label={isBudgetCurrentMonth ? 'Resterende provisie' : 'Stortingsbedrag'}
          />
          {!isBudgetCurrentMonth && pot.hasSettlement && (
            <span className="text-xs text-muted-foreground tabular-nums" title="Begroot bedrag">
              ({formatCurrency(pot.monthlyAmount)})
            </span>
          )}
        </div>
      </div>

      {/* Betalingsdetails — enkel wanneer betalingen aanwezig */}
      {hasPayments && (
        <div className="pl-[22px] flex flex-col">
          {pot.paymentsThisMonth.map((payment, pi) => (
            <div
              key={payment.id}
              className={`flex flex-col gap-1 py-2 ${
                pi < pot.paymentsThisMonth.length - 1 ? 'border-b border-[var(--umanexPrimary50)]' : ''
              }`}
            >
              {/* Betalingslabel + verwijder/verplaats */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--umanexSecondary500)] font-medium">{payment.label}</span>
                <button
                  onClick={() => onMovePayment(payment.id, nextMonthKey(monthKey))}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs leading-none"
                  title="Verplaats naar volgende maand"
                >
                  →
                </button>
                <button
                  onClick={() => onRemovePayment(payment.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
                  aria-label="Verwijder betaling"
                >
                  ×
                </button>
              </div>
              {/* Betaald · Provisie · Cash */}
              <div className="flex items-center gap-2 text-[11px]">
                {payment.fromCash === 0 ? (
                  <span className="text-emerald-600 font-semibold tabular-nums">
                    {formatCurrency(payment.invoiceAmount)} betaald met provisie
                  </span>
                ) : (
                  <>
                    <span className="text-[var(--umanexNeutral500)] opacity-70">Betaald:</span>
                    <span className="font-semibold text-[var(--umanexTextTitle)] tabular-nums">{formatCurrency(payment.invoiceAmount)}</span>
                    {payment.fromReservation > 0 && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[var(--umanexNeutral500)] opacity-70">Provisie:</span>
                        <span className="font-semibold text-emerald-600 tabular-nums">{formatCurrency(payment.fromReservation)}</span>
                      </>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[var(--umanexNeutral500)] opacity-70">Cash:</span>
                    <span className="font-semibold text-[var(--umanexPrimary500)] tabular-nums">{formatCurrency(payment.fromCash)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function calcSubtotaal(
  activePots: ReservationPotBalance[],
  overrideAmounts: Record<string, number>,
  isCurrentMonth: boolean,
): number {
  return activePots.reduce((s, p) => {
    if (isCurrentMonth) {
      const paid = p.paymentsThisMonth.reduce((ps, pay) => ps + pay.fromReservation, 0);
      if (p.potType === 'maandelijks_budget') return s + p.provisionThisMonth - paid;
      if (p.potType === 'spaardoel') return s + p.deferredFromPrevious + p.provisionThisMonth - paid;
    }
    return s + (overrideAmounts[p.reservationId] ?? p.displayContribution);
  }, 0);
}

function PotSubgroup({
  label,
  potType,
  activePots,
  finalizedPots,
  monthKey,
  isCurrentMonth,
  overrideAmounts,
  onRegisterPayment,
  onRemovePayment,
  onMovePayment,
  onSettleReservation,
  onRemoveReservationSettlement,
  onFinalize,
  onUnfinalize,
  onAmountChange,
}: {
  label: string;
  potType: ReservationPotType;
  activePots: ReservationPotBalance[];
  finalizedPots: ReservationPotBalance[];
  monthKey: MonthKey;
  isCurrentMonth: boolean;
  overrideAmounts: Record<string, number>;
  onRegisterPayment: (filterType: ReservationPotType) => void;
  onRemovePayment: (id: string) => void;
  onMovePayment: (id: string, newMonthKey: MonthKey) => void;
  onSettleReservation: (reservationId: string, effectiveAmount: number) => void;
  onRemoveReservationSettlement: (reservationId: string) => void;
  onFinalize: (reservationId: string, effectiveAmount: number) => void;
  onUnfinalize: (reservationId: string) => void;
  onAmountChange: (reservationId: string, amount: number | null) => void;
}) {
  const [showFinalized, setShowFinalized] = useState(false);
  const subtotaal = calcSubtotaal(activePots, overrideAmounts, isCurrentMonth);

  if (activePots.length === 0 && finalizedPots.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <SectionBar
        label={label}
        subtotaal={subtotaal > 0 ? formatCurrency(subtotaal) : undefined}
        showPaid={finalizedPots.length > 0 ? showFinalized : undefined}
        onFilterToggle={finalizedPots.length > 0 ? () => setShowFinalized((v) => !v) : undefined}
        onAdd={() => onRegisterPayment(potType)}
        addAriaLabel="Betaling registreren"
      />

      <div className="flex flex-col gap-1 w-full">
        {activePots.map((pot, index) => (
          <DraggablePotRow
            key={pot.reservationId}
            pot={pot}
            index={index}
            monthKey={monthKey}
            isCurrentMonth={isCurrentMonth}
            onRemovePayment={onRemovePayment}
            onMovePayment={onMovePayment}
            onSettle={onSettleReservation}
            onRemoveSettlement={onRemoveReservationSettlement}
            onFinalize={onFinalize}
            onAmountChange={onAmountChange}
          />
        ))}

        {showFinalized &&
          finalizedPots.map((pot, index) => (
            <div
              key={pot.reservationId}
              className={`flex items-center gap-2 h-7 pl-1 rounded-[4px] w-full opacity-50 ${
                (activePots.length + index) % 2 !== 0 ? 'bg-[var(--umanexNeutral50)]' : ''
              }`}
            >
              <span className="flex-1 text-sm truncate min-w-0">{pot.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatCurrency(pot.effectiveAmount)} / {formatCurrency(pot.monthlyAmount)}
              </span>
              <button
                onClick={() => onUnfinalize(pot.reservationId)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Finalisatie opheffen"
              >
                ↩
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

export function ReservationSection({
  monthKey,
  isCurrentMonth = false,
  pots,
  deferredReservationItems,
  onRegisterPayment,
  onRemovePayment,
  onMovePayment,
  onRemoveReservationDefer,
  onSettleReservation,
  onRemoveReservationSettlement,
  onFinalize,
  onUnfinalize,
}: ReservationSectionProps) {
  const [overrideAmounts, setOverrideAmounts] = useState<Record<string, number>>({});

  function handleAmountChange(reservationId: string, amount: number | null) {
    setOverrideAmounts((prev) => {
      if (amount === null) {
        const next = { ...prev };
        delete next[reservationId];
        return next;
      }
      return { ...prev, [reservationId]: amount };
    });
  }

  const budgetActive = pots.filter((p) => !p.finalized && p.potType === 'maandelijks_budget');
  const budgetFinalized = pots.filter((p) => p.finalized && p.potType === 'maandelijks_budget');
  const spaardoelActive = pots.filter((p) => !p.finalized && p.potType === 'spaardoel');
  const spaardoelFinalized = pots.filter((p) => p.finalized && p.potType === 'spaardoel');

  const hasContent =
    budgetActive.length > 0 || budgetFinalized.length > 0 ||
    spaardoelActive.length > 0 || spaardoelFinalized.length > 0 ||
    deferredReservationItems.length > 0;

  if (!hasContent) return null;

  const sharedProps = {
    monthKey,
    isCurrentMonth,
    overrideAmounts,
    onRegisterPayment,
    onRemovePayment,
    onMovePayment,
    onSettleReservation,
    onRemoveReservationSettlement,
    onFinalize,
    onUnfinalize,
    onAmountChange: handleAmountChange,
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <PotSubgroup
        label="Maandelijkse budgetten"
        potType="maandelijks_budget"
        activePots={budgetActive}
        finalizedPots={budgetFinalized}
        {...sharedProps}
      />
      <PotSubgroup
        label="Provisies"
        potType="spaardoel"
        activePots={spaardoelActive}
        finalizedPots={spaardoelFinalized}
        {...sharedProps}
      />

      {deferredReservationItems.map((d, index) => (
        <div key={d.deferId} className={`flex items-center gap-2 h-7 pl-1 rounded-[4px] w-full ${index % 2 !== 0 ? 'bg-[var(--umanexNeutral50)]' : ''}`}>
          <span className="flex-1 text-sm truncate min-w-0">
            <span className="text-amber-600">{d.label}</span>
            {' '}
            <span className="text-xs text-amber-500">
              (uitgesteld van {getMonthLabel(d.fromMonth)})
            </span>
          </span>
          <span className="text-sm font-medium text-amber-600 tabular-nums shrink-0">
            -{formatCurrency(d.amount)}
          </span>
          <button
            onClick={() => onRemoveReservationDefer(d.deferId)}
            className="text-amber-500 hover:text-amber-700 transition-colors text-sm leading-none shrink-0"
            aria-label="Uitstelling ongedaan maken"
          >
            ↩
          </button>
        </div>
      ))}
    </div>
  );
}
