/**
 * Invarianten op de website-verrijking.
 *
 * Het gevaarlijkste geval staat onderaan en is geen randgeval: een bedrijvengids DRAAGT het
 * ondernemingsnummer, dus de harde verificatie zou hem bevestigen. Alleen de host-filter houdt
 * hem tegen. Correct volgens de check en toch het verkeerde antwoord — dat is de soort fout die
 * je nooit ziet, want de URL ziet er daarna volstrekt normaal uit.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/brave-scenarios.ts
 */
import {
  bouwZoekUrl,
  braveHeaders,
  leesResultaten,
  leesBraveConfig,
  verrijkWebsite,
  type Ophaler,
} from '../lib/sources/brave'

let geslaagd = 0
let gezakt = 0
function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else { gezakt++; console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`) }
}

const NUMMER = '0200065765'
const CONFIG = { sleutel: 'geheim' }

// ── Verzoekopbouw ────────────────────────────────────────────────────────────
{
  const u = bouwZoekUrl('"PERKA" 9990 België')
  check('zoek-URL wijst naar de Brave-API', u.startsWith('https://api.search.brave.com/res/v1/web/search?'), u)
  check('zoekterm is ge-encodeerd', u.includes('q=%22PERKA%22'), u)
  check('en begrensd op België', u.includes('country=be'), u)
  const h = braveHeaders(CONFIG)
  check('sleutel-header heet X-Subscription-Token', h['X-Subscription-Token'] === 'geheim')
}

// ── Respons lezen ────────────────────────────────────────────────────────────
{
  check('leest web.results', leesResultaten({ web: { results: [{ url: 'https://a.be' }, { url: 'https://b.be' }] } }).length === 2)
  check('lege respons valt niet om', leesResultaten({}).length === 0)
  check('null valt niet om', leesResultaten(null).length === 0)
  check('rij zonder url wordt overgeslagen', leesResultaten({ web: { results: [{ title: 'x' }] } }).length === 0)
  check('niet-http wordt geweigerd', leesResultaten({ web: { results: [{ url: 'javascript:void(0)' }] } }).length === 0)
}

// ── Config ───────────────────────────────────────────────────────────────────
check('geen sleutel -> null', leesBraveConfig({}) === null)
check('sleutel -> config', leesBraveConfig({ BRAVE_API_KEY: 'k' })?.sleutel === 'k')

// ── Het volledige pad ────────────────────────────────────────────────────────
function nep(routes: { zoek?: { status?: number; body?: unknown }; paginas?: Record<string, { status?: number; html?: string }> }): {
  ophaler: Ophaler
  gezien: string[]
} {
  const gezien: string[] = []
  const ophaler: Ophaler = async (url) => {
    gezien.push(url)
    if (url.startsWith('https://api.search.brave.com')) {
      const s = routes.zoek?.status ?? 200
      return { ok: s < 300, status: s, json: async () => routes.zoek?.body, text: async () => '' }
    }
    const p = routes.paginas?.[url]
    const s = p?.status ?? (p ? 200 : 404)
    return { ok: s < 300, status: s, json: async () => null, text: async () => p?.html ?? '' }
  }
  return { ophaler, gezien }
}

{
  const { ophaler, gezien } = nep({
    zoek: { body: { web: { results: [{ url: 'https://www.perka.be' }] } } },
    paginas: { 'https://www.perka.be': { html: '<footer>BTW BE 0200.065.765</footer>' } },
  })
  const r = await verrijkWebsite('"PERKA" 9990 België', NUMMER, { config: CONFIG, ophaler })
  check('bevestigde site wordt teruggegeven', r.url === 'https://www.perka.be', String(r.url))
  check('reden is bevestigd', r.reden === 'bevestigd', r.reden)
  check('de pagina is echt opgehaald', gezien.some((u) => u === 'https://www.perka.be'))
}

{
  // Site bestaat, maar draagt een ANDER ondernemingsnummer: naamgenoot.
  const { ophaler } = nep({
    zoek: { body: { web: { results: [{ url: 'https://www.naamgenoot.be' }] } } },
    paginas: { 'https://www.naamgenoot.be': { html: 'BTW BE 0203.884.397' } },
  })
  const r = await verrijkWebsite('x', NUMMER, { config: CONFIG, ophaler })
  check('naamgenoot wordt NIET vastgelegd', r.url === null, String(r.url))
  check('reden is niet-bevestigd', r.reden === 'niet-bevestigd', r.reden)
  check('en het onderzoek is zichtbaar', r.onderzocht[0]?.bevestiging === 'niet-op-pagina', JSON.stringify(r.onderzocht))
}

{
  // HET GEVAARLIJKSTE GEVAL: de gids draagt het juiste nummer en zou dus bevestigen.
  const { ophaler, gezien } = nep({
    zoek: { body: { web: { results: [{ url: 'https://trendstop.knack.be/nl/detail/0200065765' }] } } },
    paginas: { 'https://trendstop.knack.be/nl/detail/0200065765': { html: 'Voorbeeld BV — 0200.065.765' } },
  })
  const r = await verrijkWebsite('x', NUMMER, { config: CONFIG, ophaler })
  check('gids wordt niet vastgelegd, ondanks het juiste nummer', r.url === null, String(r.url))
  check('reden is alles-gidsen', r.reden === 'alles-gidsen', r.reden)
  check('de gidspagina is niet eens opgehaald', !gezien.some((u) => u.includes('trendstop')), gezien.join(' '))
}

{
  const { ophaler } = nep({ zoek: { body: { web: { results: [] } } } })
  const r = await verrijkWebsite('x', NUMMER, { config: CONFIG, ophaler })
  check('geen resultaten -> eigen reden', r.reden === 'geen-resultaten', r.reden)
}

{
  const { ophaler } = nep({ zoek: { status: 429 } })
  const r = await verrijkWebsite('x', NUMMER, { config: CONFIG, ophaler })
  check('429 -> fout met de status erin', r.reden === 'fout' && (r.detail ?? '').includes('429'), r.detail ?? '')
}

{
  const { ophaler } = nep({
    zoek: { body: { web: { results: [{ url: 'https://dood.be' }, { url: 'https://www.perka.be' }] } } },
    paginas: { 'https://www.perka.be': { html: '0200.065.765' } },
  })
  const r = await verrijkWebsite('x', NUMMER, { config: CONFIG, ophaler })
  check('onbereikbare eerste kandidaat blokkeert de tweede niet', r.url === 'https://www.perka.be', String(r.url))
  check('en de dode site staat in het onderzoek', r.onderzocht[0]?.bevestiging === 'niet-opgehaald', JSON.stringify(r.onderzocht))
}

{
  const r = await verrijkWebsite('x', NUMMER, { config: null })
  check('zonder sleutel: eigen reden, geen crash', r.reden === 'geen-sleutel', r.reden)
  check('en geen URL', r.url === null)
}

if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}
const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
