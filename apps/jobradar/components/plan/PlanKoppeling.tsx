'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [melding, setMelding] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const keuzeRef = useRef<HTMLSelectElement>(null)
  /**
   * Na Ontkoppel verdwijnt de knop zelf uit de lijst. Wie hem met het toetsenbord indrukte,
   * belandt dan op de keuzelijst eronder — de volgende bediening van dit blok — in plaats van
   * bovenaan het paneel. Pas na `bezig`: tot dan staat de keuzelijst uitgeschakeld.
   */
  const focusOpKeuze = useRef(false)

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

  useEffect(() => {
    if (bezig || !focusOpKeuze.current) return
    focusOpKeuze.current = false
    keuzeRef.current?.focus()
  }, [bezig, data])

  /**
   * Geeft terug of het gelukt is. De melding komt pas na de herlading, als de lijst hem toont.
   * `naSucces` loopt vóór `bezig` terugvalt, zodat het focuseffect de vlag al ziet.
   */
  const muteer = async (
    init: RequestInit,
    gelukt: string,
    { url = '/api/plan/koppelingen', naSucces }: { url?: string; naSucces?: () => void } = {}
  ) => {
    // `aria-disabled` en een guard in plaats van `disabled`: de knop die je indrukt houdt zo zijn
    // focus tijdens het verzoek, in plaats van hem af te geven aan `body`.
    if (bezig) return false
    setBezig(true)
    setFout(null)
    setMelding('')
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !j?.ok) {
        setFout(j?.error ?? `Mislukt (HTTP ${res.status})`)
        return false
      }
      await haal()
      setMelding(gelukt)
      naSucces?.()
      onChange?.()
      return true
    } catch {
      setFout('Geen antwoord van de server.')
      return false
    } finally {
      setBezig(false)
    }
  }

  const gekoppeld = data?.gekoppeld ?? []
  const kandidaten = (data?.acties ?? []).filter((a) => !gekoppeld.includes(a.key))

  return (
    <div ref={rootRef}>
      {/* Bij een herlading blijft de lijst staan, met `aria-busy`. Eerst gaf het hele blok dan
          "Laden…" terug, en verdwenen Koppel en Ontkoppel onder de focus. */}
      <div className="space-y-2" aria-busy={laden || undefined}>
        {laden && data === null ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : (
          <>
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
                      aria-disabled={bezig}
                      onClick={() => {
                        const hadFocus = Boolean(rootRef.current?.contains(document.activeElement))
                        void muteer({ method: 'DELETE' }, `Ontkoppeld van ${key}.`, {
                          url: `/api/plan/koppelingen?actie=${key}&type=${type}&key=${encodeURIComponent(subjectKey)}`,
                          naSucces: () => {
                            focusOpKeuze.current = hadFocus
                          },
                        })
                      }}
                      className={cn(
                        'shrink-0 rounded-md border px-2 py-1 text-2xs aria-disabled:pointer-events-none aria-disabled:opacity-50',
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
                ref={keuzeRef}
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
                aria-disabled={bezig || keuze === ''}
                className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                onClick={async () => {
                  if (keuze === '') return
                  // De keuze pas wissen na een geslaagd antwoord: bij een fout blijft staan wat je
                  // koos, zodat opnieuw proberen één klik is.
                  const actie = keuze
                  const ok = await muteer(
                    { method: 'PUT', body: JSON.stringify({ actie, type, key: subjectKey }) },
                    `Gekoppeld aan ${actie}.`
                  )
                  if (ok) setKeuze('')
                }}
              >
                Koppel
              </Button>
            </div>
          </>
        )}
      </div>
      {/* Altijd gerenderd, ook leeg, en buiten `aria-busy`: een live-regio die pas met zijn
          inhoud verschijnt, wordt niet betrouwbaar voorgelezen. De key in de tekst houdt twee
          meldingen na elkaar verschillend. */}
      <p aria-live="polite" className="sr-only" data-koppeling-melding>
        {melding}
      </p>
    </div>
  )
}
