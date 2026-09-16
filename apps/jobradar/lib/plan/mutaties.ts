/**
 * Alles wat aan het plan schrijft.
 *
 * Drie regels dragen dit bestand:
 *
 * 1. **Synchroon.** `db.transaction` van better-sqlite3 commit zodra de callback terugkeert;
 *    een async callback geeft een Promise terug en de COMMIT zou vóór de eerste query vallen.
 *    Dus `.get()`, `.all()`, `.run()`, nooit `await` hierbinnen.
 * 2. **Versie eerst.** Elke bewerking leest de rij, vergelijkt `versie` en verhoogt hem. Zonder
 *    dat overschrijft een geopend paneel stil een wijziging die er intussen via de lijst in
 *    kwam — en hier kost dat bewijs, niet een statusje.
 * 3. **Nooit stil een ándere actie wijzigen.** Parkeren gebeurt alleen op expliciete opdracht
 *    en landt in de geschiedenis. Een afhankelijke actie die door een heropening niet meer
 *    klopt, krijgt een geschiedenisregel en een signaal — geen nieuwe status.
 */
import { and, eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { PlanActie, PlanBeslissing, PlanIdee, SubjectType } from '../db/schema'
import type { JobradarDb } from '../sync/upsert'
import { afhankelijkenVan, keurAfhankelijkheden, type Kant } from './afhankelijkheden'
import { blokkadeVan, focusConflict, parseKeys } from './afleiding'
import {
  keurBeslissingVelden,
  keurIdee,
  keurNieuweActie,
  type ActieVelden,
  type BeslissingVelden,
  type NieuweActie,
  type StatusInvoer,
} from './keuring'
import { PARKEER_STATUS, type ActieStatus, type Mutatie, type PlanInstellingen, type Prioriteit } from './types'

type Tx = JobradarDb

/**
 * Een afgewezen mutatie, als worp.
 *
 * Bestaat alleen om `inTransactie` de transactie te laten terugdraaien; hij verlaat deze
 * module nooit.
 */
class Afgewezen extends Error {
  // Een gewoon veld en geen parameter-property: Node stript types alleen, het compileert ze
  // niet, en `constructor(readonly x: T)` is syntax die een transpiler vraagt. `tsc --noEmit`
  // zegt daar niets over — de scenario-suite draait op de stripper en viel er meteen op om.
  mutatie: Mutatie<never>

  constructor(mutatie: Mutatie<never>) {
    super('afgewezen')
    this.mutatie = mutatie
  }
}

/**
 * Een mutatie in een transactie die terugdraait zodra de uitkomst niet `ok` is.
 *
 * Dit is de reden dat de helper bestaat: `db.transaction` van better-sqlite3 rolt alleen terug
 * wanneer de callback **werpt**. Een teruggegeven foutobject is voor de driver een geslaagde
 * callback, dus alles wat er vóór dat `return` geschreven is, commit gewoon.
 *
 * Gemeten 2026-09-16: een start met een vastgelegde uitzondering die daarna op de focuslimiet
 * strandde, gaf netjes 409 — en liet een geschiedenisregel `start_uitzondering` achter voor een
 * actie waarvan de kolom leeg bleef. De geschiedenis beweerde dus dat er een uitzondering was
 * vastgelegd die nooit gegolden heeft. Dat is erger dan een ontbrekende regel: hij is niet van een
 * echte te onderscheiden.
 *
 * De worp is een privé sentinel en geen echte fout: een fout van de database moet gewoon
 * doorlopen naar de aanroeper.
 */
function inTransactie<T>(db: JobradarDb, fn: (tx: Tx) => Mutatie<T>): Mutatie<T> {
  try {
    return db.transaction((tx: Tx) => {
      const uit = fn(tx)
      if (!uit.ok) throw new Afgewezen(uit as Mutatie<never>)
      return uit
    })
  } catch (e) {
    if (e instanceof Afgewezen) return e.mutatie as Mutatie<T>
    throw e
  }
}

const ongeldig = (reden: string): Mutatie<never> => ({ ok: false, soort: 'ongeldig', reden })
const onbekend = (reden: string): Mutatie<never> => ({ ok: false, soort: 'onbekend', reden })

// ---------------------------------------------------------------------------- hulpstukken

function laadActie(tx: Tx, key: string): PlanActie | undefined {
  return tx.select().from(schema.planActions).where(eq(schema.planActions.key, key)).limit(1).get()
}

function alleActies(tx: Tx): PlanActie[] {
  return tx.select().from(schema.planActions).all()
}

function alleKanten(tx: Tx): Kant[] {
  return tx
    .select()
    .from(schema.planDependencies)
    .all()
    .map((r) => ({ van: r.actionKey, naar: r.dependsOnKey }))
}

function schrijfHistorie(
  tx: Tx,
  onderwerpType: 'actie' | 'beslissing',
  onderwerpKey: string,
  veld: string,
  oud: string | null,
  nieuw: string | null,
  reden: string | null,
  nu: string
): void {
  tx.insert(schema.planHistory)
    .values({ onderwerpType, onderwerpKey, veld, oud, nieuw, reden, createdAt: nu })
    .run()
}

/**
 * De volgende vrije key voor een eigen actie: `E01`, `E02`, …
 *
 * Een eigen prefix, en niet doortellen in de `A`-reeks. De eerste versie deed dat wel — na de
 * 22 gezaaide acties werd de eerstvolgende eigen actie `A23` — en dat botst met de enige
 * gedocumenteerde manier om het plan inhoudelijk uit te breiden: `SEED_VERSIE` verhogen om
 * nieuwe keys toe te voegen. Zo'n nieuwe seed-actie `A23` wordt dan stil overgeslagen
 * (`onConflictDoNothing`), de poort springt tóch naar de nieuwe versie, en de bijbehorende
 * afhankelijkheden en startvoorwaarden landen op een eigen actie van Jeroen — een kant tussen
 * twee inhoudelijk niet-verwante acties, en een startvoorwaarde die iets anders meet dan
 * bedoeld. Geen foutmelding, geen ontbrekende rij die opvalt.
 *
 * `E` voor eigen. Het scheelt bovendien bij het lezen: aan de key zie je nu waar een actie
 * vandaan komt.
 */
export function volgendeVrijeKey(keys: readonly string[]): string {
  let hoogste = 0
  for (const k of keys) {
    const m = /^E(\d+)$/.exec(k)
    if (m) hoogste = Math.max(hoogste, Number(m[1]))
  }
  const n = hoogste + 1
  return `E${n < 10 ? `0${n}` : String(n)}`
}

function volgendeVolgorde(tx: Tx, prioriteit: number): number {
  const rijen = tx
    .select()
    .from(schema.planActions)
    .where(eq(schema.planActions.prioriteit, prioriteit))
    .all()
  return rijen.reduce((max, r) => Math.max(max, r.volgorde), 0) + 1
}

function velden(v: Partial<ActieVelden>): Record<string, unknown> {
  const uit: Record<string, unknown> = {}
  for (const [k, w] of Object.entries(v)) {
    uit[k] = k === 'links' ? JSON.stringify(w) : w
  }
  return uit
}

// ------------------------------------------------------------------------------- bewerken

export function wijzigActie(
  db: JobradarDb,
  key: string,
  versie: number,
  nieuweVelden: Partial<ActieVelden>,
  nu: string
): Mutatie<PlanActie> {
  return inTransactie(db, (tx) => {
    const actie = laadActie(tx, key)
    if (!actie) return onbekend(`${key} bestaat niet`)
    if (actie.versie !== versie) {
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: 'deze actie is intussen elders gewijzigd',
        conflict: { conflict: 'versie' as const, versie: actie.versie },
      }
    }

    const set = velden(nieuweVelden)

    // Een prioriteitswissel verhuist de actie naar het einde van de nieuwe groep: haar oude
    // volgorde slaat daar nergens op en zou stil tussen twee andere acties landen.
    if (nieuweVelden.prioriteit !== undefined && nieuweVelden.prioriteit !== actie.prioriteit) {
      set.volgorde = volgendeVolgorde(tx, nieuweVelden.prioriteit)
    }

    // Alleen het gereedcriterium wordt gelogd van de gewone velden: dat is de maatstaf
    // waartegen je later afrondt, dus een stille wijziging eraan verandert wat "klaar"
    // betekent. De rest is gewoon tekst bijwerken.
    if (
      nieuweVelden.gereedcriterium !== undefined &&
      (nieuweVelden.gereedcriterium ?? null) !== actie.gereedcriterium
    ) {
      schrijfHistorie(
        tx,
        'actie',
        key,
        'gereedcriterium',
        actie.gereedcriterium,
        nieuweVelden.gereedcriterium ?? null,
        null,
        nu
      )
    }

    tx.update(schema.planActions)
      .set({ ...set, versie: actie.versie + 1, updatedAt: nu })
      .where(eq(schema.planActions.key, key))
      .run()

    return { ok: true as const, waarde: laadActie(tx, key) as PlanActie }
  })
}

