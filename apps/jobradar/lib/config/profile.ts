export const SKILL_KEYWORDS = {
  ux: ['ux', 'user experience', 'usability', 'user research', 'ux design', 'gebruikerservaring', 'interaction design'],
  ui: ['ui', 'user interface', 'visual design', 'ui design', 'interface design'],
  frontend: ['frontend', 'front-end', 'front end', 'web developer', 'web development'],
  nextjs: ['next.js', 'nextjs', 'next js'],
  react: ['react', 'reactjs', 'react.js'],
  designSystem: ['design system', 'storybook', 'component library', 'design tokens', 'tokens studio'],
  figma: ['figma', 'sketch', 'adobe xd'],
  typescript: ['typescript'],
  product: ['product designer', 'product design', 'product manager'],
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
}

/**
 * Welke skill-clusters een vacature tot een *design*- dan wel *dev*-vacature maken.
 *
 * Dit is de as waarop de afgeleide bedrijfssignalen draaien (`lib/signals.ts`): een bedrijf
 * dat dev-vacatures post en geen design-vacature, heeft werk waar geen designer aan komt.
 * `frontend` telt bewust als dev en niet als design — een frontender die een design system
 * bouwt is nog steeds geen bewijs dat er een designer in het team zit.
 */
export const DESIGN_SKILLS: readonly SkillKey[] = ['ux', 'ui', 'designSystem', 'figma', 'product']
export const DEV_SKILLS: readonly SkillKey[] = ['frontend', 'nextjs', 'react', 'typescript']

/** Drempels voor de signaal-afleiding. Hier draaien, niet in de logica zelf. */
export const SIGNAL_THRESHOLDS = {
  /** Vanaf hoeveel gelijktijdige vacatures een bedrijf als groeiend telt. */
  groeiVacatures: 3,
  /** Binnen hoeveel dagen een vacature nog als "recent" meetelt voor het groeisignaal. */
  groeiVensterDagen: 60,
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
