'use client'

import { Building2, ExternalLink, Search, Loader2, Unlink } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Checkbox } from '@umanex/ui/components/ui/checkbox'
import { Label } from '@umanex/ui/components/ui/label'
import { zoekopdracht, type Prospect } from '@/lib/prospects'

/**
 * De signalen die je tijdens het beoordelen aanvinkt. Bewust los van de classificatie: ze zeggen
 * iets over waarom een bedrijf interessant is, niet wat het is. Meerdere tegelijk mag.
 */
export const SIGNALEN = ['meerdere producten', 'designer zichtbaar', 'publieke repo'] as const

type Props = {
  prospect: Prospect
  signalen: string[]
  verrijkt: boolean
  bezig: boolean
  onSignaal: (signaal: string, aan: boolean) => void
  onUrlAfkeuren: () => void
}

/**
 * Eén bedrijf, één scherm. De website is de enige informatie waarop je kan oordelen, dus die
 * krijgt de meeste ruimte en de eerste actie.
 *
 * Er zit GEEN iframe in, en dat is een keuze: veel sites blokkeren framing met `X-Frame-Options`,
 * en een stil leeg kader leest als "dit bedrijf heeft geen site" terwijl hij er wel is. Een link
 * die opent in een tweede tabblad liegt niet.
 */
export function ProspectKaart({ prospect, signalen, verrijkt, bezig, onSignaal, onUrlAfkeuren }: Props) {
  const zoekUrl = `https://duckduckgo.com/?q=${encodeURIComponent(zoekopdracht(prospect))}`

  return (
    <article className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Building2 className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <h2 className="text-xl font-semibold leading-tight">{prospect.companyName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pl-7">
          <Badge variant="outline" className="text-2xs">
            {prospect.region} · {prospect.postcode}
          </Badge>
          {prospect.naceCode && (
            <Badge variant="outline" className="text-2xs">
              NACE {prospect.naceCode}
            </Badge>
          )}
          {prospect.werknemers !== null ? (
            <Badge variant="outline" className="text-2xs">
              {prospect.werknemers} VTE
            </Badge>
          ) : (
            // Niet weglaten: "niet geteld" is informatie, en verstoppen ervan laat je denken dat
            // de personeelsfilter gedraaid heeft terwijl dat niet zo is.
            <Badge variant="outline" className="text-2xs text-muted-foreground">
              personeel niet geteld
            </Badge>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-2 rounded border border-border bg-muted/40 p-4">
        {verrijkt ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Website opzoeken en het ondernemingsnummer verifiëren…
          </div>
        ) : prospect.url ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <a href={prospect.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Site openen
                </a>
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={bezig} onClick={onUrlAfkeuren}>
                <Unlink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Verkeerd bedrijf
              </Button>
            </div>
            <p className="break-all text-2xs text-muted-foreground">{prospect.url}</p>
          </>
        ) : (
          <>
            {/* Verwacht bij het overgrote deel: maar 6% heeft een webadres in de KBO. Dit is dus
                geen randgeval maar de normale toestand, en hij hoort een actie te dragen in
                plaats van een streepje. */}
            <p className="text-sm text-muted-foreground">Geen website bekend in de KBO.</p>
            <Button asChild variant="outline" size="sm" className="self-start">
              <a href={zoekUrl} target="_blank" rel="noopener noreferrer">
                <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Zelf zoeken
              </a>
            </Button>
          </>
        )}
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Signalen</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SIGNALEN.map((signaal) => {
            const id = `signaal-${prospect.id}-${signaal.replace(/\s+/g, '-')}`
            return (
              <div key={signaal} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={signalen.includes(signaal)}
                  disabled={bezig}
                  onCheckedChange={(aan) => onSignaal(signaal, aan === true)}
                />
                <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                  {signaal}
                </Label>
              </div>
            )
          })}
        </div>
      </fieldset>
    </article>
  )
}
