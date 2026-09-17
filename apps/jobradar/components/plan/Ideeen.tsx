'use client'

import { useEffect, useRef, useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { Input } from '@umanex/ui/components/ui/input'
import { NativeSelect } from '@umanex/ui/components/ui/native-select'
import { PRIORITEIT_LABEL } from '@/lib/plan/seed-inhoud'
import {
  PRIORITEITEN,
  type PlanIdee,
  type Prioriteit,
  type Verzoekuitkomst,
} from '@/lib/plan/types'

type IdeeenProps = {
  ideeen: PlanIdee[]
  bezig: boolean
  /** Wacht op het antwoord: de titel verdwijnt pas als het idee er echt staat. */
  onToevoegen: (titel: string) => Promise<Verzoekuitkomst>
  /** Met de key van de nieuwe actie, voor de aankondiging. */
  onOpnemen: (
    id: number,
    prioriteit: Prioriteit
  ) => Promise<Verzoekuitkomst & { opgenomenAls: string | null }>
  onVerwerpen: (id: number) => void
  onVerwijderen: (id: number) => void
  onOpenActie: (key: string) => void
}


/**
 * De ideeënlijst.
 *
 * Bewust buiten het plan: een idee dat als actie bestaat, telt mee in elke telling en in elke
 * voortgangsbalk. Opnemen vraagt daarom een expliciete keuze van de prioriteitsgroep — dat is
 * de enige weg waarop een idee een actie wordt, en hij is nooit een neveneffect.
 */
export function Ideeen({
  ideeen,
  bezig,
  onToevoegen,
  onOpnemen,
  onVerwerpen,
  onVerwijderen,
  onOpenActie,
}: IdeeenProps) {
  const [titel, setTitel] = useState('')
  const [opnemen, setOpnemen] = useState<number | null>(null)
  const [prioriteit, setPrioriteit] = useState<string>('')
  /** De fout bij de bediening die hem veroorzaakte: het invoerveld, of het idee dat je opnam. */
  const [fout, setFout] = useState<{ bij: 'toevoegen' | number; tekst: string } | null>(null)
  const [melding, setMelding] = useState('')
  const invoerRef = useRef<HTMLInputElement>(null)
  const toevoegenRef = useRef<HTMLDivElement>(null)
  /**
   * Na een geslaagde toevoeging staat de focus weer in het invoerveld, klaar voor het volgende
   * idee. Voeg toe zelf kan hem niet houden: met een leeg veld is er niets meer toe te voegen.
   * Pas na `bezig`: tot dan staat het veld uitgeschakeld.
   */
  const focusOpInvoer = useRef(false)

  useEffect(() => {
    if (bezig || !focusOpInvoer.current) return
    focusOpInvoer.current = false
    invoerRef.current?.focus()
  }, [bezig, titel])

  const voegToe = async () => {
    // `aria-disabled` en een guard in plaats van `disabled` tijdens het verzoek: de knop die je
    // indrukt houdt zo zijn focus, in plaats van hem af te geven aan `body`.
    if (bezig || titel.trim() === '') return
    const nieuw = titel.trim()
    const hadFocus = Boolean(toevoegenRef.current?.contains(document.activeElement))
    setFout(null)
    setMelding('')
    const uitkomst = await onToevoegen(nieuw)
    if (!uitkomst.ok) {
      // De titel blijft staan: eerst werd hij gewist vóór het antwoord, en bij een 400 of 500
      // was wat je typte weg.
      setFout({ bij: 'toevoegen', tekst: uitkomst.fout ?? 'Idee niet toegevoegd.' })
      return
    }
    focusOpInvoer.current = hadFocus
    setTitel('')
    setMelding(`Idee toegevoegd: ${nieuw}.`)
  }

  const bevestigOpnemen = async (idee: PlanIdee) => {
    if (bezig || prioriteit === '') return
    setFout(null)
    setMelding('')
    const uitkomst = await onOpnemen(idee.id, Number(prioriteit) as Prioriteit)
    if (!uitkomst.ok) {
      // Het keuzeblok blijft open met de gekozen groep, zodat opnieuw proberen één klik is.
      setFout({ bij: idee.id, tekst: uitkomst.fout ?? 'Idee niet opgenomen.' })
      return
    }
    setOpnemen(null)
    setPrioriteit('')
    setMelding(
      uitkomst.opgenomenAls
        ? `${idee.titel} opgenomen als ${uitkomst.opgenomenAls}.`
        : `${idee.titel} opgenomen in het plan.`
    )
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Ideeën</h3>
      <p className="text-2xs text-muted-foreground">
        Wat hier staat telt niet mee in het plan tot je het opneemt.
      </p>

      <div ref={toevoegenRef} className="flex flex-wrap gap-2">
        <Input
          size="sm"
          ref={invoerRef}
          type="text"
          aria-label="Nieuw idee"
          value={titel}
          maxLength={120}
          disabled={bezig}
          placeholder="Waar denk je aan?"
          onChange={(e) => setTitel(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={titel.trim() === ''}
          aria-disabled={bezig}
          onClick={voegToe}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Voeg toe
        </Button>
      </div>
      {fout?.bij === 'toevoegen' && (
        <p role="alert" className="text-sm text-destructive" data-idee-fout>
          {fout.tekst}
        </p>
      )}

      {ideeen.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen ideeën. Wat hier belandt telt niet mee in het plan tot je het opneemt.
        </p>
      ) : (
        <ul className="space-y-3">
          {ideeen.map((i) => (
            <li key={i.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{i.titel}</span>
                {i.status === 'opgenomen' && (
                  <Badge size="sm" variant="success">
                    opgenomen als {i.opgenomenAls}
                  </Badge>
                )}
                {i.status === 'verworpen' && (
                  <Badge size="sm" variant="outline" className="text-muted-foreground">
                    verworpen
                  </Badge>
                )}
              </div>
              {i.notitie && <p className="mt-1 text-sm text-muted-foreground">{i.notitie}</p>}

              {i.status === 'open' && opnemen !== i.id && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={bezig} onClick={() => setOpnemen(i.id)}>
                    Opnemen in plan
                  </Button>
                  <Button size="sm" variant="outline" disabled={bezig} onClick={() => onVerwerpen(i.id)}>
                    Verwerp
                  </Button>
                  <Button size="sm" variant="outline" disabled={bezig} onClick={() => onVerwijderen(i.id)}>
                    Verwijder
                  </Button>
                </div>
              )}

              {opnemen === i.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <NativeSelect
                    size="sm"
                    aria-label="Prioriteitsgroep"
                    value={prioriteit}
                    disabled={bezig}
                    onChange={(e) => setPrioriteit(e.target.value)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <option value="">Kies een prioriteitsgroep…</option>
                    {PRIORITEITEN.map((p) => (
                      <option key={p} value={p}>
                        {p}. {PRIORITEIT_LABEL[p]}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    size="sm"
                    disabled={prioriteit === ''}
                    aria-disabled={bezig}
                    onClick={() => void bevestigOpnemen(i)}
                    className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  >
                    Bevestig
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setOpnemen(null)}>
                    Annuleer
                  </Button>
                </div>
              )}
              {opnemen === i.id && fout?.bij === i.id && (
                <p role="alert" className="mt-2 text-sm text-destructive" data-idee-fout>
                  {fout.tekst}
                </p>
              )}

              {i.status === 'opgenomen' && i.opgenomenAls && (
                <button
                  type="button"
                  onClick={() => onOpenActie(i.opgenomenAls as string)}
                  className={cn(
                    'mt-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                    focusRing
                  )}
                >
                  Open {i.opgenomenAls}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Altijd gerenderd, ook leeg: een live-regio die pas met zijn inhoud verschijnt, wordt
          niet betrouwbaar voorgelezen. De titel in de tekst houdt twee meldingen verschillend. */}
      <p aria-live="polite" className="sr-only" data-idee-melding>
        {melding}
      </p>
    </section>
  )
}
