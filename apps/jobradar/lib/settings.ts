import { ADZUNA_SEARCH } from './config/profile'

/**
 * De zoekopdracht zoals de bron hem uitvoert: losse woorden, geen zinsdelen.
 *
 * Dat "losse woorden" is geen implementatiedetail maar het hele punt. `what_or` matcht per
 * woord en Adzuna rekt ze op, dus "product designer" is twee termen en `product` matcht óók
 * "productie" — goed voor 743 van de 1222 treffers voordat het eruit ging. Het scherm dat
 * deze termen toont splitst daarom bij invoer: wie "product designer" typt, krijgt twee
 * chips te zien in plaats van één, en ziet zo wat de bron er werkelijk mee doet.
 */
export type Zoekopdracht = {
  termen: string[]
  uitsluiten: string[]
}

/** Bovengrens op het aantal termen. De URL is eindig en een lijst van honderden is geen keuze meer. */
export const MAX_TERMEN = 50

/**
 * De gemeten standaard uit `profile.ts`.
 *
 * Blijft de bron van waarheid zolang er niets is opgeslagen, zodat een verse database zich
 * exact gedraagt zoals de variant die op 2026-08-11 op de live API is gemeten.
 */
export function standaardZoekopdracht(): Zoekopdracht {
  return {
    termen: splitsTermen(ADZUNA_SEARCH.whatOr),
    uitsluiten: splitsTermen(ADZUNA_SEARCH.whatUitsluiten),
  }
}

/** Splitst op witruimte en ontdubbelt hoofdletter-ongevoelig, met behoud van de eerste schrijfwijze. */
export function splitsTermen(invoer: string | readonly string[]): string[] {
  const woorden = (Array.isArray(invoer) ? invoer : [String(invoer)])
    .flatMap((s) => String(s).split(/\s+/))
    .map((s) => s.trim())
    .filter(Boolean)

  const gezien = new Set<string>()
  const uit: string[] = []
  for (const w of woorden) {
    const sleutel = w.toLowerCase()
    if (gezien.has(sleutel)) continue
    gezien.add(sleutel)
    uit.push(w)
  }
  return uit
}

/**
 * Geeft een leesbare reden waarom deze zoekopdracht niet opgeslagen mag worden, of `null`.
 *
 * De lege-termen-regel is geen formaliteit: zónder `what_or` geeft Adzuna élke vacature
 * binnen de straal terug. Leeg opslaan zou dus niet "niets zoeken" betekenen maar "alles".
 */
export function valideerZoekopdracht(z: Zoekopdracht): string | null {
  if (z.termen.length === 0) {
    return 'Zonder zoektermen haalt Adzuna élke vacature binnen de straal op. Voeg er minstens één toe.'
  }
  if (z.termen.length > MAX_TERMEN) {
    return `Maximaal ${MAX_TERMEN} zoektermen; je hebt er ${z.termen.length}.`
  }
  if (z.uitsluiten.length > MAX_TERMEN) {
    return `Maximaal ${MAX_TERMEN} uitsluitingen; je hebt er ${z.uitsluiten.length}.`
  }
  const overlap = z.termen.filter((t) => z.uitsluiten.some((u) => u.toLowerCase() === t.toLowerCase()))
  if (overlap.length > 0) {
    return `"${overlap[0]}" staat zowel bij de zoektermen als bij de uitsluitingen.`
  }
  return null
}

/** Zet een opgeslagen JSON-waarde om, en valt op de standaard terug als er iets niet klopt. */
export function parseZoekopdracht(rauw: string | null | undefined): Zoekopdracht {
  if (!rauw) return standaardZoekopdracht()
  try {
    const j = JSON.parse(rauw) as Partial<Zoekopdracht>
    const z = {
      termen: splitsTermen(Array.isArray(j.termen) ? j.termen.map(String) : []),
      uitsluiten: splitsTermen(Array.isArray(j.uitsluiten) ? j.uitsluiten.map(String) : []),
    }
    // Een opgeslagen waarde die niet meer geldig is (leeg geraakt, handmatig bewerkt) mag de
    // sync niet stilzwijgend alles laten ophalen.
    return valideerZoekopdracht(z) === null ? z : standaardZoekopdracht()
  } catch {
    return standaardZoekopdracht()
  }
}

export function serialiseerZoekopdracht(z: Zoekopdracht): string {
  return JSON.stringify({ termen: z.termen, uitsluiten: z.uitsluiten })
}

/** Of deze zoekopdracht gelijk is aan de gemeten standaard — het scherm toont dat. */
export function isStandaard(z: Zoekopdracht): boolean {
  return serialiseerZoekopdracht(z) === serialiseerZoekopdracht(standaardZoekopdracht())
}
