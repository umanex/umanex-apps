import { NextResponse } from 'next/server'
import { leesIdeeen, leesPlan } from '@/lib/plan/lees'
import { maakIdee } from '@/lib/plan/mutaties'
import { antwoord, leesBody, nu, planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true, ideeen: leesIdeeen(planDb()) })
}

/** Een idee noteren. Het telt nergens in mee tot je het bewust opneemt. */
export async function POST(request: Request) {
  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const db = planDb()
  const mutatie = maakIdee(db, body, nu())
  return antwoord(mutatie, (idee) => ({ idee, plan: leesPlan(db) }))
}
