/**
 * Invarianten op de rubriekzoeker voor de NBB-jaarrekeningen.
 *
 * Deze suite bestaat omdat de échte vorm van de accountingData-JSON niet vastligt: de NBB
 * publiceert een OpenAPI-spec die alleen AccountingData dekt, en de veldnamen die in omloop
 * zijn komen uit een demo van vóór de livegang. Een fixture bouwen op één gegokte vorm en
 * daartegen testen is dan circulair — het bewijst dat de parser mijn gok aankan, niet dat hij
 * de werkelijkheid aankan.
 *
 * Daarom toetst deze suite het omgekeerde: dezelfde rubriek in ZES verschillende vormen, die
 * allemaal hetzelfde antwoord moeten geven. Wat er ook uit de UAT komt, het is vermoedelijk
 * één van deze — en is het dat niet, dan zegt `gezieneCodes` in één oogopslag wat het wél is.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/nbb-scenarios.ts
 */
import { vindRubriek, leesPersoneel, RUBRIEK_PERSONEEL_VTE } from '../lib/sources/nbb-rubriek'
import {
  bouwHeaders, url, ACCEPT, leesConfig, haalPersoneel, kiesRecentsteReferentie, nbbBron,
  type FetchImpl, type NbbConfig,
} from '../lib/sources/nbb'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── Zes plausibele vormen, één antwoord ──────────────────────────────────────

const VORMEN: { naam: string; data: unknown }[] = [
  {
    naam: 'code als sleutel, waarde direct',
    data: { Rubrics: { '9087': 12.5, '9086': 3 } },
  },
  {
    naam: 'code als sleutel met prefix, waarde genest',
    data: { data: { m9087: { value: 12.5 }, m9086: { value: 3 } } },
  },
  {
    naam: 'code als broer van de waarde',
    data: { rubrics: [{ code: '9087', value: 12.5 }, { code: '9086', value: 3 }] },
  },
  {
    naam: 'andere sleutelnamen, komma-decimaal',
    data: { SocialBalance: [{ rubriek: 9087, amount: '12,5' }] },
  },
  {
    naam: 'XBRL-concept met namespace',
    data: { facts: [{ concept: 'pfs-vl:9087', val: '12.5' }] },
  },
  {
    naam: 'diep genest onder onverwachte tussenlagen',
    data: { Deposit: { AccountingData: { Sections: [{ Lines: [{ id: 'rubriek_9087', value: { amount: 12.5 } }] }] } } },
  },
]

for (const { naam, data } of VORMEN) {
  const t = vindRubriek(data, RUBRIEK_PERSONEEL_VTE)
  check(`vorm "${naam}" levert 12,5`, t.waarde === 12.5, `kreeg ${t.waarde}, pad ${t.pad}`)
}

// ── De twee soorten "niet gevonden" moeten uit elkaar te houden zijn ──────────

{
  // Het bedrijf heeft de rubriek niet, maar de vorm is wél herkend: er zijn codes gezien.
  const zonder = leesPersoneel({ rubrics: [{ code: '9086', value: 3 }, { code: '1001', value: 7 }] })
  check('rubriek ontbreekt -> reden is rubriek-ontbreekt', zonder.reden === 'rubriek-ontbreekt', zonder.reden)
  check('en er zijn wél codes gezien', zonder.gezieneCodes.length > 0, zonder.gezieneCodes.join(','))
  check('vte is null', zonder.vte === null, String(zonder.vte))

  // Niets dat op een rubriek lijkt: de vorm is onbekend. Dit MOET anders eindigen, want het
  // vraagt een codewijziging en niet een conclusie over het bedrijf.
  const vreemd = leesPersoneel({ hello: 'world', nested: { a: [1, 2, 3] } })
  check('onbekende vorm -> reden is vorm-niet-herkend', vreemd.reden === 'vorm-niet-herkend', vreemd.reden)
  check('en gezieneCodes is leeg', vreemd.gezieneCodes.length === 0, vreemd.gezieneCodes.join(','))
}