// --------------------------------------------------------------------------------- status

export type StatusResultaat = { actie: PlanActie; geparkeerd: PlanActie | null }

/**
 * De statuswissel, met de focusregel, de blokkade-controle, het bewijs en het heropenen.
 *
 * De volgorde van de controles is bewust: eerst bestaan en versie, dan het doel. Naar `bezig`
 * gaan is de zwaarste weg — die raakt zowel de afhankelijkheden als de focuslimiet, en beide
 * kunnen een 409 opleveren waarop de gebruiker een keuze moet maken.
 */
export function wijzigStatus(
  db: JobradarDb,
  key: string,
  versie: number,
  invoer: StatusInvoer,
  instellingen: PlanInstellingen,
  vandaag: string,
  nu: string
): Mutatie<StatusResultaat> {
  return inTransactie(db, (tx) => {
    const actie = laadActie(tx, key)
    if (!actie) return onbekend(`${key} bestaat niet`)
    if (actie.versie !== versie) {
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: 'deze actie is intussen elders gewijzigd',
        conflict: { conflict: 'versie' as const, versie: actie.versie },
      }
    }
    if (actie.status === invoer.status) {
      return ongeldig(`${key} staat al op ${invoer.status}`)
    }

    const set: Record<string, unknown> = { status: invoer.status }
    let geparkeerd: PlanActie | null = null
    const wasGereed = actie.status === 'gereed'

    if (invoer.status === 'gereed') {
      // Afronden vraagt bewijs. Niet omdat de app het nodig heeft, maar omdat "gereed" zonder
      // bewijs een herinnering is — en de opdracht vraagt juist te kunnen zien waaraan je
      // merkt dat iets werkelijk af is.
      const bewijs = (invoer.bewijs ?? '').trim()
      if (bewijs === '') {
        return ongeldig('afronden vraagt bewijs — wat toont dat het klaar is?')
      }
      set.bewijs = bewijs
      set.afgerondOp = invoer.afgerondOp ?? vandaag
      if (invoer.links !== null) set.links = JSON.stringify(invoer.links)
      schrijfHistorie(tx, 'actie', key, 'bewijs', actie.bewijs, bewijs, null, nu)
    }

    if (invoer.status === 'bezig') {
      const acties = alleActies(tx)
      const kanten = alleKanten(tx)
      const perKey = new Map(acties.map((a) => [a.key, a]))
      const deps = kanten
        .filter((k) => k.van === key)
        .flatMap((k) => {
          const d = perKey.get(k.naar)
          return d ? [d] : []
        })

      const blokkade = blokkadeVan(actie, deps)
      const hard = blokkade.filter((b) => b.hard)
      if (hard.length > 0) {
        // Een vervallen afhankelijkheid laat zich niet wegredeneren met een uitzondering: ze
        // is niet geslaagd afgerond, en wat ze zou opleveren bestaat dus nog steeds niet.
        return {
          ok: false as const,
          soort: 'conflict' as const,
          reden: hard.map((b) => b.reden).join('; '),
          conflict: { conflict: 'afhankelijkheid' as const, blokkade },
        }
      }
      if (blokkade.length > 0 && !actie.startUitzondering && !invoer.startUitzondering) {
        return {
          ok: false as const,
          soort: 'conflict' as const,
          reden: blokkade.map((b) => b.reden).join('; '),
          conflict: { conflict: 'afhankelijkheid' as const, blokkade },
        }
      }
      if (invoer.startUitzondering) {
        set.startUitzondering = invoer.startUitzondering
        schrijfHistorie(
          tx,
          'actie',
          key,
          'start_uitzondering',
          actie.startUitzondering,
          invoer.startUitzondering,
          null,
          nu
        )
      }

      const conflict = focusConflict(acties, instellingen.focusLimiet, key)
      if (conflict) {
        if (invoer.parkeer) {
          const doelwit = conflict.actief.find((a) => a.key === invoer.parkeer)
          if (!doelwit) return ongeldig(`${invoer.parkeer} is niet een van de actieve acties`)
          const rij = perKey.get(invoer.parkeer) as PlanActie
          tx.update(schema.planActions)
            .set({ status: PARKEER_STATUS, versie: rij.versie + 1, updatedAt: nu })
            .where(eq(schema.planActions.key, rij.key))
            .run()
          schrijfHistorie(
            tx,
            'actie',
            rij.key,
            'status',
            rij.status,
            PARKEER_STATUS,
            `geparkeerd voor ${key}`,
            nu
          )
          geparkeerd = laadActie(tx, rij.key) ?? null
        } else if (invoer.focusUitzondering) {
          set.focusUitzondering = invoer.focusUitzondering
          schrijfHistorie(
            tx,
            'actie',
            key,
            'focus_uitzondering',
            actie.focusUitzondering,
            invoer.focusUitzondering,
            null,
            nu
          )
        } else {
          return {
            ok: false as const,
            soort: 'conflict' as const,
            reden: `er zijn al ${conflict.limiet} acties bezig`,
            conflict,
          }
        }
      }
    }

    if (invoer.status === 'uitgesteld') {
      const reden = (invoer.wachtreden ?? actie.wachtreden ?? '').trim()
      if (reden === '') {
        return ongeldig('uitstellen vraagt een aanleiding om het later opnieuw te bekijken')
      }
      set.wachtreden = reden
      if (invoer.herbekijkOp !== null) set.herbekijkOp = invoer.herbekijkOp
    }

    if (invoer.status === 'wacht_op_input') {
      const reden = (invoer.wachtreden ?? actie.wachtreden ?? '').trim()
      if (reden === '') return ongeldig('waarop wacht deze actie?')
      set.wachtreden = reden
    }

    if (invoer.status === 'vervallen' && !invoer.reden) {
      return ongeldig('waarom vervalt deze actie?')
    }

    schrijfHistorie(tx, 'actie', key, 'status', actie.status, invoer.status, invoer.reden, nu)

    tx.update(schema.planActions)
      .set({ ...set, versie: actie.versie + 1, updatedAt: nu })
      .where(eq(schema.planActions.key, key))
      .run()

    // Heropenen: het bewijs en de afrondingsdatum blijven staan — die zijn verdiend en
    // vertellen wat er de vorige keer gebeurde. Wie van deze actie afhing en al liep of klaar
    // was, krijgt een regel in zijn geschiedenis. Géén statuswijziging: of dat werk opnieuw
    // moet, is een oordeel.
    if (wasGereed) {
      const kanten = alleKanten(tx)
      for (const afhankelijke of afhankelijkenVan(key, kanten)) {
        const rij = laadActie(tx, afhankelijke)
        if (!rij) continue
        if (rij.status === 'bezig' || rij.status === 'gereed') {
          schrijfHistorie(
            tx,
            'actie',
            afhankelijke,
            'afhankelijkheid_heropend',
            null,
            key,
            `${key} ging van gereed naar ${invoer.status}`,
            nu
          )
        }
      }
    }

    return { ok: true as const, waarde: { actie: laadActie(tx, key) as PlanActie, geparkeerd } }
  })
}

