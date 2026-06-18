'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ExpenseItem, MonthKey } from '../../lib/cashflow/types';
import { formatCurrency, generateId, limitDecimals, roundTo2 } from '../../lib/cashflow/recurring';
import { SectionBar } from './SectionBar';

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
  index,
  onUpdate,
  onRemove,
}: {
  item: ExpenseItem;
  index: number;
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

  const zebra = index % 2 !== 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 h-7 pl-1 rounded-[4px] w-full ${
        isDragging ? 'opacity-30' : (item.paid ? 'opacity-70 ' : '') + (zebra ? 'bg-[var(--umanexNeutral50)]' : '')
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-[var(--umanexNeutral500)] hover:text-foreground cursor-grab active:cursor-grabbing text-sm leading-none select-none shrink-0"
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
      <span className={`flex-1 text-sm truncate min-w-0 ${item.paid ? 'text-muted-foreground' : ''}`}>
        {item.label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={localAmount}
        onChange={(e) => setLocalAmount(limitDecimals(e.target.value))}
        onBlur={handleAmountBlur}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-[92px] h-7 px-2 text-[13px] text-right tabular-nums rounded-[4px] border border-[var(--umanexNeutral300)] bg-white focus:outline-none focus:ring-1 focus:ring-ring shrink-0 ${
          item.paid ? 'text-emerald-600' : 'text-[var(--umanexPrimary500)]'
        }`}
        aria-label="Bedrag"
      />
      <button
        onClick={() => onRemove(item.id)}
        className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none shrink-0"
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
  const visibleItems = showPaid ? items : unpaidItems;

  const overflowSubtotaal = overflowItems.reduce((s, i) => s + i.amount, 0);
  const subtotaal =
    unpaidItems.reduce((s, i) => s + i.amount, 0) + overflowSubtotaal;

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
    <div className="flex flex-col gap-2 w-full">
      <SectionBar
        label="Niet recurrent"
        subtotaal={subtotaal > 0 ? formatCurrency(subtotaal) : undefined}
        showPaid={paidItems.length > 0 ? showPaid : undefined}
        onFilterToggle={paidItems.length > 0 ? () => setShowPaid((v) => !v) : undefined}
        onAdd={() => setAdding(true)}
        addAriaLabel="Kost toevoegen"
      />

      <div className="flex flex-col gap-1 w-full">
        {visibleItems.map((item, index) => (
          <DraggableExpenseItem
            key={item.id}
            item={item}
            index={index}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}

        {/* Afgeleide overflow items van spaardoel-betalingen */}
        {overflowItems.map((item, idx) => (
          <div key={`overflow-${idx}`} className={`flex items-center gap-2 h-7 pl-1 rounded-[4px] w-full opacity-70 ${
            (visibleItems.length + idx) % 2 !== 0 ? 'bg-[var(--umanexNeutral50)]' : ''
          }`}>
            <span className="w-[18px] shrink-0" />
            <span className="w-3.5 shrink-0" />
            <span className="flex-1 text-sm truncate text-muted-foreground min-w-0">
              {item.label}
              <span className="ml-1 text-[11px] text-muted-foreground/60">– resterend</span>
            </span>
            <span className="w-[92px] text-sm tabular-nums text-emerald-600 text-right shrink-0">
              {formatCurrency(item.amount)}
            </span>
            <span className="w-3 shrink-0" />
          </div>
        ))}

        {adding && (
          <div className="flex gap-2 items-start w-full" onKeyDown={handleKeyDown}>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Omschrijving"
              className="flex-1 h-7 px-2 text-[13px] rounded-[4px] border border-[var(--umanexNeutral300)] bg-white focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex flex-col gap-2 items-end shrink-0">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(limitDecimals(e.target.value))}
                placeholder="€"
                className="w-[92px] h-7 px-2 text-[13px] text-right tabular-nums rounded-[4px] border border-[var(--umanexNeutral300)] bg-white focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2 items-center">
                <button onClick={handleAdd} className="text-xs font-semibold text-[var(--umanexNeutral800)]">OK</button>
                <button
                  onClick={() => { setAdding(false); setLabel(''); setAmount(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
