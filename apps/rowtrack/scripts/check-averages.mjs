#!/usr/bin/env node
/**
 * ELK GEMIDDELDE DEELT DOOR DE TELLER UIT ZIJN EIGEN ACCUMULATOR.
 *
 * WAAROM DIT BESTAAT. Een som en zijn teller horen bij elkaar, en die conventie is hier
 * gebroken: op 2026-08-17 deelden vijf call-sites door `tickCount` in plaats van door de teller
 * die in dezelfde guard optelde. `tickCount` telt élk binnengekomen pakket, ook dat waarin het
 * veld ontbrak, dus het gemiddelde werd stelselmatig te laag. Per scherm onzichtbaar: er staat
 * gewoon een plausibel getal.
 *
 * WAT ER OP 2026-09-16 VERANDERDE. De losse `<naam>Sum`/`<naam>Count`-refs zijn vervangen door
 * één `Acc = { sum, count }` in `lib/sessionAccumulator.ts`, en het gemiddelde loopt via
 * `mean(acc)`. Daarmee is de fout van 2026-08-17 structureel onmogelijk — je kúnt niet meer
 * door een vreemde teller delen, want som en teller zijn hetzelfde object.
 *
 * Deze guard mocht daarom niet blijven zoeken naar een vorm die niet meer bestaat: hij vond
 * nul delingen, en nul is geen groene meting maar een wachter die niets ziet. Hij toetst nu de
 * invariant die er wél is:
 *
 *   1. één implementatie van het gemiddelde — `acc.sum / acc.count` staat alleen in `mean()`;
 *   2. elke andere plek gebruikt `mean(...)` en rekent er niet zelf een uit;
 *   3. en gebeurt dat tóch, dan moeten teller en noemer uit dezelfde accumulator komen.
 *
 * Regel 2 is de strengste en dat is opzet: een handgerolde deling die vandaag toevallig klopt,
 * is morgen de plek waar iemand de verkeerde teller intypt.
 *
 *   node scripts/check-averages.mjs             # de guard
 *   node scripts/check-averages.mjs --selftest  # tegenproef, beide kanten
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');

/** De enige plek waar `sum / count` mag staan. */
const BRON = 'lib/sessionAccumulator.ts';

/** Bestanden waarin een gemiddelde kan staan. Uit git, zodat een nieuw bestand vanzelf meedoet. */
function bronnen() {
  const uit = execFileSync('git', ['ls-files', 'app', 'lib', 'components'], { cwd: APP, encoding: 'utf8' });
  return uit.split('\n').filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
}

/**
 * `a.b.sum / c.d.count` → de twee accumulator-uitdrukkingen, of null wanneer de regel geen
 * handgerolde deling van een som door een teller is.
 */
function handgerold(regel) {
  const m = regel.match(/([\w.$[\]]+)\.sum\s*\/\s*([\w.$[\]]+)\.count/);
  return m ? { teller: m[1], noemer: m[2] } : null;
}

