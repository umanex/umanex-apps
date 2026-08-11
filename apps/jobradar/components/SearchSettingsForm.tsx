'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { TermChips } from './TermChips'
import { valideerZoekopdracht, type Zoekopdracht } from '@/lib/settings'

type Telling = { regio: string; treffers: number; afgekapt: boolean; fout?: string }

type SearchSettingsFormProps = {
  begin: Zoekopdracht
  standaard: Zoekopdracht
  beginIsStandaard: boolean
}

export function SearchSettingsForm({ begin, standaard, beginIsStandaard }: SearchSettingsFormProps) {
  const [zoek, setZoek] = useState<Zoekopdracht>(begin)
  const [opgeslagen, setOpgeslagen] = useState<Zoekopdracht>(begin)
  const [isStandaard, setIsStandaard] = useState(beginIsStandaard)
  const [bezig, setBezig] = useState<'opslaan' | 'testen' | 'herstellen' | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  const [tellingen, setTellingen] = useState<Telling[] | null>(null)
  const router = useRouter()

  const gewijzigd = JSON.stringify(zoek) !== JSON.stringify(opgeslagen)
  const validatie = valideerZoekopdracht(zoek)

  function wijzig(volgende: Zoekopdracht) {
    setZoek(volgende)
    setFout(null)
    setMelding(null)
    // De telling hoort bij de vorige termen; laten staan zou een verouderd getal
    // presenteren als de uitkomst van wat er nu staat.
    setTellingen(null)
  }

  async function verzoek(pad: string, init: RequestInit, bezigheid: typeof bezig) {
    setBezig(bezigheid)
    setFout(null)
    setMelding(null)
    try {
      const res = await fetch(pad, init)
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setFout(data?.error ?? `Mislukt (HTTP ${res.status})`)
        return null
      }
      return data
    } catch {
      setFout('Geen antwoord van de server.')
      return null
    } finally {
      setBezig(null)
    }
  }

  async function opslaan() {
    const data = await verzoek(
      '/api/settings',
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zoek) },
      'opslaan'
    )
    if (!data) return
    setOpgeslagen(data.zoek)
    setZoek(data.zoek)
    setIsStandaard(data.isStandaard)
    setMelding('Opgeslagen. Dit werkt door bij de volgende sync.')
    router.refresh()
  }

  async function herstellen() {
    const data = await verzoek('/api/settings', { method: 'DELETE' }, 'herstellen')
    if (!data) return
    setOpgeslagen(data.zoek)
    setZoek(data.zoek)
    setIsStandaard(data.isStandaard)
    setTellingen(null)
    setMelding('Teruggezet op de gemeten standaard.')
    router.refresh()
  }

  async function testen() {
    const data = await verzoek(
      '/api/settings/test',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zoek) },
      'testen'
    )
    if (!data) return
    setTellingen(data.tellingen)
  }

  return (
    <div className="space-y-6">
      <TermChips
        label="Zoektermen"
        beschrijving="Adzuna matcht op losse woorden en rekt ze op — een term met een spatie wordt gesplitst, en “product” matcht ook “productie”."
        termen={zoek.termen}
        onChange={(termen) => wijzig({ ...zoek, termen })}
        disabled={bezig !== null}
      />

      <TermChips
        label="Uitsluiten"
        beschrijving="Vacatures met een van deze woorden komen niet binnen. Houd de lijst kort: te breed uitsluiten kost echte leads."
        termen={zoek.uitsluiten}
        onChange={(uitsluiten) => wijzig({ ...zoek, uitsluiten })}
        disabled={bezig !== null}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={testen} variant="secondary" disabled={bezig !== null || validatie !== null}>
          <RefreshCw className={cn('mr-2 h-4 w-4', bezig === 'testen' && 'animate-spin')} />
          {bezig === 'testen' ? 'Bezig…' : 'Test deze zoekopdracht'}
        </Button>
        <Button onClick={opslaan} disabled={bezig !== null || !gewijzigd || validatie !== null}>
          {bezig === 'opslaan' ? 'Bezig…' : 'Opslaan'}
        </Button>
        {!isStandaard && (
          <Button onClick={herstellen} variant="ghost" disabled={bezig !== null}>
            Herstel de standaard
          </Button>
        )}
        {isStandaard && <span className="text-sm text-muted-foreground">Dit is de gemeten standaard.</span>}
      </div>

      {validatie && (
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {validatie}
        </p>
      )}
      {fout && (
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {fout}
        </p>
      )}
      {melding && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          {melding}
        </p>
      )}

      {tellingen && (
        <div className="space-y-1 rounded-md border border-border p-3">
          <p className="text-sm font-medium">Wat deze zoekopdracht zou opleveren</p>
          <ul className="text-sm text-muted-foreground">
            {tellingen.map((t) => (
              <li key={t.regio} className="flex items-center gap-3">
                <span className="w-10 font-medium text-foreground">{t.regio}</span>
                {t.fout ? (
                  <span className="text-destructive">{t.fout}</span>
                ) : (
                  <>
                    <span className="w-24 tabular-nums">{t.treffers} treffers</span>
                    <span className={cn(t.afgekapt && 'text-destructive')}>
                      {t.afgekapt ? 'wordt afgekapt door het plafond' : 'past onder het plafond'}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            Een telling haalt niets op en slaat niets op — hij vraagt alleen het aantal.
          </p>
        </div>
      )}

      {gewijzigd && !validatie && (
        <p className="text-sm text-muted-foreground">Niet opgeslagen. Wijzigingen werken door bij de volgende sync.</p>
      )}
    </div>
  )
}
