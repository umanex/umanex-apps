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
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordReset } from '@/lib/auth';
import { isValidEmail, emailFieldError } from '@/lib/validation';
import { Button, FormField, ErrorMessage } from '@/components';
import { bg, fg, accent, typeStyles, space, layout } from '@/constants';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const emailError = emailFieldError(email, touched);

  const canSubmit = isValidEmail(email) && !loading;

  async function handleSend() {
    if (!canSubmit) return;
    setSubmitError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e: any) {
      setSubmitError(e.message ?? 'Kon geen reset-link versturen.');
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
        {sent ? (
          <>
            <Ionicons name="mail-outline" size={48} color={accent.default} style={styles.icon} />
            <Text style={styles.title}>Check je mail</Text>
            <Text style={styles.subtitle}>
              We stuurden een reset-link naar {email.trim()}. Volg de link om een nieuw
              wachtwoord in te stellen.
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>
                  <Text style={styles.linkAccent}>Terug naar inloggen</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.title}>Wachtwoord vergeten</Text>
            <Text style={styles.subtitle}>
              Vul je e-mailadres in en we sturen je een reset-link.
            </Text>

            <ErrorMessage message={submitError} />

            <FormField
              label="E-mail"
              placeholder="naam@voorbeeld.be"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched(true)}
              error={emailError}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              autoCorrect={false}
            />

            <Button
              title="Stuur reset-link"
              onPress={handleSend}
              disabled={!canSubmit}
              loading={loading}
              style={styles.button}
            />

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>
                  Weet je het weer? <Text style={styles.linkAccent}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </Link>
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
