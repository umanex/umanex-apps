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
import { adzunaSource, haalMetGeduld, telTreffers } from '../lib/sources/adzuna'
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

/** Geen pauzes en geen wachttijd tussen herkansingen: de suite toetst gedrag, niet geduld. */
const SNEL = { pauzeMs: 0, retryPauzeMs: 0 }

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
// Vastgepind: de zoekopdracht is op de live API gemeten (zie de doc-comment bij whatOr).
// Wijzig je hem, meet dan opnieuw en werk deze verwachting bij — anders schuift precisie
// en recall stil mee.
check('whatOr is de gemeten variant', ADZUNA_SEARCH.whatOr === 'UX UI frontend front-end webdesign developer designer', ADZUNA_SEARCH.whatOr)
check('whatUitsluiten is smal gehouden', ADZUNA_SEARCH.whatUitsluiten.split(' ').length <= 8, ADZUNA_SEARCH.whatUitsluiten)

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
    uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['OVL'] })
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
  const uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['OVL'] })
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
  const met = await adzunaSource.fetch({ netwerk: SNEL, regions: ['OVL'] })
  check('plafond stopt op maxPaginas', met.items.length === PER_PAGINA * MAX_PAGINAS, String(met.items.length))
  check('plafond meldt zich mét count', met.warnings.some((w) => w.includes('van 999')), JSON.stringify(met.warnings))

  // Dezelfde afkapping, maar de bron stuurt geen totaal mee. Hierop zweeg de guard.
  stub((_u, regio, pagina) => ({ results: Array.from({ length: PER_PAGINA }, (_, i) => item(`${regio}-y-${pagina}-${i}`, PROVINCIE[regio])) }))
  const zonder = await adzunaSource.fetch({ netwerk: SNEL, regions: ['OVL'] })
  check('plafond meldt zich óók zónder count', zonder.warnings.some((w) => w.includes('plafond geraakt')), JSON.stringify(zonder.warnings))
}

// ── 3. Eén gefaalde regio velt de andere niet ────────────────────────────────
{
  stub((_u, regio, pagina) => {
    if (regio === 'BRU') return 429
    return { count: 1, results: pagina === 1 ? [item(`${regio}-ok`, PROVINCIE[regio])] : [] }
  })
  const uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL', 'OVL', 'BRU'] })
  check('de twee gezonde regio\'s leveren gewoon', uit.items.length === 2, String(uit.items.length))
  check('de gefaalde regio meldt zich', uit.warnings.some((w) => w.includes('429')), JSON.stringify(uit.warnings))
  check('een fout krijgt geen plafond-waarschuwing erbij', !uit.warnings.some((w) => w.includes('plafond')), JSON.stringify(uit.warnings))
}

// ── 4. Een netwerkfout gedraagt zich als een HTTP-fout ───────────────────────
{
  stub((_u, regio) => (regio === 'WVL' ? new Error('ECONNRESET') : { count: 1, results: [item(`${regio}-ok`, PROVINCIE[regio])] }))
  const uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL', 'OVL'] })
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
  const uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL', 'OVL'] })
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
  const uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['BRU'] })
  check('de buiten-regio vacature valt weg', uit.items.length === 1, String(uit.items.length))
  check('en wordt gemeld', uit.warnings.some((w) => w.includes('buiten de regio')), JSON.stringify(uit.warnings))
}

// ── 7. De opgevraagde URL draagt wat hij hoort te dragen ─────────────────────
{
  const urls = stub((_u, regio, pagina) => (pagina === 1 ? { count: 1, results: [item(`${regio}-1`, PROVINCIE[regio])] } : { results: [] }))
  await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL'] })
  const u = urls[0] ?? ''
  check('URL draagt het recency-filter', u.includes('max_days_old=30'), u)
  check('URL draagt de paginagrootte', u.includes('results_per_page=50'), u)
  check('URL draagt het regio-anker', u.includes('where=Brugge'), u)
  check('URL draagt het land', u.includes('/jobs/be/search/'), u)
  check('URL draagt de uitsluitingen', u.includes('what_exclude=mechanical'), u)
  // `product` matchte ook "productie" en haalde daarmee magazijn- en winkelwerk binnen.
  check('zoektermen bevatten "product" niet meer', !/(^|[^a-z])product([^a-z]|$)/i.test(ADZUNA_SEARCH.whatOr), ADZUNA_SEARCH.whatOr)
  check('zoektermen bevatten "designer" nog wél', /designer/i.test(ADZUNA_SEARCH.whatOr), ADZUNA_SEARCH.whatOr)
}

