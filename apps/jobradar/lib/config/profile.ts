export const SKILL_KEYWORDS = {
  ux: ['ux', 'user experience', 'usability', 'user research', 'ux design', 'gebruikerservaring', 'interaction design'],
  ui: ['ui', 'user interface', 'visual design', 'ui design', 'interface design'],
  frontend: ['frontend', 'front-end', 'front end', 'web developer', 'web development'],
  nextjs: ['next.js', 'nextjs', 'next js'],
  react: ['react', 'reactjs', 'react.js'],
  designSystem: ['design system', 'storybook', 'component library', 'design tokens', 'tokens studio'],
  figma: ['figma', 'sketch', 'adobe xd'],
  typescript: ['typescript'],
  // Backend- en platformwerk. Stond hier niet, en daardoor viel élke .NET-, Java- of
  // Cobol-vacature buiten de relevantiepoort in `classificeer` — 32 echte
  // softwarevacatures bij 14 bedrijven, terwijl dát juist de bedrijven zijn die software
  // bouwen zonder designer. Beslissing Jeroen 2026-08-10: die tellen als lead.
  backend: [
    '.net',
    'dotnet',
    'c#',
    'java',
    'kotlin',
    'python',
    'php',
    'ruby',
    'golang',
    'node.js',
    'nodejs',
    'cobol',
    'backend',
    'back-end',
    'full stack',
    'full-stack',
    'fullstack',
    'devops',
    'api',
    'microservices',
  ],
  // 'product manager' stond hier en hoorde er niet: dat is een *rol*, en geen designrol.
  // Omdat `product` in DESIGN_SKILLS zit, maakte dat ene woord van elke Product Manager een
  // designvacature — 5 van de 9 design-classificaties op 664 echte rijen, tot en met
  // "Product Manager met kennis Hydrodynamica" en "Insurance Product Manager". Precies de
  // faalklasse uit LEARNINGS.md: een rolwoord in de vaardighedenlijst beslist de rol.
  product: ['product designer', 'product design'],
} as const

export type SkillKey = keyof typeof SKILL_KEYWORDS

/**
 * De twee assen per cluster, in één verklaring.
 *
 * Hiervóór stonden ze in drie parallelle lijsten — `KEYWORD_WEIGHTS`, `SCORE_SKILLS`,
 * `DESIGN_SKILLS`/`DEV_SKILLS` — en die konden uit elkaar lopen zonder dat iets protesteerde.
 * Dat gebeurde ook: `backend` kreeg een gewicht (telde mee voor de vacaturescore) én een
 * plek aan de dev-kant, waardoor een .NET-vacature scoorde als eigen opdracht. Zie
 * `LEARNINGS.md` 2026-08-10.
 *
 * Nu is er één verklaring en zijn de lijsten eruit afgeleid. `Record<SkillKey, ClusterAssen>`
 * maakt een vergeten cluster een compileerfout, en de twee assen staan naast elkaar op de
 * regel waar je ze kiest — je kunt ze niet meer half invullen zonder het te zien.
 *
 * - `score`  — gewicht voor de **vacaturescore**: hoe interessant is dit werk om zelf te doen.
 *              0 betekent: telt niet mee, hoe relevant het bedrijf ook is.
 * - `kant`   — aan welke kant van de **bedrijfsclassificatie** dit cluster telt, of `null`.
 */
export type ClusterAssen = {
  score: number
  kant: 'design' | 'dev' | null
}

export const CLUSTERS: Record<SkillKey, ClusterAssen> = {
  ux: { score: 20, kant: 'design' },
  ui: { score: 15, kant: 'design' },
  designSystem: { score: 15, kant: 'design' },
  figma: { score: 5, kant: 'design' },
  product: { score: 10, kant: 'design' },
  frontend: { score: 10, kant: 'dev' },
  nextjs: { score: 15, kant: 'dev' },
  react: { score: 10, kant: 'dev' },
  typescript: { score: 5, kant: 'dev' },
  // De enige met score 0, en dat is de hele beslissing van Jeroen op 2026-08-10: een
  // .NET-vacature is geen werk voor hem, het .NET-huis zonder designer is wél een lead.
  backend: { score: 0, kant: 'dev' },
}

const clusters = Object.entries(CLUSTERS) as Array<[SkillKey, ClusterAssen]>

export const KEYWORD_WEIGHTS: Record<SkillKey, number> = Object.fromEntries(
  clusters.map(([k, a]) => [k, a.score])
) as Record<SkillKey, number>

/** Clusters die meetellen voor de vacaturescore. Afgeleid — niet los onderhouden. */
export const SCORE_SKILLS: readonly SkillKey[] = clusters.filter(([, a]) => a.score > 0).map(([k]) => k)

/**
 * Welke clusters aan de design- dan wel de dev-kant staan.
 *
 * Deze lijsten zeggen aan welke kant een *vaardigheid* hoort — niet welke **rol** een
 * vacature is. Dat onderscheid ging hier drie reviewrondes lang mis: een skill-lijst
 * gebruiken om de rolvraag te beantwoorden kán niet kloppen, en elke bijstelling verplaatste
 * de fout naar de andere kant. De rol komt uit de rolwoorden hieronder.
 *
 * `frontend` telt bewust als dev en niet als design — een frontender die een design system
 * bouwt is nog steeds geen bewijs dat er een designer in het team zit.
 */
export const DESIGN_SKILLS: readonly SkillKey[] = clusters.filter(([, a]) => a.kant === 'design').map(([k]) => k)
export const DEV_SKILLS: readonly SkillKey[] = clusters.filter(([, a]) => a.kant === 'dev').map(([k]) => k)

