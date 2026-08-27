/**
 * Importeert de KBO Open Data-dump als kandidaat-leads.
 *
 *   node --import ./scripts/ts-resolve.mjs scripts/kbo-import.ts <map> [--schrijf]
 *
 * Zonder `--schrijf` is dit een droogloop: hij leest de volledige dump, past alle filters toe,
 * en rapporteert wat hij zou wegschrijven — zonder de database aan te raken. Dat is met opzet de
 * standaard. De personeelsfilter bestaat nog niet (die wacht op een NBB-sleutel), en zonder die
 * filter zijn het er 15.754 in plaats van de ~200 die je effectief wil labelen. Wegschrijven vóór
 * die filter er is, vult je leadlijst met ruis die je daarna weer moet opruimen.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'node:path'
import * as schema from '../lib/db/schema'
import { SCHEMA_DDL, pasKolomMigratiesToe } from '../lib/db/ddl'
import { upsertLead, type JobradarDb } from '../lib/sync/upsert'
import { leesKboDump } from '../lib/sources/kbo-dump'
import type { RegionCode } from '../lib/regions'

const args = process.argv.slice(2)
const map = args.find((a) => !a.startsWith('--'))
const schrijf = args.includes('--schrijf')

if (!map) {
  console.error('Gebruik: kbo-import.ts <map-met-uitgepakte-csv> [--schrijf]')
  process.exit(2)
}

const REGIOS: RegionCode[] = ['WVL', 'OVL', 'BRU']

console.log(`KBO-import uit ${map}${schrijf ? '' : '  (DROOGLOOP — er wordt niets weggeschreven)'}\n`)

const { leads, statistiek: s, warnings } = await leesKboDump(map, { regions: REGIOS })

const nl = (n: number) => n.toLocaleString('nl-BE')

console.log(`Bron: Kruispuntbank van Ondernemingen, FOD Economie — situatie op ${s.snapshot} (extract ${s.extract})\n`)
console.log('Trechter:')
console.log(`  NACE 62/582/63, hoofdactiviteit        ${nl(s.naceKandidaten).padStart(8)}`)
console.log(`  rechtspersonen                         ${nl(s.rechtspersonen).padStart(8)}`)
console.log(`  met maatschappelijke zetel             ${nl(s.metZetel).padStart(8)}`)
console.log(`  binnen ${REGIOS.join('/')}                     ${nl(s.binnenRegios).padStart(8)}`)
for (const [regio, n] of Object.entries(s.perRegio).sort()) {
  console.log(`      ${regio.padEnd(4)}                             ${nl(n).padStart(8)}`)
}
console.log(`  met naam (importeerbaar)               ${nl(leads.length).padStart(8)}`)
console.log(`  daarvan met webadres uit KBO           ${nl(s.metWebadres).padStart(8)}  (${((s.metWebadres / leads.length) * 100).toFixed(1)}%)`)

for (const w of warnings) console.log(`\n  ! ${w}`)

console.log('\nEerste vijf rijen:')
for (const l of leads.slice(0, 5)) {
  console.log(`  ${l.externalId}  ${l.companyName.slice(0, 38).padEnd(40)} ${l.region} ${l.postcode}  NACE ${l.naceCode}  ${l.url ?? '—'}`)
}

if (!schrijf) {
  console.log('\nDroogloop klaar. Draai met --schrijf zodra de personeelsfilter bestaat.')
  process.exit(0)
}

const dbPad = process.env.JOBRADAR_DB_PATH ?? join(process.cwd(), '.data', 'jobradar.db')
const rauw = new Database(dbPad)
rauw.pragma('journal_mode = WAL')
rauw.exec(SCHEMA_DDL)
pasKolomMigratiesToe(rauw)
const db = drizzle(rauw, { schema }) as JobradarDb

let toegevoegd = 0
for (const lead of leads) {
  const { added } = await upsertLead(db, lead, { afgeleid: false })
  if (added) toegevoegd++
}
rauw.close()
console.log(`\nWeggeschreven naar ${dbPad}: ${nl(toegevoegd)} nieuw, ${nl(leads.length - toegevoegd)} bijgewerkt.`)
