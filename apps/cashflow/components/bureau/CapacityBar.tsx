import { cn } from '@umanex/ui/lib/utils';
import { formatDays } from '../../lib/bureau/format';

type CapacityBarProps = {
  label: string;
  budget: number;
  spent: number;
  planned: number;
};

/**
 * Besteed, gepland en vrij tegenover een budget, als balk met de getallen in de toegankelijke naam.
 * Gaat het erover, dan loopt de balk vol en staat de overschrijding als tekst ernaast — de kleur
 * alleen draagt het niet.
 */
export function CapacityBar({ label, budget, spent, planned }: CapacityBarProps) {
  const totaal = Math.max(budget, spent + planned, 0.0001);
  const pct = (n: number) => `${Math.max(0, (n / totaal) * 100)}%`;
  const over = spent + planned - budget;
  const vrij = budget - spent - planned;
  const beschrijving = `${label}: ${formatDays(spent)} besteed, ${formatDays(planned)} gepland, ${over > 0.005 ? `${formatDays(over)} boven budget` : `${formatDays(vrij)} vrij`} van ${formatDays(budget)}`;

  return (
    <div role="img" aria-label={beschrijving} className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-foreground" style={{ width: pct(Math.min(spent, totaal)) }} />
      <div className={cn('h-full bg-chart-2')} style={{ width: pct(Math.min(planned, Math.max(0, totaal - spent))) }} />
      {over > 0.005 && <div className="h-full bg-finance-negative-surface" style={{ width: pct(over) }} />}
    </div>
  );
}
