'use client'

import { Button } from '@umanex/ui/components/ui/button'
import { CLASSIFICATIES, type Classificatie } from '@/lib/db/schema'

/**
 * Het label per classificatie, plus de kleurrol.
 *
 * `beide` staat bewust náást `product` en niet bij `twijfel`: het is een genomen beslissing, geen
 * uitgesteld oordeel, en een bedrijf dat allebei doet is evengoed een prospect.
 *
 * DE KLEUR CODEERT DE UITKOMST, NIET DE OPTIE. Drie groepen, drie rollen:
 *   prospect (product, beide)          -> success
 *   geen prospect (dienstverlener, ...) -> neutraal
 *   uitgesteld (twijfel)                -> warning
 *
 * `beide` stond eerst op `primary`. Zolang jobradar zijn eigen blauw droeg las dat als neutraal-
 * informatief; op de umanex-rollaag is primary róód, en dan leest een positieve uitkomst als
 * alarm — naast het oranje van twijfel nog verwarrender. Dat de merkkleur wisselde maakte een
 * fout zichtbaar die er altijd al zat: de kleur hing aan de knop in plaats van aan de betekenis.
 */
const LABELS: Record<Classificatie, { tekst: string; uitleg: string; rol: string }> = {
  product: {
    tekst: 'Product',
    uitleg: 'Eigen softwareproduct',
    rol: 'border-success text-success hover:bg-success/10',
  },
  dienstverlener: {
    tekst: 'Dienstverlener',
    uitleg: 'Consultancy of detachering',
    rol: 'border-border text-muted-foreground hover:bg-muted',
  },
  beide: {
    tekst: 'Beide',
    uitleg: 'Eigen product én diensten',
    // Zelfde rol als product: allebei een prospect. Het onderscheid zit in het label en de
    // sneltoets, niet in de kleur — kleur draagt hier de uitkomst.
    rol: 'border-success text-success hover:bg-success/10',
  },
  'geen-prospect': {
    tekst: 'Geen prospect',
    uitleg: 'Bestaat niet meer, of past niet',
    rol: 'border-border text-muted-foreground hover:bg-muted',
  },
  twijfel: {
    tekst: 'Twijfel',
    uitleg: 'Terugkomen in ronde twee',
    rol: 'border-warning text-warning hover:bg-warning/10',
  },
}

type Props = {
  actief: Classificatie | null
  bezig: boolean
  onKies: (c: Classificatie) => void
}

export function ClassificatieKnoppen({ actief, bezig, onKies }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {CLASSIFICATIES.map((c, i) => {
        const l = LABELS[c]
        const gekozen = actief === c
        return (
          <Button
            key={c}
            type="button"
            variant="outline"
            disabled={bezig}
            onClick={() => onKies(c)}
            aria-pressed={gekozen}
            // `whitespace-normal` overschrijft de `whitespace-nowrap` uit de Button-primitive.
            // Zonder dat kapt de uitleg af op vijf kolommen — gemeten op 1280px: "Consultancy of
            // detacherin…" en "Terugkomen in ronde twee" liep zelfs over de kaartrand heen.
            className={`h-auto min-w-0 flex-col items-start gap-0.5 whitespace-normal px-3 py-2.5 text-left ${l.rol} ${
              gekozen ? 'ring-2 ring-ring ring-offset-1' : ''
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-semibold">{l.tekst}</span>
              <kbd className="rounded-sm border border-current px-1 text-2xs opacity-70">{i + 1}</kbd>
            </span>
            <span className="w-full text-2xs font-normal leading-tight text-muted-foreground">
              {l.uitleg}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
