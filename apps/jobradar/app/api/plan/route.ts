import { NextResponse } from 'next/server'
import { leesPlan } from '@/lib/plan/lees'
import {
  herstelAannames,
  leesAannames,
  leesInstellingen,
  schrijfAannames,
  schrijfInstellingen,
} from '@/lib/plan/instellingen'
import { keurInstellingen } from '@/lib/plan/keuring'
import { leesBody, nu, planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/** Het volledige plan, inclusief alles wat eruit afgeleid is. */
export async function GET() {
  return NextResponse.json({ ok: true, plan: leesPlan(planDb()) })
}

/**
 * De instellingen en de aannames.
 *
 * `aannames: null` betekent herstellen — de rij verdwijnt en de standaard uit de code geldt
 * weer. Dat is hetzelfde regime als de zoekopdracht, en het voorkomt een tweede kopie van de
 * standaard in de database die stil uiteen kan lopen met wat de app bedoelt.
 */
export async function PUT(request: Request) {
  const body = await leesBody(request)
  if (!body) return NextResponse.json({ ok: false, error: 'ongeldige body' }, { status: 400 })

  const db = planDb()
  const tijd = nu()

  if (Object.hasOwn(body, 'instellingen')) {
    const gekeurd = keurInstellingen(body.instellingen)
    if (!gekeurd.ok) return NextResponse.json({ ok: false, error: gekeurd.reden }, { status: 400 })
    schrijfInstellingen(db, gekeurd.waarde, tijd)
  }

  if (Object.hasOwn(body, 'aannames')) {
    const rauw = body.aannames
    if (rauw === null) herstelAannames(db)
    else if (typeof rauw === 'string' && rauw.trim() !== '') schrijfAannames(db, rauw.trim(), tijd)
    else return NextResponse.json({ ok: false, error: 'aannames is tekst of null' }, { status: 400 })
  }

  if (!Object.hasOwn(body, 'instellingen') && !Object.hasOwn(body, 'aannames')) {
    return NextResponse.json({ ok: false, error: 'niets om te wijzigen' }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    instellingen: leesInstellingen(db),
    aannames: leesAannames(db),
    plan: leesPlan(db),
  })
}
