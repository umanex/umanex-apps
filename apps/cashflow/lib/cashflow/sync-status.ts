import { create } from 'zustand';

export type SyncState =
  /** Niets te doen, alles staat op de server. */
  | 'idle'
  /** Schrijfactie loopt. */
  | 'saving'
  /** Schrijven mislukt — netwerk of server. Wordt opnieuw geprobeerd bij de volgende wijziging. */
  | 'error'
  /**
   * Een andere browser heeft geschreven sinds wij lazen. Er wordt niets meer weggeschreven
   * tot er herladen is: doorgaan zou hun wijziging overschrijven.
   */
  | 'conflict';

type SyncStatusStore = {
  state: SyncState;
  message: string | null;
  setStatus: (state: SyncState, message?: string | null) => void;
};

export const useSyncStatus = create<SyncStatusStore>((set) => ({
  state: 'idle',
  message: null,
  setStatus: (state, message = null) => set({ state, message }),
}));
