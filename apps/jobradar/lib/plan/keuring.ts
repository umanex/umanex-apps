/**
 * De keuring van invoer voor het bedrijfsplan.
 *
 * Los van de routes en van de database, zodat `scripts/plan-scenarios.ts` ze kan draaien
 * zonder Next, netwerk of schijf — dezelfde opzet als `lib/contact.ts`, waarvan ook
 * `Gekeurd<T>` komt.
 *
 * Eén regel draagt dit hele bestand: **een veld dat hier niet in de whitelist staat, komt
 * nooit via een veld-bewerking de database in.** Status, bewijs, afrondingsdatum,
 * afhankelijkheden, bron, versie en de twee uitzonderingen hebben elk hun eigen weg met hun
 * eigen controles. Een generieke "werk deze velden bij"-route zou al die controles omzeilen.
 */
import { isEchteIsoDatum, type Gekeurd } from '../contact'
import { ACTIE_STATUSSEN, type ActieStatus } from '../db/schema'
import { PRIORITEITEN, type PlanInstellingen, type PlanLink, type Prioriteit } from './types'
import { STANDAARD_UREN_PER_DAG } from './inzet'

export const MAX_TITEL = 120
export const MAX_TEKST = 4000
export const MAX_KORTE_TEKST = 300
export const MAX_LINKS = 20
export const MAX_LINK_LABEL = 80

/** De velden die je rechtstreeks mag bewerken. Alles daarbuiten heeft een eigen weg. */
export const ACTIE_VELDEN = [
  'titel',
  'beschrijving',
  'resultaat',
  'volgendeStap',
  'gereedcriterium',
  'inschattingUren',
  'resterendUren',
  'eigenaar',
  'streefdatum',
  'wachtreden',
  'herbekijkOp',
  'links',
  'context',
  'prioriteit',
] as const
export type ActieVeld = (typeof ACTIE_VELDEN)[number]

export type ActieVelden = {
  titel: string
  beschrijving: string | null
  resultaat: string | null
  volgendeStap: string | null
  gereedcriterium: string | null
  inschattingUren: number | null
  resterendUren: number | null
  eigenaar: string
  streefdatum: string | null
  wachtreden: string | null
  herbekijkOp: string | null
  links: PlanLink[]
  context: string | null
  prioriteit: Prioriteit
}

export type NieuweActie = {
  titel: string
  prioriteit: Prioriteit
  beschrijving: string | null
  resultaat: string | null
  gereedcriterium: string | null
  volgendeStap: string | null
}

export type StatusInvoer = {
  status: ActieStatus
  reden: string | null
  /** De actie die plaats maakt wanneer de focuslimiet bereikt is. */
  parkeer: string | null
  startUitzondering: string | null
  focusUitzondering: string | null
  bewijs: string | null
  links: PlanLink[] | null
  afgerondOp: string | null
  wachtreden: string | null
  herbekijkOp: string | null
}

export type BeslissingVelden = {
  beslissing: string | null
  beslistOp: string | null
  onderbouwing: string | null
  vervolgacties: string | null
  acties: string[]
}

const fout = (reden: string): Gekeurd<never> => ({ ok: false, reden })

export function keurVersie(v: unknown): Gekeurd<number> {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isInteger(n) || n < 1) return fout('versie is verplicht en moet een geheel getal zijn')
  return { ok: true, waarde: n }
}

export function keurStatus(v: unknown): Gekeurd<ActieStatus> {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!(ACTIE_STATUSSEN as readonly string[]).includes(s)) {
    return fout(`status moet een van ${ACTIE_STATUSSEN.join(', ')} zijn`)
  }
  return { ok: true, waarde: s as ActieStatus }
}

export function keurPrioriteit(v: unknown): Gekeurd<Prioriteit> {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!(PRIORITEITEN as readonly number[]).includes(n)) return fout('prioriteit is 1, 2, 3 of 4')
  return { ok: true, waarde: n as Prioriteit }
}

/**
 * Uren, of `null` voor onbekend.
 *
 * Leeg, `null` en `undefined` worden onbekend. Nul en negatief worden geweigerd in plaats van
 * stil naar onbekend te vallen: wie 0 typt bedoelt iets, en dat iets is nooit "ik weet het
 * niet". De melding wijst de weg naar leeg laten.
 */
