import Link from 'next/link'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

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
