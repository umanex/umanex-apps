/**
 * Invarianten op de Adzuna-ophaallaag, met een gestubde `fetch`.
 *
 * Deze suite bestaat omdat de completeness-review vaststelde dat `haalRegio`,
 * `adzunaSource.fetch`, `bouwUrl` en `isMockMode` door geen enkele check geïmporteerd
 * werden. Paginering, het plafond, de per-regio foutafhandeling en de kruis-regio dedupe
 * waren dus alleen op live data ooit gezien — en live data is geen regressietest: die
 * verandert elke dag en kost quota.
 *
 * Geen netwerk: `globalThis.fetch` wordt vervangen door een scenario-functie. Geen echte
 * API-sleutels nodig; de suite zet er zelf placeholders neer zodat de bron uit mock-modus
 * komt en het echte ophaalpad draait.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/adzuna-scenarios.ts
 */
import { adzunaSource } from '../lib/sources/adzuna'
import { ADZUNA_SEARCH } from '../lib/config/profile'
import type { RegionCode } from '../lib/regions'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

// Hard, niet afgeleid uit ADZUNA_SEARCH. Anders schuift de verwachting mee met de
// configuratie en houdt élke waarde stand — dezelfde tautologie als de gewichten-check
// die de vorige ronde blootlegde. Verandert de configuratie bewust, dan hoort deze suite
// te falen en dwingt hij je de verwachting hier bij te stellen.
const PER_PAGINA = 50
const MAX_PAGINAS = 5
const MAX_DAGEN_OUD = 30
const LAND = 'be'

const PROVINCIE: Record<RegionCode, string> = {
  WVL: 'West-Vlaanderen (Provincie)',
  OVL: 'Oost-Vlaanderen (Provincie)',
  BRU: 'Brussel (Regio)',
}

function item(id: string, area: string) {
  return {
    id,
    title: 'UX Designer',
    company: { display_name: 'Acme' },
    location: { display_name: 'Gent', area: ['België', area, 'Gent'] },
    created: '2026-08-01T00:00:00Z',
    description: 'user research en Figma',
  }
}

/** Zet een scenario-fetch neer en geeft de opgevraagde URL's terug. */
function stub(antwoord: (url: string, regio: RegionCode, pagina: number) => unknown): string[] {
  const urls: string[] = []
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input)
    urls.push(url)
    const regio = (Object.keys(PROVINCIE) as RegionCode[]).find((r) =>
      url.includes(`where=${encodeURIComponent(REGIO_ANKER[r])}`)
    )!
    const pagina = Number(url.match(/\/search\/(\d+)/)?.[1] ?? 1)
    const uit = antwoord(url, regio, pagina)
    if (uit instanceof Error) throw uit
    if (typeof uit === 'number') return { ok: false, status: uit, json: async () => ({}) } as Response
    return { ok: true, status: 200, json: async () => uit } as Response
  }) as typeof fetch
  return urls
}

const REGIO_ANKER: Record<RegionCode, string> = { WVL: 'Brugge', OVL: 'Gent', BRU: 'Brussel' }

// De bron moet uit mock-modus komen, anders draait het ophaalpad niet.
process.env.JOBRADAR_MOCK = '0'
process.env.ADZUNA_APP_ID = 'test-id'
process.env.ADZUNA_APP_KEY = 'test-key'

// ── 0. De configuratie is wat deze suite aanneemt ───────────────────────────
check(`resultatenPerPagina == ${PER_PAGINA}`, ADZUNA_SEARCH.resultatenPerPagina === PER_PAGINA, String(ADZUNA_SEARCH.resultatenPerPagina))
check(`maxPaginas == ${MAX_PAGINAS}`, ADZUNA_SEARCH.maxPaginas === MAX_PAGINAS, String(ADZUNA_SEARCH.maxPaginas))
check(`maxDagenOud == ${MAX_DAGEN_OUD}`, ADZUNA_SEARCH.maxDagenOud === MAX_DAGEN_OUD, String(ADZUNA_SEARCH.maxDagenOud))
check(`country == "${LAND}"`, ADZUNA_SEARCH.country === LAND, ADZUNA_SEARCH.country)

// ── 0b. Misvormde antwoorden mogen de bron niet vellen ──────────────────────
// `data.count` stond buiten de try/catch: een body van letterlijk "null" gaf een TypeError
// die aan haalRegio ontsnapte en de per-regio afhandeling omzeilde.
for (const [naam, body] of [
  ['null', null],
  ['leeg object', {}],
  ['results: null', { results: null, count: 10 }],
  ['count als string', { results: [], count: 'veel' }],
  ['results geen array', { results: 'nee' }],
] as Array<[string, unknown]>) {
  stub(() => body)
  let gooide = false
  let uit: Awaited<ReturnType<typeof adzunaSource.fetch>> | null = null
  try {
    uit = await adzunaSource.fetch({ regions: ['OVL'] })
  } catch {
    gooide = true
  }
  check(`misvormd antwoord (${naam}) velt de bron niet`, !gooide)
  check(`misvormd antwoord (${naam}) levert nul items`, uit?.items.length === 0, String(uit?.items.length))
}

