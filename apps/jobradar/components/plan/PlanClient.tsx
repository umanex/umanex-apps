'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs'
import { TooltipProvider } from '@umanex/ui/components/ui/tooltip'
import { Button } from '@umanex/ui/components/ui/button'
import { Card, CardContent } from '@umanex/ui/components/ui/card'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { Aannames } from './Aannames'
import { ActieGroep } from './ActieGroep'
import { ActieLijst } from './ActieLijst'
import { ActiePanel, type PanelVerzoek } from './ActiePanel'
import { Beslismomenten } from './Beslismomenten'
import { BeslissingPanel } from './BeslissingPanel'
import { Ideeen } from './Ideeen'
import { PlanFilters, type PlanFilterStand } from './PlanFilters'
import { Startvoorwaarden } from './Startvoorwaarden'
import { VoortgangPerPrioriteit } from './VoortgangPerPrioriteit'
import { maandLabel } from '@/lib/plan/inzet'
import type {
  ActieDetail,
  ActieStatus,
  ActieWeergave,
  FocusConflict,
  PlanIdee,
  PlanWeergave,
  Prioriteit,
  Verzoekuitkomst,
} from '@/lib/plan/types'

type PlanClientProps = {
  plan: PlanWeergave
  vandaag: string
  /** Uit `?actie=A07`, zodat een link vanaf een bedrijfskaart meteen het juiste paneel opent. */
  initieleActie: string | null
}

/**
 * Statussen die niet zonder toelichting gezet kunnen worden.
 *
 * `gereed` vraagt bewijs; de andere drie vragen een reden. Alle vier openen ze het paneel in
 * plaats van meteen te versturen — de app vult nooit zelf een veld in dat van Jeroen is.
 */
const VRAAGT_TOELICHTING: ActieStatus[] = ['gereed', 'uitgesteld', 'wacht_op_input', 'vervallen']

const LEEG_FILTER: PlanFilterStand = {
  prioriteit: '',
  status: '',
  uitvoerbaarheid: '',
  eigenaar: '',
}

/**
 * Het bedrijfsplan.
 *
 * Elke mutatie geeft het hele plan terug en vervangt de state. Dat lijkt grof naast het
 * lokale patchen op het dashboard, maar hier is het de enige juiste vorm: blokkades
 * cascaderen. Eén actie op gereed zetten kan drie andere van geblokkeerd naar beschikbaar
 * duwen, de voortgang in twee groepen verzetten en een beslismoment op "klaar voor
 * beoordeling" brengen. Een rij-patch zou de rest stil verouderd laten.
 */
