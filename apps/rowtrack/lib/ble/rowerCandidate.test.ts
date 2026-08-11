/**
 * Tegenproef voor `isRowerCandidate` — beide kanten, cf. de guard-regel:
 * gevallen die moeten matchen (FTMS-UUID in elke notatie, naam-prefix als
 * vangnet) én gevallen die stil moeten blijven (ander toestel, geen data).
 *
 * Draaien: `node --test lib/ble/rowerCandidate.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRowerCandidate, normalizeUuid } from './rowerCandidate.ts';
import { FTMS_SERVICE_UUID, ROWER_NAME_PREFIX } from './constants.ts';

test('de gespiegelde constanten lopen gelijk met constants.ts', () => {
  assert.ok(isRowerCandidate({ serviceUUIDs: [FTMS_SERVICE_UUID] }));
  assert.ok(isRowerCandidate({ name: ROWER_NAME_PREFIX + ' 0123' }));
});

test('normalizeUuid vult 16-bit en 32-bit aan tot 128-bit lowercase', () => {
  assert.equal(normalizeUuid('1826'), '00001826-0000-1000-8000-00805f9b34fb');
  assert.equal(normalizeUuid('00001826'), '00001826-0000-1000-8000-00805f9b34fb');
  assert.equal(
    normalizeUuid('00001826-0000-1000-8000-00805F9B34FB'),
    '00001826-0000-1000-8000-00805f9b34fb',
  );
});

test('matcht op geadverteerde FTMS UUID, ongeacht naam of notatie', () => {
  assert.ok(isRowerCandidate({ name: 'PM5 430123456', serviceUUIDs: ['1826'] }));
  assert.ok(isRowerCandidate({ name: 'S4 Comms', serviceUUIDs: ['00001826'] }));
  assert.ok(
    isRowerCandidate({
      localName: 'KayakPro',
      serviceUUIDs: ['0000180A-0000-1000-8000-00805F9B34FB', '00001826-0000-1000-8000-00805f9b34fb'],
    }),
  );
});

test('naam-prefix blijft als vangnet zonder geadverteerde FTMS UUID', () => {
  assert.ok(isRowerCandidate({ name: 'Rower 0123' }));
  assert.ok(isRowerCandidate({ name: null, localName: 'Rower 0123', serviceUUIDs: null }));
});

test('zwijgt bij toestellen zonder FTMS UUID én zonder prefix', () => {
  assert.equal(isRowerCandidate({ name: 'Polar H10', serviceUUIDs: ['180d'] }), false);
  assert.equal(isRowerCandidate({ name: 'MijnRower' }), false); // prefix is begin, geen substring
  assert.equal(isRowerCandidate({}), false);
});
