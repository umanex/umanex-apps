'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Trash2, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@umanex/ui/components/ui/sheet'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { Label } from '@umanex/ui/components/ui/label'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { PlanStatusPill } from './PlanStatusPill'
import { formatteerInzet } from '@/lib/plan/inzet'
import { PRIORITEIT_LABEL } from '@/lib/plan/seed-inhoud'
import {
  ACTIE_STATUSSEN,
  STATUS_LABEL,
  type ActieDetail,
  type ActieStatus,
  type FocusConflict,
  type PlanLink,
  type Prioriteit,
} from '@/lib/plan/types'

export type PanelVerzoek = {
  soort: 'status' | 'velden' | 'afhankelijkheden' | 'verwijder'
  body?: Record<string, unknown>
}

type ActiePanelProps = {
  actie: ActieDetail
  /** Alle acties, om een afhankelijkheid uit te kiezen. */
  alleActies: { key: string; titel: string; status: string }[]
  vandaag: string
  urenPerDag: number
  /** Opent het paneel direct op de afrond-sectie, met focus op het bewijsveld. */
  opAfronden: boolean
  focusConflict: FocusConflict | null
  bezig: boolean
  fout: string | null
  onOpenChange: (open: boolean) => void
  onVerzoek: (verzoek: PanelVerzoek) => void
  onHerlaad: () => void
}

const INVOER = 'rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50'
// Chromium matcht `:focus-visible` niet op de host wanneer je een datumsegment binnentabt;
// zonder de focus-within-kopie is zo'n veld een stop zonder zichtbare focus. Gemeten door de
// flow-harness op ContactPanel (2026-09-09), en hier om dezelfde reden.
const DATUM_RING =
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background'

/**
 * Eén actie in detail, in een sheet van rechts — zoals `ContactPanel`.
 *
 * Waarom een sheet: de lijst eronder blijft staan, zodat je ziet waar deze actie tussen de
 * andere hangt. Een modal zou dat wegnemen, en inline uitklappen duwt de lijst uit elkaar.
 *
 * De velden worden in één keer bewaard, de handelingen niet. Reden: status, afhankelijkheden
 * en afronden hebben elk hun eigen controles en kunnen elk een conflict opleveren waarop je
 * moet kiezen. Ze meenemen in een "bewaar alles" zou bij een geweigerde status de vraag
 * openlaten of de titel wél doorging.
 */
