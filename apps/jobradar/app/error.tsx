'use client'

import { Button } from '@umanex/ui/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Er ging iets mis</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {/* Was een met de hand nagebouwde Button: zelfde kleuren, maar zonder de
          focus-ring. De component nemen lost beide op in plaats van er één klasse
          bij te plakken. */}
      <Button onClick={reset}>Opnieuw proberen</Button>
    </main>
  )
}
