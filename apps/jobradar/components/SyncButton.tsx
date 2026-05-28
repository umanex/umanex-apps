'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    setLastResult(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      setLastResult(
        `+${data.jobsAdded} vacatures, +${data.leadsAdded} leads`
      )
      router.refresh()
    } catch {
      setLastResult('Sync mislukt')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleSync} disabled={syncing} size="sm">
        <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
        {syncing ? 'Bezig…' : 'Sync nu'}
      </Button>
      {lastResult && (
        <span className="text-sm text-muted-foreground">{lastResult}</span>
      )}
    </div>
  )
}
