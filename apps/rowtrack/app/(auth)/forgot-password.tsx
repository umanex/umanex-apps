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
import { sendPasswordReset, isOfflineAuthError } from '@/lib/auth';
import { reportError } from '@/lib/monitoring';
import { isValidEmail, emailFieldError } from '@/lib/validation';
import { Button, FormField, ErrorMessage } from '@/components';
import { t } from '@/i18n';
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
    } catch (e: unknown) {
      // Nooit `e.message`: dat is de rauwe Engelse GoTrue-tekst, en met `??`
      // werd de Nederlandse zin hieronder per definitie onbereikbaar — een
      // AuthError draagt altijd een message. Het detail gaat naar monitoring.
      reportError(e, { where: 'auth.sendPasswordReset' });
      setSubmitError(isOfflineAuthError(e) ? t.auth.offline : t.auth.forgot.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      testID="ForgotPasswordScreen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {sent ? (
          <>
            <Ionicons name="mail-outline" size={48} color={accent.default} style={styles.icon} />
            <Text style={styles.title}>{t.auth.forgot.sentTitle}</Text>
            <Text style={styles.subtitle}>{t.auth.forgot.sentBody(email.trim())}</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>
                  <Text style={styles.linkAccent}>{t.auth.forgot.backToLogin}</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t.auth.forgot.title}</Text>
            <Text style={styles.subtitle}>{t.auth.forgot.subtitle}</Text>

            <ErrorMessage message={submitError} />

            <FormField
              label={t.auth.emailLabel}
              placeholder={t.auth.emailPlaceholder}
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
              title={t.auth.forgot.button}
              onPress={handleSend}
              disabled={!canSubmit}
              loading={loading}
              style={styles.button}
            />

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.linkContainer}>
                <Text style={styles.linkText}>
                  {t.auth.forgot.rememberAgain} <Text style={styles.linkAccent}>{t.auth.forgot.loginLink}</Text>
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
