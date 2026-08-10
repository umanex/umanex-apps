/**
 * Invarianten op de scorekern en de signaal-afleiding.
 *
 * Waarom invarianten en geen verwachte uitkomsten per geval: de leadscore is een *afgeleide*
 * waarde. Hij volgt uit de signalen, die volgen uit de classificatie van vacatures, die volgt
 * uit de keyword-match. Wie per scherm of per geval controleert, fixt de instanties en laat
 * de klasse leven. Deze suite rekent daarom regels uit die over de héle dataset moeten gelden.
 *
 * Draaien:  pnpm --filter jobradar scenarios
 * Rauw:     node --import ./scripts/ts-resolve.mjs scripts/signal-scenarios.ts
 */
import { scoreJob, scoreLead, jobDedupeHash, kiesDedupeHash, matchedSkills, normaliseerBedrijf } from '../lib/matching'
import { deriveLeadsFromJobs, bouwBedrijfsprofielen, mergeSignalen, classificeer, AFGELEIDE_BRON } from '../lib/signals'
import { regionForArea, ALL_REGIONS } from '../lib/regions'
import { SIGNAL_WEIGHTS, SIGNAL_THRESHOLDS, AFGELEIDE_SIGNALEN } from '../lib/config/profile'
import { ADZUNA_JOB_FIXTURES } from '../lib/sources/fixtures/adzuna-jobs'
import { normaliseerAdzunaItem } from '../lib/sources/adzuna'
import type { RawJob } from '../lib/sources/types'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) {
    geslaagd++
  } else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

function job(over: Partial<RawJob> & Pick<RawJob, 'title' | 'company'>): RawJob {
  return {
    externalId: `t-${over.title}-${over.company}`,
    postcode: 0,
    city: null,
    region: 'OVL',
    url: 'https://example.test',
    source: 'test',
    description: '',
    postedAt: NU.toISOString(),
    ...over,
  }
}

/** Vast referentiemoment: de recency-invariant mag niet van de kalender afhangen. */
const NU = new Date('2026-08-10T12:00:00.000Z')
const dagenGeleden = (n: number) => new Date(NU.getTime() - n * 86_400_000).toISOString()

// ── 1. Score is de som van zijn eigen breakdown ──────────────────────────────
// De kaart toont de breakdown als verklaring van de score. Lopen die uiteen, dan liegt
// de tooltip — en niets in de UI zou dat opmerken.
for (const j of ADZUNA_JOB_FIXTURES) {
  const { score, breakdown } = scoreJob(j)
  const som = Object.values(breakdown).reduce((a, b) => a + b, 0)
  check(`score==som(breakdown) voor "${j.title}"`, score === Math.min(100, som), `${score} vs ${som}`)
}

// ── 2. Woordgrens: fragmenten mogen niet vuren ───────────────────────────────
// Dit is de klasse die de hele afleiding kon vergiftigen: `includes('ui')` vuurt op
// "gebruikers", waardoor élke Nederlandstalige vacature als UI-werk telde.
const RUIS = ['gebruikers', 'herbruikbare', 'requirements', 'guidelines', 'build', 'luxe', 'reactie', 'productie']
for (const woord of RUIS) {
  const { score, breakdown } = scoreJob({ title: 'Magazijnier', description: `We zoeken ${woord} ervaring.` })
  check(`ruiswoord "${woord}" scoort 0`, score === 0, `kreeg ${score} via ${JSON.stringify(breakdown)}`)
}
const ECHT: Array<[string, string]> = [
  ['UX Designer', 'ux'],
  ['UI Designer', 'ui'],
  ['Frontend Developer', 'frontend'],
  ['Product Designer', 'product'],
  ['React Developer', 'react'],
]
for (const [titel, verwacht] of ECHT) {
  check(`"${titel}" matcht ${verwacht}`, matchedSkills({ title: titel, description: '' }).includes(verwacht as never))
}
check('"UI/UX Designer" matcht ui én ux', (() => {
  const s = matchedSkills({ title: 'UI/UX Designer', description: '' })
  return s.includes('ui') && s.includes('ux')
})())