export function keurUren(v: unknown, veld = 'inzet'): Gekeurd<number | null> {
  if (v === null || v === undefined) return { ok: true, waarde: null }
  if (typeof v === 'string' && v.trim() === '') return { ok: true, waarde: null }
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n)) return fout(`${veld} moet een getal in uren zijn, of leeg voor onbekend`)
  if (n <= 0) return fout(`${veld} is in uren en groter dan 0 — laat leeg voor onbekend`)
  if (n > 100000) return fout(`${veld} is onwaarschijnlijk hoog`)
  return { ok: true, waarde: Math.round(n * 100) / 100 }
}

export function keurIsoDatum(v: unknown, veld: string): Gekeurd<string | null> {
  if (v === null || v === undefined) return { ok: true, waarde: null }
  const s = typeof v === 'string' ? v.trim() : ''
  if (s === '') return { ok: true, waarde: null }
  if (!isEchteIsoDatum(s)) return fout(`${veld} moet een bestaande datum in YYYY-MM-DD zijn`)
  return { ok: true, waarde: s }
}

export function keurTekst(
  v: unknown,
  veld: string,
  max: number,
  verplicht = false
): Gekeurd<string | null> {
  if (v === null || v === undefined) {
    return verplicht ? fout(`${veld} is verplicht`) : { ok: true, waarde: null }
  }
  if (typeof v !== 'string') return fout(`${veld} moet tekst zijn`)
  const s = v.trim()
  if (s === '') return verplicht ? fout(`${veld} is verplicht`) : { ok: true, waarde: null }
  if (s.length > max) return fout(`${veld} is ${s.length} tekens, hoogstens ${max}`)
  return { ok: true, waarde: s }
}

/** Alleen http(s): een `javascript:`-url in een lijst die je later aanklikt is een gat. */
export function keurLinks(v: unknown): Gekeurd<PlanLink[]> {
  if (v === null || v === undefined) return { ok: true, waarde: [] }
  if (!Array.isArray(v)) return fout('links moet een lijst zijn')
  if (v.length > MAX_LINKS) return fout(`hoogstens ${MAX_LINKS} links`)
  const uit: PlanLink[] = []
  for (const rauw of v) {
    if (typeof rauw !== 'object' || rauw === null) return fout('elke link is een object')
    const r = rauw as Record<string, unknown>
    const url = typeof r.url === 'string' ? r.url.trim() : ''
    if (url === '') return fout('een link heeft een url nodig')
    if (!/^https?:\/\/\S+$/i.test(url)) return fout(`"${url}" is geen http- of https-adres`)
    const label = typeof r.label === 'string' ? r.label.trim() : ''
    if (label.length > MAX_LINK_LABEL) {
      return fout(`het label van een link is hoogstens ${MAX_LINK_LABEL} tekens`)
    }
    uit.push({ label: label === '' ? url : label, url })
  }
  return { ok: true, waarde: uit }
}

/**
 * Keurt een veld-bewerking.
 *
 * Alleen sleutels die de body écht draagt worden meegenomen — `Object.hasOwn`, niet
 * `body.x !== undefined`. Het verschil telt: `{ streefdatum: null }` betekent "wissen",
 * en een ontbrekende sleutel betekent "laat staan". Met een undefined-controle zouden die
 * twee samenvallen en zou wissen onmogelijk zijn.
 */
