'use client';

import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ReservationPotBalance, ReservationPayment, MonthKey, ReservationPotType } from '../../lib/cashflow/types';
import { formatAmount, getMonthLabel, limitDecimals, roundTo2 } from '../../lib/cashflow/recurring';
import { pendingOverrideDelta } from '../../lib/cashflow/subtotals';
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
  /** Stapbedragen van de twee ledger-regels, uit de calculator. */
  budgetAmount: number;
  provisionAmount: number;
  deferredReservationItems: DeferredReservationDisplayItem[];
  onRegisterPayment: (filterType: ReservationPotType) => void;
  onRemovePayment: (id: string) => void;
  onMovePayment: (id: string, newMonthKey: MonthKey) => void;
  onRemoveReservationDefer: (deferId: string) => void;
  onSettleReservation: (reservationId: string, effectiveAmount: number) => void;
  onRemoveReservationSettlement: (reservationId: string) => void;
  onFinalize: (reservationId: string, effectiveAmount: number) => void;
  onUnfinalize: (reservationId: string) => void;
  /** Afgesloten maand: alles staat vast, dus mag de filter niets verbergen. */
  locked?: boolean;
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
  const hasPayments = pot.paymentsThisMonth.length > 0;
  // Maandelijks budget mag ook zonder betalingen gefinaliseerd worden (besteed = 0);
  // spaardoel is finaliseerbaar zodra er betalingen zijn — het restsaldo wordt
  // bij finalisatie vrijgegeven en de opbouw herstart de maand erna.
  const canShowFinalize = pot.potType === 'maandelijks_budget' || hasPayments;
  // Het veld draagt in élke kolom hetzelfde: de storting van die maand. Voor een budget in
  // de ankermaand toonde het vroeger het restbedrag, en dan moest het wel uitgeschakeld
  // staan — je kunt een afgeleide waarde niet bewerken zonder dat het veld iets anders
  // betekent dan ernaast. Dat restbedrag staat nu op de subregel, zoals bij elke andere pot.
  const isBudgetCurrentMonth = pot.potType === 'maandelijks_budget' && isCurrentMonth;

  const [localAmount, setLocalAmount] = useState(String(roundTo2(pot.provisionThisMonth)));

  useEffect(() => {
    setLocalAmount(String(roundTo2(pot.provisionThisMonth)));
  }, [pot.provisionThisMonth]);

  // De subregel rekent met wat er op dit moment in het veld staat, niet met wat opgeslagen
  // is. De sectiekop doet dat via `pendingOverrideDelta` al; liep de rij daar niet in mee,
  // dan bewoog de kop tijdens het typen terwijl het restbedrag eronder bleef staan.
  const typedAmount = parseFloat(localAmount.replace(',', '.'));
  const pendingProvision =
    isNaN(typedAmount) || typedAmount < 0 ? pot.provisionThisMonth : typedAmount;
  const displayAmount = pendingProvision + pot.deferredFromPrevious - paidFromReservation;

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
    onAmountChange(pot.reservationId, null);
    // Leeg, onleesbaar of negatief: terug naar het begrote bedrag, afrekening weg.
    if (isNaN(amt) || amt < 0) {
      setLocalAmount(String(roundTo2(pot.monthlyAmount)));
      if (pot.hasSettlement) onRemoveSettlement(pot.reservationId);
      return;
    }
    setLocalAmount(String(roundTo2(amt)));
    // Een afrekening ís het verschil met het begrote bedrag. Wie terugtypt naar dat
    // bedrag wil dus geen afrekening van dezelfde waarde, maar geen afrekening meer.
    if (Math.abs(amt - pot.monthlyAmount) < 0.01) {
      if (pot.hasSettlement) onRemoveSettlement(pot.reservationId);
      return;
    }
    // Ongewijzigd t.o.v. wat er al staat: niets naar de store schrijven.
    if (Math.abs(amt - pot.provisionThisMonth) < 0.01) return;
    onSettle(pot.reservationId, amt);
  }

  function handleFinalize() {
    // Budget: effectiveAmount = besteed bedrag (prudente release van onbesteed budget).
    // Spaardoel: behoud de storting van deze maand — het restsaldo komt via de
    // calculator vrij, de storting zelf mag niet herschreven worden.
    const total = pot.paymentsThisMonth.reduce((s, p) => s + p.fromReservation, 0);
    onFinalize(
      pot.reservationId,
      pot.potType === 'maandelijks_budget' ? total : pot.effectiveAmount,
    );
  }

  const zebra = index % 2 !== 0;

  return (
    <div ref={setNodeRef} className={`${isDragging ? 'opacity-30' : ''}`}>
      {/* Pot hoofdrij — altijd label + beschikbare provisie */}
      <div className={`flex gap-2 pl-1 rounded-sm w-full items-start py-1 ${zebra ? 'bg-muted' : ''}`}>
        <button
          {...listeners}
          {...attributes}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing text-sm leading-none select-none shrink-0 mt-0.5"
          aria-label="Versleep spaarpot bijdrage"
        >
          ⠿
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{pot.label}</span>
            {canShowFinalize && (
              <button
                onClick={handleFinalize}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-xs text-primary underline whitespace-nowrap shrink-0"
              >
                Finaliseren →
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* In de ankermaand is een betaling uit een budget al van het banksaldo af, dus
                is wat hier staat het onbesteed gebleven deel — vandaar een eigen woord. */}
            <span className="text-2xs text-muted-foreground opacity-70">
              {isBudgetCurrentMonth ? 'Resterend:' : 'Provisie:'}
            </span>
            <span className={`text-2xs font-semibold tabular-nums ${displayAmount < 0 ? 'text-finance-negative' : 'text-finance-positive'}`}>
              {formatAmount(displayAmount)}
              {displayAmount < 0 && ' ⚠'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <input
            type="text"
            inputMode="decimal"
            value={localAmount}
            onChange={(e) => {
              const v = limitDecimals(e.target.value);
              setLocalAmount(v);
              const parsed = parseFloat(v.replace(',', '.'));
              onAmountChange(pot.reservationId, isNaN(parsed) || parsed < 0 ? null : parsed);
            }}
            onBlur={handleAmountBlur}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-[92px] h-7 px-2 text-dense text-right tabular-nums rounded-sm border border-input bg-background text-finance-deferred focus:outline-none focus:ring-1 focus:ring-ring ${
              pot.hasSettlement ? 'font-medium' : ''
            }`}
            aria-label={pot.potType === 'maandelijks_budget' ? 'Budget deze maand' : 'Stortingsbedrag'}
          />
          {pot.hasSettlement && (
            <span className="text-xs text-muted-foreground tabular-nums" title="Begroot bedrag">
              ({formatAmount(pot.monthlyAmount)})
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
                pi < pot.paymentsThisMonth.length - 1 ? 'border-b border-accent' : ''
              }`}
            >
              {/* Betalingslabel + verwijder/verplaats */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-foreground font-medium">{payment.label}</span>
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
              <div className="flex items-center gap-2 text-2xs">
                {payment.fromCash === 0 ? (
                  <span className="text-finance-positive font-semibold tabular-nums">
                    {formatAmount(payment.invoiceAmount)} betaald met provisie
                  </span>
                ) : (
                  <>
                    <span className="text-muted-foreground opacity-70">Betaald:</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatAmount(payment.invoiceAmount)}</span>
                    {payment.fromReservation > 0 && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground opacity-70">Provisie:</span>
                        <span className="font-semibold text-finance-positive tabular-nums">{formatAmount(payment.fromReservation)}</span>
                      </>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground opacity-70">Cash:</span>
                    <span className="font-semibold text-finance-negative tabular-nums">{formatAmount(payment.fromCash)}</span>
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

function PotSubgroup({
  label,
  potType,
  activePots,
  finalizedPots,
  amount,
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
  locked,
}: {
  label: string;
  potType: ReservationPotType;
  activePots: ReservationPotBalance[];
  finalizedPots: ReservationPotBalance[];
  amount: number;
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
  locked?: boolean;
}) {
  const [showFinalized, setShowFinalized] = useState(false);
  // Zie RecurringSection: in een afgesloten maand is de filterknop uitgeschakeld, dus mag
  // hij de gefinaliseerde potten niet verborgen houden.
  const showAll = locked || showFinalized;
  // Het bedrag komt uit de calculator; alleen wat je op dit moment aan het typen bent
  // — nog niet opgeslagen — wordt er lokaal bovenop gelegd, zodat de kop meebeweegt.
  const subtotaal = amount + pendingOverrideDelta(activePots, overrideAmounts, isCurrentMonth);

  if (activePots.length === 0 && finalizedPots.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <SectionBar
        label={label}
        amount={subtotaal}
        showPaid={finalizedPots.length > 0 ? showAll : undefined}
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

        {showAll &&
          finalizedPots.map((pot, index) => (
            <div
              key={pot.reservationId}
              className={`flex items-center gap-2 h-7 pl-1 rounded-sm w-full opacity-50 ${
                (activePots.length + index) % 2 !== 0 ? 'bg-muted' : ''
              }`}
            >
              <span className="flex-1 text-sm truncate min-w-0">{pot.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatAmount(pot.effectiveAmount)} / {formatAmount(pot.monthlyAmount)}
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
  budgetAmount,
  provisionAmount,
  deferredReservationItems,
  onRegisterPayment,
  onRemovePayment,
  onMovePayment,
  onRemoveReservationDefer,
  onSettleReservation,
  onRemoveReservationSettlement,
  onFinalize,
  onUnfinalize,
  locked,
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
  // De bufferpot hoort niet in de ledger: zijn storting is geen beslissing die je hier
  // neemt maar het saldo dat na alle andere posten overblijft. Hij staat in de footer.
  const spaardoelActive = pots.filter(
    (p) => !p.finalized && p.potType === 'spaardoel' && !p.isDeficitBuffer,
  );
  const spaardoelFinalized = pots.filter(
    (p) => p.finalized && p.potType === 'spaardoel' && !p.isDeficitBuffer,
  );

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
    locked,
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <PotSubgroup
        label="Maandelijkse budgetten"
        potType="maandelijks_budget"
        activePots={budgetActive}
        finalizedPots={budgetFinalized}
        amount={budgetAmount}
        {...sharedProps}
      />
      <PotSubgroup
        label="Provisies"
        potType="spaardoel"
        activePots={spaardoelActive}
        finalizedPots={spaardoelFinalized}
        amount={provisionAmount}
        {...sharedProps}
      />

      {deferredReservationItems.map((d, index) => (
        <div key={d.deferId} className={`flex items-center gap-2 h-7 pl-1 rounded-sm w-full ${index % 2 !== 0 ? 'bg-muted' : ''}`}>
          <span className="flex-1 text-sm truncate min-w-0">
            <span className="text-finance-deferred">{d.label}</span>
            {' '}
            <span className="text-xs text-finance-deferred">
              (uitgesteld van {getMonthLabel(d.fromMonth)})
            </span>
          </span>
          <span className="text-sm font-medium text-finance-deferred tabular-nums shrink-0">
            -{formatAmount(d.amount)}
          </span>
          <button
            onClick={() => onRemoveReservationDefer(d.deferId)}
            className="text-finance-deferred hover:text-finance-deferred-strong transition-colors text-sm leading-none shrink-0"
            aria-label="Uitstelling ongedaan maken"
          >
            ↩
          </button>
        </div>
      ))}
    </div>
  );
}