// ── 3. Leadscore is de som van zijn signaalgewichten ─────────────────────────
// De verwachte uitkomsten staan hier hard, niet herberekend uit SIGNAL_WEIGHTS.
// Hiervóór deed de check `SIGNAL_WEIGHTS[s] ?? 5` — precies de uitdrukking uit de
// implementatie, fallback inbegrepen — waardoor de gelijkheid standhield voor élke
// gewichtentabel. Een hernoemde of weggevallen sleutel viel aan beide kanten op 5 terug en
// bleef onzichtbaar; `Record<string, number>` laat tsc er ook niet over vallen.
const VERWACHT: Array<[string[], number]> = [
  [['UX-budget aanwezig'], 25],
  [['dev-vacature zonder design', 'digital product team'], 55],
  [['dev-vacature zonder design', 'recente groei', 'startup'], 65],
  [['dev-vacature zonder design', 'digital product team', 'recente groei', 'UX-budget aanwezig', 'series A+', 'startup', 'no designer on team'], 100],
  [[], 0],
]
for (const [signals, verwacht] of VERWACHT) {
  const { score, breakdown } = scoreLead({ signals })
  check(`leadScore is ${verwacht} voor [${signals.join(', ')}]`, score === verwacht, String(score))
  check(
    `breakdown dekt elk signaal voor [${signals.join(', ')}]`,
    Object.keys(breakdown).length === new Set(signals).size
  )
}
// En de tabel zelf: een hernoemde sleutel valt hier op, niet pas in de UI.
for (const [naam, gewicht] of Object.entries({
  'dev-vacature zonder design': 30,
  'digital product team': 25,
  'recente groei': 20,
  'UX-budget aanwezig': 25,
  startup: 15,
  'series A+': 20,
  'no designer on team': 30,
})) {
  check(`SIGNAL_WEIGHTS["${naam}"] == ${gewicht}`, SIGNAL_WEIGHTS[naam] === gewicht, String(SIGNAL_WEIGHTS[naam]))
}
check('elk afgeleid signaal heeft een expliciet gewicht', AFGELEIDE_SIGNALEN.every((s) => typeof SIGNAL_WEIGHTS[s] === 'number'))

// ── 4. Permutatie-invariantie ────────────────────────────────────────────────
// Als de volgorde van de vacaturelijst de uitkomst verandert, verandert een leadscore
// doordat een bron zijn paginering wijzigt. Dat is precies de stille drift die deze
// suite moet uitsluiten.
// Bedrijven staan bewust in méér dan één regio en met verschillende postcodes: de
// determinisme-logica voor regio en postcode werd anders door geen enkele permutatie
// geraakt, en `groep[0].region` zou de suite gewoon zijn gepasseerd.
const GEMENGD: RawJob[] = [
  job({ title: 'Frontend Developer', company: 'Acme BV', description: 'React en TypeScript', region: 'OVL', postcode: 9000 }),
  job({ title: 'Backend Developer', company: 'Acme BV', description: 'Node en Postgres', region: 'WVL', postcode: 8000 }),
  job({ title: 'UX Designer', company: 'Beta NV', description: 'user research', region: 'WVL', postcode: 8500 }),
  job({ title: 'React Developer', company: 'Beta NV', description: 'React', region: 'BRU', postcode: 1000 }),
  job({ title: 'Mechanical Designer', company: 'Gamma', description: 'constructietekeningen', region: 'BRU' }),
  job({ title: 'Next.js Developer', company: 'acme bv', description: 'Next.js', region: 'OVL', postcode: 9000 }),
]
const basis = JSON.stringify(deriveLeadsFromJobs(GEMENGD, NU))
for (let i = 0; i < 12; i++) {
  // Deterministische permutatie: rotatie + omkering, geen Math.random — een suite die
  // per run iets anders test, is geen regressietest.
  const geroteerd = [...GEMENGD.slice(i % GEMENGD.length), ...GEMENGD.slice(0, i % GEMENGD.length)]
  const volgorde = i % 2 === 0 ? geroteerd : geroteerd.reverse()
  check(`permutatie ${i} geeft dezelfde leads`, JSON.stringify(deriveLeadsFromJobs(volgorde, NU)) === basis)
  // Expliciet ook op regio en postcode, want die staan niet in élke lead-vergelijking los
  // genoeg om een `groep[0]`-mutant te betrappen.
  const profielen = bouwBedrijfsprofielen(volgorde, NU)
  check(
    `permutatie ${i} kiest dezelfde regio en postcode`,
    JSON.stringify(profielen.map((p) => [p.bedrijfssleutel, p.region, p.postcode])) ===
      JSON.stringify(bouwBedrijfsprofielen(GEMENGD, NU).map((p) => [p.bedrijfssleutel, p.region, p.postcode]))
  )
}
// En de tiebreak moet écht een keuze maken, niet de eerste rij overnemen: Acme staat 2× OVL
// tegen 1× WVL, dus OVL hoort te winnen ongeacht waar de WVL-rij in de lijst staat.
{
  const acmeProfiel = bouwBedrijfsprofielen(GEMENGD, NU).find((p) => p.bedrijfssleutel === 'acme')
  check('meerderheidsregio wint van de eerste rij', acmeProfiel?.region === 'OVL', acmeProfiel?.region)
  check('meerderheidspostcode wint van de eerste rij', acmeProfiel?.postcode === 9000, String(acmeProfiel?.postcode))
}

