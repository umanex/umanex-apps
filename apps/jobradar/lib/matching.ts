import type { RawJob, RawLead } from './sources/types'
import { SKILL_KEYWORDS, KEYWORD_WEIGHTS, SIGNAL_WEIGHTS, type SkillKey } from './config/profile'

export type ScoreBreakdown = Record<string, number>

/**
 * Woordgrens-match per keyword, één keer gecompileerd.
 *
 * Hiervoor stond hier `text.includes(kw)`, en dat vuurde op fragmenten: `'ui'` zit in
 * "gebruikers", "herbruikbare", "build", "requirements" en "guidelines", `'ux'` in "luxe".
 * Elke Nederlandstalige vacature scoorde daardoor 15 punten voor UI die ze niet verdiende —
 * en erger, de design/dev-classificatie waarop de bedrijfssignalen draaien werd onzin.
 */
const KEYWORD_PATRONEN: Record<SkillKey, RegExp[]> = Object.fromEntries(
  Object.entries(SKILL_KEYWORDS).map(([key, keywords]) => [
    key,
    (keywords as readonly string[]).map(
      (kw) => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}\\b`, 'i')
    ),
  ])
) as Record<SkillKey, RegExp[]>

/** Welke skill-clusters deze tekst raakt. De basis onder zowel de score als de signalen. */
export function matchedSkills(job: Pick<RawJob, 'title' | 'description'>): SkillKey[] {
  const text = `${job.title} ${job.description}`
  return (Object.keys(KEYWORD_PATRONEN) as SkillKey[]).filter((key) =>
    KEYWORD_PATRONEN[key].some((patroon) => patroon.test(text))
  )
}

export function scoreJob(job: Pick<RawJob, 'title' | 'description'>): {
  score: number
  breakdown: ScoreBreakdown
} {
  const breakdown: ScoreBreakdown = {}
  let total = 0

  for (const key of matchedSkills(job)) {
    const w = KEYWORD_WEIGHTS[key] ?? 0
    breakdown[key] = w
    total += w
  }

  return { score: Math.min(100, total), breakdown }
}

export function scoreLead(lead: Pick<RawLead, 'signals'>): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {}
  let total = 0

  for (const signal of lead.signals) {
    const w = SIGNAL_WEIGHTS[signal] ?? 5
    breakdown[signal] = w
    total += w
  }

  return { score: Math.min(100, total), breakdown }
}

/** Normaliseert een bedrijfsnaam tot iets waarop twee bronnen elkaar kunnen vinden. */
export function normaliseerBedrijf(naam: string): string {
  return naam
    .toLowerCase()
    .replace(/\b(bv|nv|bvba|vzw|comm\.?\s?v|sa|sprl|ltd|inc|gmbh)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * De plaats-component van een dedupe-sleutel.
 *
 * Adzuna levert geen postcode, dus stond hier voor élke live vacature `0` — waarmee twee
 * vacatures met dezelfde titel bij hetzelfde bedrijf in verschillende steden tot één rij
 * samenvielen. De stad is wat de bron wél geeft; de postcode blijft de sleutel voor bronnen
 * die hem hebben, en de regio is de laatste terugval.
 */
function plaatsSleutel(item: { city?: string | null; postcode: number; region: string }): string {
  if (item.city) return item.city.toLowerCase().trim()
  if (item.postcode > 0) return String(item.postcode)
  return item.region
}

export function jobDedupeHash(job: Pick<RawJob, 'title' | 'company' | 'city' | 'postcode' | 'region'>): string {
  return [
    job.title.toLowerCase().trim(),
    normaliseerBedrijf(job.company),
    plaatsSleutel(job),
  ].join('|')
}

export function leadDedupeHash(lead: Pick<RawLead, 'companyName' | 'postcode' | 'region'>): string {
  return [normaliseerBedrijf(lead.companyName), plaatsSleutel({ ...lead, city: null })].join('|')
}
