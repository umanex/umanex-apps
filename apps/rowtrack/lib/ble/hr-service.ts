import type {
  BleManager,
  Device,
  Subscription,
} from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { base64ToBytes } from './base64';
import { claimScan, ownsScan, releaseScan } from './scan-lock';
import type { HrBleError } from './types';

const log: (...args: unknown[]) => void = __DEV__
  ? (...args: unknown[]) => console.log('[HR]', ...args)
  : () => {};

/** Standard BLE Heart Rate Service */
const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
/** Heart Rate Measurement Characteristic (notify) */
const HR_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

/**
 * Kort verzamelvenster voor het normale geval: adverteert de band, dan staat hij er
 * binnen enkele seconden.
 */
const SCAN_COLLECT_MS = 5_000;

/**
 * Levert dat korte venster niets op, dan zoeken we door tot in totaal even lang als
 * de roeier (15 s) in plaats van meteen op te geven. Een toestel dat net een
 * verbinding verloor — of een horloge dat zijn broadcast opnieuw opstart — heeft
 * vaak meer dan vijf seconden nodig voor het weer adverteert.
 */
const SCAN_EXTEND_MS = 10_000;

/** Deadline voor een gerichte verbinding met een onthouden band. */
const KNOWN_CONNECT_TIMEOUT_MS = 8_000;

export type HRStatus = 'idle' | 'scanning' | 'connected' | 'error';

export interface HRFoundDevice {
  id: string;
  name: string;
  rssi: number;
}

let blePlxModule: typeof import('react-native-ble-plx') | null = null;

async function loadBlePlx() {
  if (!blePlxModule) {
    blePlxModule = await import('react-native-ble-plx');
  }
  return blePlxModule;
}

type StatusListener = (
  status: HRStatus,
  error?: HrBleError,
  deviceName?: string,
) => void;
type HRListener = (bpm: number) => void;
type DevicesFoundListener = (devices: HRFoundDevice[]) => void;