// ------------------------------------------------------------------------- afhankelijkheden

export function zetAfhankelijkheden(
  db: JobradarDb,
  key: string,
  versie: number,
  nieuwe: unknown,
  nu: string
): Mutatie<{ actie: PlanActie; afhankelijkheden: string[] }> {
  return inTransactie(db, (tx) => {
    const actie = laadActie(tx, key)
    if (!actie) return onbekend(`${key} bestaat niet`)
    if (actie.versie !== versie) {
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: 'deze actie is intussen elders gewijzigd',
        conflict: { conflict: 'versie' as const, versie: actie.versie },
      }
    }

    const acties = new Map(alleActies(tx).map((a) => [a.key, { status: a.status as ActieStatus }]))
    const kanten = alleKanten(tx)
    const gekeurd = keurAfhankelijkheden(key, nieuwe, acties, kanten)
    if (!gekeurd.ok) return ongeldig(gekeurd.reden)

    const oud = kanten
      .filter((k) => k.van === key)
      .map((k) => k.naar)
      .sort()

    tx.delete(schema.planDependencies).where(eq(schema.planDependencies.actionKey, key)).run()
    for (const doel of gekeurd.waarde) {
      tx.insert(schema.planDependencies)
        .values({ actionKey: key, dependsOnKey: doel, createdAt: nu })
        .run()
    }

    if (oud.join(',') !== gekeurd.waarde.join(',')) {
      schrijfHistorie(
        tx,
        'actie',
        key,
        'afhankelijkheden',
        oud.join(', ') || '(geen)',
        gekeurd.waarde.join(', ') || '(geen)',
        null,
        nu
      )
    }

    tx.update(schema.planActions)
      .set({ versie: actie.versie + 1, updatedAt: nu })
      .where(eq(schema.planActions.key, key))
      .run()

    return {
      ok: true as const,
      waarde: { actie: laadActie(tx, key) as PlanActie, afhankelijkheden: gekeurd.waarde },
    }
  })
}

