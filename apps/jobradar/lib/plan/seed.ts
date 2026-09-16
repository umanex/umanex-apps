/**
 * Het plan één keer zaaien.
 *
 * De poort is `plan.seed_versie` in `settings`, niet de aanwezigheid van de rijen. Dat
 * verschil is de hele reden dat dit bestand bestaat.
 *
 * Met alleen `ON CONFLICT DO NOTHING` per rij zou een tweede run geen dubbele acties maken —
 * maar hij zou wél een afhankelijkheid terugzetten die Jeroen bewust verwijderd heeft, want
 * die kant bestaat dan niet meer en botst dus nergens mee. De opdracht verbiedt precies dat:
 * "herladen, migreren of opnieuw starten mag geen dubbele acties maken en gebruikerswijzigingen
 * niet overschrijven." De versie-poort dekt beide; de DO NOTHING eronder is alleen nog het
 * vangnet voor een crash midden in de transactie.
 *
 * Gevolg voor later: een `SEED_VERSIE` verhogen mag **alleen** om nieuwe keys toe te voegen.
 * Een bestaande actie of kant aanpassen via de seed overschrijft werk van de gebruiker.
 */
import * as schema from '../db/schema'
import type { JobradarDb } from '../sync/upsert'
import { leesSeedVersie, SLEUTEL_SEED_VERSIE, zetSetting } from './instellingen'
import {
  SEED_ACTIES,
  SEED_AFHANKELIJKHEDEN,
  SEED_BESLISSINGEN,
  SEED_VERSIE,
} from './seed-inhoud'

export function zaaiPlan(db: JobradarDb, nu = new Date().toISOString()): { gezaaid: boolean } {
  if (leesSeedVersie(db) >= SEED_VERSIE) return { gezaaid: false }

  // Een seed-key die al bestaat met een ándere bron is een botsing, geen no-op. `onConflictDoNothing`
  // zou hem stil overslaan terwijl de poort tóch doorschuift, en de bijbehorende kanten en
  // startvoorwaarden zouden op de bestaande, inhoudelijk niet-verwante actie landen. Sinds eigen
  // acties de `E`-reeks krijgen kan dit niet meer gebeuren; deze rem staat er voor de dag dat
  // iemand die scheiding weer opheft.
  const bezet = db
    .select()
    .from(schema.planActions)
    .all()
    .filter((a) => a.bron !== 'seed' && SEED_ACTIES.some((s) => s.key === a.key))
  if (bezet.length > 0) {
    throw new Error(
      `zaaiPlan: ${bezet.map((a) => a.key).join(', ')} bestaat al met bron "${bezet[0]?.bron}" — ` +
        'de seed zou hem stil overslaan en zijn afhankelijkheden op de verkeerde actie laten landen'
    )
  }

  db.transaction((tx) => {
    // Volgorde binnen een prioriteitsgroep = volgorde in SEED_ACTIES; die draagt betekenis
    // (A01 vóór A02) en is ook wat de opdracht toont.
    const volgordePerGroep = new Map<number, number>()

    for (const actie of SEED_ACTIES) {
      const volgorde = (volgordePerGroep.get(actie.prioriteit) ?? 0) + 1
      volgordePerGroep.set(actie.prioriteit, volgorde)

      tx.insert(schema.planActions)
        .values({
          key: actie.key,
          titel: actie.titel,
          prioriteit: actie.prioriteit,
          volgorde,
          resultaat: actie.resultaat,
          gereedcriterium: actie.gereedcriterium,
          context: actie.context ?? null,
          // Prioriteit 4 start uitgesteld, met de aanleiding om te herbekijken als
          // wachtreden. Geen herbekijkdatum: de opdracht geeft een aanleiding, geen datum,
          // en er een verzinnen zou een deadline fabriceren.
          status: actie.uitgesteldOmdat ? 'uitgesteld' : 'niet_gestart',
          wachtreden: actie.uitgesteldOmdat ?? null,
          // Inzet blijft leeg: onbekend is de waarheid, 0 zou in elke som meetellen.
          inschattingUren: null,
          resterendUren: null,
          bron: 'seed',
          versie: 1,
          createdAt: nu,
          updatedAt: nu,
        })
        .onConflictDoNothing()
        .run()
    }

    for (const [van, naar] of Object.entries(SEED_AFHANKELIJKHEDEN)) {
      for (const doel of naar) {
        tx.insert(schema.planDependencies)
          .values({ actionKey: van, dependsOnKey: doel, createdAt: nu })
          .onConflictDoNothing()
          .run()
      }
    }

    SEED_BESLISSINGEN.forEach((b, i) => {
      tx.insert(schema.planDecisions)
        .values({
          key: b.key,
          soort: b.soort,
          volgorde: i + 1,
          titel: b.titel,
          vraag: b.vraag,
          acties: JSON.stringify(b.acties),
          versie: 1,
          createdAt: nu,
          updatedAt: nu,
        })
        .onConflictDoNothing()
        .run()
    })

    // Als laatste, binnen dezelfde transactie: valt er iets om, dan blijft de poort open en
    // probeert de volgende run het opnieuw in plaats van een half plan achter te laten.
    zetSetting(tx as unknown as JobradarDb, SLEUTEL_SEED_VERSIE, String(SEED_VERSIE), nu)
  })

  return { gezaaid: true }
}
