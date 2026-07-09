import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { signIn } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';
import { Button, FormField, ErrorMessage } from '@/components';
import { bg, fg, accent, typeStyles, space, layout } from '@/constants';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailError = touched.email
    ? !email.trim()
      ? 'Vul je e-mailadres in'
      : !isValidEmail(email)
        ? 'Ongeldig e-mailadres'
        : undefined
    : undefined;
  const passwordError =
    touched.password && !password ? 'Vul je wachtwoord in' : undefined;

  const canSubmit = isValidEmail(email) && password.length > 0 && !loading;

  async function handleLogin() {
    if (!canSubmit) return;
    setSubmitError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setSubmitError(e.message ?? 'Inloggen mislukt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>RowTrack</Text>
        <Text style={styles.subtitle}>Log in om verder te gaan</Text>

        <ErrorMessage message={submitError} />

        <FormField
          label="E-mail"
          placeholder="naam@voorbeeld.be"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          autoCorrect={false}
        />

        <FormField
          label="Wachtwoord"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          secureTextEntry
          autoComplete="password"
        />

        <Button
          title="Log in"
          onPress={handleLogin}
          disabled={!canSubmit}
          loading={loading}
          style={styles.button}
        />

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Nog geen account?{' '}
              <Text style={styles.linkAccent}>Registreer</Text>
            </Text>
          </TouchableOpacity>
        </Link>
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
  title: {
    ...typeStyles.heroDisplay,
    color: accent.default,
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
