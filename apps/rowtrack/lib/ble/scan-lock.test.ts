/**
 * Tegenproef voor de scan-arbiter — beide kanten, cf. de guard-regel: gevallen waarin een
 * tweede scan móet wachten, en gevallen waarin hij meteen door mag.
 *
 * Het gemeten scenario van 2026-08-22 staat er als eigen test in: hartslag-scan start,
 * roeier-scan volgt een halve seconde later, en de tweede mag de eerste niet verdringen.
 *
 * Draaien: `node --test lib/ble/scan-lock.test.ts` vanuit apps/rowtrack.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestScan,
  ownsScan,
  releaseScan,
  isQueuedForScan,
  resetScanArbiter,
} from './scan-lock.ts';

afterEach(() => resetScanArbiter());

const hr = Symbol('hr');
const rower = Symbol('rower');

test('een vrije arbiter start meteen', () => {
  let started = 0;
  requestScan(hr, () => started++);
  assert.equal(started, 1);
  assert.ok(ownsScan(hr));
});

test('het gemeten geval: de tweede scan verdringt de eerste niet, maar wacht', () => {
  const volgorde: string[] = [];
  requestScan(hr, () => volgorde.push('hr'));
  requestScan(rower, () => volgorde.push('rower'));

  // Vóór de fix nam de roeier hier het slot over en verstomde de hartslagdienst.
  assert.deepEqual(volgorde, ['hr']);
  assert.ok(ownsScan(hr));
  assert.ok(!ownsScan(rower));
  assert.ok(isQueuedForScan(rower));

  releaseScan(hr);
  assert.deepEqual(volgorde, ['hr', 'rower']);
  assert.ok(ownsScan(rower));
});

test('de zwijg-kant: loslaten zonder wachtenden laat het slot gewoon vrij', () => {
  requestScan(hr, () => {});
  releaseScan(hr);
  assert.ok(!ownsScan(hr));
  assert.ok(!isQueuedForScan(hr));
});

test('loslaten door een niet-eigenaar raakt de lopende scan niet', () => {
  const volgorde: string[] = [];
  requestScan(hr, () => volgorde.push('hr'));
  releaseScan(rower);
  assert.ok(ownsScan(hr), 'de hartslagdienst houdt het slot');
  assert.deepEqual(volgorde, ['hr']);
});

test('een wachtende die zich terugtrekt, start later niet alsnog', () => {
  const volgorde: string[] = [];
  requestScan(hr, () => volgorde.push('hr'));
  requestScan(rower, () => volgorde.push('rower'));

  releaseScan(rower); // de gebruiker verbrak, of het scherm ging weg
  assert.ok(!isQueuedForScan(rower));

  releaseScan(hr);
  assert.deepEqual(volgorde, ['hr'], 'de ingetrokken aanvraag hoort niet meer te vuren');
});

test('dezelfde token twee keer in de rij telt als één aanvraag, met de nieuwste start', () => {
  const volgorde: string[] = [];
  requestScan(hr, () => volgorde.push('hr'));
  requestScan(rower, () => volgorde.push('rower-oud'));
  requestScan(rower, () => volgorde.push('rower-nieuw'));

  releaseScan(hr);
  assert.deepEqual(volgorde, ['hr', 'rower-nieuw']);
});

test('de eigenaar die opnieuw aanvraagt, herstart zonder in de rij te gaan staan', () => {
  const volgorde: string[] = [];
  requestScan(hr, () => volgorde.push('eerste'));
  requestScan(hr, () => volgorde.push('tweede'));
  assert.deepEqual(volgorde, ['eerste', 'tweede']);
  assert.ok(ownsScan(hr));
});

test('het vangnet geeft het slot vrij als een dienst vergeet los te laten', (t) => {
  // Gemockte klok. Met echte timers hing deze test aan ms-drift, gemeten op 2026-08-25: de
  // hr-guard wordt vóór de wachttimer gepland, en valt er een ms-grens tussen die twee
  // setTimeout-aanroepen, dan verloopt de roeier-guard (hr-start + 20 + 20) één ms vóór de
  // wacht (start + 40) en vuurt hij eerst — 1/30 zonder drift, 18/30 bij 1,5 ms, 29/30 bij
  // 3 ms. Op een trage CI-runner faalde hij zo twee keer op één dag. Met tick() is er geen
  // klok om tegen te racen, en kan de grens zélf getoetst worden.
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const volgorde: string[] = [];
  let onteigend = 0;
  requestScan(hr, () => volgorde.push('hr'), { maxHoldMs: 20, onPreempted: () => onteigend++ });
  requestScan(rower, () => volgorde.push('rower'), { maxHoldMs: 20 });

  assert.deepEqual(volgorde, ['hr'], 'nog binnen de tijd: de roeier wacht');
  t.mock.timers.tick(19);
  assert.deepEqual(volgorde, ['hr'], 'één ms vóór de grens vuurt het vangnet nog niet');
  assert.equal(onteigend, 0);

  t.mock.timers.tick(1);
  // Zonder dit vangnet blokkeert één dienst die nooit loslaat de wachtrij voorgoed —
  // exact de faalklasse die deze module moest wegnemen.
  assert.deepEqual(volgorde, ['hr', 'rower']);
  assert.ok(ownsScan(rower));
  assert.ok(!ownsScan(hr), 'de onteigende dienst is zijn slot echt kwijt');
  // En hij hoort dat te wéten: stil onteigenen is precies het mechanisme dat deze module
  // moest wegnemen, en het zou hier via de noodrem terugkomen.
  assert.equal(onteigend, 1);

  // De roeier krijgt zijn eigen vangnet, gerekend vanaf zíjn toekenning: pas 20 ms later
  // is ook hij zijn slot kwijt en staat de arbiter leeg.
  t.mock.timers.tick(19);
  assert.ok(ownsScan(rower), 'de nieuwe eigenaar krijgt de volle maxHold');
  t.mock.timers.tick(1);
  assert.ok(!ownsScan(rower));
  assert.ok(!ownsScan(hr));
});

test('een late release uit een vorige cyclus raakt de nieuwe toekenning niet', () => {
  // Gemeten faalgeval: `stopScan()` plant zijn release op de Promise van
  // `stopDeviceScan()`, en `startScan()` vraagt in hetzelfde synchrone blok opnieuw aan.
  // Zonder handle brak die late release de zojuist gestarte scan af en startte hij de
  // wachtende eroverheen — twee diensten op één native scan.
  const handles: number[] = [];
  requestScan(hr, (h) => handles.push(h));
  const eersteHandle = handles[0];

  const volgorde: string[] = [];
  requestScan(rower, () => volgorde.push('rower'));   // wacht
  requestScan(hr, (h) => handles.push(h));            // dezelfde dienst, nieuwe toekenning

  releaseScan(hr, eersteHandle); // de late release van ronde één landt nu pas

  assert.ok(ownsScan(hr), 'de nieuwe toekenning blijft staan');
  assert.deepEqual(volgorde, [], 'de wachtende mag hier niet starten');
  assert.notEqual(handles[0], handles[1]);

  releaseScan(hr, handles[1]);
  assert.deepEqual(volgorde, ['rower'], 'met de júiste handle gaat het slot wél door');
});

test('een start die meteen aan de beurt is en gooit, geeft het slot vrij én de fout door', () => {
  assert.throws(() => {
    requestScan(hr, () => {
      throw new Error('boem');
    });
  }, /boem/);

  // Zonder de try/catch in `grant` blijft het slot bij de gooier hangen en wacht de
  // volgende de volle maxHold — 25 s stilte zonder dat iemand ziet waarom.
  assert.ok(!ownsScan(hr));

  const volgorde: string[] = [];
  requestScan(rower, () => volgorde.push('rower'));
  assert.deepEqual(volgorde, ['rower'], 'het slot is echt vrij');
});

test('een start die uit de wachtrij gooit, breekt de release van de ander niet', () => {
  const volgorde: string[] = [];
  const fouten: unknown[] = [];
  requestScan(rower, () => volgorde.push('rower'));
  requestScan(
    hr,
    () => {
      throw new Error('boem');
    },
    { onStartError: (e) => fouten.push(e) },
  );

  // De roeier laat los; de hartslagdienst komt aan de beurt en gooit. Doorgooien zou hier
  // de `.then()`-keten van de róeier breken — een unhandled rejection in een dienst die
  // zelf niets fout deed. De fout hoort bij de job die hem veroorzaakte.
  assert.doesNotThrow(() => releaseScan(rower));

  assert.equal(fouten.length, 1);
  assert.match(String((fouten[0] as Error).message), /boem/);
  assert.ok(!ownsScan(hr), 'het slot blijft niet bij de gooier hangen');
});

test('drie aanvragen lopen in volgorde af, één tegelijk', () => {
  const derde = Symbol('derde');
  const volgorde: string[] = [];
  requestScan(hr, () => volgorde.push('hr'));
  requestScan(rower, () => volgorde.push('rower'));
  requestScan(derde, () => volgorde.push('derde'));

  assert.deepEqual(volgorde, ['hr']);
  releaseScan(hr);
  assert.deepEqual(volgorde, ['hr', 'rower']);
  assert.ok(!ownsScan(derde));
  releaseScan(rower);
  assert.deepEqual(volgorde, ['hr', 'rower', 'derde']);
});
