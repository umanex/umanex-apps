type Props = {
  id: string;
  children: React.ReactNode;
  /** Verhoogd vlak, om twee secties naast elkaar te laten ademen. */
  raised?: boolean;
};

/**
 * De sectie-wrapper: één plek voor de verticale ritmiek en de contentbreedte.
 *
 * `relative` staat er voor de design-laag: secties met een gloed (slot-CTA)
 * positioneren die absoluut tegen dit element. `overflow-hidden` houdt zo'n gloed
 * binnen de sectie; de verticale padding is ruim genoeg dat hover-lifts van
 * kaarten nergens tegen de rand clippen.
 *
 * TODO: `py-24 md:py-32`, `px-6` en `max-w-5xl` komen uit Tailwinds eigen schaal.
 * RowTrack's tokenset heeft geen spacing boven 48 en geen container-widths — zie
 * packages/rowtrack-tokens/TOKENS-TODO.md §3. Staat die er, dan verandert alleen
 * dit bestand en niet elke sectie.
 */
export const Section = ({ id, children, raised = false }: Props) => (
  <section
    id={id}
    className={
      raised
        ? 'band-gradient relative overflow-hidden border-t border-border-subtle bg-bg-elevated'
        : 'relative overflow-hidden'
    }
  >
    <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">{children}</div>
  </section>
);
