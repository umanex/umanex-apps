import { CheckCircle2, Inbox } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import type { Voortgang } from '@/lib/prospects'

type Props = {
  voortgang: Voortgang
  /** Aanwezig wanneer er nog een twijfelstapel ligt om aan te beginnen. */
  onNaarTwijfel?: () => void
  /** Aanwezig wanneer de leegte uit een filter komt in plaats van uit voltooiing. */
  doorFilter?: boolean
  onFilterWissen?: () => void
}

/**
 * Lege toestand, en er zijn er twee die niet op elkaar mogen lijken: alles beoordeeld, of het
 * filter levert niets op. Dat verschil bepaalt wat je nu moet doen, dus het staat in de tekst
 * én in het icoon.
 */
export function ProspectLeeg({ voortgang, onNaarTwijfel, doorFilter, onFilterWissen }: Props) {
  if (doorFilter) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-center">
        <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Dit filter levert geen bedrijven op.</p>
        <p className="text-xs text-muted-foreground">Er zijn er wel andere die nog wachten.</p>
        {onFilterWissen && (
          <Button type="button" variant="outline" size="sm" onClick={onFilterWissen}>
            Filter wissen
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-center">
      <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
      <p className="text-sm font-medium">
        Alles beoordeeld — {voortgang.afgehandeld.toLocaleString('nl-BE')} bedrijven.
      </p>
      {voortgang.twijfel > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            Er staan er nog {voortgang.twijfel.toLocaleString('nl-BE')} op twijfel.
          </p>
          {onNaarTwijfel && (
            <Button type="button" size="sm" onClick={onNaarTwijfel}>
              Twijfelstapel doornemen
            </Button>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Geen twijfelgevallen meer open.</p>
      )}
    </div>
  )
}
