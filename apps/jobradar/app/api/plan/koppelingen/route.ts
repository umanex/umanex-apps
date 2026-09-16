import { NextResponse } from 'next/server'
import { isSubjectType } from '@/lib/contact'
import { leesActiesVoorKoppeling, leesKoppelingenPerBedrijf } from '@/lib/plan/lees'
import { koppelBedrijf, ontkoppelBedrijf } from '@/lib/plan/mutaties'
import { antwoord, leesBody, nu, planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/**
 * Welke acties er zijn, en waaraan dit bedrijf al hangt.
 *
 * Eén verzoek voor beide: het paneel in het dashboard heeft ze samen nodig, en twee
 * verzoeken zouden een tussenstand kunnen tonen waarin een net gekoppelde actie nog in de
 * keuzelijst staat.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const key = url.searchParams.get('key')
  if (!isSubjectType(type) || !key) {
    return NextResponse.json({ ok: false, error: 'type en key zijn verplicht' }, { status: 400 })
  }

  const db = planDb()
  return NextResponse.json({
    ok: true,
    acties: leesActiesVoorKoppeling(db),
    gekoppeld: leesKoppelingenPerBedrijf(db)[`${type}:${key}`] ?? [],
  })
}

/** Een bedrijf aan een actie hangen. Tweemaal hetzelfde blijft één rij. */
export async function PUT(request: Request) {
  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const actie = typeof body.actie === 'string' ? body.actie : ''
  const type = body.type
  const key = typeof body.key === 'string' ? body.key : ''
  if (!actie || !isSubjectType(type) || !key) {
    return NextResponse.json(
      { ok: false, error: 'actie, type en key zijn verplicht' },
      { status: 400 }
    )
  }

  const db = planDb()
  const mutatie = koppelBedrijf(db, actie, type, key, nu())
  return antwoord(mutatie, ({ nieuw }) => ({
    nieuw,
    gekoppeld: leesKoppelingenPerBedrijf(db)[`${type}:${key}`] ?? [],
  }))
}

/** Ontkoppelen raakt het bedrijf zelf niet aan — alleen de verwijzing verdwijnt. */
export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const actie = url.searchParams.get('actie')
  const type = url.searchParams.get('type')
  const key = url.searchParams.get('key')
  if (!actie || !isSubjectType(type) || !key) {
    return NextResponse.json(
      { ok: false, error: 'actie, type en key zijn verplicht' },
      { status: 400 }
    )
  }

  const db = planDb()
  ontkoppelBedrijf(db, actie, type, key)
  return NextResponse.json({
    ok: true,
    gekoppeld: leesKoppelingenPerBedrijf(db)[`${type}:${key}`] ?? [],
  })
}