export function ActiePanel({
  actie,
  alleActies,
  vandaag,
  urenPerDag,
  opAfronden,
  focusConflict,
  bezig,
  fout,
  onOpenChange,
  onVerzoek,
  onHerlaad,
}: ActiePanelProps) {
  const [titel, setTitel] = useState(actie.titel)
  const [beschrijving, setBeschrijving] = useState(actie.beschrijving ?? '')
  const [resultaat, setResultaat] = useState(actie.resultaat ?? '')
  const [volgendeStap, setVolgendeStap] = useState(actie.volgendeStap ?? '')
  const [gereedcriterium, setGereedcriterium] = useState(actie.gereedcriterium ?? '')
  const [inschatting, setInschatting] = useState(
    actie.inschattingUren === null ? '' : String(actie.inschattingUren)
  )
  const [resterend, setResterend] = useState(
    actie.resterendUren === null ? '' : String(actie.resterendUren)
  )
  const [eigenaar, setEigenaar] = useState(actie.eigenaar)
  const [streefdatum, setStreefdatum] = useState(actie.streefdatum ?? '')
  const [herbekijkOp, setHerbekijkOp] = useState(actie.herbekijkOp ?? '')
  const [links, setLinks] = useState<PlanLink[]>(actie.links)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const [bewijs, setBewijs] = useState('')
  const [bewijsLink, setBewijsLink] = useState('')
  const [heropenReden, setHeropenReden] = useState('')
  const [uitzonderingReden, setUitzonderingReden] = useState('')
  const [nieuweAfhankelijkheid, setNieuweAfhankelijkheid] = useState('')
  const [wachtreden, setWachtreden] = useState(actie.wachtreden ?? '')
  const [teVerwijderen, setTeVerwijderen] = useState(false)

  const gewijzigd =
    titel !== actie.titel ||
    beschrijving !== (actie.beschrijving ?? '') ||
    resultaat !== (actie.resultaat ?? '') ||
    volgendeStap !== (actie.volgendeStap ?? '') ||
    gereedcriterium !== (actie.gereedcriterium ?? '') ||
    inschatting !== (actie.inschattingUren === null ? '' : String(actie.inschattingUren)) ||
    resterend !== (actie.resterendUren === null ? '' : String(actie.resterendUren)) ||
    eigenaar !== actie.eigenaar ||
    streefdatum !== (actie.streefdatum ?? '') ||
    herbekijkOp !== (actie.herbekijkOp ?? '') ||
    JSON.stringify(links) !== JSON.stringify(actie.links)

  const bewaarVelden = () =>
    onVerzoek({
      soort: 'velden',
      body: {
        titel,
        beschrijving: beschrijving.trim() === '' ? null : beschrijving,
        resultaat: resultaat.trim() === '' ? null : resultaat,
        volgendeStap: volgendeStap.trim() === '' ? null : volgendeStap,
        gereedcriterium: gereedcriterium.trim() === '' ? null : gereedcriterium,
        inschattingUren: inschatting.trim() === '' ? null : inschatting,
        resterendUren: resterend.trim() === '' ? null : resterend,
        eigenaar,
        streefdatum: streefdatum === '' ? null : streefdatum,
        herbekijkOp: herbekijkOp === '' ? null : herbekijkOp,
        links,
      },
    })

  const zetStatus = (status: ActieStatus, extra: Record<string, unknown> = {}) =>
    onVerzoek({ soort: 'status', body: { status, ...extra } })

  const kandidaten = alleActies.filter(
    (a) =>
      a.key !== actie.key &&
      a.status !== 'vervallen' &&
      !actie.afhankelijkheden.includes(a.key)
  )

  const versieConflict = fout !== null && /intussen elders gewijzigd/.test(fout)
  const dagen = (uren: string) => {
    const n = Number(uren.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? formatteerInzet(n, urenPerDag) : 'onbekend'
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          if (!opAfronden) return
          e.preventDefault()
          document.getElementById('plan-bewijs')?.focus()
        }}
      >
        <SheetHeader>
          <SheetTitle>
            <span className="tabular-nums text-muted-foreground">{actie.key}</span> {actie.titel}
          </SheetTitle>
          <SheetDescription>
            Prioriteit {actie.prioriteit} — {PRIORITEIT_LABEL[actie.prioriteit as Prioriteit]}
          </SheetDescription>
        </SheetHeader>

        {fout && (
          <p role="alert" className="rounded-md border border-destructive p-2 text-sm text-destructive">
            {fout}
            {versieConflict && (
              <Button size="sm" variant="outline" className="ml-2" onClick={onHerlaad}>
                Herlaad plan
              </Button>
            )}
          </p>
        )}

        {actie.context && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {actie.context}
          </p>
        )}

        {/* Status */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Status</h3>
          <div className="flex flex-wrap items-center gap-2">
            <PlanStatusPill status={actie.status as ActieStatus} />
            <select
              aria-label="Status wijzigen"
              value={actie.status}
              disabled={bezig}
              onChange={(e) => {
                const s = e.target.value as ActieStatus
                if (s === 'uitgesteld' || s === 'wacht_op_input') {
                  zetStatus(s, { wachtreden: wachtreden || actie.wachtreden || '' })
                } else if (s === 'vervallen') {
                  zetStatus(s, { reden: wachtreden || 'niet meer aan de orde' })
                } else {
                  zetStatus(s)
                }
              }}
              className={cn('cursor-pointer', INVOER, 'cursor-pointer', focusRing)}
            >
              {ACTIE_STATUSSEN.filter((s) => s !== 'gereed' || actie.status === 'gereed').map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {(actie.status === 'uitgesteld' || actie.status === 'wacht_op_input') && (
            <div className="space-y-1">
              <Label htmlFor="plan-wachtreden" className="text-2xs">
                {actie.status === 'uitgesteld' ? 'Aanleiding om te herbekijken' : 'Waarop wacht deze actie?'}
              </Label>
              <input
                id="plan-wachtreden"
                type="text"
                value={wachtreden}
                maxLength={300}
                disabled={bezig}
                onChange={(e) => setWachtreden(e.target.value)}
                className={cn('w-full', INVOER, focusRing)}
              />
            </div>
          )}

          {actie.focusUitzondering && (
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Uitzondering op de focusregel: {actie.focusUitzondering}
            </p>
          )}
          {actie.startUitzondering && (
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Bewust eerder gestart: {actie.startUitzondering}
            </p>
          )}

          {focusConflict && (
            <div role="alert" className="space-y-2 rounded-md border border-warning p-3 text-sm">
              <p>
                Er zijn al {focusConflict.limiet} acties bezig. Parkeer er één, of start{' '}
                {actie.key} met een uitzondering.
              </p>
              <ul className="space-y-1">
                {focusConflict.actief.map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="tabular-nums text-muted-foreground">{a.key}</span> {a.titel}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bezig}
                      onClick={() => zetStatus('bezig', { parkeer: a.key })}
                    >
                      Parkeer
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="plan-focus-reden" className="text-2xs">
                    Reden voor de uitzondering
                  </Label>
                  <input
                    id="plan-focus-reden"
                    type="text"
                    value={uitzonderingReden}
                    maxLength={300}
                    disabled={bezig}
                    onChange={(e) => setUitzonderingReden(e.target.value)}
                    className={cn('w-full', INVOER, focusRing)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={bezig || uitzonderingReden.trim() === ''}
                  onClick={() => zetStatus('bezig', { focusUitzondering: uitzonderingReden })}
                >
                  Start met uitzondering
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Volgende stap en inhoud */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Wat je gaat doen</h3>
          <div className="space-y-1">
            <Label htmlFor="plan-stap" className="text-2xs">
              Eerstvolgende concrete handeling
            </Label>
            <input
              id="plan-stap"
              type="text"
              value={volgendeStap}
              maxLength={300}
              disabled={bezig}
              onChange={(e) => setVolgendeStap(e.target.value)}
              placeholder="Wat is de eerste zet?"
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-titel" className="text-2xs">
              Titel
            </Label>
            <input
              id="plan-titel"
              type="text"
              value={titel}
              maxLength={120}
              disabled={bezig}
              onChange={(e) => setTitel(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-resultaat" className="text-2xs">
              Beoogd resultaat
            </Label>
            <textarea
              id="plan-resultaat"
              rows={2}
              value={resultaat}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setResultaat(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-beschrijving" className="text-2xs">
              Beschrijving
            </Label>
            <textarea
              id="plan-beschrijving"
              rows={3}
              value={beschrijving}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setBeschrijving(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-criterium" className="text-2xs">
              Gereedcriterium — waaraan zie je dat dit af is?
            </Label>
            <textarea
              id="plan-criterium"
              rows={2}
              value={gereedcriterium}
              maxLength={4000}
              disabled={bezig}
              onChange={(e) => setGereedcriterium(e.target.value)}
              className={cn('w-full', INVOER, focusRing)}
            />
          </div>
        </section>

        {/* Inzet en planning */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Inzet en planning</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-inschatting" className="text-2xs">
                Inschatting (uren)
              </Label>
              <input
                id="plan-inschatting"
                type="number"
                min="0.5"
                step="0.5"
                value={inschatting}
                disabled={bezig}
                onChange={(e) => setInschatting(e.target.value)}
                className={cn('w-24', INVOER, focusRing)}
              />
            </div>
            <span className="pb-1 text-sm tabular-nums text-muted-foreground">
              {dagen(inschatting)}
            </span>
            <div className="space-y-1">
              <Label htmlFor="plan-resterend" className="text-2xs">
                Nog te gaan (uren)
              </Label>
              <input
                id="plan-resterend"
                type="number"
                min="0.5"
                step="0.5"
                value={resterend}
                disabled={bezig}
                onChange={(e) => setResterend(e.target.value)}
                className={cn('w-24', INVOER, focusRing)}
              />
            </div>
            <span className="pb-1 text-sm tabular-nums text-muted-foreground">
              {dagen(resterend)}
            </span>
          </div>
          <p className="text-2xs text-muted-foreground">
            Leeg is onbekend — beter dan een gok. Nul uren bestaat niet en wordt geweigerd.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-eigenaar" className="text-2xs">
                Eigenaar
              </Label>
              <input
                id="plan-eigenaar"
                type="text"
                value={eigenaar}
                maxLength={300}
                disabled={bezig}
                onChange={(e) => setEigenaar(e.target.value)}
                className={cn('w-40', INVOER, focusRing)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-streefdatum" className="text-2xs">
                Streefdatum (optioneel)
              </Label>
              <input
                id="plan-streefdatum"
                type="date"
                value={streefdatum}
                disabled={bezig}
                onChange={(e) => setStreefdatum(e.target.value)}
                className={cn(INVOER, DATUM_RING, focusRing)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-herbekijk" className="text-2xs">
                Herbekijken op (optioneel)
              </Label>
              <input
                id="plan-herbekijk"
                type="date"
                value={herbekijkOp}
                disabled={bezig}
                onChange={(e) => setHerbekijkOp(e.target.value)}
                className={cn(INVOER, DATUM_RING, focusRing)}
              />
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Links</h3>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-input p-2">
            {links.length === 0 && (
              <span className="px-1 text-sm text-muted-foreground">Nog geen links</span>
            )}
            {links.map((l) => (
              <span
                key={l.url}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm"
              >
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('flex items-center gap-1 rounded-sm hover:underline', focusRing)}
                >
                  {l.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  aria-label={`${l.label} verwijderen`}
                  disabled={bezig}
                  onClick={() => setLinks(links.filter((x) => x.url !== l.url))}
                  className={cn('rounded-sm text-muted-foreground hover:text-foreground', focusRing)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              aria-label="Label van de link"
              value={linkLabel}
              maxLength={80}
              disabled={bezig}
              placeholder="Label"
              onChange={(e) => setLinkLabel(e.target.value)}
              className={cn('w-32', INVOER, focusRing)}
            />
            <input
              type="url"
              aria-label="Adres van de link"
              value={linkUrl}
              disabled={bezig}
              placeholder="https://…"
              onChange={(e) => setLinkUrl(e.target.value)}
              className={cn('min-w-0 flex-1', INVOER, focusRing)}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={bezig || !/^https?:\/\/\S+$/i.test(linkUrl)}
              onClick={() => {
                setLinks([...links, { label: linkLabel.trim() || linkUrl, url: linkUrl.trim() }])
                setLinkLabel('')
                setLinkUrl('')
              }}
            >
              Voeg toe
            </Button>
          </div>
        </section>

        <div className="flex items-center gap-3 border-t pt-4">
          <Button size="sm" onClick={bewaarVelden} disabled={bezig || !gewijzigd}>
            {bezig ? 'Bezig…' : 'Bewaar'}
          </Button>
          {gewijzigd && <span className="text-2xs text-muted-foreground">Niet opgeslagen.</span>}
        </div>

        {/* Afhankelijkheden */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Afhankelijkheden</h3>
          {actie.afhankelijkheden.length === 0 ? (
            <p className="text-sm text-muted-foreground">Deze actie wacht op niets.</p>
          ) : (
            <ul className="space-y-1">
              {actie.afhankelijkheden.map((key) => {
                const blok = actie.blokkade.find((b) => b.key === key)
                return (
                  <li key={key} className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="tabular-nums text-muted-foreground">{key}</span>{' '}
                      {alleActies.find((a) => a.key === key)?.titel}
                      {blok && (
                        <span
                          className={cn(
                            'block text-2xs',
                            blok.hard ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {blok.reden}
                        </span>
                      )}
                      {!blok && <span className="block text-2xs text-success">gereed</span>}
                    </span>
                    <button
                      type="button"
                      aria-label={`Afhankelijkheid ${key} verwijderen`}
                      disabled={bezig}
                      onClick={() =>
                        onVerzoek({
                          soort: 'afhankelijkheden',
                          body: {
                            afhankelijkheden: actie.afhankelijkheden.filter((k) => k !== key),
                          },
                        })
                      }
                      className={cn(
                        'shrink-0 rounded-sm text-muted-foreground hover:text-destructive',
                        focusRing
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Afhankelijkheid toevoegen"
              value={nieuweAfhankelijkheid}
              disabled={bezig || kandidaten.length === 0}
              onChange={(e) => setNieuweAfhankelijkheid(e.target.value)}
              className={cn('min-w-0 flex-1 cursor-pointer', INVOER, focusRing)}
            >
              <option value="">Kies een actie…</option>
              {kandidaten.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.key} — {a.titel}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={bezig || nieuweAfhankelijkheid === ''}
              onClick={() => {
                onVerzoek({
                  soort: 'afhankelijkheden',
                  body: {
                    afhankelijkheden: [...actie.afhankelijkheden, nieuweAfhankelijkheid],
                  },
                })
                setNieuweAfhankelijkheid('')
              }}
            >
              Voeg toe
            </Button>
          </div>
          {actie.uitvoerbaarheid === 'geblokkeerd' && !actie.blokkade.some((b) => b.hard) && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="plan-start-reden" className="text-2xs">
                  Toch starten — waarom?
                </Label>
                <input
                  id="plan-start-reden"
                  type="text"
                  value={uitzonderingReden}
                  maxLength={300}
                  disabled={bezig}
                  onChange={(e) => setUitzonderingReden(e.target.value)}
                  className={cn('w-full', INVOER, focusRing)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={bezig || uitzonderingReden.trim() === ''}
                onClick={() => zetStatus('bezig', { startUitzondering: uitzonderingReden })}
              >
                Start toch
              </Button>
            </div>
          )}
          {actie.blokkade.some((b) => b.hard) && (
            <p className="text-2xs text-muted-foreground">
              Een vervallen afhankelijkheid telt niet als afgerond. Verwijder hem hierboven, of
              vervang hem door de actie die er nu voor in de plaats komt.
            </p>
          )}
        </section>

        {/* Gekoppelde bedrijven */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Gekoppelde bedrijven</h3>
          {actie.koppelingen.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen bedrijven. Koppelen doe je vanaf de kaart in het dashboard, bij Opvolging.
            </p>
          ) : (
            <ul className="space-y-1">
              {actie.koppelingen.map((k) => (
                <li
                  key={`${k.subjectType}:${k.subjectKey}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 truncate">{k.naam ?? k.subjectKey}</span>
                    <Badge variant="secondary" className="shrink-0 text-2xs">
                      {k.subjectType === 'lead' ? 'lead' : 'prospect'}
                    </Badge>
                  </span>
                  <Link
                    href={`/?tab=${k.subjectType === 'lead' ? 'leads' : 'prospects'}&zoek=${encodeURIComponent(k.naam ?? k.subjectKey)}`}
                    className={cn(
                      'shrink-0 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                      focusRing
                    )}
                  >
                    Open in dashboard
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Afronden of heropenen */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">
            {actie.status === 'gereed' ? 'Afgerond' : 'Afronden'}
          </h3>
          {actie.status === 'gereed' ? (
            <>
              <p className="rounded-md border border-border bg-muted p-3 text-sm">
                {actie.bewijs}
              </p>
              <p className="text-2xs tabular-nums text-muted-foreground">
                Afgerond op {actie.afgerondOp ?? 'onbekende datum'}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="plan-heropen" className="text-2xs">
                    Reden om te heropenen
                  </Label>
                  <input
                    id="plan-heropen"
                    type="text"
                    value={heropenReden}
                    maxLength={300}
                    disabled={bezig}
                    onChange={(e) => setHeropenReden(e.target.value)}
                    className={cn('w-full', INVOER, focusRing)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bezig}
                  onClick={() => zetStatus('niet_gestart', { reden: heropenReden || null })}
                >
                  Heropen
                </Button>
              </div>
              <p className="text-2xs text-muted-foreground">
                Het bewijs en de datum blijven staan; de heropening komt in de geschiedenis.
              </p>
            </>
          ) : (
            <>
              {actie.gereedcriterium ? (
                <p className="rounded-md border border-border bg-muted p-3 text-sm">
                  {actie.gereedcriterium}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen gereedcriterium ingevuld — vul het hierboven in, anders is er niets om
                  tegen af te ronden.
                </p>
              )}
              <div className="space-y-1">
                <Label htmlFor="plan-bewijs" className="text-2xs">
                  Bewijs — wat toont dat het klaar is?
                </Label>
                <textarea
                  id="plan-bewijs"
                  rows={3}
                  value={bewijs}
                  maxLength={4000}
                  disabled={bezig}
                  onChange={(e) => setBewijs(e.target.value)}
                  className={cn('w-full', INVOER, focusRing)}
                />
              </div>
              <input
                type="url"
                aria-label="Link naar het bewijs (optioneel)"
                value={bewijsLink}
                disabled={bezig}
                placeholder="https://… (optioneel)"
                onChange={(e) => setBewijsLink(e.target.value)}
                className={cn('w-full', INVOER, focusRing)}
              />
              <p className="text-2xs tabular-nums text-muted-foreground">
                Wordt vastgelegd met datum {vandaag}.
              </p>
              <Button
                size="sm"
                disabled={bezig || bewijs.trim() === ''}
                onClick={() =>
                  zetStatus('gereed', {
                    bewijs,
                    links: /^https?:\/\/\S+$/i.test(bewijsLink)
                      ? [...links, { label: 'Bewijs', url: bewijsLink.trim() }]
                      : undefined,
                  })
                }
              >
                Markeer gereed
              </Button>
            </>
          )}
        </section>

        {/* Geschiedenis */}
        <details className="border-t pt-4">
          <summary className={cn('cursor-pointer rounded-sm', focusRing)}>
            <h3 className="inline text-sm font-semibold">
              Geschiedenis ({actie.geschiedenis.length})
            </h3>
          </summary>
          {actie.geschiedenis.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Nog niets gewijzigd aan status, afhankelijkheden, gereedcriterium of bewijs.
            </p>
          ) : (
            <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
              {actie.geschiedenis.map((h) => (
                <li key={h.id}>
                  <span className="tabular-nums">{h.createdAt.slice(0, 10)}</span> · {h.veld}
                  {h.oud !== null && h.nieuw !== null && `: ${h.oud} → ${h.nieuw}`}
                  {h.reden && ` — ${h.reden}`}
                </li>
              ))}
            </ol>
          )}
        </details>

        {actie.bron !== 'seed' && (
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Verwijderen</h3>
            {teVerwijderen ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Zeker? Dit kan niet ongedaan gemaakt worden.</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bezig}
                  onClick={() => onVerzoek({ soort: 'verwijder' })}
                >
                  Verwijder
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTeVerwijderen(false)}>
                  Annuleer
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setTeVerwijderen(true)}>
                Verwijder deze actie
              </Button>
            )}
          </section>
        )}
      </SheetContent>
    </Sheet>
  )
}
