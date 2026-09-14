#!/usr/bin/env node
/**
 * ELK GEMIDDELDE DEELT DOOR DE TELLER UIT ZIJN EIGEN GUARD.
 *
 * WAAROM DIT BESTAAT. Een som en zijn teller horen per conventie bij elkaar, en conventie is
 * hier eerder gebroken: op 2026-08-17 deelden vijf call-sites door `tickCount` in plaats van
 * door de teller die in dezelfde guard optelde. `tickCount` telt élk binnengekomen pakket, ook
 * dat waarin het veld ontbrak, dus het gemiddelde werd stelselmatig te laag. Dat is per scherm
 * onzichtbaar: er staat gewoon een plausibel getal.
 *
 * De fix van die dag corrigeerde de vijf plekken maar liet de conventie staan — een nieuwe som
 * die een teller vergeet, herhaalt de klasse. Deze guard maakt er een meting van.
 *
 * WAT HIJ DOET. Hij zoekt élke `refs.<naam>Sum.current / <noemer>` in app-code en eist dat de
 * noemer de teller van díe som is. Staat er een lokale variabele (`const c = refs.wattsCount…`),
 * dan volgt hij die terug naar zijn toekenning — anders zou hij precies de drie plekken niet
 * meten waar de fout zich het makkelijkst verstopt.
 *
 *   node scripts/check-averages.mjs             # de guard
 *   node scripts/check-averages.mjs --selftest  # tegenproef: rood op een foute noemer, stil zonder
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');

/**
 * De teller die bij een som hoort. De regel is `<naam>Sum` -> `<naam>Count`; `splitSum` is de
 * enige uitzondering en staat daarom bij naam. Een uitzondering die je moet opschrijven is een
 * uitzondering die je kunt tellen — een regex die "Count of TickCount, allebei goed" toestaat,
 * zou de echte fout van 2026-08-17 hebben doorgelaten.
 */
const UITZONDERING = { splitSum: 'splitTickCount' };
const tellerVoor = (som) => UITZONDERING[som] ?? som.replace(/Sum$/, 'Count');

/** Bestanden waarin een gemiddelde kan staan. Uit git, zodat een nieuw bestand vanzelf meedoet. */
function bronnen() {
  const uit = execFileSync('git', ['ls-files', 'app', 'lib', 'components'], { cwd: APP, encoding: 'utf8' });
  return uit.split('\n').filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
}

/**
 * Zoekt de toekenning van een lokale variabele terug: `const c = refs.wattsCount.current || 1`.
 * Alleen naar BOVEN vanaf de deling, en alleen binnen de laatste 40 regels — verder weg is het
 * geen lokale hulpvariabele meer en hoort de guard te klagen in plaats van te raden.
 */
function herleid(regels, index, naam) {
  for (let i = index; i >= Math.max(0, index - 40); i--) {
    const m = regels[i].match(new RegExp(`\\b(?:const|let)\\s+${naam}\\s*=\\s*refs\\.(\\w+)\\.current`));
    if (m) return m[1];
  }
  return null;
}

