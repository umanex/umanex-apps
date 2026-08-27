#!/usr/bin/env node
/**
 * Stap 0 van het KBO-importpad: meten vóór bouwen.
 *
 *   node scripts/kbo-meting.mjs /pad/naar/uitgepakte/KboOpenData_..._Full
 *   node scripts/kbo-meting.mjs --selftest
 *
 * Waarom dit bestaat als apart script en niet als onderdeel van de importer: de hele
 * labeltool draait op de website-URL, en of die er is weten we niet. De vulgraad van
 * `contact.csv` staat in geen enkele publieke bron — een onderzoeksronde vond nul webadressen
 * bij elf grote Belgische bedrijven, maar dat is een steekproef en geen meting. Dit script
 * geeft het echte cijfer op de echte dump, en dat cijfer beslist of de rest zin heeft.
 *
 * Het schrijft NIETS. Geen database, geen import, geen netwerk. Alleen tellen en rapporteren.
 *
 * De tegenproef: `--selftest` bouwt een piepkleine dump met vooraf bekende antwoorden en
 * controleert dat het script die exact terugvindt. Een teller die stil verkeerd telt is
 * erger dan geen teller, en bij CSV's met quotes, punten in nummers en drie NACE-versies
 * naast elkaar is stil verkeerd tellen het normale geval.
 */
import { createReadStream, mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Splitst één KBO-CSV-regel. Het formaat is komma-gescheiden met tekst tussen dubbele quotes;
 * een waarde mag zelf een komma bevatten, dus splitsen op ',' is fout. Verdubbelde quotes
 * ("") zijn een ontsnapte quote.
 */
function splitsCsv(regel) {
  const velden = []
  let huidig = ''
  let inQuote = false
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i]
    if (inQuote) {
      if (c === '"') {
        if (regel[i + 1] === '"') { huidig += '"'; i++ } else inQuote = false
      } else huidig += c
    } else if (c === '"') inQuote = true
    else if (c === ',') { velden.push(huidig); huidig = '' }
    else huidig += c
  }
  velden.push(huidig)
  return velden
}

/** Ondernemingsnummers staan als 9999.999.999 in het bestand. Elke join faalt stil zonder dit. */
const normaliseerNummer = (s) => (s ?? '').replace(/\D/g, '')