// ── 4b. De titel beslist over de rol ─────────────────────────────────────────
// De faalklasse die de suite hiervóór niet zag: op titel én omschrijving samen matchen, met
// design eerst getest, laat één terloopse zin een dev-vacature omklappen. Over de fixtureset
// vuurde het zwaarste signaal daardoor nul keer — en de uitsluitings-check hieronder slaagde
// vacuüm, omdat er niets meer langskwam om uit te sluiten.
const CLASSIFICATIE: Array<[string, string, 'design' | 'dev' | null]> = [
  ['Frontend Developer', 'React en TypeScript verplicht, UX affiniteit is een pluspunt.', 'dev'],
  ['Frontend Developer', 'Je bouwt en onderhoudt ons design system in React.', 'dev'],
  ['UX Designer', 'Je werkt nauw samen met React-developers.', 'design'],
  ['UI Developer — React/TypeScript', '', 'dev'],
  ['UI/UX Designer — Design System', '', 'design'],
  ['Senior Product Designer', '', 'design'],
  ['Frontend Engineer — Next.js', 'Figma-kennis is mooi meegenomen.', 'dev'],
  ['Mechanical Designer', 'Constructietekeningen van inox machines.', null],
  ['Boekhouder', 'Je verwerkt facturen.', null],
  // Titel zegt niets over de rol → dan pas de omschrijving, en alleen bij een meerderheid.
  ['Software Engineer', 'Je werkt met React, TypeScript en Next.js.', 'dev'],
  ['Creative Lead', 'Je stuurt het UX-team aan en werkt in Figma.', 'design'],
]
for (const [title, description, verwacht] of CLASSIFICATIE) {
  const uit = classificeer({ title, description })
  check(`"${title.slice(0, 34)}" → ${verwacht ?? 'geen'}`, uit === verwacht, `kreeg ${uit ?? 'geen'}`)
}

// En het signaal moet over de échte fixtureset ook daadwerkelijk vuren — anders is de
// uitsluitings-check hieronder een wachter voor een deur waar niemand langskomt.
{
  const uitFixtures = deriveLeadsFromJobs(ADZUNA_JOB_FIXTURES, new Date('2026-05-27T00:00:00.000Z'))
  check(
    '"dev-vacature zonder design" vuurt over de fixtures',
    uitFixtures.some((l) => l.signals.includes('dev-vacature zonder design')),
    JSON.stringify(uitFixtures.map((l) => l.signals))
  )
  check(
    '"UX-budget aanwezig" vuurt óók over de fixtures',
    uitFixtures.some((l) => l.signals.includes('UX-budget aanwezig'))
  )
}

