'use client'

import { useEffect, useRef, useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { PlanStatusPill } from './PlanStatusPill'
import {
  STATUS_LABEL_INLINE,
  type ActieStatus,
  type ActieWeergave,
  type Verzoekuitkomst,
} from '@/lib/plan/types'

type ActieRijProps = {
  actie: ActieWeergave
  /** Welke bediening deze rij krijgt; de lijst waarin hij staat bepaalt dat. */
  variant: 'bezig' | 'beschikbaar' | 'geblokkeerd' | 'lijst' | 'uitgesteld'
  vandaag: string
  bezig: boolean
  onOpen: (key: string) => void
  onStatus: (key: string, status: ActieStatus) => void
  /**
   * Bewaart de volgende stap en geeft de uitkomst terug, zodat het veld pas sluit als het antwoord
   * er is. Geen `void`-variant: een handler zonder uitkomst sloot het veld vóór het antwoord.
   *
   * `versieConflict`: opnieuw bewaren kan dan niet slagen, want de versie komt uit het plan dat
   * op het scherm staat — en dat is juist het verouderde. De rij biedt dan Herlaad plan aan.
   */
  onVolgendeStap?: (
    key: string,
    tekst: string
  ) => Promise<Verzoekuitkomst & { versieConflict: boolean }>
  /** Haalt het plan opnieuw op na een versieconflict. De fout toont de rij zelf, bij het veld. */
  onHerlaad?: () => Promise<Verzoekuitkomst>
}

/**
 * Eén actie als rij.
 *
 * De titel is een `button` en geen kop: in een lijst van 22 zou elke titel een `h4` worden en
 * de kopstructuur van de pagina vullen met ruis waar een schermlezer doorheen moet. De rij is
 * een item in een lijst; de sectie eromheen draagt de kop.
 *
 * De rij draagt hoogstens één handeling, afgeleid uit de uitvoerbaarheid: Start op een
 * beschikbare actie, Afronden… op een lopende. Afronden vraagt bewijs, dus die knop opent het
 * paneel op de afrond-sectie in plaats van iets te versturen.
 */
export function ActieRij({
  actie,
  variant,
  vandaag,
  bezig,
  onOpen,
  onStatus,
  onVolgendeStap,
  onHerlaad,
}: ActieRijProps) {
  const [stapBewerken, setStapBewerken] = useState(false)
  const [stap, setStap] = useState(actie.volgendeStap ?? '')
  const [stapFout, setStapFout] = useState<string | null>(null)
  /** Na een versieconflict. Blijft staan na een mislukte herlading, net als in het actiepaneel. */
  const [herlaadbaar, setHerlaadbaar] = useState(false)
  const [herlaadt, setHerlaadt] = useState(false)
  const [stapMelding, setStapMelding] = useState('')
  const bewerkRef = useRef<HTMLDivElement>(null)
  const stapFoutRef = useRef<HTMLParagraphElement>(null)
  const bewaarRef = useRef<HTMLButtonElement>(null)
  const wijzigRef = useRef<HTMLButtonElement>(null)
  /** Na een geslaagde Bewaar: de focus naar Wijzig, want het veld en zijn knoppen verdwijnen. */
  const focusOpWijzig = useRef(false)

  useEffect(() => {
    if (stapBewerken || !focusOpWijzig.current) return
    focusOpWijzig.current = false
    wijzigRef.current?.focus()
  }, [stapBewerken])

  const bewaarStap = async () => {
    // `aria-disabled` en een guard in plaats van `disabled`: de knop houdt zijn focus tijdens het
    // verzoek, in plaats van hem af te geven aan `body`.
    if (bezig || herlaadt || !onVolgendeStap) return
    const hadFocus = Boolean(bewerkRef.current?.contains(document.activeElement))
    setStapFout(null)
    setHerlaadbaar(false)
    setStapMelding('')
    const uitkomst = await onVolgendeStap(actie.key, stap)
    // Het veld sluit pas na een geslaagd antwoord. Eerst sloot het meteen: bij een fout toonde de
    // rij de oude stap, stond de getypte tekst onzichtbaar in state, en kwam de melding in de
    // banner bovenaan de pagina terecht.
    if (!uitkomst.ok) {
      setStapFout(uitkomst.fout ?? 'Volgende stap niet bewaard.')
      setHerlaadbaar(uitkomst.versieConflict)
      return
    }
    focusOpWijzig.current = hadFocus
    setStapBewerken(false)
  }

  /**
   * Herladen vanuit de fout bij het veld. Het veld blijft open met wat je typte; alleen de versie
   * waartegen je bewaart is daarna de actuele. De knop staat ín de fout en verdwijnt met hem, dus
   * wie hem met het toetsenbord indrukte, gaat naar Bewaar — de handeling die nu kan slagen.
   */
  const herlaadPlan = async () => {
    if (bezig || herlaadt || !onHerlaad) return
    const hadFocus = Boolean(stapFoutRef.current?.contains(document.activeElement))
    setHerlaadt(true)
    setStapMelding('')
    const uitkomst = await onHerlaad()
    setHerlaadt(false)
    if (!uitkomst.ok) {
      setStapFout(uitkomst.fout ?? 'Plan niet herladen.')
      return
    }
    setStapFout(null)
    setHerlaadbaar(false)
    setStapMelding(`Plan herladen. Je volgende stap voor ${actie.key} staat er nog: bewaar opnieuw.`)
    if (hadFocus) bewaarRef.current?.focus()
  }

  const herbekijkVerlopen =
    actie.status === 'uitgesteld' && actie.herbekijkOp !== null && actie.herbekijkOp <= vandaag

  return (
    <li data-actie={actie.key} className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">{actie.key}</span>
            <button
              type="button"
              onClick={() => onOpen(actie.key)}
              className={cn(
                'rounded-sm text-left text-sm font-semibold underline-offset-2 hover:underline',
                focusRing
              )}
            >
              {actie.titel}
            </button>
            {actie.signalen.map((s) => (
              <Badge
                key={`${s.soort}-${s.key}`}
                variant={s.soort === 'afhankelijkheid_vervallen' ? 'destructive' : 'warning'}
                className="text-2xs font-normal"
              >
                {s.tekst}
              </Badge>
            ))}
            {herbekijkVerlopen && (
              <Badge variant="warning" className="text-2xs">
                herbekijkdatum verstreken
              </Badge>
            )}
          </div>

          {variant === 'bezig' && stapBewerken ? (
            <div ref={bewerkRef} className="mt-2 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  aria-label={`Volgende stap van ${actie.key}`}
                  value={stap}
                  maxLength={300}
                  disabled={bezig}
                  onChange={(e) => setStap(e.target.value)}
                  className={cn(
                    'min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50',
                    focusRing
                  )}
                />
                <Button
                  ref={bewaarRef}
                  size="sm"
                  aria-disabled={bezig || herlaadt}
                  onClick={() => void bewaarStap()}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  Bewaar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bezig}
                  onClick={() => {
                    setStap(actie.volgendeStap ?? '')
                    setStapFout(null)
                    setHerlaadbaar(false)
                    setStapMelding('')
                    setStapBewerken(false)
                  }}
                >
                  Annuleer
                </Button>
              </div>
              {stapFout && (
                <p
                  ref={stapFoutRef}
                  role="alert"
                  className="flex flex-wrap items-center gap-2 text-xs text-destructive"
                  data-stap-fout
                >
                  {stapFout}
                  {herlaadbaar && onHerlaad && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-disabled={bezig || herlaadt}
                      onClick={() => void herlaadPlan()}
                      className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                    >
                      Herlaad plan
                    </Button>
                  )}
                </p>
              )}
              {/* Gerenderd zolang het veld open is, dus vóór er iets in komt: een live-regio die pas
                  met zijn inhoud verschijnt, wordt niet betrouwbaar voorgelezen. */}
              <p aria-live="polite" className="sr-only" data-stap-melding>
                {stapMelding}
              </p>
            </div>
          ) : actie.volgendeStap !== null || variant === 'bezig' ? (
            // Alleen een lopende actie meldt dat er geen volgende stap is: daar is het een
            // opdracht ("bepaal hem"). Op 22 niet-gestarte rijen was dezelfde zin ruis die las
            // als achterstand — gemeten in de critique van 2026-09-17.
            <p className="mt-1 text-sm">
              {actie.volgendeStap ?? (
                <span className="text-muted-foreground">Geen volgende stap</span>
              )}
              {/* Zonder handler geen Wijzig: een veld dat niet kan bewaren, zou nooit meer sluiten. */}
              {variant === 'bezig' && onVolgendeStap && (
                <button
                  ref={wijzigRef}
                  type="button"
                  onClick={() => {
                    // De tekst bij het openen uit de actuele actie, niet uit de kopie van bij het mounten:
                    // wie de stap intussen in het paneel wijzigde of het plan herlaadde, zag anders de oude
                    // tekst — en Bewaar overschreef dan de nieuwere stap, want de versie klopte wél.
                    // Alleen hier: zolang het veld open is, blijft wat je typte staan (ook na Herlaad plan).
                    setStap(actie.volgendeStap ?? '')
                    setStapBewerken(true)
                  }}
                  className={cn(
                    'ml-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                    focusRing
                  )}
                >
                  Wijzig
                </button>
              )}
            </p>
          ) : null}

          {actie.blokkade.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Waarop ${actie.key} wacht`}>
              {actie.blokkade.map((b) => (
                <li key={b.key}>
                  {/* Met de titel: "wacht op A05" vroeg je te onthouden wat A05 was. */}
                  <Badge variant={b.hard ? 'destructive' : 'outline'} className="text-2xs font-normal">
                    {b.hard
                      ? `${b.key} · ${b.titel} is vervallen — verwijder of vervang de afhankelijkheid`
                      : `wacht op ${b.key} · ${b.titel} (${STATUS_LABEL_INLINE[b.status]})`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {variant === 'uitgesteld' && actie.wachtreden && (
            <p className="mt-1 text-sm text-muted-foreground">Aanleiding: {actie.wachtreden}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {actie.inzet.uren !== null && <span className="tabular-nums">{actie.inzet.tekst}</span>}
          {/* In het overzicht zegt de groepskop de status al; in de Acties-tab, gegroepeerd
              per prioriteit, niet. */}
          {variant === 'lijst' && <PlanStatusPill status={actie.status as ActieStatus} />}
          {/* Eén handeling, en alleen de handeling die hier kán. De status-select stond op elke
              rij, ook op een geblokkeerde, en maakte van "start" een optie in een randloze
              dropdown. Status kiezen gebeurt nu in het paneel. */}
          {actie.uitvoerbaarheid === 'beschikbaar' && (
            // `aria-disabled` en niet `disabled`: een Start die op de focusregel strandt, opent het
            // paneel, en dat geeft bij het sluiten de focus terug aan de knop die het opende. Een
            // `disabled` knop had die focus op dat moment al aan `body` afgegeven.
            <Button
              size="sm"
              variant="outline"
              aria-disabled={bezig}
              aria-label={`Start ${actie.key}`}
              onClick={() => {
                if (!bezig) onStatus(actie.key, 'bezig')
              }}
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              Start
            </Button>
          )}
          {actie.uitvoerbaarheid === 'actief' && (
            <Button
              size="sm"
              variant="outline"
              disabled={bezig}
              aria-haspopup="dialog"
              aria-label={`Afronden ${actie.key}`}
              onClick={() => onStatus(actie.key, 'gereed')}
            >
              Afronden…
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
