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
import { deriveLeadsFromJobs, bouwBedrijfsprofielen, mergeSignalen, classificeer, rolInTitel, AFGELEIDE_BRON } from '../lib/signals'
import { regionForArea, ALL_REGIONS } from '../lib/regions'
import { SIGNAL_WEIGHTS, SIGNAL_THRESHOLDS, AFGELEIDE_SIGNALEN, SKILL_KEYWORDS, SCORE_SKILLS, KEYWORD_WEIGHTS, DEV_SKILLS } from '../lib/config/profile'
import { ADZUNA_JOB_FIXTURES } from '../lib/sources/fixtures/adzuna-jobs'
import { normaliseerAdzunaItem } from '../lib/sources/adzuna'
import { berekenDekking } from '../lib/coverage'
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

// Keywords met een leesteken op de rand. `\b` naast een leesteken markeert nooit een grens,
// dus `\b\.net\b` matcht ".NET" niet en `\bc#\b` matcht "C#" niet — dezelfde klasse als
// `\bvisual design\b` dat "Visual Designer" miste.
const LEESTEKENS: Array<[string, boolean]> = [
  ['Ervaring met .NET en C#', true],
  ['ASP.NET Core ontwikkelaar', true],
  ['Je werkt met Node.js', true],
  ['Kennis van C# is een must', true],
  ['We bouwen in Next.js', true],
  ['Een planeet is geen framework', false],
  ['Sonnet is geen taal', false],
]
for (const [tekst, verwacht] of LEESTEKENS) {
  const geraakt = matchedSkills({ title: '', description: tekst }).length > 0
  check(`leesteken-keyword in "${tekst.slice(0, 34)}" → ${verwacht ? 'match' : 'geen match'}`, geraakt === verwacht, JSON.stringify(matchedSkills({ title: '', description: tekst })))
}

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

// ── 4b. De rol komt uit de titel, de relevantie uit de vaardigheden ─────────
// Twee reviewrondes vielen hier om, elk in de tegenovergestelde richting. Deze tabel
// draagt beide faalrichtingen plus de gevallen die de tweede fix blootlegde; hij is de
// eigenlijke regressietest van `LEARNINGS.md` 2026-08-10.
const STACK = 'Je ontwerpt schermen in Figma voor ons platform, gebouwd in React en TypeScript.'
const CLASSIFICATIE: Array<[string, string, 'design' | 'dev' | null]> = [
  // Ronde 2: één terloopse designzin mocht een dev-vacature niet omklappen.
  ['Frontend Developer', 'React en TypeScript verplicht, UX affiniteit is een pluspunt.', 'dev'],
  ['Frontend Developer', 'Je bouwt en onderhoudt ons design system in React.', 'dev'],
  ['UI Developer — React/TypeScript', 'React en TypeScript', 'dev'],
  // Ronde 3: stille designtitels mochten niet naar dev kantelen door één stack-zin.
  ['Visual Designer', STACK, 'design'],
  ['Digital Designer', STACK, 'design'],
  ['Interaction Designer', STACK, 'design'],
  ['Service Designer', STACK, 'design'],
  ['Design Lead', STACK, 'design'],
  ['Head of Design', STACK, 'design'],
  ['Art Director', STACK, 'design'],
  ['Creative Lead', STACK, 'design'],
  ['Design Director', STACK, 'design'],
  // Nederlandse samenstellingen: een woordgrens-match loopt hier stuk, een suffix niet.
  ['Webdesigner', STACK, 'design'],
  ['Grafisch vormgever', STACK, 'design'],
  ['Softwareontwikkelaar', 'Je werkt met React en TypeScript.', 'dev'],
  ['Frontendontwikkelaar', 'React en TypeScript.', 'dev'],
  // Rol in de titel, maar buiten het vakgebied: telt nergens mee.
  ['Mechanical Designer', 'Constructietekeningen van inox machines.', null],
  ['Ontwerper matrijzen', 'Je tekent matrijzen uit.', null],
  ['Sales Engineer', 'Je verkoopt machines aan klanten.', null],
  ['Junior R&D Engineer', 'Labowerk en prototypes.', null],
  // Geen rolwoord, wel een ondubbelzinnig skill-signaal ín de titel.
  ['Stagiaire Web-Front, UX/UI Design, Graphics Branding', '', 'design'],
  ['Software Engineer', 'Je werkt met React, TypeScript en Next.js.', 'dev'],
  // Geen rol, geen skill in de titel: niet raden.
  ['Boekhouder', 'Je verwerkt facturen.', null],
]
for (const [title, description, verwacht] of CLASSIFICATIE) {
  const uit = classificeer({ title, description })
  check(`"${title.slice(0, 38)}" → ${verwacht ?? 'geen'}`, uit === verwacht, `kreeg ${uit ?? 'geen'}`)
}

