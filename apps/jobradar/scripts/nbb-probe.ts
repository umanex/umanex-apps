/**
 * Draait het NBB-pad één keer echt, tegen één ondernemingsnummer.
 *
 *   NBB_CBSO_KEY=<sleutel> node --import ./scripts/ts-resolve.mjs scripts/nbb-probe.ts [nummer]
 *
 * Dit bestaat omdat `scripts/nbb-scenarios.ts` alles toetst behálve het enige dat telt: of de
 * echte dienst antwoordt zoals de code aanneemt. Die suite draait op een nagebootste server —
 * groen daar zegt niets over een respons die de NBB werkelijk stuurt.
 *
 * Schrijft niets weg: geen database, geen bestand. Twee GET-verzoeken, en een verslag per stap.
 *
 * ZONDER SLEUTEL werkt dit niet, ook niet op de UAT. Gemeten op 2026-08-26: de UAT-gateway
 * antwoordt 401 `missing subscription key` zonder header en 401 `invalid subscription key` met
 * een verzonnen waarde. Een UAT-sleutel is gratis en vraagt geen contract — registreer op
 * https://developer.uat2.cbso.nbb.be/ en abonneer op het product *Authentic Data Query*.
 *
 * Het standaardnummer is 0203201340: dat is het voorbeeld dat de NBB zelf in de API-definitie
 * bij `legalEntityId` zet, dus als één nummer in de testomgeving bestaat, is het dat.
 */
import { leesConfig, haalPersoneel, url, bouwHeaders, ACCEPT, kiesRecentsteReferentie } from '../lib/sources/nbb'
import { leesPersoneel, RUBRIEK_PERSONEEL_VTE } from '../lib/sources/nbb-rubriek'

const nummer = (process.argv[2] ?? '0203201340').replace(/\D/g, '')

const config = leesConfig()
if (!config) {
  console.error('Geen NBB_CBSO_KEY gezet.\n')
  console.error('  UAT (gratis, geen contract): registreer op https://developer.uat2.cbso.nbb.be/,')
  console.error('  abonneer op "Authentic Data Query", en gebruik de primary key:\n')
  console.error(`    NBB_CBSO_KEY=<key> node --import ./scripts/ts-resolve.mjs scripts/nbb-probe.ts ${nummer}\n`)
  console.error('  Productie: zet daarnaast NBB_CBSO_OMGEVING=productie.')
  process.exit(2)
}

console.log(`NBB-probe — omgeving ${config.omgeving}, onderneming ${nummer}\n`)

// ── Stap 1: de referentielijst ───────────────────────────────────────────────
// Apart aangeroepen in plaats van via haalPersoneel, omdat de rauwe respons hier het punt is:
// bij een onverwachte vorm wil je zien wát er kwam, niet alleen dat het misging.

const refUrl = url.referenties(config, nummer)
console.log(`1. GET ${refUrl}`)
const refRes = await fetch(refUrl, { headers: bouwHeaders(config, ACCEPT.json, crypto.randomUUID()) })
console.log(`   HTTP ${refRes.status}`)

if (!refRes.ok) {
  console.log(`   ${(await refRes.text()).slice(0, 300)}`)
  console.log('\nGestopt na stap 1.')
  process.exit(1)
}

const referenties: unknown = await refRes.json()
const aantal = Array.isArray(referenties) ? referenties.length : '(geen array)'
console.log(`   ${aantal} neerlegging(en)`)

const eerste = Array.isArray(referenties) ? (referenties[0] as Record<string, unknown> | undefined) : undefined
if (eerste) {
  // De veldnamen zijn het interessantste deel: wijken ze af van de gedocumenteerde vorm, dan is
  // de fixture in nbb-scenarios.ts verouderd en moet die bijgewerkt worden, niet de parser.
  console.log(`   velden: ${Object.keys(eerste).join(', ')}`)
}

const gekozen = kiesRecentsteReferentie(referenties)
console.log(`   gekozen referentie: ${gekozen ?? '(geen)'}`)
if (gekozen === null) {
  console.log(`\n   RUW: ${JSON.stringify(referenties).slice(0, 600)}`)
  console.log('\nDe referentielezer herkende de vorm niet — vergelijk bovenstaande met nbb.ts.')
  process.exit(1)
}

// ── Stap 2: de boekhoudkundige gegevens ──────────────────────────────────────

const datUrl = url.gegevens(config, gekozen)
console.log(`\n2. GET ${datUrl}`)
const datRes = await fetch(datUrl, { headers: bouwHeaders(config, ACCEPT.jsonxbrl, crypto.randomUUID()) })
console.log(`   HTTP ${datRes.status}`)

if (!datRes.ok) {
  console.log(`   ${(await datRes.text()).slice(0, 300)}`)
  process.exit(1)
}

const rauw = await datRes.text()
console.log(`   ${rauw.length} tekens`)

let gegevens: unknown
try {
  gegevens = JSON.parse(rauw)
} catch {
  console.log(`   GEEN JSON — eerste 300 tekens:\n   ${rauw.slice(0, 300)}`)
  process.exit(1)
}

// ── Stap 3: rubriek 9087 ─────────────────────────────────────────────────────

const gelezen = leesPersoneel(gegevens)
console.log(`\n3. rubriek ${RUBRIEK_PERSONEEL_VTE} (gemiddeld personeelsbestand in VTE)`)
console.log(`   reden: ${gelezen.reden}`)
console.log(`   waarde: ${gelezen.vte ?? '—'}`)

if (gelezen.reden === 'vorm-niet-herkend') {
  // Dit is het geval waarvoor de hele vormonafhankelijke parser bestaat. Nul gezien codes
  // betekent dat de zoeker niets herkende — niet dat het bedrijf geen personeel heeft.
  console.log(`\n   RUW (eerste 800 tekens):\n   ${JSON.stringify(gegevens).slice(0, 800)}`)
  console.log('\n   Geen enkele rubriekcode herkend. Voeg deze vorm toe aan nbb-rubriek.ts.')
  process.exit(1)
}

if (gelezen.reden === 'rubriek-ontbreekt') {
  console.log(`   gezien: ${gelezen.gezieneCodes.slice(0, 20).join(', ')}`)
  console.log('\n   De vorm werd herkend maar 9087 zit er niet in — dat is een uitspraak over')
  console.log('   dit bedrijf (of dit model), niet over de parser.')
}

// ── Stap 4: dezelfde vraag via de bron zelf ──────────────────────────────────
// De stappen hierboven roepen de onderdelen los aan. Deze regel draait het pad zoals de sync
// hem straks gebruikt — als die twee verschillen, zit het verschil in haalPersoneel.

const viaBron = await haalPersoneel(nummer, config)
console.log(`\n4. via haalPersoneel(): reden ${viaBron.reden}, vte ${viaBron.vte ?? '—'}`)
if (viaBron.vte !== gelezen.vte || viaBron.reden !== gelezen.reden) {
  console.log('   LET OP: wijkt af van stap 3 — het verschil zit in haalPersoneel, niet in de dienst.')
  process.exit(1)
}

console.log('\nPad werkt end-to-end.')
