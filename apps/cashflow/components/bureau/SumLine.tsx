import { cn } from '@umanex/ui/lib/utils';

type SumLineProps = {
  /** Bv. "Som dagbudgetten en buffer". */
  label: string;
  sum: string;
  /** Bv. "totaal 200 d". */
  against: string;
  /** Afwijking, al opgemaakt met teken; `null` = sluit. */
  deviation: string | null;
  /** Zolang een veld niet te lezen is, valt er niets op te tellen. */
  unreadable?: boolean;
};

/**
 * Toont of een reeks opgeteld klopt met het totaal — en corrigeert niets. Het verschil staat er
 * met teken en in woorden, zodat het niet alleen aan de kleur te zien is.
 */
export function SumLine({ label, sum, against, deviation, unreadable }: SumLineProps) {
  if (unreadable) {
    return <p className="text-sm text-muted-foreground">{label}: niet op te tellen zolang een veld hierboven geen getal is.</p>;
  }
  return (
    <p className="text-sm" data-sum-line>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium tabular-nums">{sum}</span>
      <span className="text-muted-foreground"> · {against} · </span>
      <span className={cn('font-medium tabular-nums', deviation ? 'text-finance-deferred' : 'text-finance-positive')}>
        {deviation ? `verschil ${deviation}` : 'sluit'}
      </span>
    </p>
  );
}
