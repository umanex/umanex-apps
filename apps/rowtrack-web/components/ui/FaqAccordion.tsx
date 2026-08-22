export type FaqItem = {
  q: string;
  a: string;
};

type Props = {
  items: FaqItem[];
};

/**
 * De FAQ als native `<details>`/`<summary>`.
 *
 * Geen eigen state, geen client-component, geen byte JavaScript. Dat is hier geen
 * zuinigheid maar de beste optie op elke as die telt: de browser levert de
 * toetsenbordbediening (Enter en Space), de focusring en de open/dicht-status aan
 * schermlezers al, en de vragen blijven leesbaar wanneer JavaScript niet draait —
 * bij een zelfgebouwde accordion is dat precies wat er als eerste sneuvelt.
 *
 * Daarom staat er ook géén `aria-expanded` op. Het element draagt die status
 * natively; hem er met de hand bij zetten levert twee bronnen van waarheid op,
 * waarvan er één niet meebeweegt.
 *
 * De focus-ring staat er expliciet: `summary` valt buiten de browser-defaults van
 * links en knoppen, en de acceptatie vraagt een zichtbare ring op de accentrol.
 */
export const FaqAccordion = ({ items }: Props) => (
  <dl className="mt-12 divide-y divide-border-subtle border-y border-border-subtle">
    {items.map((item) => (
      <div key={item.q}>
        <details className="group">
          <summary className="-mx-2 flex cursor-pointer list-none items-center justify-between gap-4 rounded-highlight-row px-2 py-5 text-left text-lg text-fg-primary transition-colors marker:content-none hover:bg-accent-subtle hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <dt>{item.q}</dt>
            <span
              aria-hidden="true"
              className="shrink-0 text-2xl text-fg-tertiary transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <dd className="pb-5 pr-10 leading-relaxed text-fg-secondary">{item.a}</dd>
        </details>
      </div>
    ))}
  </dl>
);
