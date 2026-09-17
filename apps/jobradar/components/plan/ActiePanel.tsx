'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Trash2, X } from 'lucide-react'
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
import { NativeSelect } from '@umanex/ui/components/ui/native-select'
import { formatteerInzet } from '@/lib/plan/inzet'
import { PRIORITEIT_LABEL } from '@/lib/plan/seed-inhoud'
import {
  ACTIE_STATUSSEN,
  STATUS_KLEUR,
  STATUS_LABEL,
  STATUS_LABEL_INLINE,
  type ActieDetail,
  type ActieStatus,
  type FocusConflict,
  type PlanLink,
  type Prioriteit,
  type Uitvoerbaarheid,
} from '@/lib/plan/types'

export type PanelVerzoek = {
  soort: 'status' | 'velden' | 'afhankelijkheden' | 'verwijder'
  body?: Record<string, unknown>
}

type ActiePanelProps = {
  actie: ActieDetail
  /** Alle acties, om een afhankelijkheid uit te kiezen. */
  alleActies: { key: string; titel: string; status: string; uitvoerbaarheid: Uitvoerbaarheid }[]
  vandaag: string
  urenPerDag: number
  /** Opent het paneel direct op de afrond-sectie, met focus op het bewijsveld. */
  opAfronden: boolean
  /**
   * De status die vanaf een rij gekozen is en hier om een reden vraagt.
   *
   * De rij stuurt hem niet zelf: uitstellen, wachten en vervallen vragen elk een toelichting,
   * en die vul je niet in een dropdown in. Zonder dit veld zou de app de reden verzinnen om
   * de wissel te laten slagen — en dan staat er tekst in een veld van Jeroen die hij nooit
   * geschreven heeft.
   */
  voorstel: ActieStatus | null
  focusConflict: FocusConflict | null
  /**
   * De acties die de afronding van déze actie vrijgaf, uit het antwoord van de server.
   * `null` zolang er in dit paneel niets is afgerond; een lege lijst betekent "afgerond, er kwam
   * niets vrij".
   */
  vrijgekomen: string[] | null
  bezig: boolean
  fout: string | null
  onOpenChange: (open: boolean) => void
  /** Geeft terug of het verzoek slaagde: velden leegmaken en aankondigen gebeurt pas daarna. */
  onVerzoek: (verzoek: PanelVerzoek) => Promise<boolean>
  onHerlaad: () => Promise<boolean>
  onStart: (key: string) => void
}


/** Statussen die niet gezet worden zonder dat Jeroen erbij schrijft waarom. */
const VRAAGT_REDEN: ActieStatus[] = ['uitgesteld', 'wacht_op_input', 'vervallen']

const REDEN_VRAAG: Record<string, string> = {
  uitgesteld: 'Waarom stel je dit uit, en wanneer bekijk je het opnieuw?',
  wacht_op_input: 'Waarop wacht deze actie?',
  vervallen: 'Waarom vervalt deze actie?',
}
// Chromium matcht `:focus-visible` niet op de host wanneer je een datumsegment binnentabt;
// zonder de focus-within-kopie is zo'n veld een stop zonder zichtbare focus. Gemeten door de
// flow-harness op ContactPanel (2026-09-09), en hier om dezelfde reden.
const DATUM_RING =
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background'

/**
 * Eén actie in detail, in een sheet van rechts — zoals `ContactPanel`.
 *
 * Waarom een sheet: de lijst eronder blijft staan, zodat je ziet waar deze actie tussen de
 * andere hangt. Een modal zou dat wegnemen, en inline uitklappen duwt de lijst uit elkaar.
 *
 * De velden worden in één keer bewaard, de handelingen niet. Reden: status, afhankelijkheden
 * en afronden hebben elk hun eigen controles en kunnen elk een conflict opleveren waarop je
 * moet kiezen. Ze meenemen in een "bewaar alles" zou bij een geweigerde status de vraag
 * openlaten of de titel wél doorging.
 */
