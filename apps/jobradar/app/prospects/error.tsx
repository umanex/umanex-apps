'use client'

import { ProspectFout } from '@/components/feedback/ProspectFout'

/**
 * Vangt een gefaalde query op de server-component. Zonder dit bestand toont Next zijn eigen
 * generieke foutscherm en weet je niet of de database weg is of het schema niet klopt.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ProspectFout melding={error.message} onOpnieuw={reset} />
    </main>
  )
}
