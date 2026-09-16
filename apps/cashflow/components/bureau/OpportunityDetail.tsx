'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@umanex/ui/components/ui/button';
import { Separator } from '@umanex/ui/components/ui/separator';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { useAnnounce, useBureau, useMutateBureau } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { STAGE_LABEL } from '../../lib/bureau/labels';
import { removeOpportunity } from '../../lib/bureau/mutations';
import { dateLabel } from '../../lib/bureau/format';
import { QualificationChecklist } from './QualificationChecklist';
import { StageChangeForm } from './StageChangeForm';
import { ConversionPanel } from './ConversionPanel';
import { OpportunityForm } from './OpportunityForm';
import { StageHistory } from './StageHistory';

type OpportunityDetailProps = { opportunityId: string; onRemoved: () => void };

/**
 * Eén kans in de sheet: stadium en omzetting eerst — dat is waar een kans om draait — dan de
 * kwalificatie, de gegevens en de historie. Leest de kans live uit de store, zodat een
 * stadiumwissel meteen de omzetting laat verschijnen.
 */
export function OpportunityDetail({ opportunityId, onRemoved }: OpportunityDetailProps) {
  const bureau = useBureau();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [bevestig, setBevestig] = useState(false);
  const o = bureau.opportunities.find((x) => x.id === opportunityId);

  if (!o) return <p className="mt-6 text-sm text-muted-foreground">Deze kans bestaat niet meer.</p>;

  const project = o.projectId ? bureau.projects.find((p) => p.id === o.projectId) : undefined;
  const sinds = [...o.history].reverse().find((h) => h.stage === o.stage)?.on;

  return (
    <div className="mt-6 space-y-6">
      <section aria-labelledby="kans-stadium-titel" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="kans-stadium-titel" className="text-base font-semibold">
            Stadium
          </h3>
          <p className="text-sm text-muted-foreground" data-stage-now={o.stage}>
            Nu <span className="font-medium text-foreground">{STAGE_LABEL[o.stage]}</span>
            {sinds && <> sinds {dateLabel(sinds)}</>}
          </p>
        </div>
        {o.outcomeReason && (o.stage === 'verloren' || o.stage === 'geparkeerd') && <p className="text-sm">Reden: {o.outcomeReason}</p>}
        {project ? (
          <p className="text-sm" data-converted>
            Omgezet naar project{' '}
            <Link href={`/bureau/projecten/${project.id}`} className={cn('rounded-sm font-medium underline underline-offset-2', focusRing)}>
              {project.name}
            </Link>
            .
          </p>
        ) : o.projectId ? (
          <p className="text-sm text-muted-foreground" data-converted>
            Omgezet naar een project dat niet meer bestaat.
          </p>
        ) : (
          o.stage === 'gewonnen' && <ConversionPanel opportunity={o} />
        )}
        <StageChangeForm key={o.stage} opportunity={o} />
      </section>

      <Separator />
      <section aria-labelledby="kans-kwalificatie-titel" className="space-y-3">
        <h3 id="kans-kwalificatie-titel" className="text-base font-semibold">
          Kwalificatie
        </h3>
        <QualificationChecklist opportunity={o} />
      </section>

      <Separator />
      <section aria-labelledby="kans-gegevens-titel" className="space-y-4">
        <h3 id="kans-gegevens-titel" className="text-base font-semibold">
          Gegevens
        </h3>
        <OpportunityForm opportunity={o} onDone={() => undefined} />
      </section>

      <Separator />
      <section aria-labelledby="kans-historie-titel" className="space-y-3">
        <h3 id="kans-historie-titel" className="text-base font-semibold">
          Historie
        </h3>
        <StageHistory history={o.history} />
      </section>

      <Separator />
      <section aria-labelledby="kans-verwijderen-titel" className="space-y-3">
        <h3 id="kans-verwijderen-titel" className="text-base font-semibold">
          Verwijderen
        </h3>
        <p className="text-sm text-muted-foreground">
          Alleen voor een kans die er nooit had mogen staan: ze verdwijnt ook uit de conversiecijfers. Verloren of uitgesteld? Wijzig dan het stadium.
          {project && ' Het project blijft bestaan.'}
        </p>
        {bevestig ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={conflict}
              onClick={() => {
                mutate((d) => removeOpportunity(d, o.id));
                announce(`Kans ${o.company} verwijderd.`);
                onRemoved();
              }}
            >
              Ja, {o.company} verwijderen
            </Button>
            <Button variant="outline" onClick={() => setBevestig(false)}>
              Niet verwijderen
            </Button>
          </div>
        ) : (
          <Button variant="outline" disabled={conflict} onClick={() => setBevestig(true)}>
            Kans verwijderen
          </Button>
        )}
      </section>
    </div>
  );
}