// Een rolwoord mag nooit via de vaardighedenlijst alsnog de rol beslissen. 'product manager'
// stond in SKILL_KEYWORDS.product en maakte van elke Product Manager een designvacature —
// 5 van de 9 design-classificaties op 664 echte rijen.
const GEEN_DESIGN: Array<[string, string]> = [
  ['Senior Product Manager', 'Je stuurt de roadmap en werkt met stakeholders.'],
  ['Product Manager met kennis Hydrodynamica', 'Je begeleidt pompinstallaties.'],
  ['Insurance Product Manager', 'Je beheert een verzekeringsportefeuille.'],
  ['Jr. Product Manager (Carrier/Enterprise)', 'Graduate programma bij een telecomspeler.'],
]
for (const [title, description] of GEEN_DESIGN) {
  check(`"${title.slice(0, 40)}" is geen designvacature`, classificeer({ title, description }) !== 'design', String(classificeer({ title, description })))
}
check('"Product Designer" blijft wél design', classificeer({ title: 'Product Designer', description: 'Je ontwerpt features.' }) === 'design')
check('"product manager" zit niet meer in de skill-lijst', !SKILL_KEYWORDS.product.some((k) => k.includes('manager')), JSON.stringify(SKILL_KEYWORDS.product))

// De rol-laag apart, los van de vaardigheden-poort erboven.
const ROLLEN: Array<[string, 'design' | 'dev' | null]> = [
  ['Visual Designer', 'design'],
  ['Webdesigner', 'design'],
  ['Grafisch vormgever', 'design'],
  ['Head of Design', 'design'],
  ['Frontend Developer', 'dev'],
  ['Softwareontwikkelaar', 'dev'],
  ['Software Engineer', 'dev'],
  ['Tech Lead', 'dev'],
  ['UI Developer', 'dev'],
  ['Designer / Developer', 'design'],
  ['Stagiaire Web-Front', null],
  ['Boekhouder', null],
]
for (const [titel, verwacht] of ROLLEN) {
  check(`rolInTitel("${titel}") → ${verwacht ?? 'geen'}`, rolInTitel(titel) === verwacht, `kreeg ${rolInTitel(titel) ?? 'geen'}`)
}

