import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { completePasswordReset } from '@/lib/auth';
import { isValidPassword, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { Button, FormField, ErrorMessage } from '@/components';
import { bg, fg, accent, typeStyles, space, layout } from '@/constants';

type RecoveryTokens = { access_token: string; refresh_token: string };

/** Haalt de recovery-tokens uit de deep-link. Supabase's implicit flow zet ze
 *  in de URL-fragment (#…); een query (?…) wordt als fallback ondersteund. */
function parseRecoveryTokens(url: string | null): RecoveryTokens | null {
  if (!url) return null;
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams(fragment || query);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type = params.get('type');
  if (access_token && refresh_token && (type === null || type === 'recovery')) {
    return { access_token, refresh_token };
  }
  return null;
}

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [url, setUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Linking.getInitialURL().then((initial) => {
      setUrl(initial);
      setResolving(false);
    });
    const sub = Linking.addEventListener('url', (event) => {
      setUrl(event.url);
      setResolving(false);
    });
    return () => sub.remove();
  }, []);

  const tokens = useMemo(() => parseRecoveryTokens(url), [url]);

  const passwordError = touched.password
    ? !password
      ? 'Vul een wachtwoord in'
      : !isValidPassword(password)
        ? `Minstens ${MIN_PASSWORD_LENGTH} tekens`
        : undefined
    : undefined;
  const confirmError = touched.confirm
    ? !confirm
      ? 'Bevestig je wachtwoord'
      : confirm !== password
        ? 'Wachtwoorden komen niet overeen'
        : undefined
    : undefined;

  const canSubmit =
    isValidPassword(password) && confirm.length > 0 && confirm === password && !saving;

  async function handleSave() {
    if (!canSubmit || !tokens) return;
    setSubmitError('');
    setSaving(true);
    try {
      await completePasswordReset(tokens, password);
      setDone(true);
    } catch (e: any) {
      setSubmitError(e.message ?? 'Kon het wachtwoord niet wijzigen. Vraag een nieuwe link aan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {resolving ? (
          <ActivityIndicator color={accent.default} />
        ) : done ? (
          <>
            <Ionicons name="checkmark-circle-outline" size={48} color={accent.default} style={styles.icon} />
            <Text style={styles.title}>Wachtwoord gewijzigd</Text>
            <Text style={styles.subtitle}>Je kunt nu inloggen met je nieuwe wachtwoord.</Text>
            <Button
              title="Naar inloggen"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.button}
            />
          </>
        ) : !tokens ? (
          <>
            <Ionicons name="alert-circle-outline" size={48} color={accent.default} style={styles.icon} />
            <Text style={styles.title}>Link ongeldig of verlopen</Text>
            <Text style={styles.subtitle}>
              Vraag een nieuwe reset-link aan om verder te gaan.
            </Text>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>
                  <Text style={styles.linkAccent}>Nieuwe link aanvragen</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.title}>Nieuw wachtwoord</Text>
            <Text style={styles.subtitle}>Kies een nieuw wachtwoord voor je account.</Text>

            <ErrorMessage message={submitError} />

            <FormField
              label="Nieuw wachtwoord"
              placeholder={`Minstens ${MIN_PASSWORD_LENGTH} tekens`}
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={passwordError}
              secureTextEntry
              autoComplete="new-password"
            />

            <FormField
              label="Bevestig wachtwoord"
              value={confirm}
              onChangeText={setConfirm}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              error={confirmError}
              secureTextEntry
              autoComplete="new-password"
            />

            <Button
              title="Wachtwoord opslaan"
              onPress={handleSave}
              disabled={!canSubmit}
              loading={saving}
              style={styles.button}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg.base,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenHorizontal,
    gap: space['16'],
  },
  icon: {
    alignSelf: 'center',
    marginBottom: space['8'],
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.italicConnector,
    color: fg.secondary,
    textAlign: 'center',
    marginBottom: space['8'],
  },
  button: {
    marginTop: space['8'],
  },
  linkContainer: {
    alignItems: 'center',
    paddingVertical: space['8'],
  },
  linkText: {
    ...typeStyles.textLink,
    color: fg.secondary,
    textAlign: 'center',
  },
  linkAccent: {
    color: accent.default,
  },
});
