'use client';

import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { RecurringItem, RecurringSettlement, MonthKey } from '../../lib/cashflow/types';
import { formatAmount, getMonthLabel } from '../../lib/cashflow/recurring';
import { SectionBar } from './SectionBar';

interface DeferredDisplayItem {
  deferId: string;
  recurringId: string;
  label: string;
  amount: number;
  fromMonth: MonthKey;
  paid: boolean;
  paidAmount: number;
}

interface RecurringSectionProps {
  items: RecurringItem[];
  monthKey: MonthKey;
  /** Stapbedrag van deze ledger-regel, uit de calculator. */
  amount: number;
  deferredItems: DeferredDisplayItem[];
  settlements: RecurringSettlement[];
  onRemoveDefer: (deferId: string) => void;
  onSettle: (recurringId: string, paid: boolean, actualAmount: number) => void;
  onFinalizeDefer: (deferId: string, amount: number) => void;
  onUnsettleDefer: (deferId: string) => void;
  onOpenSidepanel: () => void;
  /** Afgesloten maand: alles staat vast, dus mag de filter niets verbergen. */
  locked?: boolean;
}

function DraggableRecurringItem({
  item,
  index,
  monthKey,
  settlement,
  onSettle,
}: {
  item: RecurringItem;
  index: number;
  monthKey: MonthKey;
  settlement: RecurringSettlement | undefined;
  onSettle: (recurringId: string, paid: boolean, actualAmount: number) => void;
}) {
  const budgeted = item.frequency === 'yearly' ? item.amount / 12 : item.amount;
  const isPaid = settlement?.paid ?? false;
  const actualAmount = settlement?.actualAmount ?? budgeted;
  const [localAmount, setLocalAmount] = useState(String(actualAmount));

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recurring-${item.id}-${monthKey}`,
    data: {
      type: 'recurring',
      id: item.id,
      sourceMonth: monthKey,
      label: item.label,
      amount: budgeted,
    },
  });

  function handleCheck(checked: boolean) {
    const amt = parseFloat(localAmount.replace(',', '.'));
    const effective = isNaN(amt) || amt < 0 ? budgeted : amt;
    onSettle(item.id, checked, effective);
  }

  function handleAmountBlur() {
    const amt = parseFloat(localAmount.replace(',', '.'));
    const effective = isNaN(amt) || amt < 0 ? budgeted : amt;
    setLocalAmount(String(effective));
    if (isPaid) onSettle(item.id, true, effective);
  }

  const hasDeviation = isPaid && Math.abs(actualAmount - budgeted) > 0.01;
  const zebra = index % 2 !== 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 h-7 pl-2 rounded-[4px] w-full ${
        isDragging ? 'opacity-30' : (isPaid ? 'opacity-70 ' : '') + (zebra ? 'bg-[var(--umanexNeutral50)]' : '')
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-[var(--umanexNeutral500)] hover:text-foreground cursor-grab active:cursor-grabbing text-sm leading-none select-none shrink-0"
        aria-label="Versleep"
        tabIndex={0}
      >
        ⠿
      </button>

      <input
        type="checkbox"
        checked={isPaid}
        onChange={(e) => handleCheck(e.target.checked)}
        className={`h-3.5 w-3.5 rounded border-input flex-shrink-0 ${isPaid ? 'accent-emerald-600' : 'accent-primary'}`}
        aria-label={`${item.label} betaald`}
      />

      <span className={`flex-1 text-sm truncate min-w-0 ${isPaid ? 'line-through text-muted-foreground' : ''}`}>
        {item.label}
      </span>

      {item.frequency === 'yearly' && (
        <span className="text-xs text-muted-foreground shrink-0">(jaarlijks)</span>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <input
          type="text"
          inputMode="decimal"
          value={localAmount}
          onChange={(e) => setLocalAmount(e.target.value)}
          onBlur={handleAmountBlur}
          className={`w-[92px] h-7 px-2 text-[13px] text-right tabular-nums rounded-[4px] border border-[var(--umanexNeutral300)] bg-white focus:outline-none focus:ring-1 focus:ring-ring ${
            isPaid ? 'text-emerald-600' : ''
          }`}
          aria-label="Werkelijk bedrag"
        />
        {hasDeviation && (
          <span className="text-xs text-amber-500 tabular-nums shrink-0" title={`Begroot: ${formatAmount(budgeted)}`}>
            ({formatAmount(budgeted)})
          </span>
        )}
      </div>
    </div>
  );
}

function DeferredRecurringItem({
  item,
  index,
  onFinalize,
  onUnsettle,
  onRemoveDefer,
}: {
  item: DeferredDisplayItem;
  index: number;
  onFinalize: (deferId: string, amount: number) => void;
  onUnsettle: (deferId: string) => void;
  onRemoveDefer: (deferId: string) => void;
}) {
  const [localChecked, setLocalChecked] = useState(false);
  const [localAmount, setLocalAmount] = useState(String(item.amount));

  useEffect(() => {
    setLocalAmount(String(item.paid ? item.paidAmount : item.amount));
    if (item.paid) setLocalChecked(false);
  }, [item.paid, item.paidAmount, item.amount]);

  function handleCheck(checked: boolean) {
    setLocalChecked(checked);
    if (!checked) setLocalAmount(String(item.amount));
  }

  function handleAmountBlur() {
    const amt = parseFloat(localAmount.replace(',', '.'));
    if (isNaN(amt) || amt < 0) setLocalAmount(String(item.amount));
  }

  function handleFinalize() {
    const amt = parseFloat(localAmount.replace(',', '.'));
    const effective = isNaN(amt) || amt < 0 ? item.amount : amt;
    onFinalize(item.deferId, effective);
  }

  const showInputs = localChecked && !item.paid;
  const hasDeviation = item.paid && Math.abs(item.paidAmount - item.amount) > 0.01;
  const zebra = index % 2 !== 0;

  return (
    <div className={`flex items-center gap-2 h-7 pl-2 rounded-[4px] w-full ${zebra ? 'bg-[var(--umanexNeutral50)]' : ''}`}>
      <input
        type="checkbox"
        checked={localChecked || item.paid}
        disabled={item.paid}
        onChange={(e) => handleCheck(e.target.checked)}
        className={`h-3.5 w-3.5 rounded border-input flex-shrink-0 ${item.paid ? 'accent-emerald-600' : 'accent-primary'}`}
        aria-label={`${item.label} betaald`}
      />
      <span className={`flex-1 text-sm truncate min-w-0 ${item.paid ? 'opacity-60' : ''}`}>
        <span className={item.paid ? 'line-through text-muted-foreground' : 'text-amber-600'}>
          {item.label}
        </span>
        {' '}
        <span className="text-xs text-muted-foreground">
          (uitgesteld van {getMonthLabel(item.fromMonth)})
        </span>
      </span>
      {showInputs ? (
        <>
          <input
            type="text"
            inputMode="decimal"
            value={localAmount}
            onChange={(e) => setLocalAmount(e.target.value)}
            onBlur={handleAmountBlur}
            className="w-[92px] h-7 px-2 text-[13px] text-right tabular-nums rounded-[4px] border border-[var(--umanexNeutral300)] bg-white focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Werkelijk bedrag"
          />
          <button
            onClick={handleFinalize}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
          >
            Finaliseer →
          </button>
        </>
      ) : (
        <>
          <span className={`text-sm tabular-nums shrink-0 ${item.paid ? 'text-muted-foreground' : 'font-medium text-[var(--umanexPrimary500)]'}`}>
            {formatAmount(item.paid ? item.paidAmount : item.amount)}
          </span>
          {hasDeviation && (
            <span className="text-xs text-muted-foreground tabular-nums shrink-0" title={`Begroot: ${formatAmount(item.amount)}`}>
              ({formatAmount(item.amount)})
            </span>
          )}
        </>
      )}
      {item.paid ? (
        <button
          onClick={() => onUnsettle(item.deferId)}
          className="text-muted-foreground hover:text-amber-600 transition-colors text-sm leading-none shrink-0"
          aria-label="Betaling ongedaan"
        >
          ↩
        </button>
      ) : (
        !localChecked && (
          <button
            onClick={() => onRemoveDefer(item.deferId)}
            className="text-amber-500 hover:text-amber-700 transition-colors text-sm leading-none shrink-0"
            aria-label="Uitstelling ongedaan maken"
          >
            ↩
          </button>
        )
      )}
    </div>
  );
}

export function RecurringSection({
  items,
  monthKey,
  amount,
  deferredItems,
  settlements,
  onRemoveDefer,
  onSettle,
  onFinalizeDefer,
  onUnsettleDefer,
  onOpenSidepanel,
  locked,
}: RecurringSectionProps) {
  const [showPaid, setShowPaid] = useState(false);
  // In een afgesloten maand staat alles vast en is de filterknop uitgeschakeld door de
  // omliggende fieldset. Zou de filter dan dicht blijven, dan verdwijnen de betaalde
  // regels permanent achter een knop die niet meer reageert — met de sectiekop die het
  // volledige bedrag blijft tonen. Bevroren betekent dus: alles zichtbaar.
  const showAll = locked || showPaid;

  const unpaidItems = items.filter(
    (item) => !settlements.find((s) => s.recurringId === item.id && s.paid),
  );
  const paidItems = items.filter(
    (item) => !!settlements.find((s) => s.recurringId === item.id && s.paid),
  );
  const paidDeferredCount = deferredItems.filter((d) => d.paid).length;
  const visibleDeferred = showAll ? deferredItems : deferredItems.filter((d) => !d.paid);

  const totalPaidCount = paidItems.length + paidDeferredCount;
  const visibleItems = showAll ? items : unpaidItems;


  return (
    <div className="flex flex-col gap-2 w-full">
      <SectionBar
        label="Vaste uitgaves"
        amount={amount}
        showPaid={totalPaidCount > 0 ? showAll : undefined}
        onFilterToggle={totalPaidCount > 0 ? () => setShowPaid((v) => !v) : undefined}
        onAdd={onOpenSidepanel}
        addAriaLabel="Vaste uitgave toevoegen"
      />

      <div className="flex flex-col gap-1 w-full">
        {items.length === 0 && deferredItems.length === 0 && (
          <p className="pl-2 text-sm text-[var(--umanexNeutral500)] italic">Geen vaste uitgaven</p>
        )}
        {visibleItems.map((item, index) => (
          <DraggableRecurringItem
            key={item.id}
            item={item}
            index={index}
            monthKey={monthKey}
            settlement={settlements.find((s) => s.recurringId === item.id)}
            onSettle={onSettle}
          />
        ))}

        {visibleDeferred.map((d, index) => (
          <DeferredRecurringItem
            key={d.deferId}
            item={d}
            index={visibleItems.length + index}
            onFinalize={onFinalizeDefer}
            onUnsettle={onUnsettleDefer}
            onRemoveDefer={onRemoveDefer}
          />
        ))}
      </div>
    </div>
  );
}
