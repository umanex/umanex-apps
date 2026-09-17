'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import type { ItemStatus } from '@/lib/db/schema'

type StatusActiesProps = {
  /** Het PATCH-pad van dít item. De aanroeper kent zijn eigen pad (zie de oude StatusDropdown). */
  endpoint: string
  status: ItemStatus
  /** Voor de toegankelijke naam: "Afwijzen Acme" in plaats van tien keer "Afwijzen". */
  naam: string
  onStatusChange: (status: ItemStatus) => void
}

/**
 * Compact: deze knoppen staan op elke kaart en in elke lage-scorerij. Op de `h-9` van `size="sm"`
 * wogen twee ghost-knoppen zwaarder dan "Opvolging" ernaast, en was een "compacte" rij 48 px hoog
 * (design-review 2026-09-17). Rol-utilities, geen nieuwe maat in de primitive — die vraag staat
 * open in de root-BACKLOG ("Compacte maat in @umanex/ui").
 */
const KNOP = 'h-7 px-2 text-xs aria-disabled:pointer-events-none aria-disabled:opacity-50'

/**
 * Bewaren en afwijzen als knoppen, in plaats van een randloze select van 16 px hoog.
 *
 * Triage is precies deze twee handelingen, honderden keren: een select vroeg er vier (openen,
 * kiezen, bevestigen, verder), en faalde stil — `try/finally` zonder `catch`, en bij een 500
 * sprong hij zonder melding terug (audit 2026-08-11, P2; critique 2026-09-17).
 *
 * Gecontacteerd staat hier niet als knop: dat zet de opvolging, waar het contactmoment en zijn
 * rechtsgrond bij horen. Hier alleen als tekst, zodat je het ziet.
 *
 * De status leeft ook lokaal, zodat de lijst naast de kaart — die geen eigen rij bijwerkt — na een
 * geslaagde wissel niet de oude status toont.
 */
export function StatusActies({ endpoint, status, naam, onStatusChange }: StatusActiesProps) {
  const [huidig, setHuidig] = useState(status)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const afwijzenRef = useRef<HTMLButtonElement>(null)
  const heropenRef = useRef<HTMLButtonElement>(null)
  /** Welke knop de focus krijgt na de wissel — de knop die ingedrukt werd, verdwijnt. */
  const focusNa = useRef<'afwijzen' | 'heropen' | null>(null)

  useEffect(() => setHuidig(status), [status])

  useEffect(() => {
    const doel = focusNa.current === 'heropen' ? heropenRef.current : focusNa.current === 'afwijzen' ? afwijzenRef.current : null
    focusNa.current = null
    doel?.focus()
  }, [huidig])

  const zet = async (nieuw: ItemStatus) => {
    // `aria-disabled` en niet `disabled`: een knop die de focus heeft en disabled wordt, geeft die
    // focus af aan `body` — bij elke toetsenbordactivatie opnieuw bovenaan de pagina beginnen.
    if (bezig) return
    // Alleen de focus verplaatsen als hij hier stond — een klik elders mag hem niet wegtrekken.
    const hadFocus = Boolean(rootRef.current?.contains(document.activeElement))
    setBezig(true)
    setFout(null)
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nieuw }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setFout(data?.error ? `Niet bewaard: ${data.error}` : `Niet bewaard (HTTP ${res.status}) — probeer opnieuw.`)
        return
      }
      // Wat de server opsloeg, niet wat we vroegen: heropenen kan "gecontacteerd" opleveren.
      const opgeslagen = (data?.status as ItemStatus | undefined) ?? nieuw
      // Alleen wanneer de ingedrukte knop verdwijnt: Afwijzen wordt Heropen en omgekeerd. Bewaar
      // blijft staan en houdt zijn focus.
      if (hadFocus && opgeslagen === 'dismissed') focusNa.current = 'heropen'
      else if (hadFocus && huidig === 'dismissed') focusNa.current = 'afwijzen'
      setHuidig(opgeslagen)
      onStatusChange(opgeslagen)
    } catch {
      setFout('Niet bewaard — geen antwoord van de server.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-1" data-status={huidig}>
      <div className="flex flex-wrap items-center gap-1">
        {huidig === 'dismissed' ? (
          <>
            <span className="px-1 text-xs text-muted-foreground">Afgewezen</span>
            <Button
              ref={heropenRef}
              variant="ghost"
              size="sm"
              aria-disabled={bezig}
              aria-label={`Heropen ${naam}`}
              onClick={() => zet('new')}
              className={cn(KNOP, 'text-muted-foreground')}
            >
              Heropen
            </Button>
          </>
        ) : (
          <>
            {huidig === 'contacted' ? (
              <span className="px-1 text-xs text-success">Gecontacteerd</span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                aria-disabled={bezig}
                aria-pressed={huidig === 'saved'}
                aria-label={`Bewaar ${naam}`}
                onClick={() => zet(huidig === 'saved' ? 'new' : 'saved')}
                className={cn(KNOP, huidig === 'saved' ? 'text-primary' : 'text-muted-foreground')}
              >
                {/* Het label blijft "Bewaar": een toggle wisselt van stand, niet van naam. De
                    stand zit in aria-pressed, en voor wie kijkt in de vorm van het icoon —
                    niet alleen in de kleur. */}
                <Bookmark aria-hidden className={huidig === 'saved' ? 'fill-current' : undefined} />
                Bewaar
              </Button>
            )}
            <Button
              ref={afwijzenRef}
              variant="ghost"
              size="sm"
              aria-disabled={bezig}
              aria-label={`Afwijzen ${naam}`}
              onClick={() => zet('dismissed')}
              className={cn(KNOP, 'text-muted-foreground')}
            >
              Afwijzen
            </Button>
          </>
        )}
      </div>
      {fout && (
        <p role="alert" className="text-xs text-destructive">
          {fout}
        </p>
      )}
    </div>
  )
}
