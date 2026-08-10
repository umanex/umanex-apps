/**
 * Guard op de configuratielaag — de faalklasse uit `LEARNINGS.md` (2026-08-10).
 *
 * Die klasse trad drie keer op, telkens in dezelfde vorm: **een woordenlijst die een vraag
 * beantwoordt die ze niet kan beantwoorden, waarbij twee assen samenvallen.**
 *
 *   1. design werd vóór dev getest over de volledige tekst → één terloopse UX-zin maakte van
 *      een dev-vacature designbudget;
 *   2. na de fix besliste de omschrijving alsnog, want 10 van 13 gangbare designtitels
 *      bevatten geen enkel skill-woord;
 *   3. `'product manager'` — een *rolwoord* — stond in de vaardighedenlijst en besliste de
 *      rol; 5 van de 9 design-classificaties waren verzonnen.
 *
 * Losse testgevallen vingen dat niet: elke ronde stond het volgende woord in de verkeerde
 * lijst. Deze suite toetst daarom de *vorm* van de configuratie, niet de instanties.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/config-scenarios.ts
 */
import {
  SKILL_KEYWORDS,
  CLUSTERS,
  KEYWORD_WEIGHTS,
  SCORE_SKILLS,
  DESIGN_SKILLS,
  DEV_SKILLS,
  DESIGN_ROLE_SUFFIXEN,
  DEV_ROLE_SUFFIXEN,
  DESIGN_ROLE_FRASES,
  DEV_ROLE_FRASES,
  type SkillKey,
} from '../lib/config/profile'
import { matchedSkills, scoreJob } from '../lib/matching'
import { classificeer, rolInTitel } from '../lib/signals'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── 1. Eén verklaring, afgeleide lijsten ─────────────────────────────────────
// De drie parallelle lijsten konden uit elkaar lopen zonder dat iets protesteerde, en dat
// gebeurde ook. `Record<SkillKey, ClusterAssen>` maakt een vergeten cluster nu een
// compileerfout; dit toetst dat de afgeleide lijsten er ook echt uit volgen.
const alleClusters = Object.keys(SKILL_KEYWORDS) as SkillKey[]

for (const k of alleClusters) {
  check(`cluster "${k}" is in CLUSTERS verklaard`, CLUSTERS[k] !== undefined)
  check(`cluster "${k}": gewicht volgt de verklaring`, KEYWORD_WEIGHTS[k] === CLUSTERS[k]?.score, `${KEYWORD_WEIGHTS[k]} vs ${CLUSTERS[k]?.score}`)
  check(
    `cluster "${k}": score-as volgt de verklaring`,
    SCORE_SKILLS.includes(k) === (CLUSTERS[k]!.score > 0),
    `in SCORE_SKILLS=${SCORE_SKILLS.includes(k)}, score=${CLUSTERS[k]!.score}`
  )
  check(
    `cluster "${k}": classificatie-as volgt de verklaring`,
    DESIGN_SKILLS.includes(k) === (CLUSTERS[k]!.kant === 'design') &&
      DEV_SKILLS.includes(k) === (CLUSTERS[k]!.kant === 'dev'),
    `kant=${CLUSTERS[k]!.kant}`
  )
  check(`cluster "${k}" staat niet aan beide kanten`, !(DESIGN_SKILLS.includes(k) && DEV_SKILLS.includes(k)))
  check(`cluster "${k}" heeft geen negatief gewicht`, CLUSTERS[k]!.score >= 0)
}
check('geen cluster in CLUSTERS zonder keywords', Object.keys(CLUSTERS).every((k) => alleClusters.includes(k as SkillKey)))

/**
 * De tabel zelf, vastgepind.
 *
 * Dit is geen herhaling van `CLUSTERS` maar een tweede plek die mee moet veranderen. De
 * structuur hierboven maakt de twee assen zichtbaar; ze maakt een verkeerde keuze niet
 * onmogelijk. Wie `backend` weer een score geeft — de fout van 2026-08-10 — moet dat nu
 * twee keer opschrijven, en dat is precies genoeg wrijving om het een beslissing te maken
 * in plaats van een slip. Wijzig je hier iets, zet dan de reden in de commit-boodschap.
 */
