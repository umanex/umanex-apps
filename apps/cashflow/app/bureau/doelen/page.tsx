'use client';

import { useState } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { useMonths } from '../../../hooks/useCashflow';
import { useAnnounce, useBureau, useBureauYear, useMutateBureau } from '../../../hooks/useBureau';
import { getCurrentMonthKey } from '../../../lib/cashflow/recurring';
import { defaultGoals, goalsFor, registeredOutflow } from '../../../lib/bureau/goals';
import { setGoals } from '../../../lib/bureau/mutations';
import type { BusinessGoals } from '../../../lib/bureau/types';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { GoalsForm } from '../../../components/bureau/GoalsForm';

export default function DoelenPage() {
  const bureau = useBureau();
  const [year] = useBureauYear();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  // Vier maanden vanaf nu: de drie ná deze zijn stroommaanden, de eerste is een positie.
  const registered = registeredOutflow(useMonths(4, getCurrentMonthKey()));
  const stored = goalsFor(bureau, year);
  const vorig = goalsFor(bureau, year - 1);
  const [concept, setConcept] = useState<{ year: number; goals: BusinessGoals } | null>(null);
  const draftVoorDitJaar = concept?.year === year ? concept.goals : null;

  const opslaan = (goals: BusinessGoals) => {
    mutate((d) => setGoals(d, goals));
    setConcept(null);
    announce(`Doelen ${goals.year} opgeslagen.`);
  };

  return (
    <section aria-labelledby="doelen-titel" className="space-y-5">
      <div>
        <h2 id="doelen-titel" className="text-xl font-semibold">
          Doelen {year}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          De noemers van het overzicht: omzetdoel, dagbudgetten, maximaal klantaandeel en de drempels van de signalen. Somregels tonen waar iets niet sluit; niets wordt bijgesteld zonder dat jij opslaat.
        </p>
      </div>

      {stored ? (
        <GoalsForm key={`${year}-opgeslagen`} year={year} initial={stored} isNew={false} registered={registered} onSave={opslaan} />
      ) : draftVoorDitJaar ? (
        <GoalsForm key={`${year}-concept`} year={year} initial={draftVoorDitJaar} isNew registered={registered} onSave={opslaan} onDiscard={() => setConcept(null)} />
      ) : (
        <EmptyState
          title={`Nog geen doelen voor ${year}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setConcept({ year, goals: defaultGoals(year) })}>Startwaarden invullen</Button>
              {vorig && (
                <Button variant="outline" onClick={() => setConcept({ year, goals: { ...vorig, year } })}>
                  Doelen van {year - 1} overnemen
                </Button>
              )}
            </div>
          }
        >
          Zonder doelen kan het overzicht niets afzetten tegen een noemer: geen omzetgat, geen capaciteit, geen klantgrens. Startwaarden vullen alleen het formulier — er wordt niets bewaard tot je opslaat.
        </EmptyState>
      )}
    </section>
  );
}
