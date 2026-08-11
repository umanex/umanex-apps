type Props = {
  name: string;
  price: string;
  period: string;
  features: string[];
  /** Zet de accent-treatment — voor het plan waar de aandacht heen moet. */
  featured?: boolean;
  /** Klein label rechtsboven, bv. "Binnenkort". */
  badge?: string;
};

/**
 * Eén prijsplan.
 *
 * Het accent zit op de RAND en niet als vlak achter de tekst. Wit op accent haalt
 * 3.44:1 en zakt door WCAG AA (zie packages/rowtrack-tokens/TOKENS-TODO.md §1a); als
 * lijn draagt dezelfde kleur geen tekst en speelt dat niet. Het uitgelichte plan
 * krijgt die rand als gradient-hairline (vol accent bovenaan, uitlopend naar de
 * subtiele rand) plus een zachte gloed — meer gewicht, nul extra tekst op accent.
 *
 * De "rand" is een achtergrond die door een TRANSPARANTE echte border heen toont
 * (background-clip: border-box, de default). Dat is geen omweg om een p-px maar de
 * forced-colors-vangrail: Windows High Contrast strijkt achtergronden en shadows
 * weg maar geeft een echte border een kleur — zonder deze border verdwenen de
 * kaartranden en de featured-markering daar volledig.
 */
export const PricingCard = ({ name, price, period, features, featured = false, badge }: Props) => (
  <div
    className={`rounded-card border border-transparent ${
      featured ? 'card-glow-accent hairline-accent' : 'bg-border-subtle'
    }`}
  >
    <div className="h-full rounded-card bg-bg-raised p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg text-fg-primary">{name}</h3>
        {badge ? (
          <span className="rounded-pill border border-accent px-3 py-1 text-xs uppercase tracking-widest text-accent">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-serif text-5xl tracking-tight text-fg-primary">{price}</span>
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
  </div>
);