// ── De bijna-treffer: 90871 is een ANDERE rubriek ────────────────────────────

{
  const bijna = vindRubriek({ rubrics: [{ code: '90871', value: 999 }] }, '9087')
  check('90871 telt niet als 9087', bijna.waarde === null, String(bijna.waarde))
  check('maar 90871 is wel gezien', bijna.gezieneCodes.includes('90871'), bijna.gezieneCodes.join(','))

  // En een code die 9087 als losse cijferreeks bevat maar er niet mee begint of eindigt.
  const midden = vindRubriek({ rubrics: [{ code: '129087', value: 999 }] }, '9087')
  check('129087 telt niet als 9087', midden.waarde === null, String(midden.waarde))
}

// ── Waardevormen ─────────────────────────────────────────────────────────────

{
  check('nul is een geldige waarde, geen ontbrekende', vindRubriek({ '9087': 0 }, '9087').waarde === 0)
  check('spaties als duizendtalscheiding', vindRubriek({ rubrics: [{ code: '9087', value: '1 250,5' }] }, '9087').waarde === 1250.5)
  check('lege string is geen waarde', vindRubriek({ rubrics: [{ code: '9087', value: '' }] }, '9087').waarde === null)
  check('tekst is geen waarde', vindRubriek({ rubrics: [{ code: '9087', value: 'n.v.t.' }] }, '9087').waarde === null)
  check('null-invoer valt niet om', leesPersoneel(null).reden === 'vorm-niet-herkend')
  check('array-invoer werkt', vindRubriek([{ code: '9087', value: 4 }], '9087').waarde === 4)
}

// ── Client: verzoekopbouw, zonder netwerk ────────────────────────────────────

const CONFIG: NbbConfig = { sleutel: 'geheim', omgeving: 'uat' }

{
  const h = bouwHeaders(CONFIG, ACCEPT.jsonxbrl, 'req-1')
  check('sleutel-header heet exact NBB-CBSO-Subscription-Key', h['NBB-CBSO-Subscription-Key'] === 'geheim')
  check('X-Request-Id wordt meegestuurd', h['X-Request-Id'] === 'req-1')
  check('Accept draagt het jsonxbrl-mediatype', h.Accept === 'application/x.jsonxbrl', h.Accept)

  check(
    'UAT-basis-URL',
    url.referenties(CONFIG, '0123456789') === 'https://ws.uat2.cbso.nbb.be/authentic/legalEntity/0123456789/references',
    url.referenties(CONFIG, '0123456789')
  )
  check(
    'productie-basis-URL',
    url.gegevens({ ...CONFIG, omgeving: 'productie' }, 'REF9') === 'https://ws.cbso.nbb.be/authentic/deposit/REF9/accountingData',
    url.gegevens({ ...CONFIG, omgeving: 'productie' }, 'REF9')
  )
}

// ── Config: geen sleutel is geen fout ────────────────────────────────────────

{
  check('geen sleutel -> null', leesConfig({}) === null)
  check('sleutel zonder omgeving -> uat', leesConfig({ NBB_CBSO_KEY: 'k' })?.omgeving === 'uat')
  check(
    'expliciet productie',
    leesConfig({ NBB_CBSO_KEY: 'k', NBB_CBSO_OMGEVING: 'productie' })?.omgeving === 'productie'
  )
}

// ── Referentiekeuze: de recentste neerlegging ────────────────────────────────

