import Image from 'next/image';

type Props = {
  /** Pad onder /public/screenshots, zonder map en zonder extensie. */
  name: string;
  /** Wat er te zien is. Beschrijf het scherm, niet het bestand. */
  alt: string;
  /** Bijschrift onder het toestel, optioneel. */
  caption?: string;
  /** Laadt zonder lazy-loading — alleen voor het beeld boven de vouw. */
  priority?: boolean;
};

/**
 * Een toestelframe met een echte schermafbeelding uit de app.
 *
 * De beelden zijn vastgelegd op de iOS-simulator via de `__DEV__`-route
 * `rowtrack://dev-active?...&bare=1`, die het active-workout-scherm met mock-metrics
 * rendert zonder verbonden roeier. Geen nagetekende UI: dat is de mockup-val die het
 * onderzoek als fout aanmerkt, want zo'n plaat belooft een scherm dat niet bestaat en
 * veroudert zonder dat iemand het merkt.
 *
 * De verhouding staat vast op 9/19.5 — precies wat de simulator uitspuwt (1206×2622),
 * dus er wordt niets bijgesneden of opgerekt.
 */
export const ScreenshotFrame = ({ name, alt, caption, priority = false }: Props) => (
  <figure className="mx-auto w-full max-w-[280px]">
    <div className="rounded-card border border-border-strong bg-bg-raised p-3 shadow-button-outline">
      <Image
        src={`/screenshots/${name}.png`}
        alt={alt}
        width={386}
        height={840}
        priority={priority}
        className="w-full rounded-card"
        sizes="280px"
      />
    </div>
    {caption ? (
      <figcaption className="mt-3 text-center text-sm text-fg-tertiary">{caption}</figcaption>
    ) : null}
  </figure>
);
