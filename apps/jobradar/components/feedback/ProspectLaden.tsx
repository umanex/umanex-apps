import { Loader2 } from 'lucide-react'

/** Laadtoestand van het labelscherm zelf. Kort bij een lokale database, maar niet nul. */
export function ProspectLaden() {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <p className="text-sm">Kandidaten laden…</p>
    </div>
  )
}
