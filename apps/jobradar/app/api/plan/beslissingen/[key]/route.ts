import { NextResponse } from 'next/server'
import { leesPlan } from '@/lib/plan/lees'
import { keurVersie } from '@/lib/plan/keuring'
import { legBeslissingVast } from '@/lib/plan/mutaties'
import { antwoord, leesBody, nu, planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/**
 * Een beslismoment vastleggen.
 *
 * Alleen hier komt een beslissing in de database. De afgeleide stand "klaar voor beoordeling"
 * ontstaat uit de gekoppelde acties, maar schrijft nooit: alle acties gereed betekent dat er
 * iets te beoordelen valt, niet dat het goedgekeurd is.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const versie = keurVersie(body.versie)
  if (!versie.ok) return NextResponse.json({ ok: false, error: versie.reden }, { status: 400 })

  const db = planDb()
  const mutatie = legBeslissingVast(db, key, versie.waarde, body, nu())
  return antwoord(mutatie, (beslissing) => ({ beslissing, plan: leesPlan(db) }))
}
