'use client'

import { useEffect, useState } from 'react'

/**
 * De laadtoestand van het dashboard.
 *
 * Zonder dit bleef bij een client-navigatie naar `/` (sinds 2026-09-19: "Radar" in de balk, en
 * vanaf de foutpagina de eigen uitweg van `error.tsx`) de vorige pagina
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
    <main className="w-full mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        {/* Onzichtbaar, net als op het geladen dashboard: de balk erboven staat er al tijdens het
            laden, dus het wordmerk hoeft hier niet nog eens. De kop blijft bestaan zodat de
            laadtoestand dezelfde kopstructuur heeft als de pagina die hij vervangt. */}
        <h1 className="sr-only">Radar</h1>
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
