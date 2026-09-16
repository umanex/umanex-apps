/**
 * Alles wat uit de opgeslagen rijen volgt: blokkades, uitvoerbaarheid, signalen, voortgang,
 * startvoorwaarden en de eerstvolgende actie.
 *
 * Puur — geen database, geen klok, geen Next. Dat is niet alleen testbaarheid: een afgeleide
 * toestand die je zou opslaan, veroudert stil zodra de rij waaruit ze volgt verandert. "A02 is
 * geblokkeerd" is waar zolang A01 niet gereed is, en die uitspraak hoort dus nergens anders
 * te bestaan dan hier, elke keer opnieuw berekend.
 *
 * Eén regel loopt door dit hele bestand: **afleiden schrijft nooit.** Ook niet "even" een
 * status bijwerken omdat een afhankelijkheid heropend is — dat wordt een signaal, en Jeroen
 * beslist wat ermee gebeurt.
 */
import type { PlanActie, PlanBeslissing } from '../db/schema'
import { afhankelijkenVan, afhankelijkhedenVan, type Kant } from './afhankelijkheden'
import { inzetWeergave, somInzet } from './inzet'
import {
  BEWIJS_STARTVOORWAARDEN,
  HARDE_STARTVOORWAARDEN,
  NIET_VEREIST_VOOR_START,
  PRIORITEIT_LABEL,
} from './seed-inhoud'
import {
  ACTIE_STATUSSEN,
  PRIORITEITEN,
  STATUS_LABEL_INLINE,
  type ActieStatus,
  type ActieWeergave,
  type BeslismomentStatus,
  type BeslissingWeergave,
  type Blokkade,
  type FocusConflict,
  type KoppelingWeergave,
  type Overzicht,
  type PlanInstellingen,
  type PlanLink,
  type Prioriteit,
  type Signaal,
  type Startvoorwaarde,
  type Startvoorwaarden,
  type Uitvoerbaarheid,
  type VoortgangGroep,
  type VolgendeActie,
} from './types'

export type PlanInvoer = {
  acties: readonly PlanActie[]
  kanten: readonly Kant[]
  beslissingen: readonly PlanBeslissing[]
  /** Per actie-key de gekoppelde bedrijven, al opgezocht. */
  koppelingen: ReadonlyMap<string, KoppelingWeergave[]>
  instellingen: PlanInstellingen
}

