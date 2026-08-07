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
import { claimScan, ownsScan, releaseScan } from './scan-lock';
import type { RowerMetrics, ConnectionStatus, RowerBleError } from './types';

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
  private intentionalDisconnect = false;
  private isConnecting = false;
  /** Identiteit van deze dienst in het gedeelde scan-slot. Zie `stopScan()`. */
  private readonly scanToken = Symbol('rower-scan');

  private lastMetrics: RowerMetrics = emptyMetrics();
  private onStatusChange: StatusListener;
  private onMetrics: MetricsListener;

  constructor(onStatusChange: StatusListener, onMetrics: MetricsListener) {
    this.onStatusChange = onStatusChange;
    this.onMetrics = onMetrics;
  }

  private async getManager(): Promise<BleManager> {
    if (!this.manager) {
      const { BleManager: BM } = await loadBlePlx();
      this.manager = new BM();
    }
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
        this.stateSub = manager.onStateChange((s) => {
          if (s === State.PoweredOn) {
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

      this.scanTimeout = setTimeout(() => {
        this.stopScan();
        this.onStatusChange('error', { code: 'rower_not_found' });
      }, SCAN_TIMEOUT_MS);

      log(' scan started (filter: name prefix "' + ROWER_NAME_PREFIX + '")');
      claimScan(this.scanToken);
      manager.startDeviceScan(null, null, (err, dev) => {
        if (err) {
          this.stopScan();
          log(' scan error:', err.message);
          this.onStatusChange('error', { code: 'scan_error', detail: err.message });
          return;
        }
        if (!dev) return;

        // Log every device for debugging
        if (dev.name || dev.localName) {
          log(' found:', dev.name, dev.localName, dev.id);
        }

        if (
          dev.name?.startsWith(ROWER_NAME_PREFIX) ||
          dev.localName?.startsWith(ROWER_NAME_PREFIX)
        ) {
          this.stopScan();
          this.connectToDevice(dev);
        }
      });
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
        if (!this.intentionalDisconnect) {
          this.handleDisconnect();
        }
      });

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

          // When rower is idle (spm=0, watts=0), clear stale pace values
          if (
            merged.strokeRate === 0 &&
            merged.instantaneousPower === 0
          ) {
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
    if (!ownsScan(this.scanToken)) return;
    releaseScan(this.scanToken);
    try {
      // Geeft een Promise terug: een synchrone catch vangt de rejection niet.
      this.manager?.stopDeviceScan().catch(() => {});
    } catch {
      // Manager al vernietigd — dan loopt er per definitie ook geen scan meer.
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
