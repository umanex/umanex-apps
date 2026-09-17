'use client';

import { formatAmount, getMonthLabel } from '../../lib/cashflow/recurring';
import type { CashOutlook, OutlookKop, OutlookOorzaak } from '../../lib/cashflow/outlook';

/**
 * Het antwoord op "kom ik rond?", bovenaan de prognose. Drie regels: het laagste punt in 13 weken
 * met zijn maand en het woord gedekt of tekort, de opbouw van dat getal, en waar het vandaan komt.
 *
 * Presentationeel: alle afleiding staat in `lib/cashflow/outlook.ts`, zodat dezelfde uitkomst
 * getest kan worden zonder de kaart te renderen.
 */

const KOP_LABEL: Record<OutlookKop, string> = {
  inkomsten: 'saldo + inkomsten',
  vast: 'vaste uitgaven',
  eenmalig: 'eenmalige uitgaven',
  budgetten: 'budgetten',
  provisies: 'provisies',
  bufferpot: 'bufferpot',
};

function oorzaakTekst(oorzaak: NonNullable<OutlookOorzaak>): string {
  if (oorzaak.soort === 'grootste-kost') {
    return `grootste post die maand: ${KOP_LABEL[oorzaak.kop]} ${formatAmount(oorzaak.bedrag)}`;
  }
  const richting = oorzaak.delta > 0 ? 'hoger' : 'lager';
  return `grootste verschil met ${getMonthLabel(oorzaak.vorigeMaand).toLowerCase()}: ${KOP_LABEL[oorzaak.kop]} ${formatAmount(Math.abs(oorzaak.delta))} ${richting}`;
}

export function CashAnswer({ outlook }: { outlook: CashOutlook }) {
  return (
    <section
      aria-labelledby="antwoord-titel"
      data-cash-answer={outlook.kind}
      className="rounded-xl border border-border bg-card px-5 py-4"
    >
      <h2 id="antwoord-titel" className="text-sm text-muted-foreground">
        Kom ik rond?
      </h2>

      {outlook.kind === 'leeg' && (
        <p className="mt-1 text-sm text-muted-foreground">
          Nog geen banksaldo of posten in de prognose. Zolang die er niet zijn, is er geen stand — en een rij nullen zou er wel een suggereren.
        </p>
      )}

      {outlook.kind === 'geen-maand' && (
        <p className="mt-1 text-sm text-muted-foreground">
          Geen maand die binnen dertien weken eindigt, dus geen maandeinde om tegen te meten.
        </p>
      )}

      {outlook.kind === 'ok' && (
        <>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={`text-2xl font-bold tabular-nums ${outlook.gedekt ? 'text-finance-positive' : 'text-finance-negative'}`}
              data-answer-value={outlook.buffer}
            >
              {formatAmount(outlook.buffer)}
            </span>
            <span className="text-sm text-foreground">
              laagste punt, eind {getMonthLabel(outlook.maandKey).toLowerCase()}
            </span>
            {/* Het woord, niet alleen de kleur: PRODUCT.md sluit betekenis die enkel via kleur bestaat uit. */}
            <span className="text-sm font-medium text-foreground" data-answer-stand>
              {outlook.gedekt ? 'gedekt' : 'tekort'}
            </span>
          </p>

          {outlook.heeftBufferpot && (
            <p
              className="text-2xs leading-tight tabular-nums text-muted-foreground"
              data-answer-bridge
              data-free={outlook.vrij}
              data-pot={outlook.bufferPot}
            >
              vrij {formatAmount(outlook.vrij)} + bufferpot {formatAmount(outlook.bufferPot)}
            </p>
          )}

          {outlook.oorzaak && (
            <p className="mt-1 text-xs text-muted-foreground" data-answer-cause>
              {oorzaakTekst(outlook.oorzaak)}
            </p>
          )}
        </>
      )}
    </section>
  );
}
