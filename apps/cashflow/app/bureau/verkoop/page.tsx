'use client';

import { useRef, useState } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { useBureau, useBureauYear, useToday } from '../../../hooks/useBureau';
import { goalsFor } from '../../../lib/bureau/goals';
import { periodOf } from '../../../lib/bureau/pipeline';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { OpportunitySheet } from '../../../components/bureau/OpportunitySheet';
import { PipelineLine } from '../../../components/bureau/PipelineLine';
import { FollowUpList } from '../../../components/bureau/FollowUpList';
import { SalesFunnel } from '../../../components/bureau/SalesFunnel';
import { OpportunityList } from '../../../components/bureau/OpportunityList';
import { SelectField } from '../../../components/bureau/fields/SelectField';

type Kwartaal = 'jaar' | '1' | '2' | '3' | '4';

export default function VerkoopPage() {
  const bureau = useBureau();
  const [year] = useBureauYear();
  const today = useToday();
  const [kwartaal, setKwartaal] = useState<Kwartaal>('jaar');
  const periode = periodOf(year, kwartaal === 'jaar' ? null : (Number(kwartaal) as 1 | 2 | 3 | 4));
  const periodeLabel = kwartaal === 'jaar' ? `Heel ${year}` : `Q${kwartaal} ${year}`;
  const marge = goalsFor(bureau, Number(today.slice(0, 4)))?.signals.overdueSalesAction.graceDays ?? 0;
  const geenKansen = bureau.opportunities.length === 0;

  const [sheet, setSheet] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const bron = useRef<HTMLElement | null>(null);
  const openen = (id: string | null) => {
    bron.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSheet({ open: true, id });
  };
  // Terug naar de knop die opende. Is die weg — de rij verhuisde na een stadiumwissel, of de kans
  // is verwijderd — dan naar de Openen-knop van dezelfde kans, en anders naar "Nieuwe kans".
  const focusTerug = (e: Event) => {
    e.preventDefault();
    const doel =
      (bron.current?.isConnected ? bron.current : null) ??
      (sheet.id ? document.querySelector<HTMLElement>(`[data-open-kans="${sheet.id}"]`) : null) ??
      document.getElementById('kans-nieuw');
    doel?.focus();
  };

  return (
    <section aria-labelledby="verkoop-titel" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="verkoop-titel" className="text-xl font-semibold">
            Verkoop
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Kansen tot ze getekend zijn. Een voorstel is geen getekend werk; pas als project telt het mee in omzet en capaciteit.
          </p>
        </div>
        <Button id="kans-nieuw" aria-haspopup="dialog" onClick={() => openen(null)}>
          Nieuwe kans
        </Button>
      </div>

      {geenKansen ? (
        <EmptyState title="Nog geen kansen">
          Een kans is een bedrijf met een concrete aanleiding. Noteer de behoefte, het budget, wie beslist en de volgende actie — dan zie je hier wat opvolging vraagt, wat gekwalificeerd is en hoeveel gesprekken een voorstel worden.
        </EmptyState>
      ) : (
        <>
          <PipelineLine opportunities={bureau.opportunities} />
          <FollowUpList opportunities={bureau.opportunities} today={today} graceDays={marge} onOpen={openen} />
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              id="verkoop-periode"
              label="Periode voor aantallen"
              value={kwartaal}
              onChange={(v) => setKwartaal(v as Kwartaal)}
              options={[
                { value: 'jaar', label: `Heel ${year}` },
                { value: '1', label: `Q1 ${year}` },
                { value: '2', label: `Q2 ${year}` },
                { value: '3', label: `Q3 ${year}` },
                { value: '4', label: `Q4 ${year}` },
              ]}
              className="w-56"
            />
          </div>
          <SalesFunnel opportunities={bureau.opportunities} period={periode} periodLabel={periodeLabel} />
          <OpportunityList bureau={bureau} today={today} onOpen={openen} />
        </>
      )}
      <OpportunitySheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} opportunityId={sheet.id} onCloseAutoFocus={focusTerug} />
    </section>
  );
}
