'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Input } from '@umanex/ui/components/ui/input'
import { Textarea } from '@umanex/ui/components/ui/textarea'
import { BESLISMOMENT_LABEL, type BeslissingWeergave } from '@/lib/plan/types'

type BeslissingPanelProps = {
  beslissing: BeslissingWeergave
  acties: { key: string; titel: string; status: string }[]
  vandaag: string
  bezig: boolean
  fout: string | null
  onOpenChange: (open: boolean) => void
  /** Geeft terug of het verzoek slaagde, zodat de bevestiging pas na het antwoord komt. */
  onBewaar: (body: Record<string, unknown>) => Promise<boolean>
  onHerlaad: () => Promise<boolean>
}

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
  const [melding, setMelding] = useState('')
  const [vraagSluiten, setVraagSluiten] = useState(false)
  /** Na een mislukte herlading blijft de knop staan, ook al is de melding dan geen versieconflict meer. */
  const [herlaadGevraagd, setHerlaadGevraagd] = useState(false)

  const versieConflict = fout !== null && /intussen elders gewijzigd/.test(fout)

  // Vergeleken met wat er bewaard is, zoals de server bewaart — getrimd. Na een geslaagde Bewaar
  // levert het plan dezelfde waarden en telt niets meer als onbewaard, ook niet een tekstvak dat
  // op een regeleinde eindigde.
  const tekstAnders = (lokaal: string, bewaard: string | null) =>
    lokaal.trim() !== (bewaard ?? '').trim()
  const onbewaard =
    tekstAnders(tekst, beslissing.beslissing) ||
    datum !== (beslissing.beslistOp ?? vandaag) ||
    tekstAnders(onderbouwing, beslissing.onderbouwing) ||
    tekstAnders(vervolg, beslissing.vervolgacties)

  /**
   * Waar de focus na het sluiten naartoe gaat.
   *
   * Radix geeft hem alleen terug aan een `SheetTrigger` (`context.triggerRef`), en dit paneel opent
   * via state. Zonder trigger roept de dialog `preventDefault()` op zijn eigen terugkeer en focust
   * hij niets: na Escape of het kruis stond de focus op `body`. `onOpenAutoFocus` loopt vóór de
   * focus het paneel in verhuist, dus `activeElement` is dan nog de knop die het opende.
   */
  const opener = useRef<HTMLElement | null>(null)
  const terugRef = useRef<HTMLButtonElement>(null)
  /** Waar de focus stond toen de vraag verscheen, om er na Terug naar terug te keren. */
  const voorVraag = useRef<HTMLElement | null>(null)
  const foutRef = useRef<HTMLParagraphElement>(null)

  // De foutmelding staat bovenaan, Bewaar onderaan een scrollend paneel: zonder dit verscheen de
  // fout buiten beeld. Scrollen, geen focus verplaatsen — de melding is al een `alert`, en een
  // focus erop zou hem twee keer laten voorlezen.
  useEffect(() => {
    if (fout) foutRef.current?.scrollIntoView({ block: 'nearest' })
    else setHerlaadGevraagd(false)
  }, [fout])

  useEffect(() => {
    if (vraagSluiten) terugRef.current?.focus()
  }, [vraagSluiten])

  // Wie de invoer intussen bewaarde of terugzette, hoeft niets meer te bevestigen.
  useEffect(() => {
    if (!onbewaard) setVraagSluiten(false)
  }, [onbewaard])

  /**
   * Eén plek voor Escape, een klik op de overlay én het sluitkruis. Het kruis roept
   * `onOpenChange(false)` rechtstreeks aan (`DialogClose`), dus `onEscapeKeyDown` of
   * `onInteractOutside` zouden het missen.
   */
  const vraagOfSluit = (open: boolean) => {
    if (open || !onbewaard) {
      onOpenChange(open)
      return
    }
    if (vraagSluiten) {
      terugRef.current?.focus()
      return
    }
    const actief = document.activeElement
    voorVraag.current = actief instanceof HTMLElement ? actief : null
    setVraagSluiten(true)
  }

  const bewaar = async () => {
    // `aria-disabled` en een guard in plaats van `disabled`: de knop houdt zijn focus tijdens het
    // verzoek, in plaats van hem af te geven aan `body`.
    if (bezig) return
    setMelding('')
    const ok = await onBewaar({
      beslissing: tekst.trim() === '' ? null : tekst,
      beslistOp: tekst.trim() === '' ? null : datum,
      onderbouwing: onderbouwing.trim() === '' ? null : onderbouwing,
      vervolgacties: vervolg.trim() === '' ? null : vervolg,
    })
    if (!ok) return
    setMelding(
      tekst.trim() === ''
        ? `${beslissing.key} bewaard, zonder beslissing.`
        : `${beslissing.key} vastgelegd, beslist op ${datum}.`
    )
  }

  const herlaad = async () => {
    setHerlaadGevraagd(true)
    setMelding('')
    if (await onHerlaad()) setMelding('Plan herladen.')
  }

  return (
    <Sheet open onOpenChange={vraagOfSluit}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md"
        onOpenAutoFocus={() => {
          const actief = document.activeElement
          opener.current = actief instanceof HTMLElement && actief !== document.body ? actief : null
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          if (opener.current?.isConnected) opener.current.focus()
        }}
      >
        <SheetHeader>
          <SheetTitle>
            <span className="tabular-nums text-muted-foreground">{beslissing.key}</span>{' '}
            {beslissing.titel}
          </SheetTitle>
          <SheetDescription>{beslissing.vraag}</SheetDescription>
        </SheetHeader>

        {vraagSluiten && onbewaard && (
          <div
            role="group"
            aria-labelledby="beslissing-sluit-vraag"
            className="space-y-2 rounded-md border border-warning p-3"
            data-sluit-vraag
          >
            <p id="beslissing-sluit-vraag" className="text-sm font-medium">
              Onbewaarde wijzigingen weggooien?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="destructive" onClick={() => onOpenChange(false)}>
                Weggooien
              </Button>
              <Button
                ref={terugRef}
                size="sm"
                variant="outline"
                onClick={() => {
                  if (voorVraag.current?.isConnected) voorVraag.current.focus()
                  setVraagSluiten(false)
                }}
              >
                Terug
              </Button>
            </div>
          </div>
        )}

        {fout && (
          <p
            ref={foutRef}
            role="alert"
            className="scroll-mt-6 rounded-md border border-destructive p-2 text-sm text-destructive"
            data-paneel-fout
          >
            {fout}
            {(versieConflict || herlaadGevraagd) && (
              <Button size="sm" variant="outline" className="ml-2" onClick={() => void herlaad()}>
                Herlaad plan
              </Button>
            )}
          </p>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Stand</h3>
          <Badge size="sm"
            variant={
              beslissing.afgeleid === 'beslist'
                ? 'success'
                : beslissing.afgeleid === 'klaar_voor_beoordeling'
                  ? 'warning'
                  : 'outline'
            }
            
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
                    <Badge size="sm"
                      variant={a?.status === 'gereed' ? 'success' : 'outline'}
                      className="ml-auto shrink-0"
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
            <Textarea
              size="sm"
              id="beslissing-tekst"
              rows={2}
              value={tekst}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setTekst(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="beslissing-datum" className="text-2xs">
              Datum
            </Label>
            <Input
              size="sm"
              id="beslissing-datum"
              type="date"
              value={datum}
              disabled={bezig}
              onChange={(e) => setDatum(e.target.value)}
              className={cn(DATUM_RING)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="beslissing-onderbouwing" className="text-2xs">
              Onderbouwing
            </Label>
            <Textarea
              size="sm"
              id="beslissing-onderbouwing"
              rows={3}
              value={onderbouwing}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setOnderbouwing(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="beslissing-vervolg" className="text-2xs">
              Vervolgacties
            </Label>
            <Textarea
              size="sm"
              id="beslissing-vervolg"
              rows={2}
              value={vervolg}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setVervolg(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            size="sm"
            aria-disabled={bezig}
            onClick={() => void bewaar()}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {bezig ? 'Bezig…' : 'Bewaar'}
          </Button>
        </section>

        {/* Altijd gerenderd, ook leeg: een live-regio die pas met zijn inhoud verschijnt, wordt
            niet betrouwbaar voorgelezen. Binnen het paneel, want zolang de sheet open is staat
            alles erbuiten op `aria-hidden`. De key in de tekst houdt meldingen verschillend. */}
        <p aria-live="polite" className="sr-only" data-paneel-melding>
          {melding}
        </p>
      </SheetContent>
    </Sheet>
  )
}
