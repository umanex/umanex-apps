/**
 * Van bedrijfsnaam naar ondernemingsnummer.
 *
 * Waarom dit bestaat: de leadkant kent bedrijven alleen bij naam — Adzuna levert niets
 * anders. Daardoor moest alles wat twee vermeldingen van hetzelfde bedrijf wilde samenvoegen
 * op een genormaliseerde naam vergelijken, en dat gaat mis in beide richtingen: "Volvo Group"
 * toonde 3 vacatures op de kaart en 6 na de doorklik, want een uitzendkantoor zet de
 * klantnaam in de titel. Het ondernemingsnummer is de sleutel die KBO wél heeft.
 *
 * De regel is streng en dat is het punt: **liever geen koppeling dan een verkeerde.** Een
 * fout nummer plakt een echte onderneming — met haar adres, activiteiten en leeftijd — op een
 * lead waar ze niets mee te maken heeft, en niets in de UI zou dat nog verraden. Gemeten met
 * een losse match op genormaliseerde naam over dezelfde 27 leads: "Touring" landde op een
 * transportbedrijf en "Smile Group" op een conglomeraat met 66 activiteitscodes.
 *
 * Vandaar: exact één kandidaat, anders niets. Regio mag een gelijkspel breken, verder niets.
 */
import { normaliseerBedrijf } from '../matching'
import { REGIONS, type RegionCode } from '../regions'

/**
 * De index die de koppeling snel maakt. Hij wordt door `kbo:sync` gevuld en leeft in de
 * spiegel, niet in `jobradar.db` — het is afgeleide KBO-data en hij hoort met de spiegel mee
 * weggegooid te worden.
 */
export const NAAM_INDEX_DDL = `
  CREATE TABLE IF NOT EXISTS naam_index (
    sleutel TEXT NOT NULL,
    EntityNumber TEXT NOT NULL,
    soort TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_naam_index_sleutel ON naam_index (sleutel);
`

/**
 * Een sleutel korter dan dit koppelen we niet. "AB" of "IT" matcht tientallen ondernemingen
 * en het gelijkspel is dan geen toeval maar de regel — precies waar een strenge match zijn
 * waarde verliest.
 */
export const MIN_SLEUTELLENGTE = 4

export type Koppeling =
  | { soort: 'gevonden'; nummer: string; viaRegio: boolean }
  | { soort: 'meerdere'; kandidaten: string[] }
  | { soort: 'geen'; reden: 'te-kort' | 'niet-gevonden' }

/**
 * Dezelfde normalisatie als de dedupe-sleutel, met één toevoeging: punten gaan er eerst uit.
 *
 * `normaliseerBedrijf` strijkt `\bnv\b` weg, maar "N.V." heeft geen woordgrens tussen de n
 * en de v — die vorm bleef dus als "n v" in de sleutel staan en matchte nooit tegen KBO's
 * "NV". Beide kanten krijgen deze behandeling, dus de symmetrie blijft heel; het enige
 * neveneffect is dat "collective.work" en "collectivework" dezelfde sleutel krijgen, en dat
 * is precies wat je wil.
 *
 * Bewust hier en niet in `normaliseerBedrijf` zelf: die functie voedt de dedupe-hash van
 * bestaande rijen, en die vorm veranderen laat oude en nieuwe hashes uiteenlopen.
 */
export function koppelSleutel(naam: string): string {
  return normaliseerBedrijf(naam.replace(/\./g, '')).replace(/\s+/g, ' ').trim()
}

type Rij = { EntityNumber: string }
type Db = {
  prepare(sql: string): { all(...params: unknown[]): unknown[] }
}

type SchrijfDb = {
  exec(sql: string): unknown
  prepare(sql: string): { all(...params: unknown[]): unknown[]; run(...params: unknown[]): unknown }
}