/** Prioriteit, dan volgorde, dan key. De key sluit de sortering zodat ze stabiel is. */
export function vergelijkActies(
  a: { prioriteit: number; volgorde: number; key: string },
  b: { prioriteit: number; volgorde: number; key: string }
): number {
  if (a.prioriteit !== b.prioriteit) return a.prioriteit - b.prioriteit
  if (a.volgorde !== b.volgorde) return a.volgorde - b.volgorde
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

export function parseLinks(rauw: string): PlanLink[] {
  try {
    const v: unknown = JSON.parse(rauw)
    if (!Array.isArray(v)) return []
    return v.flatMap((x) => {
      if (typeof x !== 'object' || x === null) return []
      const r = x as Record<string, unknown>
      if (typeof r.url !== 'string') return []
      return [{ label: typeof r.label === 'string' ? r.label : r.url, url: r.url }]
    })
  } catch {
    return []
  }
}

export function parseKeys(rauw: string): string[] {
  try {
    const v: unknown = JSON.parse(rauw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * Waarop deze actie wacht.
 *
 * Een vervallen afhankelijkheid is `hard`: vervallen betekent "gaat niet door", niet "is
 * gelukt". De opdracht is daar expliciet over — de app mag zo'n afhankelijkheid niet als
 * gehaald tellen, en mag ze ook niet zelf weghalen. Jeroen verwijdert of vervangt hem.
 */
export function blokkadeVan(
  actie: PlanActie,
  afhankelijkheden: readonly PlanActie[]
): Blokkade[] {
  const uit: Blokkade[] = []
  for (const dep of afhankelijkheden) {
    if (dep.status === 'gereed') continue
    if (dep.status === 'vervallen') {
      uit.push({
        key: dep.key,
        titel: dep.titel,
        status: dep.status as ActieStatus,
        hard: true,
        reden: `${dep.key} is vervallen — verwijder of vervang de afhankelijkheid`,
      })
    } else {
      uit.push({
        key: dep.key,
        titel: dep.titel,
        status: dep.status as ActieStatus,
        hard: false,
        reden: `wacht op ${dep.key} (${STATUS_LABEL_INLINE[dep.status as ActieStatus]})`,
      })
    }
  }
  return uit.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

export function uitvoerbaarheidVan(actie: PlanActie, blokkade: readonly Blokkade[]): Uitvoerbaarheid {
  switch (actie.status as ActieStatus) {
    case 'bezig':
      return 'actief'
    case 'gereed':
      return 'gereed'
    case 'uitgesteld':
      return 'uitgesteld'
    case 'vervallen':
      return 'vervallen'
    case 'wacht_op_input':
      return 'wacht'
    default: {
      if (blokkade.length === 0) return 'beschikbaar'
      if (blokkade.some((b) => b.hard)) return 'geblokkeerd'
      // Een vastgelegde uitzondering maakt de actie startbaar, maar blijft zichtbaar als
      // signaal — de blokkade is niet weg, ze is bewust genegeerd.
      return actie.startUitzondering ? 'beschikbaar' : 'geblokkeerd'
    }
  }
}

/**
 * Wat er aan deze actie opvalt zonder dat haar eigen status het zegt.
 *
 * Alleen voor acties die lopen of klaar zijn: een actie die nog niet gestart is en een
 * onvervulde afhankelijkheid heeft, is gewoon geblokkeerd — dat is geen signaal maar de
 * normale toestand.
 *
 * Het heropend-signaal leest af aan de data en niet aan de geschiedenis: heropenen laat
 * `afgerond_op` staan, dus "ooit gereed geweest en nu niet meer" is zichtbaar in de rij zelf.
 */
export function signalenVan(actie: PlanActie, afhankelijkheden: readonly PlanActie[]): Signaal[] {
  const uit: Signaal[] = []

  if (actie.status === 'bezig' || actie.status === 'gereed') {
    for (const dep of afhankelijkheden) {
      if (dep.status === 'gereed') continue
      if (dep.status === 'vervallen') {
        uit.push({
          soort: 'afhankelijkheid_vervallen',
          key: dep.key,
          tekst: `${dep.key} is vervallen en telt niet als afgerond`,
        })
      } else if (dep.afgerondOp !== null) {
        uit.push({
          soort: 'afhankelijkheid_heropend',
          key: dep.key,
          tekst: `${dep.key} is heropend en niet meer gereed`,
        })
      }
    }
  }

  if (actie.startUitzondering && actie.status !== 'gereed') {
    uit.push({
      soort: 'gestart_met_uitzondering',
      key: actie.key,
      tekst: `gestart met een uitzondering: ${actie.startUitzondering}`,
    })
  }

  return uit
}

export function actieveActies(acties: readonly PlanActie[]): PlanActie[] {
  return acties.filter((a) => a.status === 'bezig')
}

/**
 * Staat de focusregel een start van `key` toe?
 *
 * Geeft de actieve acties terug in plaats van alleen "nee", want dat is precies wat de
 * gebruiker moet zien om te kiezen: welke drie lopen er, en welke wil je parkeren. Een kale
 * weigering zou hem dwingen zelf te gaan zoeken.
 */
export function focusConflict(
  acties: readonly PlanActie[],
  limiet: number,
  key: string
): FocusConflict | null {
  const actief = actieveActies(acties).filter((a) => a.key !== key)
  if (actief.length < limiet) return null
  return {
    conflict: 'focus',
    limiet,
    actief: [...actief]
      .sort(vergelijkActies)
      .map((a) => ({ key: a.key, titel: a.titel, volgendeStap: a.volgendeStap })),
  }
}

function legeTelling(): Record<ActieStatus, number> {
  const uit = {} as Record<ActieStatus, number>
  for (const s of ACTIE_STATUSSEN) uit[s] = 0
  return uit
}

/**
 * Voortgang per prioriteitsgroep, als telling.
 *
 * Nadrukkelijk ongewogen, en dat staat ook in de uitvoer: A01 afbakenen en A14 cashplanning
 * zijn niet even zwaar, en een percentage zou precies dat suggereren. Vervallen acties vallen
 * buiten `totaal` — ze zijn geen werk meer.
 */
export function voortgangPerPrioriteit(acties: readonly ActieWeergave[]): VoortgangGroep[] {
  return PRIORITEITEN.map((prioriteit) => {
    const groep = acties.filter((a) => a.prioriteit === prioriteit)
    const perStatus = legeTelling()
    for (const a of groep) perStatus[a.status as ActieStatus]++

    const telt = groep.filter((a) => a.status !== 'vervallen')
    return {
      prioriteit: prioriteit as Prioriteit,
      label: PRIORITEIT_LABEL[prioriteit as Prioriteit],
      perStatus,
      totaal: telt.length,
      geblokkeerd: groep.filter((a) => a.uitvoerbaarheid === 'geblokkeerd').length,
      beschikbaar: groep.filter((a) => a.uitvoerbaarheid === 'beschikbaar').length,
      inzet: somInzet(telt.map((a) => a.inschattingUren)),
      toelichting: 'aantal acties, ongewogen',
    }
  })
}

function voorwaarde(keys: readonly string[], acties: ReadonlyMap<string, PlanActie>): Startvoorwaarde[] {
  return keys.map((key) => {
    const a = acties.get(key)
    if (!a) {
      // Kan alleen door een handmatige ingreep in de database. Zichtbaar maken is beter dan
      // stil overslaan: een ontbrekende voorwaarde die niet getoond wordt, telt als gehaald.
      return { key, titel: '(ontbreekt)', status: 'niet_gestart' as ActieStatus, gereed: false }
    }
    return { key, titel: a.titel, status: a.status as ActieStatus, gereed: a.status === 'gereed' }
  })
}

/**
 * De stand van de startvoorwaarden voor januari 2027.
 *
 * Dit is een aflees-lijst, geen conclusie. De opdracht is expliciet: de app mag niet zelf
 * besluiten dat het bedrijf financieel of juridisch klaar is. Vandaar dat het startbesluit
 * een eigen record is dat Jeroen invult, en dat hier alleen meegegeven wordt.
 */
export function startvoorwaarden(
  acties: ReadonlyMap<string, PlanActie>,
  startbesluit: BeslissingWeergave | null
): Startvoorwaarden {
  const hard = voorwaarde(HARDE_STARTVOORWAARDEN, acties)
  const bewijs = voorwaarde(BEWIJS_STARTVOORWAARDEN, acties)
  return {
    hard,
    hardGereed: hard.filter((v) => v.gereed).length,
    bewijs,
    bewijsGereed: bewijs.filter((v) => v.gereed).length,
    nietVereist: voorwaarde(NIET_VEREIST_VOOR_START, acties),
    startbesluit,
  }
}

/**
 * De stand van een beslismoment.
 *
 * Alle gekoppelde acties gereed levert `klaar_voor_beoordeling` — niet `beslist`. Dat
 * onderscheid is de hele reden dat beslismomenten een eigen tabel hebben: de app mag
 * vaststellen dat er iets te beoordelen valt, nooit dat het goedgekeurd is.
 */
export function beslismomentStatus(
  beslissing: PlanBeslissing,
  acties: ReadonlyMap<string, PlanActie>
): { afgeleid: BeslismomentStatus; gereed: number; totaal: number; keys: string[] } {
  const keys = parseKeys(beslissing.acties)
  const gereed = keys.filter((k) => acties.get(k)?.status === 'gereed').length
  const beslist = (beslissing.beslissing ?? '').trim() !== ''
  const afgeleid: BeslismomentStatus = beslist
    ? 'beslist'
    : keys.length > 0 && gereed === keys.length
      ? 'klaar_voor_beoordeling'
      : 'wacht'
  return { afgeleid, gereed, totaal: keys.length, keys }
}

/**
 * Wat je nú zou doen.
 *
 * Volgorde: een lopende actie mét volgende stap wint, dan een lopende zonder stap (dan is
 * "bepaal de volgende stap" het antwoord), dan de eerste beschikbare. Geen enkele van de
 * drie? Dan is er niets te doen zonder eerst iets te deblokkeren, en dat is `null` — geen
 * verzonnen suggestie.
 */
export function belangrijksteVolgendeActie(acties: readonly ActieWeergave[]): VolgendeActie | null {
  const gesorteerd = [...acties].sort(vergelijkActies)
  const actief = gesorteerd.filter((a) => a.uitvoerbaarheid === 'actief')

  const metStap = actief.find((a) => (a.volgendeStap ?? '').trim() !== '')
  if (metStap) return { key: metStap.key, reden: 'actief' }
  if (actief.length > 0) return { key: (actief[0] as ActieWeergave).key, reden: 'actief_zonder_stap' }

  const beschikbaar = gesorteerd.find((a) => a.uitvoerbaarheid === 'beschikbaar')
  return beschikbaar ? { key: beschikbaar.key, reden: 'beschikbaar' } : null
}

export function leidAf(invoer: PlanInvoer): {
  acties: ActieWeergave[]
  beslissingen: BeslissingWeergave[]
  overzicht: Overzicht
} {
  const perKey = new Map<string, PlanActie>()
  for (const a of invoer.acties) perKey.set(a.key, a)

  const acties: ActieWeergave[] = [...invoer.acties]
    .sort(vergelijkActies)
    .map((actie) => {
      const afhKeys = afhankelijkhedenVan(actie.key, invoer.kanten)
      const deps = afhKeys.flatMap((k) => {
        const d = perKey.get(k)
        return d ? [d] : []
      })
      const blokkade = blokkadeVan(actie, deps)
      return {
        ...actie,
        links: parseLinks(actie.links),
        afhankelijkheden: afhKeys,
        afhankelijken: afhankelijkenVan(actie.key, invoer.kanten),
        uitvoerbaarheid: uitvoerbaarheidVan(actie, blokkade),
        blokkade,
        signalen: signalenVan(actie, deps),
        inzet: inzetWeergave(actie.inschattingUren, invoer.instellingen.urenPerDag),
        resterend: inzetWeergave(actie.resterendUren, invoer.instellingen.urenPerDag),
        koppelingen: invoer.koppelingen.get(actie.key) ?? [],
      }
    })

  const beslissingen: BeslissingWeergave[] = [...invoer.beslissingen]
    .sort((a, b) => a.volgorde - b.volgorde)
    .map((b) => {
      const stand = beslismomentStatus(b, perKey)
      return {
        ...b,
        acties: stand.keys,
        afgeleid: stand.afgeleid,
        gereed: stand.gereed,
        totaal: stand.totaal,
      }
    })

  const keysMet = (u: Uitvoerbaarheid) =>
    acties.filter((a) => a.uitvoerbaarheid === u).map((a) => a.key)

  const overzicht: Overzicht = {
    nuBezig: keysMet('actief'),
    beschikbaar: keysMet('beschikbaar'),
    geblokkeerd: keysMet('geblokkeerd'),
    wacht: keysMet('wacht'),
    uitgesteld: keysMet('uitgesteld'),
    voortgang: voortgangPerPrioriteit(acties),
    startvoorwaarden: startvoorwaarden(
      perKey,
      beslissingen.find((b) => b.soort === 'start') ?? null
    ),
    volgendeActie: belangrijksteVolgendeActie(acties),
    signalen: acties.flatMap((a) => a.signalen.map((s) => ({ ...s, actie: a.key }))),
  }

  return { acties, beslissingen, overzicht }
}