// --------------------------------------------------------------------- aanmaken en wissen

export function maakActie(
  db: JobradarDb,
  invoer: NieuweActie,
  bron: 'eigen' | 'idee',
  nu: string
): Mutatie<PlanActie> {
  return inTransactie(db, (tx) => {
    const keys = alleActies(tx).map((a) => a.key)
    const key = volgendeVrijeKey(keys)
    tx.insert(schema.planActions)
      .values({
        key,
        titel: invoer.titel,
        prioriteit: invoer.prioriteit,
        volgorde: volgendeVolgorde(tx, invoer.prioriteit),
        beschrijving: invoer.beschrijving,
        resultaat: invoer.resultaat,
        gereedcriterium: invoer.gereedcriterium,
        volgendeStap: invoer.volgendeStap,
        bron,
        versie: 1,
        createdAt: nu,
        updatedAt: nu,
      })
      .run()
    return { ok: true as const, waarde: laadActie(tx, key) as PlanActie }
  })
}

export function maakActieUitBody(db: JobradarDb, body: unknown, nu: string): Mutatie<PlanActie> {
  const gekeurd = keurNieuweActie(body)
  if (!gekeurd.ok) return ongeldig(gekeurd.reden)
  return maakActie(db, gekeurd.waarde, 'eigen', nu)
}

