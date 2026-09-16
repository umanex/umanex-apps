'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import type { SubjectType } from '@/lib/db/schema'

type PlanKoppelingProps = {
  type: SubjectType
  subjectKey: string
  /** Zodat de kaartlijst zijn merktekens kan bijwerken. */
  onChange?: () => void
}

type Antwoord = {
  acties: { key: string; titel: string; status: string }[]
  gekoppeld: string[]
}

/**
 * Aan welke voorbereidingsacties dit bedrijf hangt.
 *
 * Koppelen gebeurt hier en niet in het plan: je kiest een bedrijf terwijl je ernaar kijkt,
 * niet uit een lijst van 14.613 in een dropdown. Er ontstaat zo ook geen tweede registratie —
 * de koppeling is een verwijzing, de bedrijfsgegevens blijven waar ze staan.
 */
export function PlanKoppeling({ type, subjectKey, onChange }: PlanKoppelingProps) {
  const [data, setData] = useState<Antwoord | null>(null)
  const [laden, setLaden] = useState(true)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [keuze, setKeuze] = useState('')

  const haal = useCallback(async () => {
    setLaden(true)
    try {
      const res = await fetch(
        `/api/plan/koppelingen?type=${type}&key=${encodeURIComponent(subjectKey)}`
      )
      const j = (await res.json().catch(() => null)) as (Antwoord & { ok?: boolean }) | null
      if (!res.ok || !j?.ok) setFout('Kon de acties niet laden.')
      else setData({ acties: j.acties, gekoppeld: j.gekoppeld })
    } catch {
      setFout('Geen antwoord van de server.')
    } finally {
      setLaden(false)
    }
  }, [type, subjectKey])

  useEffect(() => {
    void haal()
  }, [haal])

  const muteer = async (init: RequestInit, url = '/api/plan/koppelingen') => {
    setBezig(true)
    setFout(null)
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !j?.ok) {
        setFout(j?.error ?? `Mislukt (HTTP ${res.status})`)
        return
      }
      await haal()
      onChange?.()
    } catch {
      setFout('Geen antwoord van de server.')
    } finally {
      setBezig(false)
    }
  }

  if (laden) return <p className="text-sm text-muted-foreground">Laden…</p>

  const gekoppeld = data?.gekoppeld ?? []
  const kandidaten = (data?.acties ?? []).filter((a) => !gekoppeld.includes(a.key))

  return (
    <div className="space-y-2">
      {fout && (
        <p role="alert" className="text-sm text-destructive">
          {fout}
        </p>
      )}

      {gekoppeld.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog niet gekoppeld aan een actie.</p>
      ) : (
        <ul className="space-y-1">
          {gekoppeld.map((key) => (
            <li key={key} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="tabular-nums text-muted-foreground">{key}</span>{' '}
                {data?.acties.find((a) => a.key === key)?.titel}
              </span>
              <button
                type="button"
                disabled={bezig}
                onClick={() =>
                  void muteer(
                    { method: 'DELETE' },
                    `/api/plan/koppelingen?actie=${key}&type=${type}&key=${encodeURIComponent(subjectKey)}`
                  )
                }
                className={cn(
                  'shrink-0 rounded-md border px-2 py-1 text-2xs disabled:opacity-50',
                  focusRing
                )}
              >
                Ontkoppel
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Actie om aan te koppelen"
          value={keuze}
          disabled={bezig || kandidaten.length === 0}
          onChange={(e) => setKeuze(e.target.value)}
          className={cn(
            'min-w-0 flex-1 cursor-pointer rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50',
            focusRing
          )}
        >
          <option value="">
            {kandidaten.length === 0 ? 'Alle acties zijn al gekoppeld.' : 'Kies een actie…'}
          </option>
          {kandidaten.map((a) => (
            <option key={a.key} value={a.key}>
              {a.key} — {a.titel}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={bezig || keuze === ''}
          onClick={() => {
            void muteer({
              method: 'PUT',
              body: JSON.stringify({ actie: keuze, type, key: subjectKey }),
            })
            setKeuze('')
          }}
        >
          Koppel
        </Button>
      </div>
    </div>
  )
}
