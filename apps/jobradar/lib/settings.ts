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
  /** Losse woorden. Gaan samen in één `what_or`-verzoek per regio. */
  termen: string[]
  /**
   * Exacte zinsnedes. Elk kost een **eigen verzoek per regio**, want `what_or` en
   * `what_phrase` combineren als AND, niet als OR: `what_or=UX` (14 treffers) samen met
   * `what_phrase=design system` (1) geeft 1, de doorsnede. Gemeten op 2026-08-11.
   */
  zinsnedes: string[]
  uitsluiten: string[]
}

/** Bovengrens op het aantal termen. De URL is eindig en een lijst van honderden is geen keuze meer. */
export const MAX_TERMEN = 50

/**
 * Hard begrensd op drie, en dat is een budget en geen smaak.
 *
 * Elke zinsnede is een extra verzoek per regio. Adzuna stuurt geen limiet-headers mee en
 * weigerde eerder al bij een burst van vijftien; drie zinsnedes brengt een sync van ~9 naar
 * ~18 verzoeken. Beslissing Jeroen, 2026-08-11.
 */
export const MAX_ZINSNEDES = 3

/**
 * De gemeten standaard uit `profile.ts`.
 *
 * Blijft de bron van waarheid zolang er niets is opgeslagen, zodat een verse database zich
 * exact gedraagt zoals de variant die op 2026-08-11 op de live API is gemeten.
 */
export function standaardZoekopdracht(): Zoekopdracht {
  return {
    termen: splitsTermen(ADZUNA_SEARCH.whatOr),
    zinsnedes: [],
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
 * Normaliseert zinsnedes: trimmen, binnenin één spatie, ontdubbelen — maar **niet splitsen**.
 *
 * Dat niet-splitsen is precies het verschil met `splitsTermen`. Een zinsnede gaat als geheel
 * naar `what_phrase`; hem opdelen zou hem terugveranderen in losse woorden en het hele punt
 * ervan wegnemen.
 */
export function normaliseerZinsnedes(invoer: readonly string[]): string[] {
  const gezien = new Set<string>()
  const uit: string[] = []
  for (const rauw of invoer) {
    const z = String(rauw).trim().replace(/\s+/g, ' ')
    if (!z) continue
    const sleutel = z.toLowerCase()
    if (gezien.has(sleutel)) continue
    gezien.add(sleutel)
    uit.push(z)
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
  if (z.zinsnedes.length > MAX_ZINSNEDES) {
    return `Maximaal ${MAX_ZINSNEDES} woordcombinaties; elke kost een extra verzoek per regio. Je hebt er ${z.zinsnedes.length}.`
  }
  const losstaand = z.zinsnedes.find((zin) => !zin.includes(' '))
  if (losstaand) {
    return `"${losstaand}" is één woord — zet die bij de losse woorden, dat kost geen extra verzoek.`
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
      zinsnedes: normaliseerZinsnedes(Array.isArray(j.zinsnedes) ? j.zinsnedes.map(String) : []),
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
  return JSON.stringify({ termen: z.termen, zinsnedes: z.zinsnedes, uitsluiten: z.uitsluiten })
}

/**
 * Hoeveel verzoeken een sync minstens kost: per regio één voor de losse woorden plus één
 * per zinsnede. Paginering kan er nog bij komen, vandaar "minstens".
 */
export function minimaleVerzoeken(z: Zoekopdracht, aantalRegios: number): number {
  return aantalRegios * (1 + z.zinsnedes.length)
}

/** Of deze zoekopdracht gelijk is aan de gemeten standaard — het scherm toont dat. */
export function isStandaard(z: Zoekopdracht): boolean {
  return serialiseerZoekopdracht(z) === serialiseerZoekopdracht(standaardZoekopdracht())
}
