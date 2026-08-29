#!/usr/bin/env node
/**
 * Spiegelt de KBO/BCE Open Data naar een lokale SQLite.
 *
 *   pnpm --filter jobradar kbo:sync             # incrementeel (bootstrapt zichzelf)
 *   pnpm --filter jobradar kbo:sync --full      # forceer een verse Full-extract
 *   pnpm --filter jobradar kbo:sync --ls        # toon alleen wat er op de drop staat
 *   pnpm --filter jobradar kbo:sync --status    # toon de lokale staat, zonder netwerk
 *   pnpm --filter jobradar kbo:sync --opruimen  # verwijder verwerkte zips
 *
 * Vorm van de bron, gemeten op 2026-08-29: FOD Economie zet elke dag een `_Full.zip`
 * (~313 MB) én een `_Update.zip` (0,4–5,6 MB) op de SFTP-drop, en bewaart 32 dagen. De
 * Full is de volledige stand; de Update bevat per tabel een `_delete.csv` (alleen de
 * sleutel) en een `_insert.csv`. `code.csv` is elke keer de volledige codelijst.
 *
 * Drie keuzes, elk tegen een concrete faalvorm:
 *
 * 1. **De staat komt uit `meta.csv`, niet uit de bestandsnaam.** Beide dragen het
 *    extractnummer, dus ze kunnen elkaar tegenspreken — en dan is dát het signaal. De
 *    bestandsnaam van vandaag zegt 29-08, `meta.csv` zegt SnapshotDate 28-08: de extract
 *    loopt een dag achter op zijn bestandsnaam. Wie op de naam stuurt, mist een dag.
 * 2. **Een gat in de reeks is een harde stop.** Updates zijn alleen geldig op precies de
 *    vorige staat. Ontbreekt er één (buiten de retentie van 32 dagen), dan is de enige
 *    juiste uitkomst een verse Full — niet "de rest maar toepassen", want dat levert een
 *    database die er compleet uitziet en het niet is.
 * 3. **De spiegel is wegwerpbaar.** `synchronous=OFF` en `journal_mode=MEMORY`: bij een
 *    crash gooi je hem weg en draai je `--full`. Crash-veiligheid kopen met een factor
 *    tien op de laadtijd is hier onzin — de bron staat 32 dagen klaar.
 */
import SftpClient from 'ssh2-sftp-client'
import Database from 'better-sqlite3'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { csvObjecten, kboDatum, kboNummer } from '../lib/kbo/csv'
import { REGIONS } from '../lib/regions'

const HIER = dirname(fileURLToPath(import.meta.url))
const APP = resolve(HIER, '..')

const args = process.argv.slice(2)
const heeft = (v) => args.includes(v)
const ALLEEN_LS = heeft('--ls')
const ALLEEN_STATUS = heeft('--status')
const FORCEER_FULL = heeft('--full')
const OPRUIMEN = heeft('--opruimen')
const MAX_UPDATES = Number(args.find((a) => a.startsWith('--max='))?.slice(6) ?? 40)

const DATA_DIR = resolve(APP, process.env.KBO_DATA_DIR || '.data/kbo')
const DB_PAD = resolve(APP, process.env.KBO_DB_PATH || '.data/kbo.db')
const REMOTE_DIR = process.env.KBO_SFTP_PATH || 'opendata'