// De omschrijving mag de rol NOOIT bepalen. Dat pad was twee keer de oorzaak: draai de
// omschrijving om en de uitkomst hoort gelijk te blijven.
for (const [titel] of ROLLEN) {
  const a = classificeer({ title: titel, description: 'React en TypeScript en Next.js en frontend.' })
  const b = classificeer({ title: titel, description: 'UX en user research en Figma en design system.' })
  const heeftRol = rolInTitel(titel) !== null
  if (heeftRol) {
    check(`"${titel}": omschrijving verandert de rol niet`, a === b, `${a} vs ${b}`)
  }
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
check('Acme telt 3 dev-vacatures', acme?.devVacatures === 3, `kreeg ${acme?.devVacatures}`)
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
// De poort die irrelevante vacatures uit de groeitelling houdt, was ongedekt: haal
// `soort !== null` weg en de suite bleef groen. Drie verse Mechanical Designers maakten
// zo een bedrijf tot lead met "recente groei".
check('irrelevante verse vacatures tellen niet als groei', (() => {
  const ruis = Array.from({ length: SIGNAL_THRESHOLDS.groeiVacatures + 2 }, (_, i) =>
    job({ title: `Mechanical Designer ${i}`, company: 'Zeta', description: 'Constructietekeningen.', postedAt: dagenGeleden(1) })
  )
  const p = bouwBedrijfsprofielen(ruis, NU)[0]
  return p?.recenteVacatures === 0 && !p?.signals.includes('recente groei')
})(), JSON.stringify(bouwBedrijfsprofielen(Array.from({ length: 5 }, (_, i) => job({ title: `Mechanical Designer ${i}`, company: 'Zeta', description: 'Constructietekeningen.', postedAt: dagenGeleden(1) })), NU)[0]))
check('relevante verse vacatures tellen wél als groei', (() => {
  const echt = Array.from({ length: SIGNAL_THRESHOLDS.groeiVacatures }, (_, i) =>
    job({ title: `Frontend Developer ${i}`, company: 'Eta', description: 'React en TypeScript.', postedAt: dagenGeleden(1) })
  )
  const p = bouwBedrijfsprofielen(echt, NU)[0]
  return p?.recenteVacatures === SIGNAL_THRESHOLDS.groeiVacatures && p?.signals.includes('recente groei') === true
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

// ── 12. Dekking: de acceptatie-invarianten uit de briefing ──────────────────
// briefings/2026-08-10-component-dekkingsindicator.tcebc.md. De indicator bestaat om een
// leemte zichtbaar te maken; klopt zijn eigen rekensom niet, dan verbergt hij er juist een.
{
  const zaak = [
    ...ADZUNA_JOB_FIXTURES,
    job({ title: 'Mechanical Designer', company: 'Gamma', description: 'constructietekeningen' }),
    job({ title: 'Boekhouder', company: 'Delta', description: 'facturen' }),
  ]
  const d = berekenDekking(zaak)
  check('dekking: design + dev + onbepaald == totaal', d.design + d.dev + d.onbepaald === d.totaal, JSON.stringify(d))
  check('dekking: geclassificeerd == design + dev', d.geclassificeerd === d.design + d.dev, JSON.stringify(d))
  check('dekking: totaal == aantal rijen', d.totaal === zaak.length, JSON.stringify(d))
  check('dekking: irrelevante vacatures landen op onbepaald', d.onbepaald >= 2, JSON.stringify(d))
  check('dekking: geen enkel getal is negatief', [d.design, d.dev, d.onbepaald, d.totaal, d.geclassificeerd].every((n) => n >= 0))

  const leeg = berekenDekking([])
  check('dekking: lege dataset geeft nullen, geen NaN', leeg.totaal === 0 && leeg.geclassificeerd === 0 && !Number.isNaN(leeg.geclassificeerd), JSON.stringify(leeg))

  const alles = berekenDekking([job({ title: 'UX Designer', company: 'A', description: 'user research' })])
  check('dekking: alles geclassificeerd → onbepaald is 0', alles.onbepaald === 0 && alles.geclassificeerd === 1, JSON.stringify(alles))

  // De telling moet de huidige classificatie volgen, niet een eigen kopie ervan.
  const perHand = zaak.reduce((n, j) => n + (classificeer({ title: j.title, description: j.description ?? '' }) !== null ? 1 : 0), 0)
  check('dekking volgt classificeer()', d.geclassificeerd === perHand, `${d.geclassificeerd} vs ${perHand}`)

  // Een null-omschrijving mag niet omvallen: de kolom is nullable in het schema.
  const metNull = berekenDekking([{ title: 'UX Designer', description: null }])
  check('dekking: omschrijving null werkt', metNull.totaal === 1, JSON.stringify(metNull))
}

// ── De twee assen mogen niet samenvallen ────────────────────────────────────
// Een .NET-vacature is geen werk voor Jeroen, maar het bedrijf dat erin ontwikkelt en geen
// designer heeft is wél een lead (beslissing Jeroen 2026-08-10). Score en classificatie
// beantwoorden dus verschillende vragen; ze hadden één antwoord en dat was fout.
const BACKEND_NIET_IN_SCORE: Array<[string, string]> = [
  ['Smals - .NET Developer', 'Je bouwt in .NET en C#.'],
  ['Smals - Cobol Developer', 'Onderhoud van Cobol-toepassingen.'],
  ['Java Developer', 'Java en Spring Boot, microservices.'],
  ['DevOps Engineer', 'CI/CD, devops en API-beheer.'],
]
for (const [title, description] of BACKEND_NIET_IN_SCORE) {
  const { score, breakdown } = scoreJob({ title, description })
  check(`"${title.slice(0, 30)}" scoort 0 als vacature`, score === 0, `${score} via ${JSON.stringify(breakdown)}`)
  check(`"${title.slice(0, 30)}" telt wél als dev voor de lead`, classificeer({ title, description }) === 'dev')
}
check('een frontend-vacature scoort nog steeds wél', scoreJob({ title: 'Frontend Developer', description: 'React en TypeScript.' }).score > 0)
check('backend staat niet in SCORE_SKILLS', !SCORE_SKILLS.includes('backend'))
check('backend staat wél in DEV_SKILLS', DEV_SKILLS.includes('backend'))
check('elk SCORE_SKILL weegt meer dan 0', SCORE_SKILLS.every((k) => KEYWORD_WEIGHTS[k] > 0), JSON.stringify(SCORE_SKILLS.filter((k) => !(KEYWORD_WEIGHTS[k] > 0))))
check('elk cluster buiten SCORE_SKILLS weegt 0', (Object.keys(SKILL_KEYWORDS) as Array<keyof typeof SKILL_KEYWORDS>).filter((k) => !SCORE_SKILLS.includes(k)).every((k) => KEYWORD_WEIGHTS[k] === 0))
check('de breakdown bevat nooit een cluster buiten SCORE_SKILLS', (() => {
  const { breakdown } = scoreJob({ title: 'Full Stack Developer', description: 'React, TypeScript, Java en .NET.' })
  return Object.keys(breakdown).every((k) => SCORE_SKILLS.includes(k as never))
})(), JSON.stringify(scoreJob({ title: 'Full Stack Developer', description: 'React, TypeScript, Java en .NET.' }).breakdown))

// De backend-woordenschat draagt de relevantiepoort — zonder die woorden viel elke .NET-,
// Java- of Cobol-vacature buiten élke telling (beslissing Jeroen 2026-08-10).
const BACKEND: Array<[string, string]> = [
  ['Smals - .NET Developer', 'Je bouwt in .NET en C#.'],
  ['Smals - Cobol Developer', 'Onderhoud van Cobol-toepassingen.'],
  ['NTT DATA - Java Developer', 'Java en Spring Boot.'],
  ['Senior Full-Stack Developer', 'Full-stack werk aan onze API.'],
  ['DevOps Engineer', 'CI/CD en infrastructuur, devops-cultuur.'],
]
for (const [title, description] of BACKEND) {
  check(`"${title.slice(0, 34)}" telt als dev`, classificeer({ title, description }) === 'dev', String(classificeer({ title, description })))
}

// ── 13. Een lead draagt zijn bewijs ─────────────────────────────────────────
// De tellingen werden al berekend en weggegooid; een leadkaart was daardoor een bewering
// zonder bewijspad (UX-audit 2026-08-11, P1).
{
  const leads = deriveLeadsFromJobs(GEMENGD, NU)
  for (const l of leads) {
    check(`"${l.companyName}" draagt tellingen`, l.tellingen !== undefined, JSON.stringify(l.tellingen))
    const t = l.tellingen!
    check(`"${l.companyName}": design + dev <= totaal`, t.design + t.dev <= t.totaal, JSON.stringify(t))
    check(`"${l.companyName}": geen negatieve tellingen`, t.totaal >= 0 && t.design >= 0 && t.dev >= 0)
    check(`"${l.companyName}": minstens één relevante vacature`, t.design + t.dev >= 1, JSON.stringify(t))
  }
  // De tellingen moeten overeenkomen met het profiel waaruit ze komen.
  const profielen = bouwBedrijfsprofielen(GEMENGD, NU)
  for (const l of leads) {
    const p = profielen.find((x) => x.companyName === l.companyName)!
    check(
      `"${l.companyName}": tellingen volgen het profiel`,
      l.tellingen!.totaal === p.totaalVacatures && l.tellingen!.design === p.designVacatures && l.tellingen!.dev === p.devVacatures
    )
  }
  // Acme heeft drie dev-vacatures en geen design: dat moet exact zo op de kaart komen.
  const acmeLead = leads.find((l) => l.companyName.toLowerCase().startsWith('acme'))
  check('Acme telt 3 vacatures, 0 design, 3 dev', JSON.stringify(acmeLead?.tellingen) === JSON.stringify({ totaal: 3, design: 0, dev: 3 }), JSON.stringify(acmeLead?.tellingen))
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
