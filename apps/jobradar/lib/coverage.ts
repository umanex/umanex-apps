import { classificeer } from './signals'
import type { RawJob } from './sources/types'

export type Dekking = {
  design: number
  dev: number
  onbepaald: number
  totaal: number
  geclassificeerd: number
}

/**
 * Telt hoeveel vacatures de classificatie kan plaatsen.
 *
 * Wordt op de huidige code gerekend, niet op wat bij de sync gold. Dat is het punt: wijzigt
 * `classificeer`, dan bewegen deze cijfers mee, en zie je meteen wat een aanpassing aan de
 * woordenlijsten met de dekking doet. Cijfers die bij de sync waren weggeschreven zouden
 * juist verbergen wat er sindsdien veranderd is.
 *
 * Losse functie en geen inline reduce in de pagina, zodat de invarianten
 * (`design + dev + onbepaald == totaal`) toetsbaar zijn zonder Next op te starten.
 */
export function berekenDekking(
  jobs: ReadonlyArray<Pick<RawJob, 'title'> & { description: string | null }>
): Dekking {
  let design = 0
  let dev = 0
  let onbepaald = 0

  for (const job of jobs) {
    const soort = classificeer({ title: job.title, description: job.description ?? '' })
    if (soort === 'design') design++
    else if (soort === 'dev') dev++
    else onbepaald++
  }

  return { design, dev, onbepaald, totaal: jobs.length, geclassificeerd: design + dev }
}
