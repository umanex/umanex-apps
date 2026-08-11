import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import { parseZoekopdracht, serialiseerZoekopdracht, type Zoekopdracht } from '../settings'
import type { JobradarDb } from './upsert'

/**
 * Lezen en schrijven van de instellingen, met `db` als parameter.
 *
 * Zelfde reden als bij `upsert.ts`: `lib/db/index.ts` begint met `import 'server-only'`, dus
 * alles wat daar binnen leeft is buiten Next niet aan te roepen en dus niet te toetsen. Zo
 * kan de suite dit op een `:memory:`-database uitrijden.
 */
const SLEUTEL_ZOEKOPDRACHT = 'zoekopdracht'

export async function leesZoekopdracht(db: JobradarDb): Promise<Zoekopdracht> {
  const rij = await db.query.settings.findFirst({
    where: eq(schema.settings.key, SLEUTEL_ZOEKOPDRACHT),
  })
  // `parseZoekopdracht` valt terug op de gemeten standaard bij een ontbrekende, kapotte of
  // ongeldig geworden waarde — de sync mag nooit zonder zoektermen draaien.
  return parseZoekopdracht(rij?.value)
}

export async function schrijfZoekopdracht(db: JobradarDb, z: Zoekopdracht): Promise<void> {
  const nu = new Date().toISOString()
  const waarde = serialiseerZoekopdracht(z)

  const bestaand = await db.query.settings.findFirst({
    where: eq(schema.settings.key, SLEUTEL_ZOEKOPDRACHT),
  })

  if (bestaand) {
    await db
      .update(schema.settings)
      .set({ value: waarde, updatedAt: nu })
      .where(eq(schema.settings.key, SLEUTEL_ZOEKOPDRACHT))
    return
  }

  await db.insert(schema.settings).values({ key: SLEUTEL_ZOEKOPDRACHT, value: waarde, updatedAt: nu })
}

/** Zet de zoekopdracht terug op de standaard door de rij te verwijderen, niet door hem te overschrijven. */
export async function herstelZoekopdracht(db: JobradarDb): Promise<void> {
  await db.delete(schema.settings).where(eq(schema.settings.key, SLEUTEL_ZOEKOPDRACHT))
}