export function keurActieVelden(body: Record<string, unknown>): Gekeurd<Partial<ActieVelden>> {
  const uit: Partial<ActieVelden> = {}
  let aantal = 0

  for (const veld of ACTIE_VELDEN) {
    if (!Object.hasOwn(body, veld)) continue
    aantal++
    const rauw = body[veld]

    switch (veld) {
      case 'titel': {
        const g = keurTekst(rauw, 'titel', MAX_TITEL, true)
        if (!g.ok) return g
        uit.titel = g.waarde as string
        break
      }
      case 'eigenaar': {
        const g = keurTekst(rauw, 'eigenaar', MAX_KORTE_TEKST, true)
        if (!g.ok) return g
        uit.eigenaar = g.waarde as string
        break
      }
      case 'prioriteit': {
        const g = keurPrioriteit(rauw)
        if (!g.ok) return g
        uit.prioriteit = g.waarde
        break
      }
      case 'inschattingUren':
      case 'resterendUren': {
        const g = keurUren(rauw, veld === 'inschattingUren' ? 'inschatting' : 'resterende inzet')
        if (!g.ok) return g
        uit[veld] = g.waarde
        break
      }
      case 'streefdatum':
      case 'herbekijkOp': {
        const g = keurIsoDatum(rauw, veld === 'streefdatum' ? 'streefdatum' : 'herbekijkdatum')
        if (!g.ok) return g
        uit[veld] = g.waarde
        break
      }
      case 'links': {
        const g = keurLinks(rauw)
        if (!g.ok) return g
        uit.links = g.waarde
        break
      }
      case 'volgendeStap':
      case 'wachtreden': {
        const g = keurTekst(rauw, veld === 'volgendeStap' ? 'volgende stap' : 'wachtreden', MAX_KORTE_TEKST)
        if (!g.ok) return g
        uit[veld] = g.waarde
        break
      }
      default: {
        const g = keurTekst(rauw, veld, MAX_TEKST)
        if (!g.ok) return g
        uit[veld] = g.waarde
        break
      }
    }
  }

  if (aantal === 0) return fout('geen enkel bewerkbaar veld in dit verzoek')
  return { ok: true, waarde: uit }
}

export function keurNieuweActie(body: unknown): Gekeurd<NieuweActie> {
  if (typeof body !== 'object' || body === null) return fout('ongeldige invoer')
  const b = body as Record<string, unknown>

  const titel = keurTekst(b.titel, 'titel', MAX_TITEL, true)
  if (!titel.ok) return titel
  const prioriteit = keurPrioriteit(b.prioriteit)
  if (!prioriteit.ok) return prioriteit
  const beschrijving = keurTekst(b.beschrijving, 'beschrijving', MAX_TEKST)
  if (!beschrijving.ok) return beschrijving
  const resultaat = keurTekst(b.resultaat, 'resultaat', MAX_TEKST)
  if (!resultaat.ok) return resultaat
  const gereedcriterium = keurTekst(b.gereedcriterium, 'gereedcriterium', MAX_TEKST)
  if (!gereedcriterium.ok) return gereedcriterium
  const volgendeStap = keurTekst(b.volgendeStap, 'volgende stap', MAX_KORTE_TEKST)
  if (!volgendeStap.ok) return volgendeStap

  return {
    ok: true,
    waarde: {
      titel: titel.waarde as string,
      prioriteit: prioriteit.waarde,
      beschrijving: beschrijving.waarde,
      resultaat: resultaat.waarde,
      gereedcriterium: gereedcriterium.waarde,
      volgendeStap: volgendeStap.waarde,
    },
  }
}

export function keurStatusInvoer(body: Record<string, unknown>): Gekeurd<StatusInvoer> {
  const status = keurStatus(body.status)
  if (!status.ok) return status

  const reden = keurTekst(body.reden, 'reden', MAX_KORTE_TEKST)
  if (!reden.ok) return reden
  const parkeer = keurTekst(body.parkeer, 'parkeer', MAX_TITEL)
  if (!parkeer.ok) return parkeer
  const startUitzondering = keurTekst(body.startUitzondering, 'reden voor de uitzondering', MAX_KORTE_TEKST)
  if (!startUitzondering.ok) return startUitzondering
  const focusUitzondering = keurTekst(body.focusUitzondering, 'reden voor de uitzondering', MAX_KORTE_TEKST)
  if (!focusUitzondering.ok) return focusUitzondering
  const bewijs = keurTekst(body.bewijs, 'bewijs', MAX_TEKST)
  if (!bewijs.ok) return bewijs
  const afgerondOp = keurIsoDatum(body.afgerondOp, 'afrondingsdatum')
  if (!afgerondOp.ok) return afgerondOp
  const wachtreden = keurTekst(body.wachtreden, 'wachtreden', MAX_KORTE_TEKST)
  if (!wachtreden.ok) return wachtreden
  const herbekijkOp = keurIsoDatum(body.herbekijkOp, 'herbekijkdatum')
  if (!herbekijkOp.ok) return herbekijkOp

  let links: PlanLink[] | null = null
  if (Object.hasOwn(body, 'links')) {
    const g = keurLinks(body.links)
    if (!g.ok) return g
    links = g.waarde
  }

  return {
    ok: true,
    waarde: {
      status: status.waarde,
      reden: reden.waarde,
      parkeer: parkeer.waarde,
      startUitzondering: startUitzondering.waarde,
      focusUitzondering: focusUitzondering.waarde,
      bewijs: bewijs.waarde,
      links,
      afgerondOp: afgerondOp.waarde,
      wachtreden: wachtreden.waarde,
      herbekijkOp: herbekijkOp.waarde,
    },
  }
}

