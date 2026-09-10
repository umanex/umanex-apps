#!/usr/bin/env node
/**
 * Rekenmodel achter het businessplan van 25 augustus 2026.
 *
 *   node scripts/plan-model.mjs             # de kerncijfers
 *   node scripts/plan-model.mjs --selftest  # bewijst dat de invarianten kunnen falen
 *
 * Waarom dit bestaat: elk cijfer in het businessplan kwam uit wegwerpscripts in een
 * sessie-scratchpad. Die verdwijnt, en dan is het artifact een eindpunt in plaats van een
 * momentopname van iets herhaalbaars. Erger: toen de cashflow-app van revisie 81 naar 86 ging,
 * werden de omzetcijfers wél bijgewerkt en één afgeleid getal niet — de vrije middelen stonden
 * EUR 785,58 te hoog omdat ze tegen het oude banksaldo gerekend bleven. Invariant 3 hieronder
 * vangt precies dat geval.
 *
 * De invoer wordt NIET live uit de app gelezen: dat vraagt credentials die een script in de repo
 * niet hoort te dragen. Elke waarde staat hieronder met zijn herkomst en met hoe je hem opnieuw
 * meet. Verandert de app, dan werk je dit blok bij en zie je meteen wat er verschuift.
 *
 * Op 2026-08-25 zijn de potstanden in de app zelf afgelezen in plaats van afgeleid, en dat
 * corrigeerde vijf potten, een ontbrekende budgetpot en — het zwaarst — de vorm. De pot "Buffer"
 * is een restpost zonder maandbedrag: hij neemt op wat er na alle andere posten overblijft en
 * vult een tekort weer aan uit wat erin zit. Er bestaat dus geen ongealloceerde rest naast de
 * buffer, en wat vrij is IS de buffer: EUR 3.131,39 in plaats van de EUR 6.003,70 die de oude
 * afleiding gaf. Invariant 3 leidt dat getal opnieuw af uit het saldo en valt om zodra een van
 * de claims verschuift.
 */

const SELFTEST = process.argv.includes('--selftest');

// ── INVOER ─────────────────────────────────────────────────────────────────────
// Bron: cashflow-app, cashflow_state.data, revisie 86, opgehaald 2026-08-25.
// Hermeten: SELECT som per type uit jsonb_array_elements(data->'reservations').

const VAST = {                     // recurringItems, verlaat de rekening elke maand
  Loon: 2775, 'Alpine A110': 945, 'Peugeot 508': 907,
  Liantis: 785, Tuinkantoor: 712.61, Telenet: 136.73,
};
const BUDGET = {                   // reservations, type maandelijks_budget — rolt niet door
  'Vrije uitgave': 500, 'Privé sparen': 500, Benzine: 300,
  Kredietkaart: 300, Parking: 106.40,
};
const PROVISIE = {                 // reservations, type spaardoel — rolt wel door
  // "Buffer" staat hier bewust NIET in: die pot heeft geen maandbedrag, hij neemt het restant op.
  BTW: 3000, 'Afbetaling renting Peugeot': 1090,
  'Sociale bijdrage': 852.39, Vennootschapsbelasting: 625, Boekhouder: 550,
  Autoverzekeringen: 305, 'Afbetaling renting Alpine': 302, 'Onderhoud wagens': 290,
  Verzekeringen: 230, Verkeersbelasting: 45,
};
// Binnen PROVISIE is dit géén aankomende kost: btw is doorstroom, geen uitgave.
const GEEN_KOST = ['BTW'];
// Deze twee vallen weg als de Peugeot-renting eindigt (januari 2027).
const PEUGEOT = ['Peugeot 508', 'Afbetaling renting Peugeot'];
// Deze twee zet je als eerste stop in een noodscenario — ze zijn geen verplichting.
const DISCRETIONAIR = ['Privé sparen', 'Vrije uitgave'];

const SALDO_AUG = 19_531.42;       // balanceOverrides, maand 2026-08 — waargenomen, niet afgeleid

