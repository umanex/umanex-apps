import type {
  BleManager,
  Device,
  Subscription,
} from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  FTMS_SERVICE_UUID,
  ROWER_DATA_UUID,
  ROWER_DATA_ALT_UUID,
  ROWER_NAME_PREFIX,
  SCAN_TIMEOUT_MS,
  RECONNECT_DELAY_MS,
  MAX_RECONNECT_ATTEMPTS,
} from './constants';
import { parseRowerData } from './ftms-parser';
import { isRowerCandidate } from './rowerCandidate';
import { requestScan, ownsScan, releaseScan } from './scan-lock';
import { recordAutoConnect } from './autoConnectLog';
import { waitForAdapter } from './adapterReady';
import { countPowerSample } from './ergProbe';
import type { RowerMetrics, ConnectionStatus, RowerBleError, FoundDevice } from './types';

const log: (...args: unknown[]) => void = __DEV__
  ? (...args: unknown[]) => console.log('[BLE]', ...args)
  : () => {};

/** Return a RowerMetrics with all fields null. */
function emptyMetrics(): RowerMetrics {
  return {
    strokeRate: null, strokeCount: null, totalDistance: null,
    instantaneousPace: null, averagePace: null,
    instantaneousPower: null, averagePower: null,
    resistanceLevel: null,
    heartRate: null, metabolicEquivalent: null,
    elapsedTime: null, remainingTime: null,
  };
}

/** Merge non-null fields from `incoming` into `base`, return new object. */
function mergeMetrics(base: RowerMetrics, incoming: RowerMetrics): RowerMetrics {
  const merged = { ...base };
  for (const key of Object.keys(incoming) as (keyof RowerMetrics)[]) {
    if (incoming[key] !== null) {
      (merged as Record<string, unknown>)[key] = incoming[key];
    }
  }
  return merged;
}

type StatusListener = (
  status: ConnectionStatus,
  error?: RowerBleError,
  deviceName?: string,
) => void;
type MetricsListener = (metrics: RowerMetrics) => void;
type DevicesFoundListener = (devices: FoundDevice[]) => void;

/** Hoe lang we treffers verzamelen vóór we beslissen (één = verbinden, meer = kiezen). */
const COLLECT_MS = 3_000;

/** Deadline voor een gerichte verbinding met een onthouden toestel. */
const KNOWN_CONNECT_TIMEOUT_MS = 8_000;

/**
 * Hoeveel rust-packets sowieso doorgestuurd worden, langs de dedupe heen. Twee is
 * precies wat `useWorkoutMetrics` nodig heeft om de rust-transitie te bevestigen.
 */
const IDLE_FORWARD_PACKETS = 2;

let blePlxModule: typeof import('react-native-ble-plx') | null = null;

async function loadBlePlx() {
  if (!blePlxModule) {
    blePlxModule = await import('react-native-ble-plx');
  }
  return blePlxModule;
}

