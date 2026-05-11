import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as useBarlowCondensed } from '@expo-google-fonts/barlow-condensed';
import { useFonts as useInter } from '@expo-google-fonts/inter';
import { useFonts as useJetBrainsMono } from '@expo-google-fonts/jetbrains-mono';
import { useFonts as useSourceSerif4 } from '@expo-google-fonts/source-serif-4';
import { useFonts as useAlbertSans } from '@expo-google-fonts/albert-sans';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import {
  AlbertSans_500Medium,
  AlbertSans_600SemiBold,
} from '@expo-google-fonts/albert-sans';
import { AuthProvider, useAuth } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  const [barlowLoaded] = useBarlowCondensed({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [jetbrainsLoaded] = useJetBrainsMono({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  const [sourceSerifLoaded] = useSourceSerif4({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  const [albertSansLoaded] = useAlbertSans({
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
  });

  const fontsLoaded = barlowLoaded && interLoaded && jetbrainsLoaded && sourceSerifLoaded && albertSansLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
