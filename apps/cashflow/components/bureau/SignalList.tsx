import Link from 'next/link';
import { Badge } from '@umanex/ui/components/ui/badge';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import type { SignalLevel, SignalResult } from '../../lib/bureau/signals';

const NIVEAU: Record<SignalLevel, { woord: string; variant: 'destructive' | 'warning' | 'outline' | 'secondary' }> = {
  kritiek: { woord: 'Kritiek', variant: 'destructive' },
  'let-op': { woord: 'Let op', variant: 'warning' },
  onzeker: { woord: 'Onzeker', variant: 'outline' },
  info: { woord: 'Info', variant: 'secondary' },
};

/**
 * Wat aandacht vraagt, eerst. Het niveau staat als woord, niet alleen als kleur. Een lege lijst
 * zegt ook hoeveel signalen uit staan — "niets" en "niets bewaakt" zijn niet hetzelfde.
 */
export function SignalList({ result }: { result: SignalResult }) {
  const { signals, disabled } = result;
  return (
    <section aria-labelledby="signalen-titel" data-signal-list className="space-y-3 rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="signalen-titel" className="text-base font-semibold">
          Wat aandacht vraagt
        </h3>
        <p className="text-sm text-muted-foreground">
          {signals.length} {signals.length === 1 ? 'signaal' : 'signalen'}
          {disabled.length > 0 && ` · ${disabled.length} ${disabled.length === 1 ? 'staat' : 'staan'} uit`}
        </p>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-signals-empty>
          Niets volgens je drempels.
          {disabled.length > 0 && ' Uitgeschakelde signalen worden niet bewaakt — zie Doelen.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {signals.map((s) => (
            <li key={s.id} data-signal={s.id} data-level={s.level} className="grid gap-x-3 gap-y-1 py-1.5 sm:grid-cols-[5.5rem_1fr_auto] sm:items-baseline">
              <span>
                <Badge variant={NIVEAU[s.level].variant}>{NIVEAU[s.level].woord}</Badge>
              </span>
              <span className="min-w-0 text-sm">
                <span className="font-medium">{s.title}</span>
                <span className="hidden text-muted-foreground sm:inline"> · </span>
                <span className="block text-muted-foreground sm:inline">{s.detail}</span>
              </span>
              <Link href={s.href} aria-label={`${s.title} — bekijk`} className={cn('rounded-sm text-sm font-medium underline underline-offset-2', focusRing)}>
                Bekijk
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
