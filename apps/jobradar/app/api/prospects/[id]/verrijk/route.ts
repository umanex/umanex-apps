import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { verrijkWebsite } from '@/lib/sources/brave'

/**
 * Zoekt de website van één bedrijf en slaat hem op — maar alleen wanneer het ondernemingsnummer
 * op de gevonden pagina staat.
 *
 * Een niet-bevestigd resultaat wordt NIET weggeschreven. Dat is het hele punt: een plausibele
 * URL in de database ziet er daarna identiek uit als een geverifieerde, en dan label je een
 * bedrijf op de site van een naamgenoot zonder dat iets je waarschuwt.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Ongeldig id' }, { status: 400 })
  }

  const db = getDb()
  const bedrijf = await db.query.companies.findFirst({ where: eq(schema.companies.id, id) })
  if (!bedrijf) return NextResponse.json({ ok: false, error: 'Onbekend bedrijf' }, { status: 404 })

  // externalId is `kbo:0123456789`; het ondernemingsnummer is wat erachter staat.
  const nummer = bedrijf.externalId.split(':')[1] ?? ''
  const zoekterm = `"${bedrijf.companyName}" ${bedrijf.postcode} België`

  const resultaat = await verrijkWebsite(zoekterm, nummer)

  if (resultaat.url !== null) {
    await db.update(schema.companies).set({ url: resultaat.url }).where(eq(schema.companies.id, id))
  }

  return NextResponse.json({ ok: true, ...resultaat })
}
