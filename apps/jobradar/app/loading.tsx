'use client'

import { useEffect, useState } from 'react'

/**
 * De laadtoestand van het dashboard.
 *
 * Zonder dit bleef bij een client-navigatie naar `/` (Terug naar het dashboard) de vorige pagina
 * zonder enig teken staan tot de force-dynamic render er was: alle vacatures, leads en koppelingen.
 *
 * Tekst en geen skeleton, zoals `plan/loading.tsx`: er is nog geen skeleton-primitive. Anders dan
 * daar komt de melding pas ná de mount in de live-regio — een regio die al mét inhoud verschijnt,
 * wordt niet betrouwbaar voorgelezen. De zichtbare tekst staat er meteen, ook vóór hydratatie.
 */
export default function DashboardLaden() {
  const [melding, setMelding] = useState('')
  useEffect(() => setMelding('Dashboard laden…'), [])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">JobRadar</h1>
        <p aria-hidden className="text-sm text-muted-foreground" data-laden>
          Dashboard laden…
        </p>
        <p aria-live="polite" className="sr-only" data-laden-melding>
          {melding}
        </p>
      </div>
    </main>
  )
}
