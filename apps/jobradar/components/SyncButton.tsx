'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    setLastResult(null)
    setFailed(false)
    setWarnings([])
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json().catch(() => null)

      // Zonder deze tak toonde de knop letterlijk "+undefined vacatures" bij een 500: de
      // foutbody draagt geen tellingen. Het dashboard eronder filtert bovendien op
      // status='done', dus het bleef de vórige geslaagde run tonen — een mislukte sync was
      // nergens te zien.
      if (!res.ok || !data?.ok) {
        setFailed(true)
        setLastResult(data?.error ? `Sync mislukt: ${data.error}` : 'Sync mislukt')
        return
      }

      setLastResult(`+${data.jobsAdded} vacatures, +${data.leadsAdded} leads`)
      // Bronwaarschuwingen (afkapping, weggelaten regio's) zijn geen fout, maar wel het
      // verschil tussen "alles opgehaald" en "een deel opgehaald".
      setWarnings(
        Object.values(data.sourceStatuses ?? {}).flatMap((s) =>
          s && typeof s === 'object' && Array.isArray((s as { warnings?: string[] }).warnings)
            ? ((s as { warnings: string[] }).warnings)
            : []
        )
      )
      router.refresh()
    } catch {
      setFailed(true)
      setLastResult('Sync mislukt — geen antwoord van de server')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Button onClick={handleSync} disabled={syncing} size="sm">
          <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
          {syncing ? 'Bezig…' : 'Sync nu'}
        </Button>
        {lastResult && (
          <span
            role={failed ? 'alert' : undefined}
            className={cn('text-sm', failed ? 'text-destructive' : 'text-muted-foreground')}
          >
            {lastResult}
          </span>
        )}
      </div>
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
