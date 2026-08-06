import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RowerBleService } from './ble-service';
import { HRBleService } from './hr-service';
import { loadKnownDevice, saveKnownDevice, type DeviceKind } from './knownDevices';
import { rowerErrorMessage, hrErrorMessage } from '@/i18n/bleErrors';
import type { BleContextValue, ConnectionStatus, FoundDevice, HRStatus, RowerMetrics } from './types';

const BleContext = createContext<BleContextValue>({
  status: 'idle',
  deviceName: null,
  metrics: null,
  error: null,
  startScan: () => {},
  disconnect: () => {},
  hrStatus: 'idle',
  hrDeviceName: null,
  hrBpm: null,
  hrError: null,
  startHRScan: () => {},
  stopHR: () => {},
  devices: [],
  picking: null,
  selectDevice: () => {},
  cancelSelection: () => {},
  autoConnect: async () => {},
});

const log: (...args: unknown[]) => void = __DEV__
  ? (...args: unknown[]) => console.log('[BLE-auto]', ...args)
  : () => {};

export function BleProvider({ children }: { children: React.ReactNode }) {
  // Rower state
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RowerMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<RowerBleService | null>(null);

  // HR state
  const [hrStatus, setHRStatus] = useState<HRStatus>('idle');
  const [hrDeviceName, setHRDeviceName] = useState<string | null>(null);
  const [hrBpm, setHRBpm] = useState<number | null>(null);
  const [hrError, setHRError] = useState<string | null>(null);
  const hrServiceRef = useRef<HRBleService | null>(null);

  // Keuzelijst — gedeeld door beide types; `picking` zegt wélk type kiest.
  const [devices, setDevices] = useState<FoundDevice[]>([]);
  const [picking, setPicking] = useState<DeviceKind | null>(null);

  /**
   * Types waarvoor de gebruiker zelf verbrak. Autoconnect laat die met rust tot hij
   * weer verbindt — anders pakt de app het toestel meteen terug en vecht de app
   * tegen zijn eigen gebruiker. Een ref, niet state: dit stuurt geen render aan en
   * moet meteen leesbaar zijn binnen dezelfde tick.
   */
  const suppressed = useRef<Set<DeviceKind>>(new Set());
  /** Eén autoconnect-poging tegelijk, ook bij een dubbele focus-event. */
  const autoConnecting = useRef(false);

  useEffect(() => {
    // Rower service
    const service = new RowerBleService(
      (newStatus, bleError, name) => {
        setStatus(newStatus);
        // Vertaling van error-code → melding gebeurt hier, op de UI-grens.
        setError(bleError ? rowerErrorMessage(bleError) : null);
        if (name) setDeviceName(name);
        if (newStatus === 'idle') {
          setMetrics(null);
          setDeviceName(null);
        }
        // Onthouden zodra een verbinding staat: dát is het moment waarop we zeker
        // weten dat dit toestel werkt, niet het moment waarop het gevonden werd.
        if (newStatus === 'connected') {
          const d = serviceRef.current?.currentDevice();
          if (d) saveKnownDevice('rower', { id: d.id, name: d.name });
        }
      },
      (newMetrics) => {
        setMetrics(newMetrics);
      },
      (found) => {
        setDevices(found);
        setPicking('rower');
      },
    );
    serviceRef.current = service;

    // HR service
    const hrService = new HRBleService(
      (newStatus, bleError, name) => {
        setHRStatus(newStatus);
        if (name) setHRDeviceName(name);
        if (newStatus === 'idle') {
          setHRBpm(null);
          setHRDeviceName(null);
        }
        // Een HR-fout blokkeert de rit niet, maar hij hoort de gebruiker wel te
        // bereiken: voorheen ging hij enkel naar een dev-log, dus een mislukte scan
        // was niet te onderscheiden van een knop die niets doet.
        setHRError(newStatus === 'error' && bleError ? hrErrorMessage(bleError) : null);
        if (newStatus === 'error' && bleError && __DEV__) {
          console.log('[HR] error:', bleError.code, bleError.detail ?? '');
        }
        if (newStatus === 'connected') {
          const d = hrServiceRef.current?.currentDevice();
          if (d) saveKnownDevice('hr', d);
        }
      },
      (bpm) => {
        setHRBpm(bpm);
      },
      (found) => {
        setDevices(found);
        setPicking('hr');
      },
    );
    hrServiceRef.current = hrService;

    return () => {
      service.destroy();
      serviceRef.current = null;
      hrService.destroy();
      hrServiceRef.current = null;
    };
  }, []);

  // Rower controls
  const startScan = useCallback(async () => {
    setError(null);
    suppressed.current.delete('rower'); // zelf verbinden heft het verbreken op
    // Staat er een onthouden trainer tussen de treffers, dan hoeft die niet op de
    // andere te wachten — met twee machines in de ruimte wint de jouwe meteen.
    const known = await loadKnownDevice('rower');
    serviceRef.current?.setPreferred(known?.id ?? null);
    serviceRef.current?.startScan().catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : undefined;
      setStatus('error');
      setError(rowerErrorMessage({ code: 'scan_failed', detail }));
    });
  }, []);

  const disconnect = useCallback(() => {
    suppressed.current.add('rower');
    serviceRef.current?.disconnect();
  }, []);

  // HR controls
  const startHRScan = useCallback(() => {
    setHRError(null);
    suppressed.current.delete('hr');
    hrServiceRef.current?.startScan().catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : undefined;
      setHRStatus('error');
      setHRError(hrErrorMessage({ code: 'scan_failed', detail }));
    });
  }, []);

  const stopHR = useCallback(() => {
    suppressed.current.add('hr');
    hrServiceRef.current?.stop();
  }, []);

  // Keuzelijst
  const selectDevice = useCallback((deviceId: string) => {
    const kind = picking;
    const device = devices.find((d) => d.id === deviceId);
    setPicking(null);
    setDevices([]);
    if (kind === 'rower') {
      // Bewust gekozen toestel wordt het onthouden toestel — ook als de verbinding
      // straks faalt is dít wat de gebruiker wil, niet het vorige.
      if (device) saveKnownDevice('rower', { id: device.id, name: device.name });
      serviceRef.current?.connectChoice(deviceId);
      return;
    }
    if (kind === 'hr') {
      if (device) saveKnownDevice('hr', { id: device.id, name: device.name });
      hrServiceRef.current?.connectToDeviceById(deviceId, device?.name);
    }
  }, [devices, picking]);

  const cancelSelection = useCallback(() => {
    const kind = picking;
    setPicking(null);
    setDevices([]);
    // Zonder keuze staat er niets te verbinden; de rij hoort terug op "Verbinden".
    if (kind === 'rower') setStatus('idle');
    if (kind === 'hr') setHRStatus('idle');
  }, [picking]);

  /**
   * Verbindt met de toestellen van vorige keer. Draait bij het openen van het
   * trainingsscherm — niet bij app-start, anders doet de app Bluetooth terwijl je
   * alleen je historiek bekijkt.
   *
   * Rechtstreeks op id, dus zonder scan. Dat is sneller én het omzeilt de klasse
   * fouten waarin een toestel niet in scanresultaten opduikt. Lukt het niet, dan
   * gebeurt er niets zichtbaars: de gebruiker tikt gewoon op Verbinden.
   */
  const autoConnect = useCallback(async () => {
    if (autoConnecting.current) return;
    autoConnecting.current = true;
    try {
      const tryKind = async (kind: DeviceKind, busy: boolean, connect: (d: { id: string; name: string | null }) => Promise<boolean>) => {
        if (busy || suppressed.current.has(kind)) return;
        const known = await loadKnownDevice(kind);
        if (!known) return;
        const ok = await connect(known);
        if (!ok) log(kind, 'bekend toestel niet bereikbaar — gebruiker kan zelf verbinden');
      };

      await Promise.all([
        tryKind('rower', status !== 'idle' && status !== 'error', (d) =>
          serviceRef.current?.connectKnown(d.id, d.name) ?? Promise.resolve(false),
        ),
        tryKind('hr', hrStatus !== 'idle' && hrStatus !== 'error', (d) =>
          hrServiceRef.current?.connectKnown(d.id, d.name) ?? Promise.resolve(false),
        ),
      ]);
    } finally {
      autoConnecting.current = false;
    }
  }, [status, hrStatus]);

  return (
    <BleContext.Provider
      value={{
        status, deviceName, metrics, error, startScan, disconnect,
        hrStatus, hrDeviceName, hrBpm, hrError, startHRScan, stopHR,
        devices, picking, selectDevice, cancelSelection, autoConnect,
      }}
    >
      {children}
    </BleContext.Provider>
  );
}

export function useBle() {
  return useContext(BleContext);
}
