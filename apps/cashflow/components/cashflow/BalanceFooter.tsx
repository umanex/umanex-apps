'use client';

import { formatAmount, formatSigned } from '../../lib/cashflow/recurring';

type BalanceFooterProps = {
  /** Vrij besteedbaar eindsaldo van deze maand. */
  available: number;
  /** Wat er op de rekening staat maar al aan een provisie toegewezen is. */
  reserved: number;
  /**
   * Toont de gereserveerd-regel. Staat uit zolang er in het hele venster geen provisie
   * is, zodat een lege opzet geen nulregel toont — maar altijd gelijk voor alle drie de
   * maanden, anders staan de footers niet meer op één lijn.
   */
  showReserved: boolean;
};

export function BalanceFooter({ available, reserved, showReserved }: BalanceFooterProps) {
  const bank = available + reserved;

  return (
    <div className="shrink-0 border-t border-[var(--umanexPrimary50)] px-4 py-3 flex flex-col gap-1">
      {showReserved && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--umanexNeutral500)]">Bankstand</span>
            <span className="text-sm tabular-nums text-[var(--umanexNeutral800)]">
              {formatAmount(bank)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-[var(--umanexNeutral500)]">
              {/* TODO: arcering vervangen door color.finance.reserved.graphic zodra de
                  finance-tokens in Tokens Studio staan. */}
              <span
                aria-hidden
                className="inline-block size-3 rounded-[2px] border border-[var(--umanexNeutral300)]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, var(--umanexNeutral400) 0 2px, transparent 2px 4px)',
                }}
              />
              Gereserveerd
            </span>
            <span className="text-sm tabular-nums text-[var(--umanexNeutral500)]">
              {formatSigned(reserved, 'out')}
            </span>
          </div>

          <div className="border-t border-[var(--umanexNeutral200)] mt-1 pt-2" />
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--umanexNeutral800)]">
          {showReserved ? 'Beschikbaar' : 'Eindsaldo'}
        </span>
        <span
          className={`text-lg font-bold tabular-nums ${
            available >= 0 ? 'text-emerald-700' : 'text-[var(--umanexPrimary700)]'
          }`}
        >
          {formatAmount(available)}
        </span>
      </div>
    </div>
  );
}
