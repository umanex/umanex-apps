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
 *
 * De eenheid is het grote element (serif, zoals de cijfers in de app); het accent
 * blijft voorbehouden aan de hover-staat, conform de accent-afspraak uit de briefing.
 */
export const MetricCard = ({ label, unit, note }: Props) => (
  <li className="rounded-card border border-border-subtle bg-bg-raised p-5 shadow-button-outline transition duration-300 hover:-translate-y-1 hover:border-accent">
    <p className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-fg-tertiary">
        {label}
      </span>
      <span className="font-serif text-2xl text-fg-primary">{unit}</span>
    </p>
    <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{note}</p>
  </li>
);
