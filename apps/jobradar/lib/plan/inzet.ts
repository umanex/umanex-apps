/**
 * Inzet: uren als opslag, dagen als weergave.
 *
 * `null` betekent onbekend en blijft dat door de hele keten — nooit 0. Het verschil is niet
 * cosmetisch: nul uren telt in elke som mee alsof iemand het gemeten heeft, en een plan waarin
 * de helft van de acties stilzwijgend op nul staat, ziet er goedkoper uit dan het is. Daarom
 * draagt elke som hier ook zijn noemer: `aantalOnbekend` naast `bekendUren`.
 */
import type { InzetWeergave } from './types'

export const STANDAARD_UREN_PER_DAG = 8

/** Rondt af op een kwart dag: fijner suggereert een precisie die een schatting niet heeft. */
export function urenNaarDagen(uren: number | null, urenPerDag: number): number | null {
  if (uren === null || !Number.isFinite(uren)) return null
  if (!Number.isFinite(urenPerDag) || urenPerDag <= 0) return null
  return Math.round((uren / urenPerDag) * 4) / 4
}

function getal(n: number): string {
  return n.toLocaleString('nl-BE', { maximumFractionDigits: 2 })
}

export function formatteerInzet(uren: number | null, urenPerDag: number): string {
  if (uren === null) return 'onbekend'
  const dagen = urenNaarDagen(uren, urenPerDag)
  if (dagen === null) return `${getal(uren)} u`
  return `${getal(uren)} u · ${getal(dagen)} d`
}

export function inzetWeergave(uren: number | null, urenPerDag: number): InzetWeergave {
  return {
    uren,
    dagen: urenNaarDagen(uren, urenPerDag),
    tekst: formatteerInzet(uren, urenPerDag),
  }
}

/**
 * Telt de bekende uren op en houdt bij hoeveel acties geen inschatting hebben.
 *
 * Die tweede helft is de noemer: "40 u bekend" zonder "en 6 onbekend" is een som die
 * completer oogt dan hij is.
 */
export function somInzet(
  waarden: readonly (number | null)[]
): { bekendUren: number; aantalBekend: number; aantalOnbekend: number } {
  let bekendUren = 0
  let aantalBekend = 0
  let aantalOnbekend = 0
  for (const w of waarden) {
    if (w === null) aantalOnbekend++
    else {
      bekendUren += w
      aantalBekend++
    }
  }
  // Drijvendekomma-ruis wegnemen: 0,5 + 0,1 + 0,2 mag geen 0,8000000000000001 worden.
  return { bekendUren: Math.round(bekendUren * 100) / 100, aantalBekend, aantalOnbekend }
}

const MAANDEN = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]

/**
 * `2027-01` → `januari 2027`.
 *
 * Met een opzoeklijst en niet met `new Date('2027-01')`: die parst als UTC en kan in een
 * westelijke tijdzone een maand terugvallen. Dezelfde reden dat de rest van deze app ISO-data
 * als tekst vergelijkt.
 */
export function maandLabel(lancering: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(lancering)
  if (!m) return lancering
  const maand = MAANDEN[Number(m[2]) - 1]
  return maand ? `${maand} ${m[1]}` : lancering
}
