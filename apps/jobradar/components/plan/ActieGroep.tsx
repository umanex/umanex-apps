'use client'

import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { ActieRij } from './ActieRij'
import type { ActieStatus, ActieWeergave } from '@/lib/plan/types'

type ActieGroepProps = {
  titel: string
  /** Rechts van de kop, bv. "2 van 3". Leeg laten wanneer een telling niets toevoegt. */
  telling?: string
  acties: ActieWeergave[]
  variant: 'bezig' | 'beschikbaar' | 'geblokkeerd' | 'uitgesteld'
  /** Wat er staat als de groep leeg is. Een diagnose, geen "niets gevonden". */
  leeg: string
  /**
   * Standaard dicht, met de telling in de kop. Voor Geblokkeerd: twaalf rijen waar je niets mee
   * kunt, wogen in het overzicht even zwaar als de vijf die je kon starten.
   */
  inklapbaar?: boolean
  vandaag: string
  bezig: boolean
  onOpen: (key: string) => void
  onStatus: (key: string, status: ActieStatus) => void
  onVolgendeStap?: (key: string, tekst: string) => void
}

/** Een getitelde lijst acties. De sectie draagt de kop; de rijen zijn lijstitems. */
export function ActieGroep({
  titel,
  telling,
  acties,
  variant,
  leeg,
  inklapbaar = false,
  vandaag,
  bezig,
  onOpen,
  onStatus,
  onVolgendeStap,
}: ActieGroepProps) {
  const [open, setOpen] = useState(!inklapbaar)
  const lijstId = useId()
  // Een lege groep heeft niets om open te klappen: dan staat de diagnose er gewoon.
  const metKnop = inklapbaar && acties.length > 0

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        {metKnop ? (
          // De knop ín de kop, zoals het disclosure-patroon het wil: de kop blijft een kop in de
          // documentstructuur, en wie met een schermlezer van kop naar kop springt, landt op de
          // bediening.
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls={lijstId}
            onClick={() => setOpen((o) => !o)}
            // `h-auto py-0`: de knop van size sm is h-9, en daarmee was deze kop hoger dan de vier
            // andere groepskoppen — een ritmesprong op precies de groep die stil hoort te zijn.
            className="-ml-3 h-auto py-0 font-semibold"
          >
            <ChevronRight
              aria-hidden
              className={cn('transition-transform', open && 'rotate-90')}
            />
            {titel}
            {telling && <span className="font-normal tabular-nums text-muted-foreground">{telling}</span>}
          </Button>
        ) : (
          <>
            {titel}
            {telling && (
              <span className="ml-2 font-normal tabular-nums text-muted-foreground">{telling}</span>
            )}
          </>
        )}
      </h3>
      {acties.length === 0 ? (
        <p className="text-sm text-muted-foreground">{leeg}</p>
      ) : (
        <ol id={lijstId} hidden={!open} className="space-y-3">
          {acties.map((a) => (
            <ActieRij
              key={a.key}
              actie={a}
              variant={variant}
              vandaag={vandaag}
              bezig={bezig}
              onOpen={onOpen}
              onStatus={onStatus}
              onVolgendeStap={onVolgendeStap}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
