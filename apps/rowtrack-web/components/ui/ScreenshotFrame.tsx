type Props = {
  /** Wat er te zien is zodra de echte schermafbeelding er staat. */
  alt: string;
  /** Bijschrift onder het toestel, optioneel. */
  caption?: string;
};

/**
 * Een toestelframe met — voorlopig — een lege plaat erin.
 *
 * Er staat geen enkele productscreenshot in deze repo, en er wordt er hier geen
 * verzonnen. Een nagetekende UI op een marketingpagina is precies de mockup-val die
 * het onderzoek als fout aanmerkt: hij belooft een scherm dat niet bestaat, en hij
 * veroudert zonder dat iemand het merkt omdat er geen bron is om tegen te vergelijken.
 *
 * De alt-tekst beschrijft wél al wat er komt te staan, zodat de copy nu al klopt.
 *
 * TODO(assets): vervang door echte captures uit apps/rowtrack (active workout portrait
 * en landscape, summary, history detail, idle met de vijf doelmodi, PR-staat).
 * Specificatie in het inputdocument §16: 1290×2796, 2×/3×, PNG, dark UI.
 */
export const ScreenshotFrame = ({ alt, caption }: Props) => (
  <figure className="mx-auto w-full max-w-[280px]">
    <div className="rounded-card border border-border-strong bg-bg-raised p-3 shadow-button-outline">
      <div
        role="img"
        aria-label={alt}
        className="flex aspect-[9/19.5] items-center justify-center rounded-card bg-bg-base px-6 text-center text-sm text-fg-tertiary"
      >
        Schermafbeelding volgt
      </div>
    </div>
    {caption ? (
      <figcaption className="mt-3 text-center text-sm text-fg-tertiary">{caption}</figcaption>
    ) : null}
  </figure>
);
