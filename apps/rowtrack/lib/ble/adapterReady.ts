import type { BleManager, State as BleState } from 'react-native-ble-plx';

/**
 * Wacht tot de Bluetooth-adapter iets zinnigs te zeggen heeft.
 *
 * Een vers gemaakte `BleManager` maakt onderhuids een `CBCentralManager`, en die
 * staat op `Unknown` tot CoreBluetooth zijn status terugmeldt — een asynchrone
 * heenweg naar `bluetoothd` over dezelfde seriële queue waarop onze eigen
 * bridge-aanroepen staan. Wie in diezelfde tick al `connectToDevice()` doet, krijgt
 * gegarandeerd `BluetoothLE is in unknown state` (BleErrorCode 103) terug: de
 * native laag wikkelt elke peripheral-lookup in `ensure(.poweredOn)` en die leest
 * de live status op het moment van abonneren.
 *
 * Dat is geen flaky race maar een deterministische volgorde, en het is precies wat
 * autoconnect brak: die was bij een koude start de éérste BLE-aanraking van het
 * proces, dus híj maakte de manager én verbond er meteen mee. De handmatige
 * scan-knop ontsnapte eraan omdat die de status wél las.
 *
 * Daarom wacht deze functie op de eerste bruikbare status in plaats van de guard
 * bij elke aanroeper opnieuw te plakken — `getManager()` geeft nooit meer een
 * manager terug waar je niets mee kunt.
 *
 * Een eindtoestand (uit, geen toestemming, niet ondersteund) komt meteen terug: daar
 * valt niets op te wachten, en de aanroeper hoort er een melding over te tonen in
 * plaats van seconden stil te staan.
 */

/** Ruim boven de honderden milliseconden die CoreBluetooth in de praktijk nodig heeft. */
const ADAPTER_READY_TIMEOUT_MS = 3_000;

export async function waitForAdapter(
  manager: BleManager,
  // Structureel getypeerd in plaats van `typeof State`: het echte enum-object komt uit
  // een lazy `import()` en is hier dus alleen als type beschikbaar.
  State: { Unknown: BleState; Resetting: BleState },
  timeoutMs = ADAPTER_READY_TIMEOUT_MS,
): Promise<BleState> {
  const state = await manager.state();
  if (state !== State.Unknown && state !== State.Resetting) return state;

  return new Promise<BleState>((resolve) => {
    let done = false;
    // `true` laat ble-plx de huidige status meteen meesturen, zodat een status die
    // tussen de `state()` hierboven en dit abonnement binnenkomt niet gemist wordt.
    const sub = manager.onStateChange((s) => {
      if (done || s === State.Unknown || s === State.Resetting) return;
      done = true;
      clearTimeout(timer);
      sub.remove();
      resolve(s);
    }, true);

    // Zonder deadline hangt een aanroeper voor onbepaalde tijd als de adapter nooit
    // rapporteert. Dan liever teruggeven wat we hebben en de aanroeper laten falen
    // op een manier die hij al kent.
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      sub.remove();
      resolve(State.Unknown);
    }, timeoutMs);
  });
}
