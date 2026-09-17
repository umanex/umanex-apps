/**
 * Invarianten op het bedrijfsplan, tegen een echt schema op `:memory:`.
 *
 * De opdracht noemt twaalf dingen die getest moeten worden. Elk daarvan is hieronder een
 * genummerde sectie — niet omdat een lijst afvinken op zich waarde heeft, maar omdat het
 * precies de gevallen zijn waar een plan stil fout gaat: een seed die werk overschrijft, een
 * blokkade die niet meer opengaat, een beslismoment dat zichzelf goedkeurt.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/plan-scenarios.ts
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { SCHEMA_DDL, pasKolomMigratiesToe } from '../lib/db/ddl'
import type { JobradarDb } from '../lib/sync/upsert'
import { zaaiPlan } from '../lib/plan/seed'
import {
  BEWIJS_STARTVOORWAARDEN,
  HARDE_STARTVOORWAARDEN,
  NIET_VEREIST_VOOR_START,
  SEED_ACTIES,
  SEED_AFHANKELIJKHEDEN,
  SEED_BESLISSINGEN,
  SEED_VERSIE,
} from '../lib/plan/seed-inhoud'
import { keurAfhankelijkheden, vindCirkel } from '../lib/plan/afhankelijkheden'
import { belangrijksteVolgendeActie, leidAf, vrijgekomenActies } from '../lib/plan/afleiding'
import {
  koppelBedrijf,
  legBeslissingVast,
  maakActie,
  maakIdee,
  neemIdeeOp,
  ontkoppelBedrijf,
  verwijderActie,
  volgendeVrijeKey,
  wijzigActie,
  wijzigStatus,
  zetAfhankelijkheden,
} from '../lib/plan/mutaties'
import { leesActieDetail, leesKoppelingenPerBedrijf, leesPlan, leesRuwPlan } from '../lib/plan/lees'
import { exportBestandsnaam, exporteerJson, exporteerMarkdown } from '../lib/plan/export'
import {
  herstelAannames,
  leesAannames,
  leesInstellingen,
  parseInstellingen,
  schrijfAannames,
  schrijfInstellingen,
} from '../lib/plan/instellingen'
import { formatteerInzet, maandLabel, somInzet, urenNaarDagen } from '../lib/plan/inzet'
import { keurInstellingen, keurUren, type StatusInvoer } from '../lib/plan/keuring'
import type { PlanInstellingen } from '../lib/plan/types'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

const NU = '2026-09-16T10:00:00.000Z'
const VANDAAG = '2026-09-16'
const INSTELLINGEN: PlanInstellingen = { lancering: '2027-01', urenPerDag: 8, focusLimiet: 3 }

function verseDb(): { db: JobradarDb; rauw: InstanceType<typeof Database> } {
  const rauw = new Database(':memory:')
  rauw.exec(SCHEMA_DDL)
  pasKolomMigratiesToe(rauw)
  return { db: drizzle(rauw, { schema }) as JobradarDb, rauw }
}

function gezaaid(): { db: JobradarDb; rauw: InstanceType<typeof Database> } {
  const d = verseDb()
  zaaiPlan(d.db, NU)
  return d
}

function statusInvoer(over: Partial<StatusInvoer> & Pick<StatusInvoer, 'status'>): StatusInvoer {
  return {
    reden: null,
    parkeer: null,
    startUitzondering: null,
    focusUitzondering: null,
    bewijs: null,
    links: null,
    afgerondOp: null,
    wachtreden: null,
    herbekijkOp: null,
    ...over,
  }
}

function versie(db: JobradarDb, key: string): number {
  return (
    db.select().from(schema.planActions).where(eq(schema.planActions.key, key)).limit(1).get()
      ?.versie ?? 0
  )
}

function status(db: JobradarDb, key: string): string {
  return (
    db.select().from(schema.planActions).where(eq(schema.planActions.key, key)).limit(1).get()
      ?.status ?? '(geen rij)'
  )
}

/** Zet een actie op gereed langs de normale weg, inclusief bewijs. */
function rondAf(db: JobradarDb, key: string, bewijs = 'bewijsje'): void {
  wijzigStatus(db, key, versie(db, key), statusInvoer({ status: 'gereed', bewijs }), INSTELLINGEN, VANDAAG, NU)
}

