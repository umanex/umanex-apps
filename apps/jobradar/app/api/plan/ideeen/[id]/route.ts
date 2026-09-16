import { NextResponse } from 'next/server'
import { leesPlan } from '@/lib/plan/lees'
import { keurPrioriteit } from '@/lib/plan/keuring'
import { neemIdeeOp, verwijderIdee, wijzigIdee } from '@/lib/plan/mutaties'
import { antwoord, leesBody, nu, planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/**
 * Een idee bewerken, verwerpen, of opnemen in het plan.
 *
 * Opnemen loopt via een eigen tak met een verplichte prioriteitsgroep — het is de enige weg
 * waarop een idee een actie wordt, en dat mag nooit een neveneffect zijn van een statusveld.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'ongeldig id' }, { status: 400 })
  }

  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const db = planDb()

  if (body.status === 'opgenomen') {
    const prioriteit = keurPrioriteit(body.prioriteit)
    if (!prioriteit.ok) {
      return NextResponse.json(
        { ok: false, error: 'kies een prioriteitsgroep om dit idee in op te nemen' },
        { status: 400 }
      )
    }
    const mutatie = neemIdeeOp(db, id, prioriteit.waarde, nu())
    return antwoord(mutatie, ({ idee, actie }) => ({ idee, actie, plan: leesPlan(db) }))
  }

  const mutatie = wijzigIdee(db, id, body, nu())
  return antwoord(mutatie, (idee) => ({ idee, plan: leesPlan(db) }))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'ongeldig id' }, { status: 400 })
  }

  const db = planDb()
  const mutatie = verwijderIdee(db, id)
  return antwoord(mutatie, () => ({ plan: leesPlan(db) }))
}
