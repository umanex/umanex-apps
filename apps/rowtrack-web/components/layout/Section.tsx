type Props = {
  id: string;
  children: React.ReactNode;
  /** Verhoogd vlak, om twee secties naast elkaar te laten ademen. */
  raised?: boolean;
};

/**
 * De sectie-wrapper: één plek voor de verticale ritmiek en de contentbreedte.
 *
 * TODO: `py-24`, `px-6` en `max-w-5xl` komen uit Tailwinds eigen schaal. RowTrack's
 * tokenset heeft geen spacing boven 48 en geen container-widths — zie
 * packages/rowtrack-tokens/TOKENS-TODO.md §3. Staat die er, dan verandert alleen
 * dit bestand en niet elke sectie.
 */
export const Section = ({ id, children, raised = false }: Props) => (
  <section id={id} className={raised ? 'bg-bg-elevated' : undefined}>
    <div className="mx-auto max-w-5xl px-6 py-24">{children}</div>
  </section>
);
