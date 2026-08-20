import type {
  BleManager,
  Device,
  Subscription,
} from 'react-native-ble-plx';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import { base64ToBytes } from './base64';
import { RECONNECT_DELAY_MS, MAX_RECONNECT_ATTEMPTS } from './constants';
import { claimScan, ownsScan, releaseScan } from './scan-lock';
import { recordAutoConnect } from './autoConnectLog';
import { waitForAdapter } from './adapterReady';
import { initialHrLink, stepHrLink, type HrLinkEvent, type HrLinkState } from './hrLink';
import type { HrBleError, HRStatus } from './types';

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

/**
 * Hoe lang een verbonden band mag zwijgen voor we hem loslaten. Een hartslagmeter
 * stuurt rond 1 Hz; twaalf seconden overleeft een haperende verbinding zonder een
 * halve training lang een verzonnen hartslag te tonen.
 */
const HR_DATA_TIMEOUT_MS = 12_000;

// HRStatus staat in `types.ts` — dit bestand had een eigen kopie, en die liep bij de
// eerste toevoeging meteen uit de pas met de versie die de UI leest.
export type { HRStatus };

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
  /** Wat we tot nu toe over deze verbinding kunnen hárd maken — zie `hrLink.ts`. */
  private link: HrLinkState = initialHrLink;
  /** Bewaakt dat er metingen blíjven komen; herstart bij elke bruikbare waarde. */
  private dataDeadline: ReturnType<typeof setTimeout> | null = null;
  /** Identiteit in het gedeelde scan-slot — één native scan voor twee diensten. */
  private readonly scanToken = Symbol('hr-scan');
  private intentionalDisconnect = false;
  /**
   * Zette de gebruiker (of het einde van een rit) deze dienst stil? Dan geen herstel.
   *
   * Bewust náást `intentionalDisconnect` en niet in de plaats ervan: die vlag gaat
   * óók aan bij ons eigen opruimen (`releaseDevice`), en een herstelpoging die op
   * haar eigen opruimactie afgaat breekt zichzelf meteen af.
   */
  private stopped = false;
  /** Waar we naar terug mogen na een verbroken link — zie `attemptReconnect`. */
  private lastDevice: { id: string; name: string } | null = null;
  private reconnectAttempts = 0;
  /**
   * Loopt er een eigen herstelpoging? Dan blijft autoconnect eraf. Beide worden bij
   * terugkeer uit de achtergrond ongeveer tegelijk wakker, en `hrStatusRef` in de
   * context is een gerenderde spiegel: die kan nog op 'error' staan terwijl deze
   * dienst al aan het herstellen is. Twee gelijktijdige connects op hetzelfde
   * toestel laten een abonnement achter dat niemand meer opruimt.
   */
  private recovering = false;
  /** Naam van de band waar we nu aan hangen; de deadline logt ermee. */
  private deviceName: string | null = null;
  private appStateSub: { remove: () => void } | null = null;

  private onStatusChange: StatusListener;
  private onHR: HRListener;
  private onDevicesFound: DevicesFoundListener | null;

  constructor(onStatusChange: StatusListener, onHR: HRListener, onDevicesFound?: DevicesFoundListener) {
    this.onStatusChange = onStatusChange;
    this.onHR = onHR;
    this.onDevicesFound = onDevicesFound ?? null;

    // De stilte-wachter mag geen achtergrondtijd meetellen. RowTrack vraagt geen
    // `bluetooth-central` background mode (`app.json` → isBackgroundEnabled: false),
    // dus iOS schorst de app op zodra je naar een andere app wisselt: er komt niets
    // binnen én de timer staat stil. Bij terugkeer vuurde de achterstallige deadline
    // meteen af en liet de app een gezonde band los — waarna niets hem terughaalde
    // en de rest van de rit zonder hartslag verliep. Elke app-wissel van meer dan
    // HR_DATA_TIMEOUT_MS deed dat, gegarandeerd (gemeten 2026-08-20).
    this.appStateSub = AppState.addEventListener('change', (next) => {
      this.dispatch(
        { type: next === 'active' ? 'resumed' : 'suspended' },
        this.deviceName ?? undefined,
      );
    });
  }

  /** Zie `RowerBleService.getManager()` — dezelfde reden, dezelfde wacht. */
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
    // Eerst een eventuele bestaande verbinding loslaten. Zonder dit zoekt de app naar
    // een toestel dat ze zélf vasthoudt: iOS geeft een peripheral dat al aan dit
    // toestel hangt nooit terug in scanresultaten, dus elke scan komt leeg terug en de
    // rij valt terug op "Verbinden" — terwijl "Verbreken" (de enige plek met een
    // `cancelConnection`) juist alleen bij status 'connected' getoond wordt. Dat was
    // een lus zonder uitgang: enkel de app killen hielp nog.
    await this.releaseDevice();

    this.intentionalDisconnect = false;
    this.stopped = false;
    this.reconnectAttempts = 0;
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
        if (!ownsScan(this.scanToken)) return;
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
        // Zie ble-service: één gedeelde scan-subscription, dus een verweesde
        // callback moet zwijgen in plaats van de scan van de ander te kapen.
        if (!ownsScan(this.scanToken)) return;
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
    // Stil terug, zonder de status aan te raken: de dienst is al bezig hetzelfde te
    // doen en 'scanning' hoort niet overschreven te worden door een tweede poging.
    if (this.recovering) {
      recordAutoConnect('hr', 'overgeslagen', 'eigen herstelpoging loopt al');
      return false;
    }
    await this.releaseDevice();
    this.intentionalDisconnect = false;
    this.stopped = false;
    this.reconnectAttempts = 0;
    this.onStatusChange('scanning');

    // Zie de roeier-kant: na de adapter-wacht in `getManager()` is dit een echt
    // antwoord, en bij een uitgeschakelde adapter is stil teruggeven beter dan de
    // rij acht seconden op 'Zoeken…' laten staan.
    const { State } = await loadBlePlx();
    const adapter = await (await this.getManager()).state();
    recordAutoConnect('hr', 'adapterstatus', String(adapter));
    if (adapter !== State.PoweredOn) {
      this.onStatusChange('idle');
      return false;
    }

    const ok = await this.connectToDeviceById(id, name ?? undefined, {
      silent: true,
      timeout: KNOWN_CONNECT_TIMEOUT_MS,
    });
    // De silent-vlag onderdrukt de foutmélding, niet de statusreset: zonder dit
    // bleef de rij op 'Zoeken…' hangen met een uitgeschakelde knop, waardoor de
    // gebruiker de band ook handmatig niet meer kon verbinden.
    if (!ok) this.onStatusChange('idle');
    return ok;
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
    this.stopped = false;
    // Ook de afbreek-vlag, en niet alleen in `startScan`/`connectKnown`: een mislukte
    // poging zet hem via `releaseDevice()` op true, en bleef hij dan staan, dan zweeg
    // op de vólgende (geslaagde) verbinding élke bewaking — monitorfout, disconnect
    // én de stilte-deadline hangen alle drie aan deze vlag.
    this.intentionalDisconnect = false;
    try {
      const manager = await this.getManager();
      const device = await manager.connectToDevice(
        deviceId,
        opts?.timeout ? { timeout: opts.timeout } : undefined,
      );
      this.device = device;
      const deviceName = name || device.name || device.localName || 'HR Monitor';
      this.deviceName = deviceName;
      // Waar we naar terug mogen als de link straks wegvalt. Pas hier gezet: vóór
      // een geslaagde connect is er geen band om naar terug te keren.
      this.lastDevice = { id: deviceId, name: deviceName };

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
              // Loslaten en niet enkel melden: zonder dit bleef het toestel vasthangen
              // (op iOS verdwijnt het dan uit de scanresultaten, dus geen andere band
              // meer te verbinden) én bleef de data-deadline lopen, die twaalf seconden
              // later nóg een statuswissel over deze fout heen legde.
              this.handleLinkLost(error.message);
            }
            return;
          }
          if (!char?.value) return;
          const bpm = this.parseHRMeasurement(char.value);
          // Wat een bruikbare meting ís, bepaalt de overgangsfunctie niet — dat is een
          // fysiologische grens en die hoort hier. Wat een bruikbare meting betékent
          // voor de status, bepaalt zij wél.
          const usable = bpm >= 30 && bpm <= 220;
          this.dispatch({ type: 'measurement', usable }, deviceName);
          if (usable) {
            // Pas hier is de link bewezen, dus pas hier is het herstelbudget weer
            // vol. Zou een geslaagde connect al volstaan, dan zou een band die
            // verbindt en meteen weer wegvalt eindeloos blijven proberen.
            this.reconnectAttempts = 0;
            this.onHR(bpm);
          }
        },
        'hr-measurement',
      );

      device.onDisconnected(() => {
        log('disconnected, intentional:', this.intentionalDisconnect);
        if (this.device !== device) return;
        if (!this.intentionalDisconnect) {
          this.handleLinkLost();
        }
      });

      // Bewust níet 'connected' — zie `hrLink.ts`. Een geïnstalleerd abonnement is
      // geen bewijs dat er ooit iets binnenkomt.
      this.dispatch({ type: 'subscribed', silent: opts?.silent === true }, deviceName);
      log('verbonden, wachten op data:', deviceName);
      return true;
    } catch (e: unknown) {
      const bleErr = e as { message?: string };
      log('connect error:', bleErr.message);
      // Faalt de service discovery ná een geslaagde connect, dan staat de GATT-link er
      // wél. Zonder loslaten houden we het toestel vast terwijl de rij "Verbinden"
      // toont — en op iOS verdwijnt een vastgehouden toestel uit de scanresultaten.
      await this.releaseDevice();
      if (opts?.silent) recordAutoConnect('hr', 'connectToDevice faalde', bleErr.message);
      if (!opts?.silent) {
        this.onStatusChange('error', { code: 'connect_failed', detail: bleErr.message });
      }
      return false;
    }
  }

  stop(): void {
    this.intentionalDisconnect = true;
    // Een lopende herstelpoging hoort hier te eindigen: de gebruiker (of het einde
    // van de rit) zei nee, en een dienst die dan alsnog terugverbindt vecht tegen
    // datgene wat net gevraagd werd.
    this.stopped = true;
    this.recovering = false;
    this.reconnectAttempts = 0;
    this.lastDevice = null;
    this.device?.cancelConnection().catch(() => {});
    this.letGo();
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
    this.letGo();
    await device.cancelConnection().catch(() => {});
  }

  /**
   * Timers, abonnement, toestel én de staat waarin we denken te zitten — alle vier
   * horen samen los te gaan.
   *
   * Drie plekken deden hier hun eigen versie van, en elke versie vergat iets anders.
   * Juist de vergeten vierde is de gevaarlijkste: blijft `link` op 'live' staan nadat
   * het toestel weg is, dan denkt de dienst dat een bewezen verbinding bestaat die er
   * niet meer is. Dat is precies de klasse fout die `hrLink.ts` moest wegnemen, en ze
   * zou via de bedrading terug naar binnen zijn gekomen.
   */
  private letGo(): void {
    this.cleanup();
    this.device = null;
    this.deviceName = null;
    this.link = stepHrLink(this.link, { type: 'released' }).state;
  }

  destroy(): void {
    this.stop();
    this.appStateSub?.remove();
    this.appStateSub = null;
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
    this.clearDataDeadline();
    this.monitorSub?.remove();
    this.monitorSub = null;
  }

  private clearDataDeadline(): void {
    if (this.dataDeadline) clearTimeout(this.dataDeadline);
    this.dataDeadline = null;
  }

  /**
   * De enige plek waar de verbindingsstaat verandert. De regel zelf staat in
   * `hrLink.ts` en is daar getoetst; hier blijft alleen het uitvoeren over — status
   * publiceren, de deadline zetten, het toestel loslaten.
   *
   * Loslaten is geen detail: op iOS verdwijnt een toestel dat wíj vasthouden uit de
   * scanresultaten, dus een dode verbinding laten staan sluit een échte band buiten
   * voor de rest van de rit.
   */
  private dispatch(event: HrLinkEvent, deviceName?: string): void {
    const { state, effect } = stepHrLink(this.link, event);
    this.link = state;

    if (effect.release) void this.releaseDevice();
    if (effect.clearDeadline) this.clearDataDeadline();
    if (effect.rearmDeadline) this.rearmDeadline(deviceName);
    if (effect.status) {
      this.onStatusChange(
        effect.status,
        effect.error ? { code: effect.error } : undefined,
        deviceName,
      );
    }
  }

  /**
   * Een verbinding die wíj niet verbroken hebben. De roeier-dienst probeert dit al
   * een paar keer opnieuw (`attemptReconnect` in `ble-service.ts`); de band deed dat
   * niet, en daarmee was elke onderbreking tijdens een rit definitief — `autoConnect`
   * draait alleen bij het openen van het trainingsscherm in de idle-fase, dus midden
   * in een rit kwam er niets meer langs dat de band terughaalde.
   *
   * Loslaten zonder `intentionalDisconnect`: die vlag is hier de afbreek-knop van de
   * gebruiker, en `releaseDevice()` zou hem opzetten waarna het herstel zichzelf
   * meteen zou afbreken. De GATT-link gaat wél dicht — op iOS verdwijnt een toestel
   * dat wij vasthouden uit de scanresultaten.
   */
  private handleLinkLost(detail?: string): void {
    const device = this.device;
    this.letGo();
    void device?.cancelConnection().catch(() => {});
    void this.attemptReconnect(detail);
  }

  private async attemptReconnect(detail?: string): Promise<void> {
    const target = this.lastDevice;
    if (this.stopped) {
      this.recovering = false;
      return;
    }
    if (!target || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.recovering = false;
      this.reconnectAttempts = 0;
      this.onStatusChange('error', { code: 'connection_lost', detail });
      return;
    }

    this.recovering = true;
    this.reconnectAttempts++;
    log('verbinding verloren — poging', this.reconnectAttempts, 'van', MAX_RECONNECT_ATTEMPTS, ':', target.name);
    // 'scanning' en niet 'error': er lóópt iets. Een foutmelding zou vragen om een
    // ingreep die de app zelf al aan het doen is.
    this.onStatusChange('scanning', undefined, target.name);

    await this.delay(RECONNECT_DELAY_MS);
    if (this.stopped || this.device) {
      this.recovering = false;
      return;
    }

    const ok = await this.connectToDeviceById(target.id, target.name, {
      silent: true,
      timeout: KNOWN_CONNECT_TIMEOUT_MS,
    });
    if (ok) {
      this.recovering = false;
      return;
    }
    void this.attemptReconnect(detail);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Een band meet rond 1 Hz, dus `HR_DATA_TIMEOUT_MS` is ruim genoeg voor een gemiste
   * beat en kort genoeg om niet een halve rit lang een verzonnen hartslag te tonen.
   * Achtergrondtijd telt niet mee — zie de AppState-koppeling in de constructor.
   */
  private rearmDeadline(deviceName?: string): void {
    this.clearDataDeadline();
    this.dataDeadline = setTimeout(() => {
      this.dataDeadline = null;
      if (this.intentionalDisconnect || !this.device) return;
      log('geen hartslagdata binnen', HR_DATA_TIMEOUT_MS, 'ms — loslaten:', deviceName);
      this.dispatch({ type: 'silence' }, deviceName);
    }, HR_DATA_TIMEOUT_MS);
  }
}