function start(db: JobradarDb, key: string, over: Partial<StatusInvoer> = {}) {
  return wijzigStatus(
    db,
    key,
    versie(db, key),
    statusInvoer({ status: 'bezig', ...over }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
}

// ── 1. De tabellen bestaan ───────────────────────────────────────────────────
{
  const { rauw } = verseDb()
  const namen = (
    rauw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  ).map((r) => r.name)
  for (const t of [
    'plan_actions',
    'plan_dependencies',
    'plan_decisions',
    'plan_ideas',
    'plan_links',
    'plan_history',
  ]) {
    check(`tabel ${t} staat in de DDL`, namen.includes(t), namen.join(', '))
  }
  // Positieve controle op de meting zelf: een tabel die er niet is, hoort ook niet gevonden
  // te worden. Anders zegt het lijstje hierboven niets.
  check('een niet-bestaande tabel wordt niet gevonden', !namen.includes('plan_verzonnen'))
  rauw.close()
}

// ── 2. De seed-inhoud is intern consistent ───────────────────────────────────
{
  check('22 acties in de startinhoud', SEED_ACTIES.length === 22, String(SEED_ACTIES.length))

  const keys = SEED_ACTIES.map((a) => a.key)
  check('elke key komt één keer voor', new Set(keys).size === keys.length)
  check('de keys lopen van A01 tot A22', keys[0] === 'A01' && keys[keys.length - 1] === 'A22')

  const kanten = Object.entries(SEED_AFHANKELIJKHEDEN).flatMap(([van, naar]) =>
    naar.map((n) => ({ van, naar: n }))
  )
  check('18 afhankelijkheden', kanten.length === 18, String(kanten.length))
  for (const k of kanten) {
    check(`${k.van} → ${k.naar}: beide bestaan`, keys.includes(k.van) && keys.includes(k.naar))
  }
  for (const key of keys) {
    const eigen = SEED_AFHANKELIJKHEDEN[key] ?? []
    check(`${key} hangt niet van zichzelf af`, !eigen.includes(key))
    check(`${key} sluit geen cirkel in de startinhoud`, vindCirkel(key, eigen, kanten) === null)
  }

  const uitgesteld = SEED_ACTIES.filter((a) => a.uitgesteldOmdat)
  check('vijf acties starten uitgesteld', uitgesteld.length === 5, String(uitgesteld.length))
  check(
    'en dat zijn precies de prioriteit-4-acties',
    uitgesteld.every((a) => a.prioriteit === 4) &&
      SEED_ACTIES.filter((a) => a.prioriteit === 4).length === 5
  )
  check(
    'elke uitgestelde actie draagt een aanleiding',
    uitgesteld.every((a) => (a.uitgesteldOmdat ?? '').trim().length > 10)
  )
  check(
    'elke actie heeft een gereedcriterium',
    SEED_ACTIES.every((a) => a.gereedcriterium.trim().length > 10)
  )
  check(
    'A15 is herkenbaar als verwijstaak',
    /verwijstaak/i.test(SEED_ACTIES.find((a) => a.key === 'A15')?.context ?? '')
  )
  check(
    'A12 hangt niet van A11 af — een vroege evaluatie mag niet geblokkeerd worden',
    !(SEED_AFHANKELIJKHEDEN.A12 ?? []).includes('A11')
  )

  check('vier beslismomenten, inclusief het startbesluit', SEED_BESLISSINGEN.length === 4)
  const start = SEED_BESLISSINGEN.find((b) => b.soort === 'start')
  check('er is precies één startbesluit', SEED_BESLISSINGEN.filter((b) => b.soort === 'start').length === 1)
  check(
    'het startbesluit hangt aan de harde startvoorwaarden',
    start?.acties.join(',') === HARDE_STARTVOORWAARDEN.join(',')
  )
  for (const b of SEED_BESLISSINGEN) {
    check(`${b.key} verwijst alleen naar bestaande acties`, b.acties.every((k) => keys.includes(k)))
    check(`${b.key} stelt een vraag`, (b.vraag ?? '').trim().length > 10)
  }
  check('acht harde startvoorwaarden', HARDE_STARTVOORWAARDEN.length === 8)
  check('zes bewijs-startvoorwaarden', BEWIJS_STARTVOORWAARDEN.length === 6)
  check('A15 is niet vereist voor de start', NIET_VEREIST_VOOR_START.join(',') === 'A15')
}

// ── 3. De seed is idempotent en overschrijft geen werk ───────────────────────
{
  const { db, rauw } = verseDb()

  const eerste = zaaiPlan(db, NU)
  check('de eerste run zaait', eerste.gezaaid === true)
  const tel = () => (rauw.prepare('SELECT COUNT(*) AS n FROM plan_actions').get() as { n: number }).n
  check('22 acties na de eerste run', tel() === 22, String(tel()))

  const tweede = zaaiPlan(db, NU)
  check('de tweede run zaait niet opnieuw', tweede.gezaaid === false)
  check('nog steeds 22 acties', tel() === 22, String(tel()))
  check(
    'de seed-versie staat in settings',
    db.select().from(schema.settings).where(eq(schema.settings.key, 'plan.seed_versie')).get()
      ?.value === String(SEED_VERSIE)
  )

  // Nu het geval waarvoor de versie-poort bestaat: de gebruiker wijzigt iets, en dat mag
  // een volgende zaai-poging niet terugdraaien.
  wijzigActie(db, 'A01', versie(db, 'A01'), { titel: 'Eigen titel' }, NU)
  zetAfhankelijkheden(db, 'A13', versie(db, 'A13'), [], NU)
  start(db, 'A01')

  zaaiPlan(db, NU)
  check(
    'een bewerkte titel blijft staan',
    db.select().from(schema.planActions).where(eq(schema.planActions.key, 'A01')).get()?.titel ===
      'Eigen titel'
  )
  check(
    'een verwijderde afhankelijkheid komt niet terug',
    db
      .select()
      .from(schema.planDependencies)
      .where(eq(schema.planDependencies.actionKey, 'A13'))
      .all().length === 0
  )
  check('een gewijzigde status blijft staan', status(db, 'A01') === 'bezig')
  check('nog altijd 22 acties', tel() === 22, String(tel()))

  const zonderInzet = db
    .select()
    .from(schema.planActions)
    .all()
    .filter((a) => a.inschattingUren === null).length
  check('de seed zet inzet op onbekend, niet op nul', zonderInzet === 22, String(zonderInzet))
  rauw.close()
}

// ── 4. Blokkeren en opnieuw vrijgeven ────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  const plan = () => leidAf(leesRuwPlan(db))
  const actie = (key: string) => plan().acties.find((a) => a.key === key)

  check('A01 is beschikbaar op een vers plan', actie('A01')?.uitvoerbaarheid === 'beschikbaar')
  check('A02 is geblokkeerd', actie('A02')?.uitvoerbaarheid === 'geblokkeerd')
  check(
    'en de reden noemt A01 én zijn status',
    actie('A02')?.blokkade[0]?.reden === 'wacht op A01 (niet gestart)',
    actie('A02')?.blokkade[0]?.reden ?? '(geen)'
  )

  start(db, 'A01')
  check(
    'de reden beweegt mee met de status',
    actie('A02')?.blokkade[0]?.reden === 'wacht op A01 (bezig)',
    actie('A02')?.blokkade[0]?.reden ?? '(geen)'
  )
  check('A02 blijft geblokkeerd zolang A01 loopt', actie('A02')?.uitvoerbaarheid === 'geblokkeerd')

  rondAf(db, 'A01')
  check('A01 gereed maakt A02 beschikbaar', actie('A02')?.uitvoerbaarheid === 'beschikbaar')
  check('A02 heeft dan geen blokkade meer', actie('A02')?.blokkade.length === 0)
  check('A03 blijft geblokkeerd op A02', actie('A03')?.uitvoerbaarheid === 'geblokkeerd')
  check(
    'en A03 wacht nog op precies één actie',
    actie('A03')?.blokkade.length === 1 && actie('A03')?.blokkade[0]?.key === 'A02'
  )
  rauw.close()
}

// ── 5. Een vervallen afhankelijkheid telt nooit als afgerond ─────────────────
{
  const { db, rauw } = gezaaid()
  rondAf(db, 'A01')
  wijzigStatus(
    db,
    'A02',
    versie(db, 'A02'),
    statusInvoer({ status: 'vervallen', reden: 'niet meer nodig' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )

  const actie = (key: string) => leidAf(leesRuwPlan(db)).acties.find((a) => a.key === key)
  check('A03 blijft geblokkeerd door de vervallen A02', actie('A03')?.uitvoerbaarheid === 'geblokkeerd')
  const blok = actie('A03')?.blokkade.find((b) => b.key === 'A02')
  check('de blokkade is hard', blok?.hard === true)
  check(
    'en de reden vraagt om verwijderen of vervangen',
    /vervallen — verwijder of vervang/.test(blok?.reden ?? ''),
    blok?.reden ?? '(geen)'
  )

  const metUitzondering = start(db, 'A03', { startUitzondering: 'ik begin toch' })
  check('een startuitzondering helpt niet tegen een harde blokkade', metUitzondering.ok === false)
  check(
    'en het conflict noemt de afhankelijkheid',
    metUitzondering.ok === false &&
      metUitzondering.soort === 'conflict' &&
      metUitzondering.conflict.conflict === 'afhankelijkheid'
  )

  // Jeroen beslist: vervangen, niet stil laten vallen.
  const vervangen = zetAfhankelijkheden(db, 'A03', versie(db, 'A03'), ['A01'], NU)
  check('de afhankelijkheid vervangen lukt', vervangen.ok === true)
  check('daarna is A03 beschikbaar', actie('A03')?.uitvoerbaarheid === 'beschikbaar')

  const opVervallen = zetAfhankelijkheden(db, 'A04', versie(db, 'A04'), ['A02'], NU)
  check('een vervallen actie kan geen nieuwe afhankelijkheid worden', opVervallen.ok === false)
  rauw.close()
}

// ── 6. Cirkels en zelfverwijzing ─────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  const acties = new Map(
    db
      .select()
      .from(schema.planActions)
      .all()
      .map((a) => [a.key, { status: a.status as never }])
  )
  const kanten = db
    .select()
    .from(schema.planDependencies)
    .all()
    .map((r) => ({ van: r.actionKey, naar: r.dependsOnKey }))

  const zelf = keurAfhankelijkheden('A01', ['A01'], acties, kanten)
  check('zelfverwijzing wordt geweigerd', zelf.ok === false)
  check('en de melding zegt waarom', zelf.ok === false && /zichzelf/.test(zelf.reden))

  const onbekend = keurAfhankelijkheden('A01', ['A99'], acties, kanten)
  check('een onbekende key wordt geweigerd', onbekend.ok === false)
  check('en hij wordt bij naam genoemd', onbekend.ok === false && /A99/.test(onbekend.reden))

  const directeCirkel = keurAfhankelijkheden('A01', ['A02'], acties, kanten)
  check('A01 ← A02 sluit een cirkel (A02 hangt al van A01 af)', directeCirkel.ok === false)
  check(
    'en het pad staat in de melding',
    directeCirkel.ok === false && /A01 → A02 → A01/.test(directeCirkel.reden),
    directeCirkel.ok ? '' : directeCirkel.reden
  )

  const indirect = keurAfhankelijkheden('A01', ['A05'], acties, kanten)
  check('een indirecte cirkel (A05 ← A03 ← A01) wordt ook gevangen', indirect.ok === false)

  const mag = keurAfhankelijkheden('A01', ['A09'], acties, kanten)
  check('een onschuldige afhankelijkheid mag wél', mag.ok === true, mag.ok ? '' : mag.reden)

  check('vindCirkel geeft het pad terug', (vindCirkel('A01', ['A02'], kanten) ?? []).length === 3)
  check('en null wanneer er geen cirkel is', vindCirkel('A01', ['A09'], kanten) === null)

  const dubbel = keurAfhankelijkheden('A10', ['A09', 'A09'], acties, kanten)
  check('een dubbele opgave wordt één kant', dubbel.ok === true && dubbel.waarde.length === 1)
  rauw.close()
}

// ── 7. De focusregel ─────────────────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  check('A01 starten lukt', start(db, 'A01').ok === true)
  check('A07 starten lukt', start(db, 'A07').ok === true)
  check('A09 starten lukt', start(db, 'A09').ok === true)

  const vierde = start(db, 'A14')
  check('een vierde actie starten wordt geweigerd', vierde.ok === false)
  const conflict = vierde.ok === false && vierde.soort === 'conflict' ? vierde.conflict : null
  check('en dat is een focus-conflict', conflict?.conflict === 'focus')
  check(
    'het conflict noemt precies de drie actieve acties',
    conflict?.conflict === 'focus' &&
      conflict.actief.map((a) => a.key).join(',') === 'A01,A07,A09',
    conflict?.conflict === 'focus' ? conflict.actief.map((a) => a.key).join(',') : '—'
  )
  check('en de limiet erbij', conflict?.conflict === 'focus' && conflict.limiet === 3)
  check('A14 is niet stil gestart', status(db, 'A14') === 'niet_gestart')
  check('en geen van de drie is stil gewijzigd', status(db, 'A07') === 'bezig')

  // Parkeren: expliciet, en zichtbaar in de geschiedenis.
  const geparkeerd = start(db, 'A14', { parkeer: 'A07' })
  check('met een parkeer-opdracht lukt het wel', geparkeerd.ok === true)
  check('A14 is nu bezig', status(db, 'A14') === 'bezig')
  check('A07 is geparkeerd naar niet gestart', status(db, 'A07') === 'niet_gestart')
  const historie = db
    .select()
    .from(schema.planHistory)
    .all()
    .filter((h) => h.onderwerpKey === 'A07' && h.veld === 'status')
  // Twee regels: het starten zelf, en daarna het parkeren. Een geparkeerde actie mag geen
  // spoorloze statuswissel zijn — juist dát is wat "nooit stilzwijgend" betekent.
  check('A07 heeft twee statusregels: gestart en geparkeerd', historie.length === 2, String(historie.length))
  const parkeerRegel = historie[historie.length - 1]
  check(
    'de laatste is het parkeren',
    parkeerRegel?.oud === 'bezig' && parkeerRegel?.nieuw === 'niet_gestart',
    `${parkeerRegel?.oud} → ${parkeerRegel?.nieuw}`
  )
  check(
    'mét de reden waarom',
    /geparkeerd voor A14/.test(parkeerRegel?.reden ?? ''),
    parkeerRegel?.reden ?? '(geen)'
  )
  check(
    'A07 kreeg een versie-ophoging bij het parkeren',
    versie(db, 'A07') === 3,
    String(versie(db, 'A07'))
  )

  const onbestaand = start(db, 'A04', { parkeer: 'A02' })
  check('parkeren van een niet-actieve actie wordt geweigerd', onbestaand.ok === false)
  rauw.close()
}

