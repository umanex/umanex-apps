import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { CLASSIFICATIES, type Classificatie } from '@/lib/db/schema'

/**
 * Zet de classificatie van één bedrijf, en desgewenst zijn signalen en website.
 *
 * Bewust een eigen route naast `/api/leads/[id]`: die zet `lead_status`, en dat is een andere as.
 * Ze samennemen in één endpoint met een `veld`-parameter maakt het aan de aanroepkant makkelijker
 * om per ongeluk de verkeerde as te schrijven — precies de faalklasse die in LEARNINGS.md staat.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Ongeldig id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Geen geldige JSON' }, { status: 400 })
  }
  const payload = (body ?? {}) as {
    classificatie?: unknown
    signals?: unknown
    url?: unknown
  }

  const wijziging: {
    classificatie?: Classificatie | null
    geclassificeerdOp?: string | null
    signals?: string
    url?: string | null
  } = {}

  if ('classificatie' in payload) {
    const c = payload.classificatie
    // `null` is geldig en betekent "oordeel teruggenomen" — dat is wat de terug-actie doet.
    if (c === null) {
      wijziging.classificatie = null
      wijziging.geclassificeerdOp = null
    } else if (typeof c === 'string' && CLASSIFICATIES.includes(c as Classificatie)) {
      wijziging.classificatie = c as Classificatie
      wijziging.geclassificeerdOp = new Date().toISOString()
    } else {
      return NextResponse.json(
        { ok: false, error: `Ongeldige classificatie. Toegestaan: ${CLASSIFICATIES.join(', ')}, of null` },
        { status: 400 }
      )
    }
  }

  if ('signals' in payload) {
    if (!Array.isArray(payload.signals) || payload.signals.some((s) => typeof s !== 'string')) {
      return NextResponse.json({ ok: false, error: 'signals moet een lijst strings zijn' }, { status: 400 })
    }
    wijziging.signals = JSON.stringify(payload.signals)
  }

  if ('url' in payload) {
    const u = payload.url
    if (u !== null && typeof u !== 'string') {
      return NextResponse.json({ ok: false, error: 'url moet een string of null zijn' }, { status: 400 })
    }
    wijziging.url = u
  }

  if (Object.keys(wijziging).length === 0) {
    return NextResponse.json({ ok: false, error: 'Niets te wijzigen' }, { status: 400 })
  }

  const db = getDb()
  const bestaand = await db.query.companies.findFirst({ where: eq(schema.companies.id, id) })
  if (!bestaand) {
    return NextResponse.json({ ok: false, error: 'Onbekend bedrijf' }, { status: 404 })
  }

  await db.update(schema.companies).set(wijziging).where(eq(schema.companies.id, id))
  return NextResponse.json({ ok: true })
}
