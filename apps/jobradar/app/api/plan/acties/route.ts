import { NextResponse } from 'next/server'
import { leesPlan } from '@/lib/plan/lees'
import { maakActieUitBody } from '@/lib/plan/mutaties'
import { antwoord, leesBody, nu, planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/** Een eigen actie toevoegen. Krijgt de volgende vrije key, bron `eigen`. */
export async function POST(request: Request) {
  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const db = planDb()
  const mutatie = maakActieUitBody(db, body, nu())
  return antwoord(mutatie, (actie) => ({ actie, plan: leesPlan(db) }))
}
