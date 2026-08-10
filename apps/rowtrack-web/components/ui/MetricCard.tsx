type Props = {
  label: string;
  unit: string;
  note: string;
};

/**
 * Eén live metric: het label zoals het in de app staat, de eenheid, en wat hij zegt.
 *
 * De eenheid volgt de SI-casing uit de briefing — W met een hoofdletter, m/min/kcal/
 * bpm/spm klein — en `/500m` blijft aan de split vastzitten omdat dat in de app de
 * hele aanduiding is, niet een label met een losse eenheid ernaast.
 */
export const MetricCard = ({ label, unit, note }: Props) => (
  <li className="rounded-card border border-border-subtle bg-bg-raised p-5">
    <p className="flex items-baseline gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-widest text-fg-tertiary">
        {label}
      </span>
      <span className="text-sm text-accent">{unit}</span>
    </p>
    <p className="mt-2 text-fg-secondary">{note}</p>
  </li>
);