{
  const lijst = [
    { ReferenceNumber: 'OUD', DepositDate: '2023-06-30' },
    { ReferenceNumber: 'NIEUW', DepositDate: '2025-07-01' },
    { ReferenceNumber: 'MIDDEN', DepositDate: '2024-05-12' },
  ]
  check('kiest de recentste (ISO-datums)', kiesRecentsteReferentie(lijst) === 'NIEUW', String(kiesRecentsteReferentie(lijst)))

  const beDatums = [
    { reference: 'A', depositDate: '30-06-2023' },
    { reference: 'B', depositDate: '01-07-2025' },
  ]
  check('kiest de recentste (dd-mm-yyyy)', kiesRecentsteReferentie(beDatums) === 'B', String(kiesRecentsteReferentie(beDatums)))

  const omhuld = { References: [{ id: 'X', date: '2024-01-01' }] }
  check('vindt de lijst ook één laag dieper', kiesRecentsteReferentie(omhuld) === 'X', String(kiesRecentsteReferentie(omhuld)))
  check('lege invoer -> null', kiesRecentsteReferentie([]) === null)
  check('onbekende vorm -> null', kiesRecentsteReferentie({ iets: 'anders' }) === null)
}

// ── De vorm die de NBB zélf documenteert ─────────────────────────────────────
//
// De bovenstaande vormen zijn bedacht, en die blijven staan als vangnet. Deze niet: het is de
// `Reference`-component uit de API-definitie van `nbb-cbso-consultation-service-uat2-authentic`,
// anoniem opgehaald bij de UAT-portal op 2026-08-26. Alle tien verplichte velden staan erin,
// met de opgegeven types — `DepositDate` als `format: date`, `ExerciseDates` als Period-object.
// Zonder deze fixture toetst de suite alleen of de parser de gok van de auteur aankan.

{
  const echteVorm = [
    {
      ReferenceNumber: 'REF-2024',
      DepositDate: '2024-08-14',
      ExerciseDates: { StartDate: '2023-01-01', EndDate: '2023-12-31' },
      ModelType: 'VKT-kap',
      DepositType: 'Initial',
      Language: 'NL',
      Currency: 'EUR',
      EnterpriseNumber: '0203201340',
      EnterpriseName: 'VOORBEELD NV',
      Address: { Street: 'Straat', Number: '1', Box: '', PostalCode: '9000', City: 'Gent', CountryCode: 'BE' },
      LegalForm: 'NV',
      LegalSituation: 'AC',
      FullFillLegalValidation: true,
      ActivityCode: '62010',
      GeneralAssemblyDate: '2024-06-01',
      AccountingDataURL: 'https://ws.uat2.cbso.nbb.be/authentic/deposit/REF-2024/accountingData',
      DataVersion: 'Authentic',
    },
    {
      ReferenceNumber: 'REF-2025',
      DepositDate: '2025-07-22',
      ExerciseDates: { StartDate: '2024-01-01', EndDate: '2024-12-31' },
      ModelType: 'VKT-kap',
      DepositType: 'Initial',
      Language: 'NL',
      Currency: 'EUR',
      EnterpriseNumber: '0203201340',
      EnterpriseName: 'VOORBEELD NV',
      LegalForm: 'NV',
      LegalSituation: 'AC',
      FullFillLegalValidation: true,
      ActivityCode: '62010',
      GeneralAssemblyDate: '2025-06-02',
      AccountingDataURL: 'https://ws.uat2.cbso.nbb.be/authentic/deposit/REF-2025/accountingData',
      DataVersion: 'Authentic',
    },
  ]
  check(
    'gedocumenteerde Reference-vorm: kiest de recentste neerlegging',
    kiesRecentsteReferentie(echteVorm) === 'REF-2025',
    String(kiesRecentsteReferentie(echteVorm))
  )
  // De volgorde in de respons is niet gegarandeerd, dus de keuze mag niet aan de invoervolgorde
  // hangen. Omgekeerd aanbieden hoort hetzelfde antwoord te geven.
  check(
    'en die keuze hangt niet aan de invoervolgorde',
    kiesRecentsteReferentie([...echteVorm].reverse()) === 'REF-2025',
    String(kiesRecentsteReferentie([...echteVorm].reverse()))
  )
  // Eén neerlegging is het gewone geval voor een jong bedrijf.
  check(
    'één neerlegging levert die ene',
    kiesRecentsteReferentie([echteVorm[0]!]) === 'REF-2024',
    String(kiesRecentsteReferentie([echteVorm[0]!]))
  )
}

// ── Het volledige pad, met een nagebootste server ────────────────────────────

