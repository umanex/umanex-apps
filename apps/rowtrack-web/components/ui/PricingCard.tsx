type Props = {
  name: string;
  price: string;
  period: string;
  features: string[];
  /** Zet de accentrand — voor het plan waar de aandacht heen moet. */
  featured?: boolean;
  /** Klein label rechtsboven, bv. "Binnenkort". */
  badge?: string;
};

/**
 * Eén prijsplan.
 *
 * Het accent zit op de RAND en niet als vlak achter de tekst. Wit op accent haalt
 * 3.44:1 en zakt door WCAG AA (zie packages/rowtrack-tokens/TOKENS-TODO.md §1a); als
 * lijn draagt dezelfde kleur geen tekst en speelt dat niet.
 */
export const PricingCard = ({ name, price, period, features, featured = false, badge }: Props) => (
  <div
    className={`rounded-card border bg-bg-raised p-6 ${
      featured ? 'border-accent' : 'border-border-subtle'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <h3 className="text-lg text-fg-primary">{name}</h3>
      {badge ? (
        <span className="rounded-pill border border-accent px-3 py-1 text-xs uppercase tracking-widest text-accent">
          {badge}
        </span>
      ) : null}
    </div>

    <p className="mt-4 flex items-baseline gap-2">
      <span className="font-serif text-4xl text-fg-primary">{price}</span>
      <span className="text-fg-tertiary">{period}</span>
    </p>

    <ul className="mt-6 space-y-3">
      {features.map((feature) => (
        <li key={feature} className="flex gap-3 text-fg-secondary">
          <span aria-hidden="true" className="text-accent">
            —
          </span>
          {feature}
        </li>
      ))}
    </ul>
  </div>
);
