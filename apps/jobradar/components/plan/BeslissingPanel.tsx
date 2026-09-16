'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@umanex/ui/components/ui/sheet'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { Label } from '@umanex/ui/components/ui/label'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { BESLISMOMENT_LABEL, type BeslissingWeergave } from '@/lib/plan/types'

type BeslissingPanelProps = {
  beslissing: BeslissingWeergave
  acties: { key: string; titel: string; status: string }[]
  vandaag: string
  bezig: boolean
  fout: string | null
  onOpenChange: (open: boolean) => void
  onBewaar: (body: Record<string, unknown>) => void
  onHerlaad: () => void
}

const INVOER = 'rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50'
const DATUM_RING =
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background'

/**
 * Een beslismoment vastleggen.
 *
 * De gekoppelde acties staan er alleen-lezen bij. "Klaar voor beoordeling" betekent dat er
 * iets te beoordelen valt — het invullen blijft een handeling, en de app vult nooit vooruit.
 */
export function BeslissingPanel({
  beslissing,
  acties,
  vandaag,
  bezig,
  fout,
  onOpenChange,
  onBewaar,
  onHerlaad,
}: BeslissingPanelProps) {
  const [tekst, setTekst] = useState(beslissing.beslissing ?? '')
  const [datum, setDatum] = useState(beslissing.beslistOp ?? vandaag)
  const [onderbouwing, setOnderbouwing] = useState(beslissing.onderbouwing ?? '')
  const [vervolg, setVervolg] = useState(beslissing.vervolgacties ?? '')

  const versieConflict = fout !== null && /intussen elders gewijzigd/.test(fout)

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            <span className="tabular-nums text-muted-foreground">{beslissing.key}</span>{' '}
            {beslissing.titel}
          </SheetTitle>
          <SheetDescription>{beslissing.vraag}</SheetDescription>
        </SheetHeader>

        {fout && (
          <p role="alert" className="rounded-md border border-destructive p-2 text-sm text-destructive">
            {fout}
            {versieConflict && (
              <Button size="sm" variant="outline" className="ml-2" onClick={onHerlaad}>
                Herlaad plan
              </Button>
            )}
          </p>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Stand</h3>
          <Badge
            variant={
              beslissing.afgeleid === 'beslist'
                ? 'success'
                : beslissing.afgeleid === 'klaar_voor_beoordeling'
                  ? 'warning'
                  : 'outline'
            }
            className="text-2xs"
          >
            {BESLISMOMENT_LABEL[beslissing.afgeleid]}
          </Badge>
          {beslissing.totaal > 0 && (
            <ul className="space-y-1">
              {beslissing.acties.map((key) => {
                const a = acties.find((x) => x.key === key)
                return (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <span className="tabular-nums text-muted-foreground">{key}</span>
                    <span className="min-w-0 truncate">{a?.titel}</span>
                    <Badge
                      variant={a?.status === 'gereed' ? 'success' : 'outline'}
                      className="ml-auto shrink-0 text-2xs"
                    >
                      {a?.status === 'gereed' ? 'gereed' : 'nog niet'}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-2xs text-muted-foreground">
            Alle gekoppelde acties gereed betekent dat er iets te beoordelen valt, niet dat het
            goedgekeurd is.
          </p>
        </section>

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Beslissing</h3>
          <div className="space-y-1">
            <Label htmlFor="beslissing-tekst" className="text-2xs">
              Wat heb je besloten?
            </Label>
            <textarea
              id="beslissing-tekst"
              rows={2}
              value={tekst}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setTekst(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="beslissing-datum" className="text-2xs">
              Datum
            </Label>
            <input
              id="beslissing-datum"
              type="date"
              value={datum}
              disabled={bezig}
              onChange={(e) => setDatum(e.target.value)}
              className={cn(INVOER, DATUM_RING, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="beslissing-onderbouwing" className="text-2xs">
              Onderbouwing
            </Label>
            <textarea
              id="beslissing-onderbouwing"
              rows={3}
              value={onderbouwing}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setOnderbouwing(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="beslissing-vervolg" className="text-2xs">
              Vervolgacties
            </Label>
            <textarea
              id="beslissing-vervolg"
              rows={2}
              value={vervolg}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setVervolg(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <Button
            size="sm"
            disabled={bezig}
            onClick={() =>
              onBewaar({
                beslissing: tekst.trim() === '' ? null : tekst,
                beslistOp: tekst.trim() === '' ? null : datum,
                onderbouwing: onderbouwing.trim() === '' ? null : onderbouwing,
                vervolgacties: vervolg.trim() === '' ? null : vervolg,
              })
            }
          >
            {bezig ? 'Bezig…' : 'Bewaar'}
          </Button>
        </section>
      </SheetContent>
    </Sheet>
  )
}
