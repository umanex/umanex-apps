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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Vul e-mail en wachtwoord in.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Inloggen mislukt.');
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
          autoComplete="password"
        />

        <Button
          title="Log in"
          onPress={handleLogin}
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
