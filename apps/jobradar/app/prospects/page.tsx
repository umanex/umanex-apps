import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import type { Classificatie } from '@/lib/db/schema'
import { ProspectLabeler } from '@/components/ProspectLabeler'
import type { Prospect } from '@/lib/prospects'

export const dynamic = 'force-dynamic'

/**
 * Alleen bedrijven uit de KBO-bron. De 26 leads die uit vacaturedata zijn afgeleid horen niet in
 * deze wachtrij: die zijn al een lead, niet een kandidaat die nog geclassificeerd moet worden.
 */
export default async function ProspectsPage() {
  const db = getDb()
  const rijen = await db.query.companies.findMany({
    where: eq(schema.companies.source, 'kbo'),
    orderBy: (c, { asc }) => [asc(c.companyName)],
  })

  const prospects: Prospect[] = rijen.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    postcode: r.postcode,
    region: r.region,
    naceCode: r.naceCode,
    url: r.url,
    werknemers: r.werknemers,
    classificatie: (r.classificatie as Classificatie | null) ?? null,
    geclassificeerdOp: r.geclassificeerdOp,
    // Kolom draagt JSON. Een kapotte waarde mag het scherm niet slopen — dan verlies je de hele
    // wachtrij door één rij.
    signals: veiligeSignalen(r.signals),
  }))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Prospects labelen</h1>
        <p className="text-sm text-muted-foreground">
          Productbedrijf of dienstverlener? Beoordeel op de website, één bedrijf per scherm.
        </p>
      </header>
      <ProspectLabeler initieel={prospects} />
    </main>
  )
}

function veiligeSignalen(ruw: string): string[] {
  try {
    const p: unknown = JSON.parse(ruw)
    return Array.isArray(p) ? p.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}
