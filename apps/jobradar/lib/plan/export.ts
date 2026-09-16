/**
 * Het plan naar buiten: Markdown om te lezen, JSON om mee verder te werken.
 *
 * Deterministisch — dezelfde toestand geeft byte-voor-byte dezelfde uitvoer, op de
 * exportdatum na. Dat maakt twee exports met `diff` vergelijkbaar, en dat is het enige wat
 * een export waard is die je een maand later opnieuw maakt.
 *
 * De export toont ook wat er níet is: een actie zonder inzet krijgt "onbekend", een
 * beslismoment zonder beslissing krijgt "nog niet beslist". Weglaten zou het document
 * completer laten ogen dan het plan is.
 */
import { maandLabel } from './inzet'
import { PRIORITEIT_LABEL } from './seed-inhoud'
import {
  BESLISMOMENT_LABEL,
  STATUS_LABEL,
  type ActieWeergave,
  type PlanWeergave,
  type Uitvoerbaarheid,
} from './types'

const UITVOERBAARHEID_LABEL: Record<Uitvoerbaarheid, string> = {
  actief: 'bezig',
  beschikbaar: 'beschikbaar',
  geblokkeerd: 'geblokkeerd',
  wacht: 'wacht op input',
  gereed: 'gereed',
  uitgesteld: 'uitgesteld',
  vervallen: 'vervallen',
}

/** Pijpen breken een Markdown-tabel; dit is de enige opmaak die de inhoud kan verstoren. */
function cel(s: string | null | undefined): string {
  if (!s) return '—'
  return s.replace(/\|/g, '\\|').replace(/\n+/g, ' ')
}

function actieRegel(a: ActieWeergave): string {
  return [
    a.key,
    cel(a.titel),
    STATUS_LABEL[a.status as keyof typeof STATUS_LABEL],
    UITVOERBAARHEID_LABEL[a.uitvoerbaarheid],
    cel(a.volgendeStap),
    a.afhankelijkheden.length > 0 ? a.afhankelijkheden.join(', ') : '—',
    a.inzet.tekst,
  ].join(' | ')
}

