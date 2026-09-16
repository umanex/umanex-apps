/**
 * Refactor-vangnet voor de maandberekening.
 *
 * Dumpt een deterministische digest van élke berekende waarde over een brede set
 * gegenereerde scenario's: de calculator-output én de formules die de UI vandaag zelf
 * uitrekent (maandkaart-eindsaldo, KPI-tegels, sectiekoppen). Draai het script vóór en
 * ná een refactor en diff de twee bestanden — een lege diff bewijst dat er geen enkel
 * getal verschoven is.
 *
 *   pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/calc-baseline.ts > before.json
 *   ...refactor...
 *   pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/calc-baseline.ts > after.json
 *   diff before.json after.json
 *
 * De generator en de digest staan in `calc-scenarios.ts`, gedeeld met `calc-regression.ts`,
 * die dezelfde dump als hash bewaakt in CI.
 */
import { baselineDigest } from './calc-scenarios';

console.log(JSON.stringify(baselineDigest(), null, 1));
