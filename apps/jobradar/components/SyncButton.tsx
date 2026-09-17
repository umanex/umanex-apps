'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

type SyncButtonProps = {
  /** Zet het dashboard op het tabblad van die soort, met "Alleen nieuw bij de laatste sync" aan. */
  onToonNieuwe: (soort: 'jobs' | 'leads') => void
}

type Resultaat = { vacatures: number; leads: number }

const meervoud = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`

export function SyncButton({ onToonNieuwe }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [resultaat, setResultaat] = useState<Resultaat | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [seconden, setSeconden] = useState(0)
  // Altijd gerenderd, ook leeg: een regio die pas met zijn inhoud verschijnt, wordt niet
  // betrouwbaar voorgelezen. Het resultaat stond hier eerder in een span zonder rol.
  const [melding, setMelding] = useState('')
  const router = useRouter()

  // Een sync duurt ~12 s door de Adzuna-pauzes; zonder teller is "Bezig…" niet te onderscheiden
  // van een knop die vastzit.
  useEffect(() => {
    if (!syncing) return
    const start = Date.now()
    const t = setInterval(() => setSeconden(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(t)
  }, [syncing])

  async function handleSync() {
    // `aria-disabled` en niet `disabled`: een knop die de focus heeft en disabled wordt, geeft die
    // focus af aan `body` — voor de hele duur van de sync (zie StatusActies).
    if (syncing) return
    setSyncing(true)
    setSeconden(0)
    setResultaat(null)
    setFout(null)
    setWarnings([])
    setMelding('Sync gestart')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json().catch(() => null)

      // Zonder deze tak toonde de knop letterlijk "+undefined vacatures" bij een 500: de
      // foutbody draagt geen tellingen. Het dashboard eronder filtert bovendien op
      // status='done', dus het bleef de vórige geslaagde run tonen — een mislukte sync was
      // nergens te zien.
      if (!res.ok || !data?.ok) {
        setFout(data?.error ? `Sync mislukt: ${data.error}` : 'Sync mislukt')
        setMelding('')
        return
      }

      // Bronwaarschuwingen (afkapping, weggelaten regio's) zijn geen fout, maar wel het
      // verschil tussen "alles opgehaald" en "een deel opgehaald". Een uitgevallen bron
      // hoort er expliciet bij: de sync als geheel slaagt dan nog steeds, en "+0 vacatures"
      // leest anders als "er was niets nieuws" in plaats van "Adzuna antwoordde niet".
      const statussen = Object.entries(data.sourceStatuses ?? {}) as Array<
        [string, { ok?: boolean; error?: string; warnings?: string[] } | null]
      >
      const waarschuwingen = [
        ...statussen
          .filter(([, s]) => s && s.ok === false)
          .map(([naam, s]) => `bron "${naam}" is uitgevallen: ${s?.error ?? 'onbekende fout'}`),
        ...statussen.flatMap(([, s]) => (Array.isArray(s?.warnings) ? s.warnings : [])),
      ]
      const nieuw: Resultaat = { vacatures: data.jobsAdded, leads: data.leadsAdded }
      setResultaat(nieuw)
      setWarnings(waarschuwingen)
      // "Sync gestart" staat er nog, dus deze tekst is altijd een wissel — ook bij twee keer
      // hetzelfde resultaat na elkaar.
      setMelding(
        `Sync klaar: ${meervoud(nieuw.vacatures, 'vacature', 'vacatures')} en ${meervoud(nieuw.leads, 'lead', 'leads')} erbij` +
          (waarschuwingen.length > 0 ? `, ${meervoud(waarschuwingen.length, 'waarschuwing', 'waarschuwingen')}` : '')
      )
      router.refresh()
    } catch {
      setFout('Sync mislukt — geen antwoord van de server')
      setMelding('')
    } finally {
      setSyncing(false)
    }
  }

  // Een link-achtige knop en geen <Link href="/?status=new">: de filterstand leeft in het dashboard,
  // en een navigatie naar dezelfde pagina hermount het niet (de segment-sleutel draagt geen query).
  const nieuwKnop = 'rounded-sm text-foreground underline underline-offset-2 hover:no-underline'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSync}
          aria-disabled={syncing}
          size="sm"
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          data-sync-knop
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
          {syncing ? 'Bezig…' : 'Sync nu'}
        </Button>
        {syncing ? (
          <span className="text-sm tabular-nums text-muted-foreground" data-sync-duur>
            {seconden} s
          </span>
        ) : fout ? (
          <span role="alert" className="text-sm text-destructive" data-sync-resultaat="fout">
            {fout}
          </span>
        ) : resultaat ? (
          <span className="text-sm text-muted-foreground" data-sync-resultaat="ok">
            {resultaat.vacatures > 0 ? (
              <button
                type="button"
                onClick={() => onToonNieuwe('jobs')}
                aria-label={`+${meervoud(resultaat.vacatures, 'vacature', 'vacatures')}, toon alleen de nieuwe`}
                className={cn(nieuwKnop, focusRing)}
                data-sync-nieuw="jobs"
              >
                +{meervoud(resultaat.vacatures, 'vacature', 'vacatures')}
              </button>
            ) : (
              '+0 vacatures'
            )}
            {', '}
            {resultaat.leads > 0 ? (
              <button
                type="button"
                onClick={() => onToonNieuwe('leads')}
                aria-label={`+${meervoud(resultaat.leads, 'lead', 'leads')}, toon alleen de nieuwe`}
                className={cn(nieuwKnop, focusRing)}
                data-sync-nieuw="leads"
              >
                +{meervoud(resultaat.leads, 'lead', 'leads')}
              </button>
            ) : (
              '+0 leads'
            )}
          </span>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only" data-sync-melding>
        {melding}
      </p>
      {warnings.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