// ── 7b. De uitzondering op de focusregel ─────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  start(db, 'A01')
  start(db, 'A07')
  start(db, 'A09')

  const uitzondering = start(db, 'A14', { focusUitzondering: 'deadline boekhouder' })
  check('een uitzondering met reden mag', uitzondering.ok === true)
  check('vier acties staan nu op bezig', leidAf(leesRuwPlan(db)).overzicht.nuBezig.length === 4)
  const rij = db.select().from(schema.planActions).where(eq(schema.planActions.key, 'A14')).get()
  check('de reden is vastgelegd en dus zichtbaar', rij?.focusUitzondering === 'deadline boekhouder')
  check(
    'en gelogd',
    db
      .select()
      .from(schema.planHistory)
      .all()
      .some((h) => h.veld === 'focus_uitzondering' && h.onderwerpKey === 'A14')
  )

  // De limiet is instelbaar; met twee is de derde al te veel.
  const { db: db2, rauw: rauw2 } = gezaaid()
  const streng: PlanInstellingen = { ...INSTELLINGEN, focusLimiet: 2 }
  wijzigStatus(db2, 'A01', versie(db2, 'A01'), statusInvoer({ status: 'bezig' }), streng, VANDAAG, NU)
  wijzigStatus(db2, 'A07', versie(db2, 'A07'), statusInvoer({ status: 'bezig' }), streng, VANDAAG, NU)
  const derde = wijzigStatus(
    db2,
    'A09',
    versie(db2, 'A09'),
    statusInvoer({ status: 'bezig' }),
    streng,
    VANDAAG,
    NU
  )
  check('bij een limiet van 2 wordt de derde geweigerd', derde.ok === false)
  rauw.close()
  rauw2.close()
}

