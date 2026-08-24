/**
 * Website zoeken via de Brave Search API, en het resultaat hard verifiëren.
 *
 * WAAROM BRAVE EN NIET IETS ANDERS
 *
 * De twee voor de hand liggende routes zijn dood: de Bing Search API is op 11 augustus 2025
 * volledig stopgezet, en de Google Custom Search JSON API is gesloten voor nieuwe klanten en
 * verdwijnt op 1 januari 2027. Brave is gratis binnen het maandkrediet, en voor ~600 bedrijven
 * blijft het daar ruim binnen.
 *
 * WAAROM ER EEN VERIFICATIESTAP ACHTER ZIT
 *
 * Een zoekmachine geeft plausibele antwoorden, geen juiste. Een verkeerde URL is duurder dan
 * geen URL: dan label je het verkeerde bedrijf en benader je het ook. Daarom twee filters
 * achter elkaar — eerst gidsen en sociale netwerken eruit op de host, dan het ondernemingsnummer
 * met mod-97-controle op de pagina zelf. Die tweede is het bewijs; de eerste bestaat omdat een
 * gidspagina het nummer óók draagt en de verificatie dus zou halen.
 */
import { bevestigtPagina, isGidsUrl, type Bevestiging } from './ondernemingsnummer'

const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

/** Injecteerbaar zodat de suite het hele pad kan uitrijden zonder netwerk. */
export type Ophaler = (url: string, init: { headers: Record<string, string> }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  text(): Promise<string>
}>

export type BraveConfig = { sleutel: string }

/** Geen sleutel is geen fout maar een niet-geconfigureerde bron — zoals `kbo.ts` het doet. */
export function leesBraveConfig(env: Record<string, string | undefined> = process.env): BraveConfig | null {
  const sleutel = env.BRAVE_API_KEY
  return sleutel ? { sleutel } : null
}

export function bouwZoekUrl(zoekterm: string, aantal = 5): string {
  const q = new URLSearchParams({ q: zoekterm, count: String(aantal), country: 'be' })
  return `${ENDPOINT}?${q.toString()}`
}

export const braveHeaders = (config: BraveConfig): Record<string, string> => ({
  Accept: 'application/json',
  'Accept-Encoding': 'gzip',
  'X-Subscription-Token': config.sleutel,
})

/**
 * Haalt de kandidaat-URL's uit een Brave-respons.
 *
 * Vormonafhankelijk binnen redelijke grenzen: het antwoord zit onder `web.results`, maar een
 * ontbrekend veld mag geen exceptie geven — dan verliest één bedrijf de hele run.
 */
export function leesResultaten(data: unknown): string[] {
  const web = (data as { web?: { results?: unknown } } | null)?.web
  const rijen = Array.isArray(web?.results) ? (web.results as unknown[]) : []
  const urls: string[] = []
  for (const r of rijen) {
    const u = (r as { url?: unknown } | null)?.url
    if (typeof u === 'string' && u.startsWith('http')) urls.push(u)
  }
  return urls
}

export type VerrijkingResultaat = {
  url: string | null
  /**
   * `bevestigd` is het enige oordeel waarop je een URL mag vastleggen. De rest bestaat om de
   * reden zichtbaar te houden: zonder onderscheid tussen "geen resultaten" en "wel resultaten,
   * geen ervan bevestigd" weet je niet of je zoekterm of je verificatie het probleem is.
   */
  reden:
    | 'bevestigd'
    | 'geen-sleutel'
    | 'geen-resultaten'
    | 'alles-gidsen'
    | 'niet-bevestigd'
    | 'fout'
  /** Wat er onderzocht is, in volgorde. Bruikbaar om met de hand na te kijken. */
  onderzocht: { url: string; bevestiging: Bevestiging['reden'] | 'niet-opgehaald' }[]
  detail?: string
}

/**
 * Zoekt de website van één bedrijf en bevestigt hem op het ondernemingsnummer.
 *
 * Gooit niet. Elke uitkomst komt terug als een resultaat met een reden, zodat één onbereikbare
 * site een run van honderden niet omvergooit.
 */
export async function verrijkWebsite(
  zoekterm: string,
  ondernemingsnummer: string,
  opties: { config?: BraveConfig | null; ophaler?: Ophaler; maxKandidaten?: number } = {}
): Promise<VerrijkingResultaat> {
  const config = opties.config === undefined ? leesBraveConfig() : opties.config
  if (!config) {
    return { url: null, reden: 'geen-sleutel', onderzocht: [], detail: 'BRAVE_API_KEY ontbreekt' }
  }
  const haal = opties.ophaler ?? (globalThis.fetch as unknown as Ophaler)
  const max = opties.maxKandidaten ?? 3
  const onderzocht: VerrijkingResultaat['onderzocht'] = []

  try {
    const res = await haal(bouwZoekUrl(zoekterm), { headers: braveHeaders(config) })
    if (!res.ok) {
      return { url: null, reden: 'fout', onderzocht, detail: `Brave gaf ${res.status}` }
    }
    const alle = leesResultaten(await res.json())
    if (alle.length === 0) return { url: null, reden: 'geen-resultaten', onderzocht }

    const kandidaten = alle.filter((u) => !isGidsUrl(u))
    if (kandidaten.length === 0) {
      for (const u of alle.slice(0, max)) onderzocht.push({ url: u, bevestiging: 'niet-opgehaald' })
      return { url: null, reden: 'alles-gidsen', onderzocht }
    }

    for (const u of kandidaten.slice(0, max)) {
      let tekst = ''
      try {
        const pagina = await haal(u, { headers: { Accept: 'text/html' } })
        if (!pagina.ok) {
          onderzocht.push({ url: u, bevestiging: 'niet-opgehaald' })
          continue
        }
        tekst = await pagina.text()
      } catch {
        onderzocht.push({ url: u, bevestiging: 'niet-opgehaald' })
        continue
      }
      const b = bevestigtPagina(tekst, ondernemingsnummer)
      onderzocht.push({ url: u, bevestiging: b.reden })
      if (b.bevestigd) return { url: u, reden: 'bevestigd', onderzocht }
    }

    return { url: null, reden: 'niet-bevestigd', onderzocht }
  } catch (e) {
    return { url: null, reden: 'fout', onderzocht, detail: String(e) }
  }
}
