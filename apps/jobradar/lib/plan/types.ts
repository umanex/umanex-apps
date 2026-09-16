/**
 * De types en labels van het bedrijfsplan.
 *
 * Los van de database en van Next, zodat `scripts/plan-scenarios.ts` ze kan gebruiken zonder
 * een server-only import mee te slepen. Dezelfde reden dat `lib/db/ddl.ts` los staat van
 * `index.ts`.
 */
import type {
  ActieBron,
  ActieStatus,
  BeslissingSoort,
  IdeeStatus,
  PlanActie,
  PlanBeslissing,
  PlanHistorie,
  PlanIdee,
  SubjectType,
} from '../db/schema'
import { ACTIE_STATUSSEN } from '../db/schema'
import type { Prioriteit } from './seed-inhoud'

export type { ActieBron, ActieStatus, BeslissingSoort, IdeeStatus, PlanIdee, Prioriteit }
export { ACTIE_STATUSSEN }

export const STATUS_LABEL: Record<ActieStatus, string> = {
  niet_gestart: 'Niet gestart',
  bezig: 'Bezig',
  wacht_op_input: 'Wacht op input',
  gereed: 'Gereed',
  uitgesteld: 'Uitgesteld',
  vervallen: 'Vervallen',
}

/** Kleine letter, voor midden in een zin: "wacht op A01 (niet gestart)". */
export const STATUS_LABEL_INLINE: Record<ActieStatus, string> = {
  niet_gestart: 'niet gestart',
  bezig: 'bezig',
  wacht_op_input: 'wacht op input',
  gereed: 'gereed',
  uitgesteld: 'uitgesteld',
  vervallen: 'vervallen',
}

export const PRIORITEITEN: readonly Prioriteit[] = [1, 2, 3, 4] as const

/**
 * Waar een geparkeerde actie heen gaat.
 *
 * Terug naar "niet gestart" en niet naar een eigen status: ze verschijnt dan weer onder
 * Beschikbaar, en dat is de waarheid — er is niets aan haar veranderd behalve dat je er
 * nu niet aan werkt. Volgende stap en resterende inzet blijven staan.
 */
export const PARKEER_STATUS: ActieStatus = 'niet_gestart'

/**
 * De velden waarvan een wijziging in de geschiedenis landt.
 *
 * Bewust kort. De opdracht vraagt om "belangrijke wijzigingen"; alles loggen maakt de
 * geschiedenis onleesbaar en daarmee even nutteloos als niets loggen.
 */
export const HISTORIE_VELDEN = [
  'status',
  'afhankelijkheden',
  'gereedcriterium',
  'bewijs',
  'beslissing',
  'focus_uitzondering',
  'start_uitzondering',
  'afhankelijkheid_heropend',
] as const
export type HistorieVeld = (typeof HISTORIE_VELDEN)[number]

export type PlanLink = { label: string; url: string }

export type PlanInstellingen = {
  /** `YYYY-MM`, de beoogde start. Instelbaar; de opdracht noemt januari 2027. */
  lancering: string
  /** Voor de omrekening uren → dagen in de weergave. Uren blijven de opslag. */
  urenPerDag: number
  /** Hoeveel acties tegelijk `bezig` mogen zijn vóór de app tegensputtert. */
  focusLimiet: number
}

/**
 * Wat je met een actie kán, afgeleid uit status en afhankelijkheden.
 *
 * `geblokkeerd` staat hier en niet in `ACTIE_STATUSSEN`: het volgt uit andere rijen en wordt
 * daarom nooit opgeslagen. `buiten` verzamelt wat niet in de actieve achterstand hoort —
 * gereed, uitgesteld en vervallen.
 */
export type Uitvoerbaarheid =
  | 'actief'
  | 'beschikbaar'
  | 'geblokkeerd'
  | 'wacht'
  | 'gereed'
  | 'uitgesteld'
  | 'vervallen'

export type Blokkade = {
  /** De actie waarop gewacht wordt. */
  key: string
  titel: string
  status: ActieStatus
  /**
   * Hard betekent: een startuitzondering helpt niet. Geldt voor een vervallen
   * afhankelijkheid — die is niet geslaagd afgerond, dus je verwijdert of vervangt hem.
   */
  hard: boolean
  reden: string
}

export type Signaal = {
  soort: 'afhankelijkheid_heropend' | 'afhankelijkheid_vervallen' | 'gestart_met_uitzondering'
  /** De actie of de reden waar het signaal over gaat. */
  key: string
  tekst: string
}