const VERWACHTE_ASSEN: Record<SkillKey, [number, 'design' | 'dev' | null]> = {
  ux: [20, 'design'],
  ui: [15, 'design'],
  designSystem: [15, 'design'],
  figma: [5, 'design'],
  product: [10, 'design'],
  frontend: [10, 'dev'],
  nextjs: [15, 'dev'],
  react: [10, 'dev'],
  typescript: [5, 'dev'],
  backend: [0, 'dev'],
}
for (const [k, [score, kant]] of Object.entries(VERWACHTE_ASSEN) as Array<[SkillKey, [number, 'design' | 'dev' | null]]>) {
  check(
    `cluster "${k}" staat op score ${score} / kant ${kant}`,
    CLUSTERS[k]?.score === score && CLUSTERS[k]?.kant === kant,
    `is ${CLUSTERS[k]?.score} / ${CLUSTERS[k]?.kant}`
  )
}

// ── 2. Geen persoonswoorden in de vaardighedenlijst ──────────────────────────
// Dit is instantie 3, veralgemeend. Een vaardigheid is iets wat je kent; een rol is iets wat
// je bént. Staat een rolwoord in `SKILL_KEYWORDS`, dan beslist het via de terugval in
// `classificeer` alsnog de rol — precies wat 'product manager' deed.
const PERSOONSWOORDEN = [
  ...DESIGN_ROLE_SUFFIXEN,
  ...DEV_ROLE_SUFFIXEN,
  'manager',
  'managers',
  'architect',
  'architecten',
  'consultant',
  'consultants',
  'director',
  'directors',
  'analist',
  'analisten',
  'specialist',
  'specialisten',
  'medewerker',
  'medewerkers',
]

/**
 * Bekende uitzonderingen, elk met een reden. Nieuwe treffers worden geblokkeerd.
 *
 * Beide zijn dragend, en dat is geen smoes maar een gemeten feit: `\bproduct design\b` matcht
 * "Product Designer" niet (de `\b` faalt op de "er"), dus zonder het keyword valt een echte
 * Product Designer-vacature buiten de relevantiepoort en classificeert hij als `null`.
 * Hetzelfde geldt voor "Web Developer". Verdwijnt die poort ooit, dan kunnen deze twee weg.
 */
const BASELINE = new Map<string, string>([
  ['product designer', 'draagt de relevantiepoort: "product design" matcht "Product Designer" niet'],
  ['web developer', 'idem voor "Web Developer" — zonder dit keyword valt de vacature buiten de poort'],
])

for (const [cluster, keywords] of Object.entries(SKILL_KEYWORDS)) {
  for (const kw of keywords as readonly string[]) {
    const woorden = kw.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean)
    const kop = woorden[woorden.length - 1] ?? ''
    const raak = PERSOONSWOORDEN.find((p) => kop.endsWith(p))
    if (!raak) continue
    check(
      `"${kw}" (${cluster}) is een persoonswoord in de vaardighedenlijst`,
      BASELINE.has(kw),
      `eindigt op "${raak}" — een rol, geen vaardigheid. Verwijder hem, of zet hem met reden in BASELINE.`
    )
  }
}
// Een baseline die niets meer dekt, hoort te verdwijnen — anders groeit hij stil aan.
for (const kw of BASELINE.keys()) {
  check(
    `baseline-uitzondering "${kw}" bestaat nog`,
    Object.values(SKILL_KEYWORDS).some((ks) => (ks as readonly string[]).includes(kw)),
    'staat niet meer in SKILL_KEYWORDS — haal hem uit BASELINE'
  )
}

