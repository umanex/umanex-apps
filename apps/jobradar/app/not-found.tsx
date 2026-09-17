import type { Metadata } from 'next'
import Link from 'next/link'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

// Next leest deze export ook hier: not-found.tsx wordt de page van `/_not-found`
// (next-app-loader in 15.5.25). Zonder eigen titel erfde een 404 de layouttitel 'JobRadar — umanex'.
export const metadata: Metadata = {
  title: 'Pagina niet gevonden — JobRadar',
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Pagina niet gevonden.</p>
      <Link href="/" className={cn('rounded-sm text-primary underline underline-offset-4', focusRing)}>
        Terug naar dashboard
      </Link>
    </main>
  )
}
