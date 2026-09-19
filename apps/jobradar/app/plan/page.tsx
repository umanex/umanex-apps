import type { Metadata } from 'next'
import { PlanClient } from '@/components/plan/PlanClient'
import { leesPlan } from '@/lib/plan/lees'
import { planDb, vandaag } from '@/lib/plan/server'

export const dynamic = 'force-dynamic'

// Eigen titel: zonder titelwissel kondigt Next een navigatie naar deze route niet aan.
export const metadata: Metadata = {
  title: 'Bedrijfsplan — JobRadar',
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ actie?: string }>
}) {
  const { actie } = await searchParams
  const plan = leesPlan(planDb())

  return (
    <main className="w-full mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PlanClient plan={plan} vandaag={vandaag()} initieleActie={actie ?? null} />
    </main>
  )
}
