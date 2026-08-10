import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BleProvider } from '@/lib/ble/ble-context';
import { HealthConsentProvider, useHealthConsent } from '@/lib/health-consent-context';
import { HealthConsentScreen } from '@/components/HealthConsentScreen';
import { WorkoutPhaseProvider, useWorkoutPhase } from '@/lib/workout-phase-context';
import { TabLabel } from '@/components/TabLabel';
import { lockPortrait, allowAllOrientations } from '@/lib/orientation';
import { t } from '@/i18n';
import { bg, fg, accent, border, space } from '@/constants';

function TabsInner() {
  const insets = useSafeAreaInsets();
  const { phase } = useWorkoutPhase();
  const hideTabBar = phase === 'active' || phase === 'summary';

  // Enkel de active workout mag landscape; overal elders portrait-only.
  useEffect(() => {
    if (phase === 'active') {
      allowAllOrientations();
    } else {
      lockPortrait();
    }
  }, [phase]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent.default,
        // fg.quaternary op bg.raised = 2.47:1 — faalt AA voor het 11px-label én de
        // 3:1 non-text-regel voor het 22px-icoon. fg.tertiary = 4.73:1 en haalt beide.
        // Eén prop voedt label + icoon, dus dit dekt de hele inactieve tab (audit F4).
        tabBarInactiveTintColor: fg.tertiary,
        tabBarStyle: hideTabBar
          ? { display: 'none' }
          : {
              backgroundColor: bg.raised,
              borderTopWidth: 1,
              borderTopColor: border.default,
              height: space['40'] + space['12'] * 2 + insets.bottom,
              paddingTop: space['12'],
              paddingBottom: space['12'] + insets.bottom,
            },
        tabBarItemStyle: {
          gap: space['4'],
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t.tabs.home} focused={focused} color={color} />
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t.tabs.training} focused={focused} color={color} />
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="barbell-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t.tabs.history} focused={focused} color={color} />
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="time-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label={t.tabs.profile} focused={focused} color={color} />
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * Toont het toestemmingsscherm zolang er geen keuze vastligt — ook op een bestaand
 * account, want daar staat de data die nog geen grondslag heeft. Het scherm ligt
 * over de tabs heen in plaats van als eigen route: de gebruiker is al ingelogd, en
 * een extra route in de auth-gate zou die gate ingewikkelder maken dan nodig.
 */
function ConsentGate({ children }: { children: React.ReactNode }) {
  const { consent, loading, grant, revoke } = useHealthConsent();
  return (
    <>
      {children}
      <HealthConsentScreen
        visible={!loading && consent === null}
        onGrant={grant}
        onDecline={revoke}
      />
    </>
  );
}

export default function TabsLayout() {
  return (
    <HealthConsentProvider>
      <ConsentGate>
        <BleProvider>
          <WorkoutPhaseProvider>
            <TabsInner />
          </WorkoutPhaseProvider>
        </BleProvider>
      </ConsentGate>
    </HealthConsentProvider>
  );
}