function nepServer(routes: Record<string, { status?: number; body?: unknown }>): {
  impl: FetchImpl
  gezien: { url: string; headers: Record<string, string> }[]
} {
  const gezien: { url: string; headers: Record<string, string> }[] = []
  const impl: FetchImpl = async (u, init) => {
    gezien.push({ url: u, headers: init.headers })
    const route = Object.entries(routes).find(([fragment]) => u.includes(fragment))?.[1]
    const status = route?.status ?? (route ? 200 : 404)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => route?.body,
      text: async () => JSON.stringify(route?.body ?? null),
    }
  }
  return { impl, gezien }
}

{
  const { impl, gezien } = nepServer({
    '/references': { body: [{ ReferenceNumber: 'R1', DepositDate: '2025-06-30' }] },
    '/accountingData': { body: { rubrics: [{ code: '9087', value: '42,5' }] } },
  })
  const r = await haalPersoneel('0123.456.789', CONFIG, { fetchImpl: impl, maakId: () => 'id-1' })
  check('volledig pad levert de VTE', r.vte === 42.5, String(r.vte))
  check('reden is gevonden', r.reden === 'gevonden', r.reden)
  check('ondernemingsnummer is genormaliseerd', r.ondernemingsnummer === '0123456789', r.ondernemingsnummer)
  check('twee verzoeken gedaan', gezien.length === 2, String(gezien.length))
  check('eerste verzoek vraagt json', gezien[0]?.headers.Accept === ACCEPT.json, gezien[0]?.headers.Accept)
  check('tweede verzoek vraagt jsonxbrl', gezien[1]?.headers.Accept === ACCEPT.jsonxbrl, gezien[1]?.headers.Accept)
  check('elk verzoek draagt de sleutel', gezien.every((g) => g.headers['NBB-CBSO-Subscription-Key'] === 'geheim'))
}

{
  const { impl } = nepServer({ '/references': { status: 404 } })
  const r = await haalPersoneel('0123456789', CONFIG, { fetchImpl: impl })
  check('404 op referenties -> geen-neerlegging, geen crash', r.reden === 'geen-neerlegging', r.reden)
}

{
  const { impl } = nepServer({ '/references': { status: 500 } })
  const r = await haalPersoneel('0123456789', CONFIG, { fetchImpl: impl })
  check('500 -> reden fout met de URL erin', r.reden === 'fout' && (r.detail ?? '').includes('/references'), r.detail ?? '')
}

{
  // Het gevaarlijkste geval: de server antwoordt netjes, maar de vorm is onbekend. Dat MOET
  // als parserprobleem eindigen en niet als "dit bedrijf heeft geen personeel".
  const { impl } = nepServer({
    '/references': { body: [{ ReferenceNumber: 'R1' }] },
    '/accountingData': { body: { totaal_andere_structuur: true } },
  })
  const r = await haalPersoneel('0123456789', CONFIG, { fetchImpl: impl })
  check('onbekende vorm -> vorm-niet-herkend, niet null-als-antwoord', r.reden === 'vorm-niet-herkend', r.reden)
  check('en de melding wijst naar de parser', (r.detail ?? '').includes('nbb-rubriek'), r.detail ?? '')
}

{
  const zonder = await nbbBron.personeelVoor(['0123456789'], { config: null })
  check('bron zonder sleutel geeft nul rijen', zonder.items.length === 0)
  check('en een leesbare waarschuwing', zonder.warnings[0]?.includes('NBB_CBSO_KEY') === true, zonder.warnings[0] ?? '')
}

{
  const { impl } = nepServer({
    '/references': { body: [{ ReferenceNumber: 'R1' }] },
    '/accountingData': { body: { onbekend: 1 } },
  })
  const res = await nbbBron.personeelVoor(['0111111111', '0222222222'], { config: CONFIG, fetchImpl: impl })
  check('bron waarschuwt bij onherkenbare vormen', res.warnings.some((w) => w.includes('parserprobleem')), res.warnings.join(' | '))
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
