'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { IncomeItem, MonthKey } from '../../lib/cashflow/types';
import { formatSigned, generateId, limitDecimals, roundTo2 } from '../../lib/cashflow/recurring';
import { SectionBar } from './SectionBar';
import { StartBalanceRow } from './StartBalanceRow';

interface IncomeSectionProps {
  monthKey: MonthKey;
  items: IncomeItem[];
  /**
   * Stapbedrag van deze ledger-regel, uit de calculator: `subtotals.incoming`, dus
   * beginsaldo plus inkomsten. Niet `totalIncome` — het beginsaldo staat als eerste
   * regel ín deze sectie en moet dus in de kop meetellen.
   */
  amount: number;
  /** Saldo waarmee deze maand opent. */
  startBalance: number;
  /**
   * Alleen de ankerkolom mag het beginsaldo corrigeren — daar is het je échte banksaldo,
   * en alleen daar grijpt een `balanceOverride` aan. Laat weg voor de andere maanden.
   */
  onStartBalanceChange?: (balance: number) => void;
  onAdd: (item: IncomeItem) => void;
  onUpdate: (id: string, patch: Partial<IncomeItem>) => void;
  onToggleReceived: (id: string, received: boolean) => void;
  onRemove: (id: string) => void;
}

function DraggableIncomeItem({
  item,
  index,
  onRemove,
  onUpdate,
}: {
  item: IncomeItem;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<IncomeItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [amount, setAmount] = useState(String(roundTo2(item.amount)));

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

  const zebra = index % 2 !== 0;

  if (editing) {
    return (
      <div className="flex gap-2 items-start w-full" onKeyDown={handleKeyDown}>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Omschrijving"
          className="flex-1 h-7 px-2 text-dense rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex flex-col gap-2 items-end shrink-0">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(limitDecimals(e.target.value))}
            placeholder="€"
            className="w-[92px] h-7 px-2 text-dense text-right tabular-nums rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2 items-center">
            <button onClick={handleSave} className="text-xs font-semibold text-foreground">OK</button>
            <button onClick={handleCancel} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 h-7 px-2 rounded-sm w-full ${
        isDragging ? 'opacity-30' : zebra ? 'bg-muted' : ''
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing text-sm leading-none select-none shrink-0"
        aria-label="Versleep"
      >
        ⠿
      </button>
      <span
        className="flex-1 text-sm truncate cursor-pointer min-w-0"
        onClick={() => { setLabel(item.label); setAmount(String(item.amount)); setEditing(true); }}
      >
        {item.label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums whitespace-nowrap cursor-pointer shrink-0 ${
          item.amount >= 0 ? 'text-finance-positive' : 'text-finance-negative'
        }`}
        onClick={() => { setLabel(item.label); setAmount(String(item.amount)); setEditing(true); }}
      >
        {formatSigned(item.amount, 'in')}
      </span>
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

export function IncomeSection({
  monthKey,
  items,
  amount,
  startBalance,
  onStartBalanceChange,
  onAdd,
  onUpdate,
  onToggleReceived: _onToggleReceived,
  onRemove,
}: IncomeSectionProps) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // De ankerkolom toont het beginsaldo altijd: daar corrigeer je je echte banksaldo, ook
  // als het toevallig op nul staat. Een latere maand opent op het eindsaldo van de maand
  // ervoor, en dat legt een actieve bufferpot per constructie op €0 — die regel zou daar
  // alleen "€ 0,00" herhalen. Zodra de buffer een tekort níét meer draagt (calculator.ts
  // begrenst de opname tot wat er in de pot zit) of er helemaal geen bufferpot is, rolt
  // er wél een bedrag door. Dan moet het in beeld: anders verdwijnt geld uit de kolom en
  // telt ze niet meer op tot haar eigen kop.
  const showStartBalance = onStartBalanceChange !== undefined || Math.abs(startBalance) >= 0.005;

  function handleAdd() {
    const parsed = parseFloat(newAmount.replace(',', '.'));
    if (!label.trim() || isNaN(parsed)) return;
    onAdd({
      id: generateId(),
      monthKey,
      label: label.trim(),
      amount: parsed,
      received: false,
    });
    setLabel('');
    setNewAmount('');
    setAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setAdding(false);
      setLabel('');
      setNewAmount('');
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <SectionBar
        label="Inkomsten"
        amount={amount}
        direction="in"
        onAdd={() => setAdding(true)}
        addAriaLabel="Inkomst toevoegen"
      />

      <div className="flex flex-col gap-1 w-full">
        {/* Het beginsaldo is de eerste regel van deze sectie: de kop telt hem mee, dus
            hoort hij eronder te staan. Hij is geen post — niet versleepbaar, niet te
            verwijderen — en schuift daarom ook de zebra van de posten één op, zodat het
            streepjespatroon over de hele lijst doorloopt. */}
        {showStartBalance && (
          <StartBalanceRow balance={startBalance} onChange={onStartBalanceChange} />
        )}

        {items.map((item, index) => (
          <DraggableIncomeItem
            key={item.id}
            item={item}
            index={showStartBalance ? index + 1 : index}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}

        {adding && (
          <div className="flex gap-2 items-start w-full" onKeyDown={handleKeyDown}>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Omschrijving"
              className="flex-1 h-7 px-2 text-dense rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex flex-col gap-2 items-end shrink-0">
              <input
                type="text"
                inputMode="decimal"
                value={newAmount}
                onChange={(e) => setNewAmount(limitDecimals(e.target.value))}
                placeholder="€"
                className="w-[92px] h-7 px-2 text-dense text-right tabular-nums rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2 items-center">
                <button onClick={handleAdd} className="text-xs font-semibold text-foreground">OK</button>
                <button
                  onClick={() => { setAdding(false); setLabel(''); setNewAmount(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 && !adding && (
          <p className="pl-2 text-sm text-muted-foreground italic">Geen inkomsten</p>
        )}
      </div>
    </div>
  );
}
