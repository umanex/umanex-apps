'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { IncomeItem, MonthKey } from '../../lib/cashflow/types';
import { formatCurrency, generateId } from '../../lib/cashflow/recurring';

interface IncomeSectionProps {
  monthKey: MonthKey;
  items: IncomeItem[];
  startBalance: number;
  isFirstMonth?: boolean;
  onAdd: (item: IncomeItem) => void;
  onUpdate: (id: string, patch: Partial<IncomeItem>) => void;
  onToggleReceived: (id: string, received: boolean) => void;
  onRemove: (id: string) => void;
}

function DraggableIncomeItem({
  item,
  onToggleReceived,
  onRemove,
  onUpdate,
}: {
  item: IncomeItem;
  onToggleReceived: (id: string, received: boolean) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<IncomeItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [amount, setAmount] = useState(String(item.amount));

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `income-${item.id}`,
    data: {
      type: 'income',
      id: item.id,
      sourceMonth: item.monthKey,
      label: item.label,
      amount: item.amount,
    },
  });

  function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!label.trim() || isNaN(parsed)) return;
    onUpdate(item.id, { label: label.trim(), amount: parsed });
    setEditing(false);
  }

  function handleCancel() {
    setLabel(item.label);
    setAmount(String(item.amount));
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-0.5" onKeyDown={handleKeyDown}>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Omschrijving"
          className="flex-1 h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="€"
          className="w-20 h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring text-right"
        />
        <button onClick={handleSave} className="text-xs text-primary hover:text-primary/80 font-medium">
          OK
        </button>
        <button onClick={handleCancel} className="text-xs text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>
    );
  }

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
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={item.received}
        onChange={(e) => onToggleReceived(item.id, e.target.checked)}
        className="h-3.5 w-3.5 rounded border-input accent-primary"
        title="Ontvangen"
      />
      <span
        className={`flex-1 text-sm truncate cursor-pointer ${item.received ? 'line-through text-muted-foreground' : ''}`}
        onClick={() => { setLabel(item.label); setAmount(String(item.amount)); setEditing(true); }}
      >
        {item.label}
      </span>
      <span
        className={`text-sm font-medium tabular-nums cursor-pointer ${item.amount >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
        onClick={() => { setLabel(item.label); setAmount(String(item.amount)); setEditing(true); }}
      >
        {formatCurrency(item.amount)}
      </span>
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

export function IncomeSection({
  monthKey,
  items,
  startBalance,
  isFirstMonth,
  onAdd,
  onUpdate,
  onToggleReceived,
  onRemove,
}: IncomeSectionProps) {
  const [adding, setAdding] = useState(false);
  const [showReceived, setShowReceived] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const unreceived = items.filter((i) => !i.received);
  const received = items.filter((i) => i.received);
  const subtotaal = unreceived.reduce((s, i) => s + i.amount, 0);
  const visibleItems = showReceived ? items : unreceived;

  function handleAdd() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!label.trim() || isNaN(parsed)) return;
    onAdd({
      id: generateId(),
      monthKey,
      label: label.trim(),
      amount: parsed,
      received: false,
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
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-2 py-1.5 -mx-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-shrink-0">
          Inkomsten
        </span>
        <div className="flex items-center gap-2">
          {subtotaal !== 0 && (
            <span className={`text-xs font-medium tabular-nums ${subtotaal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatCurrency(subtotaal)}
            </span>
          )}
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            aria-label="Inkomst toevoegen"
          >
            + Toevoegen
          </button>
          {received.length > 0 && (
            <button
              onClick={() => setShowReceived((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {showReceived ? `Verberg ontvangen (${received.length})` : `Toon ontvangen (${received.length})`}
            </button>
          )}
        </div>
      </div>

      {!isFirstMonth && (
        <div className="flex items-center gap-2 py-0.5">
          <span className="w-[18px] flex-shrink-0" />
          <span className="w-3.5 flex-shrink-0" />
          <span className="flex-1 text-sm truncate text-muted-foreground italic">Vorig saldo</span>
          <span className={`text-sm font-medium tabular-nums ${startBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(startBalance)}
          </span>
          <span className="w-3 flex-shrink-0" />
        </div>
      )}

      {visibleItems.map((item) => (
        <DraggableIncomeItem
          key={item.id}
          item={item}
          onToggleReceived={onToggleReceived}
          onRemove={onRemove}
          onUpdate={onUpdate}
        />
      ))}

      {adding && (
        <div className="flex items-center gap-2 pt-1" onKeyDown={handleKeyDown}>
          <input
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Omschrijving"
            className="flex-1 h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="€"
            className="w-20 h-7 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring text-right"
          />
          <button
            onClick={handleAdd}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
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

      {unreceived.length === 0 && !adding && !showReceived && (
        <p className="text-xs text-muted-foreground italic py-0.5">Geen inkomsten deze maand</p>
      )}
    </div>
  );
}
