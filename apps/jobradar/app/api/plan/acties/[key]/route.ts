import { NextResponse } from 'next/server'
import { leesActieDetail, leesPlan } from '@/lib/plan/lees'
import {
  ACTIE_VELDEN,
  STATUS_PARAMETERS,
  keurActieVelden,
  keurStatusInvoer,
  keurVersie,
} from '@/lib/plan/keuring'
import { vrijgekomenActies } from '@/lib/plan/afleiding'
import { leesInstellingen } from '@/lib/plan/instellingen'
import { verwijderActie, wijzigActie, wijzigStatus, zetAfhankelijkheden } from '@/lib/plan/mutaties'
import { antwoord, leesBody, nu, planDb, vandaag } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const actie = leesActieDetail(planDb(), key)
  if (!actie) return NextResponse.json({ ok: false, error: `${key} bestaat niet` }, { status: 404 })
  return NextResponse.json({ ok: true, actie })
}

/**
 * Eén soort wijziging per verzoek: een status, een set afhankelijkheden, of gewone velden.
 *
 * Bewust niet te mengen. Een statuswissel draagt zijn eigen controles (blokkade, focuslimiet,
 * bewijs) en kan een 409 opleveren waar de gebruiker een keuze op moet maken; een veld-edit
 * kan dat niet. Zou je ze samen toelaten, dan is bij een geweigerde status niet te zeggen of
 * de titel wél doorging.
 *
 * Elk verzoek draagt `versie`. Dit is het eerste model in deze app waar twee schermen —
 * de lijst en een geopend paneel — dezelfde rij bewerken.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const versie = keurVersie(body.versie)
  if (!versie.ok) return NextResponse.json({ ok: false, error: versie.reden }, { status: 400 })

  const heeftStatus = Object.hasOwn(body, 'status')
  const heeftAfhankelijkheden = Object.hasOwn(body, 'afhankelijkheden')
  // Bij een statuswissel tellen de velden die bij die wissel horen niet als een tweede
  // soort wijziging — zie `STATUS_PARAMETERS`.
  const heeftVelden = ACTIE_VELDEN.some(
    (veld) =>
      Object.hasOwn(body, veld) && !(heeftStatus && STATUS_PARAMETERS.includes(veld))
  )
  if ([heeftStatus, heeftAfhankelijkheden, heeftVelden].filter(Boolean).length > 1) {
    return NextResponse.json(
      { ok: false, error: 'één soort wijziging per verzoek' },
      { status: 400 }
    )
  }

  const db = planDb()

  if (heeftStatus) {
    const gekeurd = keurStatusInvoer(body)
    if (!gekeurd.ok) return NextResponse.json({ ok: false, error: gekeurd.reden }, { status: 400 })
    // Vóór de wissel lezen, in dezelfde synchrone doorloop: better-sqlite3 blokkeert en er zit
    // geen `await` tussen, dus geen ander verzoek kan tussen deze lezing en de mutatie landen.
    const voor = leesPlan(db).acties
    const mutatie = wijzigStatus(
      db,
      key,
      versie.waarde,
      gekeurd.waarde,
      leesInstellingen(db),
      vandaag(),
      nu()
    )
    return antwoord(mutatie, ({ actie, geparkeerd }) => {
      const plan = leesPlan(db)
      return {
        actie: leesActieDetail(db, actie.key),
        geparkeerd,
        plan,
        vrijgekomen: vrijgekomenActies(voor, plan.acties),
      }
    })
  }

  if (heeftAfhankelijkheden) {
    const mutatie = zetAfhankelijkheden(db, key, versie.waarde, body.afhankelijkheden, nu())
    return antwoord(mutatie, ({ actie }) => ({
      actie: leesActieDetail(db, actie.key),
      plan: leesPlan(db),
    }))
  }

  const gekeurd = keurActieVelden(body)
  if (!gekeurd.ok) return NextResponse.json({ ok: false, error: gekeurd.reden }, { status: 400 })
  const mutatie = wijzigActie(db, key, versie.waarde, gekeurd.waarde, nu())
  return antwoord(mutatie, (actie) => ({
    actie: leesActieDetail(db, actie.key),
    plan: leesPlan(db),
  }))
}

/** Alleen eigen acties. Een actie uit de startinhoud zet je op vervallen. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const db = planDb()
  const mutatie = verwijderActie(db, key)
  return antwoord(mutatie, () => ({ plan: leesPlan(db) }))
}
