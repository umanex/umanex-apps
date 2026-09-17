'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { StatusActies } from './StatusActies'
import { clusterPunten, projecteer, ringNaarPad, verhouding, type Cluster } from '@/lib/kaart'
import { filterQuery, type UiFilter } from '@/lib/kbo/universum'
import type { ItemStatus } from '@/lib/db/schema'

const BREEDTE = 1000
const HOOGTE = Math.round(BREEDTE / verhouding())
/**
 * In SVG-eenheden, als ondergrens. Bij 43 bedrijven in Gent is groeperen het verschil tussen
 * kaart en vlek. De straal die werkelijk telt is meestal die van het klikdoel hieronder.
 */
const CLUSTER_STRAAL = 18
/**
 * WCAG 2.5.8: een klikdoel van minstens 24 × 24 CSS-px. In CSS-px en niet in SVG-eenheden, want de
 * svg schaalt mee met de breedte. Bij 1024 px viewport is hij volgens de layout 656 px breed
 * (min padding, aside en gap), en was een losse stip (r=5 eenheden) daar 6,6 px groot.
 */
const KLIKDOEL_PX = 24
/**
 * Zoveel groter dan de helft van KLIKDOEL_PX tekent de kaart de straal van het klikdoel. Chromium
 * rekent SVG-geometrie in float32: bij een straal van precies 12 CSS-px gaf getBoundingClientRect
 * 23,99994–24,00003 px, dus viel één klikdoel op vijf onder de grens (flow fase3-kaart, 2026-09-17).
 * 0,01 px is ruim honderd keer die afwijking en onzichtbaar.
 */
const KLIKDOEL_MARGE_PX = 0.01

type Punt = {
  nummer: string
  naam: string
  lat: number
  lon: number
  herkomst: 'lijst' | 'lead'
  precisie: string | null
  status: ItemStatus
}

type Grenzen = {
  bron: string
  features: { properties: { naam: string }; geometry: { coordinates: number[][][] } }[]
}

/** De statuskleuren komen uit de rollaag; geen rauwe hex, geen paletklasse. */
const KLEUR: Record<ItemStatus, string> = {
  new: 'fill-muted-foreground',
  saved: 'fill-primary',
  contacted: 'fill-success',
  dismissed: 'fill-muted',
}

/** Dezelfde volgorde als KLEUR: de legenda en de telling in een clusternaam lezen hieruit. */
const STATUS_NAAM: Record<ItemStatus, string> = {
  new: 'nieuw',
  saved: 'bewaard',
  contacted: 'gecontacteerd',
  dismissed: 'afgewezen',
}
const STATUSSEN = Object.keys(STATUS_NAAM) as ItemStatus[]