// ── 8. Mock-modus raakt het netwerk niet ─────────────────────────────────────
{
  process.env.JOBRADAR_MOCK = '1'
  let geraakt = false
  globalThis.fetch = (async () => {
    geraakt = true
    throw new Error('mock-modus mag niet fetchen')
  }) as typeof fetch
  const uit = await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL'] })
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

  const zonder = await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL'] })
  check('zonder sleutels: geen fixtures', zonder.items.length === 0, String(zonder.items.length))
  check('zonder sleutels: geen netwerkverkeer', !geraakt)
  check('zonder sleutels: het wordt gemeld', zonder.warnings.some((w) => w.includes('ontbreken')), JSON.stringify(zonder.warnings))

  process.env.JOBRADAR_MOCK = '1'
  const met = await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL'] })
  check('mock-vlag: wél fixtures', met.items.length > 0)
  check('mock-vlag: en een waarschuwing dat ze verzonnen zijn', met.warnings.some((w) => w.includes('MOCK')), JSON.stringify(met.warnings))

  process.env.JOBRADAR_MOCK = '0'
  if (bewaardeSleutels[0]) process.env.ADZUNA_APP_ID = bewaardeSleutels[0]
  if (bewaardeSleutels[1]) process.env.ADZUNA_APP_KEY = bewaardeSleutels[1]
}

// ── 10. Geduld bij een 429 ──────────────────────────────────────────────────
// Adzuna stuurt geen limiet-headers, dus een 429 is het enige signaal dat we te snel
// vragen. Vóór dit pad stopte één 429 de hele regio bij die pagina, en kwam de rest pas de
// vólgende sync binnen.
{
  let pogingen = 0
  const stubMet = (statussen: number[]) => {
    pogingen = 0
    globalThis.fetch = (async () => {
      const status = statussen[Math.min(pogingen, statussen.length - 1)]!
      pogingen++
      if (status !== 200) return { ok: false, status, json: async () => ({}) } as Response
      return { ok: true, status: 200, json: async () => ({ count: 1, results: [] }) } as Response
    }) as typeof fetch
  }

  stubMet([429, 200])
  const na1 = await haalMetGeduld('https://test.invalid/x', { pauzeMs: 0, retryPauzeMs: 0 })
  check('één 429 wordt opnieuw geprobeerd', na1.status === 200, String(na1.status))
  check('en dat kostte precies twee pogingen', pogingen === 2, String(pogingen))

  stubMet([429, 429, 200])
  const na2 = await haalMetGeduld('https://test.invalid/x', { pauzeMs: 0, retryPauzeMs: 0 })
  check('twee keer 429 wordt ook nog opgevangen', na2.status === 200, String(na2.status))

  stubMet([429])
  const op = await haalMetGeduld('https://test.invalid/x', { pauzeMs: 0, retryPauzeMs: 0, retries: 2 })
  check('na de herkansingen geeft hij de 429 terug', op.status === 429)
  check('en probeert hij niet eindeloos door', pogingen === 3, String(pogingen))

  stubMet([500, 200])
  const vijf = await haalMetGeduld('https://test.invalid/x', { pauzeMs: 0, retryPauzeMs: 0 })
  check('een 500 wordt NIET opnieuw geprobeerd', vijf.status === 500 && pogingen === 1, `status ${vijf.status}, ${pogingen} pogingen`)

  // De regio's gaan serieel: parallel was het burst-patroon dat de 429's uitlokte.
  const volgorde: string[] = []
  globalThis.fetch = (async (input: string | URL) => {
    const u = String(input)
    const regio = ['Brugge', 'Gent', 'Brussel'].find((p) => u.includes(`where=${p}`)) ?? '?'
    volgorde.push('start ' + regio)
    await new Promise((r) => setTimeout(r, 5))
    volgorde.push('klaar ' + regio)
    return { ok: true, status: 200, json: async () => ({ count: 0, results: [] }) } as Response
  }) as typeof fetch
  await adzunaSource.fetch({ netwerk: SNEL, regions: ['WVL', 'OVL', 'BRU'] })
  const overlappend = volgorde.some((_, i) => i > 0 && volgorde[i]!.startsWith('start') && volgorde[i - 1]!.startsWith('start'))
  check('regio\'s worden serieel opgehaald, niet tegelijk', !overlappend, volgorde.join(' → '))
}

