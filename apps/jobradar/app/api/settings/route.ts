import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { leesZoekopdracht, schrijfZoekopdracht, herstelZoekopdracht } from '@/lib/sync/settings-store'
import { splitsTermen, valideerZoekopdracht, standaardZoekopdracht, isStandaard } from '@/lib/settings'

export async function GET() {
  const zoek = await leesZoekopdracht(getDb())
  return NextResponse.json({ ok: true, zoek, standaard: standaardZoekopdracht(), isStandaard: isStandaard(zoek) })
}

export async function PUT(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Ongeldige JSON in het verzoek.' }, { status: 400 })
  }

  const b = (body ?? {}) as { termen?: unknown; uitsluiten?: unknown }
  if (!Array.isArray(b.termen) || !Array.isArray(b.uitsluiten)) {
    return NextResponse.json({ ok: false, error: '`termen` en `uitsluiten` moeten lijsten zijn.' }, { status: 400 })
  }

  // Splitsen gebeurt óók hier, niet alleen in de UI: `what_or` matcht losse woorden, dus een
  // term met een spatie erin is er twee. Wie de route rechtstreeks aanroept hoort dezelfde
  // regel te krijgen als wie het scherm gebruikt.
  const zoek = {
    termen: splitsTermen(b.termen.map(String)),
    uitsluiten: splitsTermen(b.uitsluiten.map(String)),
  }

  const fout = valideerZoekopdracht(zoek)
  if (fout) return NextResponse.json({ ok: false, error: fout }, { status: 400 })

  const db = getDb()
  await schrijfZoekopdracht(db, zoek)
  return NextResponse.json({ ok: true, zoek, isStandaard: isStandaard(zoek) })
}

/** Terug naar de gemeten standaard: de rij verdwijnt, hij wordt niet overschreven. */
export async function DELETE() {
  const db = getDb()
  await herstelZoekopdracht(db)
  const zoek = await leesZoekopdracht(db)
  return NextResponse.json({ ok: true, zoek, isStandaard: isStandaard(zoek) })
}
