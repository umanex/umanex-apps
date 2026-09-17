import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { getDb } from '@/lib/db'
import { leesZoekopdracht } from '@/lib/sync/settings-store'
import { standaardZoekopdracht, isStandaard } from '@/lib/settings'
import { SearchSettingsForm } from '@/components/SearchSettingsForm'
import { PlanInstellingenForm } from '@/components/plan/PlanInstellingenForm'
import { leesInstellingen } from '@/lib/plan/instellingen'
import { planDb } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

// Eigen titel: zonder titelwissel kondigt Next een navigatie naar deze route niet aan.
export const metadata: Metadata = {
  title: 'Instellingen — JobRadar',
}

export default async function InstellingenPage() {
  const zoek = await leesZoekopdracht(getDb())
  const planInstellingen = leesInstellingen(planDb())

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Link
            href="/"
            className={cn(
              'inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
              focusRing
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar het dashboard
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Instellingen</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Zoekopdracht</h2>
          <p className="text-sm text-muted-foreground">
            Waarop de sync bij Adzuna zoekt. Wijzigingen werken door bij de volgende sync — de al opgehaalde
            vacatures blijven staan tot ze uit het venster van 30 dagen lopen.
          </p>
          <SearchSettingsForm
            begin={zoek}
            standaard={standaardZoekopdracht()}
            beginIsStandaard={isStandaard(zoek)}
          />
        </section>

        <section id="bedrijfsplan" className="space-y-3 border-t pt-6">
          <h2 className="text-base font-semibold">Bedrijfsplan</h2>
          <p className="text-sm text-muted-foreground">
            De beoogde start en hoe het plan inzet en focus weergeeft.
          </p>
          <PlanInstellingenForm begin={planInstellingen} />
        </section>
      </div>
    </main>
  )
}