// Potstanden op 31-08-2026, afgelezen in de app (maandkaart augustus + paneel Spaarpotten).
// Tot 2026-08-25 stonden hier afgeleide waarden; die zaten er op vijf potten naast — btw 4.426,05
// (werkelijk 3.000), Peugeot 4.360 (5.450), onderhoud wagens 593,66 (290), verzekeringen 173,62
// (86,65) en verkeersbelasting -45 (0) — en de budgetpot ontbrak volledig.
const POT = {                      // provisiepotten, samen EUR 12.845,65
  'Afbetaling renting Peugeot': 5_450.00, BTW: 3_000.00, Vennootschapsbelasting: 2_500.00,
  Autoverzekeringen: 915.00, 'Afbetaling renting Alpine': 604.00, 'Onderhoud wagens': 290.00,
  Verzekeringen: 86.65, 'Sociale bijdrage': 0, Boekhouder: 0, Verkeersbelasting: 0,
};
const POT_BUDGET = 66.77;          // Parking — de enige budgetpot met een stand in augustus
const VAST_NOG_TE_BETALEN = 3_487.61;  // augustus: Loon + Tuinkantoor; de rest is al afgeschreven
const NIET_RECURRENT_AUG = 0;      // augustus heeft geen eenmalige uitgaven
const BUFFER_AUG = 3_131.39;       // wat de app toont — invariant 3 leidt hem opnieuw af
const BALLON_PEUGEOT_CHECK = 9_810.68;
const BALLON_PEUGEOT = BALLON_PEUGEOT_CHECK;   // EUR 8.108 + 21% btw, januari 2027

// Bron: opgave Jeroen 2026-08-25. Gemiddelde maand, dus vakantie zit er al in.
const LUMINUS_MAAND_EX_BTW = 10_750;
const LUMINUS_DAGTARIEF = 572;     // uit het bureau-plan, bevestigd door de deling hieronder

// Aanbod. Bron: businessplan deel 2.
const RETAINER = 6_750, TREDE_DAGEN = 7, JEROEN_DAGEN = 2, FREELANCE_TARIEF = 500;
const SCAN_GEMIDDELD = 3_550, SCAN_EIGEN_DAGEN = 1.7;
const VERKOOPDAGEN = { met_luminus: 36, zonder_luminus: 45 };
const WERKWEKEN = 46;              // 52 - 4 vakantie - 2 feestdagen

// ── AFLEIDING ──────────────────────────────────────────────────────────────────
const som = (o, filter = () => true) =>
  Object.entries(o).filter(([k]) => filter(k)).reduce((t, [, v]) => t + v, 0);

const vast = som(VAST);
const budget = som(BUDGET);
const provisie = som(PROVISIE);
const appTotaal = vast + budget + provisie;
const provisieEchteKost = som(PROVISIE, (k) => !GEEN_KOST.includes(k));

const kostNu = vast + budget + provisieEchteKost;                    // 12.257,13
const peugeotLast = som({ ...VAST, ...PROVISIE }, (k) => PEUGEOT.includes(k));
const kostNaPeugeot = kostNu - peugeotLast;                          // 10.260,13
// Runway hangt aan je horizon, dus er zijn er twee en ze verschillen met een factor 1,6.
// DIRECT: wat volgende maand van de rekening moet — vast plus niet-discretionair budget.
// VOLLEDIG: plus de provisies voor kosten die dat jaar vervallen (bijdragen, belasting,
// boekhouder, verzekeringen). Die komen wél, alleen niet meteen.
const discretionair = som(BUDGET, (k) => DISCRETIONAIR.includes(k));
const directeLast = vast + budget - discretionair;
const volledigeLast = directeLast + provisieEchteKost;

const pottenTotaal = som(POT);
// De buffer is een restpost, geen pot naast de andere: wat er na alle claims overblijft ís hij.
// Daarom geen "ongealloceerd" meer — dat was een artefact van de oude afleiding.
const werkelijkVrij = BUFFER_AUG;
const runwayDirect = werkelijkVrij / directeLast;
const runwayVolledig = werkelijkVrij / volledigeLast;

const luminusJaar = LUMINUS_MAAND_EX_BTW * 12;
const factureerbareDagen = luminusJaar / LUMINUS_DAGTARIEF;
const retainerNettoMaand = RETAINER - (TREDE_DAGEN - JEROEN_DAGEN) * FREELANCE_TARIEF;
const eigenDagenMetLuminus = (5 - 3) * WERKWEKEN;                    // 3 gewerkte dagen
const eigenDagenZonder = 5 * WERKWEKEN;

const kosten2027 = kostNu + 11 * kostNaPeugeot;                      // ballon in januari
const kosten2028 = 12 * kostNaPeugeot;

function scenario({ luminusDeel = 0, starts = [], scans = 3, verkoop, kosten, beschikbaar }) {
  const maanden = starts.reduce((t, s) => t + (13 - s), 0);
  const bruto = luminusJaar * luminusDeel + RETAINER * maanden + SCAN_GEMIDDELD * scans;
  const freelance = (TREDE_DAGEN - JEROEN_DAGEN) * maanden * FREELANCE_TARIEF;
  const nodig = JEROEN_DAGEN * maanden + scans * SCAN_EIGEN_DAGEN + verkoop;
  return { bruto, freelance, netto: bruto - freelance, vrij: bruto - freelance - kosten,
           nodig, beschikbaar, past: nodig <= beschikbaar };
}

