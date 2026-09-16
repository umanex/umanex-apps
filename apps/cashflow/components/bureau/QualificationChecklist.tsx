import { Badge } from '@umanex/ui/components/ui/badge';
import type { Opportunity } from '../../lib/bureau/types';
import { QUALIFICATION_ITEMS, qualification, type QualificationItem } from '../../lib/bureau/pipeline';

const ITEM: Record<QualificationItem, { label: string; vult: string }> = {
  behoefte: { label: 'Concrete behoefte', vult: 'veld Behoefte' },
  budgetruimte: { label: 'Plausibele investeringsruimte', vult: 'budget besproken of geschat, met een bedrag' },
  beslisser: { label: 'Betrokken beslisser', vult: 'vinkje De beslisser is betrokken' },
  tijdspad: { label: 'Serieus tijdspad', vult: 'beslisdatum of uitvoeringsperiode' },
};

/**
 * De vier voorwaarden van een gekwalificeerde kans, afgeleid uit de opgeslagen gegevens. Het
 * stadium "Gekwalificeerd" zegt niets over of ze er echt zijn — deze lijst wel.
 */
export function QualificationChecklist({ opportunity }: { opportunity: Opportunity }) {
  const { qualified, missing } = qualification(opportunity);
  return (
    <div className="space-y-3">
      <p className="text-sm" data-qualification={qualified ? 'ja' : 'nee'}>
        {qualified ? 'Gekwalificeerd: alle vier aanwezig.' : `${QUALIFICATION_ITEMS.length - missing.length} van ${QUALIFICATION_ITEMS.length} aanwezig.`}
      </p>
      <ul className="space-y-1.5">
        {QUALIFICATION_ITEMS.map((item) => {
          const ontbreekt = missing.includes(item);
          return (
            <li key={item} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span>
                {ITEM[item].label}
                {ontbreekt && <span className="block text-xs text-muted-foreground">Vul in: {ITEM[item].vult}</span>}
              </span>
              <Badge variant={ontbreekt ? 'outline' : 'secondary'}>{ontbreekt ? 'Ontbreekt' : 'Aanwezig'}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
