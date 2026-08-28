import test from 'node:test';
import assert from 'node:assert/strict';

import { retryOnClockSkew } from './authClockSkew.ts';

type Res = { data: string | null; error: { code?: string } | null };

const ok: Res = { data: 'rij', error: null };
const skew: Res = { data: null, error: { code: 'PGRST303' } };
const anders: Res = { data: null, error: { code: '42703' } };

/** Geeft de opgegeven uitkomsten op volgorde terug en telt de aanroepen. */
function reeks(...uitkomsten: Res[]) {
  let n = 0;
  return {
    run: () => Promise.resolve(uitkomsten[Math.min(n++, uitkomsten.length - 1)]),
    aantal: () => n,
  };
}

test('een geslaagde query gaat ongewijzigd door, zonder tweede poging', async () => {
  const r = reeks(ok);
  const res = await retryOnClockSkew(r.run, undefined, 0);
  assert.deepEqual(res, ok);
  assert.equal(r.aantal(), 1);
});

test('PGRST303 wordt één keer opnieuw geprobeerd en levert dan het echte antwoord', async () => {
  const r = reeks(skew, ok);
  const res = await retryOnClockSkew(r.run, undefined, 0);
  assert.deepEqual(res, ok);
  assert.equal(r.aantal(), 2);
});

test('blijft de klokafwijking staan, dan komt de fout terug — geen lus', async () => {
  const r = reeks(skew, skew);
  const res = await retryOnClockSkew(r.run, undefined, 0);
  assert.equal(res.error?.code, 'PGRST303');
  assert.equal(r.aantal(), 2);
});

test('een andere foutcode wordt niet opnieuw geprobeerd', async () => {
  // Negatieve controle: zonder deze zou een retry-op-alles dezelfde groene
  // uitkomst geven als een retry-op-PGRST303, en meet de suite niets.
  const r = reeks(anders, ok);
  const res = await retryOnClockSkew(r.run, undefined, 0);
  assert.equal(res.error?.code, '42703');
  assert.equal(r.aantal(), 1);
});

test('de melder vuurt precies één keer bij een klokafwijking, en nooit daarbuiten', async () => {
  const gemeld: Array<{ code?: string }> = [];
  const skewR = reeks(skew, ok);
  await retryOnClockSkew(skewR.run, (e) => gemeld.push(e), 0);
  assert.equal(gemeld.length, 1);
  assert.equal(gemeld[0]?.code, 'PGRST303');

  const okR = reeks(ok);
  await retryOnClockSkew(okR.run, (e) => gemeld.push(e), 0);
  assert.equal(gemeld.length, 1);
});

test('een query zonder foutveld telt niet als klokafwijking', async () => {
  const r = reeks({ data: null, error: null });
  const res = await retryOnClockSkew(r.run, undefined, 0);
  assert.equal(res.error, null);
  assert.equal(r.aantal(), 1);
});
