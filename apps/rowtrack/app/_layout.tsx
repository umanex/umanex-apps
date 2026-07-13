import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { fontMap } from '@/constants/fonts';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { startDeepLinkCapture } from '@/lib/recovery-link';
import { lockPortrait } from '@/lib/orientation';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // De wachtwoord-reset zet zelf een recovery-sessie en navigeert daarna
    // expliciet — laat de auto-redirect dat scherm met rust. Positionele match
    // zodat een toekomstige route die toevallig 'reset-password' heet de
    // auth-redirect niet verliest (review P3).
    if (inAuthGroup && (segments as string[])[1] === 'reset-password') return;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  // Alle app-fonts uit één gegenereerde map (constants/fonts.ts, afgeleid van de
  // FONTS-bron in style-dictionary.config.mjs). Een font toevoegen/wijzigen gebeurt
  // daar + rebuild — dit blijft ongewijzigd.
  const [fontsLoaded, fontError] = useFonts(fontMap);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Font-laadfout is zeldzaam (gebundelde TTF's) maar niet stil laten: in dev loggen
  // zodat een kapot/ontbrekend font-asset zichtbaar is i.p.v. een eeuwige splash.
  useEffect(() => {
    if (fontError && __DEV__) console.warn('[fonts] laden mislukt:', fontError);
  }, [fontError]);

  // Vang deep links vanaf app-start op (o.a. de wachtwoord-reset-link), ook op
  // een warm start waar de router het 'url'-event vóór schermmontage consumeert.
  useEffect(() => startDeepLinkCapture(), []);

  // App-brede default: portrait. De active workout heft dit tijdelijk op
  // (zie app/(tabs)/_layout.tsx).
  useEffect(() => lockPortrait(), []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
