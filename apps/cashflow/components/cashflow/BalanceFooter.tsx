'use client';

import { formatAmount, formatSigned } from '../../lib/cashflow/recurring';

type BalanceFooterProps = {
  /** Beweging van de bufferpot deze maand: positief is opbouw, negatief een opname. */
  delta: number;
  /** Stand van de bufferpot aan het einde van deze maand. */
  total: number;
  /** Tekort dat de buffer deze maand niet kon dekken. Nul zolang de pot volstaat. */
  uncovered: number;
  /**
   * Is er een bufferpot ingesteld? Gelijk voor alle drie de maanden — de footers moeten
   * op één lijn blijven staan, dus mag deze staat niet per kolom verschillen.
   */
  hasBuffer: boolean;
  /** Toont ergens in het venster een niet-gedekt tekort. Zelfde reden: gelijke hoogte. */
  showUncovered: boolean;
};

export function BalanceFooter({
  delta,
  total,
  uncovered,
  hasBuffer,
  showUncovered,
}: BalanceFooterProps) {
  if (!hasBuffer) {
    return (
      <div className="shrink-0 border-t border-accent px-4 py-3 flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">Geen buffer</span>
        <span className="text-2xs leading-tight text-muted-foreground">
          Markeer een provisie als buffer om te zien wat je per maand opbouwt of verbruikt.
        </span>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-accent px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Deze maand</span>
        <span
          className={`text-sm tabular-nums ${
            // Zelfde drempel als `formatSigned`: onder een halve cent schrijft die al
            // "€ 0,00" zonder teken. Kleurden we dan nog op het wiskundige teken, dan
            // stond een maand die exact op nul uitkomt in het rood door afrondingsruis.
            delta > -0.005 ? 'text-finance-positive' : 'text-finance-negative'
          }`}
        >
          {formatSigned(delta, 'in')}
        </span>
      </div>

      {showUncovered && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Niet gedekt</span>
          <span
            className={`text-sm tabular-nums ${
              uncovered > 0
                ? 'text-finance-negative'
                : 'text-muted-foreground'
            }`}
          >
            {uncovered > 0 ? formatSigned(uncovered, 'out') : formatAmount(0)}
          </span>
        </div>
      )}

      <div className="border-t border-border mt-1 pt-2" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Buffer</span>
        <span
          className={`text-lg font-bold tabular-nums ${
            total > -0.005 ? 'text-finance-positive' : 'text-finance-negative'
          }`}
        >
          {formatAmount(total)}
        </span>
      </div>
    </div>
  );
}