export class HRBleService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private monitorSub: Subscription | null = null;
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Identiteit in het gedeelde scan-slot — één native scan voor twee diensten. */
  private readonly scanToken = Symbol('hr-scan');
  private intentionalDisconnect = false;

  private onStatusChange: StatusListener;
  private onHR: HRListener;
  private onDevicesFound: DevicesFoundListener | null;

  constructor(onStatusChange: StatusListener, onHR: HRListener, onDevicesFound?: DevicesFoundListener) {
    this.onStatusChange = onStatusChange;
    this.onHR = onHR;
    this.onDevicesFound = onDevicesFound ?? null;
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
    // Eerst een eventuele bestaande verbinding loslaten. Zonder dit zoekt de app naar
    // een toestel dat ze zélf vasthoudt: iOS geeft een peripheral dat al aan dit
    // toestel hangt nooit terug in scanresultaten, dus elke scan komt leeg terug en de
    // rij valt terug op "Verbinden" — terwijl "Verbreken" (de enige plek met een
    // `cancelConnection`) juist alleen bij status 'connected' getoond wordt. Dat was
    // een lus zonder uitgang: enkel de app killen hielp nog.
    await this.releaseDevice();

    this.intentionalDisconnect = false;
    this.onStatusChange('scanning');

    try {
      const { State } = await loadBlePlx();
      const manager = await this.getManager();
      const state = await manager.state();

      if (state !== State.PoweredOn) {
        this.onStatusChange('error', { code: 'bluetooth_off' });
        return;
      }

      if (Platform.OS === 'android') {
        const ok = await this.requestAndroidPermissions();
        if (!ok) {
          this.onStatusChange('error', { code: 'permission_denied' });
          return;
        }
      }

      const foundDevices: HRFoundDevice[] = [];
      const seenIds = new Set<string>();

      const decide = () => {
        this.stopScan();
        this.handleScanComplete(foundDevices);
      };

      this.scanTimeout = setTimeout(() => {
        // Al iets gevonden? Dan meteen beslissen — doorzoeken levert alleen wachttijd op.
        if (foundDevices.length > 0) return decide();
        log('niets in', SCAN_COLLECT_MS, 'ms — doorzoeken');
        this.scanTimeout = setTimeout(decide, SCAN_EXTEND_MS);
      }, SCAN_COLLECT_MS);

      log('scan started (filter: service 0x180D, collecting for 5s)');
      claimScan(this.scanToken);
      manager.startDeviceScan([HR_SERVICE_UUID], null, (err, dev) => {
        if (err) {
          this.stopScan();
          log('scan error:', err.message);
          this.onStatusChange('error', { code: 'scan_error', detail: err.message });
          return;
        }
        if (!dev) return;

        const name = dev.name || dev.localName;
        if (!name || seenIds.has(dev.id)) return;

        seenIds.add(dev.id);
        log('found HR device:', name, dev.id, 'rssi:', dev.rssi);
        foundDevices.push({ id: dev.id, name, rssi: dev.rssi ?? -100 });
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : undefined;
      log('startScan error:', detail);
      this.onStatusChange('error', { code: 'scan_failed', detail });
    }
  }

  private handleScanComplete(devices: HRFoundDevice[]): void {
    if (devices.length === 0) {
      this.onStatusChange('error', { code: 'hr_not_found' });
    } else if (devices.length === 1) {
      // Single device: connect automatically
      this.connectToDeviceById(devices[0].id, devices[0].name);
    } else {
      // Multiple devices: let user choose
      log('multiple HR devices found:', devices.length);
      this.onDevicesFound?.(devices);
    }
  }

  /**
   * Verbindt met een eerder gebruikte band zonder scan. Faalt stil (geen foutstatus)
   * en geeft `false` terug, zodat de aanroeper kan terugvallen op zoeken — een
   * mislukte poging op een onthouden toestel is voor de gebruiker geen mislukking.
   */
  async connectKnown(id: string, name: string | null): Promise<boolean> {
    await this.releaseDevice();
    this.intentionalDisconnect = false;
    this.onStatusChange('scanning');
    return this.connectToDeviceById(id, name ?? undefined, {
      silent: true,
      timeout: KNOWN_CONNECT_TIMEOUT_MS,
    });
  }

  /** De band waarmee nu verbonden is — de context bewaart dit als 'bekend'. */
  currentDevice(): { id: string; name: string } | null {
    const d = this.device;
    if (!d) return null;
    return { id: d.id, name: d.name || d.localName || 'HR Monitor' };
  }

  async connectToDeviceById(
    deviceId: string,
    name?: string,
    opts?: { silent?: boolean; timeout?: number },
  ): Promise<boolean> {
    try {
      const manager = await this.getManager();
      const device = await manager.connectToDevice(
        deviceId,
        opts?.timeout ? { timeout: opts.timeout } : undefined,
      );
      this.device = device;
      const deviceName = name || device.name || device.localName || 'HR Monitor';

      await device.discoverAllServicesAndCharacteristics();

      this.monitorSub = device.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_MEASUREMENT_UUID,
        (error, char) => {
          // Callbacks van een toestel dat we intussen losgelaten hebben moeten zwijgen,
          // anders overschrijft een verlate melding de status van de nieuwe scan.
          if (this.device !== device) return;
          if (error) {
            log('monitor error:', error.message);
            if (!this.intentionalDisconnect) {
              this.onStatusChange('error', { code: 'connection_lost', detail: error.message });
            }
            return;
          }
          if (!char?.value) return;
          const bpm = this.parseHRMeasurement(char.value);
          if (bpm >= 30 && bpm <= 220) {
            this.onHR(bpm);
          }
        },
        'hr-measurement',
      );

      device.onDisconnected(() => {
        log('disconnected, intentional:', this.intentionalDisconnect);
        if (this.device !== device) return;
        if (!this.intentionalDisconnect) {
          this.cleanup();
          this.device = null;
          this.onStatusChange('error', { code: 'connection_lost' });
        }
      });

      this.onStatusChange('connected', undefined, deviceName);
      log('connected:', deviceName);
      return true;
    } catch (e: unknown) {
      const bleErr = e as { message?: string };
      log('connect error:', bleErr.message);
      if (!opts?.silent) {
        this.onStatusChange('error', { code: 'connect_failed', detail: bleErr.message });
      }
      return false;
    }
  }

  stop(): void {
    this.intentionalDisconnect = true;
    this.cleanup();
    if (this.device) {
      this.device.cancelConnection().catch(() => {});
      this.device = null;
    }
    this.onStatusChange('idle');
  }

  /**
   * Laat een bestaande verbinding los zonder de status te wijzigen — de aanroeper
   * bepaalt zelf wat er daarna gebeurt (scannen, opnieuw verbinden). `this.device`
   * gaat meteen op null zodat de identiteitscheck in de callbacks van het oude
   * toestel ze vanaf nu laat zwijgen.
   */
  private async releaseDevice(): Promise<void> {
    const device = this.device;
    if (!device) return;
    log('bestaande verbinding loslaten vóór de scan');
    this.intentionalDisconnect = true;
    this.cleanup();
    this.device = null;
    await device.cancelConnection().catch(() => {});
  }

  destroy(): void {
    this.stop();
    this.manager?.destroy();
    this.manager = null;
  }

  // ── Private ───────────────────────────────────────────────

  private parseHRMeasurement(base64: string): number {
    const data = base64ToBytes(base64);
    if (data.length < 2) return 0;

    const flags = data[0];
    // Bit 0 = 0: HR is uint8 (byte 1)
    // Bit 0 = 1: HR is uint16 LE (bytes 1-2)
    if (flags & 1) {
      if (data.length < 3) return 0;
      return data[1] | (data[2] << 8);
    }
    return data[1];
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

  private clearScanTimeout(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  /**
   * Stopt de scan die déze dienst gestart heeft, plus zijn timeout. De
   * eigenaarscheck voorkomt dat we de scan van de roeier-dienst afbreken: beide
   * diensten delen één native scan via de `BleManager`-singleton (zie `scan-lock.ts`).
   */
  private stopScan(): void {
    this.clearScanTimeout();
    if (!ownsScan(this.scanToken)) return;
    releaseScan(this.scanToken);
    try {
      this.manager?.stopDeviceScan().catch(() => {});
    } catch {
      // Manager al vernietigd — dan loopt er ook geen scan meer.
    }
  }

  private cleanup(): void {
    this.stopScan();
    this.monitorSub?.remove();
    this.monitorSub = null;
  }
}
