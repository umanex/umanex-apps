'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { TermChips } from './TermChips'
import { valideerZoekopdracht, minimaleVerzoeken, MAX_ZINSNEDES, type Zoekopdracht } from '@/lib/settings'

type Telling = { regio: string; treffers: number; afgekapt: boolean; bovengrens: boolean; fout?: string }

/**
 * `aria-disabled` en niet `disabled`: een knop die de focus heeft en disabled wordt, geeft die
 * focus af aan `body`. Dat gebeurt hier bij elke druk (bezig) én na een geslaagd Opslaan, want dan
 * is er niets meer gewijzigd. De handlers dragen daarom zelf de guard. Een ongeldige zoekopdracht
 * volgt dezelfde vorm, zodat een knop niet de ene keer wel en de andere keer niet in de tabvolgorde staat.
 */
const INERT = 'aria-disabled:pointer-events-none aria-disabled:opacity-50'

/** De tabel in één zin, voor wie hem niet ziet verschijnen. */
function samenvattingVan(tellingen: Telling[]): string {
  const delen = tellingen.map((t) =>
    t.fout
      ? `${t.regio}: ${t.fout.replace(/\.$/, '')}`
      : `${t.regio}: ${t.bovengrens ? 'hoogstens ' : ''}${t.treffers} treffers${t.afgekapt ? ', wordt afgekapt door het plafond' : ''}`
  )
  return `Test klaar. ${delen.join('. ')}.`
}

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
  /**
   * Los van `melding` en `tellingen`: die blijven bij een mislukte hertest gewoon staan, en een
   * regio die daarvan afleidt zou het oude resultaat na de fout opnieuw voorlezen als nieuw.
   */
  const [aankondiging, setAankondiging] = useState('')
  const router = useRouter()
  const testRef = useRef<HTMLButtonElement>(null)
  const herstelRef = useRef<HTMLButtonElement>(null)
  /** Herstel verdwijnt na succes (dan ís het de standaard); de focus moet ergens landen. */
  const focusNaHerstel = useRef(false)

  const gewijzigd = JSON.stringify(zoek) !== JSON.stringify(opgeslagen)
  const validatie = valideerZoekopdracht(zoek)

  useEffect(() => {
    if (!focusNaHerstel.current) return
    focusNaHerstel.current = false
    // Alleen als hij met de knop verdween — wie intussen elders verder werkte, houdt zijn plek.
    // Test staat in dezelfde rij, blijft altijd bestaan, en zijn naam herhaalt de melding niet.
    if (document.activeElement === null || document.activeElement === document.body) testRef.current?.focus()
  }, [isStandaard])

  function wijzig(volgende: Zoekopdracht) {
    setZoek(volgende)
    setFout(null)
    setMelding(null)
    setAankondiging('')
    // De telling hoort bij de vorige termen; laten staan zou een verouderd getal
    // presenteren als de uitkomst van wat er nu staat.
    setTellingen(null)
  }

  async function verzoek(pad: string, init: RequestInit, bezigheid: typeof bezig) {
    if (bezig !== null) return null
    setBezig(bezigheid)
    setFout(null)
    setMelding(null)
    // Leeg tijdens het verzoek, zodat een hertest met dezelfde uitkomst opnieuw als wijziging telt.
    setAankondiging('')
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
    if (!gewijzigd || validatie !== null) return
    const data = await verzoek(
      '/api/settings',
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zoek) },
      'opslaan'
    )
    if (!data) return
    setOpgeslagen(data.zoek)
    setZoek(data.zoek)
    setIsStandaard(data.isStandaard)
    const tekst = 'Opgeslagen. Dit werkt door bij de volgende sync.'
    setMelding(tekst)
    setAankondiging(tekst)
    router.refresh()
  }

  async function herstellen() {
    const hadFocus = herstelRef.current !== null && herstelRef.current === document.activeElement
    const data = await verzoek('/api/settings', { method: 'DELETE' }, 'herstellen')
    if (!data) return
    focusNaHerstel.current = hadFocus && Boolean(data.isStandaard)
    setOpgeslagen(data.zoek)
    setZoek(data.zoek)
    setIsStandaard(data.isStandaard)
    setTellingen(null)
    const tekst = 'Teruggezet op de gemeten standaard.'
    setMelding(tekst)
    setAankondiging(tekst)
    router.refresh()
  }

  async function testen() {
    if (validatie !== null) return
    const data = await verzoek(
      '/api/settings/test',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zoek) },
      'testen'
    )
    if (!data) return
    setTellingen(data.tellingen)
    setAankondiging(samenvattingVan(data.tellingen))
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
        label="Woordcombinaties"
        beschrijving="Een exacte zinsnede, als geheel gezocht. Elke combinatie kost een eigen verzoek per regio — daarom het maximum."
        termen={zoek.zinsnedes}
        onChange={(zinsnedes) => wijzig({ ...zoek, zinsnedes })}
        disabled={bezig !== null}
        modus="zinsnede"
        max={MAX_ZINSNEDES}
      />

      <p className="text-sm text-muted-foreground">
        Een sync kost hiermee minstens{' '}
        <span className="font-medium tabular-nums text-foreground">{minimaleVerzoeken(zoek, 3)}</span> verzoeken aan
        Adzuna — paginering komt daar nog bij. Adzuna stuurt geen limiet-headers mee, dus te vaak vragen merk je
        pas aan een weigering.
      </p>

      <TermChips
        label="Uitsluiten"
        beschrijving="Vacatures met een van deze woorden komen niet binnen. Houd de lijst kort: te breed uitsluiten kost echte leads."
        termen={zoek.uitsluiten}
        onChange={(uitsluiten) => wijzig({ ...zoek, uitsluiten })}
        disabled={bezig !== null}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={testRef}
          onClick={testen}
          variant="secondary"
          aria-disabled={bezig !== null || validatie !== null}
          className={INERT}
          data-zoekopdracht-actie="testen"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', bezig === 'testen' && 'animate-spin')} />
          {bezig === 'testen' ? 'Bezig…' : 'Test deze zoekopdracht'}
        </Button>
        <Button
          onClick={opslaan}
          aria-disabled={bezig !== null || !gewijzigd || validatie !== null}
          className={INERT}
          data-zoekopdracht-actie="opslaan"
        >
          {bezig === 'opslaan' ? 'Bezig…' : 'Opslaan'}
        </Button>
        {!isStandaard && (
          <Button
            ref={herstelRef}
            onClick={herstellen}
            variant="ghost"
            aria-disabled={bezig !== null}
            className={INERT}
            data-zoekopdracht-actie="herstellen"
          >
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
      {/* Altijd gerenderd, ook leeg: een live-regio die pas verschijnt samen met zijn inhoud wordt
          niet betrouwbaar voorgelezen. De zichtbare melding en tabel hierboven en hieronder dragen
          zelf geen regio, anders klinkt alles twee keer. */}
      <p aria-live="polite" className="sr-only" data-zoekopdracht-melding>
        {aankondiging}
      </p>

      {tellingen && (
        <div className="space-y-1 rounded-md border border-border p-3" data-zoekopdracht-telling>
          <p className="text-sm font-medium">Wat deze zoekopdracht zou opleveren</p>
          <ul className="text-sm text-muted-foreground">
            {tellingen.map((t) => (
              <li key={t.regio} className="flex items-center gap-3">
                <span className="w-10 font-medium text-foreground">{t.regio}</span>
                {t.fout ? (
                  <span className="text-destructive">{t.fout}</span>
                ) : (
                  <>
                    <span className="w-32 tabular-nums">
                      {t.bovengrens ? 'hoogstens ' : ''}
                      {t.treffers} treffers
                    </span>
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
            {tellingen.some((t) => t.bovengrens) &&
              ' Met woordcombinaties is het een bovengrens: een vacature die op meerdere ervan matcht telt hier meerdere keren, en wordt bij een sync één keer bewaard.'}
          </p>
        </div>
      )}

      {gewijzigd && !validatie && (
        <p className="text-sm text-muted-foreground">Niet opgeslagen. Wijzigingen werken door bij de volgende sync.</p>
      )}
    </div>
  )
}
