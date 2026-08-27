/**
 * Het Belgische ondernemingsnummer, en de harde verificatie van een gevonden website.
 *
 * DE HELE REDEN DAT DIT BESTAAT
 *
 * Slechts 6% van de doelgroep heeft een webadres in de KBO, dus de rest moet via een zoekmachine
 * gevonden worden. En een zoekmachine geeft plausibele antwoorden, geen juiste: een bedrijvengids,
 * een naamgenoot, een LinkedIn-pagina. Een verkeerde URL is duurder dan geen URL — dan label je
 * het verkeerde bedrijf en benader je het ook.
 *
 * Daarom een objectieve tweede stap. Het Wetboek Economisch Recht (art. III.25) verplicht een
 * onderneming haar ondernemingsnummer te vermelden op haar website. Staat het nummer dat wij
 * zoeken op de gevonden pagina, dan is dat geen gelijkenis maar bewijs.
 *
 * DE CONTROLESOM, EN DE VALKUIL DIE ER IN ZIT
 *
 * Een ondernemingsnummer is tien cijfers waarvan de laatste twee een controlegetal:
 *
 *     controle = 97 - (eerste acht cijfers mod 97)
 *
 * Zonder afsluitende modulo, en dát is de valkuil. De uitkomst loopt van 1 tot en met 97; een
 * naïeve `% 97` erachter maakt van 97 een 0 en verwerpt daarmee elk nummer waarvan de eerste acht
 * cijfers exact deelbaar zijn door 97. GEMETEN op extract 429: dat was 4.078 van de 400.000, dus
 * ongeveer 1% van alle Belgische ondernemingen — waaronder 0203884397. Met de juiste formule:
 * 1.955.681 nummers gecontroleerd, prefix 0 én prefix 1, nul fouten.
 */

/** Tien cijfers, laatste twee zijn de controlesom. Geeft false bij elke andere vorm. */
export function isGeldigOndernemingsnummer(ruw: string): boolean {
  const cijfers = (ruw ?? '').replace(/\D/g, '')
  if (cijfers.length !== 10) return false
  if (cijfers[0] !== '0' && cijfers[0] !== '1') return false
  const basis = Number(cijfers.slice(0, 8))
  const controle = Number(cijfers.slice(8))
  if (!Number.isFinite(basis) || !Number.isFinite(controle)) return false
  return 97 - (basis % 97) === controle
}

/** `0123.456.789` — de vorm waarin de KBO en de meeste websites het schrijven. */
export const formatteer = (nummer: string): string => {
  const c = nummer.replace(/\D/g, '')
  return c.length === 10 ? `${c.slice(0, 4)}.${c.slice(4, 7)}.${c.slice(7)}` : nummer
}

/**
 * Alle schrijfwijzen die in het wild voorkomen: met punten, met spaties, aaneen, met of zonder
 * `BE`-prefix, en met een streepje na BE. De grens links en rechts is geen cijfer, anders vangt
 * hij tien cijfers uit een langer nummer.
 */
const PATROON = /(?<![0-9])(?:BE[\s.-]*)?([01][\s.]?[0-9]{3}[\s.]?[0-9]{3}[\s.]?[0-9]{3})(?![0-9])/gi

/**
 * Zoekt geldige ondernemingsnummers in vrije tekst.
 *
 * LET OP bij gebruik zonder verwachting: een willekeurige reeks van tien cijfers haalt de
 * controlesom met kans 1 op 97. Op een pagina met veel getallen — bestelnummers, telefoonnummers,
 * rekeningnummers — levert dat vroeg of laat een vals positief. Gebruik dit dus om te
 * BEVESTIGEN wat je al vermoedt, niet om te ontdekken wie een pagina is. Daar is
 * `bevestigtPagina` voor, die tegen één verwacht nummer toetst.
 */
export function vindOndernemingsnummers(tekst: string): string[] {
  const gevonden = new Set<string>()
  for (const match of (tekst ?? '').matchAll(PATROON)) {
    const kaal = (match[1] ?? '').replace(/\D/g, '')
    if (isGeldigOndernemingsnummer(kaal)) gevonden.add(kaal)
  }
  return [...gevonden].sort()
}

export type Bevestiging = {
  /** Het enige resultaat waarop je een URL mag vastleggen. */
  bevestigd: boolean
  /**
   * Waarom niet, als het niet lukte. `nummer-ongeldig` betekent dat de invoer zelf niet klopt —
   * een programmeerfout, geen uitspraak over de pagina.
   */
  reden: 'gevonden' | 'niet-op-pagina' | 'geen-nummers-op-pagina' | 'nummer-ongeldig'
  /** Wat er wél op de pagina stond. Bruikbaar om een verwisseling te herkennen. */
  andereNummers: string[]
}

/**
 * Toetst of een pagina het verwachte ondernemingsnummer draagt.
 *
 * Dit is de harde trap. Hij slaagt niet altijd — gemeten op twaalf Belgische IT-sites bevestigde
 * hij er 42%, met nul valse positieven. Die verhouding is de bedoeling en geen tekortkoming: de
 * overige 58% gaat naar handmatige beoordeling in de labeltool, en dat is goedkoper dan een
 * verkeerd bedrijf benaderen.
 */
export function bevestigtPagina(paginaTekst: string, verwachtNummer: string): Bevestiging {
  const verwacht = (verwachtNummer ?? '').replace(/\D/g, '')
  if (!isGeldigOndernemingsnummer(verwacht)) {
    return { bevestigd: false, reden: 'nummer-ongeldig', andereNummers: [] }
  }
  const opPagina = vindOndernemingsnummers(paginaTekst)
  if (opPagina.includes(verwacht)) {
    return { bevestigd: true, reden: 'gevonden', andereNummers: opPagina.filter((n) => n !== verwacht) }
  }
  return {
    bevestigd: false,
    reden: opPagina.length === 0 ? 'geen-nummers-op-pagina' : 'niet-op-pagina',
    andereNummers: opPagina,
  }
}

/**
 * Hosts die nooit de site van het bedrijf zelf zijn. Een zoekmachine zet ze bovenaan omdat ze
 * hoog scoren op bedrijfsnamen, en ze dragen bovendien het ondernemingsnummer — dus zonder deze
 * lijst zou de harde verificatie ze juist BEVESTIGEN. Dat is het gevaarlijkste soort vals
 * positief: correct volgens de check, en toch het verkeerde antwoord.
 */
export const GIDS_HOSTS = [
  'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com',
  'trendstop.be', 'trendstop.knack.be', 'companyweb.be', 'staatsbladmonitor.be', 'bizzy.org',
  'nbb.be', 'nationalbankofbelgium.be', 'kbopub.economie.fgov.be', 'opencorporates.com',
  'infobel.com', 'goudengids.be', 'pagesdor.be', 'kompass.com', 'dnb.com', 'glassdoor.com',
  'indeed.com', 'jobat.be', 'stepstone.be', 'crunchbase.com', 'dealroom.co', 'sortlist.be',
  'clutch.co', 'wikipedia.org', 'graydon.be', 'creditsafe.com', 'europages.be', 'bedrijvengids.be',
] as const

/** Of een URL naar een gids of sociaal netwerk wijst in plaats van naar het bedrijf zelf. */
export function isGidsUrl(u: string): boolean {
  let host: string
  try {
    host = new URL(u.includes('://') ? u : `https://${u}`).hostname.toLowerCase()
  } catch {
    return false
  }
  const kaal = host.startsWith('www.') ? host.slice(4) : host
  return GIDS_HOSTS.some((g) => kaal === g || kaal.endsWith(`.${g}`))
}
