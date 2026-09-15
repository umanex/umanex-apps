import Link from 'next/link';

type Props = {
  label: string;
  /** Het getal zelf. `null` betekent niet gemeten — nooit 0 in dat geval. */
  waarde: number | null;
  /** De noemer, als tekst. Verplicht: een teller zonder noemer is geen meting. */
  noemer: string;
  /** Waar de ontleding van dit getal staat. Zonder link is het aggregaat een dood eind. */
  href?: string;
  /** `waarschuwing` dempt niet, maar markeert. Kleur is nooit de enige drager. */
  toon?: 'neutraal' | 'waarschuwing';
};

/**
 * Eén as op een overzichtspagina: getal, noemer, en een weg naar de regels eronder.
 *
 * Twee regels uit `CLAUDE.md` zitten hier hard in. **Een aggregaat draagt zijn ontleding** —
 * vandaar `href`, en vandaar dat de invariant-test eist dat het getal optelt uit de regels
 * op de bestemming. En **een teller draagt zijn noemer**: "24" zegt niets, "24 van 131"
 * wel, en een lege lijst leest anders als succes.
 */
export const Tegel = ({ label, waarde, noemer, href, toon = 'neutraal' }: Props) => {
  const inhoud = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-2xl font-semibold tabular-nums ${
            waarde === null ? 'text-muted-foreground' : 'text-foreground'
          }`}
        >
          {waarde === null ? '—' : waarde}
        </span>
        <span className="text-xs text-muted-foreground">{noemer}</span>
      </p>
      {toon === 'waarschuwing' && waarde !== null ? (
        <span className="mt-1 inline-block rounded-sm bg-warning/20 px-1.5 py-0.5 text-2xs font-medium text-foreground">
          vraagt aandacht
        </span>
      ) : null}
    </>
  );

  const basis = 'block rounded-md border border-border px-3 py-2.5 text-left';

  if (!href) return <div className={basis}>{inhoud}</div>;

  return (
    <Link
      href={href}
      className={`${basis} transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
    >
      {inhoud}
    </Link>
  );
};
