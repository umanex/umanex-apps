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
import {
  splitsTermen,
  valideerZoekopdracht,
  standaardZoekopdracht,
  parseZoekopdracht,
  serialiseerZoekopdracht,
  isStandaard,
  MAX_TERMEN,
} from '../lib/settings'
import { bouwUrl } from '../lib/sources/adzuna'

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
  const as = CLUSTERS[k]
  check(`cluster "${k}" is in CLUSTERS verklaard`, as !== undefined)
  // Zonder deze `continue` gooit het blok hieronder een onafgevangen TypeError op precies
  // de faalmodus die het hoort te melden — de suite crasht dan in plaats van te rapporteren.
  if (!as) continue
  check(`cluster "${k}": gewicht volgt de verklaring`, KEYWORD_WEIGHTS[k] === as.score, `${KEYWORD_WEIGHTS[k]} vs ${as.score}`)
  check(
    `cluster "${k}": score-as volgt de verklaring`,
    SCORE_SKILLS.includes(k) === (as.score > 0),
    `in SCORE_SKILLS=${SCORE_SKILLS.includes(k)}, score=${as.score}`
  )
  check(
    `cluster "${k}": classificatie-as volgt de verklaring`,
    DESIGN_SKILLS.includes(k) === (as.kant === 'design') &&
      DEV_SKILLS.includes(k) === (as.kant === 'dev'),
    `kant=${as.kant}`
  )
  check(`cluster "${k}" staat niet aan beide kanten`, !(DESIGN_SKILLS.includes(k) && DEV_SKILLS.includes(k)))
  check(`cluster "${k}" heeft geen negatief gewicht`, as.score >= 0)
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
  const werkelijk = CLUSTERS[k]
  check(
    `cluster "${k}" staat op score ${score} / kant ${kant}`,
    werkelijk?.score === score && werkelijk?.kant === kant,
    `is ${werkelijk?.score} / ${werkelijk?.kant}`
  )
}
// Een nieuw cluster mag niet buiten de pin om binnenkomen: de tabel hierboven bewaakt alleen
// wat erin staat, dus de omvang hoort er ook bij.
check(
  'elk cluster staat in de vastgepinde tabel',
  alleClusters.every((k) => k in VERWACHTE_ASSEN),
  JSON.stringify(alleClusters.filter((k) => !(k in VERWACHTE_ASSEN)))
)

// ── 2. Geen persoonswoorden in de vaardighedenlijst ──────────────────────────
// Dit is instantie 3, veralgemeend. Een vaardigheid is iets wat je kent; een rol is iets wat
// je bént. Staat een rolwoord in `SKILL_KEYWORDS`, dan beslist het via de terugval in
// `classificeer` alsnog de rol — precies wat 'product manager' deed.
/**
 * Bewust NIET afgeleid uit `DESIGN_ROLE_FRASES`/`DEV_ROLE_FRASES`.
 *
 * Dat leek de nette oplossing voor het feit dat beide lijsten elkaar tegenspreken — en het
 * maakte het erger: "head of design" levert bij het splitsen het woord `design`, waarna élk
 * keyword dat op "design" eindigt ("ux design", "visual design", "product design") als
 * persoonswoord werd afgekeurd. Een afleiding die het probleem verplaatst in plaats van
 * oplost.
 *
 * Deze lijst blijft dus wat hij is: een onvolledige, handonderhouden benadering. Dat is
 * eerlijk gezegd het mechanisme waar deze hele faalklasse op steunt, en daarom leunt de
 * eigenlijke bewaking op sectie 2b hieronder — die kent geen persoonswoorden en heeft ze
 * niet nodig.
 */
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
  'owner',
  'owners',
  'master',
  'masters',
  'scientist',
  'scientists',
  'tester',
  'testers',
  'marketeer',
  'marketeers',
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