export function exporteerMarkdown(plan: PlanWeergave, vandaag: string): string {
  const r: string[] = []
  const perKey = new Map(plan.acties.map((a) => [a.key, a]))

  r.push('# Bedrijfsplan 2027')
  r.push('')
  r.push(
    `Voorbereiding op de start in ${maandLabel(plan.instellingen.lancering)}. Geëxporteerd op ${vandaag}.`
  )
  r.push('')

  const volgende = plan.overzicht.volgendeActie
  r.push('## Eerstvolgende actie')
  r.push('')
  if (!volgende) {
    r.push('Geen: alles is gereed, geblokkeerd of uitgesteld.')
  } else {
    const a = perKey.get(volgende.key)
    r.push(`**${volgende.key} — ${a?.titel ?? ''}**`)
    r.push('')
    r.push(
      volgende.reden === 'actief_zonder_stap'
        ? 'Deze actie loopt, maar er staat geen volgende stap bij.'
        : `Volgende stap: ${a?.volgendeStap ?? '—'}`
    )
  }
  r.push('')

  r.push('## Startvoorwaarden')
  r.push('')
  const sv = plan.overzicht.startvoorwaarden
  r.push(`Hard — moeten gereed zijn (${sv.hardGereed} van ${sv.hard.length}):`)
  r.push('')
  for (const v of sv.hard) {
    r.push(`- ${v.gereed ? '[x]' : '[ ]'} ${v.key} — ${v.titel} (${STATUS_LABEL[v.status]})`)
  }
  r.push('')
  r.push(`Bewijs — te beoordelen (${sv.bewijsGereed} van ${sv.bewijs.length} gereed):`)
  r.push('')
  for (const v of sv.bewijs) {
    r.push(`- ${v.key} — ${v.titel} (${STATUS_LABEL[v.status]})`)
  }
  r.push('')
  r.push(`Niet vereist voor de start: ${sv.nietVereist.map((v) => v.key).join(', ') || '—'}.`)
  r.push('')
  if (sv.startbesluit) {
    const b = sv.startbesluit
    r.push(
      b.beslissing
        ? `Startbesluit: ${b.beslissing} (${b.beslistOp ?? 'zonder datum'}).`
        : 'Startbesluit: nog niet genomen. Alle voorwaarden gereed betekent klaar voor beoordeling, niet goedgekeurd.'
    )
    r.push('')
  }

  for (const groep of plan.overzicht.voortgang) {
    const acties = plan.acties.filter((a) => a.prioriteit === groep.prioriteit)
    r.push(`## Prioriteit ${groep.prioriteit} — ${PRIORITEIT_LABEL[groep.prioriteit]}`)
    r.push('')
    r.push(
      `${groep.perStatus.gereed} van ${groep.totaal} gereed · ${groep.perStatus.bezig} bezig · ` +
        `${groep.geblokkeerd} geblokkeerd · ${groep.beschikbaar} beschikbaar. ` +
        `Aantal acties, ongewogen. Inzet: ${groep.inzet.bekendUren} u bekend, ${groep.inzet.aantalOnbekend} onbekend.`
    )
    r.push('')
    r.push('Key | Titel | Status | Uitvoerbaarheid | Volgende stap | Afhankelijk van | Inzet')
    r.push('--- | --- | --- | --- | --- | --- | ---')
    for (const a of acties) r.push(actieRegel(a))
    r.push('')

    const afgerond = acties.filter((a) => a.bewijs)
    if (afgerond.length > 0) {
      r.push('Bewijs bij de afgeronde acties:')
      r.push('')
      for (const a of afgerond) {
        r.push(`- **${a.key}** (${a.afgerondOp ?? 'zonder datum'}): ${cel(a.bewijs)}`)
      }
      r.push('')
    }
  }

  r.push('## Beslismomenten')
  r.push('')
  for (const b of plan.beslissingen) {
    r.push(`### ${b.key} — ${b.titel}`)
    r.push('')
    if (b.vraag) r.push(`_${b.vraag}_`)
    r.push('')
    r.push(
      `Stand: ${BESLISMOMENT_LABEL[b.afgeleid]} (${b.gereed} van ${b.totaal} gekoppelde acties gereed).`
    )
    r.push('')
    if (b.beslissing) {
      r.push(`Beslissing (${b.beslistOp ?? 'zonder datum'}): ${b.beslissing}`)
      if (b.onderbouwing) r.push(`Onderbouwing: ${b.onderbouwing}`)
      if (b.vervolgacties) r.push(`Vervolgacties: ${b.vervolgacties}`)
    } else {
      r.push('Nog niet beslist.')
    }
    r.push('')
  }

  const uitgesteld = plan.acties.filter((a) => a.status === 'uitgesteld')
  r.push('## Bewust uitgesteld')
  r.push('')
  if (uitgesteld.length === 0) r.push('Niets uitgesteld.')
  for (const a of uitgesteld) {
    r.push(`- **${a.key} — ${a.titel}**: ${cel(a.wachtreden)}`)
  }
  r.push('')

  const ideeen = plan.ideeen.filter((i) => i.status === 'open')
  r.push('## Ideeën')
  r.push('')
  if (ideeen.length === 0) r.push('Geen open ideeën.')
  for (const i of ideeen) r.push(`- ${i.titel}${i.notitie ? ` — ${i.notitie}` : ''}`)
  r.push('')

  r.push('## Planningsaannames')
  r.push('')
  r.push('Voorlopig, nog te toetsen.')
  r.push('')
  r.push(plan.aannames.tekst)
  r.push('')

  return r.join('\n')
}

