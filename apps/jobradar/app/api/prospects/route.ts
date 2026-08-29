import { NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { haalProspects } from '@/lib/kbo/spiegel'
import { ALL_REGIONS, type RegionCode } from '@/lib/regions'
import type { ItemStatus } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

/**
 * De prospect-lijst, per pagina van 60.
 *
 * Waarom een route en geen server component: de lijst telt 14.613 rijen en het tabblad
 * filtert en bladert client-side aangestuurd. Alles vooraf meesturen zou precies de
 * afkapping-zonder-melding opleveren die deze app elders juist vermijdt.
 *
 * De statussen komen uit `jobradar.db`, de rijen uit `kbo.db`. Twee databases, één antwoord:
 * de spiegel is wegwerpbaar en mag niets dragen wat jij beslist hebt.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)

  const gevraagd = url.searchParams.getAll('regio').filter((r): r is RegionCode =>
    (ALL_REGIONS as string[]).includes(r)
  )
  const filter = {
    regions: gevraagd.length ? gevraagd : ALL_REGIONS,
    zoek: url.searchParams.get('zoek') ?? undefined,
    // Standaard aan: zonder deze zeef is 80% van de lijst zonder personeel.
    alleenWerkgevers: url.searchParams.get('werkgevers') !== '0',
    pagina: Number(url.searchParams.get('pagina') ?? '1'),
  }

  const vandaag = new Date().toISOString().slice(0, 10)
  const resultaat = haalProspects(filter, vandaag)

  const nummers = resultaat.rijen.map((r) => r.nummer)
  const statussen = new Map<string, ItemStatus>()
  if (nummers.length) {
    const db = getDb()
    const rijen = await db
      .select()
      .from(schema.prospectStatus)
      .where(inArray(schema.prospectStatus.enterpriseNumber, nummers))
    for (const r of rijen) statussen.set(r.enterpriseNumber, r.status as ItemStatus)
  }

  return NextResponse.json({
    ok: true,
    staat: resultaat.staat,
    totaal: resultaat.totaal,
    pagina: resultaat.pagina,
    paginas: resultaat.paginas,
    prospects: resultaat.rijen.map((r) => ({
      ...r,
      status: statussen.get(r.nummer) ?? 'new',
    })),
  })
}