// ── 8. Afronden met bewijs ───────────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()

  const zonder = wijzigStatus(
    db,
    'A01',
    versie(db, 'A01'),
    statusInvoer({ status: 'gereed' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  check('afronden zonder bewijs wordt geweigerd', zonder.ok === false)
  check('en de melding vraagt om bewijs', zonder.ok === false && /bewijs/.test(zonder.reden))
  check('de status blijft staan', status(db, 'A01') === 'niet_gestart')

  const leeg = wijzigStatus(
    db,
    'A01',
    versie(db, 'A01'),
    statusInvoer({ status: 'gereed', bewijs: '   ' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  check('en spaties tellen niet als bewijs', leeg.ok === false)

  const met = wijzigStatus(
    db,
    'A01',
    versie(db, 'A01'),
    statusInvoer({ status: 'gereed', bewijs: 'scope staat in het aanbod-document' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  check('met bewijs lukt het wel', met.ok === true)
  const rij = db.select().from(schema.planActions).where(eq(schema.planActions.key, 'A01')).get()
  check('het bewijs is bewaard', rij?.bewijs === 'scope staat in het aanbod-document')
  check('de afrondingsdatum is vandaag', rij?.afgerondOp === VANDAAG, String(rij?.afgerondOp))
  check(
    'en beide wijzigingen staan in de geschiedenis',
    db
      .select()
      .from(schema.planHistory)
      .all()
      .filter((h) => h.onderwerpKey === 'A01' && ['status', 'bewijs'].includes(h.veld)).length === 2
  )

  const { db: db2, rauw: rauw2 } = gezaaid()
  wijzigStatus(
    db2,
    'A01',
    1,
    statusInvoer({ status: 'gereed', bewijs: 'klaar', afgerondOp: '2026-05-04' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  check(
    'een eigen afrondingsdatum wordt overgenomen',
    db2.select().from(schema.planActions).where(eq(schema.planActions.key, 'A01')).get()
      ?.afgerondOp === '2026-05-04'
  )
  rauw.close()
  rauw2.close()
}

// ── 9. Heropenen behoudt het bewijs en waarschuwt de afhankelijken ──────────
{
  const { db, rauw } = gezaaid()
  rondAf(db, 'A01', 'het aanbod-document van 3 mei')
  start(db, 'A02')

  const heropend = start(db, 'A01')
  check('heropenen van een afgeronde actie lukt', heropend.ok === true)
  const rij = db.select().from(schema.planActions).where(eq(schema.planActions.key, 'A01')).get()
  check('het bewijs blijft staan', rij?.bewijs === 'het aanbod-document van 3 mei')
  check('de afrondingsdatum blijft staan', rij?.afgerondOp === VANDAAG)

  const a02 = leidAf(leesRuwPlan(db)).acties.find((a) => a.key === 'A02')
  check('A02 verandert niet stil van status', a02?.status === 'bezig')
  check(
    'maar krijgt wel een signaal',
    a02?.signalen.some((s) => s.soort === 'afhankelijkheid_heropend' && s.key === 'A01') === true,
    JSON.stringify(a02?.signalen)
  )
  check(
    'en een regel in zijn geschiedenis',
    db
      .select()
      .from(schema.planHistory)
      .all()
      .some((h) => h.onderwerpKey === 'A02' && h.veld === 'afhankelijkheid_heropend')
  )

  // Een afhankelijke die nog niet gestart is, krijgt geen signaal: die is gewoon weer
  // geblokkeerd, en dat is de normale toestand — geen alarm.
  const a04 = leidAf(leesRuwPlan(db)).acties.find((a) => a.key === 'A04')
  check('een niet-gestarte afhankelijke krijgt geen signaal', a04?.signalen.length === 0)
  check('maar is wel weer geblokkeerd', a04?.uitvoerbaarheid === 'geblokkeerd')
  rauw.close()
}

// ── 10. Bewust eerder starten, met vastgelegde uitzondering ─────────────────
{
  const { db, rauw } = gezaaid()
  start(db, 'A01')

  const geweigerd = start(db, 'A02')
  check('A02 starten terwijl A01 loopt wordt geweigerd', geweigerd.ok === false)
  check(
    'met een afhankelijkheids-conflict',
    geweigerd.ok === false &&
      geweigerd.soort === 'conflict' &&
      geweigerd.conflict.conflict === 'afhankelijkheid'
  )

  const toch = start(db, 'A02', { startUitzondering: 'A01 is inhoudelijk rond' })
  check('met een vastgelegde reden mag het wel', toch.ok === true)
  const a02 = leidAf(leesRuwPlan(db)).acties.find((a) => a.key === 'A02')
  check('de uitzondering is zichtbaar als signaal', a02?.signalen.some((s) => s.soort === 'gestart_met_uitzondering') === true)
  check(
    'en gelogd',
    db
      .select()
      .from(schema.planHistory)
      .all()
      .some((h) => h.onderwerpKey === 'A02' && h.veld === 'start_uitzondering')
  )
  rauw.close()
}

// ── 11. Versie-conflicten ────────────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  const eerste = wijzigActie(db, 'A01', 1, { titel: 'Nieuwe titel' }, NU)
  check('de eerste wijziging lukt', eerste.ok === true)
  check('en verhoogt de versie', versie(db, 'A01') === 2)

  const tweede = wijzigActie(db, 'A01', 1, { titel: 'Nog een titel' }, NU)
  check('dezelfde versie een tweede keer wordt geweigerd', tweede.ok === false)
  check(
    'met de huidige versie erbij, zodat de client kan herladen',
    tweede.ok === false && tweede.soort === 'conflict' && tweede.conflict.conflict === 'versie' &&
      tweede.conflict.versie === 2
  )
  check(
    'en de titel is niet overschreven',
    db.select().from(schema.planActions).where(eq(schema.planActions.key, 'A01')).get()?.titel ===
      'Nieuwe titel'
  )

  const statusConflict = wijzigStatus(
    db,
    'A01',
    1,
    statusInvoer({ status: 'bezig' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  check('ook een statuswissel vraagt de juiste versie', statusConflict.ok === false)

  const beslissing = legBeslissingVast(db, 'B01', 1, { beslissing: 'ja' }, NU)
  check('een beslissing vastleggen lukt', beslissing.ok === true)
  const nogmaals = legBeslissingVast(db, 'B01', 1, { beslissing: 'nee' }, NU)
  check('en een verouderde versie wordt ook daar geweigerd', nogmaals.ok === false)
  rauw.close()
}

// ── 12. Uitgesteld werk staat buiten de actieve achterstand ─────────────────
{
  const { db, rauw } = gezaaid()
  const o = leidAf(leesRuwPlan(db)).overzicht

  check('vijf acties staan uitgesteld', o.uitgesteld.length === 5, o.uitgesteld.join(','))
  check('geen van hen staat bij beschikbaar', !o.uitgesteld.some((k) => o.beschikbaar.includes(k)))
  check('en geen van hen bij geblokkeerd', !o.uitgesteld.some((k) => o.geblokkeerd.includes(k)))
  check('en niet bij nu bezig', o.nuBezig.length === 0)

  const totaal = o.voortgang.reduce((n, g) => n + g.totaal, 0)
  check('de voortgang telt alle 22 acties', totaal === 22, String(totaal))
  for (const g of o.voortgang) {
    check(
      `prioriteit ${g.prioriteit} draagt alle zes statussen in de telling`,
      Object.keys(g.perStatus).length === 6
    )
    check(`prioriteit ${g.prioriteit} zegt dat de telling ongewogen is`, g.toelichting === 'aantal acties, ongewogen')
  }
  const p4 = o.voortgang.find((g) => g.prioriteit === 4)
  check('prioriteit 4 telt vijf uitgestelde acties', p4?.perStatus.uitgesteld === 5)

  // Een vervallen actie is geen werk meer en valt uit het totaal.
  wijzigStatus(
    db,
    'A22',
    versie(db, 'A22'),
    statusInvoer({ status: 'vervallen', reden: 'niet meer aan de orde' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  const na = leidAf(leesRuwPlan(db)).overzicht.voortgang.find((g) => g.prioriteit === 4)
  check('een vervallen actie valt uit het totaal', na?.totaal === 4, String(na?.totaal))
  check('maar blijft wel zichtbaar in de statustelling', na?.perStatus.vervallen === 1)

  const zonderReden = wijzigStatus(
    db,
    'A21',
    versie(db, 'A21'),
    statusInvoer({ status: 'vervallen' }),
    INSTELLINGEN,
    VANDAAG,
    NU
  )
  check('vervallen zonder reden wordt geweigerd', zonderReden.ok === false)
  rauw.close()
}

// ── 13. Onbekende inzet is niet nul ──────────────────────────────────────────
{
  check('een lege string is onbekend', keurUren('').ok === true && keurUren('').ok && (keurUren('') as { waarde: number | null }).waarde === null)
  check('null is onbekend', (keurUren(null) as { ok: true; waarde: number | null }).waarde === null)
  const nul = keurUren(0)
  check('nul uren wordt geweigerd', nul.ok === false)
  check('en de melding wijst naar leeg laten', nul.ok === false && /leeg/.test(nul.reden))
  check('negatief wordt geweigerd', keurUren(-3).ok === false)
  const twaalf = keurUren('12')
  check('een getal als tekst wordt overgenomen', twaalf.ok === true && twaalf.waarde === 12)
  check('een komma-getal ook', (keurUren('1,5') as { ok: true; waarde: number }).waarde === 1.5)

  check('onbekend blijft onbekend in dagen', urenNaarDagen(null, 8) === null)
  check('12 uur bij 8 u/dag is 1,5 dag', urenNaarDagen(12, 8) === 1.5)
  check('onbekend leest als "onbekend"', formatteerInzet(null, 8) === 'onbekend')
  check('en 12 uur leest als "12 u · 1,5 d"', formatteerInzet(12, 8) === '12 u · 1,5 d', formatteerInzet(12, 8))

  const som = somInzet([12, null, 4, null, null])
  check('de som telt alleen wat bekend is', som.bekendUren === 16, String(som.bekendUren))
  check('en draagt zijn noemer: 2 bekend', som.aantalBekend === 2)
  check('en 3 onbekend', som.aantalOnbekend === 3)
  const alleenOnbekend = somInzet([null, null])
  check('nul bekende uren is niet hetzelfde als nul werk', alleenOnbekend.bekendUren === 0 && alleenOnbekend.aantalOnbekend === 2)
}

// ── 14. Beslismomenten worden nooit automatisch goedgekeurd ─────────────────
{
  const { db, rauw } = gezaaid()
  const beslissing = (key: string) => leidAf(leesRuwPlan(db)).beslissingen.find((b) => b.key === key)

  check('B01 wacht op zijn acties', beslissing('B01')?.afgeleid === 'wacht')
  check('en telt ze: 0 van 6', beslissing('B01')?.gereed === 0 && beslissing('B01')?.totaal === 6)

  for (const k of ['A01', 'A02', 'A03', 'A04', 'A05', 'A06']) rondAf(db, k)
  check('met alle acties gereed is B01 klaar voor beoordeling', beslissing('B01')?.afgeleid === 'klaar_voor_beoordeling')
  check('maar níet beslist', beslissing('B01')?.beslissing === null)
  check('en zonder datum', beslissing('B01')?.beslistOp === null)

  const vast = legBeslissingVast(
    db,
    'B01',
    versie2(db, 'B01'),
    { beslissing: 'ja, we kunnen offreren', onderbouwing: 'scope en prijs staan' },
    NU
  )
  check('een beslissing vastleggen lukt', vast.ok === true, vast.ok ? '' : vast.reden)
  check('daarna is de stand "beslist"', beslissing('B01')?.afgeleid === 'beslist')
  check('en is de datum ingevuld', beslissing('B01')?.beslistOp === VANDAAG)
  check(
    'de beslissing staat in de geschiedenis',
    db
      .select()
      .from(schema.planHistory)
      .all()
      .some((h) => h.onderwerpType === 'beslissing' && h.onderwerpKey === 'B01')
  )

  // Het startbesluit: hetzelfde regime, ook als alle harde voorwaarden gereed zijn.
  for (const k of ['A13', 'A14']) rondAf(db, k)
  const startbesluit = leidAf(leesRuwPlan(db)).overzicht.startvoorwaarden
  check('alle acht harde voorwaarden zijn gereed', startbesluit.hardGereed === 8, String(startbesluit.hardGereed))
  check(
    'het startbesluit is klaar voor beoordeling',
    startbesluit.startbesluit?.afgeleid === 'klaar_voor_beoordeling'
  )
  check('maar niet genomen', startbesluit.startbesluit?.beslissing === null)
  check('de bewijs-voorwaarden staan er los naast', startbesluit.bewijs.length === 6)
  check('en A15 staat bij niet vereist', startbesluit.nietVereist[0]?.key === 'A15')
  rauw.close()
}

function versie2(db: JobradarDb, key: string): number {
  return (
    db.select().from(schema.planDecisions).where(eq(schema.planDecisions.key, key)).limit(1).get()
      ?.versie ?? 0
  )
}

// ── 15. De eerstvolgende actie ───────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  const plan = () => leidAf(leesRuwPlan(db))

  check('op een vers plan is A01 de eerstvolgende', plan().overzicht.volgendeActie?.key === 'A01')
  check('omdat hij beschikbaar is', plan().overzicht.volgendeActie?.reden === 'beschikbaar')

  start(db, 'A07')
  check('een lopende actie wint van een beschikbare', plan().overzicht.volgendeActie?.key === 'A07')
  check(
    'en zegt dat er geen volgende stap staat',
    plan().overzicht.volgendeActie?.reden === 'actief_zonder_stap'
  )

  wijzigActie(db, 'A07', versie(db, 'A07'), { volgendeStap: 'lijst van 20 bedrijven maken' }, NU)
  check('met een volgende stap verandert de reden', plan().overzicht.volgendeActie?.reden === 'actief')

  start(db, 'A01', {})
  wijzigActie(db, 'A01', versie(db, 'A01'), { volgendeStap: 'scope schrijven' }, NU)
  check(
    'bij twee lopende acties wint de laagste prioriteit/volgorde',
    plan().overzicht.volgendeActie?.key === 'A01'
  )

  check('belangrijksteVolgendeActie geeft null op een lege lijst', belangrijksteVolgendeActie([]) === null)
  rauw.close()
}

// ── 16. Ideeën worden niet vanzelf een actie ────────────────────────────────
{
  const { db, rauw } = gezaaid()
  const idee = maakIdee(db, { titel: 'Nieuwsbrief opzetten', notitie: 'ooit' }, NU)
  check('een idee aanmaken lukt', idee.ok === true)
  check('en staat op open', idee.ok === true && idee.waarde.status === 'open')
  check('het plan telt nog steeds 22 acties', leesPlan(db, NU).acties.length === 22)

  const id = idee.ok ? idee.waarde.id : 0
  const opgenomen = neemIdeeOp(db, id, 2, NU)
  check('opnemen in het plan lukt', opgenomen.ok === true)
  check('de nieuwe actie krijgt een eigen key', opgenomen.ok === true && opgenomen.waarde.actie.key === 'E01')
  check('met de gekozen prioriteit', opgenomen.ok === true && opgenomen.waarde.actie.prioriteit === 2)
  check('en herkenbare herkomst', opgenomen.ok === true && opgenomen.waarde.actie.bron === 'idee')
  check('het idee is nu opgenomen', opgenomen.ok === true && opgenomen.waarde.idee.status === 'opgenomen')
  check('met een verwijzing naar de actie', opgenomen.ok === true && opgenomen.waarde.idee.opgenomenAls === 'E01')
  check('het plan telt nu 23 acties', leesPlan(db, NU).acties.length === 23)

  const nogmaals = neemIdeeOp(db, id, 3, NU)
  check('een tweede keer opnemen wordt geweigerd', nogmaals.ok === false)

  // De E-reeks staat los van de A-reeks: een eigen actie kan nooit een seed-key bezetten, ook
  // niet wanneer `SEED_VERSIE` er later bijkomen. Dat is de hele reden dat hij bestaat.
  check('eigen acties tellen in hun eigen reeks', volgendeVrijeKey(['A01', 'A22', 'E01']) === 'E02')
  check('en negeren de seed-reeks volledig', volgendeVrijeKey(['A01', 'A22', 'A23']) === 'E01')
  check('en begint bij E01 op een lege lijst', volgendeVrijeKey([]) === 'E01')
  check('en negeert beslissings-keys', volgendeVrijeKey(['B01', 'START']) === 'E01')
  rauw.close()
}

// ── 17. Koppelingen naar bestaande bedrijven, zonder duplicaten ─────────────
{
  const { db, rauw } = gezaaid()
  rauw
    .prepare(
      `INSERT INTO companies (id, external_id, source, company_name, postcode, region, dedupe_hash, first_seen_at, last_seen_at)
       VALUES (1, 'x1', 'vacatures', 'Testbedrijf', 8000, 'WVL', 'h1', ?, ?)`
    )
    .run(NU, NU)

  const eerste = koppelBedrijf(db, 'A07', 'lead', '1', NU)
  check('een lead koppelen lukt', eerste.ok === true)
  check('en is nieuw', eerste.ok === true && eerste.waarde.nieuw === true)

  const tweede = koppelBedrijf(db, 'A07', 'lead', '1', NU)
  check('dezelfde koppeling een tweede keer lukt ook', tweede.ok === true)
  check('maar meldt dat hij niet nieuw is', tweede.ok === true && tweede.waarde.nieuw === false)
  check(
    'en levert geen tweede rij',
    db.select().from(schema.planLinks).all().length === 1,
    String(db.select().from(schema.planLinks).all().length)
  )

  check('een onbekend bedrijf wordt geweigerd', koppelBedrijf(db, 'A07', 'lead', '999', NU).ok === false)
  check('een onbekende actie ook', koppelBedrijf(db, 'A99', 'lead', '1', NU).ok === false)
  check(
    'een prospect-nummer moet tien cijfers hebben',
    koppelBedrijf(db, 'A07', 'prospect', '123', NU).ok === false
  )
  check(
    'een geldig ondernemingsnummer mag zonder spiegel',
    koppelBedrijf(db, 'A07', 'prospect', '0747501103', NU).ok === true
  )

  // Een lead met id 1 en een prospect met nummer 1 zijn verschillende bedrijven — de
  // samengestelde sleutel houdt ze uit elkaar, net als bij contact_moments.
  const perBedrijf = leesKoppelingenPerBedrijf(db)
  check('de sleutel draagt het soort bedrijf', perBedrijf['lead:1']?.join(',') === 'A07')
  check('en de prospect staat apart', perBedrijf['prospect:0747501103']?.join(',') === 'A07')

  const actie = leesActieDetail(db, 'A07')
  check('de actie toont zijn koppelingen', actie?.koppelingen.length === 2)
  check(
    'met de opgezochte naam voor de lead',
    actie?.koppelingen.find((k) => k.subjectType === 'lead')?.naam === 'Testbedrijf'
  )
  check(
    'en null voor een prospect die alleen in de spiegel bestaat',
    actie?.koppelingen.find((k) => k.subjectType === 'prospect')?.naam === null
  )

  ontkoppelBedrijf(db, 'A07', 'lead', '1')
  check('ontkoppelen laat één rij over', db.select().from(schema.planLinks).all().length === 1)
  check(
    'en het bedrijf zelf blijft bestaan',
    db.select().from(schema.companies).where(eq(schema.companies.id, 1)).get()?.companyName ===
      'Testbedrijf'
  )
  rauw.close()
}

// ── 18. Verwijderen ──────────────────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  const seed = verwijderActie(db, 'A01')
  check('een seed-actie verwijderen wordt geweigerd', seed.ok === false)
  check('met de suggestie om hem te laten vervallen', seed.ok === false && /vervallen/.test(seed.reden))

  const eigen = maakActie(
    db,
    { titel: 'Eigen actie', prioriteit: 3, beschrijving: null, resultaat: null, gereedcriterium: null, volgendeStap: null },
    'eigen',
    NU
  )
  const key = eigen.ok ? eigen.waarde.key : ''
  zetAfhankelijkheden(db, key, versie(db, key), ['A01'], NU)
  koppelBedrijf(db, key, 'prospect', '0747501103', NU)

  const weg = verwijderActie(db, key)
  check('een eigen actie verwijderen lukt', weg.ok === true)
  check(
    'de rij is weg',
    db.select().from(schema.planActions).where(eq(schema.planActions.key, key)).get() === undefined
  )
  check(
    'zijn afhankelijkheden ook',
    db.select().from(schema.planDependencies).all().filter((k) => k.actionKey === key).length === 0
  )
  check(
    'en zijn koppelingen',
    db.select().from(schema.planLinks).all().filter((l) => l.actionKey === key).length === 0
  )
  check(
    'maar de geschiedenis blijft',
    db.select().from(schema.planHistory).all().some((h) => h.onderwerpKey === key)
  )
  rauw.close()
}

// ── 19. Export ───────────────────────────────────────────────────────────────
{
  const { db, rauw } = gezaaid()
  rondAf(db, 'A01', 'het aanbod-document')
  start(db, 'A02')
  wijzigActie(db, 'A02', versie(db, 'A02'), { volgendeStap: 'drie trajecten naast elkaar leggen' }, NU)

  const plan = leesPlan(db, NU)
  const md = exporteerMarkdown(plan, VANDAAG)
  for (const stuk of [
    'Bedrijfsplan 2027',
    'januari 2027',
    'A01',
    'A22',
    'B01',
    'Startvoorwaarden',
    'drie trajecten naast elkaar leggen',
    'het aanbod-document',
    'Bewust uitgesteld',
    'Planningsaannames',
    'ongewogen',
  ]) {
    check(`de markdown-export bevat "${stuk}"`, md.includes(stuk))
  }
  check('de export noemt de aannames voorlopig', /Voorlopig, nog te toetsen/.test(md))
  check(
    'een niet-beslist beslismoment zegt dat ook',
    /Nog niet beslist/.test(md)
  )
  check('twee keer exporteren geeft identieke tekst', exporteerMarkdown(plan, VANDAAG) === md)

  const json = exporteerJson(plan, VANDAAG)
  check('de json-export draagt 22 acties', json.acties.length === 22)
  check('met hun afgeleide uitvoerbaarheid', json.acties.every((a) => typeof a.uitvoerbaarheid === 'string'))
  check('en de blokkade-redenen', json.acties.find((a) => a.key === 'A03')?.blokkade.length === 1)
  check('vier beslismomenten', json.beslissingen.length === 4)
  check('het startbesluit is niet genomen', json.startvoorwaarden.startbesluitGenomen === false)
  check('de aannames zijn gemarkeerd als voorlopig', json.aannamesZijnVoorlopig === true)
  check('de bestandsnaam draagt de datum', exportBestandsnaam('md', VANDAAG) === 'bedrijfsplan-2027-2026-09-16.md')
  rauw.close()
}

// ── 20. Instellingen en aannames ─────────────────────────────────────────────
{
  const { db, rauw } = verseDb()
  check('zonder rij gelden de standaarden', leesInstellingen(db).lancering === '2027-01')
  check('met 8 uur per dag', leesInstellingen(db).urenPerDag === 8)
  check('en een focuslimiet van 3', leesInstellingen(db).focusLimiet === 3)

  check('kapotte JSON valt terug op de standaard', parseInstellingen('{niet-json').urenPerDag === 8)
  check(
    'een half kapot object valt per veld terug',
    parseInstellingen('{"lancering":"2028-03","urenPerDag":0}').lancering === '2028-03' &&
      parseInstellingen('{"lancering":"2028-03","urenPerDag":0}').urenPerDag === 8
  )

  schrijfInstellingen(db, { lancering: '2027-03', urenPerDag: 6, focusLimiet: 2 }, NU)
  check('een geschreven instelling wordt teruggelezen', leesInstellingen(db).urenPerDag === 6)

  check('uren per dag van 0 wordt geweigerd', keurInstellingen({ lancering: '2027-01', urenPerDag: 0, focusLimiet: 3 }).ok === false)
  check('een focuslimiet van 0 ook', keurInstellingen({ lancering: '2027-01', urenPerDag: 8, focusLimiet: 0 }).ok === false)
  check('een maand 13 ook', keurInstellingen({ lancering: '2027-13', urenPerDag: 8, focusLimiet: 3 }).ok === false)
  check('een geldige combinatie wordt aanvaard', keurInstellingen({ lancering: '2027-01', urenPerDag: 8, focusLimiet: 3 }).ok === true)

  check('de standaard-aannames zijn herkenbaar als standaard', leesAannames(db).isStandaard === true)
  check('en noemen de vier aanbiedingen', /Productdiagnose[\s\S]*Design system/.test(leesAannames(db).tekst))
  schrijfAannames(db, 'eigen tekst', NU)
  check('een eigen tekst is niet de standaard', leesAannames(db).isStandaard === false)
  herstelAannames(db)
  check('herstellen zet hem terug op de standaard', leesAannames(db).isStandaard === true)

  check('maandLabel zet 2027-01 om naar januari 2027', maandLabel('2027-01') === 'januari 2027')
  check('en 2026-12 naar december 2026', maandLabel('2026-12') === 'december 2026')
  check('onzin blijft onzin', maandLabel('kwartaal') === 'kwartaal')
  rauw.close()
}

// ── 21. Het volledige plan lezen ─────────────────────────────────────────────
{
  const { db, rauw } = verseDb()
  const plan = leesPlan(db, NU)
  check('leesPlan zaait zelf', plan.acties.length === 22)
  check('en levert de vier beslismomenten', plan.beslissingen.length === 4)
  check('met een leeg ideeën-lijstje', plan.ideeen.length === 0)
  check('en het overzicht erbij', plan.overzicht.voortgang.length === 4)
  check('de seed-versie staat erin', plan.seedVersie === SEED_VERSIE)

  const detail = leesActieDetail(db, 'A02')
  check('een actiedetail draagt zijn afhankelijkheden', detail?.afhankelijkheden.join(',') === 'A01')
  check('en weet wie van hem afhangt', detail?.afhankelijken.join(',') === 'A03')
  check('met een lege geschiedenis op een vers plan', detail?.geschiedenis.length === 0)
  check('een onbekende key geeft null', leesActieDetail(db, 'A99') === null)
  rauw.close()
}

// ── 22. Een weigering laat de database ongemoeid ─────────────────────────────
// De generieke invariant, en de enige die deze klasse afdekt. `db.transaction` van
// better-sqlite3 rolt alleen terug wanneer de callback WERPT; een teruggegeven foutobject is
// voor de driver een geslaagde callback, dus alles wat er vóór dat `return` geschreven is,
// commit gewoon. Gemeten 2026-09-16: een start met een vastgelegde uitzondering die daarna op
// de focuslimiet strandde gaf netjes 409 — en liet een geschiedenisregel `start_uitzondering`
// achter voor een actie waarvan de kolom leeg bleef. Erger dan een ontbrekende regel: hij is
// niet van een echte te onderscheiden.
//
// Elke check hieronder eist eerst dat de mutatie ook werkelijk geweigerd wordt. Een geval dat
// stilletjes slaagt meet niets, en zou hier als groen doorgaan.
{
  const { db, rauw } = gezaaid()
  const snapshot = () =>
    JSON.stringify([
      rauw.prepare('SELECT * FROM plan_actions ORDER BY key').all(),
      rauw.prepare('SELECT * FROM plan_history ORDER BY id').all(),
      rauw.prepare('SELECT * FROM plan_dependencies ORDER BY action_key, depends_on_key').all(),
      rauw.prepare('SELECT * FROM plan_decisions ORDER BY key').all(),
      rauw.prepare('SELECT * FROM plan_links ORDER BY action_key, subject_type, subject_key').all(),
      rauw.prepare('SELECT * FROM plan_ideas ORDER BY id').all(),
    ])

  for (const k of ['A01', 'A07', 'A09']) start(db, k)

  const gevallen: [string, () => { ok: boolean }][] = [
    // Het gemeten geval: de uitzondering wordt weggeschreven vóór de focuscontrole valt.
    ['start met uitzondering, maar de focuslimiet is vol', () =>
      start(db, 'A02', { startUitzondering: 'ik begin toch' })],
    ['afronden zonder bewijs', () =>
      wijzigStatus(db, 'A04', versie(db, 'A04'), statusInvoer({ status: 'gereed' }), INSTELLINGEN, VANDAAG, NU)],
    ['uitstellen zonder aanleiding', () =>
      wijzigStatus(db, 'A04', versie(db, 'A04'), statusInvoer({ status: 'uitgesteld' }), INSTELLINGEN, VANDAAG, NU)],
    ['vervallen zonder reden', () =>
      wijzigStatus(db, 'A04', versie(db, 'A04'), statusInvoer({ status: 'vervallen' }), INSTELLINGEN, VANDAAG, NU)],
    ['een verouderde versie', () =>
      wijzigStatus(db, 'A04', versie(db, 'A04') + 7, statusInvoer({ status: 'bezig' }), INSTELLINGEN, VANDAAG, NU)],
    ['een afhankelijkheid die een cirkel sluit', () =>
      zetAfhankelijkheden(db, 'A01', versie(db, 'A01'), ['A02'], NU)],
    ['een seed-actie verwijderen', () => verwijderActie(db, 'A01')],
    ['koppelen aan een onbekend bedrijf', () => koppelBedrijf(db, 'A07', 'lead', '999', NU)],
    ['een beslissing met een onbekende actie', () =>
      legBeslissingVast(db, 'B01', 1, { acties: ['A99'] }, NU)],
  ]

  for (const [naam, fn] of gevallen) {
    const voor = snapshot()
    const uitkomst = fn()
    check(`${naam}: wordt geweigerd`, uitkomst.ok === false, 'werd aanvaard — dit geval meet niets')
    check(`${naam}: laat de database ongemoeid`, snapshot() === voor)
  }
  rauw.close()
}

// ── 23. Afronden noemt precies wat er vrijkomt ──────────────────────────────
// Over het hele model, niet één voorbeeld: voor élke seed-actie X op een verse seed. Het orakel
// leest de seed-constanten, niet `uitvoerbaarheidVan` — anders vergelijkt de check de functie
// met zichzelf. Op een verse seed is geen enkele actie gereed of vervallen en heeft niemand een
// startuitzondering, dus "vrij" betekent daar: niet gestart, en X is de enige afhankelijkheid.
{
  const seedStatus = new Map(
    SEED_ACTIES.map((a) => [a.key, a.uitgesteldOmdat ? 'uitgesteld' : 'niet_gestart'])
  )
  let metGevolg = 0
  let totaalVrij = 0
  for (const x of SEED_ACTIES.map((a) => a.key)) {
    const verwacht = SEED_ACTIES.map((a) => a.key)
      .filter((y) => {
        const deps = SEED_AFHANKELIJKHEDEN[y] ?? []
        return seedStatus.get(y) === 'niet_gestart' && deps.length === 1 && deps[0] === x
      })
      .sort()

    const { db, rauw } = gezaaid()
    const voor = leesPlan(db, NU).acties
    rondAf(db, x)
    check(`23 ${x}: rondt af`, status(db, x) === 'gereed', status(db, x))
    const kreeg = vrijgekomenActies(voor, leesPlan(db, NU).acties).sort()
    check(
      `23 ${x}: vrijgekomen = acties met ${x} als enige afhankelijkheid`,
      JSON.stringify(kreeg) === JSON.stringify(verwacht),
      `verwacht [${verwacht}], kreeg [${kreeg}]`
    )
    if (verwacht.length > 0) metGevolg++
    totaalVrij += kreeg.length
    rauw.close()
  }
  // Positieve controle op het orakel zelf: zonder één actie met gevolg zou "leeg = leeg" 22 keer
  // slagen en niets meten. A01 geeft er op de seed van 2026-09-16 drie (A02, A04, A13).
  check('23: minstens één actie heeft een gevolg', metGevolg > 0, `${metGevolg} van ${SEED_ACTIES.length}`)
  check('23: A01 geeft A02, A04 en A13', (() => {
    const { db, rauw } = gezaaid()
    const voor = leesPlan(db, NU).acties
    rondAf(db, 'A01')
    const k = vrijgekomenActies(voor, leesPlan(db, NU).acties).sort().join(',')
    rauw.close()
    return k === 'A02,A04,A13'
  })())
  console.log(`  23: ${metGevolg} van ${SEED_ACTIES.length} acties geven vrij, ${totaalVrij} in totaal`)

  // Wat al beschikbaar was, telt niet als vrijgekomen. Het scherpe geval is een geparkeerde actie
  // mét startuitzondering: niet gestart, alle afhankelijkheden straks gereed — een implementatie
  // die de afhankelijkheden afloopt in plaats van de uitvoerbaarheid te vergelijken, noemt haar
  // wél. Een lopende actie (de eerste vorm van deze check) valt al weg op de status en kon dat
  // defect dus niet vangen (design-review 2026-09-17).
  {
    const { db, rauw } = gezaaid()
    start(db, 'A01')
    start(db, 'A02', { startUitzondering: 'inhoudelijk rond' })
    wijzigStatus(db, 'A02', versie(db, 'A02'), statusInvoer({ status: 'niet_gestart' }), INSTELLINGEN, VANDAAG, NU)
    const voor = leesPlan(db, NU).acties
    const a02voor = voor.find((a) => a.key === 'A02')
    check(
      '23: opstelling — A02 is geparkeerd mét uitzondering en al beschikbaar',
      a02voor?.status === 'niet_gestart' && Boolean(a02voor.startUitzondering) && a02voor.uitvoerbaarheid === 'beschikbaar',
      `${a02voor?.status} / ${a02voor?.startUitzondering} / ${a02voor?.uitvoerbaarheid}`
    )
    rondAf(db, 'A01')
    const na = vrijgekomenActies(voor, leesPlan(db, NU).acties)
    check('23: een geparkeerde actie die al beschikbaar was, telt niet', !na.includes('A02'), `[${na}]`)
    check('23: A04 en A13 komen wél vrij naast de geparkeerde A02', na.includes('A04') && na.includes('A13'), `[${na}]`)
    rauw.close()
  }

  // Een harde blokkade gaat niet open door een ándere afhankelijkheid af te ronden.
  {
    const { db, rauw } = gezaaid()
    rondAf(db, 'A01')
    rondAf(db, 'A02')
    wijzigStatus(db, 'A03', versie(db, 'A03'), statusInvoer({ status: 'vervallen', reden: 'test' }), INSTELLINGEN, VANDAAG, NU)
    const voor = leesPlan(db, NU).acties
    rondAf(db, 'A04')
    const na = vrijgekomenActies(voor, leesPlan(db, NU).acties)
    check('23: opstelling — A03 is vervallen', status(db, 'A03') === 'vervallen', status(db, 'A03'))
    check('23: A05 komt niet vrij zolang A03 vervallen is, ook als A04 gereed wordt', !na.includes('A05'), `[${na}]`)
    rauw.close()
  }
}

// ── 23b. Opeenvolgende afrondingen, tegen een orakel uit de rijen ────────────
// Over het hele model en over tijd: in twee volgordes elke actie afronden, en na elke stap
// vergelijken met wat de rijen vóór die stap zeggen. Het orakel leest status, startuitzondering
// en de kanten — nooit `uitvoerbaarheid`. Dit dekt wat een verse seed niet kan: acties met meer
// dan één afhankelijkheid waarvan de rest al gereed is (A03, A05, A10).
{
  const alleKeys = SEED_ACTIES.map((a) => a.key)
  const multi = new Set<string>()
  let stappen = 0
  for (const [naam, volgorde] of [
    ['A01→A22', alleKeys],
    ['A22→A01', [...alleKeys].reverse()],
  ] as const) {
    const { db, rauw } = gezaaid()
    for (const x of volgorde) {
      const rijen = db.select().from(schema.planActions).all()
      const perKey = new Map(rijen.map((r) => [r.key, r]))
      const verwacht = rijen
        .filter((y) => {
          const deps = SEED_AFHANKELIJKHEDEN[y.key] ?? []
          return (
            y.status === 'niet_gestart' &&
            !y.startUitzondering &&
            deps.includes(x) &&
            deps.every((d) => d === x || perKey.get(d)?.status === 'gereed')
          )
        })
        .map((y) => y.key)
        .sort()
      const voor = leesPlan(db, NU).acties
      rondAf(db, x)
      const kreeg = vrijgekomenActies(voor, leesPlan(db, NU).acties).sort()
      check(
        `23b ${naam} ${x}: vrijgekomen = orakel`,
        JSON.stringify(kreeg) === JSON.stringify(verwacht),
        `verwacht [${verwacht}], kreeg [${kreeg}]`
      )
      for (const k of verwacht) if ((SEED_AFHANKELIJKHEDEN[k] ?? []).length > 1) multi.add(k)
      stappen++
    }
    rauw.close()
  }
  const gedekt = [...multi].sort().join(',')
  check('23b: de volgordes dekken A03, A05 en A10 (meerdere afhankelijkheden)', ['A03', 'A05', 'A10'].every((k) => multi.has(k)), gedekt)
  console.log(`  23b: ${stappen} afrondingen over twee volgordes, meervoudig gedekt: ${gedekt}`)
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
// Zonder deze regel kan een kapotte `check()` voor altijd groen melden. De runner draait
// deze suite eerst mét de vlag; die run hoort niet-nul te eindigen.
if (process.env.SCENARIO_SELFTEST === '1') {
  check('zelftest: deze check hoort te falen', false, 'opzettelijk')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
