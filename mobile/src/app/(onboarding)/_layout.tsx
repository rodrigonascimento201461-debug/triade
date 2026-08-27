import { Stack } from 'expo-router';
import { RascunhoProvider } from '@/state/RascunhoOnboarding';
import { cores } from '@/theme';

/** Grupo do onboarding: sem tab bar, sem header, sem animação. */
export default function OnboardingLayout() {
  return (
    <RascunhoProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: cores.bg },
        }}
      />
    </RascunhoProvider>
  );
}
