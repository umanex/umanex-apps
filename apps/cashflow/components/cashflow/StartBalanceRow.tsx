'use client';

import { useState } from 'react';
import { formatAmount, limitDecimals, roundTo2 } from '../../lib/cashflow/recurring';

type StartBalanceRowProps = {
  balance: number;
  /**
   * In de ankermaand is dit je échte banksaldo en dus aanpasbaar; latere maanden tonen
   * het doorgerolde saldo van de maand ervoor.
   */
  onChange?: (balance: number) => void;
};

export function StartBalanceRow({ balance, onChange }: StartBalanceRowProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const label = onChange ? 'Beginsaldo' : 'Vorig saldo';

  return (
    <div className="flex items-center justify-between gap-2 h-9 px-2 w-full">
      <span className="text-sm font-semibold text-foreground">{label}</span>

      {editing && onChange ? (
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          aria-label="Beginsaldo aanpassen"
          value={input}
          onChange={(e) => setInput(limitDecimals(e.target.value))}
          onBlur={() => {
            const parsed = parseFloat(input.replace(',', '.'));
            if (!isNaN(parsed)) onChange(parsed);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-[110px] h-7 px-2 text-dense text-right tabular-nums rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : onChange ? (
        <button
          onClick={() => { setInput(String(roundTo2(balance))); setEditing(true); }}
          title="Klik om aan te passen"
          className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground hover:underline"
        >
          {formatAmount(balance)}
        </button>
      ) : (
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
          {formatAmount(balance)}
        </span>
      )}
    </div>
  );
}
