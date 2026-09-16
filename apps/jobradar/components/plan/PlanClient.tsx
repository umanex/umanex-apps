'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs'
import { TooltipProvider } from '@umanex/ui/components/ui/tooltip'
import { Button } from '@umanex/ui/components/ui/button'
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
  PlanWeergave,
  Prioriteit,
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
   * De actie die als laatste van status wisselde, om de focus terug te zetten.
   *
   * Nodig omdat de groepen aparte lijsten zijn: een rij die van "Beschikbaar" naar "Nu bezig"
   * gaat, verdwijnt uit de ene `ol` en verschijnt in de andere. React ontkoppelt het element
   * dus, de focus valt terug op `document.body`, en wie met het toetsenbord werkt begint
   * opnieuw bovenaan een pagina van 22 rijen. De flow-harness ziet dit niet: die tabt een
   * stilstaande pagina.
   */
  const laatstGewijzigd = useRef<string | null>(null)

  const perKey = new Map(plan.acties.map((a) => [a.key, a]))
  const lijst = (keys: string[]): ActieWeergave[] =>
    keys.flatMap((k) => {
      const a = perKey.get(k)
      return a ? [a] : []
    })

  const haalDetail = useCallback(async (key: string) => {
    const res = await fetch(`/api/plan/acties/${key}`)
    const data = (await res.json().catch(() => null)) as { actie?: ActieDetail } | null
    if (res.ok && data?.actie) setDetail(data.actie)
  }, [])

  useEffect(() => {
    if (openActie) void haalDetail(openActie)
    else setDetail(null)
  }, [openActie, haalDetail, plan])

  /** Eén weg naar de server: stuur, lees, vervang het plan of toon de fout. */
  const verstuur = useCallback(
    async (
      url: string,
      init: RequestInit
    ): Promise<{ ok: boolean; data: Record<string, unknown> | null }> => {
      setBezig(true)
      setFout(null)
      try {
        const res = await fetch(url, {
          ...init,
          headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
        })
        const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
        if (!res.ok || !data?.ok) {
          setFout((data?.error as string) ?? `Mislukt (HTTP ${res.status})`)
          if (data?.conflict === 'focus') setConflict(data as unknown as FocusConflict)
          return { ok: false, data }
        }
        setConflict(null)
        if (data.plan) setPlan(data.plan as PlanWeergave)
        return { ok: true, data }
      } catch {
        setFout('Geen antwoord van de server.')
        return { ok: false, data: null }
      } finally {
        setBezig(false)
      }
    },
    []
  )

  const herlaad = useCallback(async () => {
    setFout(null)
    const res = await fetch('/api/plan')
    const data = (await res.json().catch(() => null)) as { plan?: PlanWeergave } | null
    if (data?.plan) setPlan(data.plan)
  }, [])

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

  const zetVolgendeStap = (key: string, tekst: string) =>
    void verstuur(`/api/plan/acties/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({
        volgendeStap: tekst.trim() === '' ? null : tekst,
        versie: versieVan(key),
      }),
    })

  const panelVerzoek = async (verzoek: PanelVerzoek) => {
    if (!openActie) return
    if (verzoek.soort === 'verwijder') {
      const { ok } = await verstuur(`/api/plan/acties/${openActie}`, { method: 'DELETE' })
      if (ok) setOpenActie(null)
      return
    }
    await verstuur(`/api/plan/acties/${openActie}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...verzoek.body, versie: versieVan(openActie) }),
    })
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
  const actiesVoorPanel = plan.acties.map((a) => ({ key: a.key, titel: a.titel, status: a.status }))

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/"
              className={cn(
                'inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Terug naar het dashboard
            </Link>
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
          <div className="flex items-center gap-4 pt-6">
            <Link
              href="/instellingen#bedrijfsplan"
              className={cn(
                'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Instellingen
            </Link>
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
          <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            {fout}
            <Button size="sm" variant="outline" onClick={herlaad}>
              Herlaad plan
            </Button>
          </p>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          {/* `h-auto flex-wrap`: vier tabs mét telpil meten samen 412 px min-content, en dat
              duwde op 400 px de hele pagina uit — gemeten met de flow-harness (`--smal=400`).
              De dashboard-TabsList heeft er drie en past wel; deze breekt af in plaats van de
              pagina te laten scrollen. */}
          <TabsList className="h-auto flex-wrap">
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

            <p className="text-sm">
              {volgendeActie ? (
                <>
                  <span className="text-muted-foreground">Eerstvolgende: </span>
                  <button
                    type="button"
                    onClick={() => setOpenActie(volgendeActie.key)}
                    className={cn(
                      'rounded-sm font-semibold underline-offset-2 hover:underline',
                      focusRing
                    )}
                  >
                    {volgendeActie.key} · {volgendeActie.titel}
                  </button>
                  {volgende?.reden === 'actief_zonder_stap' ? (
                    <span className="text-muted-foreground">
                      {' '}
                      — loopt, maar er staat geen volgende stap bij.
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {' '}
                      — {volgendeActie.volgendeStap ?? 'nog geen volgende stap'}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">
                  Geen eerstvolgende actie: alles is gereed, geblokkeerd of uitgesteld.
                </span>
              )}
            </p>

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
                  onBewaar={(t) =>
                    void verstuur('/api/plan', {
                      method: 'PUT',
                      body: JSON.stringify({ aannames: t }),
                    })
                  }
                  onHerstel={() =>
                    void verstuur('/api/plan', {
                      method: 'PUT',
                      body: JSON.stringify({ aannames: null }),
                    })
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
              onToevoegen={(titel) =>
                void verstuur('/api/plan/ideeen', {
                  method: 'POST',
                  body: JSON.stringify({ titel }),
                })
              }
              onOpnemen={(id, prioriteit: Prioriteit) =>
                void verstuur(`/api/plan/ideeen/${id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'opgenomen', prioriteit }),
                })
              }
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
        {openActie && detail && (
          <ActiePanel
            key={detail.key}
            actie={detail}
            alleActies={actiesVoorPanel}
            vandaag={vandaag}
            urenPerDag={plan.instellingen.urenPerDag}
            opAfronden={opAfronden}
            voorstel={voorstel}
            focusConflict={conflict}
            bezig={bezig}
            fout={fout}
            onOpenChange={(o) => {
              if (!o) {
                setOpenActie(null)
                setOpAfronden(false)
                setVoorstel(null)
                setConflict(null)
                setFout(null)
              }
            }}
            onVerzoek={panelVerzoek}
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
            onBewaar={(body) =>
              void verstuur(`/api/plan/beslissingen/${openBeslissing}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  ...body,
                  versie:
                    plan.beslissingen.find((b) => b.key === openBeslissing)?.versie ?? 1,
                }),
              })
            }
            onHerlaad={herlaad}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
