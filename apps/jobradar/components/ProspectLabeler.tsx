'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, SkipForward } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { CLASSIFICATIES, type Classificatie } from '@/lib/db/schema'
import {
  berekenVoortgang,
  bouwWachtrij,
  hervatOp,
  volgende,
  vorige,
  type Prospect,
  type Wachtrij,
} from '@/lib/prospects'
import { ProspectKaart } from './ProspectKaart'
import { ProspectVoortgang } from './ProspectVoortgang'
import { ClassificatieKnoppen } from './ClassificatieKnoppen'
import { ProspectLeeg } from './feedback/ProspectLeeg'
import { ProspectFout } from './feedback/ProspectFout'

type Props = {
  initieel: Prospect[]
}

const WACHTRIJEN: { waarde: Wachtrij; label: string }[] = [
  { waarde: 'ongelabeld', label: 'Nog niet beoordeeld' },
  { waarde: 'twijfel', label: 'Twijfelstapel' },
  { waarde: 'alles', label: 'Alles wat open staat' },
]

/**
 * Het labelscherm: één bedrijf per keer, toetsenbord-eerst.
 *
 * De volgorde van de wachtrij komt uit `lib/prospects.ts` en niet uit deze component — dat is
 * het deel dat stil verkeerd kan gaan, en het staat daar onder een scenario-suite.
 *
 * Overgeslagen bedrijven worden bijgehouden in de sessie en niet in de database: overslaan is
 * "nu even niet", geen oordeel. Bij een herstart komen ze gewoon terug, en dat is de bedoeling —
 * anders verdwijnen ze stil uit je werkvoorraad zonder dat er ooit iets over beslist is.
 */
