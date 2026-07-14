import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button, WheelPicker } from '@/components';
import { GoalProgressCard } from '@/components/GoalProgressCard';
import { BottomSheet } from '@/components/BottomSheet';
import { usePeriodGoal } from '@/lib/hooks/usePeriodGoal';
import type { PeriodGoalPeriod, PeriodGoalMetric } from '@/lib/hooks/usePeriodGoal';
import {
  bg,
  fg,
  accent,
  border,
  space,
  typeStyles,
  fontFamily,
  fontSize,
  radii,
  componentRadius,
  body,
  status,
} from '@/constants';
import type { WheelItem } from '@/lib/formatters';

// --- Date of birth helpers ---

const BIRTH_YEAR_MIN = 1930;
const BIRTH_YEAR_MAX = new Date().getFullYear() - 5;
const BIRTH_YEARS = Array.from(
  { length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 },
  (_, i) => BIRTH_YEAR_MIN + i,
);

const NL_MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const DAY_ITEMS: WheelItem[] = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
const MONTH_ITEMS: WheelItem[] = NL_MONTHS_SHORT.map((m, i) => ({ label: m, value: i + 1 }));
const YEAR_ITEMS: WheelItem[] = BIRTH_YEARS.map(y => ({ label: String(y), value: y }));

// Lengte/gewicht: single-column wheels met de unit binnen de wheel (value + unit).
const HEIGHT_MIN = 100, HEIGHT_MAX = 250;
const WEIGHT_MIN = 30, WEIGHT_MAX = 300;
const HEIGHT_ITEMS: WheelItem[] = Array.from({ length: HEIGHT_MAX - HEIGHT_MIN + 1 }, (_, i) => {
  const v = HEIGHT_MIN + i;
  return { label: `${v} cm`, value: v, unit: 'cm' };
});
const WEIGHT_ITEMS: WheelItem[] = Array.from({ length: WEIGHT_MAX - WEIGHT_MIN + 1 }, (_, i) => {
  const v = WEIGHT_MIN + i;
  return { label: `${v} kg`, value: v, unit: 'kg' };
});

const DEFAULT_YEAR_IDX = Math.max(0, BIRTH_YEARS.indexOf(1990));

function parseBirthDate(date: string | null): { dayIdx: number; monthIdx: number; yearIdx: number } {
  if (!date) return { dayIdx: 0, monthIdx: 0, yearIdx: DEFAULT_YEAR_IDX };
  const [y, m, d] = date.split('-').map(Number);
  return {
    dayIdx: Math.max(0, d - 1),
    monthIdx: Math.max(0, m - 1),
    yearIdx: Math.max(0, BIRTH_YEARS.indexOf(y)),
  };
}

function indicesToDate(dayIdx: number, monthIdx: number, yearIdx: number): string {
  const d = String(dayIdx + 1).padStart(2, '0');
  const m = String(monthIdx + 1).padStart(2, '0');
  const y = BIRTH_YEARS[yearIdx];
  return `${y}-${m}-${d}`;
}

