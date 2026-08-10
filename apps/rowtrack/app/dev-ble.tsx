// app/dev-ble.tsx
//
// __DEV__-only diagnose voor autoconnect. Die faalt met opzet stil, dus aan de erg
// is "er gebeurt niets" niet te onderscheiden van "hij vuurde nooit", "er was niets
// onthouden" of "de verbinding werd geweigerd". Dit scherm maakt elk van die drie
// zichtbaar zonder een Mac met Metro ernaast.
//
// Gebruik: deep-link rowtrack://dev-ble, of vanuit de dev-menu-URL-balk.
// Niet in een tab-group; in productie rendert het niets.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBle } from '@/lib/ble/ble-context';
import {
  forgetKnownDevice,
  loadKnownDevice,
  type DeviceKind,
  type KnownDevice,
} from '@/lib/ble/knownDevices';
import {
  readAutoConnectLog,
  subscribeAutoConnectLog,
} from '@/lib/ble/autoConnectLog';
import { readErgProbe, resetErgProbe, subscribeErgProbe } from '@/lib/ble/ergProbe';
import { accent, bg, border, fg, radii, space, status as statusColor, typeStyles } from '@/constants';

export default function DevBleDiagnostics() {
  const { status, hrStatus, autoConnect } = useBle();
  const insets = useSafeAreaInsets();

  const [known, setKnown] = useState<Record<DeviceKind, KnownDevice | null>>({ rower: null, hr: null });
  const [adapter, setAdapter] = useState<string>('…');
  const [busy, setBusy] = useState(false);

  const steps = useSyncExternalStore(subscribeAutoConnectLog, readAutoConnectLog);
  const probe = useSyncExternalStore(subscribeErgProbe, readErgProbe);

  const refresh = useCallback(async () => {
    setKnown({
      rower: await loadKnownDevice('rower'),
      hr: await loadKnownDevice('hr'),
    });
    try {
      // Lokale import: net als de diensten laden we ble-plx pas wanneer hij nodig is,
      // zodat dit scherm ook opent in een build zonder de native module.
      const { BleManager } = await import('react-native-ble-plx');
      setAdapter(String(await new BleManager().state()));
    } catch (e) {
      setAdapter(`niet beschikbaar — ${e instanceof Error ? e.message : 'onbekend'}`);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(async () => {
    setBusy(true);
    await autoConnect();
    await refresh();
    setBusy(false);
  }, [autoConnect, refresh]);

  const forget = useCallback(async (kind: DeviceKind) => {
    await forgetKnownDevice(kind);
    await refresh();
  }, [refresh]);

  if (!__DEV__) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space['20'], paddingBottom: insets.bottom + space['32'] }]}
    >
      <Text style={styles.title}>Autoconnect-diagnose</Text>

      <Text style={styles.section}>Nu</Text>
      <Row label="Bluetooth" value={adapter} warn={adapter !== 'PoweredOn'} />
      <Row label="Roeier" value={status} />
      <Row label="Hartslag" value={hrStatus} />

      <Text style={styles.section}>Onthouden toestellen</Text>
      <Row
        label="Roeier"
        value={known.rower ? `${known.rower.name ?? '(naamloos)'} · ${known.rower.id}` : 'niets onthouden'}
        warn={!known.rower}
      />
      <Row
        label="Hartslag"
        value={known.hr ? `${known.hr.name ?? '(naamloos)'} · ${known.hr.id}` : 'niets onthouden'}
        warn={!known.hr}
      />

      <View style={styles.buttons}>
        <Button label={busy ? 'Bezig…' : 'Autoconnect nu'} onPress={run} disabled={busy} primary />
        <Button label="Ververs" onPress={refresh} />
        <Button label="Vergeet roeier" onPress={() => forget('rower')} />
        <Button label="Vergeet band" onPress={() => forget('hr')} />
      </View>

      <Text style={styles.section}>Meldt deze erg 0 W terwijl je roeit?</Text>
      <Row label="Packets met vermogen" value={String(probe.samples)} />
      <Row
        label="Waarvan 0 W bij slagen"
        value={probe.samples === 0
          ? 'nog niet gemeten — roei een paar minuten'
          : `${probe.zeroWhileRowing}${probe.maxSpmAtZero ? ` (tot ${probe.maxSpmAtZero} spm)` : ''}`}
        warn={probe.zeroWhileRowing > 0}
      />
      <Text style={styles.note}>
        Puur ter informatie: 0 hier betekent dat deze erg slaggemiddeld vermogen stuurt, een
        getal dat hij momentaan meet. De watt-tegel hangt hier níet meer van af — die kijkt
        naar de slagenteller (`strokeIdle.ts`), omdat 0 W na je laatste haal en 0 W in een
        recovery niet uit elkaar te houden zijn.
      </Text>
      <View style={styles.buttons}>
        <Button label="Meting resetten" onPress={resetErgProbe} />
      </View>

      <Text style={styles.section}>Verloop van de laatste poging</Text>
      {steps.length === 0 ? (
        <Text style={styles.empty}>Nog niets vastgelegd. Tik op “Autoconnect nu”, of open het
          trainingsscherm en kom terug.</Text>
      ) : (
        steps.map((s, i) => (
          <View key={`${s.atMs}-${i}`} style={styles.step}>
            <Text style={styles.stepTime}>{`+${(s.atMs / 1000).toFixed(1)}s`}</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepText}>
                <Text style={styles.stepKind}>{s.kind}</Text>
                {`  ${s.step}`}
              </Text>
              {s.detail ? <Text style={styles.stepDetail}>{s.detail}</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const Row = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, warn && styles.rowValueWarn]}>{value}</Text>
  </View>
);

const Button = ({
  label, onPress, disabled, primary,
}: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[styles.button, primary && styles.buttonPrimary, disabled && styles.buttonDisabled]}
  >
    <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bg.base },
  content: { paddingHorizontal: space['20'], gap: space['8'] },
  title: { ...typeStyles.sectionValue, color: fg.primary, marginBottom: space['12'] },
  section: {
    ...typeStyles.labelSection,
    color: fg.secondary,
    marginTop: space['20'],
    marginBottom: space['8'],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space['12'],
    paddingVertical: space['8'],
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  rowLabel: { ...typeStyles.labelKpi, color: fg.tertiary },
  rowValue: { ...typeStyles.splitsRow, color: fg.primary, flexShrink: 1, textAlign: 'right' },
  rowValueWarn: { color: statusColor.error },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space['8'], marginTop: space['20'] },
  button: {
    paddingHorizontal: space['16'],
    paddingVertical: space['12'],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: border.strong,
  },
  buttonPrimary: { backgroundColor: accent.default, borderColor: accent.default },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typeStyles.buttonOutline, color: fg.primary },
  buttonTextPrimary: { color: fg.onAccent },
  empty: { ...typeStyles.splitsRow, color: fg.tertiary },
  note: { ...typeStyles.labelMicro, color: fg.tertiary, marginTop: space['8'] },
  step: { flexDirection: 'row', gap: space['12'], paddingVertical: space['4'] },
  stepTime: { ...typeStyles.labelMicro, color: fg.tertiary, width: 52 },
  stepBody: { flex: 1 },
  stepText: { ...typeStyles.splitsRow, color: fg.primary },
  stepKind: { color: fg.tertiary },
  stepDetail: { ...typeStyles.labelMicro, color: fg.secondary },
});