// ── 5. Wederzijdse uitsluiting van de twee kernsignalen ──────────────────────
// "Er is designbudget" en "er komt geen designer aan te pas" kunnen niet allebei waar zijn.
// Vuren ze samen, dan is de classificatie stuk — en juist die twee dragen het meeste gewicht.
for (const lead of deriveLeadsFromJobs([...GEMENGD, ...ADZUNA_JOB_FIXTURES], NU)) {
  check(
    `"${lead.companyName}" niet tegelijk met- en zonder designbudget`,
    !(lead.signals.includes('UX-budget aanwezig') && lead.signals.includes('dev-vacature zonder design')),
    JSON.stringify(lead.signals)
  )
  check(`"${lead.companyName}" spreekt alleen afgeleide signalen`, lead.signals.every((s) => (AFGELEIDE_SIGNALEN as readonly string[]).includes(s)))
  check(`"${lead.companyName}" heeft minstens één signaal`, lead.signals.length > 0)
  check(`"${lead.companyName}" draagt de afgeleide bron`, lead.source === AFGELEIDE_BRON)
  check(`"${lead.companyName}" heeft een geldige regio`, ALL_REGIONS.includes(lead.region))
}

// ── 6. De classificatie zelf ─────────────────────────────────────────────────
const acme = bouwBedrijfsprofielen(GEMENGD, NU).find((p) => p.bedrijfssleutel === 'acme')
check('Acme is één bedrijf ondanks "BV" en kleine letters', acme !== undefined && acme.totaalVacatures === 3)
check('Acme telt 2 dev-vacatures', acme?.devVacatures === 2, `kreeg ${acme?.devVacatures}`)
check('Acme telt 0 design-vacatures', acme?.designVacatures === 0)
check('Acme krijgt "dev-vacature zonder design"', acme?.signals.includes('dev-vacature zonder design') === true)
check('Acme krijgt geen "UX-budget aanwezig"', acme?.signals.includes('UX-budget aanwezig') !== true)

const beta = bouwBedrijfsprofielen(GEMENGD, NU).find((p) => p.bedrijfssleutel === 'beta')
check('Beta krijgt "UX-budget aanwezig"', beta?.signals.includes('UX-budget aanwezig') === true)
check('Beta krijgt geen "dev-vacature zonder design"', beta?.signals.includes('dev-vacature zonder design') !== true)

const gamma = bouwBedrijfsprofielen(GEMENGD, NU).find((p) => p.bedrijfssleutel === 'gamma')
check('Mechanical Designer telt niet als design', gamma?.designVacatures === 0)
check('Mechanical Designer telt niet als dev', gamma?.devVacatures === 0)
check('Gamma levert geen lead op', !deriveLeadsFromJobs(GEMENGD, NU).some((l) => l.companyName === 'Gamma'))

// ── 7. Drempels doen wat ze beloven ──────────────────────────────────────────
const netOnder = Array.from({ length: SIGNAL_THRESHOLDS.productteamVacatures - 1 }, (_, i) =>
  job({ title: `Frontend Developer ${i}`, company: 'Delta', description: 'React' })
)
const netBoven = [...netOnder, job({ title: 'Frontend Developer x', company: 'Delta', description: 'React' })]
check(
  `${netOnder.length} relevante vacatures → geen productteam`,
  !bouwBedrijfsprofielen(netOnder, NU)[0]?.signals.includes('digital product team')
)
check(
  `${netBoven.length} relevante vacatures → wel productteam`,
  bouwBedrijfsprofielen(netBoven, NU)[0]?.signals.includes('digital product team') === true
)