// ── 3. Elk keyword kan zichzelf vinden ───────────────────────────────────────
// `\b` naast een leesteken markeert nooit een grens, dus `\b\.net\b` matchte ".NET" nul keer
// en niets merkte het: een keyword dat nergens op vuurt, faalt volledig stil.
for (const [cluster, keywords] of Object.entries(SKILL_KEYWORDS)) {
  for (const kw of keywords as readonly string[]) {
    check(
      `keyword "${kw}" (${cluster}) matcht zichzelf`,
      matchedSkills({ title: '', description: kw }).includes(cluster as SkillKey),
      'het patroon vindt zijn eigen keyword niet'
    )
    check(
      `keyword "${kw}" (${cluster}) matcht in een zin`,
      matchedSkills({ title: '', description: `We zoeken iemand met ${kw} ervaring.` }).includes(cluster as SkillKey)
    )
  }
}

// ── 4. De omschrijving beslist nooit over de rol ─────────────────────────────
// Instanties 1 en 2 in één eigenschap. Draagt de titel een rol, dan mag geen enkele
// omschrijving die uitkomst nog veranderen.
const TITELS = [
  'Visual Designer',
  'Webdesigner',
  'Grafisch vormgever',
  'Head of Design',
  'Art Director',
  'UX Designer',
  'Frontend Developer',
  'Softwareontwikkelaar',
  'Software Engineer',
  'UI Developer',
  'Tech Lead',
]
const OMSCHRIJVINGEN = [
  'React, TypeScript, Next.js en frontend-architectuur.',
  'UX, user research, Figma en een design system.',
  'Java, .NET, Cobol en microservices.',
  '',
  'Een beetje van alles: React, Figma, UX en .NET.',
]
for (const title of TITELS) {
  const rol = rolInTitel(title)
  if (rol === null) continue
  const uitkomsten = OMSCHRIJVINGEN.map((description) => classificeer({ title, description }))
  const relevante = uitkomsten.filter((u) => u !== null)
  check(
    `"${title}": de omschrijving verandert de rol niet`,
    new Set(relevante).size <= 1,
    JSON.stringify(uitkomsten)
  )
  check(
    `"${title}": de rol volgt rolInTitel wanneer de vacature relevant is`,
    relevante.every((u) => u === rol),
    `rolInTitel=${rol}, kreeg ${JSON.stringify(relevante)}`
  )
}

// ── 5. De score-as raakt de classificatie-as niet ────────────────────────────
// Een cluster met score 0 mag nergens in een breakdown opduiken, hoe vaak het ook matcht.
{
  const nulClusters = alleClusters.filter((k) => CLUSTERS[k]!.score === 0)
  for (const k of nulClusters) {
    const kw = (SKILL_KEYWORDS[k] as readonly string[])[0]!
    const { score, breakdown } = scoreJob({ title: '', description: `Ervaring met ${kw}.` })
    check(`cluster "${k}" (score 0) scoort niet`, score === 0, `${score} via ${JSON.stringify(breakdown)}`)
    check(`cluster "${k}" (score 0) staat niet in de breakdown`, !(k in breakdown), JSON.stringify(breakdown))
    check(`cluster "${k}" matcht wél nog voor de relevantiepoort`, matchedSkills({ title: '', description: `Ervaring met ${kw}.` }).includes(k))
  }
  check('er is minstens één cluster met score 0', nulClusters.length > 0, 'anders toetst het blok hierboven niets')
}

// ── 6. Rolwoorden en vaardigheden overlappen niet ────────────────────────────
const ALLE_ROLFRASES = [...DESIGN_ROLE_FRASES, ...DEV_ROLE_FRASES]
for (const frase of ALLE_ROLFRASES) {
  check(
    `rolfrase "${frase}" staat niet óók in SKILL_KEYWORDS`,
    !Object.values(SKILL_KEYWORDS).some((ks) => (ks as readonly string[]).includes(frase)),
    'dan beslist hij via twee paden tegelijk'
  )
}
check(
  'geen rolsuffix staat als los keyword in SKILL_KEYWORDS',
  ![...DESIGN_ROLE_SUFFIXEN, ...DEV_ROLE_SUFFIXEN].some((s) =>
    Object.values(SKILL_KEYWORDS).some((ks) => (ks as readonly string[]).includes(s))
  )
)

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
