'use client';

import { formatCurrency } from '../../lib/cashflow/recurring';
import { TREND_THRESHOLD, type RunwayResult } from '../../lib/cashflow/analysis';

type RunwayCardProps = {
  runway: RunwayResult;
};

/** Bovengrens van de balk. Verder dan een jaar vooruit zegt het getal weinig meer. */
const BAR_MAX_MONTHS = 12;

/**
 * Runway als getal met een lineaire balk. Bewust geen cirkelvormige gauge — die kost veel
 * ruimte om weinig te zeggen en faalt bij vergelijken (Few); beide adviesrapporten raden
 * hem expliciet af.
 */
export function RunwayCard({ runway }: RunwayCardProps) {
  const { months, buffer, netBurn, closedMonths, hasEnoughData } = runway;

  if (!hasEnoughData) {
    const nog = TREND_THRESHOLD - closedMonths;
    return (
      <div className="rounded-xl border border-[var(--umanexPrimary50)] bg-card p-5">
        <h2 className="text-base font-semibold text-[var(--umanexNeutral800)]">Runway</h2>
        <p className="mt-2 text-sm text-[var(--umanexNeutral500)]">
          Nog {nog} {nog === 1 ? 'afgesloten maand' : 'afgesloten maanden'} nodig voor dit
          iets zegt. Een gemiddelde over minder maanden zwabbert te hard bij wisselende
          facturen.
        </p>
      </div>
    );
  }

  // Een negatieve bufferstand is geen korte runway maar een pot die al leeg is. Zonder
  // ondergrens leverde dat bovendien een negatieve CSS-breedte op: de browser verwerpt
  // die, de balk valt terug op auto en vult het hele spoor — maximale runway tonen bij
  // een pot in het rood.
  const leeg = buffer < 0;
  const filled = months === null ? 1 : Math.min(Math.max(months / BAR_MAX_MONTHS, 0), 1);

  return (
    <div className="rounded-xl border border-[var(--umanexPrimary50)] bg-card p-5">
      <h2 className="text-base font-semibold text-[var(--umanexNeutral800)]">Runway</h2>
      <p className="text-sm text-[var(--umanexNeutral500)]">
        Hoelang je bufferpot het gemiddelde maandtekort dekt
      </p>

      <p className="mt-3 text-3xl font-bold tabular-nums text-[var(--umanexNeutral800)]">
        {leeg ? (
          <span className="text-finance-negative">Buffer staat negatief</span>
        ) : months === null ? (
          <span className="text-finance-positive">Geen tekort</span>
        ) : (
          <>
            {months.toLocaleString('nl-BE', { maximumFractionDigits: 1 })}{' '}
            <span className="text-lg font-semibold text-[var(--umanexNeutral500)]">
              {months === 1 ? 'maand' : 'maanden'}
            </span>
          </>
        )}
      </p>

      <div
        className="mt-3 h-2 w-full rounded-full bg-[var(--umanexNeutral200)] overflow-hidden"
        role="img"
        aria-label={
          leeg
            ? 'Bufferpot staat negatief'
            : months === null
              ? 'Geen maandelijks tekort'
              : `Runway ${months.toFixed(1)} maanden van maximaal ${BAR_MAX_MONTHS}`
        }
      >
        <div
          className={`h-full rounded-full ${
            leeg
              ? 'bg-finance-negative-surface'
              : months === null
                ? 'bg-finance-positive'
                : 'bg-[var(--umanexNeutral800)]'
          }`}
          style={{ width: `${(leeg ? 1 : filled) * 100}%` }}
        />
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-[var(--umanexNeutral500)]">Bufferpot</dt>
          <dd className="tabular-nums text-[var(--umanexNeutral800)]">{formatCurrency(buffer)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--umanexNeutral500)]">
            {netBurn > 0 ? 'Tekort per maand' : 'Overschot per maand'}
          </dt>
          <dd className="tabular-nums text-[var(--umanexNeutral800)]">
            {formatCurrency(Math.abs(netBurn))}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--umanexNeutral500)]">Gemiddeld over</dt>
          <dd className="tabular-nums text-[var(--umanexNeutral800)]">
            {Math.min(closedMonths, 6)} {closedMonths === 1 ? 'maand' : 'maanden'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