export function verwijderActie(db: JobradarDb, key: string): Mutatie<true> {
  return inTransactie(db, (tx) => {
    const actie = laadActie(tx, key)
    if (!actie) return onbekend(`${key} bestaat niet`)
    if (actie.bron === 'seed') {
      // De startinhoud blijft staan. Ze is de herkomst van dit plan; wegvallen zou een gat
      // maken dat niemand later kan verklaren. "Vervallen" is het antwoord op iets dat niet
      // meer hoeft — dat blijft zichtbaar én blokkeert wie eraan hangt, wat de bedoeling is.
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: 'een actie uit de startinhoud verwijder je niet — zet hem op vervallen',
        conflict: { conflict: 'versie' as const, versie: actie.versie },
      }
    }

    // Kanten in beide richtingen: als deze actie ergens een afhankelijkheid van was, blijft
    // die anders naar een key wijzen die niet meer bestaat — en dan blokkeert iets op niets.
    tx.delete(schema.planDependencies).where(eq(schema.planDependencies.actionKey, key)).run()
    tx.delete(schema.planDependencies).where(eq(schema.planDependencies.dependsOnKey, key)).run()
    tx.delete(schema.planLinks).where(eq(schema.planLinks.actionKey, key)).run()
    tx.delete(schema.planActions).where(eq(schema.planActions.key, key)).run()
    // De geschiedenis blijft: juist de uitleg mag niet verdwijnen met het ding zelf.
    return { ok: true as const, waarde: true as const }
  })
}