// ── Tabellen ────────────────────────────────────────────────────────────────
// De kolomnamen zijn letterlijk de kopregels uit de CSV's. Een vertaaltabel zou een
// tweede plek zijn die kan verlopen; nu is de bron zelf de documentatie.
//
// `nummers` worden ontdaan van hun punten (`0417.238.867` → `0417238867`): dat is de vorm
// waarin een ondernemingsnummer buiten KBO voorkomt (BTW-nummer, facturen), en het is de
// sleutel waarop we later tegen vacaturedata gaan matchen. Consistent in élke tabel, want
// een half-genormaliseerde sleutel geeft een join die stil niets vindt.
const TABELLEN = {
  enterprise: {
    sleutel: 'EnterpriseNumber',
    kolommen: ['EnterpriseNumber', 'Status', 'JuridicalSituation', 'TypeOfEnterprise', 'JuridicalForm', 'JuridicalFormCAC', 'StartDate'],
    nummers: ['EnterpriseNumber'],
    datums: ['StartDate'],
    pk: 'EnterpriseNumber',
  },
  establishment: {
    sleutel: 'EstablishmentNumber',
    kolommen: ['EstablishmentNumber', 'StartDate', 'EnterpriseNumber'],
    nummers: ['EstablishmentNumber', 'EnterpriseNumber'],
    datums: ['StartDate'],
    pk: 'EstablishmentNumber',
  },
  branch: {
    sleutel: 'Id',
    kolommen: ['Id', 'StartDate', 'EnterpriseNumber'],
    nummers: ['Id', 'EnterpriseNumber'],
    datums: ['StartDate'],
    pk: 'Id',
  },
  denomination: {
    sleutel: 'EntityNumber',
    kolommen: ['EntityNumber', 'Language', 'TypeOfDenomination', 'Denomination'],
    nummers: ['EntityNumber'],
    datums: [],
  },
  address: {
    sleutel: 'EntityNumber',
    kolommen: ['EntityNumber', 'TypeOfAddress', 'CountryNL', 'CountryFR', 'Zipcode', 'MunicipalityNL', 'MunicipalityFR', 'StreetNL', 'StreetFR', 'HouseNumber', 'Box', 'ExtraAddressInfo', 'DateStrikingOff'],
    nummers: ['EntityNumber'],
    datums: ['DateStrikingOff'],
  },
  contact: {
    sleutel: 'EntityNumber',
    kolommen: ['EntityNumber', 'EntityContact', 'ContactType', 'Value'],
    nummers: ['EntityNumber'],
    datums: [],
  },
  activity: {
    sleutel: 'EntityNumber',
    kolommen: ['EntityNumber', 'ActivityGroup', 'NaceVersion', 'NaceCode', 'Classification'],
    nummers: ['EntityNumber'],
    datums: [],
  },
}

const INDEXEN = [
  'CREATE INDEX IF NOT EXISTS idx_activity_nace ON activity (NaceVersion, NaceCode, Classification)',
  'CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity (EntityNumber)',
  'CREATE INDEX IF NOT EXISTS idx_address_zip ON address (Zipcode)',
  'CREATE INDEX IF NOT EXISTS idx_address_entity ON address (EntityNumber)',
  'CREATE INDEX IF NOT EXISTS idx_denomination_entity ON denomination (EntityNumber)',
  'CREATE INDEX IF NOT EXISTS idx_contact_entity ON contact (EntityNumber, ContactType)',
  'CREATE INDEX IF NOT EXISTS idx_enterprise_status ON enterprise (Status)',
  'CREATE INDEX IF NOT EXISTS idx_establishment_ent ON establishment (EnterpriseNumber)',
]

// ── Database ────────────────────────────────────────────────────────────────
function openDb() {
  mkdirSync(dirname(DB_PAD), { recursive: true })
  const db = new Database(DB_PAD)
  db.pragma('journal_mode = MEMORY')
  db.pragma('synchronous = OFF')
  db.pragma('temp_store = MEMORY')
  db.exec('CREATE TABLE IF NOT EXISTS kbo_meta (sleutel TEXT PRIMARY KEY, waarde TEXT)')
  for (const [naam, t] of Object.entries(TABELLEN)) {
    const kolommen = t.kolommen.map((k) => `"${k}" TEXT${t.pk === k ? ' PRIMARY KEY' : ''}`).join(', ')
    db.exec(`CREATE TABLE IF NOT EXISTS ${naam} (${kolommen})`)
  }
  db.exec('CREATE TABLE IF NOT EXISTS code (Category TEXT, Code TEXT, Language TEXT, Description TEXT)')
  return db
}

const meta = {
  lees: (db, sleutel) => db.prepare('SELECT waarde FROM kbo_meta WHERE sleutel = ?').get(sleutel)?.waarde ?? null,
  schrijf: (db, sleutel, waarde) =>
    db.prepare('INSERT INTO kbo_meta (sleutel, waarde) VALUES (?, ?) ON CONFLICT(sleutel) DO UPDATE SET waarde = excluded.waarde').run(sleutel, String(waarde)),
}

