/**
 * Wat deed de autoconnect, en waarom deed hij niets?
 *
 * Autoconnect faalt met opzet stil — de gebruiker vroeg er niet om, dus een mislukte
 * poging mag geen foutmelding opleveren. Precies daardoor is hij aan de erg niet te
 * diagnosticeren: "er gebeurt niets" ziet er hetzelfde uit of het nu nooit vuurde,
 * niets onthouden had, of de verbinding weigerde.
 *
 * Deze ring buffer maakt dat verschil zichtbaar zonder de stilte op te geven. Hij
 * draait in élke build (niet enkel `__DEV__`): een console-log helpt niet wanneer de
 * telefoon aan een roeimachine hangt en niet aan een Mac. Kosten zijn verwaarloosbaar
 * — hoogstens `MAX` regels tekst in het geheugen, niets op schijf, niets over het net.
 *
 * Gelezen door `app/dev-ble.tsx`.
 */

export type AutoConnectStep = {
  /** Milliseconden sinds de eerste stap van deze poging — leesbaarder dan een klok. */
  atMs: number;
  kind: 'rower' | 'hr' | 'algemeen';
  step: string;
  detail?: string;
};

const MAX = 60;

let steps: AutoConnectStep[] = [];
let origin: number | null = null;
const listeners = new Set<() => void>();

/** Begin van een nieuwe poging: de tijdlijn en de vorige uitkomst gaan op nul. */
export function beginAutoConnectLog(): void {
  steps = [];
  origin = Date.now();
  emit();
}

export function recordAutoConnect(
  kind: AutoConnectStep['kind'],
  step: string,
  detail?: string,
): void {
  if (origin === null) origin = Date.now();
  // Een nieuwe array, geen `push`: `useSyncExternalStore` vergelijkt de snapshot met
  // `Object.is`, dus een gemuteerde array van dezelfde identiteit hertekent niets.
  // Een vastgelopen poging mag het geheugen ook niet laten groeien — vandaar de cap.
  const next = [...steps, { atMs: Date.now() - origin, kind, step, detail }];
  steps = next.length > MAX ? next.slice(-MAX) : next;
  emit();
}

export function readAutoConnectLog(): AutoConnectStep[] {
  return steps;
}

export function subscribeAutoConnectLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(): void {
  for (const fn of listeners) fn();
}
