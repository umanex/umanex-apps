import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { gedeeldeManager, vernietigGedeeldeManager, heeftGedeeldeManager } from './sharedManager.ts';

/**
 * Een stub die ble-plx' eigenaardigheid nabootst: `destroy()` is niet idempotent aan de kant
 * van de aanroeper, want de echte manager zet zijn `sharedInstance` op null en een tweede
 * `destroy()` werkt dan op een client zonder backing (`BleManager.js:161-163`). De stub telt
 * daarom hoe vaak hij vernietigd is; meer dan één keer is het defect.
 */
function maakStub() {
  const stub = {
    vernietigd: 0,
    destroy() {
      stub.vernietigd++;
    },
  };
  return stub;
}

describe('gedeelde BleManager — één eigenaar', () => {
  beforeEach(() => {
    vernietigGedeeldeManager();
  });

  test('twee diensten die er elk "een eigen" manager vragen, krijgen hetzelfde object', () => {
    // Dit is wat ble-plx per constructie doet, en waarom de diensten hem niet kunnen bezitten.
    let gemaakt = 0;
    const roeier = gedeeldeManager(() => {
      gemaakt++;
      return maakStub() as never;
    });
    const hartslag = gedeeldeManager(() => {
      gemaakt++;
      return maakStub() as never;
    });
    assert.equal(gemaakt, 1, 'de tweede aanvraag hoort geen tweede manager te maken');
    assert.equal(roeier, hartslag);
  });

  test('de manager wordt precies ÉÉN keer vernietigd, ook bij een dubbele teardown', () => {
    // DIT IS HET DEFECT. Vóór deze wijziging riepen beide diensten `manager.destroy()` aan op
    // hetzelfde object: de eerste sloopte hem onder de tweede vandaan, de tweede sprak een al
    // vernietigde client aan. Haal `vernietigGedeeldeManager`'s nulling weg en deze telling
    // loopt naar 2.
    const stub = maakStub();
    gedeeldeManager(() => stub as never);
    vernietigGedeeldeManager();
    vernietigGedeeldeManager();
    assert.equal(stub.vernietigd, 1);
  });

  test('na de teardown is er geen manager meer, en een remount maakt een verse', () => {
    const eerste = maakStub();
    gedeeldeManager(() => eerste as never);
    assert.equal(heeftGedeeldeManager(), true);

    vernietigGedeeldeManager();
    assert.equal(heeftGedeeldeManager(), false, 'de teardown hoort het eigenaarschap vrij te geven');

    const tweede = maakStub();
    const na = gedeeldeManager(() => tweede as never);
    assert.equal(na, tweede, 'na een teardown hoort een remount een verse manager te krijgen');
    assert.notEqual(na, eerste);
  });

  test('vernietigen zonder dat er ooit een manager was, doet niets en gooit niet', () => {
    // De provider-cleanup draait ook wanneer geen van beide diensten ooit verbonden heeft;
    // `getManager()` is lui, dus dan bestaat er niets om te vernietigen.
    assert.equal(heeftGedeeldeManager(), false);
    assert.doesNotThrow(() => vernietigGedeeldeManager());
  });
});