export type PlanExport = {
  formaat: 'bedrijfsplan-2027'
  versie: 1
  geexporteerdOp: string
  instellingen: PlanWeergave['instellingen']
  aannames: string
  aannamesZijnVoorlopig: true
  acties: {
    key: string
    titel: string
    prioriteit: number
    status: string
    uitvoerbaarheid: string
    volgendeStap: string | null
    gereedcriterium: string | null
    bewijs: string | null
    afgerondOp: string | null
    afhankelijkheden: string[]
    blokkade: string[]
    inschattingUren: number | null
    resterendUren: number | null
    eigenaar: string
    streefdatum: string | null
    wachtreden: string | null
    herbekijkOp: string | null
    links: { label: string; url: string }[]
    focusUitzondering: string | null
    startUitzondering: string | null
    koppelingen: { type: string; key: string; naam: string | null }[]
  }[]
  beslissingen: {
    key: string
    titel: string
    vraag: string | null
    stand: string
    acties: string[]
    beslissing: string | null
    beslistOp: string | null
    onderbouwing: string | null
    vervolgacties: string | null
  }[]
  ideeen: { titel: string; notitie: string | null; status: string; opgenomenAls: string | null }[]
  startvoorwaarden: {
    hard: { key: string; gereed: boolean }[]
    bewijs: { key: string; gereed: boolean }[]
    nietVereist: string[]
    startbesluitGenomen: boolean
  }
}

export function exporteerJson(plan: PlanWeergave, vandaag: string): PlanExport {
  const sv = plan.overzicht.startvoorwaarden
  return {
    formaat: 'bedrijfsplan-2027',
    versie: 1,
    geexporteerdOp: vandaag,
    instellingen: plan.instellingen,
    aannames: plan.aannames.tekst,
    aannamesZijnVoorlopig: true,
    acties: plan.acties.map((a) => ({
      key: a.key,
      titel: a.titel,
      prioriteit: a.prioriteit,
      status: a.status,
      uitvoerbaarheid: a.uitvoerbaarheid,
      volgendeStap: a.volgendeStap,
      gereedcriterium: a.gereedcriterium,
      bewijs: a.bewijs,
      afgerondOp: a.afgerondOp,
      afhankelijkheden: a.afhankelijkheden,
      blokkade: a.blokkade.map((b) => b.reden),
      inschattingUren: a.inschattingUren,
      resterendUren: a.resterendUren,
      eigenaar: a.eigenaar,
      streefdatum: a.streefdatum,
      wachtreden: a.wachtreden,
      herbekijkOp: a.herbekijkOp,
      links: a.links,
      focusUitzondering: a.focusUitzondering,
      startUitzondering: a.startUitzondering,
      koppelingen: a.koppelingen.map((k) => ({
        type: k.subjectType,
        key: k.subjectKey,
        naam: k.naam,
      })),
    })),
    beslissingen: plan.beslissingen.map((b) => ({
      key: b.key,
      titel: b.titel,
      vraag: b.vraag,
      stand: b.afgeleid,
      acties: b.acties,
      beslissing: b.beslissing,
      beslistOp: b.beslistOp,
      onderbouwing: b.onderbouwing,
      vervolgacties: b.vervolgacties,
    })),
    ideeen: plan.ideeen.map((i) => ({
      titel: i.titel,
      notitie: i.notitie,
      status: i.status,
      opgenomenAls: i.opgenomenAls,
    })),
    startvoorwaarden: {
      hard: sv.hard.map((v) => ({ key: v.key, gereed: v.gereed })),
      bewijs: sv.bewijs.map((v) => ({ key: v.key, gereed: v.gereed })),
      nietVereist: sv.nietVereist.map((v) => v.key),
      startbesluitGenomen: (sv.startbesluit?.beslissing ?? '').trim() !== '',
    },
  }
}

export function exportBestandsnaam(formaat: 'md' | 'json', vandaag: string): string {
  return `bedrijfsplan-2027-${vandaag}.${formaat}`
}