const oud = Array.from({ length: SIGNAL_THRESHOLDS.groeiVacatures }, (_, i) =>
  job({
    title: `Frontend Developer ${i}`,
    company: 'Epsilon',
    description: 'React',
    postedAt: dagenGeleden(SIGNAL_THRESHOLDS.groeiVensterDagen + 5),
  })
)
const vers = oud.map((j) => ({ ...j, postedAt: dagenGeleden(1) }))
check('oude vacatures geven geen "recente groei"', !bouwBedrijfsprofielen(oud, NU)[0]?.signals.includes('recente groei'))
check('verse vacatures geven wel "recente groei"', bouwBedrijfsprofielen(vers, NU)[0]?.signals.includes('recente groei') === true)
check('een vacature uit de toekomst telt niet als recent', (() => {
  const toekomst = vers.map((j) => ({ ...j, postedAt: new Date(NU.getTime() + 86_400_000).toISOString() }))
  return !bouwBedrijfsprofielen(toekomst, NU)[0]?.signals.includes('recente groei')
})())
check('een onleesbare datum telt niet als recent', (() => {
  const kapot = vers.map((j) => ({ ...j, postedAt: 'binnenkort' }))
  return !bouwBedrijfsprofielen(kapot, NU)[0]?.signals.includes('recente groei')
})())

// ── 8. mergeSignalen is idempotent en spaart vreemde signalen ────────────────
// Twee keer synchroniseren mag de signaallijst niet laten groeien, en een signaal uit een
// andere bron mag niet gewist worden door een afgeleide run.
const BESTAAND = ['series A+', 'startup', 'recente groei', 'UX-budget aanwezig']
const AFGELEID = ['dev-vacature zonder design']
const eenmaal = mergeSignalen(BESTAAND, AFGELEID)
const tweemaal = mergeSignalen(eenmaal, AFGELEID)
check('merge is idempotent', JSON.stringify(eenmaal) === JSON.stringify(tweemaal), JSON.stringify({ eenmaal, tweemaal }))
check('merge behoudt vreemde signalen', ['series A+', 'startup'].every((s) => eenmaal.includes(s)))
check('merge laat verdwenen afgeleide signalen vallen', !eenmaal.includes('recente groei'))
check('merge neemt het nieuwe afgeleide signaal op', eenmaal.includes('dev-vacature zonder design'))
check('merge geeft geen duplicaten', eenmaal.length === new Set(eenmaal).size)
check('merge is volgorde-onafhankelijk in zijn invoer', (() => {
  const a = mergeSignalen([...BESTAAND].reverse(), AFGELEID)
  return JSON.stringify(a) === JSON.stringify(eenmaal)
})())

// ── 9. Dedupe-sleutel scheidt wat gescheiden hoort ───────────────────────────
// Dit is de invariant die de postcode-0-bug had gevangen: twee vacatures met dezelfde
// titel bij hetzelfde bedrijf in verschillende steden vielen tot één rij samen.
const gent = job({ title: 'UX Designer', company: 'Acme', city: 'Gent' })
const brugge = job({ title: 'UX Designer', company: 'Acme', city: 'Brugge' })
check('zelfde titel, andere stad → andere hash', jobDedupeHash(gent) !== jobDedupeHash(brugge))
// Twee losse ophalingen van dezelfde vacature: andere bron-id, andere url, andere datum —
// de sleutel hoort alleen naar titel, bedrijf en plaats te kijken.
const gentOpnieuw = job({
  title: 'UX Designer',
  company: 'Acme',
  city: 'Gent',
  externalId: 'anders',
  url: 'https://elders.test',
  postedAt: dagenGeleden(9),
})
check('zelfde vacature via een andere bron-id → zelfde hash', jobDedupeHash(gent) === jobDedupeHash(gentOpnieuw))
check('hoofdletters in de stad veranderen de hash niet', jobDedupeHash(gent) === jobDedupeHash({ ...gent, city: 'GENT' }))
check('rechtsvorm verandert de hash niet', jobDedupeHash({ ...gent, company: 'Acme BV' }) === jobDedupeHash(gent))
check('zonder stad valt de hash terug op de postcode', (() => {
  const a = job({ title: 'UX Designer', company: 'Acme', postcode: 9000 })
  const b = job({ title: 'UX Designer', company: 'Acme', postcode: 8000 })
  return jobDedupeHash(a) !== jobDedupeHash(b)
})())
check('normaliseerBedrijf haalt de rechtsvorm weg', normaliseerBedrijf('Acme BV') === normaliseerBedrijf('ACME'))

