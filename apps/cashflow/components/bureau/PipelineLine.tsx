import { formatCurrency } from '../../lib/cashflow/recurring';
import type { Opportunity } from '../../lib/bureau/types';
import { openPipeline } from '../../lib/bureau/pipeline';

/** De open kansen nu, los van de periode: aantal, voorstellen, ongewogen waarde en kwalificatie. */
export function PipelineLine({ opportunities }: { opportunities: Opportunity[] }) {
  const p = openPipeline(opportunities);
  return (
    <p className="text-sm text-muted-foreground" data-pipeline-line>
      Open nu <span className="font-medium text-foreground tabular-nums">{p.count}</span> {p.count === 1 ? 'kans' : 'kansen'} ·{' '}
      <span className="font-medium text-foreground tabular-nums">{p.proposals}</span> {p.proposals === 1 ? 'voorstel' : 'voorstellen'} · verwachte waarde{' '}
      <span className="font-medium text-foreground tabular-nums">{formatCurrency(p.value)}</span> ongewogen
      {p.withoutValue > 0 && <> ({p.withoutValue} zonder waarde)</>} · <span className="font-medium text-foreground tabular-nums">{p.qualified}</span> van {p.count} gekwalificeerd
    </p>
  );
}
