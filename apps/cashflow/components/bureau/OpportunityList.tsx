'use client';

import { useState } from 'react';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Label } from '@umanex/ui/components/ui/label';
import type { BureauData, IsoDate, OpportunityStage } from '../../lib/bureau/types';
import { OPEN_STAGES, STAGES } from '../../lib/bureau/types';
import { STAGE_LABEL } from '../../lib/bureau/labels';
import { OpportunityRow } from './OpportunityRow';

const GESLOTEN = STAGES.filter((s) => !OPEN_STAGES.includes(s));

/** De kansen per stadium, open eerst. Afgesloten kansen staan achter een schakelaar met hun aantal. */
export function OpportunityList({ bureau, today, onOpen }: { bureau: BureauData; today: IsoDate; onOpen: (id: string) => void }) {
  const [toonGesloten, setToonGesloten] = useState(false);
  const perStadium = (s: OpportunityStage) =>
    bureau.opportunities.filter((o) => o.stage === s).sort((a, b) => (a.nextAction?.date ?? '9999').localeCompare(b.nextAction?.date ?? '9999') || a.company.localeCompare(b.company));
  const aantalGesloten = bureau.opportunities.filter((o) => GESLOTEN.includes(o.stage)).length;
  const stadia = toonGesloten ? STAGES : OPEN_STAGES;

  return (
    <section aria-labelledby="kansen-titel" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="kansen-titel" className="text-base font-semibold">
          Kansen per stadium
        </h3>
        <div className="flex items-center gap-2">
          <Checkbox id="kansen-gesloten" checked={toonGesloten} onCheckedChange={(v) => setToonGesloten(v === true)} />
          <Label htmlFor="kansen-gesloten">Toon afgesloten ({aantalGesloten})</Label>
        </div>
      </div>
      {stadia.map((s) => {
        const rijen = perStadium(s);
        return (
          <div key={s} className="space-y-1" data-stage-group={s}>
            <h4 className="text-sm font-medium text-muted-foreground">
              {STAGE_LABEL[s]} <span className="tabular-nums">({rijen.length})</span>
            </h4>
            {rijen.length === 0 ? (
              <p className="px-3 text-xs text-muted-foreground">Geen kansen in dit stadium.</p>
            ) : (
              <ul className="space-y-0.5">
                {rijen.map((o, i) => (
                  <OpportunityRow key={o.id} opportunity={o} project={bureau.projects.find((p) => p.id === o.projectId)} today={today} striped={i % 2 === 1} onOpen={onOpen} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
