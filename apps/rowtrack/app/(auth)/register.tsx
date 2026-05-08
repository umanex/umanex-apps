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
import { Button, FormField, ErrorMessage } from '@/components';
import {
  bg,
  fg,
  accent,
  display,
  body,
  fontFamily,
  space,
  layout,
} from '@/constants';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      setError('Vul alle velden in.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minstens 6 tekens zijn.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Registratie mislukt.');
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

        <ErrorMessage message={error} />

        <FormField
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <FormField
          placeholder="Wachtwoord"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <FormField
          placeholder="Bevestig wachtwoord"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <Button
          title="Maak account"
          onPress={handleRegister}
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
    ...display.md,
    color: accent.default,
    textAlign: 'center',
  },
  subtitle: {
    ...body.md,
    color: fg.secondary,
    textAlign: 'center',
    marginBottom: space['16'],
  },
  button: {
    marginTop: space['8'],
  },
  linkContainer: {
    alignItems: 'center',
    paddingVertical: space['8'],
  },
  linkText: {
    ...body.sm,
    color: fg.secondary,
  },
  linkAccent: {
    color: accent.default,
    fontFamily: fontFamily.bodySemiBold,
  },
});
