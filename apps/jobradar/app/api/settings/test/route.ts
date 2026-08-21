import { NextResponse } from 'next/server'
import { telTreffers } from '@/lib/sources/adzuna'
import { ALL_REGIONS } from '@/lib/regions'
import { splitsTermen, normaliseerZinsnedes, valideerZoekopdracht } from '@/lib/settings'
import { ADZUNA_SEARCH } from '@/lib/config/profile'

/**
 * Telt wat een zoekopdracht zou opleveren, zonder iets op te halen of op te slaan.
 *
 * Dit bestaat omdat één woord ("product", dat ook op "productie" matchte) 743 van de 1222
 * treffers binnenhaalde, en dat pas zichtbaar werd door het te meten. Die meting hoort in de
 * app te zitten, niet in een wegwerpscript.
 *
 * Raakt de database niet: de route leest niets en schrijft niets.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Ongeldige JSON in het verzoek.' }, { status: 400 })
  }

  const b = (body ?? {}) as { termen?: unknown; zinsnedes?: unknown; uitsluiten?: unknown }
  const zoek = {
    termen: splitsTermen(Array.isArray(b.termen) ? b.termen.map(String) : []),
    zinsnedes: normaliseerZinsnedes(Array.isArray(b.zinsnedes) ? b.zinsnedes.map(String) : []),
    uitsluiten: splitsTermen(Array.isArray(b.uitsluiten) ? b.uitsluiten.map(String) : []),
  }

  const fout = valideerZoekopdracht(zoek)
  if (fout) return NextResponse.json({ ok: false, error: fout }, { status: 400 })

  // Serieel, niet parallel: drie tegelijk is precies het burst-patroon dat een 429 uitlokt,
  // en een telling heeft geen haast.
  const tellingen = []
  for (const regio of ALL_REGIONS) {
    tellingen.push(await telTreffers(regio, zoek))
  }

  return NextResponse.json({
    ok: true,
    tellingen,
    totaal: tellingen.reduce((n, t) => n + t.treffers, 0),
    plafond: ADZUNA_SEARCH.maxPaginas * ADZUNA_SEARCH.resultatenPerPagina,
  })
}
