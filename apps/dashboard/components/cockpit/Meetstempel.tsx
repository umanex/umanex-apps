import { Clock } from 'lucide-react';

type Props = {
  /** `measured_at` uit de envelop — nooit het moment van laden. */
  moment: string | null;
  dagen: number | null;
  staat: 'vers' | 'verouderd' | 'ontbreekt';
};

/**
 * Wanneer is dit gemeten, en telt het nog.
 *
 * Staat op elke tegel en elke pagina, want een getal zonder meetmoment is een bewering
 * zonder datum. Het moment komt uit de JSON; zou het uit `Date.now()` komen, dan is elke
 * meting per definitie vers en zegt deze regel niets.
 *
 * Kleur is nooit de enige drager: `verouderd` staat er ook als woord, met het aantal dagen
 * erbij. Wie de kleur niet ziet, leest hetzelfde.
 */
export const Meetstempel = ({ moment, dagen, staat }: Props) => {
  if (staat === 'ontbreekt' || moment === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" aria-hidden="true" />
        niet gemeten
      </span>
    );
  }

  const datum = new Date(moment);
  const leesbaar = datum.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
  const tijd = datum.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        staat === 'verouderd' ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      gemeten {leesbaar} {tijd}
      {staat === 'verouderd' && dagen !== null ? (
        <span className="rounded-sm bg-warning/20 px-1.5 py-0.5 font-medium">
          verouderd — {dagen} d
        </span>
      ) : null}
    </span>
  );
};
