'use client';

import { useState } from 'react';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Label } from '@umanex/ui/components/ui/label';
import { useBureau, useBureauYear } from '../../../hooks/useBureau';
import { goalsFor } from '../../../lib/bureau/goals';
import { clientConcentration } from '../../../lib/bureau/concentration';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ConcentrationTable } from '../../../components/bureau/ConcentrationTable';
import { ClientGroupsPanel } from '../../../components/bureau/ClientGroupsPanel';

export default function KlantenPage() {
  const bureau = useBureau();
  const [year] = useBureauYear();
  const [perGroep, setPerGroep] = useState(false);
  const limiet = goalsFor(bureau, year)?.maxClientShare ?? null;
  const groepering = perGroep ? 'groep' : 'klant';
  const gerealiseerd = clientConcentration(bureau, year, 'gerealiseerd', groepering, limiet);
  const prognose = clientConcentration(bureau, year, 'prognose', groepering, limiet);

  return (
    <section aria-labelledby="klanten-titel" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="klanten-titel" className="text-xl font-semibold">
            Klanten
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Hoe afhankelijk ben je van één klant? Twee bases, apart: wat al gerealiseerd is, en wat het jaar wordt met het getekende werk erbij. Voorstellen tellen in geen van beide.
          </p>
        </div>
        {bureau.clients.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox id="klanten-per-groep" checked={perGroep} onCheckedChange={(v) => setPerGroep(v === true)} disabled={bureau.clientGroups.length === 0} aria-describedby="klanten-per-groep-hint" />
            <Label htmlFor="klanten-per-groep">Per klantgroep</Label>
            <span id="klanten-per-groep-hint" className="text-xs text-muted-foreground">
              {bureau.clientGroups.length === 0 ? 'nog geen groepen' : 'verbonden klanten als één'}
            </span>
          </div>
        )}
      </div>

      {bureau.clients.length === 0 ? (
        <EmptyState title="Nog geen klanten">
          Een klant ontstaat wanneer je een project aanmaakt of een gewonnen kans omzet. Daarna zie je hier welk deel van je jaaromzet van wie komt, tegenover de limiet uit je doelen.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <ConcentrationTable id="concentratie-gerealiseerd" data={gerealiseerd} title={`Gerealiseerd in ${year}`} description="Mijlpalen gerealiseerd in het jaar." />
            <ConcentrationTable id="concentratie-prognose" data={prognose} title={`Vooruitblik ${year}`} description="Gerealiseerd plus resterend getekend werk gepland in het jaar." />
          </div>
          <ClientGroupsPanel bureau={bureau} />
        </>
      )}
    </section>
  );
}