export function ActiePanel({
  actie,
  alleActies,
  vandaag,
  urenPerDag,
  opAfronden,
  voorstel,
  focusConflict,
  vrijgekomen,
  bezig,
  fout,
  onOpenChange,
  onVerzoek,
  onHerlaad,
  onStart,
}: ActiePanelProps) {
  const [titel, setTitel] = useState(actie.titel)
  const [beschrijving, setBeschrijving] = useState(actie.beschrijving ?? '')
  const [resultaat, setResultaat] = useState(actie.resultaat ?? '')
  const [volgendeStap, setVolgendeStap] = useState(actie.volgendeStap ?? '')
  const [gereedcriterium, setGereedcriterium] = useState(actie.gereedcriterium ?? '')
  const [inschatting, setInschatting] = useState(
    actie.inschattingUren === null ? '' : String(actie.inschattingUren)
  )
  const [resterend, setResterend] = useState(
    actie.resterendUren === null ? '' : String(actie.resterendUren)
  )
  const [eigenaar, setEigenaar] = useState(actie.eigenaar)
  const [streefdatum, setStreefdatum] = useState(actie.streefdatum ?? '')
  const [herbekijkOp, setHerbekijkOp] = useState(actie.herbekijkOp ?? '')
  const [links, setLinks] = useState<PlanLink[]>(actie.links)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const [bewijs, setBewijs] = useState('')
  const [bewijsLink, setBewijsLink] = useState('')
  const [heropenReden, setHeropenReden] = useState('')
  const [uitzonderingReden, setUitzonderingReden] = useState('')
  const [nieuweAfhankelijkheid, setNieuweAfhankelijkheid] = useState('')
  const [wachtreden, setWachtreden] = useState(actie.wachtreden ?? '')
  const [teVerwijderen, setTeVerwijderen] = useState(false)
  const [nieuweStatus, setNieuweStatus] = useState<ActieStatus | null>(voorstel)
  /** Wat de live-regio van het paneel voorleest na Bewaar, een statuswissel of Herlaad. */
  const [melding, setMelding] = useState('')
  const [vraagSluiten, setVraagSluiten] = useState(false)
  /** Na een mislukte herlading blijft de knop staan, ook al is de melding dan geen versieconflict meer. */
  const [herlaadGevraagd, setHerlaadGevraagd] = useState(false)

  /**
   * Het resultaat van een afronding in beeld brengen.
   *
   * Markeer gereed staat onderaan het paneel; na de wissel staat het bewijs — en het blok met
   * wat er vrijkwam — bovenaan. Het paneel bleef onderaan gescrold, dus het antwoord op "wat nu?"
   * verscheen buiten beeld (gemeten met de UI-probe, 2026-09-17). Pas wanneer de status in dit
   * paneel ook echt `gereed` is: het detail wordt apart opgehaald, en tot dan staat de kop
   * "Afgerond" nog niet bovenaan. Eén keer per afronding, niet bij elke rerender.
   *
   * Scrollen, geen focus verplaatsen. De eerste versie deed beide, en dan las een schermlezer het
   * blok twee keer voor: bij de focus, en via de live-regio hieronder. De focus bleef al binnen
   * het paneel zonder hulp (gemeten), en een programmatische focus op een niet-bedienbaar blok
   * is voor wie kijkt onzichtbaar.
   */
  const resultaatRef = useRef<HTMLDivElement>(null)
  const afgerondKopRef = useRef<HTMLHeadingElement>(null)
  const getoond = useRef<string[] | null>(null)
  /** Alleen zolang deze actie gereed is: na Heropen hoort het resultaat van toen hier niet meer. */
  const vrijNaAfronding = actie.status === 'gereed' ? vrijgekomen : null
  useEffect(() => {
    if (vrijNaAfronding === null || getoond.current === vrijNaAfronding) return
    getoond.current = vrijNaAfronding
    const doel = vrijNaAfronding.length > 0 ? resultaatRef.current : afgerondKopRef.current
    doel?.scrollIntoView({ block: 'nearest' })
  }, [vrijNaAfronding])

  // Zodra de wissel geland is, is het formulier klaar: de status ís nu wat je voorstelde.
  // Zonder dit blijft het invulblok open staan met de reden die je net bewaarde, alsof er
  // nog iets moet gebeuren.
  useEffect(() => {
    if (nieuweStatus && actie.status === nieuweStatus) setNieuweStatus(null)
  }, [actie.status, nieuweStatus])

  // Hetzelfde voor de velden die bij één handeling horen: is de handeling geland, dan is wat erin
  // stond verwerkt. Bleven ze gevuld, dan vroeg het paneel na elke afronding of heropening bij het
  // sluiten "Onbewaarde wijzigingen weggooien?" — over tekst die al in de geschiedenis staat. Op
  // de status en niet direct na het antwoord: het detail met de nieuwe status komt apart binnen.
  useEffect(() => {
    if (actie.status === 'gereed') {
      setBewijs('')
      setBewijsLink('')
    } else {
      setHeropenReden('')
    }
    if (actie.status === 'bezig') setUitzonderingReden('')
  }, [actie.status])

  /**
   * De velden onder Bewaar. Voor "is er iets onbewaard?" telt meer mee — zie `onbewaard`.
   *
   * Vergeleken zoals de server bewaart: tekst getrimd, uren afgerond op twee decimalen. Letterlijk
   * vergeleken bleef een tekst met een regeleinde achteraan na een geslaagde Bewaar "Niet
   * opgeslagen." — en vroeg het paneel bij het sluiten om bevestiging over iets dat al bewaard was.
   */
  const tekstAnders = (lokaal: string, bewaard: string | null) =>
    lokaal.trim() !== (bewaard ?? '').trim()
  const urenAnders = (lokaal: string, bewaard: number | null) =>
    lokaal.trim() === '' ? bewaard !== null : Math.round(Number(lokaal) * 100) / 100 !== bewaard
  const gewijzigd =
    tekstAnders(titel, actie.titel) ||
    tekstAnders(beschrijving, actie.beschrijving) ||
    tekstAnders(resultaat, actie.resultaat) ||
    tekstAnders(volgendeStap, actie.volgendeStap) ||
    tekstAnders(gereedcriterium, actie.gereedcriterium) ||
    urenAnders(inschatting, actie.inschattingUren) ||
    urenAnders(resterend, actie.resterendUren) ||
    tekstAnders(eigenaar, actie.eigenaar) ||
    streefdatum !== (actie.streefdatum ?? '') ||
    herbekijkOp !== (actie.herbekijkOp ?? '') ||
    JSON.stringify(links) !== JSON.stringify(actie.links)

  const kanUitzondering =
    focusConflict !== null ||
    (actie.uitvoerbaarheid === 'geblokkeerd' && !actie.blokkade.some((b) => b.hard))

  /**
   * Invoer die verloren gaat als het paneel sluit.
   *
   * Een eigen afleiding en niet `gewijzigd` uitgebreid: die stuurt Bewaar, en bewijs of een reden
   * horen niet in dat verzoek. Een handelingsveld telt alleen zolang zijn blok in beeld staat; na
   * een geslaagde handeling maakt het effect hierboven het leeg.
   */
  const onbewaard =
    gewijzigd ||
    linkLabel.trim() !== '' ||
    linkUrl.trim() !== '' ||
    (actie.status !== 'gereed' && (bewijs.trim() !== '' || bewijsLink.trim() !== '')) ||
    (actie.status === 'gereed' && heropenReden.trim() !== '') ||
    (kanUitzondering && uitzonderingReden.trim() !== '') ||
    (nieuweStatus !== null && tekstAnders(wachtreden, actie.wachtreden))

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

  // Een fout verschijnt bovenaan; Markeer gereed, Bewaar en Voeg toe staan tientallen velden lager
  // in een scrollend paneel. Zelfde vorm als het resultaat hierboven: scrollen, geen focus
  // verplaatsen — de melding is al een `alert`, een focus erop liet hem twee keer voorlezen.
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

  const bewaarVelden = async () => {
    // De knop is `aria-disabled`, niet `disabled`: Enter en Spatie komen er dus nog door.
    if (bezig || !gewijzigd) return
    setMelding('')
    const ok = await onVerzoek({
      soort: 'velden',
      body: {
        titel,
        beschrijving: beschrijving.trim() === '' ? null : beschrijving,
        resultaat: resultaat.trim() === '' ? null : resultaat,
        volgendeStap: volgendeStap.trim() === '' ? null : volgendeStap,
        gereedcriterium: gereedcriterium.trim() === '' ? null : gereedcriterium,
        inschattingUren: inschatting.trim() === '' ? null : inschatting,
        resterendUren: resterend.trim() === '' ? null : resterend,
        eigenaar,
        streefdatum: streefdatum === '' ? null : streefdatum,
        herbekijkOp: herbekijkOp === '' ? null : herbekijkOp,
        links,
      },
    })
    if (ok) setMelding(`${actie.key}: wijzigingen bewaard.`)
  }

  /**
   * Een statuswissel, met een aankondiging na een geslaagd antwoord. Behalve bij gereed: die
   * meldt de live-regio van de afronding al, met wat er vrijkwam.
   *
   * Heropenen noemt de nieuwe status ook. Vanaf gereed kan de select elke status kiezen — ook
   * vervallen of uitgesteld — en "heropend" alleen liet dan niet horen waar de actie nu staat.
   */
  const zetStatus = async (status: ActieStatus, extra: Record<string, unknown> = {}) => {
    const van = actie.status
    setMelding('')
    const ok = await onVerzoek({ soort: 'status', body: { status, ...extra } })
    if (ok && status !== 'gereed') {
      setMelding(
        van === 'gereed'
          ? `${actie.key} heropend, staat nu op ${STATUS_LABEL_INLINE[status]}.`
          : `${actie.key} staat nu op ${STATUS_LABEL_INLINE[status]}.`
      )
    }
    return ok
  }

  const herlaad = async () => {
    setHerlaadGevraagd(true)
    setMelding('')
    if (await onHerlaad()) setMelding('Plan herladen.')
  }

  const kandidaten = alleActies.filter(
    (a) =>
      a.key !== actie.key &&
      a.status !== 'vervallen' &&
      !actie.afhankelijkheden.includes(a.key)
  )

  const perKey = new Map(alleActies.map((a) => [a.key, a]))
  /**
   * Wie van deze actie afhangt en nog niet klaar is — het gevolg van vervallen, getoond vóór je
   * bevestigt. Een vervallen afhankelijkheid blokkeert hard: een niet-gestarte afhankelijke kan
   * niet meer starten, ook niet met een uitzondering, tot je de kant verwijdert of vervangt. Een
   * lopende loopt door, met een signaal.
   */
  const geraakt = actie.afhankelijken.flatMap((k) => {
    const a = perKey.get(k)
    return a && a.status !== 'gereed' && a.status !== 'vervallen' ? [a] : []
  })

  const versieConflict = fout !== null && /intussen elders gewijzigd/.test(fout)
  const dagen = (uren: string) => {
    const n = Number(uren.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? formatteerInzet(n, urenPerDag) : 'onbekend'
  }

  /**
   * Het afrond- of heropenblok.
   *
   * Als variabele en niet op één vaste plek, omdat de leesvolgorde met de status meebeweegt:
   * bij een lopende actie is dit de laatste stap en staat het onderaan; bij een afgeronde
   * actie is het bewijs juist het enige wat telt en staat het bovenaan.
   */
  const afrondBlok = (
          <section className="space-y-2 border-t pt-4">
            <h3 ref={afgerondKopRef} className="scroll-mt-6 text-sm font-semibold">
              {actie.status === 'gereed' ? 'Afgerond' : 'Afronden'}
            </h3>
            {actie.status === 'gereed' ? (
              <>
                <p className="rounded-md border border-border bg-muted p-3 text-sm">
                  {actie.bewijs}
                </p>
                <p className="text-2xs tabular-nums text-muted-foreground">
                  Afgerond op {actie.afgerondOp ?? 'onbekende datum'}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor="plan-heropen" className="text-2xs">
                      Reden om te heropenen
                    </Label>
                    <Input
                      size="sm"
                      id="plan-heropen"
                      type="text"
                      value={heropenReden}
                      maxLength={300}
                      disabled={bezig}
                      onChange={(e) => setHeropenReden(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  {/* `aria-disabled` en een guard, geen `disabled`: een knop die onder de focus
                      uitgeschakeld wordt, geeft die focus af aan `body`. */}
                  <Button
                    size="sm"
                    variant="outline"
                    aria-disabled={bezig}
                    onClick={() => {
                      if (bezig) return
                      void zetStatus('niet_gestart', { reden: heropenReden || null })
                    }}
                    className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  >
                    Heropen
                  </Button>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Het bewijs en de datum blijven staan; de heropening komt in de geschiedenis.
                </p>
              </>
            ) : (
              <>
                {actie.gereedcriterium ? (
                  <p className="rounded-md border border-border bg-muted p-3 text-sm">
                    {actie.gereedcriterium}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Geen gereedcriterium ingevuld — vul het hierboven in, anders is er niets om
                    tegen af te ronden.
                  </p>
                )}
                <div className="space-y-1">
                  <Label htmlFor="plan-bewijs" className="text-2xs">
                    Bewijs — wat toont dat het klaar is?
                  </Label>
                  <Textarea
                    size="sm"
                    id="plan-bewijs"
                    rows={3}
                    value={bewijs}
                    maxLength={4000}
                    disabled={bezig}
                    onChange={(e) => setBewijs(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Input
                  size="sm"
                  type="url"
                  aria-label="Link naar het bewijs (optioneel)"
                  value={bewijsLink}
                  disabled={bezig}
                  placeholder="https://… (optioneel)"
                  onChange={(e) => setBewijsLink(e.target.value)}
                  className="w-full"
                />
                <p className="text-2xs tabular-nums text-muted-foreground">
                  Wordt vastgelegd met datum {vandaag}.
                </p>
                <Button
                  size="sm"
                  disabled={bezig || bewijs.trim() === ''}
                  onClick={() => {
                    // De bewijslink gaat mee én in de lokale state. Zonder die tweede helft
                    // loopt het formulier uiteen met wat de server kreeg: `gewijzigd` wordt
                    // waar zonder dat er iets getypt is, het paneel meldt "Niet opgeslagen",
                    // en één klik op Bewaar stuurt de oude lijst terug en wist de bewijslink.
                    // De versiecheck vangt dat niet — binnen één tab leest hij de versie uit
                    // het zojuist vervangen plan, dus hij klopt per constructie.
                    const metBewijs = /^https?:\/\/\S+$/i.test(bewijsLink)
                      ? [...links, { label: 'Bewijs', url: bewijsLink.trim() }]
                      : null
                    if (metBewijs) setLinks(metBewijs)
                    zetStatus('gereed', { bewijs, ...(metBewijs ? { links: metBewijs } : {}) })
                  }}
                >
                  Markeer gereed
                </Button>
              </>
            )}
          </section>
  )

  return (
    <Sheet open onOpenChange={vraagOfSluit}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          const actief = document.activeElement
          opener.current = actief instanceof HTMLElement && actief !== document.body ? actief : null
          if (!opAfronden) return
          e.preventDefault()
          document.getElementById('plan-bewijs')?.focus()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          // Het paneel wordt ontkoppeld, niet alleen gesloten, en kan zijn opener meenemen: Afronden…
          // verdwijnt zodra de actie gereed is, "Open A07" in Ideeën met de tabwissel. Dan de rij van
          // deze actie, als die er staat. Maar een gereed-actie staat in geen enkele overzichtsgroep,
          // een verwijderde nergens, en een rij in de dichtgeklapte groep Geblokkeerd is niet
          // focusbaar — in alle drie viel de focus op `body`. Daarom een reeks, afgesloten door een
          // anker dat er altijd staat: het actieve tabblad. Pas als de focus er echt landt, stopt hij.
          const rij = document.querySelector<HTMLElement>(`[data-actie="${actie.key}"]`)
          const kandidaten = [
            opener.current,
            rij?.querySelector<HTMLElement>('button'),
            rij?.closest('[data-actiegroep]')?.querySelector<HTMLElement>('[aria-controls]'),
            document.querySelector<HTMLElement>('[data-plan-tabs] [role="tab"][data-state="active"]'),
          ]
          for (const doel of kandidaten) {
            if (!doel?.isConnected) continue
            doel.focus()
            if (document.activeElement === doel) return
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>
            <span className="tabular-nums text-muted-foreground">{actie.key}</span> {actie.titel}
          </SheetTitle>
          <SheetDescription>
            Prioriteit {actie.prioriteit} — {PRIORITEIT_LABEL[actie.prioriteit as Prioriteit]}
          </SheetDescription>
        </SheetHeader>

        {vraagSluiten && onbewaard && (
          <div
            role="group"
            aria-labelledby="plan-sluit-vraag"
            className="space-y-2 rounded-md border border-warning p-3"
            data-sluit-vraag
          >
            <p id="plan-sluit-vraag" className="text-sm font-medium">
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

        {actie.context && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {actie.context}
          </p>
        )}

        {/* Status */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Status</h3>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              size="sm"
              aria-label="Status wijzigen"
              value={nieuweStatus ?? actie.status}
              disabled={bezig}
              // Kiezen is nog niet versturen, voor geen enkele status. Met het toetsenbord verandert
              // de waarde van een dichte select zonder dat hij opengaat — pijltjes op Windows en
              // Linux, een letter op macOS — en elke stap onderweg was een PATCH die een actie kon
              // starten en geschiedenis schreef. Het bevestigblok eronder verstuurt.
              onChange={(e) => {
                const s = e.target.value as ActieStatus
                setNieuweStatus(s === actie.status ? null : s)
              }}
              className={cn('cursor-pointer font-medium', STATUS_KLEUR[(nieuweStatus ?? actie.status) as ActieStatus])}
            >
              {ACTIE_STATUSSEN.filter((s) => s !== 'gereed' || actie.status === 'gereed').map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Uitstellen, wachten en vervallen vragen elk een reden, en die vraagt de app —
              hij vult hem nooit zelf in. De laag eronder weigert een lege reden met opzet;
              dit is dezelfde regel, één scherm eerder, zodat je hem ziet in plaats van
              tegenkomt als foutmelding. De andere statussen krijgen hetzelfde blok zonder
              redenveld: alleen de knop verstuurt. */}
          {nieuweStatus && (
            <div
              className={cn(
                'space-y-2 rounded-md border p-3',
                VRAAGT_REDEN.includes(nieuweStatus) ? 'border-warning' : 'border-border'
              )}
              data-status-bevestig
            >
              {VRAAGT_REDEN.includes(nieuweStatus) && (
                <>
                  <Label htmlFor="plan-wachtreden" className="text-2xs">
                    {REDEN_VRAAG[nieuweStatus]}
                  </Label>
                  {/* Geen autoFocus: die trok de focus uit de select zodra je er met de pijltjes
                      langs een status met reden liep, en de volgende pijl ging naar dit veld. */}
                  <Input
                    size="sm"
                    id="plan-wachtreden"
                    type="text"
                    value={wachtreden}
                    maxLength={300}
                    disabled={bezig}
                    onChange={(e) => setWachtreden(e.target.value)}
                    className="w-full"
                  />
                </>
              )}
              {nieuweStatus === 'vervallen' && geraakt.length > 0 && (
                <div className="space-y-1 text-sm" data-vervallen-gevolg>
                  {/* Het gevolg per actie, niet één zin voor allemaal: een lopende actie blokkeert
                      niet, ze krijgt een signaal. De eerste versie zei "blokkeert ze hard" boven
                      een regel "loopt door" (design-review 2026-09-17). */}
                  <p className="text-muted-foreground">
                    Deze acties hangen van {actie.key} af:
                  </p>
                  <ul className="space-y-0.5">
                    {geraakt.map((a) => (
                      <li key={a.key}>
                        <span className="tabular-nums text-muted-foreground">{a.key}</span> {a.titel}
                        <span className="text-muted-foreground">
                          {' — '}
                          {a.status === 'bezig'
                            ? 'loopt door, met een signaal'
                            : 'kan daarna niet starten tot je de afhankelijkheid verwijdert of vervangt'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nieuweStatus === 'uitgesteld' && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="plan-herbekijk-nu" className="text-2xs">
                    Herbekijken op (optioneel)
                  </Label>
                  <Input
                    size="sm"
                    id="plan-herbekijk-nu"
                    type="date"
                    value={herbekijkOp}
                    disabled={bezig}
                    onChange={(e) => setHerbekijkOp(e.target.value)}
                    className={cn(DATUM_RING)}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {/* `aria-disabled` en een guard, geen `disabled`: dit is de knop die je net
                    activeerde, en een uitgeschakelde knop geeft zijn focus af aan `body`. */}
                <Button
                  size="sm"
                  aria-disabled={
                    bezig || (VRAAGT_REDEN.includes(nieuweStatus) && wachtreden.trim() === '')
                  }
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  onClick={async () => {
                    if (bezig || (VRAAGT_REDEN.includes(nieuweStatus) && wachtreden.trim() === '')) {
                      return
                    }
                    if (VRAAGT_REDEN.includes(nieuweStatus)) {
                      await zetStatus(nieuweStatus, {
                        wachtreden,
                        reden: wachtreden,
                        ...(nieuweStatus === 'uitgesteld' && herbekijkOp ? { herbekijkOp } : {}),
                      })
                      return
                    }
                    // Zonder reden is er niets om te bewaren: bij een weigering (een 409 op de
                    // focusregel) toont de select weer de echte status, naast het conflictblok.
                    if (!(await zetStatus(nieuweStatus))) setNieuweStatus(null)
                  }}
                >
                  Zet op {STATUS_LABEL[nieuweStatus].toLowerCase()}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNieuweStatus(null)}>
                  Annuleer
                </Button>
              </div>
            </div>
          )}

          {!nieuweStatus &&
            (actie.status === 'uitgesteld' || actie.status === 'wacht_op_input') &&
            actie.wachtreden && (
              <p className="text-sm text-muted-foreground">
                {actie.status === 'uitgesteld' ? 'Aanleiding: ' : 'Wacht op: '}
                {actie.wachtreden}
              </p>
            )}

          {actie.focusUitzondering && (
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Uitzondering op de focusregel: {actie.focusUitzondering}
            </p>
          )}
          {actie.startUitzondering && (
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Bewust eerder gestart: {actie.startUitzondering}
            </p>
          )}

          {focusConflict && (
            <div role="alert" className="space-y-2 rounded-md border border-warning p-3 text-sm">
              <p>
                Er zijn al {focusConflict.limiet} acties bezig. Parkeer er één, of start{' '}
                {actie.key} met een uitzondering.
              </p>
              <ul className="space-y-1">
                {focusConflict.actief.map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="tabular-nums text-muted-foreground">{a.key}</span> {a.titel}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bezig}
                      onClick={() => zetStatus('bezig', { parkeer: a.key })}
                    >
                      Parkeer
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="plan-focus-reden" className="text-2xs">
                    Reden voor de uitzondering
                  </Label>
                  <Input
                    size="sm"
                    id="plan-focus-reden"
                    type="text"
                    value={uitzonderingReden}
                    maxLength={300}
                    disabled={bezig}
                    onChange={(e) => setUitzonderingReden(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={bezig || uitzonderingReden.trim() === ''}
                  onClick={() => zetStatus('bezig', { focusUitzondering: uitzonderingReden })}
                >
                  Start met uitzondering
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* De aankondiging staat los van het zichtbare blok en is altijd gerenderd: een
            live-regio die pas verschijnt samen met zijn inhoud — of op `display: none` staat
            zolang hij leeg is — wordt door schermlezers niet betrouwbaar voorgelezen. `sr-only`
            is absoluut gepositioneerd en telt dus niet mee in de `gap` van het paneel. */}
        <p aria-live="polite" className="sr-only" data-vrijgekomen-melding>
          {vrijNaAfronding === null
            ? ''
            : vrijNaAfronding.length === 0
              ? `${actie.key} afgerond.`
              : `${actie.key} afgerond. Nu beschikbaar: ${vrijNaAfronding.join(', ')}.`}
        </p>
        {/* De andere handelingen — Bewaar, een statuswissel, Heropen, Herlaad — in een eigen regio.
            Niet in die hierboven: die zegt wat een afronding vrijgaf, en hoort na Heropen leeg te
            zijn (de UI-probe toetst dat). Zelfde regel: altijd gerenderd, ook leeg. */}
        <p aria-live="polite" className="sr-only" data-paneel-melding>
          {melding}
        </p>
        {vrijNaAfronding && vrijNaAfronding.length > 0 && (
          <div
            ref={resultaatRef}
            className="scroll-mt-6 space-y-2 rounded-md border border-success p-3"
            data-vrijgekomen
          >
            <p className="text-sm font-medium">
              {actie.key} afgerond · nu beschikbaar:
            </p>
            <ul className="space-y-2">
              {vrijNaAfronding.map((k) => {
                const a = perKey.get(k)
                return (
                  <li key={k} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="tabular-nums text-muted-foreground">{k}</span> {a?.titel}
                    </span>
                    {/* Op de uitvoerbaarheid, niet op de status: dezelfde vraag als de rij stelt
                        (`ActieRij`), anders bestaan er twee definities van "startbaar". */}
                    {a?.uitvoerbaarheid === 'beschikbaar' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={bezig}
                        aria-label={`Start ${k}`}
                        onClick={() => onStart(k)}
                      >
                        Start
                      </Button>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {a ? STATUS_LABEL[a.status as ActieStatus] : ''}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Bij een afgeronde actie staat het bewijs hier, meteen onder de status: dat is
            het enige wat op een afgeronde actie telt. Bij de rest staat het onderaan, waar
            je het pas nodig hebt. */}
        {actie.status === 'gereed' && afrondBlok}

        {/* Volgende stap en inhoud */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">
            {actie.status === 'gereed' ? 'Wat er gedaan is' : 'Wat je gaat doen'}
          </h3>
          {/* Een afgeronde of vervallen actie heeft geen eerste zet meer; ernaar vragen
              zet een leeg veld met "Wat is de eerste zet?" bovenaan het scherm van iets dat
              klaar is. */}
          {actie.status !== 'gereed' && actie.status !== 'vervallen' && (
            <div className="space-y-1">
              <Label htmlFor="plan-stap" className="text-2xs">
                Eerstvolgende concrete handeling
              </Label>
              <Input
                size="sm"
                id="plan-stap"
                type="text"
                value={volgendeStap}
                maxLength={300}
                disabled={bezig}
                onChange={(e) => setVolgendeStap(e.target.value)}
                placeholder="Wat is de eerste zet?"
                className="w-full"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="plan-titel" className="text-2xs">
              Titel
            </Label>
            <Input
              size="sm"
              id="plan-titel"
              type="text"
              value={titel}
              maxLength={120}
              disabled={bezig}
              onChange={(e) => setTitel(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-resultaat" className="text-2xs">
              Beoogd resultaat
            </Label>
            <Textarea
              size="sm"
              id="plan-resultaat"
              rows={2}
              value={resultaat}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setResultaat(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-beschrijving" className="text-2xs">
              Beschrijving
            </Label>
            <Textarea
              size="sm"
              id="plan-beschrijving"
              rows={3}
              value={beschrijving}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setBeschrijving(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-criterium" className="text-2xs">
              Gereedcriterium — waaraan zie je dat dit af is?
            </Label>
            <Textarea
              size="sm"
              id="plan-criterium"
              rows={2}
              value={gereedcriterium}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setGereedcriterium(e.target.value)}
              className="w-full"
            />
          </div>
        </section>

        {/* Inzet en planning */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Inzet en planning</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-inschatting" className="text-2xs">
                Inschatting (uren)
              </Label>
              <Input
                size="sm"
                id="plan-inschatting"
                type="number"
                min="0.5"
                step="0.5"
                value={inschatting}
                disabled={bezig}
                onChange={(e) => setInschatting(e.target.value)}
                className="w-24"
              />
            </div>
            <span className="pb-1 text-sm tabular-nums text-muted-foreground">
              {dagen(inschatting)}
            </span>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-resterend" className="text-2xs">
                Nog te gaan (uren)
              </Label>
              <Input
                size="sm"
                id="plan-resterend"
                type="number"
                min="0.5"
                step="0.5"
                value={resterend}
                disabled={bezig}
                onChange={(e) => setResterend(e.target.value)}
                className="w-24"
              />
            </div>
            <span className="pb-1 text-sm tabular-nums text-muted-foreground">
              {dagen(resterend)}
            </span>
          </div>
          <p className="text-2xs text-muted-foreground">
            Leeg is onbekend — beter dan een gok. Nul uren bestaat niet en wordt geweigerd.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-eigenaar" className="text-2xs">
                Eigenaar
              </Label>
              <Input
                size="sm"
                id="plan-eigenaar"
                type="text"
                value={eigenaar}
                maxLength={300}
                disabled={bezig}
                onChange={(e) => setEigenaar(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-streefdatum" className="text-2xs">
                Streefdatum (optioneel)
              </Label>
              <Input
                size="sm"
                id="plan-streefdatum"
                type="date"
                value={streefdatum}
                disabled={bezig}
                onChange={(e) => setStreefdatum(e.target.value)}
                className={cn(DATUM_RING)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-herbekijk" className="text-2xs">
                Herbekijken op (optioneel)
              </Label>
              <Input
                size="sm"
                id="plan-herbekijk"
                type="date"
                value={herbekijkOp}
                disabled={bezig}
                onChange={(e) => setHerbekijkOp(e.target.value)}
                className={cn(DATUM_RING)}
              />
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Links</h3>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-input p-2">
            {links.length === 0 && (
              <span className="px-1 text-sm text-muted-foreground">Nog geen links</span>
            )}
            {links.map((l) => (
              <span
                key={l.url}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm"
              >
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('flex items-center gap-1 rounded-sm hover:underline', focusRing)}
                >
                  {l.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  aria-label={`${l.label} verwijderen`}
                  disabled={bezig}
                  onClick={() => setLinks(links.filter((x) => x.url !== l.url))}
                  className={cn('rounded-sm text-muted-foreground hover:text-foreground', focusRing)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              size="sm"
              type="text"
              aria-label="Label van de link"
              value={linkLabel}
              maxLength={80}
              disabled={bezig}
              placeholder="Label"
              onChange={(e) => setLinkLabel(e.target.value)}
              className="w-32"
            />
            <Input
              size="sm"
              type="url"
              aria-label="Adres van de link"
              value={linkUrl}
              disabled={bezig}
              placeholder="https://…"
              onChange={(e) => setLinkUrl(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={bezig || !/^https?:\/\/\S+$/i.test(linkUrl)}
              onClick={() => {
                setLinks([...links, { label: linkLabel.trim() || linkUrl, url: linkUrl.trim() }])
                setLinkLabel('')
                setLinkUrl('')
              }}
            >
              Voeg toe
            </Button>
          </div>
        </section>

        <div className="flex items-center gap-3 border-t pt-4">
          {/* `aria-disabled`: na een geslaagde Bewaar is `gewijzigd` onwaar, en een `disabled`
              knop gaf op dat moment zijn focus af aan `body`. */}
          <Button
            size="sm"
            aria-disabled={bezig || !gewijzigd}
            onClick={() => void bewaarVelden()}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {bezig ? 'Bezig…' : 'Bewaar'}
          </Button>
          {gewijzigd && <span className="text-2xs text-muted-foreground">Niet opgeslagen.</span>}
        </div>

        {/* Afhankelijkheden */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Afhankelijkheden</h3>
          {actie.afhankelijkheden.length === 0 ? (
            <p className="text-sm text-muted-foreground">Deze actie wacht op niets.</p>
          ) : (
            <ul className="space-y-1">
              {actie.afhankelijkheden.map((key) => {
                const blok = actie.blokkade.find((b) => b.key === key)
                return (
                  <li key={key} className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="tabular-nums text-muted-foreground">{key}</span>{' '}
                      {alleActies.find((a) => a.key === key)?.titel}
                      {blok && (
                        <span
                          className={cn(
                            'block text-2xs',
                            blok.hard ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {blok.reden}
                        </span>
                      )}
                      {!blok && <span className="block text-2xs text-success">gereed</span>}
                    </span>
                    <button
                      type="button"
                      aria-label={`Afhankelijkheid ${key} verwijderen`}
                      disabled={bezig}
                      onClick={() =>
                        onVerzoek({
                          soort: 'afhankelijkheden',
                          body: {
                            afhankelijkheden: actie.afhankelijkheden.filter((k) => k !== key),
                          },
                        })
                      }
                      className={cn(
                        'shrink-0 rounded-sm text-muted-foreground hover:text-destructive',
                        focusRing
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <NativeSelect
              size="sm"
              aria-label="Afhankelijkheid toevoegen"
              value={nieuweAfhankelijkheid}
              disabled={bezig || kandidaten.length === 0}
              onChange={(e) => setNieuweAfhankelijkheid(e.target.value)}
              className="min-w-0 flex-1 cursor-pointer"
            >
              <option value="">Kies een actie…</option>
              {kandidaten.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.key} — {a.titel}
                </option>
              ))}
            </NativeSelect>
            <Button
              size="sm"
              variant="outline"
              disabled={bezig || nieuweAfhankelijkheid === ''}
              onClick={() => {
                onVerzoek({
                  soort: 'afhankelijkheden',
                  body: {
                    afhankelijkheden: [...actie.afhankelijkheden, nieuweAfhankelijkheid],
                  },
                })
                setNieuweAfhankelijkheid('')
              }}
            >
              Voeg toe
            </Button>
          </div>
          {actie.uitvoerbaarheid === 'geblokkeerd' && !actie.blokkade.some((b) => b.hard) && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="plan-start-reden" className="text-2xs">
                  Toch starten — waarom?
                </Label>
                <Input
                  size="sm"
                  id="plan-start-reden"
                  type="text"
                  value={uitzonderingReden}
                  maxLength={300}
                  disabled={bezig}
                  onChange={(e) => setUitzonderingReden(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={bezig || uitzonderingReden.trim() === ''}
                onClick={() => zetStatus('bezig', { startUitzondering: uitzonderingReden })}
              >
                Start toch
              </Button>
            </div>
          )}
          {actie.blokkade.some((b) => b.hard) && (
            <p className="text-2xs text-muted-foreground">
              Een vervallen afhankelijkheid telt niet als afgerond. Verwijder hem hierboven, of
              vervang hem door de actie die er nu voor in de plaats komt.
            </p>
          )}
        </section>

        {/* Gekoppelde bedrijven */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Gekoppelde bedrijven</h3>
          {actie.koppelingen.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen bedrijven. Koppelen doe je vanaf de kaart in het dashboard, bij Opvolging.
            </p>
          ) : (
            <ul className="space-y-1">
              {actie.koppelingen.map((k) => (
                <li
                  key={`${k.subjectType}:${k.subjectKey}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 truncate">{k.naam ?? k.subjectKey}</span>
                    <Badge size="sm" variant="secondary" className="shrink-0">
                      {k.subjectType === 'lead' ? 'lead' : 'prospect'}
                    </Badge>
                  </span>
                  <Link
                    href={`/?tab=${k.subjectType === 'lead' ? 'leads' : 'prospects'}&zoek=${encodeURIComponent(k.naam ?? k.subjectKey)}`}
                    className={cn(
                      'shrink-0 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                      focusRing
                    )}
                  >
                    Open in dashboard
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bij alles behalve gereed staat dit onderaan: het is de laatste stap, niet de
            eerste. Voor een afgeronde actie staat hetzelfde blok bovenaan. */}
        {actie.status !== 'gereed' && afrondBlok}

        {/* Geschiedenis */}
        <details className="border-t pt-4">
          <summary className={cn('cursor-pointer rounded-sm', focusRing)}>
            <h3 className="inline text-sm font-semibold">
              Geschiedenis ({actie.geschiedenis.length})
            </h3>
          </summary>
          {actie.geschiedenis.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Nog niets gewijzigd aan status, afhankelijkheden, gereedcriterium of bewijs.
            </p>
          ) : (
            <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
              {actie.geschiedenis.map((h) => (
                <li key={h.id}>
                  <span className="tabular-nums">{h.createdAt.slice(0, 10)}</span> · {h.veld}
                  {h.oud !== null && h.nieuw !== null && `: ${h.oud} → ${h.nieuw}`}
                  {h.reden && ` — ${h.reden}`}
                </li>
              ))}
            </ol>
          )}
        </details>

        {actie.bron !== 'seed' && (
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Verwijderen</h3>
            {teVerwijderen ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Zeker? Dit kan niet ongedaan gemaakt worden.</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bezig}
                  onClick={() => onVerzoek({ soort: 'verwijder' })}
                >
                  Verwijder
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTeVerwijderen(false)}>
                  Annuleer
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setTeVerwijderen(true)}>
                Verwijder deze actie
              </Button>
            )}
          </section>
        )}
      </SheetContent>
    </Sheet>
  )
}