// ----------------------------------------------------------------------------- beslissingen

export function legBeslissingVast(
  db: JobradarDb,
  key: string,
  versie: number,
  body: Record<string, unknown>,
  nu: string
): Mutatie<PlanBeslissing> {
  const gekeurd = keurBeslissingVelden(body)
  if (!gekeurd.ok) return ongeldig(gekeurd.reden)

  return inTransactie(db, (tx) => {
    const rij = tx
      .select()
      .from(schema.planDecisions)
      .where(eq(schema.planDecisions.key, key))
      .limit(1)
      .get()
    if (!rij) return onbekend(`beslismoment ${key} bestaat niet`)
    if (rij.versie !== versie) {
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: 'dit beslismoment is intussen elders gewijzigd',
        conflict: { conflict: 'versie' as const, versie: rij.versie },
      }
    }

    const v = gekeurd.waarde as Partial<BeslissingVelden>
    const set: Record<string, unknown> = {}
    if (v.beslissing !== undefined) set.beslissing = v.beslissing
    if (v.beslistOp !== undefined) set.beslistOp = v.beslistOp
    if (v.onderbouwing !== undefined) set.onderbouwing = v.onderbouwing
    if (v.vervolgacties !== undefined) set.vervolgacties = v.vervolgacties

    if (v.acties !== undefined) {
      const bestaand = new Set(alleActies(tx).map((a) => a.key))
      for (const k of v.acties) if (!bestaand.has(k)) return ongeldig(`${k} bestaat niet`)
      set.acties = JSON.stringify(v.acties)
    }

    // Een beslissing vastleggen zonder datum krijgt vandaag: een beslissing zonder moment is
    // achteraf niet te plaatsen. Wél overschrijfbaar, want je kan er een van vorige week
    // invoeren.
    if (v.beslissing !== undefined && (v.beslissing ?? '').trim() !== '' && rij.beslistOp === null) {
      if (v.beslistOp === undefined) set.beslistOp = nu.slice(0, 10)
    }

    if (v.beslissing !== undefined && (v.beslissing ?? null) !== rij.beslissing) {
      schrijfHistorie(tx, 'beslissing', key, 'beslissing', rij.beslissing, v.beslissing ?? null, null, nu)
    }

    tx.update(schema.planDecisions)
      .set({ ...set, versie: rij.versie + 1, updatedAt: nu })
      .where(eq(schema.planDecisions.key, key))
      .run()

    return {
      ok: true as const,
      waarde: tx
        .select()
        .from(schema.planDecisions)
        .where(eq(schema.planDecisions.key, key))
        .limit(1)
        .get() as PlanBeslissing,
    }
  })
}