// ── 1. Paginering stopt op een niet-volle pagina ─────────────────────────────
{
  const urls = stub((_u, regio, pagina) => ({
    count: 60,
    results: pagina === 1 ? Array.from({ length: PER_PAGINA }, (_, i) => item(`${regio}-1-${i}`, PROVINCIE[regio])) : [item(`${regio}-2-0`, PROVINCIE[regio])],
  }))
  const uit = await adzunaSource.fetch({ regions: ['OVL'] })
  check('paginering haalt pagina 2 op', urls.some((u) => u.includes('/search/2')))
  check('paginering stopt na een niet-volle pagina', !urls.some((u) => u.includes('/search/3')), urls.join('\n'))
  check('alle items komen mee', uit.items.length === PER_PAGINA + 1, String(uit.items.length))
  check('geen plafond-waarschuwing bij een niet-volle laatste pagina', !uit.warnings.some((w) => w.includes('plafond')), JSON.stringify(uit.warnings))
}

// ── 2. Het plafond kapt af, en meldt dat — óók zonder `count` ────────────────
{
  // Id's per pagina uniek: anders ruimt de kruis-regio dedupe pagina 2 t/m 5 op — wat hij
  // terecht doet, maar dan meet dit scenario de dedupe in plaats van het plafond.
  stub((_u, regio, pagina) => ({ count: 999, results: Array.from({ length: PER_PAGINA }, (_, i) => item(`${regio}-x-${pagina}-${i}`, PROVINCIE[regio])) }))
  const met = await adzunaSource.fetch({ regions: ['OVL'] })
  check('plafond stopt op maxPaginas', met.items.length === PER_PAGINA * MAX_PAGINAS, String(met.items.length))
  check('plafond meldt zich mét count', met.warnings.some((w) => w.includes('van 999')), JSON.stringify(met.warnings))

  // Dezelfde afkapping, maar de bron stuurt geen totaal mee. Hierop zweeg de guard.
  stub((_u, regio, pagina) => ({ results: Array.from({ length: PER_PAGINA }, (_, i) => item(`${regio}-y-${pagina}-${i}`, PROVINCIE[regio])) }))
  const zonder = await adzunaSource.fetch({ regions: ['OVL'] })
  check('plafond meldt zich óók zónder count', zonder.warnings.some((w) => w.includes('plafond geraakt')), JSON.stringify(zonder.warnings))
}

// ── 3. Eén gefaalde regio velt de andere niet ────────────────────────────────
{
  stub((_u, regio, pagina) => {
    if (regio === 'BRU') return 429
    return { count: 1, results: pagina === 1 ? [item(`${regio}-ok`, PROVINCIE[regio])] : [] }
  })
  const uit = await adzunaSource.fetch({ regions: ['WVL', 'OVL', 'BRU'] })
  check('de twee gezonde regio\'s leveren gewoon', uit.items.length === 2, String(uit.items.length))
  check('de gefaalde regio meldt zich', uit.warnings.some((w) => w.includes('HTTP 429')), JSON.stringify(uit.warnings))
  check('een fout krijgt geen plafond-waarschuwing erbij', !uit.warnings.some((w) => w.includes('plafond')), JSON.stringify(uit.warnings))
}

// ── 4. Een netwerkfout gedraagt zich als een HTTP-fout ───────────────────────
{
  stub((_u, regio) => (regio === 'WVL' ? new Error('ECONNRESET') : { count: 1, results: [item(`${regio}-ok`, PROVINCIE[regio])] }))
  const uit = await adzunaSource.fetch({ regions: ['WVL', 'OVL'] })
  check('netwerkfout velt de bron niet', uit.items.length === 1, String(uit.items.length))
  check('netwerkfout staat in de waarschuwingen', uit.warnings.some((w) => w.includes('ECONNRESET')), JSON.stringify(uit.warnings))
}