/**
 * Vult `naam_index` opnieuw. Draait aan het eind van elke `kbo:sync`.
 *
 * Twee dingen die hier eerder misgingen en waarom het nu zo staat:
 *
 * - **Eén verbinding.** De eerste versie las met een `iterate()` op een readonly-verbinding
 *   en schreef op een tweede. better-sqlite3 weigert een `exec` zolang er een iterator
 *   openstaat, en met twee verbindingen op hetzelfde bestand lopen de sloten elkaar in de
 *   weg: de bouw hing na tien minuten nog zonder één gecommitte rij.
 * - **Bladeren op `rowid`, niet op OFFSET.** `LIMIT ? OFFSET ?` wordt trager naarmate de
 *   offset groeit — over twee miljoen rijen is dat het verschil tussen minuten en uren.
 *   `rowid` is uniek en geïndexeerd, dus `WHERE rowid > ?` blijft even duur.
 *
 * Alleen benamingen van **actieve** ondernemingen: vestigingen en stopgezette ondernemingen
 * hebben hier niets te zoeken, en het scheelt een derde van de rijen.
 */
export function bouwNaamIndex(db: SchrijfDb, opBatch?: (n: number) => void): number {
  db.exec(NAAM_INDEX_DDL)
  db.exec('DELETE FROM naam_index')

  const lees = db.prepare(
    `SELECT d.rowid AS rid, d.EntityNumber, d.Denomination, d.TypeOfDenomination
       FROM denomination d
       JOIN enterprise e ON e.EnterpriseNumber = d.EntityNumber AND e.Status = 'AC'
      WHERE d.rowid > ? ORDER BY d.rowid LIMIT ?`
  )
  const invoegen = db.prepare('INSERT INTO naam_index (sleutel, EntityNumber, soort) VALUES (?, ?, ?)')

  let laatste = 0
  let n = 0
  for (;;) {
    const rijen = lees.all(laatste, 100_000) as {
      rid: number
      EntityNumber: string
      Denomination: string | null
      TypeOfDenomination: string | null
    }[]
    if (!rijen.length) break

    db.exec('BEGIN')
    for (const r of rijen) {
      const sleutel = koppelSleutel(r.Denomination ?? '')
      if (sleutel.length < MIN_SLEUTELLENGTE) continue
      invoegen.run(sleutel, r.EntityNumber, r.TypeOfDenomination ?? '')
      n++
    }
    db.exec('COMMIT')

    laatste = rijen[rijen.length - 1]!.rid
    opBatch?.(n)
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_naam_index_sleutel ON naam_index (sleutel)')
  return n
}

/**
 * Zoekt het ondernemingsnummer bij een naam.
 *
 * `regio` is alleen een tiebreaker: hij wordt pas gebruikt wanneer de naam meerdere actieve
 * ondernemingen oplevert. Hem meteen als filter gebruiken zou een bedrijf missen waarvan de
 * zetel in een andere provincie staat dan de vacature — een Brusselse vestiging van een
 * Antwerps huis is geen andere onderneming.
 */
export function zoekOnderneming(db: Db, naam: string, regio?: RegionCode): Koppeling {
  const sleutel = koppelSleutel(naam)
  if (sleutel.length < MIN_SLEUTELLENGTE) return { soort: 'geen', reden: 'te-kort' }

  const kandidaten = db
    .prepare(
      `SELECT DISTINCT n.EntityNumber FROM naam_index n
         JOIN enterprise e ON e.EnterpriseNumber = n.EntityNumber
        WHERE n.sleutel = ? AND e.Status = 'AC'`
    )
    .all(sleutel) as Rij[]

  if (kandidaten.length === 1) return { soort: 'gevonden', nummer: kandidaten[0]!.EntityNumber, viaRegio: false }
  if (kandidaten.length === 0) return { soort: 'geen', reden: 'niet-gevonden' }

  if (regio && regio in REGIONS) {
    const { postcodeMin, postcodeMax } = REGIONS[regio]
    const inRegio = db
      .prepare(
        `SELECT DISTINCT n.EntityNumber FROM naam_index n
           JOIN enterprise e ON e.EnterpriseNumber = n.EntityNumber
           JOIN address a ON a.EntityNumber = n.EntityNumber
          WHERE n.sleutel = ? AND e.Status = 'AC'
            AND CAST(a.Zipcode AS INTEGER) BETWEEN ? AND ?`
      )
      .all(sleutel, postcodeMin, postcodeMax) as Rij[]
    if (inRegio.length === 1) return { soort: 'gevonden', nummer: inRegio[0]!.EntityNumber, viaRegio: true }
  }

  return { soort: 'meerdere', kandidaten: kandidaten.map((k) => k.EntityNumber) }
}
