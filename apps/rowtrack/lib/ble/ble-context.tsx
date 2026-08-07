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
import { rowerErrorMessage, hrErrorMessage } from '@/i18n/bleErrors';
import type { BleContextValue, ConnectionStatus, HRFoundDevice, HRStatus, RowerMetrics } from './types';

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
  hrDevices: [],
  hrSelecting: false,
  selectHRDevice: () => {},
  cancelHRSelection: () => {},
});

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
  const [hrDevices, setHRDevices] = useState<HRFoundDevice[]>([]);
  const [hrSelecting, setHRSelecting] = useState(false);
  const hrServiceRef = useRef<HRBleService | null>(null);

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
      },
      (newMetrics) => {
        setMetrics(newMetrics);
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
      },
      (bpm) => {
        setHRBpm(bpm);
      },
      (devices) => {
        setHRDevices(devices);
        setHRSelecting(true);
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
  const startScan = useCallback(() => {
    setError(null);
    serviceRef.current?.startScan().catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : undefined;
      setStatus('error');
      setError(rowerErrorMessage({ code: 'scan_failed', detail }));
    });
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  // HR controls
  const startHRScan = useCallback(() => {
    setHRError(null);
    hrServiceRef.current?.startScan().catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : undefined;
      setHRStatus('error');
      setHRError(hrErrorMessage({ code: 'scan_failed', detail }));
    });
  }, []);

  const stopHR = useCallback(() => {
    hrServiceRef.current?.stop();
  }, []);

  const selectHRDevice = useCallback((deviceId: string) => {
    const device = hrDevices.find((d) => d.id === deviceId);
    setHRSelecting(false);
    setHRDevices([]);
    hrServiceRef.current?.connectToDeviceById(deviceId, device?.name);
  }, [hrDevices]);

  const cancelHRSelection = useCallback(() => {
    setHRSelecting(false);
    setHRDevices([]);
    setHRStatus('idle');
  }, []);

  return (
    <BleContext.Provider
      value={{
        status, deviceName, metrics, error, startScan, disconnect,
        hrStatus, hrDeviceName, hrBpm, hrError, startHRScan, stopHR,
        hrDevices, hrSelecting, selectHRDevice, cancelHRSelection,
      }}
    >
      {children}
    </BleContext.Provider>
  );
}

export function useBle() {
  return useContext(BleContext);
}