// ------------------------------------------------------------------------------ koppelingen

export function koppelBedrijf(
  db: JobradarDb,
  key: string,
  type: SubjectType,
  subjectKey: string,
  nu: string
): Mutatie<{ nieuw: boolean }> {
  return inTransactie<{ nieuw: boolean }>(db, (tx) => {
    if (!laadActie(tx, key)) return onbekend(`${key} bestaat niet`)

    if (type === 'lead') {
      const id = Number(subjectKey)
      if (!Number.isInteger(id) || id <= 0) return ongeldig('een lead heeft een numerieke id')
      const bestaat = tx
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, id))
        .limit(1)
        .get()
      if (!bestaat) return onbekend('onbekend bedrijf')
    } else if (type === 'prospect') {
      if (!/^\d{10}$/.test(subjectKey)) {
        return ongeldig('een prospect heeft een ondernemingsnummer van tien cijfers')
      }
      // Bewust géén bestaanscontrole op de spiegel: die is wegwerpbaar en kan ontbreken,
      // en een koppeling weigeren omdat er toevallig geen KBO-kopie op schijf staat, zou
      // een beslissing van Jeroen laten afhangen van een cachebestand.
    } else {
      return ongeldig('onbekend soort bedrijf')
    }

    const bestaand = tx
      .select()
      .from(schema.planLinks)
      .where(
        and(
          eq(schema.planLinks.actionKey, key),
          eq(schema.planLinks.subjectType, type),
          eq(schema.planLinks.subjectKey, subjectKey)
        )
      )
      .limit(1)
      .get()
    if (bestaand) return { ok: true as const, waarde: { nieuw: false } }

    tx.insert(schema.planLinks)
      .values({ actionKey: key, subjectType: type, subjectKey, createdAt: nu })
      .onConflictDoNothing()
      .run()
    return { ok: true as const, waarde: { nieuw: true } }
  })
}

export function ontkoppelBedrijf(
  db: JobradarDb,
  key: string,
  type: SubjectType,
  subjectKey: string
): Mutatie<true> {
  db.delete(schema.planLinks)
    .where(
      and(
        eq(schema.planLinks.actionKey, key),
        eq(schema.planLinks.subjectType, type),
        eq(schema.planLinks.subjectKey, subjectKey)
      )
    )
    .run()
  return { ok: true, waarde: true }
}

// ---------------------------------------------------------------------------------- ideeën

export function maakIdee(db: JobradarDb, body: unknown, nu: string): Mutatie<PlanIdee> {
  const gekeurd = keurIdee(body)
  if (!gekeurd.ok) return ongeldig(gekeurd.reden)
  const rij = db
    .insert(schema.planIdeas)
    .values({
      titel: gekeurd.waarde.titel,
      notitie: gekeurd.waarde.notitie,
      status: 'open',
      createdAt: nu,
      updatedAt: nu,
    })
    .returning()
    .get()
  return { ok: true, waarde: rij }
}

