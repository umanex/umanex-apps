'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ExpenseItem, MonthKey } from '../../lib/cashflow/types';
import { formatCurrency, generateId, limitDecimals, roundTo2 } from '../../lib/cashflow/recurring';

interface ExpenseSectionProps {
  monthKey: MonthKey;
  items: ExpenseItem[];
  overflowItems?: { label: string; amount: number }[];
  onAdd: (item: ExpenseItem) => void;
  onUpdate: (id: string, patch: Partial<ExpenseItem>) => void;
  onRemove: (id: string) => void;
}

function DraggableExpenseItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: ExpenseItem;
  onUpdate: (id: string, patch: Partial<ExpenseItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [localAmount, setLocalAmount] = useState(String(roundTo2(item.amount)));

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `expense-${item.id}`,
    data: {
      type: 'expense',
      id: item.id,
      sourceMonth: item.monthKey,
      label: item.label,
      amount: item.amount,
    },
  });

  function handleAmountBlur() {
    const parsed = parseFloat(localAmount.replace(',', '.'));
    const effective = isNaN(parsed) || parsed < 0 ? item.amount : parsed;
    setLocalAmount(String(effective));
    if (effective !== item.amount) onUpdate(item.id, { amount: effective });
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 py-0.5 ${isDragging ? 'opacity-30' : item.paid ? 'opacity-70' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing text-base leading-none select-none"
        aria-label="Versleep"
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={item.paid}
        onChange={(e) => onUpdate(item.id, { paid: e.target.checked })}
        className={`h-3.5 w-3.5 rounded border-input flex-shrink-0 ${item.paid ? 'accent-emerald-600' : 'accent-primary'}`}
        title="Betaald"
      />
      <span className={`flex-1 text-sm truncate ${item.paid ? 'text-muted-foreground' : ''}`}>
        {item.label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={localAmount}
        onChange={(e) => setLocalAmount(limitDecimals(e.target.value))}
        onBlur={handleAmountBlur}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-20 h-7 px-2 text-sm text-right tabular-nums rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring ${item.paid ? 'text-emerald-600' : 'text-destructive'}`}
        aria-label="Bedrag"
      />
      <button
        onClick={() => onRemove(item.id)}
        className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
        aria-label="Verwijder"
      >
        ×
      </button>
    </div>
  );
}

export function ExpenseSection({
  monthKey,
  items,
  overflowItems = [],
  onAdd,
  onUpdate,
  onRemove,
}: ExpenseSectionProps) {
  const [adding, setAdding] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const unpaidItems = items.filter((i) => !i.paid);
  const paidItems = items.filter((i) => i.paid);
  const hasAnyPaid = paidItems.length > 0;
  const visibleItems = showPaid ? items : unpaidItems;
  const subtotaal =
    unpaidItems.reduce((s, i) => s + i.amount, 0) +
    overflowItems.reduce((s, i) => s + i.amount, 0);

  function handleAdd() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!label.trim() || isNaN(parsed) || parsed <= 0) return;
    onAdd({
      id: generateId(),
      monthKey,
      label: label.trim(),
      amount: parsed,
      paid: false,
    });
    setLabel('');
    setAmount('');
    setAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setAdding(false);
      setLabel('');
      setAmount('');
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-2 py-1.5 -mx-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex-shrink-0">
          Niet recurrente kosten
        </span>
        <div className="flex items-center gap-2">
          {subtotaal > 0 && (
            <span className="text-xs font-medium tabular-nums text-destructive">
              {formatCurrency(subtotaal)}
            </span>
          )}
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            aria-label="Kost toevoegen"
          >
            + Toevoegen
          </button>
          {hasAnyPaid && (
            <button
              onClick={() => setShowPaid((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {showPaid ? `Verberg betaald (${paidItems.length})` : `Toon betaald (${paidItems.length})`}
            </button>
          )}
        </div>
      </div>

      {visibleItems.map((item) => (
        <DraggableExpenseItem
          key={item.id}
          item={item}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}

      {overflowItems.map((item, idx) => (
        <div key={`overflow-${idx}`} className="flex items-center gap-2 py-0.5 opacity-70">
          <span className="w-[18px] flex-shrink-0" />
          <span className="w-3.5 flex-shrink-0" />
          <span className="flex-1 text-sm truncate text-muted-foreground">
            {item.label}
            <span className="ml-1 text-[11px] text-muted-foreground/60">– resterend</span>
          </span>
          <span className="w-20 text-sm tabular-nums text-emerald-600 text-right flex-shrink-0">
            {formatCurrency(item.amount)}
          </span>
          <span className="w-3 flex-shrink-0" />
        </div>
      ))}

      {adding && (
        <div className="flex items-center gap-2 pt-1.5" onKeyDown={handleKeyDown}>
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Omschrijving"
            className="flex-1 h-7 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(limitDecimals(e.target.value))}
            placeholder="€"
            className="w-20 h-7 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
          />
          <button onClick={handleAdd} className="text-xs font-medium text-foreground hover:text-foreground/80">
            OK
          </button>
          <button
            onClick={() => { setAdding(false); setLabel(''); setAmount(''); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