export function keurBeslissingVelden(
  body: Record<string, unknown>
): Gekeurd<Partial<BeslissingVelden>> {
  const uit: Partial<BeslissingVelden> = {}
  let aantal = 0

  if (Object.hasOwn(body, 'beslissing')) {
    const g = keurTekst(body.beslissing, 'beslissing', MAX_TEKST)
    if (!g.ok) return g
    uit.beslissing = g.waarde
    aantal++
  }
  if (Object.hasOwn(body, 'beslistOp')) {
    const g = keurIsoDatum(body.beslistOp, 'beslissingsdatum')
    if (!g.ok) return g
    uit.beslistOp = g.waarde
    aantal++
  }
  if (Object.hasOwn(body, 'onderbouwing')) {
    const g = keurTekst(body.onderbouwing, 'onderbouwing', MAX_TEKST)
    if (!g.ok) return g
    uit.onderbouwing = g.waarde
    aantal++
  }
  if (Object.hasOwn(body, 'vervolgacties')) {
    const g = keurTekst(body.vervolgacties, 'vervolgacties', MAX_TEKST)
    if (!g.ok) return g
    uit.vervolgacties = g.waarde
    aantal++
  }
  if (Object.hasOwn(body, 'acties')) {
    const rauw = body.acties
    if (!Array.isArray(rauw)) return fout('acties moet een lijst van keys zijn')
    const keys: string[] = []
    for (const k of rauw) {
      if (typeof k !== 'string' || k.trim() === '') return fout('elke actie is een key')
      if (!keys.includes(k.trim())) keys.push(k.trim())
    }
    uit.acties = keys
    aantal++
  }

  if (aantal === 0) return fout('geen enkel bewerkbaar veld in dit verzoek')
  return { ok: true, waarde: uit }
}

export function keurIdee(body: unknown): Gekeurd<{ titel: string; notitie: string | null }> {
  if (typeof body !== 'object' || body === null) return fout('ongeldige invoer')
  const b = body as Record<string, unknown>
  const titel = keurTekst(b.titel, 'titel', MAX_TITEL, true)
  if (!titel.ok) return titel
  const notitie = keurTekst(b.notitie, 'notitie', MAX_TEKST)
  if (!notitie.ok) return notitie
  return { ok: true, waarde: { titel: titel.waarde as string, notitie: notitie.waarde } }
}

export function keurInstellingen(body: unknown): Gekeurd<PlanInstellingen> {
  if (typeof body !== 'object' || body === null) return fout('ongeldige invoer')
  const b = body as Record<string, unknown>

  const lancering = typeof b.lancering === 'string' ? b.lancering.trim() : ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(lancering)) {
    return fout('lancering moet een maand in YYYY-MM zijn')
  }

  const urenPerDag =
    typeof b.urenPerDag === 'number' ? b.urenPerDag : Number(b.urenPerDag ?? STANDAARD_UREN_PER_DAG)
  if (!Number.isFinite(urenPerDag) || urenPerDag <= 0 || urenPerDag > 24) {
    return fout('uren per dag ligt tussen 1 en 24')
  }

  const focusLimiet = typeof b.focusLimiet === 'number' ? b.focusLimiet : Number(b.focusLimiet ?? 3)
  if (!Number.isInteger(focusLimiet) || focusLimiet < 1 || focusLimiet > 10) {
    return fout('de focuslimiet is een geheel getal tussen 1 en 10')
  }

  return {
    ok: true,
    waarde: { lancering, urenPerDag: Math.round(urenPerDag * 100) / 100, focusLimiet },
  }
}
