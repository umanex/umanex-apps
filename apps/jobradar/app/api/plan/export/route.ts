import { NextResponse } from 'next/server'
import { exportBestandsnaam, exporteerJson, exporteerMarkdown } from '@/lib/plan/export'
import { leesPlan } from '@/lib/plan/lees'
import { planDb, vandaag } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

/**
 * Het plan als markdown of json, als download.
 *
 * Deterministisch op de exportdatum na, zodat twee exports met `diff` te vergelijken zijn.
 */
export async function GET(request: Request) {
  const formaat = new URL(request.url).searchParams.get('formaat') ?? 'md'
  if (formaat !== 'md' && formaat !== 'json') {
    return NextResponse.json({ ok: false, error: "formaat is 'md' of 'json'" }, { status: 400 })
  }

  const dag = vandaag()
  const plan = leesPlan(planDb())
  const bestandsnaam = exportBestandsnaam(formaat, dag)
  const headers = {
    'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
    'Cache-Control': 'no-store',
  }

  if (formaat === 'json') {
    return NextResponse.json(exporteerJson(plan, dag), { headers })
  }

  return new NextResponse(exporteerMarkdown(plan, dag), {
    headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
