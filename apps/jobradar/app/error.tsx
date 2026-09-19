'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

export default function Foutpagina({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [bezig, startTransition] = useTransition()

  const opnieuw = () => {
    // `aria-disabled` en een guard, niet `disabled`: zo houdt de knop zijn focus (zie StatusActies).
    if (bezig) return
    // `reset()` alleen maakt de boundary leeg en rendert dezelfde payload opnieuw
    // (`error-boundary.js` in next 15.5.25). Elke page.tsx leest de database, dus een fout uit de
    // server-render kwam gewoon terug en de knop deed zichtbaar niets. `router.refresh()` haalt de
    // render opnieuw op; in één transitie, zodat de boundary pas leegmaakt met die nieuwe render.
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Er ging iets mis</h1>
      {/* Een zin voor mensen. `error.message` is in productie bij een server-renderfout Next's
          Engelse vervangtekst, en in dev een SQLite-melding — bruikbaar om te melden, niet om te
          lezen. Die staat ingeklapt hieronder. */}
      <p className="text-sm text-muted-foreground" data-fout-uitleg>
        Deze pagina kon niet geladen worden. Probeer het opnieuw, of ga terug naar het dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Was een met de hand nagebouwde Button: zelfde kleuren, maar zonder de
            focus-ring. De component nemen lost beide op in plaats van er één klasse
            bij te plakken. */}
        <Button
          onClick={opnieuw}
          aria-disabled={bezig}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          data-fout-opnieuw
        >
          {bezig ? 'Bezig…' : 'Opnieuw proberen'}
        </Button>
        {/* Opnieuw proberen helpt niet wanneer de fout blijft, dus deze link staat op elke route.
            Een gewone <a> en geen next/link: die leegt de boundary alleen bij een ándere pathname
            (`getDerivedStateFromProps` in `error-boundary.js`, 15.5.25), en deed op `/` dus niets —
            ook niet op `/?tab=…&zoek=…`, waar een fout uit de URL-stand zonder volledige herlading
            geen uitweg had. `asChild` rendert de <a> zelf met de knopklassen (Slot, sinds 2026-09-16). */}
        <Button asChild variant="outline">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- bewust een volledige herlading, zie hierboven */}
          <a href="/" data-fout-naar-huis>
            Terug naar het dashboard
          </a>
        </Button>
      </div>
      <details className="max-w-xl text-left text-xs text-muted-foreground" data-fout-details>
        <summary className={cn('cursor-pointer rounded-sm text-center', focusRing)}>Technische melding</summary>
        <p className="mt-2 whitespace-pre-wrap break-words font-mono">{error.message}</p>
        {error.digest && <p className="mt-1 font-mono">Referentie: {error.digest}</p>}
      </details>
    </main>
  )
}
