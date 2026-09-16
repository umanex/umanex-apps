/**
 * Guard: de maandberekening levert over 300 scenario's exact dezelfde digest als bij de
 * laatste bewuste wijziging.
 *
 *   pnpm --filter cashflow scenarios            # draait deze suite mee, met tegenproef
 *   pnpm --filter cashflow scenarios:regression # rauw
 *
 * Waarom een hash en geen diff: `calc-baseline.ts` bewijst een refactor alleen als iemand
 * vóór én ná dumpt en de diff leest. Werk dat náást de rekenkern bouwt (het Bureau) raakt de
 * kern niet bewust, en precies daar gebeurt een verschuiving zonder dat iemand een dump maakt.
 * Deze hash maakt die verschuiving rood in CI.
 *
 * De tegenproef (`SCENARIO_SELFTEST=1`) verschuift het referentiesaldo van scenario 1 met één
 * cent vóór de berekening. Dat loopt door `computeAnchorState` en `calculateMonths` naar de
 * digest, dus hij bewijst de hele keten — niet alleen dat twee strings verschillen.
 *
 * Een BEWUSTE wijziging aan de rekenkern:
 *   1. dump vóór en ná met `calc-baseline.ts` en lees de diff;
 *   2. `pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/calc-regression.ts --print-hash`;
 *   3. zet die waarde hieronder in `EXPECTED_DIGEST`, in dezelfde commit als de wijziging.
 */
import { createHash } from 'node:crypto';
import { SCENARIO_COUNT, buildScenario, runScenario } from './calc-scenarios';

/** sha256 van `JSON.stringify(digest, null, 1)` — vastgelegd 2026-09-16 op main `b9e15c0`. */
const EXPECTED_DIGEST = '6e4f7abf494109869ffef1e7dd832662f247c55ab790fa5d02d08eb2a36ee914';

const selftest = Boolean(process.env.SCENARIO_SELFTEST);

const results = Array.from({ length: SCENARIO_COUNT }, (_, i) => {
  const scenario = buildScenario(i + 1);
  if (selftest && i === 0) scenario.referenceBalance += 0.01;
  return runScenario(scenario);
});
const actual = createHash('sha256')
  .update(JSON.stringify({ scenarioCount: SCENARIO_COUNT, results }, null, 1))
  .digest('hex');

if (process.argv.includes('--print-hash')) {
  console.log(actual);
  process.exit(0);
}

const ok = actual === EXPECTED_DIGEST;
if (ok) {
  console.log(`ok   digest over ${SCENARIO_COUNT} scenario's gelijk aan de vastgelegde hash`);
} else {
  console.log(`FAIL digest over ${SCENARIO_COUNT} scenario's wijkt af`);
  console.log(`     verwacht ${EXPECTED_DIGEST}`);
  console.log(`     kreeg    ${actual}`);
  console.log('     Onbedoeld? Een wijziging verschoof een getal in de rekenkern — dump vóór en ná met');
  console.log('     calc-baseline.ts om te zien welk. Bewust? Zie de procedure bovenaan dit bestand.');
}
console.log(`\n${ok ? 1 : 0}/1 checks geslaagd${ok ? '' : ' — 1 FOUT'}`);
process.exit(ok ? 0 : 1);