export class RowerBleService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private monitorSub: Subscription | null = null;
  private stateSub: Subscription | null = null;
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  private fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private idlePacketsForwarded = 0;
  private intentionalDisconnect = false;
  private isConnecting = false;
  /** Identiteit van deze dienst in het gedeelde scan-slot. Zie `stopScan()`. */
  private readonly scanToken = Symbol('rower-scan');
  /** Volgnummer van de huidige scan-toekenning — zie `scan-lock.ts`. */
  private scanGrant: number | null = null;

  /** Onthouden toestel: verschijnt dat in de scan, dan hoeft er niet gewacht te worden. */
  private preferredId: string | null = null;
  /** Toestellen uit de laatste scan, zodat een keuze uit de lijst te verbinden is. */
  private pendingChoices = new Map<string, Device>();

  private lastMetrics: RowerMetrics = emptyMetrics();
  private onStatusChange: StatusListener;
  private onMetrics: MetricsListener;
  private onDevicesFound: DevicesFoundListener | null;

  constructor(
    onStatusChange: StatusListener,
    onMetrics: MetricsListener,
    onDevicesFound?: DevicesFoundListener,
  ) {
    this.onStatusChange = onStatusChange;
    this.onMetrics = onMetrics;
    this.onDevicesFound = onDevicesFound ?? null;
  }

  /**
   * Verbindt rechtstreeks met een eerder gebruikt toestel, zonder scan.
   *
   * Dat is niet alleen sneller — het omzeilt de klasse fouten waarin een toestel
   * simpelweg niet in scanresultaten opduikt (nog verbonden, of traag met
   * adverteren). Lukt het niet binnen de deadline, dan geeft dit `false` terug en
   * kan de aanroeper alsnog gaan scannen. Er komt bewust geen foutstatus uit: een
   * mislukte poging op een onthouden toestel is geen mislukking voor de gebruiker.
   */
  async connectKnown(id: string, name: string | null): Promise<boolean> {
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.lastMetrics = emptyMetrics();
    this.preferredId = id;
    this.onStatusChange('connecting', undefined, name ?? undefined);

    try {
      const manager = await this.getManager();
      if (this.aborted('vóór verbinden met bekend toestel')) {
        this.onStatusChange('idle');
        return false;
      }

      // `getManager()` heeft de adapter afgewacht; wat er nu staat is een echt
      // antwoord. Staat Bluetooth uit, dan heeft verbinden geen zin — meteen
      // teruggeven is beter dan acht seconden op een timeout wachten met de rij op
      // 'connecting'. Nog steeds stil: de gebruiker vroeg hier niet om.
      const { State } = await loadBlePlx();
      const adapter = await manager.state();
      recordAutoConnect('rower', 'adapterstatus', String(adapter));
      if (adapter !== State.PoweredOn) {
        this.onStatusChange('idle');
        return false;
      }

      const device = await manager.connectToDevice(id, {
        requestMTU: 512,
        timeout: KNOWN_CONNECT_TIMEOUT_MS,
      });
      return await this.finishConnection(device, name || device.name || device.localName || 'Rower');
    } catch (e) {
      const detail = e instanceof Error ? e.message : undefined;
      recordAutoConnect('rower', 'connectToDevice faalde', detail);
      log(' bekend toestel niet bereikbaar:', detail);
      // Terug naar een eindtoestand. Zonder dit blijft de rij op 'connecting' staan
      // mét een uitgeschakelde knop — een spinner zonder uitgang, precies waar de
      // gebruiker niet om vroeg. 'idle' en niet 'error': hij startte dit niet zelf.
      this.onStatusChange('idle');
      return false;
    }
  }

  /** Verbindt met een toestel dat de gebruiker uit de keuzelijst koos. */
  async connectChoice(id: string): Promise<boolean> {
    const device = this.pendingChoices.get(id);
    this.pendingChoices = new Map();
    if (!device) return false;
    return this.connectToDevice(device);
  }

  /** Onthoudt welk toestel bij een volgende scan voorrang krijgt. */
  setPreferred(id: string | null): void {
    this.preferredId = id;
  }

  /**
   * Geeft een manager terug die klaar is om aangesproken te worden. Zie
   * `adapterReady.ts`: een vers gemaakte manager staat op `Unknown` en weigert dan
   * élke verbinding. De wacht hoort hier en niet bij de aanroepers — anders mist de
   * volgende toevoeging de guard opnieuw, precies zoals `connectKnown` hem miste.
   */
  private async getManager(): Promise<BleManager> {
    const { BleManager: BM, State } = await loadBlePlx();
    if (!this.manager) {
      this.manager = new BM();
    }
    await waitForAdapter(this.manager, State);
    return this.manager;
  }

  // ── Public API ────────────────────────────────────────────

  async startScan(): Promise<void> {
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.lastMetrics = emptyMetrics();
    this.onStatusChange('scanning');

    try {
      const { State } = await loadBlePlx();
      const manager = await this.getManager();
      const state = await manager.state();
      log(' adapter state:', state);

      // Vanaf hier zijn we voorbij de eerste awaits (module laden, manager maken,
      // adapterstatus). Viel daar een disconnect(), dan is de gebruiker al gestopt en
      // mag niets hieronder nog vuren — ook geen foutmelding, die zou anders over de
      // 'idle'-status van het samenvattingsscherm heen komen.
      if (this.aborted('na adapterstatus')) return;

      if (state !== State.PoweredOn) {
        if (state === State.PoweredOff) {
          this.onStatusChange('error', { code: 'bluetooth_off' });
          return;
        }
        if (state === State.Unauthorized) {
          this.onStatusChange('error', { code: 'bluetooth_unauthorized' });
          return;
        }
        // Een deadline hoort erbij. `waitForAdapter` valt na 3 s terug op `State.Unknown`,
        // en zonder timer bleef de rij dán voorgoed op 'Zoeken…' staan met een
        // uitgeschakelde knop — geen fout, geen uitgang, alleen een app-herstart. Dat is
        // exact de stille hang die de scan-arbiter elders dichtzet.
        this.scanTimeout = setTimeout(() => {
          this.scanTimeout = null;
          this.stateSub?.remove();
          this.stateSub = null;
          if (this.aborted('adapter kwam niet aan, maar intussen gestopt')) return;
          log(' adapter kwam niet op PoweredOn binnen', SCAN_TIMEOUT_MS, 'ms');
          this.onStatusChange('error', { code: 'bluetooth_off' });
        }, SCAN_TIMEOUT_MS);

        this.stateSub = manager.onStateChange((s) => {
          if (s === State.PoweredOn) {
            this.clearScanTimeout();
            this.stateSub?.remove();
            this.stateSub = null;
            // Deze callback kan ná een disconnect() vuren: wordt hij pas ná
            // `cleanup()` geregistreerd, dan heeft cleanup hem niet kunnen opruimen.
            if (this.aborted('adapter aan, maar intussen gestopt')) return;
            this.startScan();
          }
        }, true);
        return;
      }

      if (Platform.OS === 'android') {
        const ok = await this.requestAndroidPermissions();
        // De permissie-dialog kan minuten open blijven staan; in die tijd kan de
        // gebruiker allang gestopt zijn.
        if (this.aborted('na permissies')) return;
        if (!ok) {
          this.onStatusChange('error', { code: 'permission_denied' });
          return;
        }
      }

      // Een vorige scan (of zijn timeout) mag nooit naast deze blijven lopen.
      this.stopScan();

      // Gevonden trainers verzamelen in plaats van blind de eerste pakken: met twee
      // machines in één ruimte was dat een gok. Na een kort venster beslissen we —
      // één treffer verbindt meteen, meerdere gaan naar de keuzelijst.
      const found = new Map<string, Device>();

      const decide = () => {
        // Bewust géén eigenaarscheck meer — zie hr-service: die check liet een dienst die
        // zijn slot verloor stil hangen zonder ooit een status te publiceren. De arbiter
        // serialiseert nu, en `found` bevat alleen wat onze eigen callback binnenliet.
        this.stopScan();
        const matches = [...found.values()];
        if (matches.length === 0) {
          this.onStatusChange('error', { code: 'rower_not_found' });
          return;
        }
        if (matches.length === 1 || !this.onDevicesFound) {
          this.connectToDevice(matches[0]);
          return;
        }
        this.pendingChoices = found;
        this.onDevicesFound(
          matches.map((d) => ({
            id: d.id,
            name: d.name || d.localName || 'Rower',
            rssi: d.rssi ?? -100,
          })),
        );
      };

      // Aanvragen in plaats van claimen: scant de hartslagdienst nog, dan wachten we onze
      // beurt af. `BleManager` heeft één native scan, en er twee tegelijk op starten liet
      // ze op 2026-08-22 allebei leeg terugkomen. De timers horen ín deze callback, anders
      // tikt het zoekvenster weg terwijl er nog niets gescand wordt.
      requestScan(
        this.scanToken,
        (handle) => {
          this.scanGrant = handle;
          this.scanTimeout = setTimeout(() => {
            if (found.size > 0) return decide();
            // Niets binnen het korte venster: doorzoeken tot de volle timeout in plaats
            // van opgeven — een trainer die net aangezet is adverteert niet meteen.
            this.scanTimeout = setTimeout(decide, SCAN_TIMEOUT_MS - COLLECT_MS);
          }, COLLECT_MS);

          log(' scan started (filter: FTMS UUID, name prefix "' + ROWER_NAME_PREFIX + '" as fallback)');
          manager
            .startDeviceScan(null, null, (err, dev) => {
              // De arbiter serialiseert de scans, dus dit hoort niet meer te kunnen — maar
              // een verweesde callback van een vorige scan moet zwijgen in plaats van
              // resultaten van iemand anders te verwerken.
              if (!ownsScan(this.scanToken)) return;
              if (err) {
                this.stopScan();
                log(' scan error:', err.message);
                this.onStatusChange('error', { code: 'scan_error', detail: err.message });
                return;
              }
              if (!dev) return;

              // Log every device for debugging — mét geadverteerde service UUIDs, zodat
              // op het toestel te zien is of een trainer (bv. de Apollo XL) FTMS
              // adverteert of enkel via de naam-prefix binnenkomt.
              if (dev.name || dev.localName) {
                log(' found:', dev.name, dev.localName, dev.id, 'adv:', dev.serviceUUIDs?.join(',') ?? '-');
              }

              if (isRowerCandidate(dev)) {
                found.set(dev.id, dev);
                // Het onthouden toestel hoeft niet op de anderen te wachten.
                if (dev.id === this.preferredId) decide();
              }
            })
            // `startDeviceScan` is async en gooit dus niet synchroon: zonder deze catch
            // blijft een mislukte start (adapter uit tussen `state()` en de scan, manager
            // vernietigd) onafgehandeld, en meldt de app 15 s later 'geen roeimachine
            // gevonden' in plaats van de echte reden.
            .catch((e: unknown) => {
              const detail = e instanceof Error ? e.message : undefined;
              log(' startDeviceScan faalde:', detail);
              this.stopScan();
              this.onStatusChange('error', { code: 'scan_error', detail });
            });
        },
        {
          // Komt de start uit de wachtrij en gooit hij daar, dan is de try/catch van deze
          // `startScan` allang teruggekeerd; zonder deze haak zou de dienst stil op
          // 'Zoeken…' blijven staan.
          onStartError: (e: unknown) => {
            const detail = e instanceof Error ? e.message : undefined;
            this.onStatusChange('error', { code: 'scan_failed', detail });
          },
          onPreempted: () => {
            // Alleen melden zolang we nog echt zoeken. De vangnet-timer loopt door
            // wanneer een release blijft hangen op een `stopDeviceScan()` die niet
            // settelt, en zou dan een fout leggen over een verbinding die intussen
            // gewoon staat te meten.
            if (this.device) return;
            // Het vangnet pakt het slot af. Zwijgen zou de rij op 'Zoeken…' laten staan met
            // een dode knop — precies de klasse fout die deze arbiter moest sluiten.
            log(' scan-slot afgepakt na de maximale houdtijd');
            this.clearScanTimeout();
            this.onStatusChange('error', { code: 'scan_error', detail: 'scan afgebroken' });
          },
        },
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : undefined;
      log(' startScan error:', detail);
      this.onStatusChange('error', { code: 'scan_failed', detail });
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.onStatusChange('disconnecting');
    this.cleanup();

    try {
      if (this.device) {
        await this.device.cancelConnection();
      }
    } catch {
      // ignore
    }

    this.device = null;
    this.onStatusChange('idle');
  }

  destroy(): void {
    this.intentionalDisconnect = true;
    this.cleanup();
    this.device = null;
    this.manager?.destroy();
    this.manager = null;
  }

  // ── Private ───────────────────────────────────────────────

  /**
   * Breekt een verbinding af die tijdens het opbouwen achterhaald raakte. Geen
   * statuswijziging: `disconnect()` heeft de status al op 'idle' gezet, en er
   * overheen melden zou de gebruiker terugduwen naar een rit die hij net stopte.
   */
  private abandonConnection(device: Device): false {
    this.isConnecting = false;
    this.device = null;
    device.cancelConnection().catch(() => {});
    return false;
  }

  /** Returns true when the connection (incl. service discovery) succeeded. */
  private async connectToDevice(device: Device): Promise<boolean> {
    if (this.isConnecting) {
      log(' connectToDevice skipped — already connecting');
      return false;
    }
    this.isConnecting = true;
    const name = device.name || device.localName || 'Rower';
    this.onStatusChange('connecting', undefined, name);

    try {
      const manager = await this.getManager();

      log(' connecting:', device.id, name);
      const connected = await manager.connectToDevice(device.id, {
        requestMTU: 512,
      });
      return await this.finishConnection(connected, name);
    } catch (e: unknown) {
      this.isConnecting = false;
      const bleErr = e as { message?: string; errorCode?: number };
      log(' connect error:', bleErr.message, 'code:', bleErr.errorCode);
      this.onStatusChange('error', { code: 'connect_failed', detail: bleErr.message });
      return false;
    }
  }

  /**
   * Het gedeelde staartstuk van elke verbinding: service discovery, notificaties en
   * de disconnect-listener. Zowel een scan-treffer als een gerichte verbinding met
   * een onthouden toestel komt hier uit.
   */
  private async finishConnection(connected: Device, name: string): Promise<boolean> {
    this.isConnecting = true;
    try {
      log(' connected:', connected.id);
      // Meteen bewaren, nog vóór de delay: valt hier een disconnect(), dan moet die
      // de verbinding kunnen intrekken. Stond dit later, dan zag `disconnect()` een
      // lege `device` en bleef de erg fysiek verbonden achter.
      this.device = connected;

      if (this.aborted('tijdens verbinden')) return this.abandonConnection(connected);

      // Wait for BLE stack to settle
      await this.delay(2000);
      if (this.aborted('tijdens verbinden')) return this.abandonConnection(connected);

      this.onStatusChange('discovering', undefined, name);
      await connected.discoverAllServicesAndCharacteristics();
      if (this.aborted('tijdens service discovery')) return this.abandonConnection(connected);

      // Log discovered services
      const services = await connected.services();
      for (const svc of services) {
        const chars = await svc.characteristics();
        log(' service:', svc.uuid, '→', chars.map((c) => c.uuid).join(', '));
      }

      await this.delay(1000);
      if (this.aborted('vlak vóór het abonneren')) return this.abandonConnection(connected);

      // Start notifications — try 2AD1 first, fallback to 2ACC
      this.startMonitoring(connected);

      // Listen for unexpected disconnect
      connected.onDisconnected((err) => {
        log(' disconnected, intentional:', this.intentionalDisconnect, 'error:', err?.message);
        if (this.device !== connected) return; // verouderde callback van een oud toestel
        if (!this.intentionalDisconnect) {
          this.handleDisconnect();
        }
      });

      this.preferredId = connected.id;
      this.onStatusChange('connected', undefined, name);
      this.isConnecting = false;
      return true;
    } catch (e: unknown) {
      this.isConnecting = false;
      const bleErr = e as { message?: string; errorCode?: number };
      log(' connect error:', bleErr.message, 'code:', bleErr.errorCode);
      this.onStatusChange('error', { code: 'connect_failed', detail: bleErr.message });
      return false;
    }
  }

  /** Het toestel waarmee nu verbonden is — de context bewaart dit als 'bekend'. */
  currentDevice(): FoundDevice | null {
    const d = this.device;
    if (!d) return null;
    return { id: d.id, name: d.name || d.localName || 'Rower', rssi: d.rssi ?? -100 };
  }


  private startMonitoring(device: Device, charUuid = ROWER_DATA_UUID): void {
    log(' subscribing to notifications:', charUuid);

    this.monitorSub = device.monitorCharacteristicForService(
      FTMS_SERVICE_UUID,
      charUuid,
      (error, char) => {
        if (error) {
          const bleErr = error as unknown as { message?: string; errorCode?: number };
          log(' monitor error on', charUuid, ':', bleErr.message, 'code:', bleErr.errorCode);

          // 403 on primary → try fallback characteristic
          if (bleErr.errorCode === 403 && charUuid === ROWER_DATA_UUID) {
            log(' 403 on 2AD1, trying fallback 2ACC');
            this.monitorSub?.remove();
            this.monitorSub = null;
            this.fallbackTimeout = setTimeout(() => {
              this.fallbackTimeout = null;
              if (!this.intentionalDisconnect) {
                this.startMonitoring(device, ROWER_DATA_ALT_UUID);
              }
            }, 2_000);
            return;
          }

          // 403 on fallback too → give up
          if (bleErr.errorCode === 403) {
            log(' 403 on both characteristics');
            this.onStatusChange('error', { code: 'no_data' });
            return;
          }

          if (!this.intentionalDisconnect) {
            this.handleDisconnect();
          }
          return;
        }

        if (!char?.value) return;

        log(' notification received on', charUuid);
        try {
          const parsed = parseRowerData(char.value);
          const merged = mergeMetrics(this.lastMetrics, parsed);

          // Ruwe meting vóór het nullen hieronder: meldt deze erg 0 W terwijl je nog
          // roeit? Dat bepaalt of de watt-tegel bij een echte stop meteen op 0 mag
          // springen of de EMA-staart nodig heeft. Zie `ergProbe.ts`.
          countPowerSample(merged.instantaneousPower, merged.strokeRate);

          // When rower is idle (spm=0, watts=0), clear stale pace values
          const idle = merged.strokeRate === 0 && merged.instantaneousPower === 0;
          if (idle) {
            merged.strokeRate = null;
            merged.instantaneousPower = null;
            merged.instantaneousPace = null;
          }

          // Duplicate packets (no field changed) don't need a React update
          let changed = false;
          for (const key of Object.keys(merged) as (keyof RowerMetrics)[]) {
            if (merged[key] !== this.lastMetrics[key]) {
              changed = true;
              break;
            }
          }

          // De rust-transitie mag niet in de dedupe blijven hangen. Zodra de erg
          // stilstaat zijn watts/spm/pace hierboven genuld en staat de afstand vast,
          // dus twee opeenvolgende rust-packets zijn veldsgewijs identiek. De hook
          // heeft die tweede juist nodig om naar 0 te snappen. Vandaar: de eerste
          // rust-packets gaan altijd door, ook als er niets veranderde. Zonder dit
          // hing het aan een ongerelateerd veld (elapsedTime) dat toevallig doortikt —
          // en op een erg die zijn klok bij pauze stilzet, tikt die niet door.
          if (idle) {
            this.idlePacketsForwarded += 1;
            if (this.idlePacketsForwarded <= IDLE_FORWARD_PACKETS) changed = true;
          } else {
            this.idlePacketsForwarded = 0;
          }

          if (changed) {
            this.lastMetrics = merged;
            this.onMetrics(merged);
          }
        } catch (e) {
          log('parse error:', e);
        }
      },
      'rower-data',
    );
  }

  private handleDisconnect(): void {
    this.monitorSub?.remove();
    this.monitorSub = null;

    if (this.intentionalDisconnect) {
      this.onStatusChange('idle');
      return;
    }

    this.attemptReconnect();
  }

  private async attemptReconnect(): Promise<void> {
    if (this.intentionalDisconnect) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.onStatusChange('error', { code: 'connection_lost' });
      this.cleanup();
      this.device = null;
      return;
    }

    this.reconnectAttempts++;
    log(' reconnect', this.reconnectAttempts, '/', MAX_RECONNECT_ATTEMPTS);
    this.onStatusChange('reconnecting');

    await this.delay(RECONNECT_DELAY_MS);

    if (this.device && !this.intentionalDisconnect) {
      const ok = await this.connectToDevice(this.device);
      if (ok) {
        this.reconnectAttempts = 0;
      } else {
        log(' reconnect failed, retrying');
        this.attemptReconnect();
      }
    }
  }

  private async requestAndroidPermissions(): Promise<boolean> {
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch {
      return false;
    }
  }

  /**
   * Is de gebruiker intussen gestopt? Verbinden en scannen zitten vol awaits (module
   * laden, adapterstatus, permissiedialoog, connect, service discovery, twee vaste
   * delays) en `disconnect()` kan in elk van die vensters vallen. Zonder een check ná
   * elke await hervat het opgeschorte werk daarna gewoon en meldt 'connected' op een
   * scherm waar de rit al beëindigd is.
   */
  private aborted(where: string): boolean {
    if (!this.intentionalDisconnect) return false;
    log(' afgebroken —', where);
    return true;
  }

  private clearScanTimeout(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  /**
   * Stopt de scan die déze service gestart heeft, plus zijn timeout.
   *
   * Zonder dit leefde het stoppen alleen ín de scan-callback, dus een scan die niets
   * vond bleef doorlopen na `disconnect()`. Startte je hem via "Opnieuw proberen" en
   * drukte je meteen op Stop, dan kon die verweesde scan later alsnog een erg vinden
   * en de status op 'connected' zetten terwijl de gebruiker al gestopt was.
   *
   * De eigenaarscheck is geen luxe: `BleManager` is een procesbrede singleton, dus
   * deze dienst en `HRBleService` delen één native scan. Blind `stopDeviceScan()`
   * aanroepen vanuit `cleanup()` brak een lopende hartslag-scan af — die meldt dan
   * "geen hartslagmeter gevonden" terwijl de band gewoon uitzendt. Zie `scan-lock.ts`.
   */
  private stopScan(): void {
    this.clearScanTimeout();

    // Ook een aanvraag die nog in de wachtrij stond moet weg. Er zijn twee AppState-
    // listeners (hr-service voor de stilte-deadline, workout.tsx voor autoconnect) en de
    // `useFocusEffect` daar ruimt zichzelf op, maar géén van drieën raakt het scan-slot
    // aan: wegnavigeren of naar de achtergrond gaan breekt een wachtende scan dus niet af.
    // Dat staat als backlog-item.
    if (!ownsScan(this.scanToken)) {
      releaseScan(this.scanToken);
      return;
    }

    // Loslaten pás nadat de native scan echt gestopt is. Doen we het eerder, dan start de
    // wachtende dienst zijn scan terwijl deze nog afbouwt — en de dispose van de oude
    // subscription roept `centralManager.stopScan()` aan, wat de nieuwe scan meteen weer
    // stillegt. Precies de race die op 2026-08-22 beide scans leeg liet terugkomen.
    //
    // De handle hoort erbij: `stopScan()` en een nieuwe `requestScan()` staan in `startScan`
    // in één synchroon blok, dus deze uitgestelde release kan landen nádat dezelfde dienst
    // het slot alweer gekregen heeft. Zonder handle breekt hij dan zijn eigen verse scan af
    // en start hij de wachtende eroverheen — gemeten, niet bedacht.
    const handle = this.scanGrant ?? undefined;
    this.scanGrant = null;
    const handOver = () => releaseScan(this.scanToken, handle);
    try {
      // Geeft een Promise terug: een synchrone catch vangt de rejection niet.
      const stopping = this.manager?.stopDeviceScan();
      if (stopping) stopping.then(handOver, handOver);
      else handOver();
    } catch {
      // Manager al vernietigd — dan loopt er per definitie ook geen scan meer.
      handOver();
    }
  }

  private cleanup(): void {
    this.stopScan();
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
    this.monitorSub?.remove();
    this.monitorSub = null;
    this.stateSub?.remove();
    this.stateSub = null;
    this.isConnecting = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
