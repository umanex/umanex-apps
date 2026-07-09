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
import { signUp } from '@/lib/auth';
import {
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
  emailFieldError,
  passwordFieldError,
  confirmFieldError,
} from '@/lib/validation';
import { Button, FormField, ErrorMessage } from '@/components';
import { bg, fg, accent, typeStyles, space, layout } from '@/constants';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailError = emailFieldError(email, touched.email);
  const passwordError = passwordFieldError(password, touched.password, true);
  const confirmError = confirmFieldError(confirmPassword, password, touched.confirm);

  const canSubmit =
    isValidEmail(email) &&
    isValidPassword(password) &&
    confirmPassword.length > 0 &&
    confirmPassword === password &&
    !loading;

  async function handleRegister() {
    if (!canSubmit) return;
    setSubmitError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password);
    } catch (e: any) {
      setSubmitError(e.message ?? 'Registratie mislukt.');
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
        <Text style={styles.title}>Account aanmaken</Text>
        <Text style={styles.subtitle}>Begin met roeien</Text>

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
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={confirmError}
          secureTextEntry
          autoComplete="new-password"
        />

        <Button
          title="Maak account"
          onPress={handleRegister}
          disabled={!canSubmit}
          loading={loading}
          style={styles.button}
        />

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Al een account?{' '}
              <Text style={styles.linkAccent}>Log in</Text>
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
