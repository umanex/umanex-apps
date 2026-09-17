import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@umanex/ui/components/ui/badge';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';

type KpiTileProps = {
  kpi: string;
  title: string;
  /** `null` = onvoldoende gegevens; dan staat er nooit een getal. */
  value: ReactNode | null;
  insufficient?: { reason: string; fix: { href: string; label: string } };
  secondary?: ReactNode;
  bar?: { fraction: number; label: string } | null;
  denominator: ReactNode;
  source: string;
  link: { href: string; label: string };
  /** Deels gegevens: wat ontbreekt, als woord. */
  chips?: string[];
  attention?: boolean;
};

/**
 * Eén vraag, één getal, en waar het vandaan komt. Elke tegel draagt zijn noemer en bron en precies
 * één link verder: naar de onderliggende gegevens, of — zonder gegevens — naar waar je ze invult.
 */
export function KpiTile({ kpi, title, value, insufficient, secondary, bar, denominator, source, link, chips = [], attention = false }: KpiTileProps) {
  const titelId = `kpi-${kpi}-titel`;
  const doel = value === null && insufficient ? insufficient.fix : link;
  return (
    <section aria-labelledby={titelId} data-kpi={kpi} className="flex flex-col rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={titelId} className="text-base font-semibold">
          {title}
        </h3>
        {attention && <Badge variant="warning">Vraagt aandacht</Badge>}
      </div>

      {value === null ? (
        <div className="mt-3" data-onvoldoende>
          <p className="text-lg font-semibold text-muted-foreground">Onvoldoende gegevens</p>
          {insufficient && <p className="text-sm text-muted-foreground">{insufficient.reason}</p>}
        </div>
      ) : (
        <>
          <p className="mt-3 text-3xl font-bold tabular-nums" data-kpi-value>{value}</p>
          {secondary && <p className="mt-1 text-sm text-muted-foreground">{secondary}</p>}
          {bar && (
            <div role="img" aria-label={bar.label} className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', bar.fraction > 1 ? 'bg-finance-negative-surface' : 'bg-foreground')} style={{ width: `${Math.max(0, Math.min(1, bar.fraction)) * 100}%` }} />
            </div>
          )}
        </>
      )}

      <dl className="mt-4 space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted-foreground">Noemer</dt>
          <dd data-kpi-noemer>{denominator}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted-foreground">Bron</dt>
          <dd data-kpi-bron>{source}</dd>
        </div>
      </dl>
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Gedeeltelijke gegevens">
          {chips.map((c) => (
            <li key={c}>
              <Badge variant="outline">{c}</Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-4">
        <Link href={doel.href} className={cn('rounded-sm text-sm font-medium underline underline-offset-2', focusRing)}>
          {doel.label}
        </Link>
      </div>
    </section>
  );
}
