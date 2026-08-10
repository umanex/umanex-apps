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

/**
 * De eerste regel van de inkomstensectie: waarmee de maand opent. Hij staat binnen die
 * sectie omdat de kop `subtotals.incoming` toont — beginsaldo plus inkomsten — en de
 * regels eronder dus tot die kop moeten optellen.
 *
 * Het bedrag gaat bewust door `formatAmount` en niet door `formatSigned`: die laatste
 * geeft bij `neutral` de absolute waarde terug, en dan zou een doorgerold tekort zijn
 * minteken verliezen. Dit is een stand, geen mutatie, dus er hoort ook geen `+` voor.
 */
export function StartBalanceRow({ balance, onChange }: StartBalanceRowProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const label = onChange ? 'Beginsaldo' : 'Vorig saldo';

  return (
    <div className="flex items-center gap-2 h-7 px-2 rounded-sm w-full">
      {/* Onzichtbare tegenhangers van de sleepgreep en de verwijderknop van een
          inkomstenpost, zodat label en bedrag in dezelfde kolommen uitlijnen. Ze zijn
          `invisible` en niet weg: alleen zo dragen ze exact dezelfde breedte. */}
      <span aria-hidden className="invisible text-sm leading-none select-none shrink-0">⠿</span>

      <span className="flex-1 text-sm font-medium text-foreground truncate min-w-0">{label}</span>

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
          className="w-[110px] h-6 px-2 text-dense text-right tabular-nums rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : onChange ? (
        <button
          onClick={() => { setInput(String(roundTo2(balance))); setEditing(true); }}
          title="Klik om aan te passen"
          className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground hover:underline shrink-0"
        >
          {formatAmount(balance)}
        </button>
      ) : (
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground shrink-0">
          {formatAmount(balance)}
        </span>
      )}

      <span aria-hidden className="invisible text-xs leading-none shrink-0">×</span>
    </div>
  );
}
