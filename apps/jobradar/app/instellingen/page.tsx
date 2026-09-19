import type { Metadata } from 'next'
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
        <h1 className="text-xl font-semibold tracking-tight">Instellingen</h1>

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
