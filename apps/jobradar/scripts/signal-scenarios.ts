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
import { scoreJob, scoreLead, jobDedupeHash, matchedSkills, normaliseerBedrijf } from '../lib/matching'
import { deriveLeadsFromJobs, bouwBedrijfsprofielen, mergeSignalen, AFGELEIDE_BRON } from '../lib/signals'
import { regionForArea, ALL_REGIONS } from '../lib/regions'
import { SIGNAL_WEIGHTS, SIGNAL_THRESHOLDS, AFGELEIDE_SIGNALEN } from '../lib/config/profile'
import { ADZUNA_JOB_FIXTURES } from '../lib/sources/fixtures/adzuna-jobs'
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
const SIGNAALSETS = [
  ['UX-budget aanwezig'],
  ['dev-vacature zonder design', 'digital product team'],
  ['dev-vacature zonder design', 'digital product team', 'recente groei', 'series A+', 'startup'],
  [],
]
for (const signals of SIGNAALSETS) {
  const { score, breakdown } = scoreLead({ signals })
  const som = signals.reduce((a, s) => a + (SIGNAL_WEIGHTS[s] ?? 5), 0)
  check(`leadScore==som(gewichten) voor [${signals.join(', ')}]`, score === Math.min(100, som), `${score} vs ${som}`)
  check(`leadScore gecapt op 100 voor [${signals.join(', ')}]`, score <= 100)
  check(
    `breakdown dekt elk signaal voor [${signals.join(', ')}]`,
    Object.keys(breakdown).length === new Set(signals).size
  )
}

// ── 4. Permutatie-invariantie ────────────────────────────────────────────────
// Als de volgorde van de vacaturelijst de uitkomst verandert, verandert een leadscore
// doordat een bron zijn paginering wijzigt. Dat is precies de stille drift die deze
// suite moet uitsluiten.
const GEMENGD: RawJob[] = [
  job({ title: 'Frontend Developer', company: 'Acme BV', description: 'React en TypeScript', region: 'OVL' }),
  job({ title: 'Backend Developer', company: 'Acme BV', description: 'Node en Postgres', region: 'OVL' }),
  job({ title: 'UX Designer', company: 'Beta NV', description: 'user research', region: 'WVL' }),
  job({ title: 'React Developer', company: 'Beta NV', description: 'React', region: 'WVL' }),
  job({ title: 'Mechanical Designer', company: 'Gamma', description: 'constructietekeningen', region: 'BRU' }),
  job({ title: 'Next.js Developer', company: 'acme bv', description: 'Next.js', region: 'OVL' }),
]
const basis = JSON.stringify(deriveLeadsFromJobs(GEMENGD, NU))
for (let i = 0; i < 12; i++) {
  // Deterministische permutatie: rotatie + omkering, geen Math.random — een suite die
  // per run iets anders test, is geen regressietest.
  const geroteerd = [...GEMENGD.slice(i % GEMENGD.length), ...GEMENGD.slice(0, i % GEMENGD.length)]
  const volgorde = i % 2 === 0 ? geroteerd : geroteerd.reverse()
  check(`permutatie ${i} geeft dezelfde leads`, JSON.stringify(deriveLeadsFromJobs(volgorde, NU)) === basis)
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

// ── 10. Regio komt uit de provincie, niet uit de zoeklus ─────────────────────
// Gemeten op de live API: een query op Gent (25 km) levert vacatures in West-Vlaanderen,
// en een query op Brussel (15 km) er in Vlaams-Brabant.
check('West-Vlaanderen → WVL', regionForArea(['België', 'West-Vlaanderen (Provincie)', 'Tielt']) === 'WVL')
check('Oost-Vlaanderen → OVL', regionForArea(['België', 'Oost-Vlaanderen (Provincie)', 'Gent']) === 'OVL')
check('Brussel (Regio) → BRU', regionForArea(['België', 'Brussel (Regio)', 'Brussel']) === 'BRU')
check('Vlaams-Brabant → null (buiten bereik)', regionForArea(['België', 'Vlaams-Brabant (Provincie)', 'Leuven']) === null)
check('lege area → null', regionForArea([]) === null)
check('ontbrekende area → null', regionForArea(undefined) === null)

// ── Tegenproef ───────────────────────────────────────────────────────────────
// Een suite die niet meer kan falen, meldt voor altijd groen. `scenarios.mjs` draait deze
// suite één keer mét deze vlag en verwacht dan een niet-nul exitcode.
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