/**
 * Rolwoorden: wát iemand is, niet wat hij kent.
 *
 * **Suffixen, geen hele woorden.** Nederlands stapelt: "Webdesigner",
 * "Softwareontwikkelaar", "Frontendontwikkelaar". Een woordgrens-match (`\bdesigner\b`)
 * loopt daar stuk — precies de valkuil waardoor 10 van 13 gangbare designtitels stil bleven.
 * De match kijkt daarom of een woord in de titel op één van deze suffixen *eindigt*.
 */
export const DESIGN_ROLE_SUFFIXEN = [
  'designer',
  'designers',
  'ontwerper',
  'ontwerpers',
  'vormgever',
  'vormgevers',
] as const

export const DEV_ROLE_SUFFIXEN = [
  'developer',
  'developers',
  'ontwikkelaar',
  'ontwikkelaars',
  'engineer',
  'engineers',
  'programmeur',
  'programmeurs',
] as const

/** Rollen die uit meerdere woorden bestaan en dus geen suffix hebben. */
export const DESIGN_ROLE_FRASES = [
  'art director',
  'design lead',
  'lead design',
  'design director',
  'design manager',
  'head of design',
  'creative lead',
  'creative director',
] as const

export const DEV_ROLE_FRASES = ['tech lead', 'head of engineering', 'software architect'] as const

/** Drempels voor de signaal-afleiding. Hier draaien, niet in de logica zelf. */
export const SIGNAL_THRESHOLDS = {
  /** Vanaf hoeveel gelijktijdige *relevante* vacatures een bedrijf als groeiend telt. */
  groeiVacatures: 3,
  /**
   * Binnen hoeveel dagen een vacature nog als "recent" meetelt.
   *
   * Bewust gelijk aan `ADZUNA_SEARCH.maxDagenOud`: de bron levert per definitie niets
   * ouders, dus een ruimer venster hier zou niets extra's toelaten en het signaal alleen
   * doen lijken alsof het meer meet dan het doet. Zo gelezen betekent "recente groei"
   * eerlijk: minstens `groeiVacatures` relevante vacatures open binnen het ophaalvenster.
   */
  groeiVensterDagen: 30,
  /** Vanaf hoeveel design- of dev-vacatures een bedrijf een digitaal productteam heet. */
  productteamVacatures: 2,
} as const

/**
 * Zoektermen en ophaal-grenzen voor Adzuna (`what_or` = OR-matching).
 *
 * `maxPaginas` begrenst de ophaal, en die grens is echt: op 2026-08-10 gaf één regio
 * `count: 901`. Wordt hij geraakt, dan meldt de bron dat als waarschuwing — een stille
 * afkapping leest als volledige dekking.
 */
export const ADZUNA_SEARCH = {
  /**
   * `what_or` matcht op losse woorden, niet op zinsdelen — en Adzuna rekt ze op.
   *
   * Daar zat de ruis: `product` matchte óók "productie", en West-Vlaanderen zit vol
   * productievacatures. Eén woord bracht 743 van de 1222 treffers binnen, tot en met
   * magazijnier, winkelbediende en chauffeur. Het is eruit; "Product Designer" komt nog
   * steeds binnen via `designer`.
   *
   * Gemeten op de live API (2026-08-11, drie regio's, 30 dagen):
   *   oud: 1222 treffers, 18% classificeerbaar, alle drie de regio's afgekapt
   *   nu :  547 treffers, 27% classificeerbaar, alleen Brussel nog afgekapt
   * Recall bleef volledig: dezelfde 6 dev-leads én dezelfde 4 designbedrijven.
   */
  whatOr: 'UX UI frontend front-end webdesign developer designer',
  /**
   * Smal gehouden, en dat is gemeten. Een bredere lijst (productie, magazijn, nacht,
   * ploegen…) haalde er nog 1 procentpunt ruis uit en kostte Smals als lead — één van de
   * vacatures daar noemt een uitgesloten woord. Ruis wegnemen mag geen leads kosten.
   */
  whatUitsluiten: 'mechanical mechanisch matrijzen elektrisch hvac machinebouw',
  country: 'be',
  resultatenPerPagina: 50,
  maxPaginas: 5,
  maxDagenOud: 30,
  /**
   * Waar een vacature te bekijken is. Apart van `country`, want het domein volgt de landcode
   * niet (`be` → adzuna.be, maar `gb` → adzuna.co.uk). Zie `vacatureUrl` in de bron voor
   * waarom we hem zelf bouwen in plaats van `redirect_url` te gebruiken.
   */
  siteHost: 'www.adzuna.be',
} as const

/**
 * Gewichten per signaal. De vier gemarkeerde signalen worden afgeleid uit de vacaturedata
 * (`lib/signals.ts`); de overige komen uit bronnen die nog niet live zijn (KBO, funding) en
 * blijven hier staan zodat een bron die ze wél levert meteen meetelt.
 */
export const SIGNAL_WEIGHTS: Record<string, number> = {
  'dev-vacature zonder design': 30, // afgeleid
  'digital product team': 25, // afgeleid
  'recente groei': 20, // afgeleid
  'UX-budget aanwezig': 25, // afgeleid
  startup: 15,
  'series A+': 20,
  'no designer on team': 30,
}

/** Precies de signalen die `deriveLeadsFromJobs` kan uitspreken. */
export const AFGELEIDE_SIGNALEN = [
  'dev-vacature zonder design',
  'digital product team',
  'recente groei',
  'UX-budget aanwezig',
] as const

export type AfgeleidSignaal = (typeof AFGELEIDE_SIGNALEN)[number]
