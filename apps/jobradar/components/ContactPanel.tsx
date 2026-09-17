'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@umanex/ui/components/ui/sheet'
import { Button } from '@umanex/ui/components/ui/button'
import { Label } from '@umanex/ui/components/ui/label'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { ContactTimeline } from './ContactTimeline'
import { KANALEN, type ContactMoment, type NextAction, type SubjectType } from '@/lib/db/schema'
import { MAX_NOTITIE } from '@/lib/contact'

type ContactPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: SubjectType
  /** `companies.id` als tekst voor een lead, het ondernemingsnummer voor een prospect. */
  subjectKey: string
  naam: string
  vandaag: string
  /** De lijst mag zijn eigen status bijwerken zodra een contactmoment die verzet. */
  onStatusChange?: (status: string) => void
  /**
   * De koppeling met het voorbereidingsplan, als slot.
   *
   * Een slot en geen import: dit paneel weet niets van het plan, en zou er anders van gaan
   * afhangen voor een sectie die er los naast staat.
   */
  planSectie?: ReactNode
  /**
   * Waar de focus heen gaat bij het sluiten als de knop die het paneel opende niet meer bestaat.
   *
   * Verplicht, want dat gebeurt gewoon: onder het filter Niet beoordeeld of Opgeslagen zet Vastleggen het bedrijf
   * op gecontacteerd, en de kaart met die knop verlaat de lijst. Het paneel kent de lijst niet, dus
   * de lijst levert het doel. Wordt pas bij het sluiten aangeroepen, zodat hij de lijst van dán ziet.
   */
  terugval: () => HTMLElement | null
}

const KANAAL_LABEL: Record<string, string> = {
  mail: 'Mail',
  linkedin: 'LinkedIn',
  telefoon: 'Telefoon',
  'in-persoon': 'In persoon',
}

/**
 * `aria-disabled` en niet `disabled` tijdens een verzoek: een knop die de focus heeft en disabled
 * wordt, geeft die focus af aan `body` — zelfde reden als in `StatusActies`.
 */
const WACHTEND = 'aria-disabled:pointer-events-none aria-disabled:opacity-50'

const FOUT = 'scroll-my-6 rounded-md border border-destructive p-2 text-sm text-destructive'

/** Welke handeling faalde: de melding staat bij de knop die hem veroorzaakte. */
type FoutBron = 'contact' | 'actie' | 'verwijder'

const aantal = (n: number) => `${n} contactmoment${n === 1 ? '' : 'en'}`

/**
 * De contacthistoriek en het formulier van één bedrijf, in een sheet van rechts.
 *
 * Waarom een sheet en geen modal of inline uitklappen: de kaartlijst is een grid van drie
 * kolommen. Inline uitklappen duwt de twee buren uit elkaar bij elke lange historiek, een
 * modal blokkeert de lijst. Een sheet laat hem staan.
 *
 * De opt-out-rem staat óók in de API (`app/api/opvolging/route.ts` geeft 409). Hier gaat het
 * om uitleg vóór de gebruiker typt; daar om de garantie dat het niet kán.
 */