/** Streamt een CSV en roept `perRij` aan met een object op kolomnaam. Kop wordt gelezen uit regel 1. */
async function leesCsv(pad, perRij) {
  const stream = createReadStream(pad, { encoding: 'utf8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  let kop = null
  let n = 0
  for await (const regel of rl) {
    if (regel.trim() === '') continue
    const velden = splitsCsv(regel)
    if (kop === null) { kop = velden.map((k) => k.trim()); continue }
    const rij = {}
    for (let i = 0; i < kop.length; i++) rij[kop[i]] = velden[i] ?? ''
    perRij(rij)
    n++
  }
  return n
}

// ── De meting ────────────────────────────────────────────────────────────────

/** NACE-prefixen per versie. Bewust per versie, want divisie 63 verschuift tussen 2008 en 2025. */
const NACE_PREFIXEN = ['62', '582', '63']

const hoortBijDoelgroep = (code) => {
  const kaal = (code ?? '').replace(/\D/g, '')
  return NACE_PREFIXEN.some((p) => kaal.startsWith(p))
}

/**
 * activity.csv draagt rijen voor ONDERNEMINGEN én voor VESTIGINGSEENHEDEN door elkaar, en de
 * kolom heet in beide gevallen EntityNumber. Ondernemingsnummers beginnen met 0 of 1,
 * vestigingsnummers met 2. Zonder dit onderscheid tel je vestigingen als bedrijven mee.
 *
 * GEMETEN op extract 429 (22-07-2026): van de 659.520 rijen in NACE 62/582/63 versie 2025 waren
 * er 485.031 vestigingen en 174.489 ondernemingen. De eerste versie van dit script telde ze
 * samen en kwam op 266.178 "bedrijven" — tegenover 35.696 die Eurostat voor heel NACE J62 in
 * België telt. Die factor 7 was het alarm dat deze filter opleverde.
 */
const isOndernemingsnummer = (nr) => nr.length >= 9 && (nr[0] === '0' || nr[0] === '1')

async function meet(map) {
  const bestand = (naam) => {
    const p = join(map, naam)
    if (existsSync(p)) return p
    // De dump levert soms hoofdletters of een submap; toon wat er wél staat in plaats van te raden.
    const aanwezig = existsSync(map) ? readdirSync(map).join(', ') : '(map bestaat niet)'
    throw new Error(`ontbreekt: ${naam}\n  in: ${map}\n  gevonden: ${aanwezig}`)
  }

  const rapport = {}

  // meta.csv — de extractdatum is verplicht bij bronvermelding (licentie art. 2.8).
  try {
    const meta = {}
    await leesCsv(bestand('meta.csv'), (r) => { meta[r.Variable ?? r.variable] = r.Value ?? r.value })
    rapport.snapshot = meta.SnapshotDate ?? meta.snapshotDate ?? '(niet gevonden)'
    rapport.extract = meta.ExtractNumber ?? '(niet gevonden)'
  } catch {
    rapport.snapshot = '(meta.csv niet gelezen)'
  }

  // activity.csv — versieverdeling én de kandidaten per versie.
  const versies = new Map()
  const kandidatenPerVersie = new Map()
  await leesCsv(bestand('activity.csv'), (r) => {
    const v = r.NaceVersion || '?'
    versies.set(v, (versies.get(v) ?? 0) + 1)
    if (!hoortBijDoelgroep(r.NaceCode)) return
    // Alleen de HOOFDactiviteit. Een boekhoudkantoor met softwareontwikkeling als nevenactiviteit
    // is geen softwarebedrijf. Gemeten: 197.473 van de 659.520 rijen zijn SECO.
    if ((r.Classification || '').toUpperCase() !== 'MAIN') return
    const nummer = normaliseerNummer(r.EntityNumber)
    if (!isOndernemingsnummer(nummer)) return
    if (!kandidatenPerVersie.has(v)) kandidatenPerVersie.set(v, new Set())
    kandidatenPerVersie.get(v).add(nummer)
  })
  rapport.naceVersies = [...versies.entries()].sort()
  rapport.kandidatenPerVersie = [...kandidatenPerVersie.entries()]
    .map(([v, s]) => [v, s.size])
    .sort()

  // De kandidatenverzameling: de unie over versies is fout (dubbeltelling), dus neem de
  // hoogste versie die effectief kandidaten oplevert. Dat is precies de valkuil uit het
  // onderzoek: zonder deze keuze telt elk bedrijf twee tot drie keer.
  const gekozenVersie = ['2025', '2008', '2003'].find((v) => (kandidatenPerVersie.get(v)?.size ?? 0) > 0)
  const kandidaten = kandidatenPerVersie.get(gekozenVersie) ?? new Set()
  rapport.gekozenVersie = gekozenVersie ?? '(geen)'
  rapport.kandidaten = kandidaten.size

  // contact.csv — de beslissende meting.
  let contactRijen = 0
  let webRijen = 0
  let webRijenVestiging = 0
  const webNummers = new Set()
  await leesCsv(bestand('contact.csv'), (r) => {
    contactRijen++
    if ((r.ContactType || '').toUpperCase() !== 'WEB') return
    webRijen++
    const nummer = normaliseerNummer(r.EntityNumber)
    if (isOndernemingsnummer(nummer)) webNummers.add(nummer)
    else webRijenVestiging++
  })
  rapport.contactRijen = contactRijen
  rapport.webRijen = webRijen
  rapport.webRijenVestiging = webRijenVestiging

  let metWeb = 0
  for (const nr of kandidaten) if (webNummers.has(nr)) metWeb++
  rapport.kandidatenMetWeb = metWeb
  rapport.dekking = kandidaten.size === 0 ? 0 : (metWeb / kandidaten.size) * 100

  return rapport
}

// ── Tegenproef ───────────────────────────────────────────────────────────────

/**
 * Bouwt een dump van vier ondernemingen met vooraf bekende antwoorden:
 *  - 0111111111 NACE 62010 (2008) + WEB          -> kandidaat mét site
 *  - 0222222222 NACE 6202  (2008) zonder WEB     -> kandidaat zonder site
 *  - 0333333333 NACE 4711  (2008) + WEB          -> geen kandidaat, telt niet mee
 *  - 0444444444 NACE 62010 (2003 én 2008)        -> dubbelrisico: mag één keer tellen
 *  - 2555555555 vestigingseenheid, NACE 62010    -> GEEN bedrijf, mag niet tellen
 *  - 0666666666 NACE 62010 maar SECO             -> nevenactiviteit, mag niet tellen
 * Verwacht: 3 kandidaten op versie 2008, 1 met web, dekking 33,3%.
 */
function selftest() {
  const map = mkdtempSync(join(tmpdir(), 'kbo-selftest-'))
  writeFileSync(join(map, 'meta.csv'), 'Variable,Value\n"SnapshotDate","01-08-2026"\n"ExtractNumber","999"\n')
  writeFileSync(
    join(map, 'activity.csv'),
    'EntityNumber,ActivityGroup,NaceVersion,NaceCode,Classification\n' +
      '"0111.111.111","001","2008","62010","MAIN"\n' +
      '"0222.222.222","001","2008","6202","MAIN"\n' +
      '"0333.333.333","001","2008","4711","MAIN"\n' +
      '"0444.444.444","001","2003","72220","MAIN"\n' +
      '"0444.444.444","001","2008","62010","MAIN"\n' +
      // Vestigingseenheid: nummer begint met 2. Juiste NACE, juiste versie, hoofdactiviteit —
      // en tóch geen bedrijf. Zonder de entiteitsfilter telt deze mee.
      '"2555.555.555","003","2008","62010","MAIN"\n' +
      // Nevenactiviteit: juiste NACE en een echt ondernemingsnummer, maar het bedrijf doet
      // iets anders als hoofdactiviteit. Zonder de MAIN-filter telt deze mee.
      '"0666.666.666","001","2008","62010","SECO"\n'
  )
  // LET OP — bewust ANDERS geformatteerd dan activity.csv: hier staan de nummers zonder punten.
  // Dat is precies wat de normalisatie moet overbruggen. Met hetzelfde formaat aan beide kanten
  // slaagt de join ook zonder normalisatie, en dan toetst deze suite niets. Gemeten: met een
  // gelijkvormige fixture bleef de tegenproef groen terwijl de normalisatie gesloopt was.
  writeFileSync(
    join(map, 'contact.csv'),
    'EntityNumber,EntityContact,ContactType,Value\n' +
      '"0111111111","ENT","WEB","https://een.test"\n' +
      '"0333333333","ENT","WEB","https://drie.test"\n' +
      // Webadres op de vestigingseenheid uit activity.csv: mag de dekking niet opkrikken.
      '"2555555555","EST","WEB","https://vijf.test"\n' +
      // Webadres van het nevenactiviteit-bedrijf: mag evenmin meetellen.
      '"0666666666","ENT","WEB","https://zes.test"\n' +
      '"0111111111","ENT","EMAIL","a@een.test"\n' +
      '"0777777777","ENT","TEL","+32 50 00 00 00"\n'
  )

  return { map, verwacht: { kandidaten: 3, kandidatenMetWeb: 1, webRijen: 4, webRijenVestiging: 1, contactRijen: 6, gekozenVersie: '2008' } }
}

// ── Uitvoeren ────────────────────────────────────────────────────────────────

const arg = process.argv[2]

if (!arg) {
  console.error('Gebruik: node scripts/kbo-meting.mjs <map-met-uitgepakte-csv> | --selftest')
  process.exit(2)
}

if (arg === '--selftest') {
  const { map, verwacht } = selftest()
  try {
    const r = await meet(map)
    let gezakt = 0
    const check = (naam, gemeten, verw) => {
      const ok = gemeten === verw
      if (!ok) { gezakt++; console.error(`  FAIL  ${naam}: gemeten ${gemeten}, verwacht ${verw}`) }
      else console.log(`  ok    ${naam}: ${gemeten}`)
    }
    console.log('Tegenproef op een dump met bekende antwoorden:')
    check('normalisatie haalt punten weg', normaliseerNummer('0111.111.111'), '0111111111')
    check('kandidaten (dubbele NACE-versie telt één keer)', r.kandidaten, verwacht.kandidaten)
    check('kandidaten met website', r.kandidatenMetWeb, verwacht.kandidatenMetWeb)
    check('WEB-rijen totaal (ook buiten de doelgroep)', r.webRijen, verwacht.webRijen)
    check('WEB-rijen op een vestigingseenheid', r.webRijenVestiging, verwacht.webRijenVestiging)
    check('contactrijen totaal', r.contactRijen, verwacht.contactRijen)
    check('gekozen NACE-versie', r.gekozenVersie, verwacht.gekozenVersie)
    console.log(gezakt === 0 ? '\nTegenproef geslaagd — de teller meet wat hij zegt.' : `\n${gezakt} check(s) gezakt.`)
    process.exit(gezakt > 0 ? 1 : 0)
  } finally {
    rmSync(map, { recursive: true, force: true })
  }
}

const r = await meet(arg)
const pct = (n) => `${n.toFixed(1)}%`

console.log(`\nKBO Open Data — meting van ${arg}`)
console.log(`Bron: Kruispuntbank van Ondernemingen, FOD Economie — situatie op ${r.snapshot} (extract ${r.extract})\n`)

console.log('NACE-versies in activity.csv:')
for (const [v, n] of r.naceVersies) console.log(`  ${v.padEnd(6)} ${n.toLocaleString('nl-BE')} rijen`)
console.log('\nKandidaten (NACE 62 / 582 / 63) per versie:')
for (const [v, n] of r.kandidatenPerVersie) console.log(`  ${v.padEnd(6)} ${n.toLocaleString('nl-BE')} ondernemingen`)
console.log(`\n  gekozen versie: ${r.gekozenVersie}  ->  ${r.kandidaten.toLocaleString('nl-BE')} unieke ondernemingen`)

console.log(`\ncontact.csv: ${r.contactRijen.toLocaleString('nl-BE')} rijen, waarvan ${r.webRijen.toLocaleString('nl-BE')} van type WEB`)
console.log(`  daarvan ${r.webRijenVestiging.toLocaleString('nl-BE')} op een vestigingseenheid — die tellen niet mee in de join`)
console.log(`\nDE BESLISSENDE MAAT — kandidaten met een webadres in KBO:`)
console.log(`  ${r.kandidatenMetWeb.toLocaleString('nl-BE')} van ${r.kandidaten.toLocaleString('nl-BE')}  =  ${pct(r.dekking)}\n`)

if (r.dekking < 10) {
  console.log('OORDEEL: te laag. KBO alleen draagt de labeltool niet — laag 2 (zoek-API plus')
  console.log('mod-97-verificatie) is de hoofdroute en geen aanvulling. Dit was de verwachting.')
} else if (r.dekking < 40) {
  console.log('OORDEEL: bruikbaar als basis, maar de meerderheid heeft nog verrijking nodig.')
} else {
  console.log('OORDEEL: hoger dan verwacht. Toets een handvol URLs met de hand vóór je hierop bouwt —')
  console.log('een dekking boven 40% spreekt de steekproef van nul-op-elf tegen, en die tegenspraak')
  console.log('verklaar je eerst.')
}
console.log()
