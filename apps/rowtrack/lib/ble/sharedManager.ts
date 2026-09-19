import type { BleManager } from 'react-native-ble-plx';

/**
 * ÉÉN EIGENAAR VOOR DE GEDEELDE `BleManager`.
 *
 * `new BleManager()` maakt er geen: ble-plx geeft de bestaande instance terug zodra er één is
 * (`BleManager.js:70` `static sharedInstance`, `:77-81` de constructor die hem teruggeeft,
 * `:112` waar hij gezet wordt — nagemeten in de geïnstalleerde 3.5.1-bron). De roeierdienst en
 * de hartslagdienst maken er dus allebei "een eigen" manager aan en krijgen exact hetzelfde
 * object.
 *
 * Dat was onzichtbaar tot de teardown. Beide diensten riepen in hun `destroy()`
 * `this.manager?.destroy()` aan, en `BleManager.destroy()` zet `sharedInstance` op null
 * (`:161-163`). De eerste aanroep sloopte daarmee de manager ónder de tweede dienst vandaan —
 * terwijl die nog operaties in de lucht kon hebben — en de tweede aanroep vernietigde een al
 * vernietigde client. Dat het vandaag goed lijkt te gaan, is een bijwerking: doordat
 * `sharedInstance` genulld is, maakt een remount een verse manager aan.
 *
 * De remedie is niet "beter opruimen" maar eigenaarschap: een dienst ruimt zijn ÉÍGEN
 * abonnementen op, en de manager wordt precies één keer vernietigd door wie hem bezit — de
 * provider. Zolang de diensten allebei eigenaar waren, was er geen volgorde die klopte.
 *
 * Geen refcount, met opzet. De app heeft één provider en die maakt beide diensten in één
 * effect en breekt ze in één cleanup af; een teller zou een gelijktijdigheid modelleren die
 * hier niet bestaat, en bij een gemiste release stil nooit meer opruimen.
 */
let gedeeld: BleManager | null = null;

/**
 * Geeft de gedeelde manager, en maakt hem via `maak` als hij er nog niet is.
 *
 * `maak` wordt doorgegeven in plaats van hier geïmporteerd omdat `react-native-ble-plx` een
 * native module is: een statische import evalueert bij module-load en ontsnapt daarmee aan de
 * try/catch van de aanroeper. Zie `lib/secureStorage.ts` voor dezelfde valkuil.
 */
export function gedeeldeManager(maak: () => BleManager): BleManager {
  if (!gedeeld) gedeeld = maak();
  return gedeeld;
}

/**
 * Vernietigt de gedeelde manager — de enige plek waar dat hoort te gebeuren.
 *
 * Idempotent: een tweede aanroep doet niets in plaats van een vernietigde client aan te
 * spreken. Dat is precies het geval dat de bug veroorzaakte.
 */
export function vernietigGedeeldeManager(): void {
  gedeeld?.destroy();
  gedeeld = null;
}

/** Alleen voor tests: leest of er een gedeelde manager staat, zonder er één te maken. */
export function heeftGedeeldeManager(): boolean {
  return gedeeld !== null;
}