// ── 2b. Wélke keywords in hun eentje mogen beslissen ────────────────────────
// Sectie 2 rust op een handonderhouden woordenlijst, en dat is precies het mechanisme
// waarop deze hele faalklasse steunt: `'product owner'` glipt er zonder meer langs, en
// verzint dan drie designvacatures op echte data. Deze check kent geen persoonswoorden en
// heeft ze niet nodig — hij pint wélke keywords de *macht* hebben om alleen al, als titel,
// een classificatie af te dwingen via de skill-terugval. Groeit die verzameling, dan is dat
// een uitbreiding van macht en hoort iemand ernaar te kijken.
const BESLISSENDE_KEYWORDS = [
  '.net', 'adobe xd', 'api', 'back-end', 'backend', 'c#', 'cobol', 'component library',
  'design system', 'design tokens', 'devops', 'dotnet', 'figma', 'front end', 'front-end',
  'frontend', 'full stack', 'full-stack', 'fullstack', 'gebruikerservaring', 'golang',
  'interaction design', 'interface design', 'java', 'kotlin', 'microservices', 'next js',
  'next.js', 'nextjs', 'node.js', 'nodejs', 'php', 'product design', 'python', 'react',
  'react.js', 'reactjs', 'ruby', 'sketch', 'storybook', 'tokens studio', 'typescript', 'ui',
  'ui design', 'usability', 'user experience', 'user interface', 'user research', 'ux',
  'ux design', 'visual design', 'web development',
]

