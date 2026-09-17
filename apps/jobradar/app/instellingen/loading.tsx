'use client'

import { useEffect, useState } from 'react'

/**
 * De laadtoestand van de instellingen.
 *
 * De render leest de zoekopdracht en opent het plan (`planDb()` zaait bij het eerste bezoek); zonder
 * dit bleef de vorige pagina tot dan zonder teken staan. Zelfde vorm als `app/loading.tsx`: de
 * zichtbare tekst meteen, de live-regio pas na de mount gevuld.
 */
export default function InstellingenLaden() {
  const [melding, setMelding] = useState('')
  useEffect(() => setMelding('Instellingen laden…'), [])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Instellingen</h1>
        <p aria-hidden className="text-sm text-muted-foreground" data-laden>
          Instellingen laden…
        </p>
        <p aria-live="polite" className="sr-only" data-laden-melding>
          {melding}
        </p>
      </div>
    </main>
  )
}
