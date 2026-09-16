/**
 * Tegenproef voor de Supabase-deadline — beide kanten: een verzoek dat nooit antwoordt móet
 * afgebroken worden, en een verzoek dat wél antwoordt mag daarna niets meer afbreken.
 *
 * Die tweede kant is niet decoratief. Een wrapper die zijn timer laat staan, breekt een
 * hergebruikte verbinding af nadat het antwoord al binnen was — en dat is aan de uitkomst van
 * de eerste test niet te zien. Beide tests kijken daarom naar hetzelfde waarneembare effect:
 * de `signal` die de onderliggende fetch te zien kreeg.
 *
 * Draaien: `node --test lib/supabaseFetch.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchWithDeadline,
  isDeadlineError,
  RequestDeadlineError,
  SUPABASE_REQUEST_TIMEOUT_MS,
} from './supabaseFetch.ts';

/** De fout waarmee een echte fetch een afgebroken verzoek verwerpt. */
function afbreekFout(): Error {
  // whatwg-fetch verwerpt met DOMException('Aborted', 'AbortError'), undici met een
  // gelijknamige DOMException; beide dragen `name === 'AbortError'` en dát is wat telt.
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

/**
 * Een fetch die nooit antwoordt, en die de `signal` bewaart die hij binnenkreeg.
 *
 * Hij verwerpt óók meteen wanneer het signal al afgebroken binnenkomt. Dat is geen
 * vriendelijkheid maar trouw aan het origineel: `whatwg-fetch@3.6.20` toetst `request.signal
 * .aborted` vóór hij de XHR opent (`dist/fetch.umd.js:536-538`). Een dubbel dat alleen op de
 * gebeurtenis wacht, blijft in dat geval hangen — waargenomen bij het schrijven van deze
 * suite, en dan meet de test zijn eigen dubbel in plaats van de wrapper.
 */
function hangendeFetch() {
  const gezien: { signal?: AbortSignal } = {};
  const fetchLike = ((_input: unknown, init?: { signal?: AbortSignal }) => {
    gezien.signal = init?.signal;
    if (init?.signal?.aborted) return Promise.reject(afbreekFout());
    return new Promise<never>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(afbreekFout()));
    });
  }) as unknown as Parameters<typeof fetchWithDeadline>[0];
  return { fetchLike, gezien };
}

/** Een fetch die meteen antwoordt, en die de `signal` bewaart die hij binnenkreeg. */
function snelleFetch(antwoord: unknown = { ok: true }) {
  const gezien: { signal?: AbortSignal } = {};
  const fetchLike = ((_input: unknown, init?: { signal?: AbortSignal }) => {
    gezien.signal = init?.signal;
    return Promise.resolve(antwoord);
  }) as unknown as Parameters<typeof fetchWithDeadline>[0];
  return { fetchLike, gezien };
}

test('een verzoek dat nooit antwoordt, wordt op de deadline afgebroken', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { fetchLike, gezien } = hangendeFetch();

  const bezig = fetchWithDeadline(fetchLike, 20_000)('https://voorbeeld.test/rest/v1/workouts');
  // Zonder deze regel is de test een tautologie: hij moet vastzitten vóór de tijd verstrijkt.
  assert.equal(gezien.signal?.aborted, false, 'vóór de deadline loopt het verzoek gewoon');

  t.mock.timers.tick(19_999);
  assert.equal(gezien.signal?.aborted, false, 'één ms vóór de grens gebeurt er nog niets');

  t.mock.timers.tick(1);
  await assert.rejects(bezig, (error: unknown) => {
    assert.ok(isDeadlineError(error), 'de aanroeper kan een deadline herkennen');
    assert.equal((error as Error).name, 'AbortError');
    return true;
  });
  assert.equal(gezien.signal?.aborted, true, 'de onderliggende fetch is echt afgebroken');
});

test('de fout heet AbortError, want postgrest-js hertest alles wat zo niet heet', () => {
  // Gemeten in @supabase/postgrest-js@2.105.3 (dist/index.mjs:268): een fout met
  // name 'AbortError' of code 'ABORT_ERR' wordt meteen doorgegooid, al het andere gaat op
  // een GET tot DEFAULT_MAX_RETRIES = 3 keer opnieuw. Onder een andere naam zou de deadline
  // van 20 s dus vier pogingen van 20 s worden — precies de toestand die hij moet beëindigen.
  const fout = new RequestDeadlineError(20_000);
  assert.equal(fout.name, 'AbortError');
  assert.equal(fout.deadlineMs, 20_000);
  assert.match(fout.message, /20000 ms/);
});

test('een verzoek dat wél antwoordt, geeft zijn timer vrij', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { fetchLike, gezien } = snelleFetch({ status: 200 });

  const antwoord = await fetchWithDeadline(fetchLike, 20_000)('https://voorbeeld.test/rest/v1/profiles');
  assert.deepEqual(antwoord, { status: 200 });

  // De positieve controle op de vorige test: bleef de timer staan, dan breekt hij hier alsnog
  // een afgehandeld verzoek af. Ruim over de deadline heen tikken en niets mag bewegen.
  t.mock.timers.tick(60_000);
  assert.equal(gezien.signal?.aborted, false, 'na een antwoord mag er niets meer afgebroken worden');
});

test('een afbreking door de aanroeper blijft wat ze is', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { fetchLike, gezien } = hangendeFetch();
  const eigen = new AbortController();

  const bezig = fetchWithDeadline(fetchLike, 20_000)('https://voorbeeld.test/rest/v1/workouts', {
    signal: eigen.signal,
  });
  eigen.abort();

  await assert.rejects(bezig, (error: unknown) => {
    // Wél afgebroken, maar géén deadline: anders leest een annulering door de app als
    // "de server antwoordde niet" en zou een scherm er een netwerkfout van maken.
    assert.equal((error as Error).name, 'AbortError');
    assert.equal(isDeadlineError(error), false);
    return true;
  });
  assert.equal(gezien.signal?.aborted, true);
});

test('een signal dat al afgebroken is, breekt meteen af', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { fetchLike, gezien } = hangendeFetch();
  const eigen = new AbortController();
  eigen.abort();

  const bezig = fetchWithDeadline(fetchLike, 20_000)('https://voorbeeld.test/rest/v1/workouts', {
    signal: eigen.signal,
  });

  await assert.rejects(bezig, (error: unknown) => {
    assert.equal(isDeadlineError(error), false);
    return true;
  });
  assert.equal(gezien.signal?.aborted, true, 'de fetch kreeg een al-afgebroken signal');
});

test('de deadline is gelijk aan die van de Edge Function-invoke', () => {
  // `DELETE_TIMEOUT_MS` in lib/auth.ts staat op 20_000. Liep deze deadline vóór, dan zou de
  // eigen timeout van `functions.invoke` nooit afgaan en zou de uitkomst 'uncertain' daar
  // onbereikbaar worden.
  assert.equal(SUPABASE_REQUEST_TIMEOUT_MS, 20_000);
});