// ── 5. Dezelfde vacature uit twee regio-queries telt één keer ────────────────
// De ankers overlappen fysiek; zonder dedupe haalde een bedrijf zijn drempels met kopieën
// van zichzelf, want de signaal-afleiding krijgt deze lijst rauw binnen.
{
  stub((_u, regio, pagina) =>
    pagina === 1 ? { count: 2, results: [item('gedeeld-1', PROVINCIE[regio]), item(`${regio}-eigen`, PROVINCIE[regio])] } : { results: [] }
  )
  const uit = await adzunaSource.fetch({ regions: ['WVL', 'OVL'] })
  const ids = uit.items.map((j) => j.externalId)
  check('de dubbele vacature komt één keer voor', ids.filter((i) => i === 'gedeeld-1').length === 1, JSON.stringify(ids))
  check('de eigen vacatures blijven', uit.items.length === 3, String(uit.items.length))
  check('de dedupe meldt zich', uit.warnings.some((w) => w.includes('meerdere regio-queries')), JSON.stringify(uit.warnings))
}

// ── 6. Buiten de drie regio's valt weg, en wordt geteld ──────────────────────
{
  stub((_u, regio, pagina) =>
    pagina === 1
      ? { count: 2, results: [item(`${regio}-in`, PROVINCIE[regio]), item(`${regio}-uit`, 'Vlaams-Brabant (Provincie)')] }
      : { results: [] }
  )
  const uit = await adzunaSource.fetch({ regions: ['BRU'] })
  check('de buiten-regio vacature valt weg', uit.items.length === 1, String(uit.items.length))
  check('en wordt gemeld', uit.warnings.some((w) => w.includes('buiten de regio')), JSON.stringify(uit.warnings))
}

// ── 7. De opgevraagde URL draagt wat hij hoort te dragen ─────────────────────
{
  const urls = stub((_u, regio, pagina) => (pagina === 1 ? { count: 1, results: [item(`${regio}-1`, PROVINCIE[regio])] } : { results: [] }))
  await adzunaSource.fetch({ regions: ['WVL'] })
  const u = urls[0] ?? ''
  check('URL draagt het recency-filter', u.includes('max_days_old=30'), u)
  check('URL draagt de paginagrootte', u.includes('results_per_page=50'), u)
  check('URL draagt het regio-anker', u.includes('where=Brugge'), u)
  check('URL draagt het land', u.includes('/jobs/be/search/'), u)
}

// ── 8. Mock-modus raakt het netwerk niet ─────────────────────────────────────
{
  process.env.JOBRADAR_MOCK = '1'
  let geraakt = false
  globalThis.fetch = (async () => {
    geraakt = true
    throw new Error('mock-modus mag niet fetchen')
  }) as typeof fetch
  const uit = await adzunaSource.fetch({ regions: ['WVL'] })
  check('mock-modus doet geen enkel verzoek', !geraakt)
  check('mock-modus levert fixtures', uit.items.length > 0 && uit.items.every((j) => j.region === 'WVL'))
  process.env.JOBRADAR_MOCK = '0'
}

// ── 9. Fixtures alleen op expliciet verzoek ─────────────────────────────────
// Een ontbrekende API-sleutel gold als "gebruik fixtures", en dat zette tien verzonnen
// bedrijven in de échte database — met namen die op bestaande bedrijven lijken, zonder dat
// iets het meldde. Opgeruimde mock-rijen kwamen bij de volgende sync gewoon terug.
{
  const bewaardeSleutels = [process.env.ADZUNA_APP_ID, process.env.ADZUNA_APP_KEY]

  delete process.env.ADZUNA_APP_ID
  delete process.env.ADZUNA_APP_KEY
  process.env.JOBRADAR_MOCK = '0'
  let geraakt = false
  globalThis.fetch = (async () => {
    geraakt = true
    throw new Error('zonder sleutels mag er niet gefetcht worden')
  }) as typeof fetch

  const zonder = await adzunaSource.fetch({ regions: ['WVL'] })
  check('zonder sleutels: geen fixtures', zonder.items.length === 0, String(zonder.items.length))
  check('zonder sleutels: geen netwerkverkeer', !geraakt)
  check('zonder sleutels: het wordt gemeld', zonder.warnings.some((w) => w.includes('ontbreken')), JSON.stringify(zonder.warnings))

  process.env.JOBRADAR_MOCK = '1'
  const met = await adzunaSource.fetch({ regions: ['WVL'] })
  check('mock-vlag: wél fixtures', met.items.length > 0)
  check('mock-vlag: en een waarschuwing dat ze verzonnen zijn', met.warnings.some((w) => w.includes('MOCK')), JSON.stringify(met.warnings))

  process.env.JOBRADAR_MOCK = '0'
  if (bewaardeSleutels[0]) process.env.ADZUNA_APP_ID = bewaardeSleutels[0]
  if (bewaardeSleutels[1]) process.env.ADZUNA_APP_KEY = bewaardeSleutels[1]
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
