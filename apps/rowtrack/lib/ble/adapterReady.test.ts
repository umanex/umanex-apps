/**
 * Tegenproef voor `waitForAdapter`.
 *
 * Deze guard bestaat omdat autoconnect verbond met een adapter die nog op `Unknown`
 * stond. Een guard die altijd wacht is even kapot als een guard die nooit wacht —
 * dan verschuift de fout alleen van "verbindt te vroeg" naar "verbindt nooit".
 * Vandaar beide kanten: één geval waarin hij meteen door moet laten, één waarin hij
 * moet wachten, plus de uitgangen (eindtoestand en deadline) die hem laten stoppen.
 *
 * Draaien: `node --test lib/ble/adapterReady.test.ts` vanuit apps/rowtrack.
 * Geen testrunner nodig — dit bestand importeert alleen types uit ble-plx, en die
 * verdwijnen bij Node's type-stripping.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BleManager, State as BleState } from 'react-native-ble-plx';
import { waitForAdapter } from './adapterReady.ts';

const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  PoweredOn: 'PoweredOn',
  PoweredOff: 'PoweredOff',
  Unauthorized: 'Unauthorized',
} as unknown as {
  Unknown: BleState; Resetting: BleState; PoweredOn: BleState;
  PoweredOff: BleState; Unauthorized: BleState;
};

/**
 * Namaak-manager. `emits` is wat CoreBluetooth ná het abonnement zou melden; de
 * eerste waarde staat voor de echo die ble-plx meestuurt bij `emitCurrentState`.
 */
function fakeManager(initial: BleState, emits: { afterMs: number; state: BleState }[] = []) {
  const calls = { onStateChange: 0, removes: 0 };
  const timers: ReturnType<typeof setTimeout>[] = [];
  const manager = {
    state: async () => initial,
    onStateChange(cb: (s: BleState) => void, emitCurrentState?: boolean) {
      calls.onStateChange += 1;
      if (emitCurrentState) cb(initial);
      for (const e of emits) timers.push(setTimeout(() => cb(e.state), e.afterMs));
      return {
        remove: () => {
          calls.removes += 1;
          for (const t of timers) clearTimeout(t);
        },
      };
    },
  } as unknown as BleManager;
  return { manager, calls };
}

test('adapter staat al aan → meteen door, geen abonnement', async () => {
  const { manager, calls } = fakeManager(State.PoweredOn);
  const t0 = Date.now();
  const state = await waitForAdapter(manager, State, 1000);
  assert.equal(state, State.PoweredOn);
  assert.equal(calls.onStateChange, 0, 'hoeft niet te wachten, dus niet te abonneren');
  assert.ok(Date.now() - t0 < 50, 'mag geen vertraging toevoegen aan het gewone geval');
});

test('adapter nog op Unknown → wacht tot PoweredOn binnenkomt', async () => {
  const { manager, calls } = fakeManager(State.Unknown, [{ afterMs: 30, state: State.PoweredOn }]);
  const state = await waitForAdapter(manager, State, 1000);
  assert.equal(state, State.PoweredOn);
  assert.equal(calls.onStateChange, 1);
  assert.equal(calls.removes, 1, 'abonnement moet opgeruimd worden');
});

test('de Unknown-echo bij het abonneren telt niet als antwoord', async () => {
  // ble-plx stuurt met `emitCurrentState: true` meteen de huidige status mee. Wie
  // daarop resolvet, is precies zo vroeg als de bug die dit moet voorkomen.
  const { manager } = fakeManager(State.Unknown, [{ afterMs: 20, state: State.PoweredOn }]);
  assert.equal(await waitForAdapter(manager, State, 1000), State.PoweredOn);
});

test('Resetting is geen eindantwoord → blijft wachten', async () => {
  const { manager } = fakeManager(State.Resetting, [{ afterMs: 20, state: State.PoweredOn }]);
  assert.equal(await waitForAdapter(manager, State, 1000), State.PoweredOn);
});

test('Bluetooth uit → meteen terug, niet wachten op iets dat niet komt', async () => {
  const { manager, calls } = fakeManager(State.PoweredOff);
  const t0 = Date.now();
  assert.equal(await waitForAdapter(manager, State, 1000), State.PoweredOff);
  assert.equal(calls.onStateChange, 0);
  assert.ok(Date.now() - t0 < 50, 'een eindtoestand mag de aanroeper niet ophouden');
});

test('geen toestemming → ook een eindtoestand', async () => {
  const { manager } = fakeManager(State.Unauthorized);
  assert.equal(await waitForAdapter(manager, State, 1000), State.Unauthorized);
});

test('adapter meldt nooit iets → deadline geeft op en ruimt op', async () => {
  const { manager, calls } = fakeManager(State.Unknown);
  const t0 = Date.now();
  const state = await waitForAdapter(manager, State, 60);
  const elapsed = Date.now() - t0;
  assert.equal(state, State.Unknown, 'geeft terug wat we hebben, hangt niet');
  assert.ok(elapsed >= 55 && elapsed < 400, `deadline moet bijten, duurde ${elapsed}ms`);
  assert.equal(calls.removes, 1, 'ook bij een timeout mag het abonnement niet lekken');
});
