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

export const KEYWORD_WEIGHTS: Record<SkillKey, number> = {
  ux: 20,
  ui: 15,
  frontend: 10,
  nextjs: 15,
  react: 10,
  designSystem: 15,
  figma: 5,
  typescript: 5,
  product: 10,
  // Lager dan de frontend-clusters: backend zegt "hier wordt software gebouwd", niet
  // "hier is werk voor mij". Het draagt de relevantiepoort, niet de score.
  backend: 5,
}

/**
 * Welke skill-clusters aan de design- dan wel de dev-kant staan.
 *
 * Let op wat deze lijsten wél en niet doen. Ze zeggen aan welke kant een *vaardigheid*
 * hoort — niet welke **rol** een vacature is. Dat onderscheid is hier twee reviewrondes
 * lang misgegaan: een skill-lijst gebruiken om de rolvraag te beantwoorden kán niet kloppen,
 * en elke bijstelling verplaatste de fout alleen naar de andere kant (zie `LEARNINGS.md`,
 * 2026-08-10). De rol komt uit `DESIGN_ROLES`/`DEV_ROLES` hieronder; deze lijsten bepalen
 * alleen nog óf een vacature überhaupt in Jeroens vakgebied ligt.
 *
 * `frontend` telt bewust als dev en niet als design — een frontender die een design system
 * bouwt is nog steeds geen bewijs dat er een designer in het team zit.
 */
export const DESIGN_SKILLS: readonly SkillKey[] = ['ux', 'ui', 'designSystem', 'figma', 'product']
export const DEV_SKILLS: readonly SkillKey[] = ['frontend', 'nextjs', 'react', 'typescript', 'backend']

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
  whatOr: 'UX designer UI designer frontend developer product designer',
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
