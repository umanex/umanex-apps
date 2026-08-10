/**
 * Tegenproef voor de rust-detectie op de slagenteller.
 *
 * Beide kanten, want een detector die altijd afgaat is even nutteloos als een die
 * nooit afgaat: hier zou "altijd" betekenen dat de watt-tegel tussen twee normale
 * halen door op nul knippert. De zwijg-kant is dus het belangrijkste deel.
 *
 * Draaien: `node --test lib/ble/strokeIdle.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_IDLE_MS,
  MIN_IDLE_MS,
  isStrokeIdle,
  strokeIdleThresholdMs,
} from './strokeIdle.ts';

/** Slagperiode in ms bij een gegeven tempo. */
const period = (spm: number) => 60_000 / spm;

/**
 * De slechtste tussentijd die je tijdens normaal doorroeien kunt wáárnemen: de slag
 * valt net na een packet, dus je ziet hem pas een heel packetinterval later.
 */
const worstObservedWhileRowing = (spm: number, packetMs: number) => period(spm) + packetMs;

test('zwijgt bij elk normaal tempo, ook in het slechtste waarneemgeval', () => {
  const packetMs = 1_000; // gemeten cadans op deze erg
  for (const spm of [14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 40]) {
    const drempel = strokeIdleThresholdMs(spm, packetMs);
    const gemeten = worstObservedWhileRowing(spm, packetMs);
    assert.ok(
      gemeten < drempel,
      `bij ${spm} spm zou hij afgaan tijdens het roeien: ${Math.round(gemeten)}ms >= ${Math.round(drempel)}ms`,
    );
  }
});

test('zwijgt ook bij een tragere packetcadans', () => {
  // Niet elke erg stuurt op 1 Hz; bij 2 s tussen packets moet de marge meegroeien.
  for (const packetMs of [500, 1_000, 1_500, 2_000]) {
    for (const spm of [16, 24, 32]) {
      assert.ok(
        worstObservedWhileRowing(spm, packetMs) < strokeIdleThresholdMs(spm, packetMs),
        `${spm} spm bij ${packetMs}ms packets gaat af tijdens het roeien`,
      );
    }
  }
});

test('gaat af als er echt geen slag meer komt', () => {
  // Je laat los bij 24 spm. Eén slagperiode later had er een slag moeten zijn.
  const drempel = strokeIdleThresholdMs(24, 1_000);
  assert.ok(drempel < 5_000, `moet ruim vóór de EMA-staart vallen, was ${Math.round(drempel)}ms`);
  assert.equal(isStrokeIdle({ power: 0, spm: 24, msSinceLastStroke: drempel + 1, packetIntervalMs: 1_000 }), true);
  assert.equal(isStrokeIdle({ power: 0, spm: 24, msSinceLastStroke: drempel - 1, packetIntervalMs: 1_000 }), false);
});

test('een lager tempo krijgt vanzelf meer tijd', () => {
  assert.ok(strokeIdleThresholdMs(16, 1_000) > strokeIdleThresholdMs(30, 1_000));
});

test('vermogen betekent dat je kracht levert, ook zonder afgeronde slag', () => {
  // Statische hold: de teller loopt niet op, maar nullen zou hier liegen.
  assert.equal(
    isStrokeIdle({ power: 140, spm: 24, msSinceLastStroke: 30_000, packetIntervalMs: 1_000 }),
    false,
  );
});

test('vóór de eerste slag valt er niets te concluderen', () => {
  assert.equal(
    isStrokeIdle({ power: 0, spm: null, msSinceLastStroke: null, packetIntervalMs: 1_000 }),
    false,
  );
});

test('zonder bruikbare slagfrequentie wacht hij op de bestaande rust-transitie', () => {
  assert.equal(strokeIdleThresholdMs(null, 1_000), MAX_IDLE_MS);
  assert.equal(strokeIdleThresholdMs(0, 1_000), MAX_IDLE_MS);
  // De erg meldt geen spm meer, maar de teller staat pas 3 s stil: nog niet nullen —
  // dat pad hoort bij de idle-packets, niet hier.
  assert.equal(
    isStrokeIdle({ power: null, spm: null, msSinceLastStroke: 3_000, packetIntervalMs: 1_000 }),
    false,
  );
});

test('de grenzen klemmen naar beide kanten', () => {
  // Absurd hoog gemeld tempo mag de drempel niet onder de ondergrens duwen.
  assert.equal(strokeIdleThresholdMs(600, 0), MIN_IDLE_MS);
  // En een absurd laag tempo niet boven de bovengrens.
  assert.equal(strokeIdleThresholdMs(1, 1_000), MAX_IDLE_MS);
});

test('een negatieve of onzinnige packetcadans verkort de drempel niet', () => {
  assert.equal(strokeIdleThresholdMs(24, -5_000), strokeIdleThresholdMs(24, 0));
});
