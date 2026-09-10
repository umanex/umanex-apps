import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import type { ItemStatus } from '@/lib/db/schema'

const GELDIGE_STATUSSEN: ItemStatus[] = ['new', 'saved', 'dismissed', 'contacted']

/**
 * Status van één prospect. De sleutel is het ondernemingsnummer zonder punten — dezelfde
 * vorm die de spiegel bewaart, zodat er nergens een tweede notatie ontstaat.
 */
export async function PATCH(request: Request, { params }: { params: { nr: string } }) {
  const nummer = params.nr
  if (!/^\d{10}$/.test(nummer)) {
    return NextResponse.json({ ok: false, error: 'Invalid enterprise number' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const status = body?.status as ItemStatus
  if (!GELDIGE_STATUSSEN.includes(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 })
  }

  const db = getDb()
  await db
    .insert(schema.prospectStatus)
    .values({ enterpriseNumber: nummer, status, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.prospectStatus.enterpriseNumber,
      set: { status, updatedAt: new Date().toISOString() },
    })

  return NextResponse.json({ ok: true })
}