// ── 11. De deelvraag-laag ───────────────────────────────────────────────────
// Deze hele laag was ongedekt: drie sloopmutaties bleven 646/646 groen. `telTreffers` werd
// door geen enkele suite geïmporteerd, alleen door de test-route.
{
  const ZOEK_MET_ZIN = { termen: ['ux'], zinsnedes: ['design system', 'user experience'], uitsluiten: [] }

  // Welke verzoeken gaan eruit, en met welke parameter?
  const urls = stub(() => ({ count: 5, results: [] }))
  await telTreffers('OVL', ZOEK_MET_ZIN, SNEL)
  check('één verzoek per deelvraag', urls.length === 3, String(urls.length))
  check('het eerste verzoek gebruikt what_or', urls[0]?.includes('what_or=ux') === true, urls[0])
  check('de zinsnede-verzoeken gebruiken what_phrase', urls.slice(1).every((u) => u.includes('what_phrase=')), JSON.stringify(urls.slice(1)))
  check('een zinsnede-verzoek zet geen what_or', urls.slice(1).every((u) => !u.includes('what_or=')), JSON.stringify(urls.slice(1)))
  check('elk verzoek vraagt maar één resultaat', urls.every((u) => u.includes('results_per_page=1')))

  // Het plafond geldt PER deelvraag. Dit is de P1: de som tegen een meegroeiende drempel
  // leggen zette de waarschuwing uit zodra je een zinsnede toevoegde.
  const PLAFOND = 250
  stub((_u, _r, _p) => ({ count: PLAFOND + 50, results: [] }))
  const alleenWoorden = await telTreffers('OVL', { termen: ['ux'], zinsnedes: [], uitsluiten: [] }, SNEL)
  check('woordenvraag boven het plafond → afgekapt', alleenWoorden.afgekapt === true, JSON.stringify(alleenWoorden))

  // Dezelfde woordenvraag, maar nu met drie zinsnedes die NIETS vinden. De afkapping van de
  // woordenvraag mag daardoor niet verdwijnen.
  let beurt = 0
  stub(() => ({ count: beurt++ === 0 ? PLAFOND + 50 : 0, results: [] }))
  const metLegeZinnen = await telTreffers('OVL', { termen: ['ux'], zinsnedes: ['a b', 'c d', 'e f'], uitsluiten: [] }, SNEL)
  check('lege zinsnedes verbergen de afkapping niet', metLegeZinnen.afgekapt === true, JSON.stringify(metLegeZinnen))
  check('de som telt alleen wat er is', metLegeZinnen.treffers === PLAFOND + 50, String(metLegeZinnen.treffers))

  // Onder het plafond blijft onder het plafond, hoeveel deelvragen er ook zijn.
  stub(() => ({ count: 10, results: [] }))
  const rustig = await telTreffers('OVL', ZOEK_MET_ZIN, SNEL)
  check('alles onder het plafond → niet afgekapt', rustig.afgekapt === false, JSON.stringify(rustig))
  check('meerdere deelvragen → de som is een bovengrens', rustig.bovengrens === true)
  const enkel = await telTreffers('OVL', { termen: ['ux'], zinsnedes: [], uitsluiten: [] }, SNEL)
  check('één deelvraag → geen bovengrens-voorbehoud', enkel.bovengrens === false)

  // Een tijdelijke 429 hoort door de herkansing opgevangen te worden — dat is precies waar
  // haalMetGeduld voor bestaat, en het is hier per ongeluk ontdekt door een te strenge check.
  let n = 0
  stub(() => (n++ === 1 ? 429 : { count: 5, results: [] }))
  const hersteld = await telTreffers('OVL', ZOEK_MET_ZIN, SNEL)
  check('een enkele 429 wordt door de herkansing opgevangen', hersteld.fout === undefined, JSON.stringify(hersteld))
  check('en de telling is volledig', hersteld.treffers === 15, String(hersteld.treffers))

  // Een blijvende fout hoort de telling als geheel ongeldig te maken, niet half.
  stub(() => 429)
  const stuk = await telTreffers('OVL', ZOEK_MET_ZIN, SNEL)
  check('een blijvende 429 geeft een fout terug', stuk.fout !== undefined, JSON.stringify(stuk))
  check('en geen half getal', stuk.treffers === 0, String(stuk.treffers))
  check('de foutmelding noemt de oorzaak', /te veel verzoeken/.test(stuk.fout ?? ''), stuk.fout)

  // Ophalen: dubbels tussen deelvragen worden binnen de regio opgeruimd.
  stub((_u, regio, pagina) =>
    pagina === 1
      ? { count: 2, results: [item('gedeeld', PROVINCIE[regio]), item(`${regio}-eigen`, PROVINCIE[regio])] }
      : { results: [] }
  )
  const opgehaald = await adzunaSource.fetch({ netwerk: SNEL, regions: ['OVL'], zoek: ZOEK_MET_ZIN })
  const ids = opgehaald.items.map((j) => j.externalId)
  check('dezelfde vacature uit twee deelvragen komt één keer voor', ids.filter((i) => i === 'gedeeld').length === 1, JSON.stringify(ids))
  check('de waarschuwingen dragen de zinsnede als etiket', opgehaald.warnings.every((w) => !w.includes('design system')) || opgehaald.warnings.some((w) => w.includes('"design system"')), JSON.stringify(opgehaald.warnings))
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
