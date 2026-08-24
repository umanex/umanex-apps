import { AlertTriangle } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'

type Props = {
  melding: string
  onOpnieuw?: () => void
}

/**
 * Fouttoestand. Toont de melding letterlijk in plaats van een vriendelijke omschrijving: dit is
 * een werkinstrument voor één gebruiker die zelf de database beheert, en "er ging iets mis"
 * kost hem een kwartier dat de echte melding hem bespaart.
 */
export function ProspectFout({ melding, onOpnieuw }: Props) {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      <p className="text-sm font-medium">Het labelscherm kon de kandidaten niet laden.</p>
      <p className="max-w-lg break-words rounded border border-border bg-muted px-3 py-2 text-2xs text-muted-foreground">
        {melding}
      </p>
      {onOpnieuw && (
        <Button type="button" variant="outline" size="sm" onClick={onOpnieuw}>
          Opnieuw proberen
        </Button>
      )}
    </div>
  )
}
