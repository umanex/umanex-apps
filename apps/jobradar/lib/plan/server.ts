import 'server-only'
import { NextResponse } from 'next/server'
import { getDb } from '../db'
import type { JobradarDb } from '../sync/upsert'
import { zaaiPlan } from './seed'
import type { Mutatie } from './types'

/**
 * De enige `server-only` laag van het plan.
 *
 * Alles eronder krijgt `db` als parameter, zodat `scripts/plan-scenarios.ts` het kan
 * uitvoeren tegen een `:memory:`-database. Dit bestand is de brug naar Next en verder niets.
 */

/**
 * De database, met het plan gezaaid.
 *
 * De zaai-poort is één SELECT op `settings` zodra het plan bestaat, dus dit is goedkoop
 * genoeg om bij elke route te doen. Het staat hier en niet in `getDb()`: daar zou elke sync
 * en elk KBO-script het plan aanmaken, terwijl dat er niets mee te maken heeft.
 */
export function planDb(): JobradarDb {
  const db = getDb()
  zaaiPlan(db)
  return db
}

/** Vandaag in ISO, dezelfde UTC-conventie als de rest van deze app. */
export function vandaag(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nu(): string {
  return new Date().toISOString()
}

/**
 * Vertaalt een `Mutatie` naar HTTP.
 *
 * De soort van de fout zit in de mutatie zelf, niet in de tekst. Zonder dat zou elke route
 * de reden-string moeten interpreteren om te kiezen tussen 400 en 404 — en dan verschuift
 * een statuscode zodra iemand een melding herschrijft.
 */
export function antwoord<T>(
  mutatie: Mutatie<T>,
  body: (waarde: T) => Record<string, unknown>
): NextResponse {
  if (mutatie.ok) return NextResponse.json({ ok: true, ...body(mutatie.waarde) })

  if (mutatie.soort === 'conflict') {
    return NextResponse.json(
      { ok: false, error: mutatie.reden, ...mutatie.conflict },
      { status: 409 }
    )
  }
  return NextResponse.json(
    { ok: false, error: mutatie.reden },
    { status: mutatie.soort === 'onbekend' ? 404 : 400 }
  )
}

export async function leesBody(request: Request): Promise<Record<string, unknown> | null> {
  const body = (await request.json().catch(() => null)) as unknown
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  return body as Record<string, unknown>
}
