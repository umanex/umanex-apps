import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BleProvider } from '@/lib/ble/ble-context';
import { WorkoutPhaseProvider, useWorkoutPhase } from '@/lib/workout-phase-context';
import { TabLabel } from '@/components/TabLabel';
import { lockPortrait, allowAllOrientations } from '@/lib/orientation';
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
        tabBarInactiveTintColor: fg.quaternary,
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
            <TabLabel label="Home" focused={focused} color={color} />
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
            <TabLabel label="Training" focused={focused} color={color} />
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
            <TabLabel label="Historiek" focused={focused} color={color} />
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
            <TabLabel label="Profiel" focused={focused} color={color} />
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <BleProvider>
      <WorkoutPhaseProvider>
        <TabsInner />
      </WorkoutPhaseProvider>
    </BleProvider>
  );
}