{
  const werkelijk: string[] = []
  for (const keywords of Object.values(SKILL_KEYWORDS)) {
    for (const kw of keywords as readonly string[]) {
      // Draagt het keyword zelf al een rolwoord, dan beslist `rolInTitel` en niet de terugval.
      if (rolInTitel(kw) !== null) continue
      if (classificeer({ title: kw, description: kw }) !== null) werkelijk.push(kw)
    }
  }
  const verwacht = [...BESLISSENDE_KEYWORDS].sort()
  const gevonden = [...werkelijk].sort()
  const nieuw = gevonden.filter((k) => !verwacht.includes(k))
  const weg = verwacht.filter((k) => !gevonden.includes(k))

  check(
    'geen nieuw keyword dwingt op eigen kracht een classificatie af',
    nieuw.length === 0,
    `nieuw: ${JSON.stringify(nieuw)} — is dit een vaardigheid of een rol? Een rol hoort in de rolwoorden, niet hier.`
  )
  check('de pin dekt nog steeds wat er is', weg.length === 0, `verdwenen: ${JSON.stringify(weg)}`)
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

// Zonder ondergrens kan deze sectie stil krimpen: minder keywords is minder checks, en de
// suite meldt dan een lager getal in plaats van een fout.
check(
  'sectie 3 dekt nog minstens 50 keywords',
  Object.values(SKILL_KEYWORDS).flat().length >= 50,
  String(Object.values(SKILL_KEYWORDS).flat().length)
)

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

// Sectie 4 slaat een titel stil over wanneer `rolInTitel` null geeft. Zijn de rollijsten
// leeggehaald, dan slaat hij ze állemaal over en meldt hij groen op nul werk.
check(
  'sectie 4 toetst nog minstens 8 titels met een rol',
  TITELS.filter((t) => rolInTitel(t) !== null).length >= 8,
  String(TITELS.filter((t) => rolInTitel(t) !== null).length)
)

// ── 5. De score-as raakt de classificatie-as niet ────────────────────────────
// Een cluster met score 0 mag nergens in een breakdown opduiken, hoe vaak het ook matcht.
{
  const nulClusters = alleClusters.filter((k) => CLUSTERS[k]?.score === 0)
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

check('sectie 6 toetst nog minstens 10 rolfrases', ALLE_ROLFRASES.length >= 10, String(ALLE_ROLFRASES.length))
check(
  'de rolsuffixen zijn niet leeggehaald',
  [...DESIGN_ROLE_SUFFIXEN, ...DEV_ROLE_SUFFIXEN].length >= 12,
  String([...DESIGN_ROLE_SUFFIXEN, ...DEV_ROLE_SUFFIXEN].length)
)

// ── 7. De bewerkbare zoekopdracht ───────────────────────────────────────────
// De termen zijn sinds 2026-08-11 in de app aanpasbaar. Daarmee verschuift de pin op
// `whatOr` van "wat er draait" naar "wat de standaard is" — zie de bekende grens in
// briefings/2026-08-11-feature-zoekinstellingen.tcebc.md. Wat hier gebbewaakt wordt is de
// laag eronder: splitsen, valideren en terugvallen mogen niet stil veranderen.
{
  // Splitsen op witruimte is de kern van het scherm: `what_or` matcht losse woorden, dus
  // "product designer" ís twee termen. Wie dat verbergt, verbergt de bug van 2026-08-11.
  check('een term met een spatie wordt gesplitst', splitsTermen(['product designer']).length === 2, JSON.stringify(splitsTermen(['product designer'])))
  check('meerdere spaties en tabs splitsen ook', splitsTermen(['  ux   ui\tfrontend ']).join(',') === 'ux,ui,frontend', JSON.stringify(splitsTermen(['  ux   ui\tfrontend '])))
  check('dubbele termen verdwijnen', splitsTermen(['ux', 'ux']).length === 1)
  check('ontdubbelen is hoofdletter-ongevoelig', splitsTermen(['UX', 'ux']).length === 1, JSON.stringify(splitsTermen(['UX', 'ux'])))
  check('de eerste schrijfwijze blijft staan', splitsTermen(['UX', 'ux'])[0] === 'UX')
  check('lege invoer geeft een lege lijst', splitsTermen(['', '   ']).length === 0)

  // Zónder `what_or` geeft Adzuna élke vacature binnen de straal terug. Leeg opslaan
  // betekent dus niet "niets zoeken" maar "alles".
  check('geen zoektermen wordt geweigerd', valideerZoekopdracht({ termen: [], uitsluiten: [] }) !== null)
  check('één zoekterm volstaat', valideerZoekopdracht({ termen: ['ux'], uitsluiten: [] }) === null)
  check('te veel termen wordt geweigerd', valideerZoekopdracht({ termen: Array.from({ length: MAX_TERMEN + 1 }, (_, i) => `t${i}`), uitsluiten: [] }) !== null)
  check('precies het maximum mag', valideerZoekopdracht({ termen: Array.from({ length: MAX_TERMEN }, (_, i) => `t${i}`), uitsluiten: [] }) === null)
  check('een term die ook uitgesloten wordt, wordt geweigerd', valideerZoekopdracht({ termen: ['ux'], uitsluiten: ['UX'] }) !== null)
  check('de foutmelding is leesbaar', (valideerZoekopdracht({ termen: [], uitsluiten: [] }) ?? '').length > 20)

  // Terugvallen op de standaard: een ontbrekende, kapotte of ongeldig geworden waarde mag
  // de sync nooit zonder zoektermen laten draaien.
  const standaard = standaardZoekopdracht()
  check('de standaard is geldig', valideerZoekopdracht(standaard) === null)
  check('de standaard heeft termen', standaard.termen.length > 0)
  for (const [naam, rauw] of [
    ['null', null],
    ['lege string', ''],
    ['geen json', '{kapot'],
    ['json zonder velden', '{}'],
    ['lege termen', '{"termen":[],"uitsluiten":[]}'],
    ['termen geen lijst', '{"termen":"ux","uitsluiten":[]}'],
  ] as Array<[string, string | null]>) {
    check(`parse valt terug op de standaard bij ${naam}`, isStandaard(parseZoekopdracht(rauw)), JSON.stringify(parseZoekopdracht(rauw)))
  }
  const eigen = { termen: ['ux', 'react'], uitsluiten: ['sales'] }
  check('parse behoudt een geldige opgeslagen waarde', JSON.stringify(parseZoekopdracht(serialiseerZoekopdracht(eigen))) === JSON.stringify(eigen))
  check('heen en terug verandert niets', serialiseerZoekopdracht(parseZoekopdracht(serialiseerZoekopdracht(eigen))) === serialiseerZoekopdracht(eigen))
  check('isStandaard herkent een eigen zoekopdracht niet als standaard', !isStandaard(eigen))

  // De bron moet de meegegeven zoekopdracht gebruiken, niet de constante uit profile.ts —
  // anders is het hele scherm decoratie.
  const url = bouwUrl('OVL', 1, { termen: ['kotlin', 'rust'], uitsluiten: ['stage'] })
  check('bouwUrl gebruikt de meegegeven termen', url.includes('what_or=kotlin+rust'), url)
  check('bouwUrl gebruikt de meegegeven uitsluitingen', url.includes('what_exclude=stage'), url)
  check('bouwUrl gebruikt NIET de constante', !url.includes('webdesign'), url)
  const zonder = bouwUrl('OVL', 1, { termen: ['ux'], uitsluiten: [] })
  check('zonder uitsluitingen staat what_exclude niet in de url', !zonder.includes('what_exclude'), zonder)
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