function formatBirthDate(date: string | null): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function genderLabel(g: string | null): string {
  if (g === 'male') return 'Man';
  if (g === 'female') return 'Vrouw';
  if (g === 'other') return 'Anders';
  return '—';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SheetType = 'none' | 'voornaam' | 'email' | 'geslacht' | 'lengte' | 'gewicht' | 'geboortedatum' | 'doel';

export default function ProfileScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { goalProgress, refetch: refetchGoal } = usePeriodGoal(user?.id);

  // --- Profile state ---
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [spmHalved, setSpmHalved] = useState(false);
  const [goalPeriod, setGoalPeriod] = useState<PeriodGoalPeriod | null>(null);
  const [goalMetric, setGoalMetric] = useState<PeriodGoalMetric | null>(null);
  const [goalTarget, setGoalTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Sheet state ---
  const [sheetOpen, setSheetOpen] = useState<SheetType>('none');

  // Voornaam draft
  const [draftName, setDraftName] = useState('');

  // Email draft
  const [draftEmail, setDraftEmail] = useState('');
  const [draftEmailRepeat, setDraftEmailRepeat] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChanging, setEmailChanging] = useState(false);

  // Body data drafts
  const [draftGender, setDraftGender] = useState<string | null>(null);
  const [draftHeight, setDraftHeight] = useState(170);
  const [draftWeight, setDraftWeight] = useState(70);
  const [draftDayIdx, setDraftDayIdx] = useState(0);
  const [draftMonthIdx, setDraftMonthIdx] = useState(0);
  const [draftYearIdx, setDraftYearIdx] = useState(DEFAULT_YEAR_IDX);

  // Goal draft
  const [draftGoalPeriod, setDraftGoalPeriod] = useState<PeriodGoalPeriod | null>(null);
  const [draftGoalMetric, setDraftGoalMetric] = useState<PeriodGoalMetric | null>(null);
  const [draftGoalTarget, setDraftGoalTarget] = useState('');

  // --- Input refs for autofocus and field chaining ---
  const nameInputRef = useRef<TextInput>(null);
  const newEmailRef = useRef<TextInput>(null);
  const repeatEmailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Autofocus after sheet open animation (ANIM_MS = 220ms → wait 250ms)
  useEffect(() => {
    if (sheetOpen === 'voornaam') {
      const t = setTimeout(() => nameInputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
    if (sheetOpen === 'email') {
      const t = setTimeout(() => newEmailRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [sheetOpen]);

  // --- Fetch profile ---
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, gender, height_cm, weight_kg, birth_date, spm_halved')
      .eq('id', user.id)
      .single();

    setDisplayName(data?.display_name ?? '');
    setGender(data?.gender ?? null);
    setHeightCm(data?.height_cm ?? null);
    setWeightKg(data?.weight_kg ?? null);
    setBirthDate(data?.birth_date ?? null);
    setSpmHalved(data?.spm_halved ?? false);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  // Sync goal editable state from usePeriodGoal
  useFocusEffect(
    useCallback(() => {
      if (goalProgress) {
        setGoalPeriod(goalProgress.goal.period);
        setGoalMetric(goalProgress.goal.metric);
        const m = goalProgress.goal.metric;
        const raw = goalProgress.goal.target;
        if (m === 'distance') setGoalTarget(String(raw / 1000));
        else if (m === 'duration') setGoalTarget(String(raw / 60));
        else setGoalTarget(String(raw));
      } else {
        setGoalPeriod(null);
        setGoalMetric(null);
        setGoalTarget('');
      }
    }, [goalProgress]),
  );

  // --- Sheet openers ---
  function openVoornaam() {
    setDraftName(displayName);
    setSheetOpen('voornaam');
  }

  function openEmail() {
    setDraftEmail('');
    setDraftEmailRepeat('');
    setDraftPassword('');
    setEmailError(null);
    setSheetOpen('email');
  }

  function openGeslacht() {
    setDraftGender(gender);
    setSheetOpen('geslacht');
  }

  function openLengte() {
    setDraftHeight(heightCm ?? 170);
    setSheetOpen('lengte');
  }

  function openGewicht() {
    setDraftWeight(weightKg ?? 70);
    setSheetOpen('gewicht');
  }

  function openGeboortedatum() {
    const { dayIdx, monthIdx, yearIdx } = parseBirthDate(birthDate);
    setDraftDayIdx(dayIdx);
    setDraftMonthIdx(monthIdx);
    setDraftYearIdx(yearIdx);
    setSheetOpen('geboortedatum');
  }

  function openDoel() {
    setDraftGoalPeriod(goalPeriod);
    setDraftGoalMetric(goalMetric);
    setDraftGoalTarget(goalTarget);
    setSheetOpen('doel');
  }

  function closeSheet() {
    setSheetOpen('none');
  }

  // --- Sheet savers (stage to profile state) ---
  function saveVoornaam() {
    setDisplayName(draftName.trim());
    setSheetOpen('none');
  }

  function saveGeslacht() {
    setGender(draftGender);
    setSheetOpen('none');
  }

  function saveLengte() {
    setHeightCm(draftHeight);
    setSheetOpen('none');
  }

  function saveGewicht() {
    setWeightKg(draftWeight);
    setSheetOpen('none');
  }

  function saveGeboortedatum() {
    setBirthDate(indicesToDate(draftDayIdx, draftMonthIdx, draftYearIdx));
    setSheetOpen('none');
  }

  function saveDoel() {
    setGoalPeriod(draftGoalPeriod);
    setGoalMetric(draftGoalMetric);
    setGoalTarget(draftGoalTarget);
    setSheetOpen('none');
  }

  // --- Email change (direct Supabase auth write, not staged) ---
  const emailFormValid =
    EMAIL_RE.test(draftEmail) &&
    draftEmail === draftEmailRepeat &&
    draftPassword.length > 0;

  async function handleEmailChange() {
    if (!emailFormValid || !user?.email) return;
    setEmailError(null);
    setEmailChanging(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: draftPassword,
    });

    if (signInError) {
      setEmailError('Wachtwoord klopt niet.');
      setEmailChanging(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ email: draftEmail });
    setEmailChanging(false);

    if (updateError) {
      setEmailError(updateError.message);
      return;
    }

    setSheetOpen('none');
    Alert.alert(
      'Bevestiging verstuurd',
      `Controleer je inbox op ${draftEmail} om de wijziging te bevestigen.`,
    );
  }

  // --- Main profile save ---
  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const hasGoal = goalPeriod && goalMetric && goalTarget;
    let goalTargetStored: number | null = null;
    if (hasGoal) {
      const raw = parseFloat(goalTarget);
      if (goalMetric === 'distance') goalTargetStored = Math.round(raw * 1000);
      else if (goalMetric === 'duration') goalTargetStored = Math.round(raw * 60);
      else goalTargetStored = Math.round(raw);
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        gender: gender || null,
        height_cm: heightCm,
        weight_kg: weightKg,
        birth_date: birthDate,
        spm_halved: spmHalved,
        period_goal_period: hasGoal ? goalPeriod : null,
        period_goal_metric: hasGoal ? goalMetric : null,
        period_goal_target: goalTargetStored,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Fout', `Opslaan mislukt: ${error.message}`);
    } else {
      await refetchGoal();
    }
  }

  function handleLogout() {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: signOut },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={accent.default} />
      </View>
    );
  }

  const nameLabel = displayName || '—';
  const heightLabel = heightCm != null ? `${heightCm} cm` : '—';
  const weightLabel = weightKg != null ? `${weightKg} kg` : '—';

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Profiel</Text>

        {/* MIJN DOEL */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MIJN DOEL</Text>
          {goalProgress ? (
            <GoalProgressCard progress={goalProgress} onEdit={openDoel} />
          ) : (
            <TouchableOpacity style={styles.listRow} onPress={openDoel} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Geen doel ingesteld</Text>
              <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ACCOUNT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.listCard}>
            <TouchableOpacity style={styles.listRow} onPress={openVoornaam} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Voornaam</Text>
              <View style={styles.listRight}>
                <Text style={styles.listValue}>{nameLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
              </View>
            </TouchableOpacity>
            <View style={styles.listDivider} />
            <TouchableOpacity style={styles.listRow} onPress={openEmail} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Email</Text>
              <View style={styles.listRight}>
                <Text style={styles.listValue}>{user?.email ?? '—'}</Text>
                <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* LICHAAMSGEGEVENS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LICHAAMSGEGEVENS</Text>
          <View style={styles.listCard}>
            <TouchableOpacity style={styles.listRow} onPress={openGeslacht} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Geslacht</Text>
              <View style={styles.listRight}>
                <Text style={styles.listValue}>{genderLabel(gender)}</Text>
                <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
              </View>
            </TouchableOpacity>
            <View style={styles.listDivider} />
            <TouchableOpacity style={styles.listRow} onPress={openGeboortedatum} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Geboortedatum</Text>
              <View style={styles.listRight}>
                <Text style={styles.listValue}>{formatBirthDate(birthDate)}</Text>
                <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
              </View>
            </TouchableOpacity>
            <View style={styles.listDivider} />
            <TouchableOpacity style={styles.listRow} onPress={openLengte} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Lengte</Text>
              <View style={styles.listRight}>
                <Text style={styles.listValue}>{heightLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
              </View>
            </TouchableOpacity>
            <View style={styles.listDivider} />
            <TouchableOpacity style={styles.listRow} onPress={openGewicht} activeOpacity={0.8}>
              <Text style={styles.listLabel}>Gewicht</Text>
              <View style={styles.listRight}>
                <Text style={styles.listValue}>{weightLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ROEITRAINER */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ROEITRAINER</Text>
          <View style={styles.listCard}>
            <View style={styles.listRow}>
              <View style={styles.spmToggleLabel}>
                <Text style={styles.listLabel}>SPM halveren</Text>
                <Text style={styles.listHint}>Voor trainers die de slagfrequentie dubbel tellen</Text>
              </View>
              <Switch
                value={spmHalved}
                onValueChange={setSpmHalved}
                trackColor={{ false: border.strong, true: accent.default }}
                thumbColor={fg.primary}
                ios_backgroundColor={border.strong}
              />
            </View>
          </View>
        </View>

        <Button title="Opslaan" onPress={handleSave} loading={saving} size="lg" />

        <Button title="Uitloggen" onPress={handleLogout} variant="primary" size="lg" icon="arrow-forward" iconPosition="trailing" />

        <Text style={styles.version}>RowTrack v1.0.0</Text>
      </ScrollView>

      {/* Voornaam */}
      <BottomSheet
        visible={sheetOpen === 'voornaam'}
        onClose={closeSheet}
        title="Voornaam"
      >
        <TextInput
          ref={nameInputRef}
          style={styles.sheetInput}
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Je voornaam"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={saveVoornaam}
          placeholderTextColor={fg.tertiary}
        />
        <Button title="Opslaan" onPress={saveVoornaam} size="md" />
      </BottomSheet>

      {/* E-mail wijzigen */}
      <BottomSheet
        visible={sheetOpen === 'email'}
        onClose={closeSheet}
        title="E-mail wijzigen"
      >
        <View style={styles.sheetFieldGroup}>
          <Text style={styles.sheetFieldLabel}>HUIDIG E-MAILADRES</Text>
          <Text style={styles.currentEmailText}>{user?.email ?? ''}</Text>
        </View>

        <View style={styles.sheetFieldGroup}>
          <Text style={styles.sheetFieldLabel}>NIEUW E-MAILADRES</Text>
          <TextInput
            ref={newEmailRef}
            style={styles.sheetInput}
            value={draftEmail}
            onChangeText={text => { setDraftEmail(text); setEmailError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => repeatEmailRef.current?.focus()}
            placeholder="nieuw@email.com"
            placeholderTextColor={fg.tertiary}
          />
        </View>

        <View style={styles.sheetFieldGroup}>
          <Text style={styles.sheetFieldLabel}>HERHAAL E-MAILADRES</Text>
          <TextInput
            ref={repeatEmailRef}
            style={styles.sheetInput}
            value={draftEmailRepeat}
            onChangeText={text => { setDraftEmailRepeat(text); setEmailError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="nieuw@email.com"
            placeholderTextColor={fg.tertiary}
          />
        </View>

        <View style={styles.sheetFieldGroup}>
          <Text style={styles.sheetFieldLabel}>WACHTWOORD</Text>
          <TextInput
            ref={passwordRef}
            style={styles.sheetInput}
            value={draftPassword}
            onChangeText={text => { setDraftPassword(text); setEmailError(null); }}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={emailFormValid ? handleEmailChange : undefined}
            placeholder="Je huidige wachtwoord"
            placeholderTextColor={fg.tertiary}
          />
        </View>

        {emailError && <Text style={styles.emailError}>{emailError}</Text>}

        <Button
          title="E-mail wijzigen"
          onPress={handleEmailChange}
          disabled={!emailFormValid || emailChanging}
          loading={emailChanging}
          size="md"
        />
      </BottomSheet>

      {/* Geslacht */}
      <BottomSheet
        visible={sheetOpen === 'geslacht'}
        onClose={closeSheet}
        title="Geslacht"
      >
        <View style={styles.segmentedRow}>
          {(['male', 'female', 'other'] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.segmentBtn, draftGender === g && styles.segmentBtnActive]}
              onPress={() => setDraftGender(g)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, draftGender === g && styles.segmentBtnTextActive]}>
                {g === 'male' ? 'Man' : g === 'female' ? 'Vrouw' : 'Anders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title="Opslaan" onPress={saveGeslacht} size="md" />
      </BottomSheet>

      {/* Lengte */}
      <BottomSheet
        visible={sheetOpen === 'lengte'}
        onClose={closeSheet}
        title="Lengte"
      >
        <WheelPicker
          items={HEIGHT_ITEMS}
          selectedIndex={draftHeight - HEIGHT_MIN}
          onIndexChange={(idx) => setDraftHeight(HEIGHT_MIN + idx)}
        />
        <Button title="Opslaan" onPress={saveLengte} size="md" />
      </BottomSheet>

      {/* Gewicht */}
      <BottomSheet
        visible={sheetOpen === 'gewicht'}
        onClose={closeSheet}
        title="Gewicht"
      >
        <WheelPicker
          items={WEIGHT_ITEMS}
          selectedIndex={draftWeight - WEIGHT_MIN}
          onIndexChange={(idx) => setDraftWeight(WEIGHT_MIN + idx)}
        />
        <Button title="Opslaan" onPress={saveGewicht} size="md" />
      </BottomSheet>

      {/* Geboortedatum */}
      <BottomSheet
        visible={sheetOpen === 'geboortedatum'}
        onClose={closeSheet}
        title="Geboortedatum"
      >
        <View style={styles.datePickerRow}>
          <View style={styles.datePickerCol}>
            <WheelPicker items={DAY_ITEMS} selectedIndex={draftDayIdx} onIndexChange={setDraftDayIdx} />
          </View>
          <View style={styles.datePickerCol}>
            <WheelPicker items={MONTH_ITEMS} selectedIndex={draftMonthIdx} onIndexChange={setDraftMonthIdx} />
          </View>
          <View style={styles.datePickerCol}>
            <WheelPicker items={YEAR_ITEMS} selectedIndex={draftYearIdx} onIndexChange={setDraftYearIdx} />
          </View>
        </View>
        <Button title="Opslaan" onPress={saveGeboortedatum} size="md" />
      </BottomSheet>

      {/* Doel bewerken */}
      <BottomSheet
        visible={sheetOpen === 'doel'}
        onClose={closeSheet}
        title="Doel bewerken"
      >
        <View style={styles.sheetFieldGroup}>
          <Text style={styles.sheetFieldLabel}>PERIODE</Text>
          <View style={styles.segmentedRow}>
            {(['week', 'month'] as PeriodGoalPeriod[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.segmentBtn, draftGoalPeriod === p && styles.segmentBtnActive]}
                onPress={() => setDraftGoalPeriod(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, draftGoalPeriod === p && styles.segmentBtnTextActive]}>
                  {p === 'week' ? 'Week' : 'Maand'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sheetFieldGroup}>
          <Text style={styles.sheetFieldLabel}>TYPE</Text>
          <View style={styles.segmentedRow}>
            {(['distance', 'duration', 'workouts'] as PeriodGoalMetric[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.segmentBtn, draftGoalMetric === m && styles.segmentBtnActive]}
                onPress={() => setDraftGoalMetric(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, draftGoalMetric === m && styles.segmentBtnTextActive]}>
                  {m === 'distance' ? 'Afstand' : m === 'duration' ? 'Duur' : 'Sessies'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {draftGoalMetric && (
          <View style={styles.sheetFieldGroup}>
            <Text style={styles.sheetFieldLabel}>STREEFWAARDE</Text>
            <View style={styles.sheetInputRow}>
              <TextInput
                style={styles.sheetInputFlex}
                value={draftGoalTarget}
                onChangeText={setDraftGoalTarget}
                keyboardType="numeric"
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={saveDoel}
                placeholderTextColor={fg.tertiary}
                placeholder="0"
              />
              <Text style={styles.sheetInputUnit}>
                {draftGoalMetric === 'distance' ? 'km' : draftGoalMetric === 'duration' ? 'min' : 'sessies'}
              </Text>
            </View>
          </View>
        )}

        <Button title="Opslaan" onPress={saveDoel} size="md" />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg.base,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: space['20'],
    paddingBottom: space['40'],
    paddingTop: space['20'],
    gap: space['20'],
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },

  // Sections
  section: {
    gap: space['8'],
  },
  sectionLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },

  // List card (grouped rows)
  listCard: {
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space['16'],
    paddingVertical: 14,
    minHeight: 48,
  },
  listDivider: {
    height: 1,
    backgroundColor: fg.quaternary,
  },
  listLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['8'],
  },
  listValue: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['16'],
    color: fg.primary,
  },
  spmToggleLabel: {
    flex: 1,
    gap: space['2'],
    paddingRight: space['16'],
  },
  listHint: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['13'],
    color: fg.tertiary,
  },

  // Sheet: text input
  sheetInput: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['16'],
    color: fg.primary,
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: componentRadius.cardSm,
    paddingHorizontal: space['16'],
    paddingVertical: space['12'],
  },

  // Sheet: current email display
  currentEmailText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['18'],
    color: fg.secondary,
  },

  // Sheet: error message
  emailError: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['14'],
    color: status.error,
  },

  // Sheet: segmented control
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: bg.elevated,
    borderRadius: radii.sm,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space['12'],
    borderRadius: radii.sm,
  },
  segmentBtnActive: {
    // Active = 0.20 accent-tint + border + rode tekst (matcht Chip; design 07-Profile).
    // TODO: accent.selected-token ontbreekt nog (§2 ①) — zelfde hardcode als Chip/GoalSegments.
    backgroundColor: 'rgba(240, 84, 84, 0.20)',
    borderWidth: 1,
    borderColor: accent.default,
  },
  segmentBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['14'],
    color: fg.secondary,
  },
  segmentBtnTextActive: {
    color: accent.default,
  },

  // Sheet: date picker
  datePickerRow: {
    flexDirection: 'row',
    gap: space['12'],
  },
  datePickerCol: {
    flex: 1,
  },

  // Sheet: goal fields
  sheetFieldGroup: {
    gap: space['8'],
  },
  sheetFieldLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  sheetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: componentRadius.cardSm,
    paddingHorizontal: space['16'],
    paddingVertical: space['12'],
    gap: space['8'],
  },
  sheetInputFlex: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['16'],
    color: fg.primary,
  },
  sheetInputUnit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['12'],
    color: fg.secondary,
  },

  version: {
    ...body.xs,
    color: fg.secondary,
    textAlign: 'center',
    paddingTop: space['16'],
  },
});
