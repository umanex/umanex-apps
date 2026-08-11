/**
 * Invarianten op de sync-upserts, tegen een echt schema.
 *
 * Deze suite bestaat omdat de vorige het niet kon: `upsertJob`/`upsertLead` waren closures
 * in de route-handler, en dus door niets aanroepbaar. Precies het stuk dat een sync kan
 * laten crashen — de dedupe-sleutel bij het bijwerken — lag daardoor ongedekt, terwijl de
 * pure functie eronder wél checks had. Een guard op de helft van het pad.
 *
 * Draait op `:memory:` met dezelfde DDL als productie (`lib/db/ddl.ts`). Geen bestand, geen
 * netwerk, en per constructie onbereikbaar voor de database van de gebruiker.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/upsert-scenarios.ts
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../lib/db/schema'
import { SCHEMA_DDL, pasKolomMigratiesToe } from '../lib/db/ddl'
import { upsertJob, upsertLead, type JobradarDb } from '../lib/sync/upsert'
import { jobDedupeHash } from '../lib/matching'
import { leesZoekopdracht, schrijfZoekopdracht, herstelZoekopdracht } from '../lib/sync/settings-store'
import { standaardZoekopdracht, isStandaard, serialiseerZoekopdracht } from '../lib/settings'
import { eq } from 'drizzle-orm'
import type { RawJob, RawLead } from '../lib/sources/types'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

function verseDb(): { db: JobradarDb; rauw: InstanceType<typeof Database> } {
  const rauw = new Database(':memory:')
  rauw.exec(SCHEMA_DDL)
  pasKolomMigratiesToe(rauw)
  return { db: drizzle(rauw, { schema }) as JobradarDb, rauw }
}

function job(over: Partial<RawJob> & Pick<RawJob, 'externalId' | 'title' | 'company'>): RawJob {
  return {
    postcode: 0,
    city: null,
    region: 'OVL',
    url: 'https://example.test/v',
    source: 'adzuna',
    description: '',
    postedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }
}

function lead(over: Partial<RawLead> & Pick<RawLead, 'externalId' | 'companyName' | 'signals'>): RawLead {
  return { postcode: 9000, region: 'OVL', naceCode: null, source: 'kbo', ...over }
}

// ── 1. Idempotentie op rij-niveau ────────────────────────────────────────────
{
  const { db, rauw } = verseDb()
  const j = job({ externalId: 'a1', title: 'UX Designer', company: 'Acme', city: 'Gent' })
  const eerste = await upsertJob(db, j)
  const tweede = await upsertJob(db, j)
  check('eerste upsert voegt toe', eerste.added)
  check('tweede upsert werkt bij', !tweede.added)
  check('geen tweede rij', (rauw.prepare('SELECT COUNT(*) c FROM jobs').get() as { c: number }).c === 1)
  rauw.close()
}

// ── 2. Status is van de gebruiker, niet van de bron ──────────────────────────
{
  const { db, rauw } = verseDb()
  await upsertJob(db, job({ externalId: 'a1', title: 'UX Designer', company: 'Acme', city: 'Gent' }))
  rauw.prepare("UPDATE jobs SET job_status='saved'").run()

  // De bron wijzigt de titel: onder de oude sleutel was dit een nieuwe rij met status 'new',
  // waardoor een opgeslagen vacature stil uit de feed verdween.
  await upsertJob(db, job({ externalId: 'a1', title: 'UX Designer (m/v)', company: 'Acme', city: 'Gent' }))
  const rij = rauw.prepare('SELECT job_status, title FROM jobs').get() as { job_status: string; title: string }
  check('status overleeft een titelwijziging', rij.job_status === 'saved', rij.job_status)
  check('titel wordt wel bijgewerkt', rij.title === 'UX Designer (m/v)')
  check('nog steeds één rij', (rauw.prepare('SELECT COUNT(*) c FROM jobs').get() as { c: number }).c === 1)
  rauw.close()
}

// ── 3. De hash-botsing die de sync velde ─────────────────────────────────────
// Twee rijen die onder de óude hashvorm uit elkaar bleven ("Acme BV" / "Acme NV") vallen
// onder de nieuwe samen. Blind bijwerken gaf SQLITE_CONSTRAINT_UNIQUE en nam de hele sync
// mee. Dit is de call site van `kiesDedupeHash` — de pure functie had checks, dit pad niet.
{
  const { db, rauw } = verseDb()
  const nu = '2026-08-01T00:00:00.000Z'
  rauw
    .prepare(
      `INSERT INTO jobs (external_id,source,title,company,postcode,region,url,posted_at,dedupe_hash,job_status,first_seen_at,last_seen_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run('a1', 'adzuna', 'UX Designer', 'Acme BV', 9000, 'OVL', 'u', nu, 'ux designer|acme bv|9000', 'saved', nu, nu)
  rauw
    .prepare(
      `INSERT INTO jobs (external_id,source,title,company,postcode,region,url,posted_at,dedupe_hash,job_status,first_seen_at,last_seen_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run('a2', 'adzuna', 'UX Designer', 'Acme NV', 9000, 'OVL', 'u', nu, 'ux designer|acme nv|9000', 'contacted', nu, nu)

  const doelHash = jobDedupeHash({ title: 'UX Designer', company: 'Acme BV', city: null, postcode: 9000, region: 'OVL' })
  check('de twee rijen botsen inderdaad op één nieuwe sleutel', doelHash === jobDedupeHash({ title: 'UX Designer', company: 'Acme NV', city: null, postcode: 9000, region: 'OVL' }))

  let klapte = false
  try {
    await upsertJob(db, job({ externalId: 'a1', title: 'UX Designer', company: 'Acme BV', postcode: 9000 }))
    await upsertJob(db, job({ externalId: 'a2', title: 'UX Designer', company: 'Acme NV', postcode: 9000 }))
  } catch {
    klapte = true
  }
  check('sync klapt niet op de unieke index', !klapte)
  check('beide rijen bestaan nog', (rauw.prepare('SELECT COUNT(*) c FROM jobs').get() as { c: number }).c === 2)
  const statussen = (rauw.prepare('SELECT job_status FROM jobs ORDER BY id').all() as { job_status: string }[])
    .map((r) => r.job_status)
    .join(',')
  check('beide statussen intact', statussen === 'saved,contacted', statussen)
  rauw.close()
}

// ── 4. Signalen over twee syncs heen ─────────────────────────────────────────
// De bug die deze suite had moeten vangen en niet kon: een KBO-lead verloor zijn signalen
// vanaf de tweede sync, omdat de merge de afgeleide námen uit het verkeerde argument stripte.
{
  const { db, rauw } = verseDb()
  const kbo = lead({ externalId: 'kbo-1', companyName: 'Acme', signals: ['recente groei', 'series A+'] })

  await upsertLead(db, kbo, { afgeleid: false })
  const na1 = JSON.parse((rauw.prepare('SELECT signals FROM companies').get() as { signals: string }).signals) as string[]
  check('sync 1 bewaart de bronsignalen', na1.includes('recente groei') && na1.includes('series A+'), JSON.stringify(na1))

  await upsertLead(db, kbo, { afgeleid: false })
  const na2 = JSON.parse((rauw.prepare('SELECT signals FROM companies').get() as { signals: string }).signals) as string[]
  check('sync 2 bewaart ze óók', na2.includes('recente groei') && na2.includes('series A+'), JSON.stringify(na2))
  check('sync 2 verandert niets', JSON.stringify(na1) === JSON.stringify(na2), JSON.stringify({ na1, na2 }))

  // Een afgeleide run legt zijn eigen signalen erover en laat het vreemde signaal staan.
  await upsertLead(db, { ...kbo, source: 'vacatures', externalId: 'vacatures:acme', signals: ['UX-budget aanwezig'] }, { afgeleid: true })
  const na3 = JSON.parse((rauw.prepare('SELECT signals FROM companies').get() as { signals: string }).signals) as string[]
  check('afgeleide run behoudt "series A+"', na3.includes('series A+'), JSON.stringify(na3))
  check('afgeleide run zet zijn eigen signaal', na3.includes('UX-budget aanwezig'), JSON.stringify(na3))
  check('afgeleide run laat het verdwenen afgeleide signaal vallen', !na3.includes('recente groei'), JSON.stringify(na3))
  rauw.close()
}

// De twee merge-richtingen moeten van elkaar te ONDERSCHEIDEN zijn. Wissel je ze om, dan
// hoort dit te falen — anders bewaakt de suite hierboven de richting niet, alleen de inhoud.
{
  const { db, rauw } = verseDb()
  // Bestaand: één afgeleid signaal. De bron levert een ander afgeleid signaal.
  await upsertLead(db, lead({ externalId: 'v-1', companyName: 'Theta', source: 'vacatures', signals: ['recente groei'] }), { afgeleid: true })
  await upsertLead(db, lead({ externalId: 'v-1', companyName: 'Theta', source: 'vacatures', signals: ['UX-budget aanwezig'] }), { afgeleid: true })
  const naAfgeleid = JSON.parse((rauw.prepare('SELECT signals FROM companies').get() as { signals: string }).signals) as string[]
  check('afgeleide richting VERVANGT het oude afgeleide signaal', !naAfgeleid.includes('recente groei') && naAfgeleid.includes('UX-budget aanwezig'), JSON.stringify(naAfgeleid))

  // Diezelfde invoer via de bron-richting hoort het afgeleide signaal juist te BEWAREN.
  const { db: db2, rauw: rauw2 } = verseDb()
  await upsertLead(db2, lead({ externalId: 'k-1', companyName: 'Theta', signals: ['recente groei'] }), { afgeleid: false })
  await upsertLead(db2, lead({ externalId: 'k-1', companyName: 'Theta', signals: ['series A+'] }), { afgeleid: false })
  const naBron = JSON.parse((rauw2.prepare('SELECT signals FROM companies').get() as { signals: string }).signals) as string[]
  check('bron-richting BEWAART het afgeleide signaal', naBron.includes('recente groei') && naBron.includes('series A+'), JSON.stringify(naBron))
  rauw.close()
  rauw2.close()
}

// ── 5. Leadscore volgt de signalen die er echt staan ─────────────────────────
{
  const { db, rauw } = verseDb()
  await upsertLead(db, lead({ externalId: 'k1', companyName: 'Beta', signals: ['series A+', 'startup'] }), { afgeleid: false })
  const r = rauw.prepare('SELECT signals, lead_score FROM companies').get() as { signals: string; lead_score: number }
  const s = JSON.parse(r.signals) as string[]
  check('leadScore hoort bij de opgeslagen signalen', r.lead_score === 35, `${r.lead_score} bij ${JSON.stringify(s)}`)
  rauw.close()
}

// ── 6. De opgeslagen zoekopdracht ───────────────────────────────────────────
// De sync leest deze waarde bij élke run. Valt hij verkeerd terug, dan haalt Adzuna zonder
// `what_or` álles binnen de straal op — leeg is hier niet "niets" maar "alles".
{
  const { db, rauw } = verseDb()

  const leeg = await leesZoekopdracht(db)
  check('zonder opgeslagen rij geldt de gemeten standaard', isStandaard(leeg), JSON.stringify(leeg))

  const eigen = { termen: ['kotlin', 'rust'], uitsluiten: ['stage'] }
  await schrijfZoekopdracht(db, eigen)
  const na = await leesZoekopdracht(db)
  check('opslaan en teruglezen levert hetzelfde', serialiseerZoekopdracht(na) === serialiseerZoekopdracht(eigen), JSON.stringify(na))
  check('er staat één rij', (rauw.prepare('SELECT COUNT(*) c FROM settings').get() as { c: number }).c === 1)

  await schrijfZoekopdracht(db, eigen)
  check('twee keer opslaan geeft geen tweede rij', (rauw.prepare('SELECT COUNT(*) c FROM settings').get() as { c: number }).c === 1)

  const anders = { termen: ['ux'], uitsluiten: [] }
  await schrijfZoekopdracht(db, anders)
  check('overschrijven werkt', serialiseerZoekopdracht(await leesZoekopdracht(db)) === serialiseerZoekopdracht(anders))

  // Een handmatig bedorven waarde mag de sync niet zonder zoektermen laten draaien.
  rauw.prepare("UPDATE settings SET value='{kapot' WHERE key='zoekopdracht'").run()
  check('een kapotte waarde valt terug op de standaard', isStandaard(await leesZoekopdracht(db)))
  rauw.prepare(`UPDATE settings SET value='{"termen":[],"uitsluiten":[]}' WHERE key='zoekopdracht'`).run()
  check('een lege waarde valt terug op de standaard', isStandaard(await leesZoekopdracht(db)))

  await herstelZoekopdracht(db)
  check('herstellen verwijdert de rij', (rauw.prepare('SELECT COUNT(*) c FROM settings').get() as { c: number }).c === 0)
  check('en daarna geldt de standaard weer', isStandaard(await leesZoekopdracht(db)))
  check('herstellen op een lege tabel gooit niet', await herstelZoekopdracht(db).then(() => true).catch(() => false))

  rauw.close()
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
