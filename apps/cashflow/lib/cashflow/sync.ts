import { selectCashflowData, useCashflowStore } from '../../store/cashflow';
import {
  RevisionConflictError,
  createInitialState,
  deleteSnapshot,
  loadState,
  saveState,
  upsertSnapshot,
} from './repository';
import { emptyData } from './normalize';
import { errorMessage } from './error-message';
import { useSyncStatus } from './sync-status';
import type { CashflowData, MonthSnapshot } from './types';

/**
 * Wachttijd na de laatste toetsaanslag voor er geschreven wordt. Lang genoeg om het typen
 * van een bedrag niet in tien schrijfacties te laten ontaarden, kort genoeg om bij het
 * wegklikken van de tab nog binnen te zijn.
 */
const DEBOUNCE_MS = 800;

let userId: string | null = null;
let revision = 0;
let lastPushedData: CashflowData | null = null;
let lastPushedSnapshots: MonthSnapshot[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
/**
 * Schrijfacties worden achter elkaar gezet in plaats van parallel. Twee gelijktijdige
 * pushes zouden allebei met hetzelfde revisienummer vertrekken en de tweede zou onterecht
 * als conflict terugkomen.
 */
let chain: Promise<void> = Promise.resolve();

const DATA_KEYS = Object.keys(emptyData()) as Array<keyof CashflowData>;

/**
 * Immer geeft alleen gewijzigde deelbomen een nieuwe identiteit, dus een vergelijking per
 * veld op referentie is zowel goedkoop als correct.
 */
function dataUnchanged(next: CashflowData, previous: CashflowData | null): boolean {
  if (!previous) return false;
  return DATA_KEYS.every((key) => next[key] === previous[key]);
}

async function syncSnapshots(uid: string, next: MonthSnapshot[]): Promise<void> {
  const previousByMonth = new Map(lastPushedSnapshots.map((s) => [s.monthKey, s]));
  const nextByMonth = new Map(next.map((s) => [s.monthKey, s]));

  for (const [monthKey, snapshot] of nextByMonth) {
    if (previousByMonth.get(monthKey) !== snapshot) await upsertSnapshot(uid, snapshot);
  }
  for (const monthKey of previousByMonth.keys()) {
    if (!nextByMonth.has(monthKey)) await deleteSnapshot(uid, monthKey);
  }

  lastPushedSnapshots = next;
}

async function push(): Promise<void> {
  const uid = userId;
  if (!uid) return;
  if (useSyncStatus.getState().state === 'conflict') return;

  const state = useCashflowStore.getState();
  const data = selectCashflowData(state);
  const snapshots = state.monthSnapshots;

  const snapshotsUnchanged =
    snapshots.length === lastPushedSnapshots.length &&
    snapshots.every((s, i) => lastPushedSnapshots[i] === s);
  if (dataUnchanged(data, lastPushedData) && snapshotsUnchanged) return;

  useSyncStatus.getState().setStatus('saving');
  try {
    // Snapshots eerst: een afgesloten maand hoort te bestaan vóór het document dat
    // hem via reopenedMonths kan tegenspreken.
    await syncSnapshots(uid, snapshots);
    if (!dataUnchanged(data, lastPushedData)) {
      revision = await saveState(uid, data, revision);
      lastPushedData = data;
    }
    useSyncStatus.getState().setStatus('idle');
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      useSyncStatus.getState().setStatus('conflict', error.message);
    } else {
      console.error('[cashflow] opslaan mislukt', error);
      useSyncStatus.getState().setStatus('error', errorMessage(error));
    }
  }
}

function schedulePush(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    chain = chain.then(push);
  }, DEBOUNCE_MS);
}

/** Schrijft een uitgestelde wijziging meteen weg. */
export function flushSync(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  chain = chain.then(push);
  return chain;
}

/**
 * Haalt de stand op en zet de store. Bestaat er nog geen document, dan wordt er één
 * aangelegd — dat is het pad voor een verse gebruiker, niet voor de migratie van
 * bestaande data (die loopt via scripts/seed-supabase.mjs).
 */
export async function hydrateFromRemote(uid: string): Promise<void> {
  const loaded = (await loadState(uid)) ?? (await createInitialState(uid, emptyData()));

  useCashflowStore.getState().hydrate(loaded.data, loaded.snapshots);

  userId = uid;
  revision = loaded.revision;
  lastPushedData = selectCashflowData(useCashflowStore.getState());
  lastPushedSnapshots = loaded.snapshots;
  useSyncStatus.getState().setStatus('idle');
}

/** Begint met het wegschrijven van wijzigingen. Geeft een opruimfunctie terug. */
export function startSync(): () => void {
  unsubscribe?.();
  unsubscribe = useCashflowStore.subscribe(schedulePush);

  // Bij het verbergen van de tab nog snel wegschrijven. Geen garantie — de browser mag
  // een tab afsluiten voor het verzoek vertrokken is — maar het vangt het normale geval
  // van wegklikken op. Zonder lokale kopie is een verloren wijziging echt weg.
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flushSync();
  };
  document.addEventListener('visibilitychange', onHide);

  return () => {
    unsubscribe?.();
    unsubscribe = null;
    document.removeEventListener('visibilitychange', onHide);
  };
}

/** Zet de synclaag terug op nul. Nodig bij uitloggen: de volgende gebruiker begint schoon. */
export function resetSync(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  userId = null;
  revision = 0;
  lastPushedData = null;
  lastPushedSnapshots = [];
  useSyncStatus.getState().setStatus('idle');
}
