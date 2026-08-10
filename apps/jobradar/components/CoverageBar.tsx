import type { Dekking } from '@/lib/coverage'

type CoverageBarProps = {
  dekking: Dekking
}

/**
 * Toont waarop de afgeleide leads rusten.
 *
 * De aanleiding staat in `briefings/2026-08-10-component-dekkingsindicator.tcebc.md`: na
 * vier reviewrondes op de classificatie bleef 618 van 664 echte vacatures onbepaald, en
 * niets in de UI liet dat zien — de leadlijst oogde gewoon kort. Een gemiste classificatie
 * hoort een leesbaar getal te zijn, geen stille afwezigheid.
 *
 * Bewust zonder interactie: geen klik, geen tooltip, geen state. Het is een uitspraak over
 * de dataset, niet iets om in te duiken.
 */
export function CoverageBar({ dekking }: CoverageBarProps) {
  const { design, dev, onbepaald, totaal, geclassificeerd } = dekking

  if (totaal === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nog geen vacatures opgehaald — synchroniseer om te beginnen.
      </p>
    )
  }

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>
        <span className="font-medium tabular-nums text-foreground">{geclassificeerd}</span> van{' '}
        <span className="tabular-nums">{totaal}</span> vacatures geclassificeerd
      </span>
      <span aria-hidden className="text-border">
        |
      </span>
      <span className="tabular-nums">design {design}</span>
      <span className="tabular-nums">dev {dev}</span>
      <span className="tabular-nums">onbepaald {onbepaald}</span>
    </p>
  )
}