export function wijzigIdee(
  db: JobradarDb,
  id: number,
  body: Record<string, unknown>,
  nu: string
): Mutatie<PlanIdee> {
  return inTransactie(db, (tx) => {
    const rij = tx.select().from(schema.planIdeas).where(eq(schema.planIdeas.id, id)).limit(1).get()
    if (!rij) return onbekend('dit idee bestaat niet')

    const set: Record<string, unknown> = {}
    if (Object.hasOwn(body, 'titel')) {
      const t = typeof body.titel === 'string' ? body.titel.trim() : ''
      if (t === '') return ongeldig('titel is verplicht')
      set.titel = t
    }
    if (Object.hasOwn(body, 'notitie')) {
      const n = typeof body.notitie === 'string' ? body.notitie.trim() : ''
      set.notitie = n === '' ? null : n
    }
    if (Object.hasOwn(body, 'status')) {
      const s = body.status
      if (s !== 'open' && s !== 'verworpen') {
        // 'opgenomen' loopt via `neemIdeeOp`: dat maakt een actie aan, en dat mag geen
        // neveneffect van een statusveld zijn.
        return ongeldig("status is 'open' of 'verworpen'")
      }
      if (rij.status === 'opgenomen') return ongeldig('dit idee is al opgenomen in het plan')
      set.status = s
    }
    if (Object.keys(set).length === 0) return ongeldig('geen enkel bewerkbaar veld in dit verzoek')

    tx.update(schema.planIdeas)
      .set({ ...set, updatedAt: nu })
      .where(eq(schema.planIdeas.id, id))
      .run()
    return {
      ok: true as const,
      waarde: tx
        .select()
        .from(schema.planIdeas)
        .where(eq(schema.planIdeas.id, id))
        .limit(1)
        .get() as PlanIdee,
    }
  })
}

/**
 * Een idee wordt een actie.
 *
 * Alleen op expliciete opdracht en mét een gekozen prioriteitsgroep: de opdracht is duidelijk
 * dat een idee nooit vanzelf een prioriteitsactie mag worden. De nieuwe actie erft de titel en
 * de notitie, en verder niets — een idee heeft geen gereedcriterium, en er een verzinnen zou
 * de eerste vraag beantwoorden die juist gesteld moet worden.
 */
export function neemIdeeOp(
  db: JobradarDb,
  id: number,
  prioriteit: Prioriteit,
  nu: string
): Mutatie<{ idee: PlanIdee; actie: PlanActie }> {
  return inTransactie(db, (tx) => {
    const idee = tx.select().from(schema.planIdeas).where(eq(schema.planIdeas.id, id)).limit(1).get()
    if (!idee) return onbekend('dit idee bestaat niet')
    if (idee.status === 'opgenomen') {
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: `dit idee is al opgenomen als ${idee.opgenomenAls ?? 'een actie'}`,
        conflict: { conflict: 'versie' as const, versie: 1 },
      }
    }

    const key = volgendeVrijeKey(alleActies(tx).map((a) => a.key))
    tx.insert(schema.planActions)
      .values({
        key,
        titel: idee.titel,
        prioriteit,
        volgorde: volgendeVolgorde(tx, prioriteit),
        beschrijving: idee.notitie,
        bron: 'idee',
        versie: 1,
        createdAt: nu,
        updatedAt: nu,
      })
      .run()

    tx.update(schema.planIdeas)
      .set({ status: 'opgenomen', opgenomenAls: key, updatedAt: nu })
      .where(eq(schema.planIdeas.id, id))
      .run()

    return {
      ok: true as const,
      waarde: {
        idee: tx
          .select()
          .from(schema.planIdeas)
          .where(eq(schema.planIdeas.id, id))
          .limit(1)
          .get() as PlanIdee,
        actie: laadActie(tx, key) as PlanActie,
      },
    }
  })
}

export function verwijderIdee(db: JobradarDb, id: number): Mutatie<true> {
  return inTransactie(db, (tx) => {
    const rij = tx.select().from(schema.planIdeas).where(eq(schema.planIdeas.id, id)).limit(1).get()
    if (!rij) return onbekend('dit idee bestaat niet')
    if (rij.status === 'opgenomen') {
      return {
        ok: false as const,
        soort: 'conflict' as const,
        reden: `dit idee leeft verder als ${rij.opgenomenAls ?? 'een actie'} — verwijder die actie`,
        conflict: { conflict: 'versie' as const, versie: 1 },
      }
    }
    tx.delete(schema.planIdeas).where(eq(schema.planIdeas.id, id)).run()
    return { ok: true as const, waarde: true as const }
  })
}

export { parseKeys }
