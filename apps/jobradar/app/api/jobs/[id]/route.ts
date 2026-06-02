import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import type { ItemStatus } from '@/lib/db/schema'

const VALID_STATUSES: ItemStatus[] = ['new', 'saved', 'dismissed', 'contacted']

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 })
  }

  const body = await request.json()
  const status = body?.status as ItemStatus
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 })
  }

  await db.update(schema.jobs).set({ jobStatus: status }).where(eq(schema.jobs.id, id))
  return NextResponse.json({ ok: true })
}
