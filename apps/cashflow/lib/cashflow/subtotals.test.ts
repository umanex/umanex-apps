import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potStandAtStart, provisionStandForHeader } from './subtotals.ts';
import { pot } from '../bureau/testing.ts';

const potten = [
  pot({ reservationId: 'btw', deferredFromPrevious: 3_000, provisionThisMonth: 500 }),
  pot({ reservationId: 'buffer', deferredFromPrevious: 1_000, isDeficitBuffer: true }),
  pot({ reservationId: 'budget', potType: 'maandelijks_budget', deferredFromPrevious: 400 }),
  pot({ reservationId: 'afgerond', deferredFromPrevious: 900, finalized: true }),
];

test('potstand bij de start: provisies en bufferpot apart, budgetten en gefinaliseerde potten niet', () => {
  assert.deepEqual(potStandAtStart(potten), { provisions: 3_000, buffer: 1_000 });
});

test('provisiebrug: alleen op bankbasis, waar de kop de stand draagt', () => {
  assert.equal(provisionStandForHeader('bank', potten), 3_000);
});

test('provisiebrug: geen brug op vrije basis of zonder basis (afgesloten kolom uit een latere-maand-snapshot)', () => {
  // Tegenproef van de vorige: dezelfde potten, alleen de basis verschilt. Hing de gate aan de
  // kolompositie in plaats van aan de basis, dan kon deze functie het verschil niet zien.
  assert.equal(provisionStandForHeader('vrij', potten), undefined);
  assert.equal(provisionStandForHeader(undefined, potten), undefined);
});
