/**
 * De regels rond afhankelijkheden: bestaan, zelfverwijzing en cirkels.
 *
 * Een cirkel is geen schoonheidsfout maar een dodelijke toestand: elke actie in de cirkel
 * wacht op een andere die op haar wacht, dus geen enkele wordt ooit beschikbaar. De app kan
 * dat niet zelf oplossen — welke kant eruit moet is een inhoudelijke keuze — dus weigert ze
 * de wijziging en noemt het pad, zodat je ziet wélke keten je sluit.
 */
import type { Gekeurd } from '../contact'
import type { ActieStatus } from '../db/schema'

/** `van` hangt af van `naar`. */
export type Kant = { van: string; naar: string }

export type ActieRef = { status: ActieStatus }

export const MAX_AFHANKELIJKHEDEN = 12

/**
 * Zoekt een cirkel die ontstaat wanneer `key` van `nieuwe` gaat afhangen.
 *
 * Werkwijze: neem alle bestaande kanten behalve die van `key` zelf (die worden vervangen),
 * voeg de nieuwe toe, en loop vanaf `key` de keten af. Kom je bij `key` terug, dan is het pad
 * de cirkel. Iteratief met een expliciete stapel — 22 acties is klein, maar een recursieve
 * variant zou bij een lange keten stil de stack opblazen in plaats van een melding te geven.
 */
export function vindCirkel(
  key: string,
  nieuwe: readonly string[],
  bestaande: readonly Kant[]
): string[] | null {
  const uit = new Map<string, string[]>()
  for (const k of bestaande) {
    if (k.van === key) continue // wordt vervangen door `nieuwe`
    const lijst = uit.get(k.van)
    if (lijst) lijst.push(k.naar)
    else uit.set(k.van, [k.naar])
  }
  uit.set(key, [...nieuwe])

  const stapel: string[][] = [[key]]
  const gezien = new Set<string>()

  while (stapel.length > 0) {
    const pad = stapel.pop() as string[]
    const laatste = pad[pad.length - 1] as string
    for (const volgende of uit.get(laatste) ?? []) {
      if (volgende === key) return [...pad, key]
      // Een knoop die al bekeken is, kan geen nieuwe weg terug naar `key` openen.
      if (gezien.has(volgende)) continue
      gezien.add(volgende)
      stapel.push([...pad, volgende])
    }
  }
  return null
}

/** Wie hangt er van `key` af? Nodig om bij het heropenen te weten wie je moet waarschuwen. */
export function afhankelijkenVan(key: string, kanten: readonly Kant[]): string[] {
  return kanten
    .filter((k) => k.naar === key)
    .map((k) => k.van)
    .sort()
}

export function afhankelijkhedenVan(key: string, kanten: readonly Kant[]): string[] {
  return kanten
    .filter((k) => k.van === key)
    .map((k) => k.naar)
    .sort()
}

/**
 * Keurt de volledige nieuwe verzameling afhankelijkheden van één actie.
 *
 * Vervangend en niet toevoegend: de UI stuurt de lijst zoals hij hoort te worden. Dat maakt
 * verwijderen en vervangen één handeling, en het houdt de cirkelcontrole eerlijk — die moet
 * de eindtoestand toetsen, niet de tussenstap.
 *
 * Een **vervallen** actie mag geen afhankelijkheid zijn: vervallen betekent niet geslaagd
 * afgerond, dus eraan hangen zou een blokkade opleveren die nooit meer opengaat.
 */
export function keurAfhankelijkheden(
  key: string,
  nieuwe: unknown,
  acties: ReadonlyMap<string, ActieRef>,
  bestaande: readonly Kant[]
): Gekeurd<string[]> {
  if (!Array.isArray(nieuwe)) return { ok: false, reden: 'afhankelijkheden moet een lijst zijn' }
  if (nieuwe.length > MAX_AFHANKELIJKHEDEN) {
    return { ok: false, reden: `hoogstens ${MAX_AFHANKELIJKHEDEN} afhankelijkheden per actie` }
  }

  const uniek: string[] = []
  for (const rauw of nieuwe) {
    if (typeof rauw !== 'string') return { ok: false, reden: 'elke afhankelijkheid is een key' }
    const k = rauw.trim()
    if (k === '') return { ok: false, reden: 'een lege key is geen afhankelijkheid' }
    if (k === key) return { ok: false, reden: 'een actie kan niet van zichzelf afhangen' }
    const doelwit = acties.get(k)
    if (!doelwit) return { ok: false, reden: `${k} bestaat niet` }
    if (doelwit.status === 'vervallen') {
      return { ok: false, reden: `${k} is vervallen — kies een andere actie` }
    }
    if (!uniek.includes(k)) uniek.push(k)
  }
  uniek.sort()

  const cirkel = vindCirkel(key, uniek, bestaande)
  if (cirkel) {
    return {
      ok: false,
      reden: `dit sluit een cirkel: ${cirkel.join(' → ')} — dan kan geen van beide ooit starten`,
    }
  }

  return { ok: true, waarde: uniek }
}
