'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs'
import { TooltipProvider } from '@umanex/ui/components/ui/tooltip'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { FilterBar } from './FilterBar'
import { SyncButton } from './SyncButton'
import { CoverageBar } from './CoverageBar'
import { JobCard } from './JobCard'
import { LeadCard } from './LeadCard'
import { ProspectCard, type Prospect } from './ProspectCard'
import { HerkomstFilter } from './HerkomstFilter'
import { ProspectMap } from './ProspectMap'
import { ContactPanel } from './ContactPanel'
import { PlanKoppeling } from './plan/PlanKoppeling'
import { Button } from '@umanex/ui/components/ui/button'
import { Checkbox } from '@umanex/ui/components/ui/checkbox'
import { NativeSelect } from '@umanex/ui/components/ui/native-select'
import { Label } from '@umanex/ui/components/ui/label'
import type { SpiegelStaat, KboVermoeden } from '@/lib/kbo/spiegel'
import {
  filterQuery,
  VEROUDERD_NA_DAGEN,
  type Herkomst,
  type Sortering,
  type UiFilter,
} from '@/lib/kbo/universum'
import type { Job, Company, ItemStatus, SubjectType } from '@/lib/db/schema'
import { normaliseerBedrijf } from '@/lib/matching'
import type { RegionCode } from '@/lib/regions'
import type { Dekking } from '@/lib/coverage'
import { isNieuw, LAGE_SCORE_GRENS, leesStand, pastBijFilters, pastBijStatus, schrijfStand, splitsOpScore, type StatusFilter, type Tab, type TriageStand } from '@/lib/triage'
import { LageScoreLijst } from './LageScoreLijst'

type DashboardClientProps = {
  jobs: Job[]
  companies: Company[]
  previousSyncAt: string
  dekking: Dekking
  /** Bedrijfsnaam → wat KBO er vermoedelijk over zegt. Leeg zonder spiegel. */
  vermoedens: Record<string, KboVermoeden>
  /**
   * `lead:12` of `prospect:0747501103` → de voorbereidingsacties waaraan dat bedrijf hangt.
   *
   * Server-side geladen en als prop doorgegeven, niet in state: na een koppeling doet het
   * paneel `router.refresh()` en komt deze map vanzelf bijgewerkt terug. Een kopie in state
   * zou daarna de oude waarde tonen.
   */
  koppelingen: Record<string, string[]>
  /**
   * De filterstand uit de querystring. Sinds 2026-09-17 alle filters, niet alleen tab en zoek:
   * een stand die bij herladen verdween, stelde je elke ochtend opnieuw in.
   */
  initialStand: TriageStand
  /** De KBO-spiegel bestaat maar ging niet open: dan zijn `vermoedens` leeg om die reden. */
  spiegelFout: boolean
}

