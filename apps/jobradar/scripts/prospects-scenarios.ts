/**
 * Invarianten op de selectie- en voortgangslogica van het labelscherm.
 *
 * Twee dingen hier zijn geen smaak maar contract uit de briefing, en ze zien er in de UI
 * identiek uit als hun kapotte variant:
 *   1. `beide` telt als afgehandeld, `twijfel` niet.
 *   2. De voortgangsbalk staat op afgehandeld, niet op "heeft een label" — anders meldt hij
 *      100% terwijl er nog een stapel twijfelgevallen ligt.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/prospects-scenarios.ts
 */
import {
  isAfgehandeld,
  wachtOpOordeel,
  berekenVoortgang,
  bouwWachtrij,
  hervatOp,
  volgende,
  vorige,
  zoekopdracht,
  type Prospect,
} from '../lib/prospects'
import { CLASSIFICATIES } from '../lib/db/schema'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

const p = (over: Partial<Prospect> & Pick<Prospect, 'id' | 'companyName'>): Prospect => ({
  postcode: 9000,
  region: 'OVL',
  naceCode: '62200',
  url: null,
  werknemers: null,
  classificatie: null,
  geclassificeerdOp: null,
  signals: [],
  ...over,
})

// ── Het onderscheid dat de tweede ronde bruikbaar houdt ──────────────────────

check('product is afgehandeld', isAfgehandeld('product'))
check('dienstverlener is afgehandeld', isAfgehandeld('dienstverlener'))
check('beide is afgehandeld', isAfgehandeld('beide'))
check('geen-prospect is afgehandeld', isAfgehandeld('geen-prospect'))
check('twijfel is NIET afgehandeld', !isAfgehandeld('twijfel'))
check('null is niet afgehandeld', !isAfgehandeld(null))

check('vijf classificaties beschikbaar', CLASSIFICATIES.length === 5, String(CLASSIFICATIES.length))
check('beide staat ertussen', CLASSIFICATIES.includes('beide'))

check('twijfelgeval wacht nog op oordeel', wachtOpOordeel(p({ id: 1, companyName: 'A', classificatie: 'twijfel' })))
check('beide-geval wacht niet meer', !wachtOpOordeel(p({ id: 2, companyName: 'B', classificatie: 'beide' })))

// ── Voortgang ────────────────────────────────────────────────────────────────

{
  const lijst = [
    p({ id: 1, companyName: 'A', classificatie: 'product' }),
    p({ id: 2, companyName: 'B', classificatie: 'beide' }),
    p({ id: 3, companyName: 'C', classificatie: 'twijfel' }),
    p({ id: 4, companyName: 'D' }),
  ]
  const v = berekenVoortgang(lijst)
  check('totaal telt alles', v.totaal === 4, String(v.totaal))
  check('afgehandeld telt product + beide', v.afgehandeld === 2, String(v.afgehandeld))
  check('twijfel apart geteld', v.twijfel === 1, String(v.twijfel))
  check('ongelabeld apart geteld', v.ongelabeld === 1, String(v.ongelabeld))
  check('percentage staat op afgehandeld', v.percentage === 50, String(v.percentage))
  check('verdeling per classificatie', v.perClassificatie.beide === 1, JSON.stringify(v.perClassificatie))
}

{
  // Het geval dat de balk mag verraden: alles heeft een label, maar de helft is twijfel.
  const lijst = [
    p({ id: 1, companyName: 'A', classificatie: 'product' }),
    p({ id: 2, companyName: 'B', classificatie: 'twijfel' }),
  ]
  const v = berekenVoortgang(lijst)
  check('alles gelabeld maar half twijfel -> 50%, geen 100%', v.percentage === 50, String(v.percentage))
  check('en ongelabeld is nul', v.ongelabeld === 0)
}

check('lege lijst geeft 0% zonder te delen door nul', berekenVoortgang([]).percentage === 0)

// ── De wachtrij ──────────────────────────────────────────────────────────────

{
  const lijst = [
    p({ id: 1, companyName: 'Zonder site B' }),
    p({ id: 2, companyName: 'Met site', url: 'https://met.be' }),
    p({ id: 3, companyName: 'Al gedaan', classificatie: 'product' }),
    p({ id: 4, companyName: 'Twijfelgeval', classificatie: 'twijfel' }),
    p({ id: 5, companyName: 'Zonder site A' }),
  ]

  const ongelabeld = bouwWachtrij(lijst, 'ongelabeld')
  check('ongelabeld laat gelabelde weg', ongelabeld.length === 3, String(ongelabeld.length))
  check('ook het twijfelgeval valt buiten "ongelabeld"', !ongelabeld.some((x) => x.id === 4))
  check('bedrijf MET website staat vooraan', ongelabeld[0]?.id === 2, String(ongelabeld[0]?.id))
  check('daarna alfabetisch', ongelabeld[1]?.companyName === 'Zonder site A', ongelabeld[1]?.companyName)

  const twijfel = bouwWachtrij(lijst, 'twijfel')
  check('twijfel-stapel is apart opvraagbaar', twijfel.length === 1 && twijfel[0]?.id === 4)

  const alles = bouwWachtrij(lijst, 'alles')
  check('alles = ongelabeld + twijfel', alles.length === 4, String(alles.length))
  check('en bevat het afgehandelde niet', !alles.some((x) => x.id === 3))
}

// ── Navigatie ────────────────────────────────────────────────────────────────

{
  const rij = [
    p({ id: 10, companyName: 'Een', url: 'https://een.be' }),
    p({ id: 20, companyName: 'Twee', url: 'https://twee.be' }),
    p({ id: 30, companyName: 'Drie', url: 'https://drie.be' }),
  ]
  check('hervatten landt op het eerste', hervatOp(rij)?.id === 10)
  check('hervatten op een lege rij is null', hervatOp([]) === null)

  check('volgende na 10 is 20', volgende(rij, 10)?.id === 20)
  check('volgende na het laatste is null', volgende(rij, 30) === null)
  check('volgende zonder huidige is het eerste', volgende(rij, null)?.id === 10)
  check('lege rij geeft null', volgende([], null) === null)

  // Het geval dat na een label optreedt: het huidige bedrijf staat niet meer in de rij.
  check('onbekende id valt terug op het eerste', volgende(rij, 999)?.id === 10, 'anders loopt de sessie vast')

  check('vorige van 20 is 10', vorige(rij, 10 === 10 ? 20 : 20)?.id === 10)
  check('vorige van het eerste is null', vorige(rij, 10) === null)
  check('vorige zonder huidige is null', vorige(rij, null) === null)
}

// ── Zoekopdracht bij een ontbrekende website ─────────────────────────────────

{
  const q = zoekopdracht(p({ id: 1, companyName: 'PERKA', postcode: 9990 }))
  check('zoekopdracht zet de naam tussen aanhalingstekens', q.includes('"PERKA"'), q)
  check('en bevat de postcode', q.includes('9990'), q)
  check('en begrenst op België', q.includes('België'), q)
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