export function ContactPanel({
  open,
  onOpenChange,
  type,
  subjectKey,
  naam,
  vandaag,
  onStatusChange,
  planSectie,
  terugval,
}: ContactPanelProps) {
  /** `null` zolang de historiek nooit geladen is — een lege lijst is een antwoord, dit niet. */
  const [momenten, setMomenten] = useState<ContactMoment[] | null>(null)
  const [actie, setActie] = useState<Pick<NextAction, 'datum' | 'omschrijving'> | null>(null)
  const [optOut, setOptOut] = useState(false)
  const [laden, setLaden] = useState(false)
  const [laadFout, setLaadFout] = useState<string | null>(null)
  /** Telt mislukte ladingen, zodat een tweede identieke fout opnieuw als alert verschijnt. */
  const [laadPoging, setLaadPoging] = useState(0)
  const [fout, setFout] = useState<{ bron: FoutBron; tekst: string } | null>(null)
  const [melding, setMelding] = useState('')
  const [bezig, setBezig] = useState(false)
  const [teVerwijderen, setTeVerwijderen] = useState<number | null>(null)
  const [sluitVraag, setSluitVraag] = useState(false)

  const [datum, setDatum] = useState(vandaag)
  const [kanaal, setKanaal] = useState<string>(KANALEN[0])
  /**
   * Het kanaal waartegen "onbewaard" vergelijkt: het laatst vastgelegde, anders Mail.
   *
   * Na Vastleggen zette het paneel het kanaal terug op Mail, zodat de sluitvraag niet vuurde op een
   * bewaard moment. Wie een tweede gesprek via LinkedIn of telefoon vastlegde, moest dan opnieuw
   * kiezen. Nu blijft het kanaal staan en schuift de vergelijking mee.
   */
  const [beginKanaal, setBeginKanaal] = useState<string>(KANALEN[0])
  const [notitie, setNotitie] = useState('')
  const [actieDatum, setActieDatum] = useState('')
  const [actieOms, setActieOms] = useState('')

  const inhoudRef = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const terugNaVraag = useRef<HTMLElement | null>(null)
  const terugRef = useRef<HTMLButtonElement>(null)
  const historiekKopRef = useRef<HTMLHeadingElement>(null)
  const opnieuwRef = useRef<HTMLButtonElement>(null)
  const foutRef = useRef<HTMLParagraphElement>(null)
  const laadFoutRef = useRef<HTMLParagraphElement>(null)

  // Zonder historiek weet het paneel niet of dit moment al vastligt, en niet welke actie er
  // staat: Bewaren met lege velden zou een bestaande actie weghalen die je nooit zag.
  const historiekOnbekend = momenten === null
  const contactGewijzigd = notitie.trim() !== '' || datum !== vandaag || kanaal !== beginKanaal
  const actieGewijzigd =
    actieDatum !== (actie?.datum ?? '') || actieOms !== (actie?.omschrijving ?? '')
  const onbewaard = contactGewijzigd || actieGewijzigd
  const nietBewaard = [contactGewijzigd && 'het contactmoment', actieGewijzigd && 'de volgende actie']
    .filter(Boolean)
    .join(' en ')

  /**
   * Laadt historiek, volgende actie en opt-out.
   *
   * Alleen bij de eerste lading krijgen de actievelden de serverstand. Een contactmoment of een
   * verwijdering raakt de volgende actie niet, en een herlading daarna overschreef een getypte,
   * nog onbewaarde actie stil.
   */
  const haal = useCallback(
    async (signal: AbortSignal | undefined, eersteLading: boolean): Promise<number | null> => {
      const mislukt = (reden: string) => {
        setLaadFout(reden)
        setLaadPoging((n) => n + 1)
        // De alert draagt de melding al; dezelfde tekst in de live-regio leest hem twee keer voor.
        if (eersteLading) setMelding('')
      }
      setLaden(true)
      if (eersteLading) setMelding('Historiek laden')
      try {
        const res = await fetch(
          `/api/opvolging?type=${type}&key=${encodeURIComponent(subjectKey)}`,
          { signal }
        )
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) {
          mislukt(data?.error ?? `HTTP ${res.status}`)
          return null
        }
        setLaadFout(null)
        setMomenten(data.momenten)
        setActie(data.actie)
        setOptOut(!!data.optOut)
        if (eersteLading) {
          setActieDatum(data.actie?.datum ?? '')
          setActieOms(data.actie?.omschrijving ?? '')
          setMelding(aantal(data.momenten.length))
        }
        return data.momenten.length
      } catch (e) {
        if ((e as Error).name !== 'AbortError') mislukt('geen antwoord van de server')
        return null
      } finally {
        setLaden(false)
      }
    },
    [type, subjectKey]
  )

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    // Een nieuwe opening toont "Laden…" en niet de historiek of de laadfout van de vorige.
    setMomenten(null)
    setLaadFout(null)
    void haal(ctrl.signal, true)
    return () => ctrl.abort()
  }, [open, haal])

  // Een melding verschijnt bij zijn knop, maar in een scrollend paneel kan die net onder de rand
  // vallen. Scrollen, geen focus verplaatsen: de alert wordt al voorgelezen, en de focus hoort op
  // de knop te blijven waarmee je het opnieuw probeert.
  useEffect(() => {
    if (fout) foutRef.current?.scrollIntoView({ block: 'nearest' })
  }, [fout])
  useEffect(() => {
    if (laadFout !== null) laadFoutRef.current?.scrollIntoView({ block: 'nearest' })
  }, [laadFout, laadPoging])

  useEffect(() => {
    if (sluitVraag) terugRef.current?.focus()
  }, [sluitVraag])

  /**
   * Eén plek voor Escape, een klik op de overlay én het sluitkruis: dat laatste roept
   * `onOpenChange(false)` rechtstreeks aan, dus `onEscapeKeyDown` alleen zou het missen.
   */
  const vraagOmTeSluiten = (volgende: boolean) => {
    if (volgende || !onbewaard) {
      onOpenChange(volgende)
      return
    }
    if (!sluitVraag) {
      const actief = document.activeElement
      terugNaVraag.current =
        actief instanceof HTMLElement && inhoudRef.current?.contains(actief) ? actief : null
    }
    setSluitVraag(true)
    terugRef.current?.focus()
  }

  const blijf = () => {
    // Vóór de vraag verdwijnt: een knop die onder de focus wegvalt, stuurt hem naar `body`.
    const doel = terugNaVraag.current?.isConnected ? terugNaVraag.current : inhoudRef.current
    doel?.focus()
    setSluitVraag(false)
  }

  const gooiWeg = () => {
    setSluitVraag(false)
    setNotitie('')
    setDatum(vandaag)
    setKanaal(beginKanaal)
    setActieDatum(actie?.datum ?? '')
    setActieOms(actie?.omschrijving ?? '')
    onOpenChange(false)
  }

  const probeerOpnieuw = async () => {
    if (laden) return
    const hadFocus = document.activeElement === opnieuwRef.current
    const eerste = momenten === null
    const n = await haal(undefined, eerste)
    if (n === null) return
    if (!eerste) setMelding(`Historiek bijgewerkt — ${aantal(n)}.`)
    // De knop verdwijnt nu de historiek er staat; zonder doel viel de focus op `body`.
    if (hadFocus) historiekKopRef.current?.focus()
  }

  const voegToe = async () => {
    if (bezig || historiekOnbekend) return
    const vastgelegdOp = datum
    const vastgelegdKanaal = kanaal
    setBezig(true)
    setFout(null)
    setMelding('')
    try {
      const res = await fetch('/api/opvolging', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, key: subjectKey, datum, kanaal, notitie }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setFout({
          bron: 'contact',
          tekst: data?.error ? `Niet vastgelegd: ${data.error}` : `Niet vastgelegd (HTTP ${res.status}).`,
        })
        return
      }
      // Leeg zodra het vastligt, anders vraagt het paneel bij sluiten om iets te bewaren dat al
      // bewaard is. Het kanaal blijft staan en wordt de nieuwe vergelijkingswaarde.
      setNotitie('')
      setDatum(vandaag)
      setBeginKanaal(vastgelegdKanaal)
      if (data.status) onStatusChange?.(data.status)
      const n = await haal(undefined, false)
      // Het aantal maakt elke melding verschillend: een tweede moment op dezelfde dag zou anders
      // dezelfde tekst geven, en die kondigt een live-regio niet opnieuw aan.
      setMelding(`Contactmoment van ${vastgelegdOp} vastgelegd${n === null ? '.' : ` — ${aantal(n)}.`}`)
    } catch {
      setFout({
        bron: 'contact',
        tekst: 'Niet vastgelegd — geen antwoord van de server. Wat je invulde staat er nog.',
      })
    } finally {
      setBezig(false)
    }
  }

  const verwijder = async (id: number) => {
    if (bezig) return
    setBezig(true)
    setFout(null)
    setMelding('')
    try {
      const res = await fetch(`/api/opvolging/moment/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setFout({
          bron: 'verwijder',
          tekst: d?.error ? `Niet verwijderd: ${d.error}` : `Niet verwijderd (HTTP ${res.status}).`,
        })
        return
      }
      // Het moment en zijn knoppen verdwijnen; stond de focus erop, dan viel hij op de dialoogcontainer
      // (flow-harness, 2026-09-17). De kop Historiek is het vaste punt ernaast, zoals na Opnieuw proberen.
      const actief = document.activeElement
      const focusVerdwijnt =
        actief instanceof HTMLElement &&
        actief.closest('li') !== null &&
        Boolean(historiekKopRef.current?.parentElement?.contains(actief))
      if (focusVerdwijnt) historiekKopRef.current?.focus()
      setTeVerwijderen(null)
      const n = await haal(undefined, false)
      setMelding(`Contactmoment verwijderd${n === null ? '.' : ` — ${aantal(n)}.`}`)
    } catch {
      setFout({ bron: 'verwijder', tekst: 'Niet verwijderd — geen antwoord van de server.' })
    } finally {
      setBezig(false)
    }
  }

  const bewaarActie = async () => {
    if (bezig || historiekOnbekend) return
    const leeg = !actieDatum && !actieOms
    const bestond = actie !== null
    setBezig(true)
    setFout(null)
    setMelding('')
    try {
      const res = leeg
        ? await fetch(
            `/api/opvolging/actie?type=${type}&key=${encodeURIComponent(subjectKey)}`,
            { method: 'DELETE' }
          )
        : await fetch('/api/opvolging/actie', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type, key: subjectKey, datum: actieDatum, omschrijving: actieOms }),
          })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        const wat = leeg ? 'Actie niet weggehaald' : 'Actie niet bewaard'
        setFout({
          bron: 'actie',
          tekst: data?.error ? `${wat}: ${data.error}` : `${wat} (HTTP ${res.status}).`,
        })
        return
      }
      // Wat de server opsloeg (getrimd), niet wat er getypt stond. Geen herlading: de historiek
      // veranderde niet, en een mislukte herlading zou hier een fout tonen over iets dat wél lukte.
      const opgeslagen: Pick<NextAction, 'datum' | 'omschrijving'> | null = leeg
        ? null
        : (data.actie ?? { datum: actieDatum, omschrijving: actieOms.trim() })
      setActie(opgeslagen)
      setActieDatum(opgeslagen?.datum ?? '')
      setActieOms(opgeslagen?.omschrijving ?? '')
      setMelding(
        opgeslagen
          ? `Volgende actie ${bestond ? 'bijgewerkt' : 'bewaard'} voor ${opgeslagen.datum}: ${opgeslagen.omschrijving}.`
          : bestond
            ? 'Volgende actie weggehaald.'
            : 'Er stond geen volgende actie.'
      )
    } catch {
      setFout({
        bron: 'actie',
        tekst: leeg
          ? 'Actie niet weggehaald — geen antwoord van de server.'
          : 'Actie niet bewaard — geen antwoord van de server.',
      })
    } finally {
      setBezig(false)
    }
  }

  const foutBij = (bron: FoutBron) =>
    fout?.bron === bron && (
      <p ref={foutRef} role="alert" className={FOUT} data-contact-fout={bron}>
        {fout.tekst}
      </p>
    )

  return (
    <Sheet open={open} onOpenChange={vraagOmTeSluiten}>
      <SheetContent
        ref={inhoudRef}
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md"
        // Het paneel opent via state, zonder `SheetTrigger`, en Radix geeft de focus bij het
        // sluiten alleen terug aan zo'n trigger — daarna viel hij op `body`. Deze handler loopt
        // vóór de focus het paneel in gaat, dus `activeElement` is hier nog de knop die opende.
        onOpenAutoFocus={() => {
          const actief = document.activeElement
          // `body` is geen opener: Safari focust een knop niet bij een muisklik, en "terug naar de
          // opener" werd daar dan "terug naar body".
          opener.current = actief instanceof HTMLElement && actief !== document.body ? actief : null
        }}
        onCloseAutoFocus={(e) => {
          // Alleen wanneer het paneel echt uit de DOM is: StrictMode ontkoppelt en herkoppelt in
          // dev één keer, en trok de focus dan uit een paneel dat gewoon openstaat.
          if ((e.target as Node | null)?.isConnected) return
          // Escape, overlay, sluitkruis en Weggooien komen allemaal hier: elk sluit via
          // `onOpenChange(false)`, waarna het paneel ontkoppelt. Zonder `preventDefault` focust Radix
          // de ontbrekende trigger, en valt de focus op `body`.
          const doel = opener.current?.isConnected ? opener.current : terugval()
          if (!doel?.isConnected) return
          e.preventDefault()
          doel.focus()
        }}
        onEscapeKeyDown={(e) => {
          // Escape annuleert eerst de vraag, niet meteen het paneel erachter.
          if (!sluitVraag) return
          e.preventDefault()
          blijf()
        }}
      >
        <SheetHeader>
          <SheetTitle>{naam}</SheetTitle>
          <SheetDescription>
            {type === 'lead' ? 'Lead uit de vacaturedata' : 'Prospect'} · contacthistoriek en
            volgende actie.
          </SheetDescription>
        </SheetHeader>

        {sluitVraag && (
          <div
            role="group"
            aria-labelledby="contact-sluitvraag"
            aria-describedby={nietBewaard ? 'contact-sluitvraag-wat' : undefined}
            className="space-y-2 rounded-md border border-warning p-3"
            data-sluit-vraag
          >
            <p id="contact-sluitvraag" className="text-sm font-medium">
              Onbewaarde wijzigingen weggooien?
            </p>
            {/* Leeg wanneer een lopend verzoek intussen slaagde: dan valt er niets meer weg te gooien. */}
            {nietBewaard && (
              <p id="contact-sluitvraag-wat" className="text-2xs text-muted-foreground">
                Nog niet bewaard: {nietBewaard}.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={gooiWeg}>
                Weggooien
              </Button>
              <Button ref={terugRef} size="sm" variant="outline" onClick={blijf}>
                Terug
              </Button>
            </div>
          </div>
        )}

        {/* Altijd gerenderd, ook leeg: een live-regio die pas met zijn inhoud verschijnt, wordt
            niet betrouwbaar voorgelezen. */}
        <p aria-live="polite" className="sr-only" data-contact-melding>
          {melding}
        </p>

        {optOut && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Dit bedrijf heeft zich afgemeld. Een contactmoment vastleggen kan niet — het
            formulier hieronder is daarom uitgeschakeld, en de server weigert het ook.
          </p>
        )}

        <section className="space-y-2">
          <h3
            ref={historiekKopRef}
            tabIndex={-1}
            className={cn('rounded-sm text-sm font-semibold', focusRing)}
          >
            Historiek
          </h3>
          {laadFout !== null && (
            <div className="space-y-2">
              {/* De knop staat buiten de alert: de alert herkoppelt per poging (zodat dezelfde
                  fout opnieuw voorgelezen wordt), de knop met de focus mag dat niet. */}
              <p key={laadPoging} ref={laadFoutRef} role="alert" className={FOUT} data-historiek-fout>
                {historiekOnbekend
                  ? `Historiek niet geladen: ${laadFout}.`
                  : `Historiek niet bijgewerkt: ${laadFout}. Wat hieronder staat, loopt mogelijk achter.`}
              </p>
              <Button
                ref={opnieuwRef}
                size="sm"
                variant="outline"
                aria-disabled={laden}
                onClick={probeerOpnieuw}
                className={WACHTEND}
              >
                Opnieuw proberen
              </Button>
            </div>
          )}
          {foutBij('verwijder')}
          {historiekOnbekend ? (
            // Geen lege tijdlijn bij een laadfout: "Nog geen contactmomenten" zou een bewering
            // zijn die niemand gecontroleerd heeft, en uitnodigen om het moment dubbel vast te leggen.
            laadFout === null && <p className="text-sm text-muted-foreground">Laden…</p>
          ) : (
            // Tijdens een herlading blijft de vorige historiek staan: "Laden…" haalde de knop weg
            // die net de focus had.
            <ContactTimeline
              momenten={momenten}
              teVerwijderen={teVerwijderen}
              onVerwijderVraag={setTeVerwijderen}
              onVerwijderBevestig={verwijder}
              bezig={bezig}
            />
          )}
        </section>

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Contactmoment toevoegen</h3>
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1">
              <Label htmlFor="contact-datum" className="text-2xs">
                Datum
              </Label>
              <input
                id="contact-datum"
                type="date"
                value={datum}
                max={vandaag}
                disabled={optOut}
                readOnly={bezig}
                onChange={(e) => setDatum(e.target.value)}
                // `focus-within` bovenop de gedeelde ring: een native date-input bestaat uit
                // dag/maand/jaar-segmenten, en Chromium matcht `:focus-visible` niet op de
                // host wanneer je een segment binnentabt. Gemeten 2026-09-09 door de
                // flow-harness: drie stops zonder zichtbare focus, alle drie date-velden,
                // terwijl de select en textarea ernaast hun ring wél toonden.
                className={cn(
                  'rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50 read-only:opacity-50',
                  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background',
                  focusRing
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact-kanaal" className="text-2xs">
                Kanaal
              </Label>
              {/* Een select kent geen readOnly; tijdens een verzoek negeert hij de wissel. */}
              <select
                id="contact-kanaal"
                value={kanaal}
                disabled={optOut}
                aria-disabled={bezig}
                onChange={(e) => {
                  if (!bezig) setKanaal(e.target.value)
                }}
                className={cn(
                  'cursor-pointer rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50 aria-disabled:opacity-50',
                  focusRing
                )}
              >
                {KANALEN.map((k) => (
                  <option key={k} value={k}>
                    {KANAAL_LABEL[k] ?? k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="contact-notitie" className="text-2xs">
              Notitie
            </Label>
            <textarea
              id="contact-notitie"
              value={notitie}
              rows={3}
              maxLength={MAX_NOTITIE}
              disabled={optOut}
              readOnly={bezig}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder="Wat kwam eruit?"
              className={cn(
                'w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50 read-only:opacity-50',
                focusRing
              )}
            />
          </div>
          <Button
            size="sm"
            onClick={voegToe}
            disabled={optOut || !datum}
            aria-disabled={bezig || historiekOnbekend}
            className={WACHTEND}
          >
            Vastleggen
          </Button>
          {foutBij('contact')}
        </section>

        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Volgende actie</h3>
          <p className="text-2xs text-muted-foreground">
            Eén per bedrijf. Leeg laten en bewaren haalt hem weg.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              aria-label="Datum van de volgende actie"
              value={actieDatum}
              readOnly={bezig || historiekOnbekend}
              onChange={(e) => setActieDatum(e.target.value)}
              className={cn(
                'rounded-md border bg-background px-2 py-1 text-sm text-foreground read-only:opacity-50',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background',
                focusRing
              )}
            />
            <input
              type="text"
              aria-label="Omschrijving van de volgende actie"
              value={actieOms}
              maxLength={200}
              readOnly={bezig || historiekOnbekend}
              onChange={(e) => setActieOms(e.target.value)}
              placeholder="Bellen, mail sturen…"
              className={cn(
                'min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm text-foreground read-only:opacity-50',
                focusRing
              )}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={bewaarActie}
            aria-disabled={bezig || historiekOnbekend}
            className={WACHTEND}
          >
            {actie ? 'Bijwerken' : 'Bewaren'}
          </Button>
          {foutBij('actie')}
        </section>

        {planSectie && (
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Voorbereidingsplan</h3>
            {planSectie}
          </section>
        )}
      </SheetContent>
    </Sheet>
  )
}