export type InzetWeergave = {
  uren: number | null
  dagen: number | null
  /** 'onbekend' of '12 u · 1,5 d'. Nooit '0 u'. */
  tekst: string
}

export type KoppelingWeergave = {
  subjectType: SubjectType
  subjectKey: string
  /** Opgezocht bij het lezen; `null` wanneer het bedrijf alleen in de spiegel bestaat. */
  naam: string | null
}

export type ActieWeergave = Omit<PlanActie, 'links'> & {
  links: PlanLink[]
  afhankelijkheden: string[]
  /** Wie van déze actie afhangt. Nodig om bij heropenen te weten wie je moet waarschuwen. */
  afhankelijken: string[]
  uitvoerbaarheid: Uitvoerbaarheid
  blokkade: Blokkade[]
  signalen: Signaal[]
  inzet: InzetWeergave
  resterend: InzetWeergave
  koppelingen: KoppelingWeergave[]
}

export type BeslismomentStatus = 'wacht' | 'klaar_voor_beoordeling' | 'beslist'

export const BESLISMOMENT_LABEL: Record<BeslismomentStatus, string> = {
  wacht: 'Wacht op acties',
  // Precies deze formulering: alle acties gereed betekent dat er iets te beoordelen valt,
  // niet dat het goedgekeurd is.
  klaar_voor_beoordeling: 'Klaar voor beoordeling',
  beslist: 'Beslist',
}

export type BeslissingWeergave = Omit<PlanBeslissing, 'acties'> & {
  acties: string[]
  afgeleid: BeslismomentStatus
  gereed: number
  totaal: number
}

export type VoortgangGroep = {
  prioriteit: Prioriteit
  label: string
  perStatus: Record<ActieStatus, number>
  /** Zonder de vervallen acties: die tellen niet mee als werk. */
  totaal: number
  geblokkeerd: number
  beschikbaar: number
  inzet: { bekendUren: number; aantalBekend: number; aantalOnbekend: number }
  /** Staat letterlijk in de UI. Een telling is geen gewicht. */
  toelichting: 'aantal acties, ongewogen'
}

export type Startvoorwaarde = {
  key: string
  titel: string
  status: ActieStatus
  gereed: boolean
}

export type Startvoorwaarden = {
  hard: Startvoorwaarde[]
  hardGereed: number
  bewijs: Startvoorwaarde[]
  bewijsGereed: number
  nietVereist: Startvoorwaarde[]
  /** Het startbesluit zelf. Altijd handmatig; nooit afgeleid uit de tellingen hierboven. */
  startbesluit: BeslissingWeergave | null
}

export type VolgendeActie = {
  key: string
  reden: 'actief' | 'actief_zonder_stap' | 'beschikbaar'
}

export type Overzicht = {
  nuBezig: string[]
  beschikbaar: string[]
  geblokkeerd: string[]
  wacht: string[]
  uitgesteld: string[]
  voortgang: VoortgangGroep[]
  startvoorwaarden: Startvoorwaarden
  volgendeActie: VolgendeActie | null
  signalen: (Signaal & { actie: string })[]
}

export type PlanWeergave = {
  instellingen: PlanInstellingen
  aannames: { tekst: string; isStandaard: boolean }
  seedVersie: number
  acties: ActieWeergave[]
  beslissingen: BeslissingWeergave[]
  ideeen: PlanIdee[]
  overzicht: Overzicht
}

export type ActieDetail = ActieWeergave & { geschiedenis: PlanHistorie[] }

export type FocusConflict = {
  conflict: 'focus'
  limiet: number
  actief: { key: string; titel: string; volgendeStap: string | null }[]
}

export type AfhankelijkheidConflict = {
  conflict: 'afhankelijkheid'
  blokkade: Blokkade[]
}

export type VersieConflict = {
  conflict: 'versie'
  /** De versie die de database nu draagt, zodat de client kan herladen. */
  versie: number
}

export type PlanConflict = FocusConflict | AfhankelijkheidConflict | VersieConflict

/**
 * De uitkomst van een schrijfactie.
 *
 * Breidt `Gekeurd<T>` uit `lib/contact.ts` uit met de klasse van de fout, zodat een route
 * een eenregelige vertaling naar HTTP kan doen: ongeldig → 400, onbekend → 404,
 * conflict → 409. Zonder die klasse zou elke route de reden-tekst moeten interpreteren.
 */
export type Mutatie<T> =
  | { ok: true; waarde: T }
  | { ok: false; soort: 'ongeldig' | 'onbekend'; reden: string }
  | { ok: false; soort: 'conflict'; reden: string; conflict: PlanConflict }
