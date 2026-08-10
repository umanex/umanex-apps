/**
 * Tegenproef voor de regel "verbonden betekent dat er hartslag binnenkomt".
 *
 * De faalklasse die dit moet vangen is niet een verkeerde berekening maar een
 * verkeerde bewéring: de app zei "verbonden" op grond van een GATT-link, terwijl de
 * gebruiker daar "er komt hartslag binnen" in leest. Elke test hieronder is dus een
 * scenario, geen functieaanroep — de reeks gebeurtenissen die op de erg voorkomt,
 * afgespeeld tegen de overgangsfunctie.
 *
 * Draaien: `node --test lib/ble/hrLink.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialHrLink,
  stepHrLink,
  type HrLinkEffect,
  type HrLinkEvent,
  type HrLinkState,
} from './hrLink.ts';

/** Speelt een reeks gebeurtenissen af en houdt bij wat er onderweg gepubliceerd is. */
function replay(events: HrLinkEvent[], from: HrLinkState = initialHrLink) {
  let state = from;
  const effects: HrLinkEffect[] = [];
  for (const event of events) {
    const next = stepHrLink(state, event);
    state = next.state;
    effects.push(next.effect);
  }
  return {
    state,
    effects,
    /** Alleen de statussen die daadwerkelijk naar de UI gingen. */
    statuses: effects.map((e) => e.status).filter(Boolean),
    rearms: effects.filter((e) => e.rearmDeadline).length,
    releases: effects.filter((e) => e.release).length,
  };
}

const subscribed = (silent: boolean): HrLinkEvent => ({ type: 'subscribed', silent });
const beat: HrLinkEvent = { type: 'measurement', usable: true };
const junk: HrLinkEvent = { type: 'measurement', usable: false };
const silence: HrLinkEvent = { type: 'silence' };

test('een abonnement alléén is nooit genoeg voor "verbonden"', () => {
  // Dit is de bug in één regel: hier stond vroeger 'connected'.
  const { state, statuses } = replay([subscribed(false)]);
  assert.equal(state.phase, 'waiting');
  assert.deepEqual(statuses, ['waiting']);
});

test('de eerste bruikbare meting promoveert, de rest zwijgt', () => {
  const { state, statuses, rearms } = replay([subscribed(false), beat, beat, beat]);
  assert.equal(state.phase, 'live');
  assert.deepEqual(statuses, ['waiting', 'connected'], 'geen statusstroom bij elke hartslag');
  assert.equal(rearms, 4, 'elke bruikbare meting houdt de verbinding geldig');
});

test('onbruikbare metingen promoveren niet en houden niets in leven', () => {
  // Horloge van de pols: het stuurt wél packets, maar 0 bpm. Technisch leven,
  // praktisch geen hartslag — en dat verschil moet zichtbaar blijven.
  const { state, statuses, rearms } = replay([subscribed(false), junk, junk, junk]);
  assert.equal(state.phase, 'waiting');
  assert.deepEqual(statuses, ['waiting']);
  assert.equal(rearms, 1, 'alleen het abonnement zette de deadline, de nullen niet');
});

test('een band die alleen nullen stuurt loopt netjes af in een fout', () => {
  const { state, statuses, effects } = replay([subscribed(false), junk, junk, silence]);
  assert.equal(state.phase, 'idle');
  assert.deepEqual(statuses, ['waiting', 'error']);
  assert.equal(effects.at(-1)?.error, 'hr_no_data');
  assert.equal(effects.at(-1)?.release, true, 'vastgehouden toestel verdwijnt uit scanresultaten');
});

test('autoconnect die niets ontvangt faalt stil', () => {
  // De gebruiker vroeg hier niet om, dus krijgt hij ook geen foutmelding — de rij
  // valt gewoon terug op "Verbinden". Dat is het contract van `connectKnown`.
  const { state, statuses, effects } = replay([subscribed(true), silence]);
  assert.equal(state.phase, 'idle');
  assert.deepEqual(statuses, ['waiting', 'idle']);
  assert.equal(effects.at(-1)?.error, undefined, 'stil betekent zonder melding');
  assert.equal(effects.at(-1)?.release, true, 'stil betekent niet: blijven vasthouden');
});

test('een handmatige poging die niets ontvangt legt wél uit waarom', () => {
  const { statuses, effects } = replay([subscribed(false), silence]);
  assert.deepEqual(statuses, ['waiting', 'error']);
  assert.equal(effects.at(-1)?.error, 'hr_no_data');
});

test('stilvallen ná echte data meldt altijd, ook bij autoconnect', () => {
  // Hier is het stilvallen zélf het nieuws: je zag een getal en dat klopt niet meer.
  // Stil blijven zou de bevroren-hartslag-bug terugbrengen, nu als UI-probleem.
  const { state, statuses, effects } = replay([subscribed(true), beat, silence]);
  assert.equal(state.phase, 'idle');
  assert.deepEqual(statuses, ['waiting', 'connected', 'error']);
  assert.equal(effects.at(-1)?.error, 'hr_no_data');
});

test('data die blijft komen valt nooit stil', () => {
  const events = [subscribed(false), ...Array.from({ length: 200 }, () => beat)];
  const { state, statuses } = replay(events);
  assert.equal(state.phase, 'live');
  assert.equal(statuses.filter((s) => s === 'error').length, 0);
});

test('een late meting na loslaten zet de rij niet terug op groen', () => {
  // Callbacks van een toestel dat we al losgelaten hebben kunnen nog binnenvallen.
  const { state, statuses } = replay([subscribed(false), beat, { type: 'released' }, beat, beat]);
  assert.equal(state.phase, 'idle');
  assert.deepEqual(statuses, ['waiting', 'connected'], 'niets ná het loslaten');
});

test('stilte in rust doet niets — er valt niets los te laten', () => {
  const { state, effects } = replay([silence]);
  assert.equal(state.phase, 'idle');
  assert.deepEqual(effects, [{}]);
});

test('opnieuw verbinden begint schoon, ook na een geslaagde sessie', () => {
  const na = replay([subscribed(false), beat, { type: 'released' }]).state;
  const { state, statuses } = replay([subscribed(true)], na);
  assert.equal(state.phase, 'waiting');
  assert.equal(state.silent, true, 'de nieuwe poging bepaalt of falen stil mag zijn');
  assert.deepEqual(statuses, ['waiting'], 'geen groen dat uit de vorige sessie doorlekt');
});