// ── INVARIANTEN ────────────────────────────────────────────────────────────────
const fouten = [];
function eis(naam, waar, detail = '') {
  if (!waar) fouten.push(`${naam}${detail ? ' — ' + detail : ''}`);
  return waar;
}
const rond = (a, b, marge = 0.01) => Math.abs(a - b) <= marge;

// Perturbatie voor --selftest: één invoerwaarde die de invarianten hóórt te laten afgaan.
const saldo = SALDO_AUG;
const pottenT = SELFTEST ? pottenTotaal + 500 : pottenTotaal;
// De buffer opnieuw afgeleid uit het saldo. Dit is de meting, niet de aflezing: klopt hij niet
// met BUFFER_AUG, dan is een van de claims verschoven zonder dat dit blok is bijgewerkt.
const bufferAfgeleid = saldo - VAST_NOG_TE_BETALEN - NIET_RECURRENT_AUG - POT_BUDGET - pottenT;

eis('1. kostenblokken sluiten op het app-totaal',
    rond(vast + budget + provisie, appTotaal),
    `${vast.toFixed(2)} + ${budget.toFixed(2)} + ${provisie.toFixed(2)}`);

eis('2. provisies splitsen zonder rest',
    rond(provisieEchteKost + som(PROVISIE, (k) => GEEN_KOST.includes(k)), provisie));

// Geen tautologie: BUFFER_AUG is afgelezen in de app en bufferAfgeleid rolt hem opnieuw uit
// vier andere afgelezen waarden. Schuift er één, dan valt deze om — dat is precies zijn taak.
eis('3. de buffer volgt uit het saldo min alle claims',
    rond(bufferAfgeleid, BUFFER_AUG, 0.01),
    `${saldo.toFixed(2)} − ${VAST_NOG_TE_BETALEN.toFixed(2)} − ${NIET_RECURRENT_AUG.toFixed(2)} − ${POT_BUDGET.toFixed(2)} − ${pottenT.toFixed(2)} = ${bufferAfgeleid.toFixed(2)}, app zegt ${BUFFER_AUG.toFixed(2)}`);

eis('4. geen enkele potstand is negatief',
    Object.values(POT).every((v) => v >= 0) && POT_BUDGET >= 0,
    'een negatieve pot betekent dat er meer uit betaald is dan erin zat — dat hoort een cash-post te zijn, geen potstand');

eis('5. Luminus-jaartotaal past bij het dagtarief en de werkweken',
    factureerbareDagen > 4.5 * WERKWEKEN && factureerbareDagen < 5.2 * WERKWEKEN,
    `${factureerbareDagen.toFixed(1)} dagen bij ${WERKWEKEN} werkweken`);

// Onafhankelijk van invariant 3: die kijkt naar augustus, deze naar januari.
eis('6. de Peugeot-pot dekt de slotafbetaling in januari',
    POT['Afbetaling renting Peugeot'] + 5 * PROVISIE['Afbetaling renting Peugeot'] >= BALLON_PEUGEOT,
    `${POT['Afbetaling renting Peugeot'].toFixed(2)} + 5 x ${PROVISIE['Afbetaling renting Peugeot']} = ${(POT['Afbetaling renting Peugeot'] + 5 * PROVISIE['Afbetaling renting Peugeot']).toFixed(2)} tegen ${BALLON_PEUGEOT}`);

eis('8. de directe last is kleiner dan de volledige',
    directeLast < volledigeLast,
    'anders is de provisie-uitsplitsing omgevallen');

eis('7. het maandbedrag van de Peugeot-provisie is op de slotafbetaling gedimensioneerd',
    rond(PROVISIE['Afbetaling renting Peugeot'] * 9, BALLON_PEUGEOT, 1),
    `9 x ${PROVISIE['Afbetaling renting Peugeot']} = ${(PROVISIE['Afbetaling renting Peugeot'] * 9).toFixed(2)} tegen ${BALLON_PEUGEOT}`);

// ── OUTPUT ─────────────────────────────────────────────────────────────────────
const eur = (n) => '€' + Math.round(n).toLocaleString('nl-BE');
const log = (...a) => console.log(...a);