function analyse(bestanden, lees) {
  const bevindingen = [], gemeten = [];
  for (const f of bestanden) {
    const regels = lees(f).split('\n');
    regels.forEach((regel, i) => {
      const m = regel.match(/refs\.(\w+Sum)\.current\s*\/\s*([^;,)\s]+)/);
      if (!m) return;
      const [, som, ruweNoemer] = m;
      const verwacht = tellerVoor(som);
      let noemer = ruweNoemer.match(/refs\.(\w+)\.current/)?.[1] ?? null;
      let via = 'direct';
      if (!noemer) {
        const lokaal = ruweNoemer.match(/^[A-Za-z_$][\w$]*$/)?.[0];
        if (lokaal) { noemer = herleid(regels, i, lokaal); via = `via \`${lokaal}\``; }
      }
      gemeten.push(`${f}:${i + 1} ${som} / ${noemer ?? ruweNoemer} (${via})`);
      if (!noemer) {
        bevindingen.push(`${f}:${i + 1}: ${som} deelt door \`${ruweNoemer}\`, en dat is geen teller die hier te herleiden is`);
      } else if (noemer !== verwacht) {
        bevindingen.push(`${f}:${i + 1}: ${som} deelt door ${noemer}, verwacht ${verwacht}`);
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
  eis('er is iets te meten', controle.gemeten.length > 0, `${controle.gemeten.length} deling(en)`);

  // MUTATIE 1 — een directe noemer vervangen door tickCount: exact de fout van 2026-08-17.
  const doel = bestanden.find((f) => /refs\.\w+Sum\.current\s*\/\s*refs\.\w+\.current/.test(lees(f)));
  eis('er is een directe deling om te muteren', !!doel, doel ?? '');
  if (doel) {
    const m1 = (f) => (f === doel
      ? lees(f).replace(/refs\.(\w+Sum)\.current\s*\/\s*refs\.\w+\.current/, 'refs.$1.current / refs.tickCount.current')
      : lees(f));
    const r = analyse(bestanden, m1);
    eis('tickCount als noemer -> rood', r.bevindingen.length === 1 && /verwacht/.test(r.bevindingen[0]), r.bevindingen[0] ?? 'stil');
  }

  // MUTATIE 2 — de LOKALE tak. Zonder deze is "hij volgt een variabele terug" een aanname:
  // een guard die alleen directe noemers leest, is stil op precies de plekken waar er een
  // hulpvariabele tussen staat.
  //
  // ZOEK HET OBJECT EERST. De eerste versie van deze mutatie greep het eerste `const … =
  // refs.<x>Count.current` in het bestand, en dat was `const avgW = refs.wattsCount.current > 0`
  // — een ternary-conditie, geen noemer. Muteren veranderde daar niets aan een deling, de guard
  // zweeg terecht, en de zelftest wees naar de guard in plaats van naar zichzelf. Kies de
  // variabele dus uit wat de analyse WERKELIJK als noemer herleid heeft.
  const viaEntry = controle.gemeten.find((g) => /\(via `[^`]+`\)/.test(g));
  eis('er is een deling die via een variabele loopt', !!viaEntry, viaEntry ?? '');
  if (viaEntry) {
    const doel2 = viaEntry.split(':')[0];
    const naam = viaEntry.match(/\(via `([^`]+)`\)/)[1];
    const m2 = (f) => (f === doel2
      ? lees(f).replace(new RegExp(`(const\\s+${naam}\\s*=\\s*refs\\.)\\w+(\\.current)`), '$1tickCount$2')
      : lees(f));
    const gemuteerd = m2(doel2);
    eis('de mutatie raakte de toekenning echt', gemuteerd !== lees(doel2), `${doel2} / ${naam}`);
    const r = analyse(bestanden, m2);
    eis('een verkeerde teller ACHTER een variabele -> rood', r.bevindingen.length >= 1, r.bevindingen[0] ?? 'stil — de guard leest de variabele niet terug');
  }
  console.log(process.exitCode ? '\n  ZELFTEST GEFAALD' : '\n  zelftest ok');
  process.exit(process.exitCode ?? 0);
}

const { bevindingen, gemeten } = analyse(bronnen(), lees);
console.log(`\ncheck-averages — ${gemeten.length} gemiddelde(n) gemeten\n`);
gemeten.forEach((g) => console.log('  ' + g));
if (!gemeten.length) {
  console.error('\n  NUL delingen gevonden. Dat is geen groene meting maar een guard die niets ziet.');
  process.exit(2);
}
if (bevindingen.length) {
  console.error(`\n  ${bevindingen.length} gemiddelde(n) delen door een vreemde teller:`);
  bevindingen.forEach((b) => console.error('    ' + b));
  process.exit(1);
}
console.log('\n  ok — elk gemiddelde deelt door de teller uit zijn eigen guard.');