// De keerzijde van diezelfde normalisatie, op een bestáánde database: "Acme BV" en "Acme NV"
// bleven onder de oude hash uit elkaar en vallen onder de nieuwe samen. Blind bijwerken gaf
// SQLITE_CONSTRAINT_UNIQUE en velde de hele sync — gereproduceerd vóór `kiesDedupeHash`.
const botsend = jobDedupeHash(job({ title: 'UX Designer', company: 'Acme BV', postcode: 9000 }))
check('BV en NV botsen inderdaad op dezelfde nieuwe sleutel', botsend === jobDedupeHash(job({ title: 'UX Designer', company: 'Acme NV', postcode: 9000 })))
check('bezette sleutel → de rij houdt zijn oude hash', kiesDedupeHash(botsend, 'ux designer|acme nv|9000', false) === 'ux designer|acme nv|9000')
check('vrije sleutel → de rij krijgt de nieuwe hash', kiesDedupeHash(botsend, 'ux designer|acme nv|9000', true) === botsend)

// ── 10. Regio komt uit de provincie, niet uit de zoeklus ─────────────────────
// Gemeten op de live API: een query op Gent (25 km) levert vacatures in West-Vlaanderen,
// en een query op Brussel (15 km) er in Vlaams-Brabant.
check('West-Vlaanderen → WVL', regionForArea(['België', 'West-Vlaanderen (Provincie)', 'Tielt']) === 'WVL')
check('Oost-Vlaanderen → OVL', regionForArea(['België', 'Oost-Vlaanderen (Provincie)', 'Gent']) === 'OVL')
check('Brussel (Regio) → BRU', regionForArea(['België', 'Brussel (Regio)', 'Brussel']) === 'BRU')
check('Vlaams-Brabant → null (buiten bereik)', regionForArea(['België', 'Vlaams-Brabant (Provincie)', 'Leuven']) === null)
check('lege area → null', regionForArea([]) === null)
check('ontbrekende area → null', regionForArea(undefined) === null)

// ── 11. De vacature-URL wijst naar de vacature ───────────────────────────────
// `redirect_url` uit de API is Adzuna's klik-tracking-link en geeft koud geopend
// "Pagina niet gevonden" — geverifieerd in Chrome. Elke "Bekijk"-knop liep daarop dood,
// waardoor bestaande vacatures verzonnen léken. De bron bouwt de URL nu uit het id.
{
  const item = {
    id: '5716041235',
    title: 'Mechanical Designer',
    company: { display_name: 'CTRL-F' },
    location: { display_name: 'Dentergem, Tielt', area: ['België', 'West-Vlaanderen (Provincie)', 'Tielt'] },
    redirect_url: 'https://www.adzuna.be/land/ad/5716041235?se=kapot',
    created: NU.toISOString(),
    description: '',
  }
  const uit = normaliseerAdzunaItem(item)
  check('adzuna-item levert een job op', uit !== null)
  check('URL is de /details/-vorm', uit?.url === 'https://www.adzuna.be/details/5716041235', uit?.url)
  check('URL is NIET de kapotte redirect_url', !uit?.url.includes('/land/ad/'), uit?.url)
  check('regio komt uit de provincie, niet uit het anker', uit?.region === 'WVL')
  check('stad komt mee', uit?.city === 'Dentergem, Tielt')
  check('buiten de drie regio\'s → geen job', normaliseerAdzunaItem({ ...item, location: { area: ['België', 'Antwerpen (Provincie)'] } }) === null)
}

// Geen enkele fixture mag een URL dragen die als echt kan doorgaan: mock-rijen belanden in
// dezelfde database als live data, en dan is "bestaat deze vacature?" niet meer te zien.
for (const f of ADZUNA_JOB_FIXTURES) {
  check(`fixture "${f.title}" heeft een herkenbaar valse URL`, f.url.includes('example.test'), f.url)
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
// Een suite die niet meer kan falen, meldt voor altijd groen. `scenarios.mjs` draait deze
// suite één keer mét deze vlag en verwacht dan een niet-nul exitcode.
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