/** "9 nieuw, 2 bewaard" — een cluster tekent één vorm, dus zonder dit is zijn status nergens af te lezen. */
function statusTelling(info: Punt[]): string {
  return STATUSSEN.map((s) => [s, info.filter((p) => p.status === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${STATUS_NAAM[s]}`)
    .join(', ')
}

/**
 * Voegt clusters samen die dichter dan `straal` bij elkaar liggen, tot er geen meer zijn.
 *
 * `clusterPunten` garandeert dat niet: het anker schuift naar het zwaartepunt en kan zo naast
 * een andere cluster belanden. Doorgerekend 2026-09-17 met `clusterPunten` op de 217 gegeocodeerde
 * punten binnen de provincies in `.data/jobradar.db`: met de straal voor een svg van 656 px lagen
 * twee paren dichter dan die straal, het dichtste op 19,4 px. Twee klikdoelen van 24 px overlappen
 * dan, en het ene neemt een deel van het andere over.
 */
// TODO: hoort in `lib/kaart.ts` (in `clusterPunten` zelf), met een invariant in de kaart-scenarios:
// geen twee clusters dichter dan de straal. Hier omdat die bestanden buiten deze wijziging vallen.
function scheidClusters(clusters: Cluster[], straal: number): Cluster[] {
  const lijst = clusters.map((c) => ({ ...c, punten: [...c.punten] }))
  for (;;) {
    let paar: [number, number] | null = null
    zoek: for (let i = 0; i < lijst.length; i++) {
      for (let j = i + 1; j < lijst.length; j++) {
        if (Math.hypot(lijst[i]!.x - lijst[j]!.x, lijst[i]!.y - lijst[j]!.y) < straal) {
          paar = [i, j]
          break zoek
        }
      }
    }
    if (!paar) return lijst
    const [i, j] = paar
    const doel = lijst[i]!
    doel.punten.push(...lijst[j]!.punten)
    doel.x = doel.punten.reduce((s, q) => s + q.x, 0) / doel.punten.length
    doel.y = doel.punten.reduce((s, q) => s + q.y, 0) / doel.punten.length
    lijst.splice(j, 1)
  }
}

const RICHTING: Record<string, readonly [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
}
const NAVIGATIETOETSEN = new Set([...Object.keys(RICHTING), 'Home', 'End'])

/**
 * De marker in de richting van een pijltoets, of null. Geografisch en niet in DOM-volgorde: die
 * is gesorteerd op x, dus "volgende" zou bij ↓ naar een stip rechts ernaast springen.
 */
function naastgelegen(clusters: Cluster[], van: number, toets: string): number | null {
  if (toets === 'Home') return clusters.length ? 0 : null
  if (toets === 'End') return clusters.length ? clusters.length - 1 : null
  const r = RICHTING[toets]
  const vertrek = clusters[van]
  if (!r || !vertrek) return null
  let beste: number | null = null
  let besteScore = Infinity
  for (let i = 0; i < clusters.length; i++) {
    const dx = clusters[i]!.x - vertrek.x
    const dy = clusters[i]!.y - vertrek.y
    const langs = dx * r[0] + dy * r[1]
    if (i === van || langs <= 0) continue
    // Afwijking dwars op de richting weegt dubbel: anders kiest → een stip die vooral hoger ligt.
    const score = langs + 2 * Math.abs(dx * r[1] - dy * r[0])
    if (score < besteScore) {
      besteScore = score
      beste = i
    }
  }
  return beste
}

/**
 * De prospectkaart: drie provincievlakken en de bedrijven erop.
 *
 * Geen kaart-library en geen basemap-tiles. Gemeten 2026-09-09: de grenzen wegen 5,9 KB, het
 * tile-pad over hetzelfde gebied ±112 MB, en `maplibre-gl` 19,1 MB met 17 dependencies — voor
 * drie polygonen en 227 punten. Bijkomend gevolg dat niet bijkomstig is: er gaat geen enkel
 * verzoek naar buiten, dus de origin-guard van de flow-harness kan hier per constructie niets
 * afbreken.
 */
type ProspectMapProps = {
  /** Dezelfde filterstand als de lijst. De kaart is geen tweede selectie. */
  filter: UiFilter
}

export function ProspectMap({ filter }: ProspectMapProps) {
  const [punten, setPunten] = useState<Punt[] | null>(null)
  const [grenzen, setGrenzen] = useState<Grenzen | null>(null)
  const [tellers, setTellers] = useState({
    leadsZonderAdres: 0,
    zonderCoordinaat: 0,
    buitenProvincies: 0,
    buitenFilter: 0,
  })
  const [zonderSpiegel, setZonderSpiegel] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [laadt, setLaadt] = useState(true)
  /** Ophogen laadt opnieuw met dezelfde filterstand — de enige weg uit een fout zonder de filters te wijzigen. */
  const [poging, setPoging] = useState(0)
  const [gekozen, setGekozen] = useState<string[] | null>(null)
  /** De ene marker die in de tab-volgorde staat; de rest bereik je met de pijltjestoetsen. */
  const [tabStop, setTabStop] = useState<string | null>(null)
  /** CSS-px per SVG-eenheid, gemeten op de svg zelf. 1 tot de eerste meting, die vóór de paint komt. */
  const [schaal, setSchaal] = useState(1)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const leegRef = useRef<HTMLDivElement>(null)
  /** Had Opnieuw proberen de focus? Na een geslaagde lading verdwijnt die knop onder de focus. */
  const focusNaHerstel = useRef(false)
  const hintId = useId()

  // De querystring als string in de dependency-lijst: een object is elke render een nieuwe
  // referentie, dus een effect dat op `filter` zelf hangt vuurt eindeloos.
  const vraag = filterQuery(filter).toString()

  useEffect(() => {
    const ctrl = new AbortController()
    setLaadt(true)
    void (async () => {
      try {
        const [k, g] = await Promise.all([
          fetch(`/api/kaart?${vraag}`, { signal: ctrl.signal }).then(async (r) => ({
            r,
            data: await r.json().catch(() => null),
          })),
          // Zonder r.ok-controle werd een 404 hier een SyntaxError, en die stond als "Geen
          // antwoord van de server" in beeld — een netwerkfout die er geen was.
          fetch('/geo/provincies.json', { signal: ctrl.signal }).then((r) =>
            r.ok ? (r.json().catch(() => null) as Promise<Grenzen | null>) : null
          ),
        ])
        if (ctrl.signal.aborted) return
        if (!k.r.ok || !k.data?.ok) {
          setFout(
            k.data?.error ??
              (k.r.ok
                ? 'De kaartgegevens konden niet geladen worden.'
                : `De kaartgegevens konden niet geladen worden (HTTP ${k.r.status}).`)
          )
          return
        }
        if (!g?.features) {
          setFout('De provinciegrenzen konden niet geladen worden.')
          return
        }
        setPunten(k.data.punten)
        setZonderSpiegel(k.data.spiegel === 'ontbreekt')
        setTellers({
          leadsZonderAdres: k.data.leadsZonderAdres,
          zonderCoordinaat: k.data.zonderCoordinaat,
          buitenProvincies: k.data.buitenProvincies ?? 0,
          buitenFilter: k.data.buitenFilter ?? 0,
        })
        setGrenzen(g)
        // Een selectie die kleiner wordt kan de aangeklikte stip wegnemen; het paneel ernaast
        // zou dan een bedrijf tonen dat niet meer op de kaart staat.
        setGekozen(null)
        // Pas hier, niet bij de start: anders verdwijnt Opnieuw proberen onder de focus zodra hij
        // ingedrukt wordt, en blijft een fout staan na een filterwissel die wél slaagt.
        setFout(null)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setFout('Geen antwoord van de server.')
      } finally {
        if (!ctrl.signal.aborted) setLaadt(false)
      }
    })()
    return () => ctrl.abort()
  }, [vraag, poging])

  // Mislukt de nieuwe poging ook, dan blijft de knop staan en hoort een latere, geslaagde lading
  // (bv. na een filterwissel elders) de focus niet weg te trekken.
  useEffect(() => {
    if (fout && !laadt) focusNaHerstel.current = false
  }, [fout, laadt])

  useEffect(() => {
    if (fout || !punten || !grenzen || !focusNaHerstel.current) return
    focusNaHerstel.current = false
    const marker = svgRef.current?.querySelector<SVGGElement>('[data-marker][tabindex="0"]')
    ;(marker ?? leegRef.current)?.focus()
  }, [fout, punten, grenzen])

  // Een callback-ref, want de svg bestaat pas na de lading. De eerste meting valt in de commit,
  // dus de clusters staan al op de juiste straal vóór de eerste paint.
  const meetSvg = useCallback((el: SVGSVGElement | null) => {
    svgRef.current = el
    if (!el) return
    const meet = () => {
      // De schaal die de browser zelf toepast (viewBox → CSS-px), niet een breedte waaruit hij
      // afgeleid wordt. getBoundingClientRect telde de rand van 1 px mee (klikdoel 23,9 px), en
      // clientWidth rondt af op hele pixels terwijl de svg in de flexrij fractioneel breed is:
      // 909,999 px bij 1280, 653,992 bij 1024 — klikdoel 23,9997 px (flow fase3-kaart, 2026-09-17).
      const ctm = el.getScreenCTM()
      const s = ctm && ctm.a > 0 ? ctm.a : el.clientWidth / BREEDTE
      if (s > 0) setSchaal(s)
    }
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(el)
    return () => {
      ro.disconnect()
      svgRef.current = null
    }
  }, [])

  const clusters = useMemo(() => {
    if (!punten) return []
    const geprojecteerd = punten.map((p) => ({
      nummer: p.nummer,
      ...projecteer(p.lon, p.lat, BREEDTE, HOOGTE),
    }))
    // Twee markers dichter dan één klikdoel zijn niet apart aan te wijzen, dus ze horen één
    // cluster te zijn. Doorgerekend op dezelfde 217 punten: bij een svg van 912 px 77 → 59
    // markers, bij 656 px 77 → 40.
    const straal = Math.max(CLUSTER_STRAAL, KLIKDOEL_PX / schaal)
    return scheidClusters(clusterPunten(geprojecteerd, straal), straal)
  }, [punten, schaal])

  const perNummer = useMemo(() => new Map((punten ?? []).map((p) => [p.nummer, p])), [punten])

  if (fout) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2" data-kaart-fout>
        {/* Leeg tijdens een nieuwe poging: mislukt die met dezelfde tekst, dan verandert de regio
            toch en leest een schermlezer hem opnieuw voor. */}
        <p role="alert" className="text-center text-sm text-destructive">
          {laadt ? '' : fout}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={laadt}
          onClick={(e) => {
            // `aria-disabled` en niet `disabled`: een knop met focus die disabled wordt, geeft
            // die focus af aan `body`.
            if (laadt) return
            focusNaHerstel.current = e.currentTarget === document.activeElement
            setPoging((p) => p + 1)
          }}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          {laadt ? 'Bezig…' : 'Opnieuw proberen'}
        </Button>
      </div>
    )
  }

  if (!punten || !grenzen) {
    return <p className="mt-8 text-center text-sm text-muted-foreground">Kaart laden…</p>
  }

  if (!punten.length) {
    // Drie redenen om leeg te zijn, drie verschillende antwoorden. Ze op één hoop gooien
    // maakt van "draai de sync", "draai de geocoder" en "je filter is te smal" hetzelfde ding.
    return (
      <div
        ref={leegRef}
        tabIndex={-1}
        className="mt-3 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground"
      >
        {zonderSpiegel ? (
          <>
            Er staat nog geen KBO-spiegel op deze machine, en de kaart tekent wat de lijst
            selecteert. Draai{' '}
            <code className="rounded bg-background px-1 py-0.5">
              pnpm --filter jobradar kbo:sync --full
            </code>
            .
          </>
        ) : tellers.buitenFilter > 0 ? (
          <>
            Geen enkel bedrijf met een coördinaat valt binnen je huidige filters —{' '}
            {tellers.buitenFilter} {tellers.buitenFilter === 1 ? 'valt' : 'vallen'} erbuiten. Pas
            regio, bron of de zeven aan.
          </>
        ) : (
          <>
            Nog geen coördinaten. Draai{' '}
            <code className="rounded bg-background px-1 py-0.5">pnpm --filter jobradar geocode</code>{' '}
            — dat haalt ze eenmalig op en bewaart ze, dus het hoeft één keer.
          </>
        )}
      </div>
    )
  }

  const uitLijst = punten.filter((p) => p.herkomst === 'lijst').length
  const uitLeads = punten.length - uitLijst

  // Valt de onthouden stop weg (andere filterstand, andere breedte), dan de gekozen cluster, en
  // anders de eerste — er staat altijd precies één marker in de tab-volgorde.
  const actieveStop =
    clusters.find((c) => c.punten[0]?.nummer === tabStop)?.punten[0]?.nummer ??
    clusters.find((c) => gekozen && c.punten.some((p) => p.nummer === gekozen[0]))?.punten[0]?.nummer ??
    clusters[0]?.punten[0]?.nummer
  const klikStraal = (KLIKDOEL_PX / 2 + KLIKDOEL_MARGE_PX) / schaal

  return (
    <div className="mt-3">
      {/* Wat er níet op staat en waarom — drie verschillende redenen, dus drie tellers. */}
      <p className="mb-2 text-sm text-muted-foreground">
        {punten.length} bedrijven op de kaart: {uitLijst} uit de lijst, {uitLeads} lead
        {uitLeads === 1 ? '' : 's'} op een KBO-vermoeden.
        {tellers.leadsZonderAdres > 0 && ` ${tellers.leadsZonderAdres} leads hebben geen adres.`}
        {tellers.zonderCoordinaat > 0 && ` ${tellers.zonderCoordinaat} zonder coördinaat.`}
        {tellers.buitenProvincies > 0 &&
          ` ${tellers.buitenProvincies} liggen buiten de drie provincies — de zoekstraal van de vacaturebron loopt over de grens.`}
        {tellers.buitenFilter > 0 && ` ${tellers.buitenFilter} vallen buiten je huidige filters.`}
      </p>

      <p aria-live="polite" className="sr-only">
        {gekozen ? `${gekozen.length} bedrijven geselecteerd` : ''}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* `group` en geen `img`: de kinderen van een img zijn presentationeel, dus de markers
            vielen met naam en rol uit de toegankelijkheidsboom terwijl ze wel tab-stops waren. */}
        <svg
          ref={meetSvg}
          viewBox={`0 0 ${BREEDTE} ${HOOGTE}`}
          className="w-full rounded-lg border bg-card"
          role="group"
          aria-label={`Kaart van West-Vlaanderen, Oost-Vlaanderen en Brussel met ${punten.length} bedrijven`}
          aria-describedby={hintId}
          data-kaart
        >
          {grenzen.features.map((f) => (
            <path
              key={f.properties.naam}
              d={ringNaarPad(f.geometry.coordinates[0]!, BREEDTE, HOOGTE)}
              className="fill-muted stroke-border"
              strokeWidth={2}
            />
          ))}

          {clusters.map((c, index) => {
            const eersten = c.punten.map((p) => p.nummer)
            const sleutel = eersten[0]!
            const info = eersten.map((n) => perNummer.get(n)!).filter(Boolean)
            const meerdere = info.length > 1
            const isLead = !meerdere && info[0]?.herkomst === 'lead'
            // Een cluster tekent één vorm, dus de ruit-markering van een vermoeden zou
            // erin verdwijnen — en juist waar het druk is (Brussel, Gent) zitten de meeste
            // leads. Gemeten: 3 losse ruiten bij 12 lead-punten, de andere 9 zaten in een
            // cluster. Een cluster met een vermoeden erin krijgt daarom een streepomtrek.
            const bevatVermoeden = info.some((p) => p.herkomst === 'lead')
            const actief = gekozen?.[0] === eersten[0]
            return (
              <g
                key={sleutel}
                data-marker={sleutel}
                onClick={() => setGekozen(eersten)}
                onFocus={() => setTabStop(sleutel)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setGekozen(eersten)
                    return
                  }
                  if (!NAVIGATIETOETSEN.has(e.key)) return
                  e.preventDefault()
                  const doel = naastgelegen(clusters, index, e.key)
                  const doelSleutel = doel === null ? null : clusters[doel]?.punten[0]?.nummer
                  if (!doelSleutel) return
                  svgRef.current?.querySelector<SVGGElement>(`[data-marker="${doelSleutel}"]`)?.focus()
                }}
                // Roving tabindex: met elke cluster als tab-stop lag het paneel met de keuze
                // gemiddeld een halve kaart aan stops verder. Nu is het één Tab.
                tabIndex={sleutel === actieveStop ? 0 : -1}
                role="button"
                aria-label={
                  meerdere
                    ? `${info.length} bedrijven bij ${info[0]?.naam} (${statusTelling(info)})` +
                      (bevatVermoeden ? `, waarvan ${info.filter((p) => p.herkomst === 'lead').length} op een KBO-vermoeden` : '')
                    : `${info[0]?.naam}, ${STATUS_NAAM[info[0]!.status] ?? info[0]?.status}${isLead ? ', KBO-vermoeden' : ''}`
                }
                // Geen `focusRing`: dat is een box-shadow, en die tekent niet op een SVG-element.
                // De ring is de omtrek van het klikdoel hieronder.
                className="group cursor-pointer outline-none"
              >
                {meerdere ? (
                  <>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={11}
                      className="fill-primary/20 stroke-primary"
                      strokeWidth={1.5}
                      strokeDasharray={bevatVermoeden ? '3 2' : undefined}
                    />
                    <text
                      x={c.x}
                      y={c.y + 4}
                      textAnchor="middle"
                      className="fill-foreground text-2xs font-medium"
                    >
                      {info.length}
                    </text>
                  </>
                ) : isLead ? (
                  // Een lead-adres is een vermoeden, geen bronwaarde. Andere vórm, niet
                  // alleen een andere kleur — dat onderscheid moet ook zonder kleur werken.
                  <rect
                    x={c.x - 4}
                    y={c.y - 4}
                    width={8}
                    height={8}
                    transform={`rotate(45 ${c.x} ${c.y})`}
                    className={cn(KLEUR[info[0]!.status], 'stroke-background')}
                    strokeWidth={1}
                  />
                ) : (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={actief ? 7 : 5}
                    className={cn(KLEUR[info[0]!.status], 'stroke-background')}
                    strokeWidth={1}
                  />
                )}
                {/* Het klikdoel: 24 CSS-px, onzichtbaar, bovenaan zodat de focusring over de vorm
                    valt. Zonder stroke buiten focus, anders telt de transparante lijn mee als
                    klikvlak en overlapt hij de buur. `non-scaling-stroke` houdt de ring 2 px. */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={klikStraal}
                  className="fill-transparent stroke-none group-focus-visible:stroke-ring"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  data-klikdoel
                />
              </g>
            )
          })}
        </svg>

        <aside className="w-full shrink-0 lg:w-72" data-kaart-paneel>
          {gekozen ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                {gekozen.length === 1 ? 'Bedrijf' : `${gekozen.length} bedrijven`}
              </h3>
              <ul className="space-y-2">
                {gekozen.map((nr) => {
                  const p = perNummer.get(nr)
                  if (!p) return null
                  return (
                    <li key={nr} className="rounded-md border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{p.naam}</span>
                        {p.herkomst === 'lead' && (
                          <Badge size="sm" variant="outline" className="shrink-0">
                            vermoeden
                          </Badge>
                        )}
                      </div>
                      {p.precisie && p.precisie !== 'huisnummer' && (
                        <p className="mt-0.5 text-2xs text-muted-foreground">
                          locatie op {p.precisie}, niet op huisnummer
                        </p>
                      )}
                      {p.herkomst === 'lijst' && (
                        <div className="mt-2">
                          <StatusActies
                            endpoint={`/api/prospects/${p.nummer}`}
                            status={p.status}
                            naam={p.naam}
                            // De stip en de rij lezen uit `punten`; zonder deze update toonde een
                            // andere stip kiezen en terug de oude status, en veranderde de kleur
                            // van de marker nooit mee (design-review 2026-09-17).
                            onStatusChange={(s) =>
                              setPunten((prev) => prev?.map((q) => (q.nummer === p.nummer ? { ...q, status: s } : q)) ?? prev)
                            }
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Klik een stip aan om te zien welk bedrijf er staat. Een ruit is een lead waarvan het
              adres een KBO-vermoeden is; een cluster met een streepomtrek bevat er minstens één.
            </p>
          )}
          {/* De kleur van een stip is zijn status. Zonder legenda was dat alleen te raden; de naam
              van de marker draagt de status voor wie de kleur niet ziet. */}
          <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted-foreground" data-kaart-legenda>
            {STATUSSEN.map((s) => (
              <li key={s} className="flex items-center gap-1">
                <svg viewBox="0 0 10 10" aria-hidden className="h-2.5 w-2.5">
                  <circle cx={5} cy={5} r={4} className={cn(KLEUR[s], 'stroke-border')} strokeWidth={1} />
                </svg>
                {STATUS_NAAM[s]}
              </li>
            ))}
          </ul>
          {/* Zichtbaar en niet sr-only: ook wie ziet en met het toetsenbord werkt, moet weten dat
              de kaart één tab-stop is. */}
          <p id={hintId} className="mt-2 text-2xs text-muted-foreground">
            Met het toetsenbord: pijltjestoetsen gaan van stip naar stip, Enter kiest.
          </p>
          <p className="mt-4 text-2xs text-muted-foreground">Grenzen: {grenzen.bron}</p>
        </aside>
      </div>
    </div>
  )
}
