'use client';

import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { RecurringItem, RecurringSettlement, MonthKey } from '../../lib/cashflow/types';
import { formatCurrency, getMonthLabel } from '../../lib/cashflow/recurring';

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
  deferredItems: DeferredDisplayItem[];
  settlements: RecurringSettlement[];
  onRemoveDefer: (deferId: string) => void;
  onSettle: (recurringId: string, paid: boolean, actualAmount: number) => void;
  onFinalizeDefer: (deferId: string, amount: number) => void;
  onUnsettleDefer: (deferId: string) => void;
  onOpenSidepanel: () => void;
}

function DraggableRecurringItem({
  item,
  monthKey,
  settlement,
  onSettle,
}: {
  item: RecurringItem;
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

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 py-0.5 ${isDragging ? 'opacity-30' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing text-base leading-none select-none"
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

      <span className="flex-1 text-sm truncate">
        {item.label}
      </span>

      {item.frequency === 'yearly' && (
        <span className="text-xs text-muted-foreground">(jaarlijks)</span>
      )}

      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={localAmount}
          onChange={(e) => setLocalAmount(e.target.value)}
          onBlur={handleAmountBlur}
          className={`w-20 h-7 px-2 text-sm text-right tabular-nums rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring ${isPaid ? 'text-emerald-600' : ''}`}
          aria-label="Werkelijk bedrag"
        />
        {hasDeviation && (
          <span className="text-xs text-amber-500 tabular-nums" title={`Begroot: ${formatCurrency(budgeted)}`}>
            ({formatCurrency(budgeted)})
          </span>
        )}
      </div>
    </div>
  );
}

function DeferredRecurringItem({
  item,
  onFinalize,
  onUnsettle,
  onRemoveDefer,
}: {
  item: DeferredDisplayItem;
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

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-[18px] flex-shrink-0" />
      <input
        type="checkbox"
        checked={localChecked || item.paid}
        disabled={item.paid}
        onChange={(e) => handleCheck(e.target.checked)}
        className={`h-3.5 w-3.5 rounded border-input flex-shrink-0 ${item.paid ? 'accent-emerald-600' : 'accent-primary'}`}
        aria-label={`${item.label} betaald`}
      />
      <span className={`flex-1 text-sm truncate ${item.paid ? 'opacity-60' : ''}`}>
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
            className="w-20 h-7 px-2 text-sm text-right tabular-nums rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Werkelijk bedrag"
          />
          <button
            onClick={handleFinalize}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            Finaliseer →
          </button>
        </>
      ) : (
        <>
          <span className={`text-sm tabular-nums ${item.paid ? 'text-muted-foreground' : 'font-medium text-destructive'}`}>
            {formatCurrency(item.paid ? item.paidAmount : item.amount)}
          </span>
          {hasDeviation && (
            <span className="text-xs text-muted-foreground tabular-nums" title={`Begroot: ${formatCurrency(item.amount)}`}>
              ({formatCurrency(item.amount)})
            </span>
          )}
        </>
      )}
      {item.paid ? (
        <button
          onClick={() => onUnsettle(item.deferId)}
          className="text-muted-foreground hover:text-amber-600 transition-colors text-sm leading-none"
          aria-label="Betaling ongedaan"
          title="Betaling ongedaan"
        >
          ↩
        </button>
      ) : (
        !localChecked && (
          <button
            onClick={() => onRemoveDefer(item.deferId)}
            className="text-amber-500 hover:text-amber-700 transition-colors text-sm leading-none"
            aria-label="Uitstelling ongedaan maken"
            title="Ongedaan maken"
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
  deferredItems,
  settlements,
  onRemoveDefer,
  onSettle,
  onFinalizeDefer,
  onUnsettleDefer,
  onOpenSidepanel,
}: RecurringSectionProps) {
  const [showPaid, setShowPaid] = useState(false);

  const unpaidItems = items.filter(
    (item) => !settlements.find((s) => s.recurringId === item.id && s.paid),
  );
  const paidItems = items.filter(
    (item) => !!settlements.find((s) => s.recurringId === item.id && s.paid),
  );
  const paidDeferredCount = deferredItems.filter((d) => d.paid).length;
  const visibleDeferred = showPaid ? deferredItems : deferredItems.filter((d) => !d.paid);

  const totalPaidCount = paidItems.length + paidDeferredCount;
  const hasAnyPaid = totalPaidCount > 0;
  const visibleItems = showPaid ? items : unpaidItems;

  const subtotaal =
    unpaidItems.reduce((s, item) => {
      const budgeted = item.frequency === 'yearly' ? item.amount / 12 : item.amount;
      return s + budgeted;
    }, 0) +
    deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);

  if (items.length === 0 && deferredItems.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-2 py-1.5 -mx-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex-shrink-0">
          Vaste uitgaven
        </span>
        <div className="flex items-center gap-2">
          {subtotaal > 0 && (
            <span className="text-xs font-medium tabular-nums text-destructive">
              {formatCurrency(subtotaal)}
            </span>
          )}
          <button
            onClick={onOpenSidepanel}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            + Toevoegen
          </button>
          {hasAnyPaid && (
            <button
              onClick={() => setShowPaid((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {showPaid ? `Verberg betaald (${totalPaidCount})` : `Toon betaald (${totalPaidCount})`}
            </button>
          )}
        </div>
      </div>

      {visibleItems.map((item) => (
        <DraggableRecurringItem
          key={item.id}
          item={item}
          monthKey={monthKey}
          settlement={settlements.find((s) => s.recurringId === item.id)}
          onSettle={onSettle}
        />
      ))}

      {visibleDeferred.map((d) => (
        <DeferredRecurringItem
          key={d.deferId}
          item={d}
          onFinalize={onFinalizeDefer}
          onUnsettle={onUnsettleDefer}
          onRemoveDefer={onRemoveDefer}
        />
      ))}
    </div>
  );
}
