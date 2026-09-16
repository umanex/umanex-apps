/**
 * Het plan lezen: de ruwe rijen ophalen, de namen van gekoppelde bedrijven erbij zoeken en
 * alles door de afleiding halen.
 *
 * De namen worden hier opgezocht en niet opgeslagen — dezelfde regel als bij de KBO-koppeling
 * elders in deze app: wat je niet opslaat, kan niet verouderen. Een bedrijfsnaam die in een
 * plan_links-rij zou meeliften, zou na een hernoeming stil een andere naam tonen dan het
 * dashboard.
 */
import { inArray } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { PlanActie, PlanIdee, SubjectType } from '../db/schema'
import type { JobradarDb } from '../sync/upsert'
import { leidAf, type PlanInvoer } from './afleiding'
import { leesAannames, leesInstellingen, leesSeedVersie } from './instellingen'
import { zaaiPlan } from './seed'
import type { ActieDetail, KoppelingWeergave, PlanWeergave } from './types'

/**
 * Zoekt de namen van gekoppelde bedrijven op.
 *
 * Leads staan in `companies`. Prospects kunnen uit de aangeleverde lijst komen
 * (`csv_prospects`) of alleen in de KBO-spiegel bestaan — die laatste is een apart
 * databasebestand dat hier niet openstaat, dus dan blijft de naam `null` en toont de UI het
 * ondernemingsnummer. Liever een zichtbaar nummer dan een naam die uit een cache komt die er
 * morgen niet meer is.
 */
function zoekNamen(
  db: JobradarDb,
  koppelingen: readonly { actionKey: string; subjectType: string; subjectKey: string }[]
): Map<string, KoppelingWeergave[]> {
  const leadIds = [
    ...new Set(
      koppelingen
        .filter((k) => k.subjectType === 'lead')
        .map((k) => Number(k.subjectKey))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ]
  const prospectNummers = [
    ...new Set(koppelingen.filter((k) => k.subjectType === 'prospect').map((k) => k.subjectKey)),
  ]

  const leadNaam = new Map<string, string>()
  if (leadIds.length > 0) {
    for (const rij of db
      .select()
      .from(schema.companies)
      .where(inArray(schema.companies.id, leadIds))
      .all()) {
      leadNaam.set(String(rij.id), rij.companyName)
    }
  }

  const prospectNaam = new Map<string, string>()
  if (prospectNummers.length > 0) {
    for (const rij of db
      .select()
      .from(schema.csvProspects)
      .where(inArray(schema.csvProspects.enterpriseNumber, prospectNummers))
      .all()) {
      prospectNaam.set(rij.enterpriseNumber, rij.name)
    }
  }

  const uit = new Map<string, KoppelingWeergave[]>()
  for (const k of koppelingen) {
    const naam =
      k.subjectType === 'lead'
        ? (leadNaam.get(k.subjectKey) ?? null)
        : (prospectNaam.get(k.subjectKey) ?? null)
    const lijst = uit.get(k.actionKey) ?? []
    lijst.push({ subjectType: k.subjectType as SubjectType, subjectKey: k.subjectKey, naam })
    uit.set(k.actionKey, lijst)
  }
  return uit
}

export function leesRuwPlan(db: JobradarDb): PlanInvoer {
  const acties = db.select().from(schema.planActions).all()
  const kanten = db
    .select()
    .from(schema.planDependencies)
    .all()
    .map((r) => ({ van: r.actionKey, naar: r.dependsOnKey }))
  const beslissingen = db.select().from(schema.planDecisions).all()
  const koppelingen = db.select().from(schema.planLinks).all()

  return {
    acties,
    kanten,
    beslissingen,
    koppelingen: zoekNamen(db, koppelingen),
    instellingen: leesInstellingen(db),
  }
}

export function leesIdeeen(db: JobradarDb): PlanIdee[] {
  return db
    .select()
    .from(schema.planIdeas)
    .all()
    .sort((a, b) => b.id - a.id)
}

/**
 * Het volledige plan, klaar voor het scherm.
 *
 * Zaait eerst — die aanroep is één SELECT op `settings` zodra het plan bestaat, en hij staat
 * hier zodat elk pad naar het plan (pagina, API, probe) hetzelfde vertrekpunt heeft. In
 * `getDb()` zou hij niet passen: dan zou elke sync en elk KBO-script het plan aanmaken.
 */
export function leesPlan(db: JobradarDb, nu = new Date().toISOString()): PlanWeergave {
  zaaiPlan(db, nu)
  const ruw = leesRuwPlan(db)
  const afgeleid = leidAf(ruw)

  return {
    instellingen: ruw.instellingen,
    aannames: leesAannames(db),
    seedVersie: leesSeedVersie(db),
    acties: afgeleid.acties,
    beslissingen: afgeleid.beslissingen,
    ideeen: leesIdeeen(db),
    overzicht: afgeleid.overzicht,
  }
}

export function leesActieDetail(db: JobradarDb, key: string): ActieDetail | null {
  const plan = leidAf(leesRuwPlan(db))
  const actie = plan.acties.find((a) => a.key === key)
  if (!actie) return null

  const geschiedenis = db
    .select()
    .from(schema.planHistory)
    .all()
    .filter((h) => h.onderwerpType === 'actie' && h.onderwerpKey === key)
    .sort((a, b) => b.id - a.id)

  return { ...actie, geschiedenis }
}

/**
 * Per bedrijf de acties waaraan het hangt, voor de kaartjes op het dashboard.
 *
 * Sleutel `lead:12` of `prospect:0747501103` — dezelfde vorm als `contact_moments` gebruikt,
 * zodat een lead met id 42 en een prospect met nummer 42 nooit elkaars koppelingen tonen.
 */
export function leesKoppelingenPerBedrijf(db: JobradarDb): Record<string, string[]> {
  const uit: Record<string, string[]> = {}
  for (const rij of db.select().from(schema.planLinks).all()) {
    const sleutel = `${rij.subjectType}:${rij.subjectKey}`
    const lijst = uit[sleutel] ?? []
    lijst.push(rij.actionKey)
    uit[sleutel] = lijst
  }
  for (const lijst of Object.values(uit)) lijst.sort()
  return uit
}

export function leesActiesVoorKoppeling(
  db: JobradarDb
): { key: string; titel: string; status: string }[] {
  return db
    .select()
    .from(schema.planActions)
    .all()
    .filter((a: PlanActie) => a.status !== 'vervallen')
    .sort((a, b) => a.prioriteit - b.prioriteit || a.volgorde - b.volgorde)
    .map((a) => ({ key: a.key, titel: a.titel, status: a.status }))
}
