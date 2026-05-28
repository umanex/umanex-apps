import type { RawJob, RawLead } from './sources/types'
import { SKILL_KEYWORDS, KEYWORD_WEIGHTS, SIGNAL_WEIGHTS } from './config/profile'

export type ScoreBreakdown = Record<string, number>

export function scoreJob(job: RawJob): { score: number; breakdown: ScoreBreakdown } {
  const text = `${job.title} ${job.description}`.toLowerCase()
  const breakdown: ScoreBreakdown = {}
  let total = 0

  for (const [key, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const matched = (keywords as readonly string[]).some((kw) => text.includes(kw))
    if (matched) {
      const w = KEYWORD_WEIGHTS[key as keyof typeof KEYWORD_WEIGHTS] ?? 0
      breakdown[key] = w
      total += w
    }
  }

  return { score: Math.min(100, total), breakdown }
}

export function scoreLead(lead: RawLead): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {}
  let total = 0

  for (const signal of lead.signals) {
    const w = SIGNAL_WEIGHTS[signal] ?? 5
    breakdown[signal] = w
    total += w
  }

  return { score: Math.min(100, total), breakdown }
}

export function jobDedupeHash(job: RawJob): string {
  return [
    job.title.toLowerCase().trim(),
    job.company.toLowerCase().trim(),
    String(job.postcode),
  ].join('|')
}

export function leadDedupeHash(lead: RawLead): string {
  return [lead.companyName.toLowerCase().trim(), String(lead.postcode)].join('|')
}