function analyse(bestanden, lees) {
  const bevindingen = [], gemeten = [];
  for (const f of bestanden) {
    const regels = lees(f).split('\n');
    regels.forEach((regel, i) => {
      // Elk gebruik van `mean(` telt als een gemeten gemiddelde — dat is de noemer van deze
      // guard: gaat dit naar nul, dan meet hij niets meer en hoort hij te klagen.
      for (const _ of regel.matchAll(/\bmean\s*\(/g)) gemeten.push(`${f}:${i + 1} mean(...)`);

      const deling = handgerold(regel);
      if (!deling) return;
      gemeten.push(`${f}:${i + 1} ${deling.teller}.sum / ${deling.noemer}.count`);

      if (deling.teller !== deling.noemer) {
        bevindingen.push(`${f}:${i + 1}: ${deling.teller}.sum deelt door ${deling.noemer}.count — een vreemde teller`);
      } else if (f !== BRON) {
        bevindingen.push(`${f}:${i + 1}: handgerold gemiddelde (${deling.teller}) — gebruik mean() uit ${BRON}`);
      }
    });
  }
  return { bevindingen, gemeten };
}

const lees = (f) => readFileSync(join(APP, f), 'utf8');

if (SELFTEST) {
  const eis = (naam, ok, detail = '') => {
    console.log(`  ${ok ? 'ok  ' : 'FOUT'}  ${naam}${detail ? ` — ${detail}` : ''}`);
    if (!ok) process.exitCode = 1;
  };
  const bestanden = bronnen();
  const controle = analyse(bestanden, lees);
  eis('de echte code is stil', controle.bevindingen.length === 0, controle.bevindingen[0] ?? '');
  eis('er is iets te meten', controle.gemeten.length > 0, `${controle.gemeten.length} gemiddelde(n)`);
  eis(`${BRON} draagt de enige deling`,
    controle.gemeten.some((g) => g.startsWith(`${BRON}:`) && g.includes('.sum /')),
    'de bron zelf rekent het gemiddelde niet uit');

  // ZOEK HET OBJECT EERST. Muteren op een regel die geen `mean(`-aanroep draagt zou niets
  // veranderen, de guard zou terecht zwijgen, en de zelftest zou naar de guard wijzen in
  // plaats van naar zichzelf — precies de fout die de vorige versie van dit bestand maakte.
  const doelEntry = controle.gemeten.find((g) => g.includes('mean(...)') && !g.startsWith(`${BRON}:`));
  eis('er is een mean()-aanroep buiten de bron om te muteren', !!doelEntry, doelEntry ?? '');

  if (doelEntry) {
    const doel = doelEntry.split(':')[0];

    // MUTATIE 1 — een vreemde teller: exact de klasse van 2026-08-17, in de nieuwe vorm.
    const m1 = (f) => (f === doel ? lees(f).replace(/\bmean\s*\(([\w.$]+)\)/, 'x.sum / y.count') : lees(f));
    eis('mutatie 1 raakte de code echt', m1(doel) !== lees(doel), doel);
    const r1 = analyse(bestanden, m1);
    eis('een vreemde teller -> rood', r1.bevindingen.some((b) => /vreemde teller/.test(b)), r1.bevindingen[0] ?? 'stil');

    // MUTATIE 2 — een deling die ARITMETISCH KLOPT maar mean() omzeilt. Zonder deze zou de
    // guard alleen de verkeerde noemer zien, en blijft "iedereen rekent zijn eigen gemiddelde"
    // een stille gewoonte die de volgende fout mogelijk maakt.
    const m2 = (f) => (f === doel ? lees(f).replace(/\bmean\s*\(([\w.$]+)\)/, '$1.sum / $1.count') : lees(f));
    eis('mutatie 2 raakte de code echt', m2(doel) !== lees(doel), doel);
    const r2 = analyse(bestanden, m2);
    eis('een handgerold maar correct gemiddelde -> rood', r2.bevindingen.some((b) => /handgerold/.test(b)), r2.bevindingen[0] ?? 'stil');
  }

  // NEGATIEVE CONTROLE — een wijziging die hier niets mee te maken heeft, hoort stil te
  // blijven. Een guard die op álles rood wordt, meet niets.
  const m3 = (f) => (f === doelEntry?.split(':')[0] ? `// een onschuldige regel\n${lees(f)}` : lees(f));
  eis('een onschuldige wijziging -> stil', analyse(bestanden, m3).bevindingen.length === 0);

  // NEGATIEVE CONTROLE 2 — de deling in de bron zelf is legitiem en mag niet rood worden.
  eis('de deling in de bron blijft toegestaan',
    !controle.bevindingen.some((b) => b.startsWith(BRON)));

  console.log(process.exitCode ? '\n  ZELFTEST GEFAALD' : '\n  zelftest ok');
  process.exit(process.exitCode ?? 0);
}

const { bevindingen, gemeten } = analyse(bronnen(), lees);
console.log(`\ncheck-averages — ${gemeten.length} gemiddelde(n) gemeten\n`);
gemeten.forEach((g) => console.log('  ' + g));
if (!gemeten.length) {
  console.error('\n  NUL gemiddelden gevonden. Dat is geen groene meting maar een guard die niets ziet.');
  process.exit(2);
}
if (bevindingen.length) {
  console.error(`\n  ${bevindingen.length} gemiddelde(n) buiten de regel:`);
  bevindingen.forEach((b) => console.error('    ' + b));
  process.exit(1);
}
console.log(`\n  ok — elk gemiddelde loopt via mean(); de enige deling staat in ${BRON}.`);
