/**
 * De selectie- en voortgangslogica van het labelscherm, los van React.
 *
 * Staat hier en niet in de component omdat dit het deel is dat fout kan gaan zonder dat je het
 * ziet: welk bedrijf is het volgende, telt dit als afgehandeld, waar sta je. Een teller die
 * verkeerd telt ziet er in de UI precies hetzelfde uit als een teller die klopt.
 */
import type { Classificatie } from './db/schema'

/** Wat het labelscherm van een bedrijf nodig heeft. Bewust smaller dan de hele tabelrij. */
export type Prospect = {
  id: number
  companyName: string
  postcode: number
  region: string
  naceCode: string | null
  url: string | null
  werknemers: number | null
  classificatie: Classificatie | null
  geclassificeerdOp: string | null
  signals: string[]
}

/**
 * Of een oordeel de zaak afsluit.
 *
 * `beide` telt mee als afgehandeld en `twijfel` niet — dat is de hele reden dat het twee
 * waarden zijn. Wie ze samenneemt krijgt een tweede ronde waarin afgehandelde en onafgehandelde
 * gevallen door elkaar staan, en dan is die ronde waardeloos.
 */
export const isAfgehandeld = (c: Classificatie | null): boolean =>
  c !== null && c !== 'twijfel'

/** Of een bedrijf nog beoordeeld moet worden: nooit gelabeld, of geparkeerd op twijfel. */
export const wachtOpOordeel = (p: Prospect): boolean => !isAfgehandeld(p.classificatie)

export type Voortgang = {
  totaal: number
  afgehandeld: number
  ongelabeld: number
  twijfel: number
  perClassificatie: Record<string, number>
  percentage: number
}

export function berekenVoortgang(prospects: readonly Prospect[]): Voortgang {
  const perClassificatie: Record<string, number> = {}
  let afgehandeld = 0
  let twijfel = 0
  let ongelabeld = 0

  for (const p of prospects) {
    if (p.classificatie === null) {
      ongelabeld++
      continue
    }
    perClassificatie[p.classificatie] = (perClassificatie[p.classificatie] ?? 0) + 1
    if (p.classificatie === 'twijfel') twijfel++
    else afgehandeld++
  }

  const totaal = prospects.length
  return {
    totaal,
    afgehandeld,
    ongelabeld,
    twijfel,
    perClassificatie,
    // Op afgehandeld, niet op "heeft een label": anders loopt de balk naar 100% terwijl er nog
    // een stapel twijfelgevallen ligt, en dan meldt hij klaar te zijn zonder dat te zijn.
    percentage: totaal === 0 ? 0 : Math.round((afgehandeld / totaal) * 100),
  }
}

export type Wachtrij = 'ongelabeld' | 'twijfel' | 'alles'

/**
 * De werkvoorraad in de volgorde waarin je hem afwerkt.
 *
 * Bedrijven MET een website eerst: die kan je meteen beoordelen, terwijl de rest eerst een
 * zoekactie vraagt. Gemeten op de dump heeft maar 6% er een, dus zonder deze sortering begin je
 * je sessie met honderden bedrijven waar je niets mee kan.
 */
export function bouwWachtrij(prospects: readonly Prospect[], welke: Wachtrij): Prospect[] {
  const gefilterd = prospects.filter((p) => {
    if (welke === 'twijfel') return p.classificatie === 'twijfel'
    if (welke === 'ongelabeld') return p.classificatie === null
    return wachtOpOordeel(p)
  })
  return gefilterd.sort((a, b) => {
    const site = Number(Boolean(b.url)) - Number(Boolean(a.url))
    if (site !== 0) return site
    return a.companyName.localeCompare(b.companyName, 'nl-BE')
  })
}

/**
 * Waar de sessie hervat moet worden.
 *
 * Het eerste bedrijf uit de wachtrij, en niet "waar je gebleven was" uit een opgeslagen index:
 * die index verschuift zodra er iets gelabeld of geïmporteerd wordt, en dan land je ergens
 * anders dan waar je dacht. De wachtrij zelf is de plek.
 */
export const hervatOp = (wachtrij: readonly Prospect[]): Prospect | null => wachtrij[0] ?? null

/** Het volgende bedrijf ná `huidigeId`, of het eerste als die er niet meer in staat. */
export function volgende(wachtrij: readonly Prospect[], huidigeId: number | null): Prospect | null {
  if (wachtrij.length === 0) return null
  if (huidigeId === null) return wachtrij[0] ?? null
  const i = wachtrij.findIndex((p) => p.id === huidigeId)
  if (i === -1) return wachtrij[0] ?? null
  return wachtrij[i + 1] ?? null
}

/** Het vorige bedrijf, voor de terug-actie. */
export function vorige(wachtrij: readonly Prospect[], huidigeId: number | null): Prospect | null {
  if (huidigeId === null) return null
  const i = wachtrij.findIndex((p) => p.id === huidigeId)
  return i > 0 ? (wachtrij[i - 1] ?? null) : null
}

/**
 * De zoekopdracht voor een bedrijf zonder website.
 *
 * Naam plus gemeente plus België: de gemeente omdat Belgische bedrijfsnamen elkaar veelvuldig
 * overlappen, en `België` omdat een kale naam anders bij een buitenlandse naamgenoot uitkomt.
 */
export const zoekopdracht = (p: Prospect): string =>
  `"${p.companyName}" ${p.postcode} België`

/** De sneltoets per classificatie: index in CLASSIFICATIES plus één. */
export const sneltoetsVoor = (index: number): string => String(index + 1)