export function DashboardClient({
  jobs: initialJobs,
  companies: initialCompanies,
  previousSyncAt,
  dekking,
  vermoedens,
  koppelingen,
  initialStand,
  spiegelFout,
}: DashboardClientProps) {
  /**
   * De lijsten komen uit de props, niet uit een kopie in state.
   *
   * Na Sync nu doet SyncButton `router.refresh()`, en Next hergebruikt deze instantie (de sleutel
   * van het page-segment draagt geen query, `layout-router.js` in 15.5.25). Een kopie in `useState`
   * hield dan de oude lijst vast terwijl de dekkingsbalk erboven al ververste — nieuwe vacatures
   * verschenen pas na herladen (fase 3, 2026-09-17). Lokaal staat alleen wat deze sessie aan
   * statussen wijzigde; dat is ook wat de server na een refresh teruggeeft.
   */
  const [jobStatus, setJobStatus] = useState<Record<number, ItemStatus>>({})
  const [leadStatus, setLeadStatus] = useState<Record<number, ItemStatus>>({})
  const jobs = useMemo(
    () =>
      initialJobs.map((j) => {
        const gewijzigd = jobStatus[j.id]
        return gewijzigd ? { ...j, jobStatus: gewijzigd } : j
      }),
    [initialJobs, jobStatus]
  )
  const companies = useMemo(
    () =>
      initialCompanies.map((c) => {
        const gewijzigd = leadStatus[c.id]
        return gewijzigd ? { ...c, leadStatus: gewijzigd } : c
      }),
    [initialCompanies, leadStatus]
  )
  /**
   * De beginstand, uit de router — niet uit de adresbalk en niet alleen uit de prop.
   *
   * De prop draagt de URL van de server-render; na Back hergebruikt Next die gecachete render met een
   * oude stand. De adresbalk (`window.location`) was de eerste fix, maar loopt bij een voorwaartse
   * navigatie achter: Next zet de URL pas in de commit, dus "Open in dashboard" vanuit /plan las nog
   * `/plan` en landde op Vacatures zonder zoekterm (gemeten in de browser, 2026-09-17 — een regressie
   * uit #518). `useSearchParams` leest de router zelf: juist bij laden, bij een voorwaartse navigatie
   * en bij Back, en dankzij `replaceState(null, …)` hieronder ook na filteren. Deze pagina is
   * `force-dynamic`, dus de hook eist geen Suspense-grens: hij valt alleen terug bij prerenderen
   * (gelezen in `next/dist/client/components/bailout-to-client-rendering.js`).
   */
  const zoekParams = useSearchParams()
  const [begin] = useState<TriageStand>(() => (zoekParams ? leesStand(zoekParams) : initialStand))
  const [regions, setRegions] = useState<RegionCode[]>(begin.regios)
  const router = useRouter()
  const [minScore, setMinScore] = useState(begin.minScore)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(begin.status)
  const [zoek, setZoek] = useState(begin.zoek)
  // Controlled, want de doorklik vanaf een lead moet het tabblad kunnen zetten.
  const [tab, setTab] = useState<Tab>(begin.tab)
  // Onthouden of de huidige zoekterm van een doorklik komt: dan verdient een lege lijst
  // een andere uitleg dan een gewone mistreffer. Staat in de URL als `via=bedrijf`.
  const [viaLead, setViaLead] = useState(begin.via === 'bedrijf')
  // Alleen wat bij de laatste sync binnenkwam — de badge "nieuw", niet de status "niet beoordeeld".
  const [alleenNieuw, setAlleenNieuw] = useState(begin.nieuw)
  // Wat de laatste statuswissel met de lijst deed, voor wie niet ziet dat een kaart verdween.
  const [statusMelding, setStatusMelding] = useState('')

  // ── Prospects ──────────────────────────────────────────────────────────────
  // Eigen staat, want deze lijst komt niet van de server-render mee: 14.613 rijen gaan niet
  // als prop naar de client. Het tabblad haalt zijn eigen pagina op zodra het actief wordt.
  const [prospects, setProspects] = useState<Prospect[]>([])
  // Null tot de eerste respons: een "0" op het tabblad vóór het laden was een onware telling.
  const [prospectTotaal, setProspectTotaal] = useState<number | null>(null)
  const [prospectPaginas, setProspectPaginas] = useState(1)
  const [prospectPagina, setProspectPagina] = useState(1)
  const [prospectBezig, setProspectBezig] = useState(false)
  const [prospectFout, setProspectFout] = useState<string | null>(null)
  /**
   * De laatste lading mislukte — los van de fouttekst, die bij elke nieuwe poging leeg gaat.
   *
   * Zo blijft de alert gemount en wordt hij na een tweede mislukking opnieuw gevuld, dus opnieuw
   * voorgelezen: dezelfde tekst in een regio die niet leeg ging, zegt niets. En zolang dit waar
   * is, toont de teller geen "Bezig…" meer: prospectTotaal bleef na een mislukte eerste lading
   * null, en de teller zei dan voor altijd "Bezig…" naast de fout.
   */
  const [prospectMislukt, setProspectMislukt] = useState(false)
  // Opnieuw proberen: een teller in de deps van het laad-effect, zodat dezelfde filterstand opnieuw
  // opgehaald wordt.
  const [prospectPoging, setProspectPoging] = useState(0)
  // De knop Opnieuw proberen verdwijnt na een geslaagde lading. Stond de focus erop, dan gaat hij
  // naar de kop van het paneel in plaats van naar body.
  const focusNaPoging = useRef(false)
  const prospectsKopRef = useRef<HTMLHeadingElement>(null)
  const [spiegel, setSpiegel] = useState<SpiegelStaat | null>(null)
  // Standaard aan: zonder deze zeef heeft vier vijfde van de lijst geen personeel.
  const [alleenWerkgevers, setAlleenWerkgevers] = useState(true)
  const [herkomst, setHerkomst] = useState<Herkomst>('beide')
  // Standaard UIT. De zeef verbergt op het geleverde bestand 44 van de 218 CSV-rijen, en
  // een lijst die bij het openen stil een vijfde van zichzelf wegneemt is precies de
  // afkapping-zonder-melding die deze app elders vermijdt.
  const [alleenWinstgevend, setAlleenWinstgevend] = useState(false)
  const [sortering, setSortering] = useState<Sortering>('oprichting')
  // Kaart of lijst — dezelfde selectie, een andere weergave. Geen apart tabblad: dan zou het
  // filter erboven er niet voor gelden.
  const [weergave, setWeergave] = useState<'lijst' | 'kaart'>('lijst')
  // Welk bedrijf staat open in het opvolgingspaneel. Null = dicht.
  //
  // Draagt sinds het bedrijfsplan ook het sóórt bedrijf. De opvolging-API kende `lead` al
  // volledig; alleen de kaartlijst gaf hem nooit door, waardoor de historiek van een lead
  // onbereikbaar was vanaf het scherm dat hem toont.
  const [opvolging, setOpvolging] = useState<{
    type: SubjectType
    key: string
    naam: string
  } | null>(null)
  /**
   * Waar het opvolgingspaneel vandaan kwam: het bedrijf en de volgorde van de lijst op dat moment.
   *
   * Een ref en geen state: alleen `naSluitenOpvolging` leest hem, bij het sluiten, en dan moet het de
   * waarde van dán zijn en niet die van de laatste render van het paneel.
   */
  const opvolgingHerkomst = useRef<{ type: SubjectType; key: string; volgorde: string[]; melding: string } | null>(null)
  const leadsPaneelRef = useRef<HTMLDivElement>(null)
  const prospectsPaneelRef = useRef<HTMLDivElement>(null)
  // CSV-rijen zonder KBO-tegenhanger. Ze kunnen niet in de lijst staan; ze worden gemeld.
  const [zonderKbo, setZonderKbo] = useState(0)
  // Ongefilterd rijaantal in csv_prospects: onderscheidt "nog niets geïmporteerd" van
  // "wel geïmporteerd, maar je filters laten niets over". Null zolang er niets opgehaald is.
  const [csvTotaal, setCsvTotaal] = useState<number | null>(null)
  const vandaag = new Date().toISOString().slice(0, 10)

  // De ondernemingsnummers die al als lead bestaan. Hiermee kan een prospectkaart tonen dat
  // er vacatures van dat bedrijf binnenkwamen — de brug tussen de twee tabbladen, gelegd op
  // het nummer in plaats van op een naam die op twee plekken anders geschreven staat.
  const leadNummers = new Set(Object.values(vermoedens).map((v) => v.nummer))

  // Gewone substring, geen regex — een zoekterm met een haakje erin is een zoekterm, geen patroon.
  const term = zoek.trim().toLowerCase()
  const raakt = (...velden: string[]) => term === '' || velden.some((v) => v.toLowerCase().includes(term))

  /**
   * Bij een doorklik matchen we op de bedrijfssleutel, niet op de vrije zoektekst.
   *
   * De telling op de kaart groepeert via `normaliseerBedrijf`; het zoekveld kijkt ook naar
   * titels. Dat liep uiteen: "Volvo Group" toonde 3 op de kaart en 6 na de klik, want een
   * uitzendkantoor zet de klantnaam in de titel. Twee getallen die elkaar tegenspreken op
   * één klik afstand, terwijl herleidbaarheid het hele punt van die knop is.
   */
  const bedrijfsSleutel = viaLead ? normaliseerBedrijf(zoek) : null
  const raaktJob = (titel: string, bedrijf: string) =>
    bedrijfsSleutel !== null ? normaliseerBedrijf(bedrijf) === bedrijfsSleutel : raakt(titel, bedrijf)

  const zoekveldRef = useRef<HTMLInputElement>(null)

  const toonVacaturesVan = (bedrijf: string) => {
    setZoek(bedrijf)
    setViaLead(true)
    setTab('jobs')
    // Het leadpaneel unmount bij het wisselen van tabblad, dus de knop verdwijnt onder de
    // focus vandaan en die valt terug op body. De focus verhuist mee naar het zoekveld, dat
    // nu de bedrijfsnaam draagt en waar je hem ook weer kunt wissen.
    requestAnimationFrame(() => zoekveldRef.current?.focus())
  }

  const wijzigZoek = (waarde: string) => {
    setZoek(waarde)
    setViaLead(false)
  }

  // `metNieuw` apart, zodat de lege toestand kan zeggen of het vinkje de oorzaak is.
  const pastJob = (j: Job, metNieuw = true) =>
    pastBijFilters(
      { regio: j.region, score: j.score, status: j.jobStatus, eerstGezienAt: j.firstSeenAt },
      { regios: regions, minScore, status: statusFilter, nieuw: metNieuw && alleenNieuw },
      previousSyncAt
    ) && raaktJob(j.title, j.company)
  const pastLead = (c: Company, metNieuw = true) =>
    pastBijFilters(
      { regio: c.region, score: c.leadScore, status: c.leadStatus, eerstGezienAt: c.firstSeenAt },
      { regios: regions, minScore, status: statusFilter, nieuw: metNieuw && alleenNieuw },
      previousSyncAt
    ) && raakt(c.companyName)

  const filteredJobs = jobs.filter((j) => pastJob(j)).sort((a, b) => b.score - a.score)

  const filteredCompanies = companies.filter((c) => pastLead(c)).sort((a, b) => b.leadScore - a.leadScore)

  // Kaarten vanaf de scoregrens, de rest compact eronder — zie `LAGE_SCORE_GRENS`.
  const { kaarten: jobKaarten, laag: lageJobs } = splitsOpScore(filteredJobs)
  // "adzuna" op elke kaart zei niets zolang er maar één bron is.
  const toonBron = new Set(jobs.map((j) => j.source)).size > 1

  /**
   * Het aantal na een filterwissel op Vacatures of Leads (`data-filter-telling`), voor wie niet ziet
   * dat de lijst veranderde. Prospects heeft zijn eigen telling.
   *
   * De regio schrijft op één moment: 400 ms na de laatste filterwissel — status, regio, score,
   * zoekterm, ook de doorklik vanaf een lead — met de telling van het tabblad dat dán open staat. De
   * stilte houdt typen in het zoekveld uit de voorleesstem. Niet bij het laden, niet bij een tabwissel,
   * een sync of een statuswissel: die hebben elk hun eigen aankondiging.
   *
   * De regio wordt leeg zodra zijn tekst niet meer klopt, en blijft dan leeg: bij een nieuwe
   * filterwissel (zodat een gelijk getal toch opnieuw binnenkomt), bij een tabwissel (terugkeren las
   * de oude telling opnieuw voor) en wanneer de lijst zelf verandert (na een sync bleef een verouderd
   * getal staan, want de lijsten komen uit de props).
   */
  const telTekst =
    tab === 'jobs'
      ? viaLead
        ? `${filteredJobs.length} ${filteredJobs.length === 1 ? 'vacature' : 'vacatures'} van ${zoek}`
        : `${jobKaarten.length} ${jobKaarten.length === 1 ? 'vacature' : 'vacatures'} vanaf score ${LAGE_SCORE_GRENS}, ${lageJobs.length} lager`
      : tab === 'leads'
        ? `${filteredCompanies.length} ${filteredCompanies.length === 1 ? 'lead' : 'leads'}`
        : ''
  const filterSleutel = JSON.stringify([statusFilter, regions, minScore, zoek, viaLead, alleenNieuw])
  const gemeldeFilter = useRef(filterSleutel)
  const [telMelding, setTelMelding] = useState<{ sleutel: string; tab: Tab; tekst: string } | null>(null)
  // Tijdens het renderen en niet in een effect: zo staat een verouderde tekst geen enkele commit lang
  // in de regio. Terugzetten naar null in plaats van alleen verbergen, anders kwam hij terug.
  if (telMelding && (telMelding.sleutel !== filterSleutel || telMelding.tab !== tab || telMelding.tekst !== telTekst)) {
    setTelMelding(null)
  }
  useEffect(() => {
    if (filterSleutel === gemeldeFilter.current) return
    const t = setTimeout(() => {
      gemeldeFilter.current = filterSleutel
      setTelMelding({ sleutel: filterSleutel, tab, tekst: telTekst })
    }, 400)
    return () => clearTimeout(t)
  }, [filterSleutel, tab, telTekst])

  /**
   * De filterstand in de URL, zodat hij een herlaadbeurt overleeft.
   *
   * `history.replaceState` en niet `router.replace`: deze pagina is `force-dynamic`, en een
   * router-navigatie zou bij elke letter in het zoekveld de hele server-render opnieuw doen
   * (alle vacatures, leads en koppelingen). `replace` en niet `push`: filteren is geen stap terug
   * waard in de browsergeschiedenis.
   *
   * Met `null` als state, niet `window.history.state`. Next 15 patcht `replaceState` en slaat zijn
   * eigen router over zodra de state `__NA` draagt — en die van de huidige entry draagt dat. De
   * router hield dan de URL van bij het laden, en de eerstvolgende `router.refresh()` (Sync nu, een
   * plan-koppeling) zette die oude URL terug. Gelezen in `next/dist/client/components/app-router.js`
   * (15.5.25, r.324–331): met `null` kopieert Next zijn interne state en werkt hij de URL bij via
   * `ACTION_RESTORE`, zonder iets op te halen.
   */
  useEffect(() => {
    const qs = schrijfStand({
      status: statusFilter,
      regios: regions,
      minScore,
      tab,
      zoek,
      via: viaLead ? 'bedrijf' : '',
      nieuw: alleenNieuw,
    }).toString()
    const doel = qs ? `?${qs}` : ''
    if (window.location.search !== doel) {
      window.history.replaceState(null, '', `${window.location.pathname}${doel}`)
    }
  }, [statusFilter, regions, minScore, tab, zoek, viaLead, alleenNieuw])

  // Eén filterstand voor de lijst én de kaart. Ze uit elkaar laten lopen is precies wat
  // er op 2026-09-09 mis was: de kaart bleef op alle punten staan bij elke filterkeuze.
  const kaartFilter: UiFilter = useMemo(
    () => ({ regions, zoek, alleenWerkgevers, herkomst, alleenWinstgevend }),
    [regions, zoek, alleenWerkgevers, herkomst, alleenWinstgevend]
  )

  const haalProspects = useCallback(
    async (signal: AbortSignal) => {
      setProspectBezig(true)
      setProspectFout(null)
      try {
        // Dezelfde bouwer als de kaart — zie `filterQuery` in `lib/kbo/universum.ts`.
        const p = filterQuery(kaartFilter)
        if (sortering !== 'oprichting') p.set('sortering', sortering)
        p.set('pagina', String(prospectPagina))
        const res = await fetch(`/api/prospects?${p}`, { signal })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) {
          setProspectFout(data?.error ?? `Mislukt (HTTP ${res.status})`)
          setProspectMislukt(true)
          return
        }
        setProspectMislukt(false)
        setProspects(data.prospects)
        setProspectTotaal(data.totaal)
        setProspectPaginas(data.paginas)
        setZonderKbo(data.zonderKbo ?? 0)
        setCsvTotaal(data.csvTotaal ?? 0)
        setSpiegel(data.staat)
      } catch (e) {
        // Een afgebroken verzoek is geen fout: dat is een filter die sneller wisselde dan
        // de server antwoordde. Zonder deze tak flikkert er een foutmelding bij elk woord.
        if ((e as Error).name !== 'AbortError') {
          setProspectFout('Geen antwoord van de server.')
          setProspectMislukt(true)
        }
      } finally {
        setProspectBezig(false)
      }
    },
    [kaartFilter, sortering, prospectPagina]
  )

  useEffect(() => {
    if (prospectMislukt || !focusNaPoging.current) return
    focusNaPoging.current = false
    // Alleen als de focus met de knop verdween; wie intussen elders klikte, houdt zijn plek.
    if (document.activeElement === document.body) prospectsKopRef.current?.focus()
  }, [prospectMislukt])

  useEffect(() => {
    if (tab !== 'prospects') return
    const ctrl = new AbortController()
    // Kleine vertraging: dit tabblad vraagt de server, en typen in het zoekveld zou anders
    // per letter een query over 14.613 rijen starten.
    const t = setTimeout(() => void haalProspects(ctrl.signal), 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // prospectPoging staat hier alleen als aanleiding: Opnieuw proberen start dezelfde lading opnieuw.
  }, [tab, haalProspects, prospectPoging])

  // Een filterwijziging hoort je op pagina 1 te zetten; anders sta je op pagina 7 van een
  // lijst die er nog maar drie heeft en lijkt het resultaat leeg.
  useEffect(() => {
    setProspectPagina(1)
  }, [regions, zoek, alleenWerkgevers, herkomst, alleenWinstgevend, sortering])

  const handleProspectStatusChange = (nummer: string, status: ItemStatus) => {
    setProspects((prev) => prev.map((p) => (p.nummer === nummer ? { ...p, status } : p)))
  }

  /**
   * Na een wissel die het item uit de huidige weergave haalt (Afwijzen onder Open): de kaart
   * verdwijnt onder de focus. Zonder dit viel die op `body` en hoorde een schermlezer niets —
   * de lijst werd gewoon één korter (design-review 2026-09-17). De focus gaat naar het volgende
   * item in dezelfde groep (kaarten of lage-scorerijen, want die tweede kan ingeklapt zijn), anders
   * naar het vorige, anders naar het statusfilter.
   */
  const naVerdwijnen = (
    soort: 'job' | 'lead',
    id: number,
    titel: string,
    status: ItemStatus,
    groep: number[],
    vanuitPaneel = false
  ) => {
    if (pastBijStatus(status, statusFilter)) return
    const i = groep.indexOf(id)
    const doel = groep[i + 1] ?? groep[i - 1]
    // `contacted` komt alleen uit het opvolgingspaneel, en las hier als "heropend".
    const wat =
      status === 'dismissed' ? 'afgewezen' : status === 'saved' ? 'bewaard' : status === 'contacted' ? 'gecontacteerd' : 'heropend'
    if (vanuitPaneel) {
      // Het paneel trekt de focus terug (focus-trap) en verbergt de pagina voor een schermlezer, dus
      // een focuswissel of melding nu gaat verloren. Beide komen bij het sluiten: `naSluitenOpvolging`.
      if (opvolgingHerkomst.current) opvolgingHerkomst.current.melding = `${titel} ${wat}`
      return
    }
    setStatusMelding(`${titel} ${wat}`)
    // Twee frames: de wissel komt uit een fetch-vervolg, en React commit de kortere lijst pas na
    // het eerste.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const knop =
          doel !== undefined
            ? document.querySelector<HTMLElement>(`[data-item="${soort}-${doel}"] [data-status] button`)
            : null
        ;(knop ?? document.querySelector<HTMLElement>('select[aria-label="Status"]'))?.focus()
      })
    )
  }

  const handleJobStatusChange = (id: number, status: ItemStatus) => {
    setJobStatus((prev) => ({ ...prev, [id]: status }))
    // De filtertelling ruimt zichzelf op zodra de lijst kort wordt: zie `telTekst`.
    const groep = jobKaarten.some((j) => j.id === id) ? jobKaarten : lageJobs
    naVerdwijnen('job', id, jobs.find((j) => j.id === id)?.title ?? '', status, groep.map((j) => j.id))
  }

  const handleLeadStatusChange = (id: number, status: ItemStatus, vanuitPaneel = false) => {
    setLeadStatus((prev) => ({ ...prev, [id]: status }))
    naVerdwijnen(
      'lead',
      id,
      companies.find((c) => c.id === id)?.companyName ?? '',
      status,
      filteredCompanies.map((c) => c.id),
      vanuitPaneel
    )
  }

  const openOpvolging = (onderwerp: { type: SubjectType; key: string; naam: string }, volgorde: string[]) => {
    opvolgingHerkomst.current = { type: onderwerp.type, key: onderwerp.key, volgorde, melding: '' }
    setOpvolging(onderwerp)
  }

  /**
   * Het focusdoel na het sluiten van het opvolgingspaneel, als de knop die het opende weg is — nooit
   * `body`.
   *
   * Onder het filter Niet beoordeeld of Opgeslagen zet Vastleggen de lead op gecontacteerd en verlaat de kaart de
   * lijst; de Opvolging-knop die opende bestaat dan niet meer. Volgorde: de eigen kaart (Safari focust
   * een knop niet bij een klik, dus de opener kan ontbreken terwijl de kaart er nog staat), dan de
   * kaart die nu op die plek staat, dan de vorige, en anders het paneel van het tabblad. Een
   * prospectkaart draagt geen `data-item`, dus daar is het paneel het doel.
   */
  const naSluitenOpvolging = (): HTMLElement | null => {
    const herkomst = opvolgingHerkomst.current
    if (!herkomst) return null
    // Pas nu: achter het paneel was deze regio voor een schermlezer verborgen.
    if (herkomst.melding) {
      setStatusMelding(herkomst.melding)
      herkomst.melding = ''
    }
    const i = herkomst.volgorde.indexOf(herkomst.key)
    const kandidaten =
      herkomst.type === 'lead' && i >= 0
        ? [herkomst.key, ...herkomst.volgorde.slice(i + 1), ...herkomst.volgorde.slice(0, i).reverse()]
        : []
    for (const id of kandidaten) {
      const kaart = document.querySelector(`[data-item="lead-${id}"]`)
      const knop = kaart
        ? Array.from(kaart.querySelectorAll<HTMLButtonElement>('button')).find(
            (b) => b.textContent?.trim() === 'Opvolging'
          )
        : undefined
      if (knop) return knop
    }
    return herkomst.type === 'lead' ? leadsPaneelRef.current : prospectsPaneelRef.current
  }

  /**
   * "+N vacatures" na een sync: het tabblad van die soort, met "Alleen nieuw bij de laatste sync" aan.
   * Status terug op Open en de zoekterm leeg — allebei kunnen ze de nieuwe items precies verbergen.
   * Regio's en minimumscore blijven staan: die kies je bewust, en de lege toestand noemt ze.
   */
  const toonNieuwe = (soort: 'jobs' | 'leads') => {
    setAlleenNieuw(true)
    setStatusFilter('open')
    setZoek('')
    setViaLead(false)
    setTab(soort)
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">JobRadar</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/plan"
              className={cn(
                'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Bedrijfsplan
            </Link>
            <Link
              href="/instellingen"
              className={cn(
                'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Instellingen
            </Link>
            <SyncButton onToonNieuwe={toonNieuwe} />
          </div>
        </div>

        <CoverageBar dekking={dekking} />

        <FilterBar
          veldRef={zoekveldRef}
          zoek={zoek}
          onZoekChange={wijzigZoek}
          regions={regions}
          minScore={minScore}
          statusFilter={statusFilter}
          onRegionsChange={setRegions}
          onMinScoreChange={setMinScore}
          onStatusFilterChange={setStatusFilter}
          alleenNieuw={tab === 'prospects' ? null : alleenNieuw}
          onAlleenNieuwChange={setAlleenNieuw}
        />

        {/* Na een doorklik of een filterwissel verandert de lijst zonder dat er iets verplaatst;
            zonder dit hoort een schermlezergebruiker niet wat er gebeurde. */}
        <p aria-live="polite" className="sr-only" data-filter-telling>
          {telMelding?.tekst ?? ''}
        </p>
        <p aria-live="polite" className="sr-only" data-status-melding>
          {statusMelding}
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="jobs">
              Vacatures
              {/* De kaarten, niet alles: "334" boven 25 kaarten las als een lijst die ontbrak. De rijen
                  onder de grens tellen in de kop van hun eigen sectie. */}
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {jobKaarten.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="leads">
              Leads
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {filteredCompanies.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="prospects">
              Prospects
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {prospectMislukt ? '—' : (prospectTotaal ?? '—')}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            {/* Het tabblad draagt het label al zichtbaar en Radix hangt het paneel er via
                aria-labelledby aan; wat ontbrak was het NIVEAU. Zonder deze h2 sprong de
                koppen-outline van h1 naar 327 kaart-h3's (ux-audit 2026-08-11, P3). */}
            <h2 className="sr-only">Vacatures</h2>
            {filteredJobs.length === 0 ? (
              <EmptyState
                message={
                  // Geen diagnose die niet gecontroleerd is. Er zijn twee toestanden en het
                  // verschil is meetbaar: staat het bedrijf wél in de database, dan filteren
                  // regio, score of status het weg. Staat het er niet, dan is dat het antwoord.
                  alleenNieuw && jobs.some((j) => pastJob(j, false))
                    ? 'Geen vacatures die bij de laatste sync binnenkwamen binnen je filters — zet "Alleen nieuw bij de laatste sync" uit om de rest te zien.'
                    : bedrijfsSleutel !== null
                    ? jobs.some((j) => normaliseerBedrijf(j.company) === bedrijfsSleutel)
                      ? `Geen vacatures van "${zoek}" binnen je huidige filters — pas regio, status of minimumscore aan.`
                      : `Er staan geen vacatures van "${zoek}" in de database.`
                    : jobs.some((j) => raaktJob(j.title, j.company))
                      ? // De zoekterm (of geen) vindt wél vacatures: dan nemen regio, status of
                        // score ze weg, en is Sync nu het verkeerde advies.
                        term
                        ? `Geen vacatures voor "${zoek}" binnen je huidige filters — pas regio, status of minimumscore aan.`
                        : 'Geen vacatures binnen je huidige filters — pas regio, status of minimumscore aan.'
                      : term
                        ? `Geen vacatures gevonden voor "${zoek}".`
                        : "Geen vacatures gevonden. Druk op 'Sync nu' om data op te halen."
                }
              />
            ) : (
              <>
                {jobKaarten.length === 0 ? (
                  // Er zijn wél vacatures, alleen geen enkele vanaf de grens: dat is een ander
                  // antwoord dan een lege database, en het hoort er te staan in plaats van een
                  // lege grid boven een ingeklapte sectie.
                  <p className="mt-6 text-sm text-muted-foreground" data-geen-kaarten>
                    Geen vacatures vanaf score {LAGE_SCORE_GRENS} binnen je filters. De{' '}
                    <span className="tabular-nums">{lageJobs.length}</span> met een lagere score staan
                    hieronder.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {jobKaarten.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isNew={isNieuw(job.firstSeenAt, previousSyncAt)}
                        toonBron={toonBron}
                        onStatusChange={(status) => handleJobStatusChange(job.id, status)}
                      />
                    ))}
                  </div>
                )}
                <LageScoreLijst vacatures={lageJobs} onStatusChange={handleJobStatusChange} />
              </>
            )}
          </TabsContent>

          {/* De ref is het laatste focusdoel na het opvolgingspaneel; Radix geeft een tabpaneel tabIndex 0. */}
          <TabsContent ref={leadsPaneelRef} value="leads">
            <h2 className="sr-only">Leads</h2>
            {spiegelFout && (
              <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground" data-spiegel-fout>
                De KBO-spiegel staat op deze machine maar ging niet open. De leadkaarten tonen daarom geen
                KBO-vermoeden; de rest van het dashboard werkt gewoon.
              </p>
            )}
            {filteredCompanies.length === 0 ? (
              <EmptyState
                message={
                  // Zelfde onderscheid als bij Vacatures: vindt de zoekterm (of geen) wél leads, dan
                  // zijn de filters de oorzaak en niet een ontbrekende sync.
                  alleenNieuw && companies.some((c) => pastLead(c, false))
                    ? 'Geen leads die bij de laatste sync binnenkwamen binnen je filters — zet "Alleen nieuw bij de laatste sync" uit om de rest te zien.'
                    : companies.some((c) => raakt(c.companyName))
                    ? term
                      ? `Geen leads voor "${zoek}" binnen je huidige filters — pas regio, status of minimumscore aan.`
                      : 'Geen leads binnen je huidige filters — pas regio, status of minimumscore aan.'
                    : term
                      ? `Geen leads gevonden voor "${zoek}".`
                      : "Geen leads gevonden. Druk op 'Sync nu' om data op te halen."
                }
              />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <LeadCard
                    key={company.id}
                    company={company}
                    vermoeden={vermoedens[company.companyName] ?? null}
                    isNew={isNieuw(company.firstSeenAt, previousSyncAt)}
                    onStatusChange={(status) => handleLeadStatusChange(company.id, status)}
                    onToonVacatures={toonVacaturesVan}
                    onOpvolging={() =>
                      openOpvolging(
                        { type: 'lead', key: String(company.id), naam: company.companyName },
                        filteredCompanies.map((c) => String(c.id))
                      )
                    }
                    planKeys={koppelingen[`lead:${company.id}`] ?? []}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent ref={prospectsPaneelRef} value="prospects">
            {/* tabIndex -1: het doel van de focus na een geslaagde Opnieuw proberen. */}
            <h2 ref={prospectsKopRef} tabIndex={-1} className="sr-only">
              Prospects
            </h2>

            {/* Twee meldingen die BOVEN de lijst horen, niet in plaats ervan: een ontbrekende
                of verouderde spiegel zegt iets over de data, niet over het resultaat. */}
            {spiegel?.soort === 'ontbreekt' && (
              <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                Er staat nog geen KBO-spiegel op deze machine. Draai{' '}
                <code className="rounded bg-background px-1 py-0.5">pnpm --filter jobradar kbo:sync --full</code>{' '}
                — dat haalt de volledige extract op (~298 MB) en vult{' '}
                <code className="rounded bg-background px-1 py-0.5">.data/kbo.db</code>.
              </p>
            )}
            {spiegel?.soort === 'ok' && spiegel.ouderdomDagen !== null && spiegel.ouderdomDagen > VEROUDERD_NA_DAGEN && (
              <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                De spiegel is van {spiegel.snapshot} — {spiegel.ouderdomDagen} dagen oud. Draai{' '}
                <code className="rounded bg-background px-1 py-0.5">pnpm --filter jobradar kbo:sync</code>{' '}
                voor de dagelijkse updates. FOD Economie bewaart er 32 dagen; daarna is een verse{' '}
                <code className="rounded bg-background px-1 py-0.5">--full</code> nodig.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <HerkomstFilter waarde={herkomst} onChange={setHerkomst} />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="alleen-werkgevers"
                    checked={alleenWerkgevers}
                    onCheckedChange={(v) => setAlleenWerkgevers(v === true)}
                  />
                  <Label htmlFor="alleen-werkgevers" className="cursor-pointer text-sm">
                    Alleen met personeel
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="alleen-winstgevend"
                    checked={alleenWinstgevend}
                    onCheckedChange={(v) => setAlleenWinstgevend(v === true)}
                  />
                  <Label htmlFor="alleen-winstgevend" className="cursor-pointer text-sm">
                    Alleen winstgevend
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="prospect-sortering" className="cursor-pointer text-sm">
                  Sorteer
                </Label>
                <NativeSelect
                  id="prospect-sortering"
                  value={sortering}
                  size="sm"
                  onChange={(e) => setSortering(e.target.value as Sortering)}
                  wrapperClassName="w-auto"
                  className="w-auto cursor-pointer"
                >
                  <option value="oprichting">Nieuwste eerst</option>
                  <option value="omvang">Grootste eerst</option>
                  <option value="ebitda">Hoogste EBITDA eerst</option>
                  <option value="actie">Volgende actie eerst</option>
                </NativeSelect>
                {/* Eigen anker: de harness las deze teller als `#prospect-sortering + p`, en sinds de
                    select uit @umanex/ui komt (met een omhulling) klopte die buur-relatie niet meer. */}
                <p className="text-sm tabular-nums text-muted-foreground" data-prospects-teller>
                  {prospectBezig || (prospectTotaal === null && !prospectMislukt)
                    ? 'Bezig…'
                    : prospectMislukt || prospectTotaal === null
                      ? '—'
                      : `${prospectTotaal} prospect${prospectTotaal === 1 ? '' : 's'}`}
                </p>
                <button
                  type="button"
                  onClick={() => setWeergave((w) => (w === 'lijst' ? 'kaart' : 'lijst'))}
                  aria-pressed={weergave === 'kaart'}
                  // Ingedrukt = primary. `accent` haalde tegenover de niet-ingedrukte stand (background)
                  // 1,10:1 in light en 1,30:1 in dark, dus de stand was niet te zien; primary haalt
                  // 5,20:1 en 4,72:1 (WCAG 1.4.11 vraagt 3:1), en de tekst erop dezelfde waarden.
                  // Gerekend op theme.css met de overrides uit app/globals.css.
                  className={cn(
                    'rounded-md border bg-background px-2 py-1 text-sm text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground',
                    focusRing
                  )}
                  data-weergave={weergave}
                >
                  {/* Niet kaal "Kaart"/"Lijst": het herkomst-filter ernaast heeft al een
                      segment "Lijst" (= de aangeleverde bron). Twee controls met hetzelfde
                      woord en een andere betekenis in één paneel is voor een schermlezer
                      niet te onderscheiden — Playwright weigerde er ook tussen te kiezen.

                      Een vaste naam: een toggle wisselt van stand, niet van naam (zie Bewaar in
                      StatusActies). "Lijstweergave, ingedrukt" las als "de lijst staat aan"
                      terwijl de kaart getoond werd. */}
                  Kaartweergave
                </button>
              </div>
            </div>

            {/* De filters hierboven veranderen de lijst zonder dat de focus verspringt, dus
                zonder live region hoort een schermlezergebruiker alleen "aangevinkt" en
                niet dat de lijst van 2.939 naar 171 ging. Zelfde motivering als de
                aria-live bij de doorklik vanaf een lead. */}
            {/* Leeg na een mislukte lading: de alert hieronder kondigt die al aan. De pagina hoort erbij,
                anders zegt Volgende niets — het totaal blijft over pagina's heen gelijk. */}
            <p aria-live="polite" className="sr-only" data-prospects-telling>
              {prospectMislukt && !prospectBezig
                ? ''
                : prospectBezig || prospectTotaal === null
                  ? 'Bezig met laden'
                  : `${prospectTotaal} prospect${prospectTotaal === 1 ? '' : 's'}` +
                    (alleenWinstgevend ? ', alleen winstgevende bedrijven uit de aangeleverde lijst' : '') +
                    (zonderKbo > 0 ? `, ${zonderKbo} buiten de KBO-spiegel` : '') +
                    (weergave === 'lijst' && prospectPaginas > 1 ? `, pagina ${prospectPagina} van ${prospectPaginas}` : '')}
            </p>

            {/* Twee meldingen die een gevolg van de filters uitleggen in plaats van het stil
                te laten gebeuren. Beide staan boven de lijst, niet in plaats ervan. */}
            {alleenWinstgevend && (
              <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                Alleen winstgevend zeeft op EBITDA, en die staat alleen in de aangeleverde
                lijst. Bedrijven die je enkel uit het KBO-universum kent vallen hier dus weg —
                niet omdat ze verlies maken, maar omdat er geen cijfer over bekend is.
              </p>
            )}
            {/* Niet na een mislukte lading: het getal hoort bij de vorige filterstand. */}
            {zonderKbo > 0 && !prospectMislukt && (
              <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                {zonderKbo} {zonderKbo === 1 ? 'bedrijf uit de lijst staat' : 'bedrijven uit de lijst staan'} niet
                in de KBO-spiegel. {zonderKbo === 1 ? 'Het valt' : 'Ze vallen'} daardoor buiten deze selectie:
                zonder KBO-adres {zonderKbo === 1 ? 'is er' : 'zijn er'} geen postcode en dus geen regio om op
                te filteren.
              </p>
            )}

            {weergave === 'kaart' ? (
              <ProspectMap filter={kaartFilter} />
            ) : prospectMislukt ? (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p role="alert" className="text-center text-sm text-destructive" data-prospects-fout>
                  {prospectFout}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={prospectBezig}
                  onClick={(e) => {
                    if (prospectBezig) return
                    focusNaPoging.current = document.activeElement === e.currentTarget
                    setProspectPoging((n) => n + 1)
                  }}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  data-prospects-opnieuw
                >
                  {prospectBezig ? 'Bezig…' : 'Opnieuw proberen'}
                </Button>
              </div>
            ) : prospects.length === 0 && !prospectBezig ? (
              <EmptyState
                message={
                  spiegel?.soort === 'ontbreekt'
                    ? 'Zonder spiegel valt er niets te tonen — ook een geïmporteerde lijst niet, want die wordt aan de spiegel gekoppeld.'
                    : herkomst === 'csv' && csvTotaal === 0
                      ? 'Nog niets uit een aangeleverde lijst. Draai pnpm --filter jobradar prospects:import <pad.csv> om er een in te lezen.'
                      : herkomst === 'csv'
                        ? `De aangeleverde lijst telt ${csvTotaal} ${csvTotaal === 1 ? 'bedrijf' : 'bedrijven'}, maar geen enkele binnen je huidige filters — pas regio, zoekterm of de zeven aan.`
                        : alleenWerkgevers
                      ? 'Geen prospects binnen je huidige filters. Zet "Alleen met personeel" uit om ook eenmanszaken te zien.'
                      : 'Geen prospects binnen je huidige filters — pas regio of zoekterm aan.'
                }
              />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {prospects.map((p) => (
                  <ProspectCard
                    key={p.nummer}
                    prospect={p}
                    heeftVacatures={leadNummers.has(p.nummer)}
                    vandaag={vandaag}
                    onStatusChange={(status) => handleProspectStatusChange(p.nummer, status)}
                    onOpvolging={() => openOpvolging({ type: 'prospect', key: p.nummer, naam: p.naam }, [])}
                    planKeys={koppelingen[`prospect:${p.nummer}`] ?? []}
                  />
                ))}
              </div>
            )}

            {weergave === 'lijst' && !prospectMislukt && prospectPaginas > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                {/* `aria-disabled` en niet `disabled`, ook aan de randen: de knop die je net indrukte
                    wordt tijdens het laden (en op de laatste pagina blijvend) onbruikbaar, en een
                    disabled knop geeft zijn focus af aan `body` (zie StatusActies). */}
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={prospectPagina <= 1 || prospectBezig}
                  onClick={() => {
                    if (prospectPagina <= 1 || prospectBezig) return
                    setProspectPagina((p) => Math.max(1, p - 1))
                  }}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  data-pagina="vorige"
                >
                  Vorige
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  pagina {prospectPagina} van {prospectPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={prospectPagina >= prospectPaginas || prospectBezig}
                  onClick={() => {
                    if (prospectPagina >= prospectPaginas || prospectBezig) return
                    setProspectPagina((p) => Math.min(prospectPaginas, p + 1))
                  }}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  data-pagina="volgende"
                >
                  Volgende
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Buiten de Tabs: een sheet hoort over de hele pagina te liggen, niet binnen het
            paneel dat hem opende. */}
        {opvolging && (
          <ContactPanel
            open
            onOpenChange={(o) => !o && setOpvolging(null)}
            type={opvolging.type}
            subjectKey={opvolging.key}
            naam={opvolging.naam}
            vandaag={vandaag}
            onStatusChange={(status) => {
              if (opvolging.type === 'prospect') {
                handleProspectStatusChange(opvolging.key, status as ItemStatus)
              } else {
                handleLeadStatusChange(Number(opvolging.key), status as ItemStatus, true)
              }
            }}
            terugval={naSluitenOpvolging}
            planSectie={
              <PlanKoppeling
                type={opvolging.type}
                subjectKey={opvolging.key}
                onChange={() => router.refresh()}
              />
            }
          />
        )}
      </div>
    </TooltipProvider>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  )
}