// ── Zip lezen zonder uit te pakken ──────────────────────────────────────────
// `unzip -p` stuurt één entry naar stdout. Dat scheelt ~2 GB tijdelijke bestanden per Full
// en is sneller: parsen begint terwijl er nog gedecomprimeerd wordt.
function zipEntries(zipPad) {
  const uit = execFileSync('unzip', ['-Z1', zipPad], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  return uit.split('\n').map((r) => r.trim()).filter(Boolean)
}

async function* zipEntryStream(zipPad, entry) {
  const proc = spawn('unzip', ['-p', zipPad, entry], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''
  proc.stderr.on('data', (d) => (stderr += d))
  const klaar = new Promise((res, rej) => {
    proc.on('close', (code) => (code === 0 ? res() : rej(new Error(`unzip -p ${entry} exit ${code}: ${stderr.slice(0, 300)}`))))
    proc.on('error', rej)
  })
  for await (const brok of proc.stdout) yield brok
  await klaar
}

// ── Laden ───────────────────────────────────────────────────────────────────
async function laadTabel(db, zipPad, entry, naam, spec) {
  const kolommen = spec.kolommen
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${naam} (${kolommen.map((k) => `"${k}"`).join(', ')}) VALUES (${kolommen.map(() => '?').join(', ')})`
  )
  let n = 0
  db.exec('BEGIN')
  try {
    for await (const rij of csvObjecten(zipEntryStream(zipPad, entry), `${entry}`)) {
      const waarden = kolommen.map((k) => {
        const rauw = rij[k] ?? ''
        if (spec.nummers.includes(k)) return kboNummer(rauw)
        if (spec.datums.includes(k)) return kboDatum(rauw)
        return rauw === '' ? null : rauw
      })
      stmt.run(waarden)
      if (++n % 200_000 === 0) {
        db.exec('COMMIT')
        db.exec('BEGIN')
        proces(`    ${naam}: ${n.toLocaleString('nl-BE')} rijen`)
      }
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return n
}

async function verwijderSleutels(db, zipPad, entry, naam, spec) {
  const stmt = db.prepare(`DELETE FROM ${naam} WHERE "${spec.sleutel}" = ?`)
  let n = 0
  db.exec('BEGIN')
  try {
    for await (const rij of csvObjecten(zipEntryStream(zipPad, entry), `${entry}`)) {
      const sleutel = Object.values(rij)[0] ?? ''
      stmt.run(kboNummer(sleutel))
      n++
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return n
}

async function laadCode(db, zipPad) {
  db.exec('BEGIN')
  db.exec('DELETE FROM code')
  const stmt = db.prepare('INSERT INTO code (Category, Code, Language, Description) VALUES (?, ?, ?, ?)')
  let n = 0
  for await (const rij of csvObjecten(zipEntryStream(zipPad, 'code.csv'), 'code.csv')) {
    stmt.run(rij.Category, rij.Code, rij.Language, rij.Description)
    n++
  }
  db.exec('COMMIT')
  return n
}

async function leesMeta(zipPad) {
  const uit = {}
  for await (const rij of csvObjecten(zipEntryStream(zipPad, 'meta.csv'), 'meta.csv')) {
    uit[rij.Variable] = rij.Value
  }
  return uit
}

// ── Uitvoer ─────────────────────────────────────────────────────────────────
const proces = (t) => console.log(t)
const ok = (t) => console.log(`  ✓ ${t}`)
const fout = (t) => console.error(`  ✗ ${t}`)

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Wat de spiegel waard is: het universum waar leads uit komen. */
function universum(db) {
  const zips = Object.values(REGIONS).map((r) => `(CAST(a.Zipcode AS INTEGER) BETWEEN ${r.postcodeMin} AND ${r.postcodeMax})`).join(' OR ')
  const rij = db
    .prepare(
      `SELECT COUNT(DISTINCT e.EnterpriseNumber) AS n
         FROM enterprise e
         JOIN activity  act ON act.EntityNumber = e.EnterpriseNumber
         JOIN address   a   ON a.EntityNumber   = e.EnterpriseNumber
        WHERE e.Status = 'AC'
          AND act.NaceVersion = '2025'
          AND act.Classification = 'MAIN'
          AND act.NaceCode LIKE '62%'
          AND (${zips})`
    )
    .get()
  return rij?.n ?? 0
}

// ── Hoofdloop ───────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  const db = openDb()

  const lokaalNummer = Number(meta.lees(db, 'ExtractNumber') ?? 0)
  const lokaalSnapshot = meta.lees(db, 'SnapshotDate')

  if (ALLEEN_STATUS) {
    proces(`Lokale spiegel: ${DB_PAD}`)
    proces(`  extract ${lokaalNummer || '(geen)'} · snapshot ${lokaalSnapshot ?? '(geen)'}`)
    for (const naam of [...Object.keys(TABELLEN), 'code']) {
      const n = db.prepare(`SELECT COUNT(*) AS n FROM ${naam}`).get().n
      proces(`  ${naam.padEnd(16)} ${n.toLocaleString('nl-BE').padStart(12)} rijen`)
    }
    if (lokaalNummer) proces(`  universum (AC × NACE2025 62xx MAIN × WVL/OVL/BRU): ${universum(db).toLocaleString('nl-BE')}`)
    return 0
  }

  const host = (process.env.KBO_SFTP_HOST || '').replace(/^[a-z0-9+.-]+:\/\//i, '')
  const gebruiker = process.env.KBO_SFTP_USER
  const wachtwoord = process.env.KBO_SFTP_PASSWORD
  if (!host || !gebruiker || !wachtwoord) {
    fout('KBO_SFTP_HOST, KBO_SFTP_USER en KBO_SFTP_PASSWORD moeten gezet zijn (apps/jobradar/.env.local)')
    return 2
  }

  const sftp = new SftpClient()
  // De drop biedt de methode `password` niet aan — alleen `publickey` en
  // `keyboard-interactive` (gemeten: `Permission denied (publickey,keyboard-interactive)`).
  // ssh2 probeert bij een `password`-veld enkel die ene methode en geeft het dan op; de
  // OpenSSH-client slaagde wél, omdat die terugvalt op keyboard-interactive. Dit ís die
  // terugval, expliciet gemaakt. `password` blijft staan voor als de server hem ooit wél
  // aanbiedt — dan wordt deze handler simpelweg niet aangeroepen.
  sftp.client.on('keyboard-interactive', (_naam, _instructies, _taal, prompts, klaar) =>
    klaar(prompts.map(() => wachtwoord))
  )
  await sftp.connect({
    host,
    port: Number(process.env.KBO_SFTP_PORT || 22),
    username: gebruiker,
    password: wachtwoord,
    tryKeyboard: true,
    readyTimeout: 30_000,
  })

  try {
    const bestanden = (await sftp.list(REMOTE_DIR))
      .filter((b) => b.type === '-')
      .map((b) => {
        const m = /^KboOpenData_(\d+)_(\d{4})_(\d{2})_(\d{2})_(Full|Update)\.zip$/.exec(b.name)
        return m ? { naam: b.name, nummer: Number(m[1]), datum: `${m[2]}-${m[3]}-${m[4]}`, soort: m[5], grootte: b.size } : null
      })
      .filter(Boolean)
      .sort((a, b) => a.nummer - b.nummer)

    if (!bestanden.length) {
      fout(`geen KboOpenData-bestanden in ${REMOTE_DIR}`)
      return 1
    }

    if (ALLEEN_LS) {
      const fulls = bestanden.filter((b) => b.soort === 'Full')
      const updates = bestanden.filter((b) => b.soort === 'Update')
      proces(`${bestanden.length} bestanden in ${REMOTE_DIR}`)
      proces(`  Full:   ${fulls.length} stuks, ${fulls[0].nummer} (${fulls[0].datum}) t/m ${fulls.at(-1).nummer} (${fulls.at(-1).datum}), nieuwste ${mb(fulls.at(-1).grootte)}`)
      proces(`  Update: ${updates.length} stuks, ${updates[0].nummer} t/m ${updates.at(-1).nummer}`)
      proces(`  lokaal: extract ${lokaalNummer || '(geen)'}`)
      return 0
    }

    // ── Plan ────────────────────────────────────────────────────────────────
    const nieuwsteFull = bestanden.filter((b) => b.soort === 'Full').at(-1)
    let plan
    if (FORCEER_FULL || !lokaalNummer) {
      plan = [nieuwsteFull]
      proces(!lokaalNummer ? '→ Bootstrap: nog geen lokale spiegel' : '→ Verse Full op verzoek')
    } else {
      const nodig = bestanden.filter((b) => b.soort === 'Update' && b.nummer > lokaalNummer)
      const eerste = nodig[0]
      if (!nodig.length) {
        ok(`al bij: extract ${lokaalNummer} (snapshot ${lokaalSnapshot})`)
        return 0
      }
      // Gat-controle: de eerste update moet exact op onze staat aansluiten.
      if (eerste.nummer !== lokaalNummer + 1) {
        fout(`gat in de reeks: lokaal ${lokaalNummer}, oudste beschikbare update ${eerste.nummer}`)
        fout(`  De retentie is 32 dagen. Draai 'kbo:sync --full' voor een verse volledige stand.`)
        return 1
      }
      plan = nodig.slice(0, MAX_UPDATES)
      proces(`→ ${plan.length} update(s): ${plan[0].nummer} t/m ${plan.at(-1).nummer}`)
    }

    // ── Uitvoeren ───────────────────────────────────────────────────────────
    for (const bestand of plan) {
      const lokaalPad = join(DATA_DIR, bestand.naam)
      if (existsSync(lokaalPad) && statSync(lokaalPad).size === bestand.grootte) {
        ok(`${bestand.naam} stond er al (${mb(bestand.grootte)})`)
      } else {
        proces(`  ↓ ${bestand.naam} (${mb(bestand.grootte)})`)
        let vorige = 0
        await sftp.fastGet(join(REMOTE_DIR, bestand.naam), lokaalPad, {
          step: (totaal) => {
            const pct = Math.floor((totaal / bestand.grootte) * 10) * 10
            if (pct > vorige) {
              vorige = pct
              process.stdout.write(`    ${pct}%\r`)
            }
          },
        })
        const geschreven = statSync(lokaalPad).size
        if (geschreven !== bestand.grootte) {
          fout(`${bestand.naam}: ${geschreven} bytes lokaal tegen ${bestand.grootte} op de server`)
          return 1
        }
        ok(`${bestand.naam} binnengehaald`)
      }

      const entries = zipEntries(lokaalPad)
      const m = await leesMeta(lokaalPad)
      // Twee onafhankelijke signalen over hetzelfde ding. Spreken ze elkaar tegen, dan
      // klopt onze aanname over de bron niet en is doorgaan raden.
      if (Number(m.ExtractNumber) !== bestand.nummer) {
        fout(`${bestand.naam}: meta.csv zegt extract ${m.ExtractNumber}, de bestandsnaam ${bestand.nummer}`)
        return 1
      }
      const isFull = m.ExtractType === 'full'
      if (isFull !== (bestand.soort === 'Full')) {
        fout(`${bestand.naam}: meta.csv zegt ExtractType "${m.ExtractType}", de bestandsnaam "${bestand.soort}"`)
        return 1
      }

      proces(`  ▸ ${bestand.naam} — ${m.ExtractType}, snapshot ${m.SnapshotDate}`)

      if (isFull) {
        for (const naam of Object.keys(TABELLEN)) db.exec(`DELETE FROM ${naam}`)
      }

      for (const [naam, spec] of Object.entries(TABELLEN)) {
        if (!isFull) {
          const del = `${naam}_delete.csv`
          if (entries.includes(del)) {
            const n = await verwijderSleutels(db, lokaalPad, del, naam, spec)
            if (n) ok(`${naam}: ${n.toLocaleString('nl-BE')} sleutel(s) verwijderd`)
          }
        }
        const ins = isFull ? `${naam}.csv` : `${naam}_insert.csv`
        if (!entries.includes(ins)) {
          fout(`${bestand.naam} mist ${ins}`)
          return 1
        }
        const n = await laadTabel(db, lokaalPad, ins, naam, spec)
        ok(`${naam}: ${n.toLocaleString('nl-BE')} rijen geladen`)
      }

      if (entries.includes('code.csv')) {
        const n = await laadCode(db, lokaalPad)
        ok(`code: ${n.toLocaleString('nl-BE')} rijen`)
      }

      meta.schrijf(db, 'ExtractNumber', m.ExtractNumber)
      meta.schrijf(db, 'SnapshotDate', m.SnapshotDate)
      meta.schrijf(db, 'ExtractTimestamp', m.ExtractTimestamp)
      meta.schrijf(db, 'ExtractType', m.ExtractType)
    }

    proces('  ▸ indexen')
    for (const sql of INDEXEN) db.exec(sql)
    db.exec('ANALYZE')
    ok('indexen bij')

    if (OPRUIMEN) {
      let weg = 0
      for (const naam of readdirSync(DATA_DIR).filter((n) => n.endsWith('.zip'))) {
        unlinkSync(join(DATA_DIR, naam))
        weg++
      }
      ok(`${weg} zip(s) opgeruimd`)
    }

    proces('')
    for (const naam of [...Object.keys(TABELLEN), 'code']) {
      const n = db.prepare(`SELECT COUNT(*) AS n FROM ${naam}`).get().n
      proces(`  ${naam.padEnd(16)} ${n.toLocaleString('nl-BE').padStart(12)} rijen`)
    }
    proces('')
    ok(`extract ${meta.lees(db, 'ExtractNumber')} · snapshot ${meta.lees(db, 'SnapshotDate')}`)
    ok(`universum (AC × NACE2025 62xx MAIN × WVL/OVL/BRU): ${universum(db).toLocaleString('nl-BE')} ondernemingen`)
    return 0
  } finally {
    await sftp.end()
    db.close()
  }
}

process.exit(await main())