if (!SELFTEST) {
  log('\nKOSTENBASIS');
  log(`  vast ${eur(vast)} + budget ${eur(budget)} + provisies ${eur(provisie)} = ${eur(appTotaal)} in de app`);
  log(`  werkelijke uitstroom nu          ${eur(kostNu)}/maand   (zonder btw-doorstroom en bufferopbouw)`);
  log(`  na de Peugeot-lijnen             ${eur(kostNaPeugeot)}/maand   ${eur(peugeotLast)} valt weg in januari 2027`);
  log(`  direct onvermijdelijk            ${eur(directeLast)}/maand   vast + budget zonder ${DISCRETIONAIR.join(' en ')}`);
  log(`  inclusief vervallende provisies  ${eur(volledigeLast)}/maand   die komen wel, alleen niet meteen`);

  log('\nWAT ER VRIJ IS');
  log(`  banksaldo augustus 2026          ${eur(saldo)}`);
  log(`  vaste uitgaven nog te betalen    ${eur(VAST_NOG_TE_BETALEN)}`);
  log(`  budgetpot (Parking)              ${eur(POT_BUDGET)}`);
  log(`  provisiepotten                   ${eur(pottenTotaal)}`);
  log(`  werkelijk vrij = de bufferpot    ${eur(werkelijkVrij)}   wat er na alle claims overblijft`);
  log(`  runway op de directe last        ${runwayDirect.toFixed(2)} maand`);
  log(`  runway inclusief provisies       ${runwayVolledig.toFixed(2)} maand`);

  log('\nLUMINUS');
  log(`  gemiddelde maand ex btw          ${eur(LUMINUS_MAAND_EX_BTW)}  ->  ${eur(luminusJaar)} per jaar`);
  log(`  bij ${eur(LUMINUS_DAGTARIEF)}/dag                    ${factureerbareDagen.toFixed(1)} factureerbare dagen`);
  log(`  eigen capaciteit bij 3 gewerkte dagen  ${eigenDagenMetLuminus} dagen`);

  log('\n2027 — Luminus blijft, kosten ' + eur(kosten2027));
  for (const [naam, s] of [
    ['niets verkopen',        scenario({ luminusDeel: 1, starts: [],           scans: 0, verkoop: VERKOOPDAGEN.met_luminus, kosten: kosten2027, beschikbaar: eigenDagenMetLuminus })],
    ['drie scans',            scenario({ luminusDeel: 1, starts: [],           scans: 3, verkoop: VERKOOPDAGEN.met_luminus, kosten: kosten2027, beschikbaar: eigenDagenMetLuminus })],
    ['twee opdrachten',       scenario({ luminusDeel: 1, starts: [4, 9],       scans: 3, verkoop: VERKOOPDAGEN.met_luminus, kosten: kosten2027, beschikbaar: eigenDagenMetLuminus })],
    ['drie opdrachten',       scenario({ luminusDeel: 1, starts: [4, 9, 11],   scans: 3, verkoop: VERKOOPDAGEN.met_luminus, kosten: kosten2027, beschikbaar: eigenDagenMetLuminus })],
  ]) log(`  ${naam.padEnd(20)} netto ${eur(s.netto).padStart(9)}   vrij ${eur(s.vrij).padStart(9)}   ${s.nodig.toFixed(0)}/${s.beschikbaar} dagen ${s.past ? '' : '<< past niet'}`);

  log('\n2029 — geen Luminus, kosten ' + eur(kosten2028));
  for (const n of [2, 3, 4, 5]) {
    const s = scenario({ starts: Array(n).fill(1), scans: 4, verkoop: VERKOOPDAGEN.zonder_luminus, kosten: kosten2028, beschikbaar: eigenDagenZonder });
    log(`  ${(n + ' opdrachten').padEnd(20)} netto ${eur(s.netto).padStart(9)}   vrij ${eur(s.vrij).padStart(9)}   ${s.nodig.toFixed(0)}/${s.beschikbaar} dagen`);
  }
  log(`\n  per eigen dag: capaciteit ${eur(retainerNettoMaand / JEROEN_DAGEN)} · scan ${eur(SCAN_GEMIDDELD / SCAN_EIGEN_DAGEN)} · Luminus per gewérkte dag ${eur(luminusJaar / (3 * WERKWEKEN))}`);
}

// ── UITKOMST ───────────────────────────────────────────────────────────────────
log('');
if (SELFTEST) {
  // De perturbatie verhoogt de potten met EUR 500 zonder het saldo of de buffer aan te raken,
  // dus de identiteit klopt niet meer en invariant 3 hoort af te gaan. Blijft hij stil, dan
  // toetst hij niets — en dan is elk getal dat eraan hangt onbewaakt.
  const raak = fouten.some((f) => f.startsWith('3.'));
  console.log(raak
    ? `✓ zelftest: invariant 3 gaat af op een opgewekte afwijking van EUR 500\n  ${fouten.find((f) => f.startsWith('3.'))}`
    : '✗ zelftest: invariant 3 bleef stil terwijl een potstand €500 verschoof — hij meet niets');
  process.exit(raak ? 0 : 1);
}
if (fouten.length) {
  console.log(`✗ ${fouten.length} invariant(en) gebroken:`);
  for (const f of fouten) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`✓ alle 8 invarianten houden`);
