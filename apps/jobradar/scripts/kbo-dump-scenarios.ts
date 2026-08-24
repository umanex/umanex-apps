/**
 * Invarianten op de KBO-dumplezer.
 *
 * Elke filter in `kbo-dump.ts` bestaat omdat hij op de échte dump iets fout zag gaan. Deze suite
 * houdt ze alle zeven vast met een fixture per geval, want een filter die niemand toetst
 * verdwijnt bij de eerstvolgende refactor zonder dat er iets rood wordt.
 *
 * Eén geval verdient een aparte vermelding: de postcode-guard wordt op de echte dump NIET
 * aangesproken, omdat de land-guard de buitenlandse zetels eerder wegvangt. Dat maakt hem geen
 * overbodige guard maar een ONGETOETSTE — en precies daarom staat hier een fixture met een leeg
 * landveld en een Nederlandse postcode. Twee guards die elkaar overlappen zijn alleen iets waard
 * als je weet dat ze allebei werken.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/kbo-dump-scenarios.ts
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { leesKboDump } from '../lib/sources/kbo-dump'
import { schoonWebadres, leesBelgischePostcode, isBelgischAdres, isOndernemingsnummer } from '../lib/sources/kbo-csv'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

check('postcode: 9000 is geldig', leesBelgischePostcode('9000') === 9000)
check('postcode: Amsterdamse 1077CZ wordt geweigerd', leesBelgischePostcode('1077CZ') === null)
check('postcode: 1077 CZ met spatie wordt geweigerd', leesBelgischePostcode('1077 CZ') === null)
check('postcode: Britse WC2H 9JQ wordt geweigerd', leesBelgischePostcode('WC2H 9JQ') === null)
check('postcode: Luxemburgse L-8399 wordt geweigerd', leesBelgischePostcode('L-8399') === null)
check('postcode: leeg wordt geweigerd', leesBelgischePostcode('') === null)
check('postcode: streepje wordt geweigerd', leesBelgischePostcode('-') === null)
check('postcode: drie cijfers wordt geweigerd', leesBelgischePostcode('900') === null)
check('postcode: vijf cijfers wordt geweigerd', leesBelgischePostcode('90000') === null)

check('land: lege kolommen is België', isBelgischAdres({ CountryNL: '', CountryFR: '' }))
check('land: Nederland is geen België', !isBelgischAdres({ CountryNL: 'Nederland', CountryFR: '' }))
check('land: alleen FR gevuld telt ook', !isBelgischAdres({ CountryNL: '', CountryFR: 'Pays-Bas' }))

check('nummer: 0123456789 is een onderneming', isOndernemingsnummer('0123456789'))
check('nummer: 2123456789 is een vestiging', !isOndernemingsnummer('2123456789'))

check('web: meerdere URLs -> de eerste', schoonWebadres('www.een.be www.twee.be') === 'https://www.een.be')
check('web: kapot www: prefix', schoonWebadres('www:een.be') === 'https://www.een.be')
check('web: schema blijft staan', schoonWebadres('http://een.be') === 'http://een.be')
check('web: te kort is geen adres', schoonWebadres('n.v.t') === null)
check('web: leeg is geen adres', schoonWebadres('') === null)

// ── De dumplezer op een fixture met elk uitsluitingsgeval ────────────────────

const map = mkdtempSync(join(tmpdir(), 'kbo-dump-'))
try {
  writeFileSync(join(map, 'meta.csv'), '"Variable","Value"\n"SnapshotDate","22-07-2026"\n"ExtractNumber","429"\n')

  writeFileSync(
    join(map, 'activity.csv'),
    '"EntityNumber","ActivityGroup","NaceVersion","NaceCode","Classification"\n' +
      '"0111.111.111","001","2025","62200","MAIN"\n' + // GOED
      '"0222.222.222","001","2025","62200","MAIN"\n' + // natuurlijk persoon -> weg
      '"0333.333.333","001","2025","62200","SECO"\n' + // nevenactiviteit -> weg
      '"0444.444.444","001","2008","62200","MAIN"\n' + // verkeerde versie -> weg
      '"2555.555.555","003","2025","62200","MAIN"\n' + // vestigingseenheid -> weg
      '"0666.666.666","001","2025","47110","MAIN"\n' + // verkeerde NACE -> weg
      '"0777.777.777","001","2025","58210","MAIN"\n' + // Amsterdam, land gevuld -> weg
      '"0888.888.888","001","2025","63120","MAIN"\n' + // land LEEG maar NL-postcode -> weg
      '"0999.999.999","001","2025","62200","MAIN"\n' + // doorgehaald adres -> weg
      '"1010.101.010","001","2025","62200","MAIN"\n'   // buiten de regio's -> weg
  )

  writeFileSync(
    join(map, 'enterprise.csv'),
    '"EnterpriseNumber","Status","JuridicalSituation","TypeOfEnterprise","JuridicalForm","JuridicalFormCAC","StartDate"\n' +
      '"0111.111.111","AC","000","2","610",,01-01-2010\n' +
      '"0222.222.222","AC","000","1","010",,01-01-2010\n' + // natuurlijk persoon
      '"0333.333.333","AC","000","2","610",,01-01-2010\n' +
      '"0444.444.444","AC","000","2","610",,01-01-2010\n' +
      '"2555.555.555","AC","000","2","610",,01-01-2010\n' +
      '"0666.666.666","AC","000","2","610",,01-01-2010\n' +
      '"0777.777.777","AC","000","2","610",,01-01-2010\n' +
      '"0888.888.888","AC","000","2","610",,01-01-2010\n' +
      '"0999.999.999","AC","000","2","610",,01-01-2010\n' +
      '"1010.101.010","AC","000","2","610",,01-01-2010\n'
  )

  writeFileSync(
    join(map, 'address.csv'),
    '"EntityNumber","TypeOfAddress","CountryNL","CountryFR","Zipcode","MunicipalityNL","MunicipalityFR","StreetNL","StreetFR","HouseNumber","Box","ExtraAddressInfo","DateStrikingOff"\n' +
      '"0111.111.111","REGO",,,"9000","Gent","Gand","Kouter","Kouter","1","","",\n' +
      '"0222.222.222","REGO",,,"9000","Gent","Gand","A","A","1","","",\n' +
      '"0333.333.333","REGO",,,"9000","Gent","Gand","A","A","1","","",\n' +
      '"0444.444.444","REGO",,,"9000","Gent","Gand","A","A","1","","",\n' +
      '"2555.555.555","REGO",,,"9000","Gent","Gand","A","A","1","","",\n' +
      '"0666.666.666","REGO",,,"9000","Gent","Gand","A","A","1","","",\n' +
      // Amsterdam met een postcode die IN het Brusselse bereik valt zodra je de letters wegstript.
      '"0777.777.777","REGO","Nederland","Pays-Bas","1077CZ","Amsterdam","Amsterdam","A","A","1","","",\n' +
      // Land LEEG, maar de postcodevorm is Nederlands. Dit is het geval dat alleen de
      // postcode-guard kan vangen — op de echte dump wordt hij nooit bereikt.
      '"0888.888.888","REGO",,,"1066 VH","Amsterdam","Amsterdam","A","A","1","","",\n' +
      '"0999.999.999","REGO",,,"9000","Gent","Gand","A","A","1","","",01-01-2024\n' +
      '"1010.101.010","REGO",,,"2000","Antwerpen","Anvers","A","A","1","","",\n'
  )

  writeFileSync(
    join(map, 'denomination.csv'),
    '"EntityNumber","Language","TypeOfDenomination","Denomination"\n' +
      '"0111.111.111","2","002","Handelsnaam BV"\n' +
      '"0111.111.111","2","001","Maatschappelijke Naam BV"\n' +
      '"1010.101.010","2","001","Antwerpen BV"\n'
  )

  writeFileSync(
    join(map, 'contact.csv'),
    '"EntityNumber","EntityContact","ContactType","Value"\n' +
      '"0111111111","ENT","WEB","www.goed.be www.tweede.be"\n' +
      '"2555555555","EST","WEB","https://vestiging.be"\n' +
      '"0111111111","ENT","EMAIL","a@goed.be"\n'
  )

  const { leads, statistiek, warnings } = await leesKboDump(map, { regions: ['WVL', 'OVL', 'BRU'] })

  check('exact één lead overleeft alle filters', leads.length === 1, `kreeg ${leads.length}: ${leads.map((l) => l.externalId).join(', ')}`)

  const l = leads[0]
  check('en het is de juiste', l?.externalId === 'kbo:0111111111', l?.externalId ?? '-')
  check('maatschappelijke naam wint van handelsnaam', l?.companyName === 'Maatschappelijke Naam BV', l?.companyName ?? '-')
  check('regio afgeleid uit de postcode', l?.region === 'OVL', l?.region ?? '-')
  check('postcode als getal', l?.postcode === 9000, String(l?.postcode))
  check('NACE-code meegenomen', l?.naceCode === '62200', l?.naceCode ?? '-')
  check('webadres opgeschoond tot de eerste URL', l?.url === 'https://www.goed.be', l?.url ?? '-')
  check('source is kbo', l?.source === 'kbo')
  check('werknemers is undefined, niet null', l?.werknemers === undefined, String(l?.werknemers))

  check('snapshot gelezen voor de bronvermelding', statistiek.snapshot === '22-07-2026', String(statistiek.snapshot))
  check('extractnummer gelezen', statistiek.extract === '429', String(statistiek.extract))
  // Zes fixture-rijen passeren de NACE-filter (0111, 0222, 0777, 0888, 0999, 1010); daarvan is
  // 0222 een natuurlijk persoon. De teller staat ná de NACE-filter, niet ervoor — dat is precies
  // wat deze check vasthoudt, want mijn eerste verwachting telde de hele enterprise.csv.
  check('van de zes NACE-kandidaten blijven vijf rechtspersonen over', statistiek.rechtspersonen === 5, String(statistiek.rechtspersonen))
  check('en de NACE-filter liet er zes door', statistiek.naceKandidaten === 6, String(statistiek.naceKandidaten))

  const alleWarnings = warnings.join(' | ')
  check('waarschuwt over het buitenlandse adres', alleWarnings.includes('buitenlands adres'), alleWarnings)
  check('waarschuwt over de niet-Belgische postcodevorm', alleWarnings.includes('postcodevorm'), alleWarnings)
} finally {
  rmSync(map, { recursive: true, force: true })
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
