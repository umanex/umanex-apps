/**
 * De instellingen en de aannames van het plan, in de bestaande `settings`-tabel.
 *
 * Zelfde regime als de zoekopdracht: **een ontbrekende rij betekent de standaard**, en
 * herstellen gebeurt door de rij te verwijderen in plaats van de standaard terug te
 * schrijven. Zo blijft er één plek waar de standaard staat — in code — en kan een
 * opgeslagen kopie niet stil uiteenlopen met wat de app bedoelt.
 *
 * Alles hier is synchroon. `db.transaction` van better-sqlite3 voert zijn callback
 * synchroon uit en commit zodra die terugkeert; een async callback geeft een Promise terug
 * en de transactie zou dus sluiten vóór de eerste query gedraaid heeft. Daarom gebruikt de
 * hele `lib/plan`-laag `.get()`, `.all()` en `.run()` in plaats van `await`.
 */
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { JobradarDb } from '../sync/upsert'
import { STANDAARD_AANNAMES } from './aannames'
import { STANDAARD_UREN_PER_DAG } from './inzet'
import type { PlanInstellingen } from './types'

export const SLEUTEL_INSTELLINGEN = 'plan.instellingen'
export const SLEUTEL_AANNAMES = 'plan.aannames'
export const SLEUTEL_SEED_VERSIE = 'plan.seed_versie'

/** De opdracht mikt op januari 2027; instelbaar, want een plan schuift. */
export function standaardInstellingen(): PlanInstellingen {
  return { lancering: '2027-01', urenPerDag: STANDAARD_UREN_PER_DAG, focusLimiet: 3 }
}

/**
 * Leest de instellingen uit een opgeslagen JSON-blob, per veld met terugval.
 *
 * Per veld en niet in één keer: een kapot `focusLimiet` mag de lanceringsmaand niet
 * meeslepen. Een plan dat na een halve schrijffout stilletjes op een andere datum mikt, is
 * erger dan een plan dat één veld op de standaard zet.
 */
export function parseInstellingen(rauw: string | null | undefined): PlanInstellingen {
  const standaard = standaardInstellingen()
  if (!rauw) return standaard
  let v: unknown
  try {
    v = JSON.parse(rauw)
  } catch {
    return standaard
  }
  if (typeof v !== 'object' || v === null) return standaard
  const r = v as Record<string, unknown>

  const lancering =
    typeof r.lancering === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.lancering)
      ? r.lancering
      : standaard.lancering
  const urenPerDag =
    typeof r.urenPerDag === 'number' && r.urenPerDag > 0 && r.urenPerDag <= 24
      ? r.urenPerDag
      : standaard.urenPerDag
  const focusLimiet =
    Number.isInteger(r.focusLimiet) && (r.focusLimiet as number) >= 1 && (r.focusLimiet as number) <= 10
      ? (r.focusLimiet as number)
      : standaard.focusLimiet

  return { lancering, urenPerDag, focusLimiet }
}

/** Een `settings`-rij schrijven of bijwerken. Werkt ook binnen een transactie (`tx`). */
export function zetSetting(db: JobradarDb, key: string, value: string, nu: string): void {
  db.insert(schema.settings)
    .values({ key, value, updatedAt: nu })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: nu } })
    .run()
}

export function leesSetting(db: JobradarDb, key: string): string | null {
  const rij = db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1).get()
  return rij?.value ?? null
}

export function leesInstellingen(db: JobradarDb): PlanInstellingen {
  return parseInstellingen(leesSetting(db, SLEUTEL_INSTELLINGEN))
}

export function schrijfInstellingen(db: JobradarDb, i: PlanInstellingen, nu: string): void {
  zetSetting(db, SLEUTEL_INSTELLINGEN, JSON.stringify(i), nu)
}

export function leesAannames(db: JobradarDb): { tekst: string; isStandaard: boolean } {
  const rij = leesSetting(db, SLEUTEL_AANNAMES)
  if (rij === null) return { tekst: STANDAARD_AANNAMES, isStandaard: true }
  return { tekst: rij, isStandaard: rij === STANDAARD_AANNAMES }
}

export function schrijfAannames(db: JobradarDb, tekst: string, nu: string): void {
  zetSetting(db, SLEUTEL_AANNAMES, tekst, nu)
}

/** Herstellen = de rij weghalen, niet de standaard terugschrijven. Zie de kop. */
export function herstelAannames(db: JobradarDb): void {
  db.delete(schema.settings).where(eq(schema.settings.key, SLEUTEL_AANNAMES)).run()
}

export function leesSeedVersie(db: JobradarDb): number {
  const rauw = leesSetting(db, SLEUTEL_SEED_VERSIE)
  const n = rauw === null ? 0 : Number(rauw)
  return Number.isFinite(n) ? n : 0
}
