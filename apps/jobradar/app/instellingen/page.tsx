import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDb } from '@/lib/db'
import { leesZoekopdracht } from '@/lib/sync/settings-store'
import { standaardZoekopdracht, isStandaard } from '@/lib/settings'
import { SearchSettingsForm } from '@/components/SearchSettingsForm'

export const dynamic = 'force-dynamic'

export default async function InstellingenPage() {
  const zoek = await leesZoekopdracht(getDb())

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar het dashboard
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Zoekinstellingen</h1>
          <p className="text-sm text-muted-foreground">
            Waarop de sync bij Adzuna zoekt. Wijzigingen werken door bij de volgende sync — de al opgehaalde
            vacatures blijven staan tot ze uit het venster van 30 dagen lopen.
          </p>
        </div>

        <SearchSettingsForm
          begin={zoek}
          standaard={standaardZoekopdracht()}
          beginIsStandaard={isStandaard(zoek)}
        />
      </div>
    </main>
  )
}
