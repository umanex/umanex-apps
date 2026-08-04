'use client';

import { formatAmount, formatSigned } from '../../lib/cashflow/recurring';

type BalanceFooterProps = {
  /** Vrij besteedbaar eindsaldo van deze maand. */
  available: number;
  /** Provisies: staat op de rekening maar moet nog weg (btw, verzekering, ...). */
  reserved: number;
  /** Bufferpot: eigen geld dat achter de hand blijft en een tekort opvangt. */
  buffer: number;
  /**
   * Tonen de gereserveerd- en bufferregel. Staan uit zolang er in het hele venster geen
   * provisie of buffer is — maar altijd gelijk voor alle drie de maanden, anders staan de
   * footers niet meer op één lijn.
   */
  showReserved: boolean;
  showBuffer: boolean;
};

export function BalanceFooter({
  available,
  reserved,
  buffer,
  showReserved,
  showBuffer,
}: BalanceFooterProps) {
  const bank = available + reserved + buffer;
  const hasBreakdown = showReserved || showBuffer;

  return (
    <div className="shrink-0 border-t border-[var(--umanexPrimary50)] px-4 py-3 flex flex-col gap-1">
      {hasBreakdown && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--umanexNeutral500)]">Bankstand</span>
            <span className="text-sm tabular-nums text-[var(--umanexNeutral800)]">
              {formatAmount(bank)}
            </span>
          </div>

          {showReserved && (
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
          )}

          {showBuffer && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-[var(--umanexNeutral500)]">
                {/* Vlak vlak i.p.v. arcering: de buffer is eigen geld, geen schuld.
                    TODO: vervangen door een finance-token zodra die er zijn. */}
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-[2px] border border-[var(--umanexNeutral400)] bg-[var(--umanexNeutral400)]"
                />
                Buffer
              </span>
              <span className="text-sm tabular-nums text-[var(--umanexNeutral500)]">
                {formatSigned(buffer, 'out')}
              </span>
            </div>
          )}

          <div className="border-t border-[var(--umanexNeutral200)] mt-1 pt-2" />
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--umanexNeutral800)]">
          {hasBreakdown ? 'Beschikbaar' : 'Eindsaldo'}
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