export function PlanClient({ plan: initieelPlan, vandaag, initieleActie }: PlanClientProps) {
  const [plan, setPlan] = useState(initieelPlan)
  const [tab, setTab] = useState('overzicht')
  const [openActie, setOpenActie] = useState<string | null>(initieleActie)
  const [openBeslissing, setOpenBeslissing] = useState<string | null>(null)
  const [detail, setDetail] = useState<ActieDetail | null>(null)
  const [opAfronden, setOpAfronden] = useState(false)
  /** De status die de gebruiker vanaf een rij koos en die in het paneel om een reden vraagt. */
  const [voorstel, setVoorstel] = useState<ActieStatus | null>(null)
  const [conflict, setConflict] = useState<FocusConflict | null>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [filters, setFilters] = useState<PlanFilterStand>(LEEG_FILTER)
  /**
   * Wat de laatste afronding vrijgaf, voor de actie waarvan het paneel open staat.
   *
   * Het antwoord van de server en geen eigen berekening: "vrij" is een afleiding over het hele
   * plan (`vrijgekomenActies`), en een tweede versie hier zou uiteenlopen zodra er een
   * blokkadevorm bijkomt.
   */
  const [vrijgekomen, setVrijgekomen] = useState<{ na: string; keys: string[] } | null>(null)
  /**
   * De actie die als laatste van status wisselde, om de focus terug te zetten.
   *
   * Nodig omdat de groepen aparte lijsten zijn: een rij die van "Beschikbaar" naar "Nu bezig"
   * gaat, verdwijnt uit de ene `ol` en verschijnt in de andere. React ontkoppelt het element
   * dus, de focus valt terug op `document.body`, en wie met het toetsenbord werkt begint
   * opnieuw bovenaan een pagina van 22 rijen. De flow-harness ziet dit niet: die tabt een
   * stilstaande pagina.
   */
  const laatstGewijzigd = useRef<string | null>(null)
  /** Wat de live-regio van de pagina voorleest. Binnen een open paneel heeft dat paneel zijn eigen. */
  const [melding, setMelding] = useState('')
  const bannerRef = useRef<HTMLParagraphElement>(null)
  const tabsLijstRef = useRef<HTMLDivElement>(null)
  /** Eén keer de banner in beeld brengen: na een actie die niet openging. */
  const bannerInBeeld = useRef(false)
  /** De melding van een actie die niet openging — die hoort niet in het paneel dat je daarna opent. */
  const openFout = useRef<string | null>(null)
  /**
   * Welke actie open staat en welk detail er getoond wordt, voor een antwoord dat pas binnenkomt
   * nadat je gesloten of gewisseld hebt. Een ref: `haalDetail` is stabiel en leest geen state.
   */
  const stand = useRef<{ open: string | null; getoond: string | null }>({
    open: initieleActie,
    getoond: null,
  })

  const perKey = new Map(plan.acties.map((a) => [a.key, a]))
  const lijst = (keys: string[]): ActieWeergave[] =>
    keys.flatMap((k) => {
      const a = perKey.get(k)
      return a ? [a] : []
    })

  /** Alles wat bij een open actiepaneel hoort, behalve de fout — die beslist de aanroeper. */
  const sluitActiePaneel = useCallback(() => {
    setOpenActie(null)
    setOpAfronden(false)
    setVoorstel(null)
    setConflict(null)
    setVrijgekomen(null)
  }, [])

  /**
   * Het detail van één actie ophalen.
   *
   * Een mislukking is niet meer stil. Eerst werd `detail` gewoon niet gezet: het paneel opende niet,
   * `openActie` bleef gevuld, en omdat de banner alleen rendert zonder open actie verscheen daarna
   * geen enkele fout van de pagina meer — na `/plan?actie=A99` of één netwerkfout.
   */
  const haalDetail = useCallback(async (key: string) => {
    let reden: string
    try {
      const res = await fetch(`/api/plan/acties/${key}`)
      const data = (await res.json().catch(() => null)) as
        | { actie?: ActieDetail; error?: string }
        | null
      if (res.ok && data?.actie) {
        setDetail(data.actie)
        return
      }
      reden = data?.error ?? `HTTP ${res.status}`
    } catch {
      reden = 'geen antwoord van de server'
    }
    const { open, getoond } = stand.current
    // Intussen gesloten of naar een andere actie gewisseld: deze fout hoort nergens meer bij.
    if (open !== key) return
    if (getoond === key) {
      // Het paneel staat al open en toont zijn melding zelf. Niet sluiten: onbewaarde invoer erin
      // zou verdwijnen omdat een verversing mislukte.
      setFout(`${key} niet ververst (${reden}) — wat je ziet kan verouderd zijn.`)
      return
    }
    const tekst = `${key} kon niet geopend worden: ${reden}.`
    sluitActiePaneel()
    bannerInBeeld.current = true
    openFout.current = tekst
    setFout(tekst)
  }, [sluitActiePaneel])

  useEffect(() => {
    stand.current = { open: openActie, getoond: detail?.key ?? null }
  }, [openActie, detail])

  useEffect(() => {
    if (openActie) void haalDetail(openActie)
    else setDetail(null)
  }, [openActie, haalDetail, plan])

  useEffect(() => {
    if ((openActie || openBeslissing) && fout !== null && fout === openFout.current) setFout(null)
  }, [openActie, openBeslissing, fout])

  // Wie een actie aanklikt die niet opengaat, krijgt het antwoord in beeld: de banner staat
  // bovenaan, de rij kan een scherm lager staan. Scrollen, geen focus verplaatsen — de banner
  // is een `alert` en wordt al voorgelezen.
  useEffect(() => {
    if (!fout || !bannerInBeeld.current) return
    bannerInBeeld.current = false
    bannerRef.current?.scrollIntoView({ block: 'nearest' })
  }, [fout])

  /**
   * Eén weg naar de server: stuur, lees, vervang het plan of toon de fout.
   *
   * `bijDeBron`: de bediening toont de fout zelf, naast zichzelf, en de banner bovenaan zwijgt.
   * Voor een actierij of het ideeënveld stond die banner een scherm hoger dan de knop.
   */
  const verstuur = useCallback(
    async (
      url: string,
      init: RequestInit,
      { bijDeBron = false }: { bijDeBron?: boolean } = {}
    ): Promise<Verzoekuitkomst & { data: Record<string, unknown> | null }> => {
      setBezig(true)
      setFout(null)
      try {
        const res = await fetch(url, {
          ...init,
          headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
        })
        const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
        if (!res.ok || !data?.ok) {
          const tekst = (data?.error as string) ?? `Mislukt (HTTP ${res.status})`
          if (!bijDeBron) setFout(tekst)
          if (data?.conflict === 'focus') setConflict(data as unknown as FocusConflict)
          return { ok: false, fout: tekst, data }
        }
        setConflict(null)
        if (data.plan) setPlan(data.plan as PlanWeergave)
        return { ok: true, fout: null, data }
      } catch {
        const tekst = 'Geen antwoord van de server.'
        if (!bijDeBron) setFout(tekst)
        return { ok: false, fout: tekst, data: null }
      } finally {
        setBezig(false)
      }
    },
    []
  )

  /**
   * Het plan opnieuw ophalen, zonder zelf een fout te tonen: de aanroeper beslist waar die staat.
   * Een actierij toont hem bij haar veld (`bijDeBron`), de panelen en de banner via `herlaad`.
   */
  const haalPlan = useCallback(async (): Promise<Verzoekuitkomst> => {
    try {
      const res = await fetch('/api/plan')
      const data = (await res.json().catch(() => null)) as
        | { plan?: PlanWeergave; error?: string }
        | null
      if (!res.ok || !data?.plan) {
        return { ok: false, fout: `Plan niet herladen: ${data?.error ?? `HTTP ${res.status}`}.` }
      }
      setPlan(data.plan)
      return { ok: true, fout: null }
    } catch {
      return { ok: false, fout: 'Plan niet herladen — geen antwoord van de server.' }
    }
  }, [])

  /**
   * Het plan opnieuw ophalen, na een versieconflict.
   *
   * De fout blijft staan tot het gelukt is. Eerst ging hij vóór het verzoek weg, zonder controle
   * op het antwoord en zonder `catch`: een mislukte herlading liet dan niets achter, en de knop
   * verdween onder de focus op het moment dat je hem indrukte.
   */
  const herlaad = useCallback(async () => {
    const { ok, fout: tekst } = await haalPlan()
    setFout(tekst)
    return ok
  }, [haalPlan])

  /**
   * Herladen vanuit de banner. De knop staat ín de melding en verdwijnt met hem; wie hem met het
   * toetsenbord indrukte, belandt op het actieve tabblad eronder in plaats van op `body`.
   */
  const herlaadVanuitBanner = async () => {
    const hadFocus = Boolean(bannerRef.current?.contains(document.activeElement))
    setMelding('')
    if (!(await herlaad())) return
    if (hadFocus) {
      tabsLijstRef.current?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.focus()
    }
    setMelding('Plan herladen.')
  }

  const versieVan = (key: string) => perKey.get(key)?.versie ?? 1

  /**
   * Status wijzigen vanaf een rij.
   *
   * Vier statussen gaan niet rechtstreeks over de lijn, omdat ze elk iets van Jeroen vragen
   * dat een dropdown niet kan opnemen: `gereed` vraagt bewijs, en `uitgesteld`,
   * `wacht_op_input` en `vervallen` vragen een reden. Die opent het paneel, met het veld
   * klaar.
   *
   * De eerste versie vulde die reden zelf in — "nog te bepalen", "niet meer aan de orde" —
   * zodat de statuswissel doorging. Dat is precies verkeerd: die tekst landt in een veld dat
   * Jeroen geschreven hoort te hebben, staat daarna als "Aanleiding: nog te bepalen" in de
   * lijst, en is niet te onderscheiden van een zin die hij écht typte. De laag eronder
   * weigert een lege reden juist met opzet; de rij omzeilde zijn eigen rem.
   */
  const wijzigStatus = async (key: string, status: ActieStatus) => {
    if (VRAAGT_TOELICHTING.includes(status)) {
      setOpAfronden(status === 'gereed')
      setVoorstel(status === 'gereed' ? null : status)
      setOpenActie(key)
      return
    }

    laatstGewijzigd.current = key
    const { ok, data } = await verstuur(`/api/plan/acties/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, versie: versieVan(key) }),
    })
    if (!ok && (data?.conflict === 'focus' || data?.conflict === 'afhankelijkheid')) {
      setOpenActie(key)
    }
  }

  /**
   * De volgende stap vanaf een rij. De fout staat bij het veld, niet in de banner — maar een
   * versieconflict los je niet op door opnieuw te bewaren: `versieVan` leest de versie uit dit
   * plan, en dat is het verouderde. Daarom zegt de uitkomst het erbij, en biedt de rij Herlaad plan.
   */
  const zetVolgendeStap = async (
    key: string,
    tekst: string
  ): Promise<Verzoekuitkomst & { versieConflict: boolean }> => {
    const { ok, fout: tekstFout, data } = await verstuur(
      `/api/plan/acties/${key}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          volgendeStap: tekst.trim() === '' ? null : tekst,
          versie: versieVan(key),
        }),
      },
      { bijDeBron: true }
    )
    return { ok, fout: tekstFout, versieConflict: data?.conflict === 'versie' }
  }

  const panelVerzoek = async (verzoek: PanelVerzoek) => {
    if (!openActie) return false
    if (verzoek.soort === 'verwijder') {
      const { ok } = await verstuur(`/api/plan/acties/${openActie}`, { method: 'DELETE' })
      if (ok) setOpenActie(null)
      return ok
    }
    const { ok, data } = await verstuur(`/api/plan/acties/${openActie}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...verzoek.body, versie: versieVan(openActie) }),
    })
    if (ok && verzoek.soort === 'status') {
      // Elke geslaagde statuswissel vervangt het vorige resultaat. Zonder de else-tak bleef
      // "A01 afgerond · nu beschikbaar" staan na Heropen, op een actie die niet meer gereed was
      // en met Start-knoppen voor acties die weer geblokkeerd waren (design-review 2026-09-17).
      setVrijgekomen(
        verzoek.body?.status === 'gereed'
          ? {
              na: openActie,
              keys: Array.isArray(data?.vrijgekomen) ? (data.vrijgekomen as string[]) : [],
            }
          : null
      )
    }
    return ok
  }

  /**
   * Starten vanuit het paneel van een net afgeronde actie.
   *
   * `opAfronden` gaat eerst uit: loopt de start op een conflict, dan wisselt het paneel naar de
   * gestarte actie, en met de vlag nog aan zou dat paneel de focus op zijn bewijsveld zetten —
   * alsof je die actie wilde afronden.
   */
  const startVanuitPaneel = (key: string) => {
    setOpAfronden(false)
    void wijzigStatus(key, 'bezig')
  }

  useEffect(() => {
    const key = laatstGewijzigd.current
    if (!key || openActie) return
    laatstGewijzigd.current = null
    const rij = document.querySelector<HTMLElement>(`[data-actie="${key}"] button`)
    rij?.focus()
  }, [plan, openActie])

  const zichtbaar = plan.acties.filter((a) => {
    if (filters.prioriteit && String(a.prioriteit) !== filters.prioriteit) return false
    if (filters.status && a.status !== filters.status) return false
    if (filters.uitvoerbaarheid && a.uitvoerbaarheid !== filters.uitvoerbaarheid) return false
    if (filters.eigenaar && a.eigenaar !== filters.eigenaar) return false
    return true
  })

  const eigenaars = [...new Set(plan.acties.map((a) => a.eigenaar))].sort()
  const volgende = plan.overzicht.volgendeActie
  const volgendeActie = volgende ? perKey.get(volgende.key) : null
  /**
   * Het detail zoals het paneel het toont: aangevuld met de actie uit het plan wanneer dat plan
   * nieuwer is. Een mutatie geeft meteen het hele plan terug, het detail volgt pas met een eigen
   * GET; tussen die twee toonde het paneel de oude status en velden. Wie dan Escape drukte na een
   * geslaagde afronding, kreeg "Onbewaarde wijzigingen weggooien?" over een bewijs dat al bewaard
   * was (gemeten met de UI-probe, detail 2,5 s vertraagd). `ActieDetail` is `ActieWeergave` plus
   * de geschiedenis, dus alleen die loopt nog even achter. Op `versie`: een detail dat nieuwer is
   * dan het plan (een wijziging elders, tussendoor) wint.
   */
  const actueleWeergave = detail ? perKey.get(detail.key) : undefined
  const paneelActie =
    detail && actueleWeergave && actueleWeergave.versie > detail.versie
      ? { ...detail, ...actueleWeergave }
      : detail
  const actiesVoorPanel = plan.acties.map((a) => ({
    key: a.key,
    titel: a.titel,
    status: a.status,
    uitvoerbaarheid: a.uitvoerbaarheid,
  }))

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">Bedrijfsplan 2027</h1>
            <p className="text-sm text-muted-foreground">
              Voorbereiding op de start in {maandLabel(plan.instellingen.lancering)} —{' '}
              <span className="tabular-nums">{plan.acties.length}</span> acties,{' '}
              <span className="tabular-nums">
                {plan.beslissingen.filter((b) => b.soort !== 'start').length}
              </span>{' '}
              beslismomenten en het startbesluit. Een werklijst, geen planning met deadlines.
            </p>
          </div>
          {/* Alleen nog de exports: "Instellingen" staat sinds 2026-09-19 in de balk. De sectie
              van het plan is daar via de pagina bereikbaar, niet meer via een eigen link met een
              hash. */}
          <div className="flex items-center gap-4 pt-6">
            <a
              href="/api/plan/export?formaat=md"
              className={cn(
                'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Exporteer (Markdown)
            </a>
            <a
              href="/api/plan/export?formaat=json"
              className={cn(
                'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              JSON
            </a>
          </div>
        </div>

        {fout && !openActie && !openBeslissing && (
          <p
            ref={bannerRef}
            role="alert"
            className="flex scroll-mt-6 flex-wrap items-center gap-2 text-sm text-destructive"
            data-plan-fout
          >
            {fout}
            <Button size="sm" variant="outline" onClick={() => void herlaadVanuitBanner()}>
              Herlaad plan
            </Button>
          </p>
        )}
        {/* Altijd gerenderd, ook leeg: een live-regio die pas met zijn inhoud verschijnt, wordt
            niet betrouwbaar voorgelezen. */}
        <p aria-live="polite" className="sr-only" data-plan-melding>
          {melding}
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          {/* `h-auto flex-wrap`: vier tabs mét telpil meten samen 412 px min-content, en dat
              duwde op 400 px de hele pagina uit — gemeten met de flow-harness (`--smal=400`).
              De dashboard-TabsList heeft er drie en past wel; deze breekt af in plaats van de
              pagina te laten scrollen. */}
          {/* `data-plan-tabs`: het actieve tabblad is het laatste anker voor de focus na het sluiten
              van het actiepaneel — het enige dat er in elke stand staat. */}
          <TabsList ref={tabsLijstRef} className="h-auto flex-wrap" data-plan-tabs>
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="acties">
              Acties
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {plan.acties.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="beslissingen">
              Beslissingen
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {plan.beslissingen.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="ideeen">
              Ideeën
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {plan.ideeen.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht" className="mt-4">
            <h2 className="sr-only">Overzicht</h2>

            {/* De kop van het overzicht, niet een regel erboven: dit is de vraag waarmee je het
                scherm opent. Als `text-sm`-zin woog hij even zwaar als elke rij eronder. */}
            <Card data-eerstvolgende>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                {volgendeActie ? (
                  <>
                    <div className="min-w-0 space-y-1">
                      {/* Eén kop, met "Eerstvolgende" erin — geen klein label erboven. Dat label
                          was een kicker, en die sluit de briefing van 2026-09-16 uit (r.83). */}
                      <h3 className="font-semibold">
                        <span className="font-normal text-muted-foreground">Eerstvolgende: </span>
                        <span className="tabular-nums text-muted-foreground">{volgendeActie.key}</span>{' '}
                        {volgendeActie.titel}
                      </h3>
                      {/* De volgende stap ís de instructie en staat in de voorgrond; de twee
                          uitlegzinnen zijn context en blijven muted. */}
                      <p
                        className={cn(
                          'text-sm',
                          volgende?.reden === 'actief' ? 'text-foreground' : 'text-muted-foreground'
                        )}
                        data-eerstvolgende-uitleg
                      >
                        {volgende?.reden === 'actief_zonder_stap'
                          ? 'Loopt, maar er staat geen volgende stap bij.'
                          : volgende?.reden === 'beschikbaar'
                            ? 'Niets loopt — dit is de eerste actie die je kunt starten.'
                            : volgendeActie.volgendeStap}
                      </p>
                    </div>
                    {/* De primaire knop van het scherm. Afronden… op de rijen is outline: die
                        opent alleen een paneel, en drie gevulde knoppen eronder wogen zwaarder
                        dan de kaart die zegt wat je nú doet. */}
                    {volgende?.reden === 'beschikbaar' ? (
                      <Button
                        aria-disabled={bezig}
                        aria-label={`Start ${volgendeActie.key}`}
                        onClick={() => {
                          if (!bezig) void wijzigStatus(volgendeActie.key, 'bezig')
                        }}
                        className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                      >
                        Start
                      </Button>
                    ) : (
                      <Button
                        aria-haspopup="dialog"
                        aria-label={`Open ${volgendeActie.key}`}
                        onClick={() => setOpenActie(volgendeActie.key)}
                      >
                        Open
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Geen eerstvolgende actie: alles is gereed, geblokkeerd of uitgesteld.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <ActieGroep
                  titel="Nu bezig"
                  telling={`${plan.overzicht.nuBezig.length} van ${plan.instellingen.focusLimiet}`}
                  acties={lijst(plan.overzicht.nuBezig)}
                  variant="bezig"
                  leeg="Niets bezig. Start een actie uit Beschikbaar."
                  vandaag={vandaag}
                  bezig={bezig}
                  onOpen={setOpenActie}
                  onStatus={wijzigStatus}
                  onVolgendeStap={zetVolgendeStap}
                  onHerlaad={haalPlan}
                />
                {plan.overzicht.nuBezig.length >= plan.instellingen.focusLimiet && (
                  <p className="text-2xs text-muted-foreground">
                    De focusregel is bereikt — een vierde vraagt parkeren of een uitzondering.
                  </p>
                )}

                <ActieGroep
                  titel="Beschikbaar"
                  telling={String(plan.overzicht.beschikbaar.length)}
                  acties={lijst(plan.overzicht.beschikbaar)}
                  variant="beschikbaar"
                  leeg={
                    plan.overzicht.geblokkeerd.length > 0
                      ? 'Niets beschikbaar — alles wat niet gereed is wacht op een andere actie.'
                      : 'Niets beschikbaar: alle acties zijn gestart, gereed of uitgesteld.'
                  }
                  vandaag={vandaag}
                  bezig={bezig}
                  onOpen={setOpenActie}
                  onStatus={wijzigStatus}
                />

                {/* Wacht op input hoort hier, tussen beschikbaar en geblokkeerd. Zonder deze
                    groep valt een actie in die status uit élke overzichtslijst — niet bezig,
                    niet beschikbaar, niet geblokkeerd, niet uitgesteld — en verdwijnt hij
                    stil uit het scherm dat zegt wat er te doen is. Gemeten in de eerste
                    opname: A09 was nergens te zien. */}
                <ActieGroep
                  titel="Wacht op input"
                  telling={String(plan.overzicht.wacht.length)}
                  acties={lijst(plan.overzicht.wacht)}
                  variant="uitgesteld"
                  leeg="Niets wacht op input van iemand anders."
                  vandaag={vandaag}
                  bezig={bezig}
                  onOpen={setOpenActie}
                  onStatus={wijzigStatus}
                />

                <ActieGroep
                  titel="Geblokkeerd"
                  telling={String(plan.overzicht.geblokkeerd.length)}
                  acties={lijst(plan.overzicht.geblokkeerd)}
                  variant="geblokkeerd"
                  inklapbaar
                  leeg="Niets geblokkeerd."
                  vandaag={vandaag}
                  bezig={bezig}
                  onOpen={setOpenActie}
                  onStatus={wijzigStatus}
                />

                <ActieGroep
                  titel="Bewust uitgesteld"
                  telling={String(plan.overzicht.uitgesteld.length)}
                  acties={lijst(plan.overzicht.uitgesteld)}
                  variant="uitgesteld"
                  leeg="Niets uitgesteld."
                  vandaag={vandaag}
                  bezig={bezig}
                  onOpen={setOpenActie}
                  onStatus={wijzigStatus}
                />
              </div>

              <div className="space-y-6">
                <VoortgangPerPrioriteit groepen={plan.overzicht.voortgang} />
                <Startvoorwaarden
                  voorwaarden={plan.overzicht.startvoorwaarden}
                  lancering={plan.instellingen.lancering}
                  onOpenActie={setOpenActie}
                  onOpenBeslissing={setOpenBeslissing}
                />
                {/* Zonder deze filter staat het startbesluit twee keer op één schermhoogte:
                    hierboven als handeling ("Leg vast") en hier als afgeleide stand ("Wacht
                    op acties"). Het hoort bij de startvoorwaarden, niet tussen de drie echte
                    beslismomenten. */}
                <Beslismomenten
                  beslissingen={plan.beslissingen.filter((b) => b.soort !== 'start')}
                  compact
                  onOpen={setOpenBeslissing}
                />
                <Aannames
                  tekst={plan.aannames.tekst}
                  isStandaard={plan.aannames.isStandaard}
                  bezig={bezig}
                  onBewaar={async (t) =>
                    (
                      await verstuur('/api/plan', {
                        method: 'PUT',
                        body: JSON.stringify({ aannames: t }),
                      })
                    ).ok
                  }
                  onHerstel={async () =>
                    (
                      await verstuur('/api/plan', {
                        method: 'PUT',
                        body: JSON.stringify({ aannames: null }),
                      })
                    ).ok
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="acties" className="mt-4 space-y-4">
            <h2 className="sr-only">Acties</h2>
            <PlanFilters
              waarde={filters}
              eigenaars={eigenaars}
              getoond={zichtbaar.length}
              totaal={plan.acties.length}
              onChange={setFilters}
            />
            <ActieLijst
              acties={zichtbaar}
              vandaag={vandaag}
              bezig={bezig}
              onOpen={setOpenActie}
              onStatus={wijzigStatus}
            />
          </TabsContent>

          <TabsContent value="beslissingen" className="mt-4">
            <h2 className="sr-only">Beslissingen</h2>
            <Beslismomenten beslissingen={plan.beslissingen} onOpen={setOpenBeslissing} />
          </TabsContent>

          <TabsContent value="ideeen" className="mt-4">
            <h2 className="sr-only">Ideeën</h2>
            <Ideeen
              ideeen={plan.ideeen}
              bezig={bezig}
              onToevoegen={async (titel) => {
                const { ok, fout: tekstFout } = await verstuur(
                  '/api/plan/ideeen',
                  { method: 'POST', body: JSON.stringify({ titel }) },
                  { bijDeBron: true }
                )
                return { ok, fout: tekstFout }
              }}
              onOpnemen={async (id, prioriteit: Prioriteit) => {
                const { ok, fout: tekstFout, data } = await verstuur(
                  `/api/plan/ideeen/${id}`,
                  {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'opgenomen', prioriteit }),
                  },
                  { bijDeBron: true }
                )
                const idee = data?.idee as PlanIdee | undefined
                return { ok, fout: tekstFout, opgenomenAls: idee?.opgenomenAls ?? null }
              }}
              onVerwerpen={(id) =>
                void verstuur(`/api/plan/ideeen/${id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'verworpen' }),
                })
              }
              onVerwijderen={(id) =>
                void verstuur(`/api/plan/ideeen/${id}`, { method: 'DELETE' })
              }
              onOpenActie={(key) => {
                setTab('acties')
                setOpenActie(key)
              }}
            />
          </TabsContent>
        </Tabs>

        {/* De sheets staan buiten Tabs: ze horen over de hele pagina, niet in het paneel
            dat ze opende — zelfde reden als bij ContactPanel op het dashboard. */}
        {/* `paneelActie.key === openActie`: bij een conflict vanuit het paneel wisselt `openActie` meteen
            naar de andere actie, maar het detail pas na zijn eigen fetch. Zonder deze voorwaarde
            stond het conflict van Y kort in het paneel van X — "start X met een uitzondering". */}
        {openActie && paneelActie && paneelActie.key === openActie && (
          <ActiePanel
            key={paneelActie.key}
            actie={paneelActie}
            alleActies={actiesVoorPanel}
            vandaag={vandaag}
            urenPerDag={plan.instellingen.urenPerDag}
            opAfronden={opAfronden}
            voorstel={voorstel}
            focusConflict={conflict}
            vrijgekomen={vrijgekomen?.na === paneelActie.key ? vrijgekomen.keys : null}
            bezig={bezig}
            fout={fout}
            onOpenChange={(o) => {
              if (!o) {
                sluitActiePaneel()
                setFout(null)
              }
            }}
            onVerzoek={panelVerzoek}
            onStart={startVanuitPaneel}
            onHerlaad={herlaad}
          />
        )}

        {openBeslissing && (
          <BeslissingPanel
            key={openBeslissing}
            beslissing={
              plan.beslissingen.find((b) => b.key === openBeslissing) as NonNullable<
                (typeof plan.beslissingen)[number]
              >
            }
            acties={actiesVoorPanel}
            vandaag={vandaag}
            bezig={bezig}
            fout={fout}
            onOpenChange={(o) => {
              if (!o) {
                setOpenBeslissing(null)
                setFout(null)
              }
            }}
            onBewaar={async (body) =>
              (
                await verstuur(`/api/plan/beslissingen/${openBeslissing}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    ...body,
                    versie:
                      plan.beslissingen.find((b) => b.key === openBeslissing)?.versie ?? 1,
                  }),
                })
              ).ok
            }
            onHerlaad={herlaad}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