export function ProspectLabeler({ initieel }: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initieel)
  const [welke, setWelke] = useState<Wachtrij>('ongelabeld')
  const [huidigeId, setHuidigeId] = useState<number | null>(null)
  const [overgeslagen, setOvergeslagen] = useState<Set<number>>(new Set())
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const voortgang = useMemo(() => berekenVoortgang(prospects), [prospects])
  const wachtrij = useMemo(
    () => bouwWachtrij(prospects, welke).filter((p) => !overgeslagen.has(p.id)),
    [prospects, welke, overgeslagen]
  )

  const huidige = useMemo(() => {
    if (huidigeId === null) return hervatOp(wachtrij)
    return wachtrij.find((p) => p.id === huidigeId) ?? hervatOp(wachtrij)
  }, [wachtrij, huidigeId])

  const bewaar = useCallback(
    async (id: number, wijziging: Record<string, unknown>) => {
      const res = await fetch(`/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wijziging),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Opslaan mislukte (${res.status})`)
      }
    },
    []
  )

  const label = useCallback(
    async (c: Classificatie) => {
      if (!huidige || bezig) return
      const id = huidige.id
      const volgend = volgende(wachtrij, id)
      setBezig(true)
      setFout(null)
      try {
        await bewaar(id, { classificatie: c, signals: huidige.signals })
        setProspects((vorig) =>
          vorig.map((p) =>
            p.id === id ? { ...p, classificatie: c, geclassificeerdOp: new Date().toISOString() } : p
          )
        )
        setHuidigeId(volgend?.id ?? null)
      } catch (e) {
        setFout(e instanceof Error ? e.message : String(e))
      } finally {
        setBezig(false)
      }
    },
    [huidige, bezig, wachtrij, bewaar]
  )

  /** Terug: het vorige oordeel wordt teruggenomen, zodat de teller klopt en je kan corrigeren. */
  const terug = useCallback(async () => {
    if (bezig) return
    const vorigeInRij = vorige(wachtrij, huidige?.id ?? null)
    const laatstGelabeld =
      vorigeInRij ??
      [...prospects]
        .filter((p) => p.geclassificeerdOp !== null)
        .sort((a, b) => (b.geclassificeerdOp ?? '').localeCompare(a.geclassificeerdOp ?? ''))[0]
    if (!laatstGelabeld) return
    setBezig(true)
    setFout(null)
    try {
      await bewaar(laatstGelabeld.id, { classificatie: null })
      setProspects((vorig) =>
        vorig.map((p) => (p.id === laatstGelabeld.id ? { ...p, classificatie: null, geclassificeerdOp: null } : p))
      )
      setOvergeslagen((s) => {
        const n = new Set(s)
        n.delete(laatstGelabeld.id)
        return n
      })
      setHuidigeId(laatstGelabeld.id)
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e))
    } finally {
      setBezig(false)
    }
  }, [bezig, wachtrij, huidige, prospects, bewaar])

  const sla_over = useCallback(() => {
    if (!huidige || bezig) return
    const volgend = volgende(wachtrij, huidige.id)
    setOvergeslagen((s) => new Set(s).add(huidige.id))
    setHuidigeId(volgend?.id ?? null)
  }, [huidige, bezig, wachtrij])

  const zetSignaal = useCallback(
    (signaal: string, aan: boolean) => {
      if (!huidige) return
      const nieuw = aan
        ? [...huidige.signals, signaal]
        : huidige.signals.filter((s) => s !== signaal)
      setProspects((vorig) => vorig.map((p) => (p.id === huidige.id ? { ...p, signals: nieuw } : p)))
    },
    [huidige]
  )

  /** Verkeerd bedrijf gevonden: de URL wordt gewist, het bedrijf blijft in de wachtrij staan. */
  const keurUrlAf = useCallback(async () => {
    if (!huidige || bezig) return
    setBezig(true)
    setFout(null)
    try {
      await bewaar(huidige.id, { url: null })
      setProspects((vorig) => vorig.map((p) => (p.id === huidige.id ? { ...p, url: null } : p)))
    } catch (e) {
      setFout(e instanceof Error ? e.message : String(e))
    } finally {
      setBezig(false)
    }
  }, [huidige, bezig, bewaar])

  // Toetsenbord. Genegeerd zodra de focus in een invoerveld staat, anders kan je niets typen.
  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      const doel = e.target as HTMLElement | null
      if (doel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(doel.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const index = Number(e.key) - 1
      if (Number.isInteger(index) && index >= 0 && index < CLASSIFICATIES.length) {
        e.preventDefault()
        void label(CLASSIFICATIES[index]!)
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        sla_over()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        void terug()
      }
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [label, sla_over, terug])

  if (fout !== null && huidige === null) {
    return <ProspectFout melding={fout} onOpnieuw={() => setFout(null)} />
  }

  return (
    <div className="flex flex-col gap-5">
      <ProspectVoortgang voortgang={voortgang} wachtrijLengte={wachtrij.length} />

      <div className="flex flex-wrap items-center gap-2">
        {WACHTRIJEN.map((w) => (
          <Button
            key={w.waarde}
            type="button"
            size="sm"
            variant={welke === w.waarde ? 'default' : 'outline'}
            onClick={() => {
              setWelke(w.waarde)
              setHuidigeId(null)
            }}
          >
            {w.label}
          </Button>
        ))}
        {overgeslagen.size > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOvergeslagen(new Set())}>
            {overgeslagen.size} overgeslagen terugzetten
          </Button>
        )}
      </div>

      {fout !== null && (
        <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-2xs text-destructive">
          {fout}
        </p>
      )}

      {huidige === null ? (
        <ProspectLeeg
          voortgang={voortgang}
          doorFilter={welke !== 'ongelabeld' || overgeslagen.size > 0}
          onFilterWissen={() => {
            setWelke('ongelabeld')
            setOvergeslagen(new Set())
            setHuidigeId(null)
          }}
          onNaarTwijfel={
            voortgang.twijfel > 0
              ? () => {
                  setWelke('twijfel')
                  setHuidigeId(null)
                }
              : undefined
          }
        />
      ) : (
        <>
          <ProspectKaart
            prospect={huidige}
            signalen={huidige.signals}
            verrijkt={false}
            bezig={bezig}
            onSignaal={zetSignaal}
            onUrlAfkeuren={keurUrlAf}
          />

          <ClassificatieKnoppen actief={huidige.classificatie} bezig={bezig} onKies={(c) => void label(c)} />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={bezig} onClick={() => void terug()}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Terug
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={bezig} onClick={sla_over}>
                <SkipForward className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Overslaan
              </Button>
            </div>
            <p className="text-2xs text-muted-foreground">
              <kbd className="rounded border border-border px-1">1</kbd>–
              <kbd className="rounded border border-border px-1">5</kbd> labelen ·{' '}
              <kbd className="rounded border border-border px-1">spatie</kbd> overslaan ·{' '}
              <kbd className="rounded border border-border px-1">←</kbd> terug
            </p>
          </div>
        </>
      )}
    </div>
  )
}
