import { Stack } from 'expo-router';
import { bg } from '@/constants';

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bg.base },
      }}
    />
  );
}
